"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.middleware = middleware;
const server_1 = require("next/server");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
function middleware(req) {
    const isFounderRoute = req.nextUrl.pathname === '/admin'
        || req.nextUrl.pathname.startsWith('/admin/')
        || req.nextUrl.pathname.startsWith('/api/admin/boardsignal/');
    if (isFounderRoute) {
        const auth = req.headers.get('authorization') || '';
        const [scheme, encoded] = auth.split(' ');
        if (scheme !== 'Basic' || !encoded) {
            return new server_1.NextResponse('Auth required', {
                status: 401,
                headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
            });
        }
        const [, pass] = atob(encoded).split(':');
        if (pass !== ADMIN_PASSWORD) {
            return new server_1.NextResponse('Forbidden', { status: 403 });
        }
    }
    return server_1.NextResponse.next();
}
exports.config = {
    matcher: ['/admin', '/admin/:path*', '/api/admin/boardsignal/:path*'],
};
