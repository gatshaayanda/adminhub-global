import { NextResponse } from "next/server";
import { getPublishedBuildUpdates } from "@/lib/buildUpdates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const updates = await getPublishedBuildUpdates();
    return NextResponse.json({ update: updates[0] || null });
  } catch (error) {
    console.error("Failed to load latest Admin Hub build update:", error);
    return NextResponse.json({ update: null }, { status: 200 });
  }
}
