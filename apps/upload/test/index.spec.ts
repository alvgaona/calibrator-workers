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

describe('Upload worker', () => {
    it('responds with worker info at health endpoint (unit style)', async () => {
        const request = new IncomingRequest('http://example.com/api/health');
        // Create an empty context to pass to `worker.fetch()`.
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
        await waitOnExecutionContext(ctx);
        expect(await response.json()).toMatchInlineSnapshot(`
          {
            "name": "upload",
            "version": "0.0.1",
          }
        `);
    });

    it('responds with worker info at health endpoint (integration style)', async () => {
        const response = await SELF.fetch('https://example.com/api/health');
        expect(await response.json()).toMatchInlineSnapshot(`
          {
            "name": "upload",
            "version": "0.0.1",
          }
        `);
    });
});
