import 'server-only';

import { StackServerApp, StackClientApp } from '@stackframe/stack';

// Create Stack apps conditionally based on environment
export const stackServerApp = new StackServerApp({
    tokenStore: 'nextjs-cookie',
});

export const stackClientApp = new StackClientApp({
    tokenStore: 'nextjs-cookie',
});
