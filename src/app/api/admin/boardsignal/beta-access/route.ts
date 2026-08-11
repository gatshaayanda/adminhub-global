import { NextResponse } from "next/server";
import {
  createFoundingBetaAccess,
  listFounderPlayerIdentities,
  resetFoundingBetaAccess,
  revokeFoundingBetaAccess,
} from "@/lib/boardsignal/server/betaAccess";
import { requireFounderBasicAuth } from "@/lib/boardsignal/server/founderAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export async function GET(request: Request) {
  try {
    requireFounderBasicAuth(request);
    return response({ ok: true, players: await listFounderPlayerIdentities() });
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Founding Beta identities could not be loaded." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    requireFounderBasicAuth(request);
    const body = await request.json() as { action?: unknown; username?: unknown; playerId?: unknown };
    if (body.action === "create" && typeof body.username === "string") {
      const result = await createFoundingBetaAccess(body.username);
      return response({
        ok: true,
        player: { username: result.account.chessCom.canonicalUsername, playerId: result.account.chessCom.playerId },
        accessCode: result.accessCode,
      });
    }
    if (body.action === "reset") {
      const result = await resetFoundingBetaAccess(body.playerId);
      return response({
        ok: true,
        player: result.account ? { username: result.account.chessCom.canonicalUsername, playerId: result.account.chessCom.playerId } : { playerId: Number(body.playerId) },
        accessCode: result.accessCode,
      });
    }
    if (body.action === "revoke") {
      return response({ ok: true, result: await revokeFoundingBetaAccess(body.playerId) });
    }
    return response({ ok: false, error: "Choose Create Beta Access, Reset Access, or Revoke Access." }, 400);
  } catch (error) {
    const status = Number((error as { status?: number }).status ?? 500);
    return response({
      ok: false,
      code: String((error as { code?: string }).code ?? "BETA_ACCESS_ADMIN_FAILED"),
      error: error instanceof Error ? error.message : "Founding Beta Access could not be updated.",
    }, status);
  }
}
