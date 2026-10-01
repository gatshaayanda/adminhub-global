// src/app/api/login/route.ts
import { NextResponse } from "next/server";
import { createFounderSession } from "../../../lib/boardsignal/founderSession.mjs";

export async function POST(request: Request) {
  const body = await request.json();
  const password = body.password;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword || password !== expectedPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const session = await createFounderSession(expectedPassword);

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: "boardsignal_founder_session",
    value: session.value,
    httpOnly: true,
    path: "/",
    maxAge: session.maxAge,
    expires: session.expires,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // Keep the legacy cookie for existing admin pages that still read it.
  res.cookies.set({
    name: "admin_token",
    value: "authenticated",
    httpOnly: true,
    path: "/",
    maxAge: session.maxAge,
    expires: session.expires,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
