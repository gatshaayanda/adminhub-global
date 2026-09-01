import { NextResponse } from "next/server";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import {
  linkGoogleAccess,
  requestGoogleIdentityHelp,
  returnWithGoogle,
  verifyGoogleAccessToken,
} from "@/lib/boardsignal/server/googleAccess";
import {
  claimGoogleOnboardingProfile,
  resolveGoogleOnboardingProfile,
} from "@/lib/boardsignal/server/googleOnboarding";
import { refreshFounderPlayerSummaryByUid } from "@/lib/boardsignal/server/founderOperations";
import { refreshFounderDirectoryPlayer } from "@/lib/boardsignal/server/betaAccess";
import { evaluateBetaAccessAttempt, isValidBetaAccessCode, type BetaAccessRecord } from "@/lib/boardsignal/auth/betaAccess";
import type { BoardSignalAccount } from "@/lib/boardsignal/account";
import { resolveChessComPlayer } from "@/lib/boardsignal/processor";
import { getAdminAuth, getAdminDb } from "@/utils/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoogleAccessOrigin = "new_player_via_google" | "existing_player_linked_google";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function httpError(code: string, message: string, status = 409) {
  return Object.assign(new Error(message), { code, status });
}

async function recordGoogleAccessOrigin(uid: string, origin: GoogleAccessOrigin, overwrite = false) {
  const ref = getAdminDb().collection("users").doc(uid);
  await getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return;
    const current = String(snapshot.data()?.googleAccessOrigin ?? "");
    if (!overwrite && current) return;
    transaction.set(ref, { googleAccessOrigin: origin }, { merge: true });
  });
}

