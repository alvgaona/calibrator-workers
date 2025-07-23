import { StackHandler } from '@stackframe/stack';
import { stackServerApp } from '@/stack';

// Check if Stack Auth environment variables are available
const isStackConfigured = !!(
    process.env.NEXT_PUBLIC_STACK_PROJECT_ID &&
    process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY &&
    process.env.STACK_SECRET_SERVER_KEY
);

export default function Handler(props: unknown) {
    if (!isStackConfigured) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h1>Stack Auth Not Configured</h1>
                <p>Stack Auth requires environment variables to be set.</p>
                <p>Please configure the following in your .env.local file:</p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    <li>NEXT_PUBLIC_STACK_PROJECT_ID</li>
                    <li>NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY</li>
                    <li>STACK_SECRET_SERVER_KEY</li>
                </ul>
            </div>
        );
    }

    return <StackHandler fullPage app={stackServerApp} routeProps={props} />;
}
