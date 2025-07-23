import type { MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import * as jose from 'jose';

export interface AuthMiddlewareOptions {
    /**
     * URL to the JWKS endpoint for token verification
     */
    jwksUrl: string;

    /**
     * Header name to extract the access token from
     * @default "x-stack-access-token"
     */
    headerName?: string;

    /**
     * Error message to return when token is missing
     * @default "Missing authentication token"
     */
    missingTokenMessage?: string;

    /**
     * Error message to return when token is invalid
     * @default "Invalid or expired token"
     */
    invalidTokenMessage?: string;

    /**
     * Whether to log authentication errors to console
     * @default true
     */
    logErrors?: boolean;
}

/**
 * Creates an authentication middleware for Hono that verifies JWT tokens
 * @param options Configuration options for the middleware
 * @returns Hono middleware handler
 */
export function createAuthMiddleware(
    options: AuthMiddlewareOptions,
): MiddlewareHandler {
    const {
        jwksUrl,
        headerName = 'x-stack-access-token',
        missingTokenMessage = 'Missing authentication token',
        invalidTokenMessage = 'Invalid or expired token',
        logErrors = true,
    } = options;

    const jwks = jose.createRemoteJWKSet(new URL(jwksUrl));

    return createMiddleware(async (c, next) => {
        try {
            const accessToken = c.req.header(headerName);

            if (!accessToken) {
                return c.json({ error: missingTokenMessage }, 401);
            }

            await jose.jwtVerify(accessToken, jwks);

            // Authentication successful, proceed to next middleware/handler
            await next();
        } catch (error) {
            if (logErrors) {
                console.error('Authentication error:', error);
            }

            // Return error response and don't proceed to next middleware
            return c.json({ error: invalidTokenMessage }, 401);
        }
    });
}

// Export a preset for Stack Auth
export function createStackAuthMiddleware(
    projectId: string,
    options?: Partial<AuthMiddlewareOptions>,
) {
    return createAuthMiddleware({
        jwksUrl: `https://api.stack-auth.com/api/v1/projects/${projectId}/.well-known/jwks.
json`,
        ...options,
    });
}
