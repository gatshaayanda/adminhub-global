import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set({
    name:     'admin_token',
    value:    '',
    maxAge:   0,
    path:     '/',        // must match the login cookie path
    httpOnly: true,
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
  })
  return res
}
