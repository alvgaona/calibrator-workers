import 'server-only';

import { StackServerApp, StackClientApp } from '@stackframe/stack';

export const stackServerApp = new StackServerApp({
    tokenStore: 'nextjs-cookie',
});

export const stackClientApp = new StackClientApp({
    tokenStore: 'nextjs-cookie',
});
