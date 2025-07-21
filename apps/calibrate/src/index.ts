import { cors } from 'hono/cors';
import { z } from 'zod';
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { Container, getRandom } from '@cloudflare/containers';

export class Calibrate extends Container {
    defaultPort = 8080;
    sleepAfter = '10s';
}

// Zod schemas for request/response validation and OpenAPI documentation
const errorResponseSchema = z.object({
    error: z.string().openapi({
        description: 'Error message',
        example: 'Invalid request parameters',
    }),
});

const healthResponseSchema = z.object({
    name: z.string().openapi({
        description: 'Worker name',
        example: 'calibrate',
    }),
    version: z.string().openapi({
        description: 'API version',
        example: '0.0.1',
    }),
});

const queueMessageSchema = z.object({
    metadata: z.object({
        userId: z.string(),
        datasetId: z.string(),
    }),
    images: z.array(z.string()),
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

// Create OpenAPI Hono app
const app = new OpenAPIHono();

// Apply CORS middleware
app.use(
    '*',
    cors({
        origin: '*',
        allowMethods: ['GET'],
        allowHeaders: ['Content-Type'],
        exposeHeaders: ['Content-Length'],
        maxAge: 600,
        credentials: true,
    }),
);

// Swagger UI endpoint
app.get('/swagger-ui', swaggerUI({ url: '/openapi.json' }));

// OpenAPI JSON endpoint
app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
        title: 'Calibration API',
        version: '0.0.1',
        description: 'API for getting information about the calibration app',
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
        name: 'calibrate',
        version: '0.0.1',
    });
});

export default {
    fetch: app.fetch,
    queue: async (batch: MessageBatch, env: Env, ctx: ExecutionContext) => {
        for (const message of batch.messages) {
            const messageBody = queueMessageSchema.parse(message.body);

            console.log(messageBody);

            // const id = env.Calibrate.idFromName('foo');
            // const instance = env.Calibrate.get(id);

            // await instance.start({
            //     envVars: {
            //         R2_ACCESS_KEY: await env.R2_ACCESS_KEY_ID.get(),
            //         R2_SECRET_ACCESS_KEY: await env.R2_SECRET_ACCESS_KEY.get(),
            //         R2_BUCKET: env.R2_BUCKET,
            //         R2_ENDPOINT_URL: env.R2_ENDPOINT_URL,
            //     },
            // });
        }
    },
};
