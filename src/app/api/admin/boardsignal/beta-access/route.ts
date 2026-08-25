import { NextResponse } from "next/server";
import {
  createFoundingBetaAccess,
  listFounderPlayerIdentities,
  resetFoundingBetaAccess,
  revokeFoundingBetaAccess,
} from "@/lib/boardsignal/server/betaAccess";
import { deleteBoardSignalAccount } from "@/lib/boardsignal/server/accountDeletion";
import {
  approveFoundingBetaRequest,
  confirmFoundingBetaIdentity,
  listFoundingBetaRequests,
  regenerateFoundingBetaMagicAccess,
  rejectFoundingBetaRequest,
  revokeProvisionalFoundingBetaIdentity,
} from "@/lib/boardsignal/server/betaRequests";
import { repairSafePublicCoverageForPlayer } from "@/lib/boardsignal/server/publicCoverageRepair";
import { registerFounderNotificationDevice, unregisterFounderNotificationDevice } from "@/lib/boardsignal/server/activation";
import {
  clearFounderPendingRequestSummary,
  removeFounderPlayerSummary,
} from "@/lib/boardsignal/server/founderMaterialized";
import { refreshFounderPlayerSummaryByUid } from "@/lib/boardsignal/server/founderOperations";
import {
  refreshMaterializedUniverseParticipantForPlayerId,
  removeMaterializedUniverseParticipant,
} from "@/lib/boardsignal/server/universePulse";
import { serviceHttpError } from "@/lib/boardsignal/server/firestoreService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200, retryAfter?: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
      ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
    },
  });
}

