import { NextResponse } from "next/server";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import { contextualGuideFeedbackFollowup, contextualGuideResponse, guideContextObservation } from "@/lib/boardsignal/server/askContext";
import { createGuideHandoff, getGuideProfileState, guideResponse, recordGuideFeedback, saveGuidePreference, updateGuideState } from "@/lib/boardsignal/server/guide";
import { recordFounderAskUsageByUid } from "@/lib/boardsignal/server/founderEngagement";
import { weeklyHistoryGuideResponse } from "@/lib/boardsignal/server/weeklyGuide";

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
    const token = action === "ask" ? await optionalToken(request)
      : action === "observe" ? await optionalToken(request)
        : await requirePlayerToken(request);

    if (action === "observe") {
      if (body.mode !== "beta_preview" && body.panelOpen !== true) {
        return response({ ok: true, observation: undefined });
      }
      return response({
        ok: true,
        observation: await guideContextObservation({
          token,
          pathname: body.pathname,
          activeTab: body.activeTab,
          visibleEntityId: body.visibleEntityId,
          mode: body.mode,
          previewRequestId: body.previewRequestId,
          previewStatusToken: body.previewStatusToken,
        }),
      });
    }

    if (action === "ask") {
      const finishAsk = async (answer: unknown) => {
        if (token?.uid && body.mode !== "beta_preview") {
          await recordFounderAskUsageByUid(token.uid).catch(() => undefined);
        }
        return response({ ok: true, response: answer });
      };

      const feedbackFollowup = await contextualGuideFeedbackFollowup({
        token,
        message: body.message,
        pathname: body.pathname,
        activeTab: body.activeTab,
        visibleEntityId: body.visibleEntityId,
        recentConversation: body.recentConversation,
        mode: body.mode,
        previewRequestId: body.previewRequestId,
        previewStatusToken: body.previewStatusToken,
      });
      if (feedbackFollowup.handled && feedbackFollowup.response) return finishAsk(feedbackFollowup.response);
      if (body.mode === "beta_preview") {
        return finishAsk(await guideResponse({ token, message: body.message, pathname: body.pathname, activeTab: body.activeTab, visibleEntityId: body.visibleEntityId, recentConversation: body.recentConversation, mode: "beta_preview", previewRequestId: body.previewRequestId, previewStatusToken: body.previewStatusToken }));
      }
      const weeklyHistory = await weeklyHistoryGuideResponse(token, body.message);
      if (weeklyHistory) return finishAsk(weeklyHistory);
      const contextual = await contextualGuideResponse({
        token,
        message: body.message,
        pathname: body.pathname,
        activeTab: body.activeTab,
        visibleEntityId: body.visibleEntityId,
        recentConversation: body.recentConversation,
      });
      if (contextual) return finishAsk(contextual);
      return finishAsk(await guideResponse({ token, message: body.message, pathname: body.pathname, activeTab: body.activeTab, visibleEntityId: body.visibleEntityId, recentConversation: body.recentConversation }));
    }
    if (action === "preference") return response({ ok: true, preferences: await saveGuidePreference(token!, body) });
    if (action === "state") return response({ ok: true, state: await updateGuideState(token!, body) });
    if (action === "feedback") return response({ ok: true, feedback: await recordGuideFeedback(token!, body) });
    if (action === "handoff") return response({ ok: true, handoff: await createGuideHandoff(token!, body) });
    return response({ ok: false, error: "Unknown Ask BoardSignal action." }, 400);
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Ask BoardSignal is unavailable right now." }, Number((error as { status?: number }).status ?? 500));
  }
}
