import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import {
  createPipelineGuestToken,
  FeaturePipelineError,
  hashPipelineIdentity,
  recordFeaturePipelineFeedback,
} from "@/lib/boardsignal/server/featurePipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const GUEST_COOKIE = "boardsignal_pipeline_guest";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow" } });
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const token = /^Bearer\s+/i.test(authorization) ? await requirePlayerToken(request) : undefined;
    const jar = await cookies();
    let guestToken = jar.get(GUEST_COOKIE)?.value;
    if (!token && (!guestToken || !/^[A-Za-z0-9_-]{32,100}$/.test(guestToken))) guestToken = createPipelineGuestToken();
    const identity = token
      ? { kind: "player" as const, playerUid: token.uid, keyHash: hashPipelineIdentity(`player:${token.uid}`) }
      : { kind: "guest" as const, keyHash: hashPipelineIdentity(`guest:${guestToken}`) };
    const result = await recordFeaturePipelineFeedback(identity, await request.json().catch(() => ({})));
    const response = json({ ok: true, changed: result.changed, state: result.state, feedback: result.feedback });
    if (!token && guestToken && jar.get(GUEST_COOKIE)?.value !== guestToken) {
      response.cookies.set(GUEST_COOKIE, guestToken, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
    return response;
  } catch (error) {
    if (error instanceof FeaturePipelineError) return json({ ok: false, code: error.code, error: error.message }, error.status);
    return json({ ok: false, code: "PIPELINE_FEEDBACK_FAILED", error: error instanceof Error ? error.message : "Pipeline feedback could not be saved." }, Number((error as { status?: number }).status ?? 500));
  }
}
