import { NextResponse } from "next/server";
import { FeaturePipelineError, getPublicFeaturePipelineComments } from "@/lib/boardsignal/server/featurePipeline";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const itemId = new URL(request.url).searchParams.get("itemId") ?? "";
    return NextResponse.json({ ok: true, comments: await getPublicFeaturePipelineComments(itemId) }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    if (error instanceof FeaturePipelineError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: "Comments could not be loaded." }, { status: 500 });
  }
}
