import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: {
          Allow: 'POST',
          'Content-Type': 'text/plain',
        },
      });
    }

    s3 = createS3Client(
      env.ACCOUNT_ID,
      env.ACCESS_KEY_ID,
      env.SECRET_ACCESS_KEY,
    );

    const body: RequestBody = await request.json();

    const runId = body.runId;
    const dataset = body.dataset;

    const presignedUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: 'calibrator',
        Key: `${runId}/${dataset}`,
      }),
      { expiresIn: 360 },
    );

    return new Response(JSON.stringify({ presignedUrl: presignedUrl }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
} satisfies ExportedHandler<Env>;
