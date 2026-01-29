import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl;
    const hostname = request.headers.get('host') || '';

    // Define your internal subdomain (adjust based on environment)
    // e.g., internal.rcm-app.com or internal-staging.rcm-app.com
    const isInternalSubdomain = hostname.startsWith('internal.');

    // If accessing via Internal Subdomain, rewrite to /internal path
    // provided the user isn't already trying to access /internal directly (avoid loop)
    // and excluding static files/API
    if (
        isInternalSubdomain &&
        !url.pathname.startsWith('/internal') &&
        !url.pathname.startsWith('/api') &&
        !url.pathname.startsWith('/_next') &&
        !url.pathname.includes('.') // Exclude files
    ) {
        console.log(`Rewriting ${hostname} request to /internal${url.pathname}`);
        url.pathname = `/internal${url.pathname}`;
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