function errorStatus(error: unknown) {
  const status = Number((error as { status?: unknown }).status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

function failure(error: unknown, code: string) {
  const service = serviceHttpError(error);
  if (service) return response({ ok: false, code: String((service as { code?: string }).code), error: service.message }, 503, Number((service as { retryAfterSeconds?: number }).retryAfterSeconds ?? 15));
  return response({
    ok: false,
    code: String((error as { code?: string }).code ?? code),
    stage: typeof (error as { stage?: unknown }).stage === "string" ? String((error as { stage?: string }).stage) : undefined,
    error: error instanceof Error ? error.message : "Founding Access could not be updated.",
  }, errorStatus(error));
}

async function settlePendingRequest(request: { id: string; firebaseUid?: string; chessPlayerId?: number }) {
  await clearFounderPendingRequestSummary(request.id).catch(() => undefined);
  if (request.firebaseUid) await refreshFounderPlayerSummaryByUid(request.firebaseUid).catch(() => undefined);
  if (request.chessPlayerId) await refreshMaterializedUniverseParticipantForPlayerId(request.chessPlayerId).catch(() => undefined);
}

export async function GET() {
  try {
    const [players, requests] = await Promise.all([listFounderPlayerIdentities(), listFoundingBetaRequests()]);
    return response({ ok: true, players, requests });
  } catch (error) {
    return failure(error, "BETA_ACCESS_ADMIN_LIST_FAILED");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: unknown; username?: unknown; playerId?: unknown; requestId?: unknown; confirmationUsername?: unknown; fcmToken?: unknown; userAgent?: unknown };
    if (body.action === "deleteAccount") {
      const deletion = await deleteBoardSignalAccount({ playerId: body.playerId, confirmationUsername: body.confirmationUsername });
      // Retry-safe derived cleanup. The account-deletion implementation also owns these
      // records; this route-level cleanup is defense in depth for old partially-deleted accounts.
      await Promise.all([
        removeMaterializedUniverseParticipant(deletion.playerId).catch(() => undefined),
        removeFounderPlayerSummary(deletion.playerId).catch(() => undefined),
        clearFounderPendingRequestSummary(String(deletion.playerId)).catch(() => undefined),
      ]);
      return response({ ok: true, deletion });
    }
    if (body.action === "confirmIdentity" && typeof body.requestId === "string") {
      const result = await confirmFoundingBetaIdentity(body.requestId);
      await settlePendingRequest(result.request);
      return response({
        ok: true,
        player: { username: result.request.canonicalUsername, playerId: result.request.chessPlayerId },
        playerAlreadyInside: result.playerAlreadyInside,
        accessCode: "accessCode" in result ? result.accessCode : undefined,
        approvalMessage: "approvalMessage" in result ? result.approvalMessage : undefined,
        magicLink: "magicLink" in result ? result.magicLink : undefined,
        magicAccessExpiresAt: "magicAccessExpiresAt" in result ? result.magicAccessExpiresAt : undefined,
        publicHighlights: "publicHighlights" in result ? result.publicHighlights : undefined,
      });
    }
    if (body.action === "revokeIdentity" && typeof body.requestId === "string") {
      const result = await revokeProvisionalFoundingBetaIdentity(body.requestId);
      await clearFounderPendingRequestSummary(body.requestId).catch(() => undefined);
      return response({ ok: true, result });
    }
    if (body.action === "approveRequest" && typeof body.requestId === "string") {
      const result = await approveFoundingBetaRequest(body.requestId);
      await settlePendingRequest(result.request);
      return response({
        ok: true,
        player: { username: result.request.canonicalUsername, playerId: result.request.chessPlayerId },
        accessCode: result.accessCode,
        approvalMessage: result.approvalMessage,
        magicLink: result.magicLink,
        magicAccessExpiresAt: result.magicAccessExpiresAt,
        accessEmailDelivery: result.accessEmailDelivery,
        deviceDelivery: result.deviceDelivery,
        publicHighlights: result.publicHighlights,
      });
    }
    if (body.action === "rejectRequest" && typeof body.requestId === "string") {
      const rejected = await rejectFoundingBetaRequest(body.requestId);
      await clearFounderPendingRequestSummary(rejected.id).catch(() => undefined);
      return response({ ok: true, request: rejected });
    }
    if (body.action === "regenerateMagic" && typeof body.requestId === "string") {
      const result = await regenerateFoundingBetaMagicAccess(body.requestId);
      return response({ ok: true, magicLink: result.magicLink, magicAccessExpiresAt: result.magicAccessExpiresAt, approvalMessage: result.approvalMessage });
    }
    if (body.action === "registerFounderPush") return response({ ok: true, result: await registerFounderNotificationDevice(body.fcmToken, body.userAgent) });
    if (body.action === "unregisterFounderPush") return response({ ok: true, result: await unregisterFounderNotificationDevice(body.fcmToken) });
    if (body.action === "repairPublicHighlights") {
      const publicHighlights = await repairSafePublicCoverageForPlayer(body.playerId);
      const playerId = Number(body.playerId);
      if (Number.isSafeInteger(playerId) && playerId > 0) await refreshMaterializedUniverseParticipantForPlayerId(playerId).catch(() => undefined);
      return response({ ok: true, publicHighlights });
    }
    if (body.action === "create" && typeof body.username === "string") {
      const result = await createFoundingBetaAccess(body.username);
      await refreshFounderPlayerSummaryByUid(result.account.uid).catch(() => undefined);
      return response({ ok: true, player: { username: result.account.chessCom.canonicalUsername, playerId: result.account.chessCom.playerId }, accessCode: result.accessCode });
    }
    if (body.action === "reset") {
      const result = await resetFoundingBetaAccess(body.playerId);
      return response({ ok: true, player: result.account ? { username: result.account.chessCom.canonicalUsername, playerId: result.account.chessCom.playerId } : { playerId: Number(body.playerId) }, accessCode: result.accessCode });
    }
    if (body.action === "revoke") {
      const result = await revokeFoundingBetaAccess(body.playerId);
      await removeMaterializedUniverseParticipant(result.playerId).catch(() => undefined);
      return response({ ok: true, result });
    }
    return response({ ok: false, error: "Choose Confirm/Revoke Identity, Repair Public Highlights, recovery access, Founder Alerts, Create access, Reset Access, Revoke Access, or Delete BoardSignal Account." }, 400);
  } catch (error) {
    return failure(error, "BETA_ACCESS_ADMIN_FAILED");
  }
}
