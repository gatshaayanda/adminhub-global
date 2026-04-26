// src/app/api/login/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  const body = await request.json();
  const password = body.password;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword || password !== expectedPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = crypto.randomBytes(16).toString('hex');

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: 'admin_token',
    value: token,
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60, // 1 hour
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return res;
}
