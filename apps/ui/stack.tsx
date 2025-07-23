import 'server-only';

import { StackServerApp, StackClientApp } from '@stackframe/stack';

// Check if Stack Auth environment variables are available
const isStackConfigured = !!(
    process.env.NEXT_PUBLIC_STACK_PROJECT_ID &&
    process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY &&
    process.env.STACK_SECRET_SERVER_KEY
);

// Create Stack apps conditionally based on environment
export const stackServerApp = isStackConfigured
    ? new StackServerApp({
          tokenStore: 'nextjs-cookie',
          projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
          publishableClientKey:
              process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
          secretServerKey: process.env.STACK_SECRET_SERVER_KEY,
      })
    : // Provide a minimal mock implementation for builds without config
      new StackServerApp({
          tokenStore: 'nextjs-cookie',
          // Use dummy values that will allow the build to succeed
          projectId: 'dummy-project-id',
          publishableClientKey: 'dummy-publishable-key',
          secretServerKey: 'dummy-secret-key',
      });

export const stackClientApp = isStackConfigured
    ? new StackClientApp({
          tokenStore: 'nextjs-cookie',
          projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
          publishableClientKey:
              process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
      })
    : // Provide a minimal mock implementation for builds without config
      new StackClientApp({
          tokenStore: 'nextjs-cookie',
          projectId: 'dummy-project-id',
          publishableClientKey: 'dummy-publishable-key',
      });
