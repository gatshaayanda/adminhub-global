import { NextResponse } from "next/server";
import { cancelBoardSignalLiveRecovery, registerBoardSignalLiveRecovery } from "@/lib/boardsignal/server/liveRecovery";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

export async function POST(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const playerId = Number(token.chessPlayerId);
    const chessUsername = String(token.chessUsername ?? "").trim();
    if (!Number.isSafeInteger(playerId) || playerId <= 0 || !chessUsername) {
      return response({ ok: false, error: "A verified BoardSignal player session is required.", code: "LIVE_RECOVERY_PLAYER_REQUIRED" }, 403);
    }
    const body = await request.json() as Record<string, unknown>;
    if ("topic" in body || "incident" in body || "uid" in body || "userId" in body) {
      return response({ ok: false, error: "Recovery incident identity is server controlled.", code: "LIVE_RECOVERY_INCIDENT_SERVER_CONTROLLED" }, 400);
    }
    const action = String(body.action ?? "");
    if (action === "subscribe") {
      const result = await registerBoardSignalLiveRecovery(token.uid, body.fcmToken);
      return response({ ok: true, reminderSet: true, incident: result.incident, reopensAt: result.reopensAt });
    }
    if (action === "unsubscribe") {
      await cancelBoardSignalLiveRecovery(token.uid, body.fcmToken);
      return response({ ok: true, removed: true });
    }
    return response({ ok: false, error: "Recovery reminder action is invalid.", code: "LIVE_RECOVERY_ACTION_INVALID" }, 400);
  } catch (error) {
    const status = Number((error as { status?: unknown }).status) || 500;
    const code = String((error as { code?: unknown }).code ?? "LIVE_RECOVERY_FAILED");
    return response({ ok: false, error: error instanceof Error ? error.message : "BoardSignal recovery reminder could not be updated.", code }, status);
  }
}
