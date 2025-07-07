// test/index.spec.ts
import {
    SELF,
    createExecutionContext,
    env,
    waitOnExecutionContext,
} from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Calibrate worker', () => {
    it('responds with worker name at root (unit style)', async () => {
        const request = new IncomingRequest('http://example.com/api/health');
        // Create an empty context to pass to `worker.fetch()`.
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
        await waitOnExecutionContext(ctx);
        expect(await response.json()).toMatchInlineSnapshot(`
          {
            "name": "edge",
            "version": "0.0.1",
          }
        `);
    });

    it('responds with worker name at root (integration style)', async () => {
        const response = await SELF.fetch('http://example.com/api/health');
        expect(await response.json()).toMatchInlineSnapshot(`
          {
            "name": "edge",
            "version": "0.0.1",
          }
        `);
    });

    it('responds with version info (integration style)', async () => {
        const response = await SELF.fetch('http://example.com/api/health');
        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json).toEqual({ name: 'edge', version: '0.0.1' });
    });
});
