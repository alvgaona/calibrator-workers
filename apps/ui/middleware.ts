import { type NextRequest, NextResponse } from 'next/server';

import { stackClientApp } from '@/stack';

export async function middleware(req: NextRequest) {
    const user = await stackClientApp.getUser();

    if (!user) {
        return NextResponse.redirect(new URL('/handler/sign-in', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/((?!_next/static|_next/image|favicon.ico|handler).*)',
};
