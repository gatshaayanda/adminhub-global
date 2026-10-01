import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/utils/firebaseAdmin";
import { BUILD_UPDATES_COLLECTION } from "@/lib/buildUpdates";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const updateRef = adminDb.collection(BUILD_UPDATES_COLLECTION).doc(slug);
    const snapshot = await updateRef.get();

    if (!snapshot.exists || snapshot.data()?.published !== true || snapshot.data()?.archived === true) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const cookieStore = await cookies();
    const cookieName = `ah_build_view_${slug}`;

    if (cookieStore.get(cookieName)?.value === "1") {
      return NextResponse.json({ ok: true, counted: false });
    }

    await updateRef.update({
      viewCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const response = NextResponse.json({ ok: true, counted: true });
    response.cookies.set({
      name: cookieName,
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 60,
    });

    return response;
  } catch (error) {
    console.error("Failed to record Admin Hub Build Log view:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
