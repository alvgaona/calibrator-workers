import { cors } from 'hono/cors';
import { z } from 'zod';
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { createStackAuthMiddleware } from '@calibrator/auth-middleware';

// Zod schemas for request/response validation and OpenAPI documentation
const calibrateRequestSchema = z.object({
    metadata: z.object({
        userId: z.string().min(1, 'userId is required').openapi({
            description: 'Unique identifier for the user',
            example: 'user123',
        }),
        datasetId: z.string().min(1, 'datasetId is required').openapi({
            description: 'Unique identifier for the dataset to calibrate',
            example: 'dataset456',
        }),
    }),
    images: z.array(z.string()),
});

const calibrateResponseSchema = z.object({
    status: z.string().openapi({
        description: 'Status of the calibration request',
        example: 'Calibration queued',
    }),
});

const errorResponseSchema = z.object({
    error: z.string().openapi({
        description: 'Error message',
        example: 'Invalid request parameters',
    }),
});

const healthResponseSchema = z.object({
    name: z.string().openapi({
        description: 'Worker name',
        example: 'edge',
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

const calibrateRoute = createRoute({
    method: 'post',
    path: '/api/calibrate',
    summary: 'Queue calibration job',
    description: 'Submits a calibration job to the processing queue',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: calibrateRequestSchema,
                },
            },
            description: 'Calibration request parameters',
        },
    },
    responses: {
        200: {
            description: 'Calibration job queued successfully',
            content: {
                'application/json': {
                    schema: calibrateResponseSchema,
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

app.use(
    '/api/*',
    createStackAuthMiddleware('c38e1211-1625-476a-a90a-4f2b20cc9eb8'),
);

// Swagger UI endpoint
app.get('/swagger-ui', swaggerUI({ url: '/openapi.json' }));

// OpenAPI JSON endpoint
app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
        title: 'Calibration API',
        version: '0.0.1',
        description: 'API for queueing calibration jobs using AWS SQS',
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
        name: 'edge',
        version: '0.0.1',
    });
});

app.openapi(calibrateRoute, async (c) => {
    const env = c.env as Env;
    const validReq = c.req.valid('json');

    await env.CALIBRATOR_CALIBRATE.send(validReq);

    return c.json(
        {
            status: 'Calibration queued',
        },
        200,
    );
});

export default app;
