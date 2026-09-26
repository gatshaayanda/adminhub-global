import { NextResponse } from "next/server";
import {
  FeaturePipelineError,
  listFounderFeaturePipeline,
  moderateFeaturePipelineFeedback,
  mutateFounderFeaturePipeline,
} from "@/lib/boardsignal/server/featurePipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } }); }

export async function GET() {
  try { return json({ ok: true, ...(await listFounderFeaturePipeline()) }); }
  catch (error) { return json({ ok: false, error: error instanceof Error ? error.message : "Pipeline could not be loaded." }, 500); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (body.target === "feedback") return json({ ok: true, result: await moderateFeaturePipelineFeedback(body) });
    return json({ ok: true, state: await mutateFounderFeaturePipeline(body) });
  } catch (error) {
    if (error instanceof FeaturePipelineError) return json({ ok: false, code: error.code, error: error.message }, error.status);
    return json({ ok: false, error: error instanceof Error ? error.message : "Pipeline could not be updated." }, Number((error as { status?: number }).status ?? 500));
  }
}
