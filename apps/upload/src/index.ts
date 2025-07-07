import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { z } from 'zod';
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';

interface Env {
    ACCOUNT_ID: string;
    ACCESS_KEY_ID: string;
    SECRET_ACCESS_KEY: string;
    UPLOAD_BUCKET: string;
}

// Zod schemas for request/response validation and OpenAPI documentation
const uploadRequestSchema = z.object({
    userId: z.string().min(1, 'userId is required').openapi({
        description: 'Unique identifier for the user',
        example: 'user123',
    }),
    dataset: z.string().min(1, 'dataset is required').openapi({
        description: 'Dataset name for organizing uploads',
        example: 'training-data',
    }),
    fileName: z.string().min(1, 'fileName is required').openapi({
        description: 'Name of the file to upload',
        example: 'images.tar.gz',
    }),
});

const uploadResponseSchema = z.object({
    presignedUrl: z.string().url().openapi({
        description: 'Pre-signed URL for uploading the file',
        example:
            'https://example.r2.cloudflarestorage.com/bucket/user123/dataset/file.csv?X-Amz-Algorithm=...',
    }),
});

const errorResponseSchema = z.object({
    error: z.string().openapi({
        description: 'Error message',
        example: 'Missing required fields',
    }),
});

const healthResponseSchema = z.object({
    name: z.string().openapi({
        description: 'Worker name',
        example: 'upload',
    }),
    version: z.string().openapi({
        description: 'API version',
        example: '0.0.1',
    }),
});

// OpenAPI route definitions
const healthRoute = createRoute({
    method: 'get',
    path: '/api/health',
    summary: 'Health check endpoint',
    description: 'Returns the worker name and version information',
    responses: {
        200: {
            description: 'Worker health information',
            content: {
                'application/json': {
                    schema: healthResponseSchema,
                },
            },
        },
    },
});

const uploadRoute = createRoute({
    method: 'post',
    path: '/api/upload',
    summary: 'Generate presigned upload URL',
    description:
        'Generates a presigned URL for uploading files to object storage',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: uploadRequestSchema,
                },
            },
            description: 'Upload request parameters',
        },
    },
    responses: {
        200: {
            description: 'Presigned URL generated successfully',
            content: {
                'application/json': {
                    schema: uploadResponseSchema,
                },
            },
        },
        400: {
            description: 'Invalid request parameters',
            content: {
                'application/json': {
                    schema: errorResponseSchema,
                },
            },
        },
        500: {
            description: 'Internal server error',
            content: {
                'application/json': {
                    schema: errorResponseSchema,
                },
            },
        },
    },
});

// Create OpenAPI Hono app
const app = new OpenAPIHono();

let s3: S3Client;

function createS3Client(
    accountId: string,
    accessKeyId: string,
    secretAccessKey: string,
) {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
}

// Apply CORS middleware
app.use(
    '*',
    cors({
        origin: '*',
        allowMethods: ['GET', 'POST'],
        allowHeaders: ['Content-Type'],
        exposeHeaders: ['Content-Length'],
        maxAge: 600,
        credentials: true,
    }),
);

// Middleware to initialize S3 client only for /api/upload endpoint
app.use('/api/upload', (c: Context, next) => {
    const env = c.env as Env;
    if (!env.ACCOUNT_ID || !env.ACCESS_KEY_ID || !env.SECRET_ACCESS_KEY) {
        throw new Error('Missing required environment variables');
    }
    if (!s3) {
        s3 = createS3Client(
            env.ACCOUNT_ID,
            env.ACCESS_KEY_ID,
            env.SECRET_ACCESS_KEY,
        );
    }
    return next();
});

// Swagger UI endpoint
app.get('/swagger-ui', swaggerUI({ url: '/openapi.json' }));

// OpenAPI JSON endpoint
app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
        title: 'Upload API',
        version: '0.0.1',
        description:
            'API for generating presigned URLs for file uploads to object storage',
    },
    servers: [
        {
            url: 'http://localhost:8787',
            description: 'Development server',
        },
    ],
});

// Route handlers
app.openapi(healthRoute, async (c) => {
    return c.json({
        name: 'upload',
        version: '0.0.1',
    });
});

app.openapi(uploadRoute, async (c) => {
    try {
        const env = c.env as Env;
        const validBody = c.req.valid('json');

        const presignedUrl = await getSignedUrl(
            s3,
            new PutObjectCommand({
                Bucket: env.UPLOAD_BUCKET,
                Key: `${validBody.userId}/${validBody.dataset}/${validBody.fileName}`,
            }),
            { expiresIn: 360 },
        );

        return c.json({ presignedUrl }, 200);
    } catch (error) {
        console.error('Error processing request:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

export default app;
