import { NextResponse } from "next/server";
import {
  createFoundingBetaAccess,
  listFounderPlayerIdentities,
  resetFoundingBetaAccess,
  revokeFoundingBetaAccess,
} from "@/lib/boardsignal/server/betaAccess";
import {
  approveFoundingBetaRequest,
  confirmFoundingBetaIdentity,
  listFoundingBetaRequests,
  regenerateFoundingBetaMagicAccess,
  rejectFoundingBetaRequest,
  revokeProvisionalFoundingBetaIdentity,
} from "@/lib/boardsignal/server/betaRequests";
import { registerFounderNotificationDevice, unregisterFounderNotificationDevice } from "@/lib/boardsignal/server/activation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
  });
}

function errorStatus(error: unknown) {
  const status = Number((error as { status?: unknown }).status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

export async function GET() {
  try {
    const [players, requests] = await Promise.all([
      listFounderPlayerIdentities(),
      listFoundingBetaRequests(),
    ]);
    return response({ ok: true, players, requests });
  } catch (error) {
    return response({
      ok: false,
      code: String((error as { code?: string }).code ?? "BETA_ACCESS_ADMIN_LIST_FAILED"),
      error: error instanceof Error ? error.message : "Founding Beta identities could not be loaded.",
    }, errorStatus(error));
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: unknown; username?: unknown; playerId?: unknown; requestId?: unknown; fcmToken?: unknown; userAgent?: unknown };
    if (body.action === "confirmIdentity" && typeof body.requestId === "string") {
      const result = await confirmFoundingBetaIdentity(body.requestId);
      const resultRequest = result.request;
      return response({
        ok: true,
        player: { username: resultRequest.canonicalUsername, playerId: resultRequest.chessPlayerId },
        playerAlreadyInside: result.playerAlreadyInside,
        accessCode: "accessCode" in result ? result.accessCode : undefined,
        approvalMessage: "approvalMessage" in result ? result.approvalMessage : undefined,
        magicLink: "magicLink" in result ? result.magicLink : undefined,
        magicAccessExpiresAt: "magicAccessExpiresAt" in result ? result.magicAccessExpiresAt : undefined,
      });
    }
    if (body.action === "revokeIdentity" && typeof body.requestId === "string") {
      return response({ ok: true, result: await revokeProvisionalFoundingBetaIdentity(body.requestId) });
    }
    if (body.action === "approveRequest" && typeof body.requestId === "string") {
      const result = await approveFoundingBetaRequest(body.requestId);
      return response({
        ok: true,
        player: { username: result.request.canonicalUsername, playerId: result.request.chessPlayerId },
        accessCode: result.accessCode,
        approvalMessage: result.approvalMessage,
        magicLink: result.magicLink,
        magicAccessExpiresAt: result.magicAccessExpiresAt,
        accessEmailDelivery: result.accessEmailDelivery,
        deviceDelivery: result.deviceDelivery,
      });
    }
    if (body.action === "rejectRequest" && typeof body.requestId === "string") {
      return response({ ok: true, request: await rejectFoundingBetaRequest(body.requestId) });
    }
    if (body.action === "regenerateMagic" && typeof body.requestId === "string") {
      const result = await regenerateFoundingBetaMagicAccess(body.requestId);
      return response({ ok: true, magicLink: result.magicLink, magicAccessExpiresAt: result.magicAccessExpiresAt, approvalMessage: result.approvalMessage });
    }
    if (body.action === "registerFounderPush") {
      return response({ ok: true, result: await registerFounderNotificationDevice(body.fcmToken, body.userAgent) });
    }
    if (body.action === "unregisterFounderPush") {
      return response({ ok: true, result: await unregisterFounderNotificationDevice(body.fcmToken) });
    }
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
    return response({ ok: false, error: "Choose Confirm/Revoke Identity, recovery access, Founder Alerts, Create Beta Access, Reset Access, or Revoke Access." }, 400);
  } catch (error) {
    return response({
      ok: false,
      code: String((error as { code?: string }).code ?? "BETA_ACCESS_ADMIN_FAILED"),
      error: error instanceof Error ? error.message : "Founding Beta Access could not be updated.",
    }, errorStatus(error));
  }
}
