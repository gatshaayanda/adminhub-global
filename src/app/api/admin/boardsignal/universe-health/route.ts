import { NextResponse } from "next/server";
import {
  certifyUniverseV2Production,
  cutoverUniverseV2Production,
  loadUniverseV2ActivationProof,
  loadUniverseV2Health,
  migrateUniverseV2Page,
  repairUniverseV2Page,
  repairUniverseV2Player,
  rollbackUniverseV2Production,
} from "@/lib/boardsignal/server/universePulse";
import { classifyBoardSignalHttpError } from "@/lib/boardsignal/server/firestoreService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
function response(body: unknown, status = 200) { return NextResponse.json(body, { status, headers }); }

export async function GET() {
  try {
    const health = await loadUniverseV2Health();
    const proof = health.phase === "v2-active" ? await loadUniverseV2ActivationProof() : undefined;
    return response({ ok: true, health, proof });
  } catch (error) {
    const classified = classifyBoardSignalHttpError(error);
    return response({ ok: false, code: classified.code, error: classified.message }, classified.status);
  }
}

type OperationBody = {
  action?: "migratePage" | "repairPage" | "repairPlayer" | "certify" | "cutover" | "rollback";
  cursor?: string;
  playerId?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as OperationBody;
    switch (body.action) {
      case "migratePage": return response({ ok: true, result: await migrateUniverseV2Page() });
      case "repairPage": return response({ ok: true, result: await repairUniverseV2Page(body.cursor) });
      case "repairPlayer": {
        if (!body.playerId?.trim()) return response({ ok: false, code: "PLAYER_ID_REQUIRED", error: "playerId is required." }, 400);
        return response({ ok: true, result: await repairUniverseV2Player(body.playerId) });
      }
      case "certify": return response({ ok: true, result: await certifyUniverseV2Production() });
      case "cutover": return response({ ok: true, result: await cutoverUniverseV2Production() });
      case "rollback": return response({ ok: true, result: await rollbackUniverseV2Production() });
      default: return response({ ok: false, code: "UNIVERSE_OPERATION_REQUIRED", error: "A recognized Universe v2 operation is required." }, 400);
    }
  } catch (error) {
    const classified = classifyBoardSignalHttpError(error);
    return response({ ok: false, code: classified.code, error: classified.message }, classified.status);
  }
}
