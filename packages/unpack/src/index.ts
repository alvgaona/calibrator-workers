import { Context, Hono } from 'hono';
import { cors } from 'hono/cors';

interface Env {
  CALIBRATOR_BUCKET: R2Bucket;
}

const app = new Hono();

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
  return next();
});

app.post('/', async (c: Context) => {});

export default app;
