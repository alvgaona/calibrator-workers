import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { SQSClient, GetQueueUrlCommand, SendMessageCommand } from '@aws-sdk/client-sqs';
import { z } from 'zod';

interface Env {
    SQS_QUEUE_NAME: string;
    AWS_REGION: string;
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
}

type CalibrateRequest = z.infer<typeof calibrateRequestSchema>;

interface CalibrateResponse {
    status: string;
}

interface ErrorResponse {
    error: string;
}

interface VersionResponse {
    version: string;
}

const calibrateRequestSchema = z.object({
    userId: z.string().min(1, 'userId is required'),
    datasetId: z.string().min(1, 'datasetId is required'),
});

const app = new Hono();

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

app.get('/', async (c: Context) => {
    return c.text('calibrate');
});

app.get('/version', async (c: Context) => {
    const response: VersionResponse = {
        version: '0.0.1',
    };
    return c.json(response);
});

app.post('/calibrate', async (c: Context) => {
    try {
        const env = c.env as Env;

        const body = await c.req.json();
        const parseResult = calibrateRequestSchema.safeParse(body);
        if (!parseResult.success) {
            const errorResponse: ErrorResponse = {
                error: parseResult.error.errors.map(e => e.message).join('; '),
            };
            return c.json(errorResponse, 400);
        }
        const validBody: CalibrateRequest = parseResult.data;

        // Get the queue URL
        let queueUrl: string;
        try {
            const getQueueUrlCommand = new GetQueueUrlCommand({
                QueueName: env.SQS_QUEUE_NAME,
            });
            const queueUrlResponse = await sqsClient.send(getQueueUrlCommand);

            if (!queueUrlResponse.QueueUrl) {
                console.error('Queue URL not found in response');
                const errorResponse: ErrorResponse = {
                    error: 'Queue URL not found in response',
                };
                return c.json(errorResponse, 500);
            }

            queueUrl = queueUrlResponse.QueueUrl;
        } catch (error) {
            console.error('Failed to get queue URL:', error);
            const errorResponse: ErrorResponse = {
                error: `Failed to get queue URL: ${error}`,
            };
            return c.json(errorResponse, 500);
        }

        // Send message to SQS
        try {
            const sendMessageCommand = new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify(validBody),
            });

            await sqsClient.send(sendMessageCommand);

            const successResponse: CalibrateResponse = {
                status: 'Calibration queued',
            };
            return c.json(successResponse, 200);
        } catch (error) {
            console.error('Failed to send message to SQS:', error);
            const errorResponse: ErrorResponse = {
                error: `Failed to send message to SQS: ${error}`,
            };
            return c.json(errorResponse, 500);
        }
    } catch (error) {
        console.error('Error processing request:', error);
        const errorResponse: ErrorResponse = {
            error: 'Internal server error',
        };
        return c.json(errorResponse, 500);
    }
});

export default app;
