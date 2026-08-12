import { NextResponse } from "next/server";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import { createGuideHandoff, getGuideProfileState, guideResponse, recordGuideFeedback, saveGuidePreference, updateGuideState } from "@/lib/boardsignal/server/guide";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" } });
}

async function optionalToken(request: Request) {
  if (!request.headers.get("authorization")) return undefined;
  return requirePlayerToken(request);
}

export async function GET(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    return response({ ok: true, profile: await getGuideProfileState(token) });
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Ask BoardSignal profile is unavailable." }, Number((error as { status?: number }).status ?? 500));
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "ask");
    const token = action === "ask" ? await optionalToken(request) : await requirePlayerToken(request);
    if (action === "ask") return response({ ok: true, response: await guideResponse({ token, message: body.message, pathname: body.pathname, activeTab: body.activeTab, visibleEntityId: body.visibleEntityId, recentConversation: body.recentConversation }) });
    if (action === "preference") return response({ ok: true, preferences: await saveGuidePreference(token!, body) });
    if (action === "state") return response({ ok: true, state: await updateGuideState(token!, body) });
    if (action === "feedback") return response({ ok: true, feedback: await recordGuideFeedback(token!, body) });
    if (action === "handoff") return response({ ok: true, handoff: await createGuideHandoff(token!, body) });
    return response({ ok: false, error: "Unknown Ask BoardSignal action." }, 400);
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Ask BoardSignal is unavailable right now." }, Number((error as { status?: number }).status ?? 500));
  }
}
