import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  for (const name of ["boardsignal_founder_session", "admin_token"]) {
    res.cookies.set({
      name,
      value: "",
      maxAge: 0,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return res;
}
