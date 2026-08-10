import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/admin' || req.nextUrl.pathname.startsWith('/admin/')) {
    const auth = req.headers.get('authorization') || ''
    const [scheme, encoded] = auth.split(' ')
    if (scheme !== 'Basic' || !encoded) {
      return new NextResponse('Auth required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
      })
    }
    const [, pass] = atob(encoded).split(':')
    if (pass !== ADMIN_PASSWORD) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
