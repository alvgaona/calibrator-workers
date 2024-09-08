import { Context, Hono } from 'hono';
import { cors } from 'hono/cors';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

interface Env {
  ACCOUNT_ID: string;
  ACCESS_KEY_ID: string;
  SECRET_ACCESS_KEY: string;
}

const app = new Hono();

const BUCKET_NAME = 'calibrator';

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

interface RequestBody {
  runId: string;
  dataset: string;
}

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['POST'],
    allowHeaders: ['Content-Type'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  }),
);

app.use('*', (c, next) => {
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

app.post('/', async (c: Context) => {
  try {
    const body: RequestBody = await c.req.json();

    if (!body.runId || !body.dataset) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const presignedUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${body.runId}/${body.dataset}`,
      }),
      { expiresIn: 360 },
    );

    return c.json({ presignedUrl });
  } catch (error) {
    console.error('Error processing request:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