function betaAccessFailure(code: string) {
  if (code === "BETA_ACCESS_LOCKED") return httpError(code, "Founding Access is temporarily locked after repeated unsuccessful attempts. Try again later or use account help.", 429);
  if (code === "BETA_ACCESS_REVOKED") return httpError(code, "This private access code has been revoked. Use account help to recover this BoardSignal.", 403);
  return httpError("BETA_ACCESS_INVALID", "The Chess.com username and private access code did not match this existing BoardSignal.", 401);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      action?: unknown;
      googleIdToken?: unknown;
      expectedPlayerId?: unknown;
      username?: unknown;
      accessCode?: unknown;
      caseContactMethod?: unknown;
      caseContactValue?: unknown;
    };
    const action = String(body.action ?? "return");

    if (action === "link") {
      const playerToken = await requirePlayerToken(request);
      const result = await linkGoogleAccess(playerToken, body.googleIdToken);
      // Google is only a return key here. It must never create/increment a player.
      await recordGoogleAccessOrigin(playerToken.uid, "existing_player_linked_google").catch(() => undefined);
      return response({ ok: true, result });
    }
    if (action === "return") {
      const result = await returnWithGoogle(body.googleIdToken, body.expectedPlayerId);
      return response({ ok: true, result });
    }
    if (action === "resolveProfile") {
      const result = await resolveGoogleOnboardingProfile(body.googleIdToken, body.username);
      return response({ ok: true, result });
    }
    if (action === "claimProfile") {
      const result = await claimGoogleOnboardingProfile(body.googleIdToken, body.username);
      if (result.created) {
        // This is the only Google path allowed to add a BoardSignal player.
        await recordGoogleAccessOrigin(result.uid, "new_player_via_google", true).catch(() => undefined);
        // Founder/public player truth and the Founder directory must move with the
        // canonical player creation. Telemetry failure must never block entry.
        await refreshFounderPlayerSummaryByUid(result.uid)
          .then(() => refreshFounderDirectoryPlayer(result.playerId))
          .catch(() => undefined);
      }
      return response({ ok: true, result }, result.created ? 201 : 200);
    }
    if (action === "recoverLegacy") {
      await verifyGoogleAccessToken(body.googleIdToken);

      const expectedPlayerId = Number(body.expectedPlayerId);
      if (!Number.isSafeInteger(expectedPlayerId) || expectedPlayerId <= 0) {
        throw httpError("LEGACY_GOOGLE_RECOVERY_PLAYER_ID_REQUIRED", "BoardSignal could not verify which existing Chess.com identity to recover.", 400);
      }
      const username = String(body.username ?? "").trim().replace(/^@/, "");
      const accessCode = String(body.accessCode ?? "").trim();
      if (!/^[A-Za-z0-9_-]{2,50}$/.test(username)) {
        throw httpError("LEGACY_GOOGLE_RECOVERY_USERNAME_INVALID", "Enter the Chess.com username for this existing BoardSignal.", 400);
      }
      if (!isValidBetaAccessCode(accessCode)) throw betaAccessFailure("BETA_ACCESS_INVALID");

      const resolved = await resolveChessComPlayer(username);
      if (Number(resolved.playerId) !== expectedPlayerId) {
        throw httpError("LEGACY_GOOGLE_RECOVERY_IDENTITY_MISMATCH", "BoardSignal stopped a recovery identity mismatch before private data was opened.", 409);
      }

      const db = getAdminDb();
      const mappingRef = db.collection("chessPlayerAccounts").doc(String(expectedPlayerId));
      const accessRef = db.collection("betaAccess").doc(String(expectedPlayerId));
      const attempt = await db.runTransaction(async (transaction) => {
        const mappingSnapshot = await transaction.get(mappingRef);
        const mappedUid = mappingSnapshot.exists && typeof mappingSnapshot.data()?.uid === "string"
          ? String(mappingSnapshot.data()!.uid)
          : undefined;
        if (!mappedUid) return { ok: false as const, code: "LEGACY_GOOGLE_RECOVERY_NOT_EXISTING" };

        const userRef = db.collection("users").doc(mappedUid);
        const [userSnapshot, accessSnapshot] = await Promise.all([
          transaction.get(userRef),
          transaction.get(accessRef),
        ]);
        const account = userSnapshot.exists ? userSnapshot.data() as BoardSignalAccount : undefined;
        if (!account || account.uid !== mappedUid || account.role !== "player" || account.chessCom?.playerId !== expectedPlayerId) {
          return { ok: false as const, code: "LEGACY_GOOGLE_RECOVERY_NOT_EXISTING" };
        }
        if (account.accessStatus !== "active" || account.identityStatus === "revoked") {
          return { ok: false as const, code: "GOOGLE_ACCESS_REVOKED" };
        }
        if (!accessSnapshot.exists) return { ok: false as const, code: "BETA_ACCESS_INVALID" };
        const record = accessSnapshot.data() as BetaAccessRecord;
        if (record.playerId !== expectedPlayerId) return { ok: false as const, code: "BETA_ACCESS_INVALID" };

        const result = evaluateBetaAccessAttempt(record, accessCode);
        if (result.patch) {
          transaction.set(accessRef, { ...result.patch, canonicalUsername: resolved.username }, { merge: true });
        }
        if (!result.ok) return { ok: false as const, code: result.code };
        return { ok: true as const, account };
      });

      if (!attempt.ok) {
        if (attempt.code === "GOOGLE_ACCESS_REVOKED") throw httpError("GOOGLE_ACCESS_REVOKED", "This BoardSignal access is not active.", 403);
        if (attempt.code === "LEGACY_GOOGLE_RECOVERY_NOT_EXISTING") {
          throw httpError("LEGACY_GOOGLE_RECOVERY_NOT_EXISTING", "BoardSignal could not safely load the established private account for this Chess.com player.", 409);
        }
        throw betaAccessFailure(attempt.code);
      }

      const account = attempt.account;
      // The exact UID and stable player ID above were recovered from the existing
      // private account. linkGoogleAccess only reads these two DecodedIdToken fields.
      await linkGoogleAccess({
        uid: account.uid,
        chessPlayerId: String(expectedPlayerId),
      } as unknown as Parameters<typeof linkGoogleAccess>[0], body.googleIdToken);
      await recordGoogleAccessOrigin(account.uid, "existing_player_linked_google").catch(() => undefined);

      const customToken = await getAdminAuth().createCustomToken(account.uid, {
        role: "player",
        accessTier: account.accessTier,
        chessPlayerId: String(account.chessCom.playerId),
        chessUsername: account.chessCom.canonicalUsername,
        boardsignalAuthProvider: "google_recovery",
        boardsignalIdentityStatus: account.identityStatus ?? "provisional",
      });
      return response({
        ok: true,
        result: {
          customToken,
          uid: account.uid,
          playerId: account.chessCom.playerId,
          canonicalUsername: account.chessCom.canonicalUsername,
        },
      });
    }
    if (action === "identityHelp") {
      const result = await requestGoogleIdentityHelp(
        body.googleIdToken,
        body.username,
        body.caseContactMethod,
        body.caseContactValue,
      );
      return response({
        ok: true,
        status: "received",
        result,
        message: "Your ownership-review request was received. This did not grant, replace, merge, transfer or expose a private BoardSignal account.",
      });
    }

    return response({ ok: false, code: "GOOGLE_ACCESS_ACTION_INVALID", error: "Choose a supported Google access action." }, 400);
  } catch (error) {
    const status = Number((error as { status?: number }).status ?? 500);
    const code = String((error as { code?: string }).code ?? "GOOGLE_ACCESS_FAILED");
    const message = code === "GOOGLE_ACCESS_NOT_LINKED"
      ? "Google isn't connected to a BoardSignal yet. Continue with your Chess.com username. If BoardSignal finds an existing private account, verify your existing access so Google can be connected to that same BoardSignal."
      : error instanceof Error ? error.message : "Google access could not be completed.";
    return response({ ok: false, code, error: message }, Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500);
  }
}
