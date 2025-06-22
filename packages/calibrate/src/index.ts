import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { SQSClient, GetQueueUrlCommand, SendMessageCommand } from '@aws-sdk/client-sqs';
import { z } from 'zod';
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';

interface Env {
    SQS_QUEUE_NAME: string;
    AWS_REGION: string;
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
}

// Zod schemas for request/response validation and OpenAPI documentation
const calibrateRequestSchema = z.object({
    userId: z.string().min(1, 'userId is required').openapi({
        description: 'Unique identifier for the user',
        example: 'user123'
    }),
    datasetId: z.string().min(1, 'datasetId is required').openapi({
        description: 'Unique identifier for the dataset to calibrate',
        example: 'dataset456'
    }),
});

const calibrateResponseSchema = z.object({
    status: z.string().openapi({
        description: 'Status of the calibration request',
        example: 'Calibration queued'
    }),
});

const errorResponseSchema = z.object({
    error: z.string().openapi({
        description: 'Error message',
        example: 'Invalid request parameters'
    }),
});

const versionResponseSchema = z.object({
    version: z.string().openapi({
        description: 'API version',
        example: '0.0.1'
    }),
});

// OpenAPI route definitions
const rootRoute = createRoute({
    method: 'get',
    path: '/',
    summary: 'Health check endpoint',
    description: 'Returns a simple text response to verify the API is running',
    responses: {
        200: {
            description: 'API is running',
            content: {
                'text/plain': {
                    schema: z.string().openapi({
                        example: 'calibrate'
                    }),
                },
            },
        },
    },
});

const versionRoute = createRoute({
    method: 'get',
    path: '/version',
    summary: 'Get API version',
    description: 'Returns the current version of the calibration API',
    responses: {
        200: {
            description: 'API version information',
            content: {
                'application/json': {
                    schema: versionResponseSchema,
                },
            },
        },
    },
});

const calibrateRoute = createRoute({
    method: 'post',
    path: '/calibrate',
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

let sqsClient: SQSClient;

function createSQSClient(region: string, accessKeyId: string, secretAccessKey: string) {
    return new SQSClient({
        region,
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

// Middleware to initialize SQS client only for /calibrate endpoint
app.use('/calibrate', (c: Context, next) => {
    const env = c.env as Env;
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.AWS_REGION) {
        throw new Error('Missing required AWS environment variables');
    }
    if (!sqsClient) {
        sqsClient = createSQSClient(
            env.AWS_REGION,
            env.AWS_ACCESS_KEY_ID,
            env.AWS_SECRET_ACCESS_KEY,
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
app.openapi(rootRoute, async (c) => {
    return c.text('calibrate');
});

app.openapi(versionRoute, async (c) => {
    return c.json({
        version: '0.0.1',
    });
});

app.openapi(calibrateRoute, async (c) => {
    try {
        const env = c.env as Env;
        const validBody = c.req.valid('json');

        // Get the queue URL
        let queueUrl: string;
        try {
            const getQueueUrlCommand = new GetQueueUrlCommand({
                QueueName: env.SQS_QUEUE_NAME,
            });
            const queueUrlResponse = await sqsClient.send(getQueueUrlCommand);

            if (!queueUrlResponse.QueueUrl) {
                console.error('Queue URL not found in response');
                return c.json({
                    error: 'Queue URL not found in response',
                }, 500);
            }

            queueUrl = queueUrlResponse.QueueUrl;
        } catch (error) {
            console.error('Failed to get queue URL:', error);
            return c.json({
                error: `Failed to get queue URL: ${error}`,
            }, 500);
        }

        // Send message to SQS
        try {
            const sendMessageCommand = new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify(validBody),
            });

            await sqsClient.send(sendMessageCommand);

            return c.json({
                status: 'Calibration queued',
            }, 200);
        } catch (error) {
            console.error('Failed to send message to SQS:', error);
            return c.json({
                error: `Failed to send message to SQS: ${error}`,
            }, 500);
        }
    } catch (error) {
        console.error('Error processing request:', error);
        return c.json({
            error: 'Internal server error',
        }, 500);
    }
});

export default app;
