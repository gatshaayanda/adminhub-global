import { NextResponse } from "next/server";
import {
  PlayerRoomEngagementError,
  recordPlayerRoomEntry,
  recordPlayerRoomSummary,
  resolveTrustpilotFollowUp,
} from "@/lib/boardsignal/server/playerRoomEngagement";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import { classifyBoardSignalHttpError } from "@/lib/boardsignal/server/firestoreService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Pragma": "no-cache",
      "Vary": "Authorization",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function POST(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = body.action;

    if (action === "enter") {
      const engagement = await recordPlayerRoomEntry(token.uid, body);
      return response({ ok: true, engagement });
    }
    if (action === "summary") {
      const summary = await recordPlayerRoomSummary(token.uid, body);
      return response({ ok: true, summary });
    }
    if (action === "resolve") {
      const trustpilot = await resolveTrustpilotFollowUp(token.uid, body);
      return response({ ok: true, trustpilot });
    }

    return response({ ok: false, code: "PLAYER_ROOM_ENGAGEMENT_UNKNOWN_ACTION", error: "That Player Room engagement action is not supported." }, 400);
  } catch (error) {
    if (error instanceof PlayerRoomEngagementError) {
      return response({ ok: false, code: error.code, error: error.message }, error.status);
    }
    const classified = classifyBoardSignalHttpError(error);
    return response({ ok: false, code: classified.code, error: classified.message }, classified.status);
  }
}
