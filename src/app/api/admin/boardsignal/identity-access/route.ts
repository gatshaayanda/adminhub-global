import { NextResponse } from "next/server";
import { getAdminDb } from "@/utils/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
type CaseStatus = "open" | "awaiting_player" | "under_review" | "resolved" | "closed" | "rejected";
type CaseData = {
  type?: string; uid?: string; playerId?: number; canonicalUsername?: string; status?: CaseStatus;
  createdAt?: string; updatedAt?: string; resolvedAt?: string;
  requester?: { provider?: "google"; providerUidHash?: string; verifiedEmail?: string };
  contactForCase?: { method?: "email" | "discord"; value?: string };
  resolution?: { type?: string; uid?: string; playerId?: number };
};
type AliasData = { provider?: string; providerUidHash?: string; uid?: string; playerId?: number; canonicalUsername?: string; linkedAt?: string; lastUsedAt?: string; requesters?: Array<{ providerUidHash?: string; requestedAt?: string }> };
type AccountData = { uid?: string; role?: string; accessStatus?: string; identityStatus?: string; googleAccessConnectedAt?: string; googleAccessOrigin?: string; chessCom?: { playerId?: number; canonicalUsername?: string } };

function response(body: unknown, status = 200) { return NextResponse.json(body, { status, headers }); }
function httpError(code: string, message: string, status = 409) { return Object.assign(new Error(message), { code, status }); }
function playerId(value: unknown) { const parsed = Number(value); return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined; }
function caseId(value: unknown) {
  const id = String(value ?? "").trim();
  if (!/^identity_conflict_\d+_[a-f0-9]{20}$/.test(id)) throw httpError("IDENTITY_CASE_ID_INVALID", "Choose a valid access / identity case.", 400);
  return id;
}
function caseStatus(value: unknown): CaseStatus {
  const status = String(value ?? "") as CaseStatus;
  if (!["open", "awaiting_player", "under_review", "resolved", "closed", "rejected"].includes(status)) throw httpError("IDENTITY_CASE_STATUS_INVALID", "Choose a supported access / identity case state.", 400);
  return status;
}
function founderView(id: string, data: CaseData) {
  const hash = String(data.requester?.providerUidHash ?? "");
  return {
    caseId: id,
    status: data.status ?? "open",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    resolvedAt: data.resolvedAt,
    requestedChessCom: { canonicalUsername: data.canonicalUsername, playerId: data.playerId },
    existingBoardSignalUid: data.uid,
    requester: { googleReference: hash ? `${hash.slice(0, 12)}…${hash.slice(-6)}` : undefined, verifiedEmail: data.requester?.verifiedEmail },
    contact: data.contactForCase,
    resolution: data.resolution,
  };
}

export async function GET() {
  try {
    const snapshot = await getAdminDb().collection("exceptions").where("type", "==", "identity_conflict").limit(100).get();
    const cases = snapshot.docs.map((doc) => founderView(doc.id, doc.data() as CaseData)).sort((a, b) => String(b.updatedAt ?? b.createdAt ?? "").localeCompare(String(a.updatedAt ?? a.createdAt ?? "")));
    return response({ ok: true, cases });
  } catch (error) {
    return response({ ok: false, code: String((error as { code?: string }).code ?? "IDENTITY_CASE_LIST_FAILED"), error: error instanceof Error ? error.message : "Access / identity cases could not be loaded." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: unknown; caseId?: unknown; status?: unknown };
    const id = caseId(body.caseId);
    const action = String(body.action ?? "");
    const db = getAdminDb();
    const ref = db.collection("exceptions").doc(id);
    const now = new Date().toISOString();

    if (action === "setStatus") {
      const next = caseStatus(body.status);
      if (next === "resolved") throw httpError("IDENTITY_CASE_RESOLUTION_ACTION_REQUIRED", "Use the guarded Google-connect action to resolve a legacy continuity case.", 400);
      const snapshot = await ref.get();
      if (!snapshot.exists || snapshot.data()?.type !== "identity_conflict") throw httpError("IDENTITY_CASE_NOT_FOUND", "This access / identity case no longer exists.", 404);
      await ref.set({ status: next, updatedAt: now, founder: { lastAction: `status:${next}`, lastActionAt: now } }, { merge: true });
      return response({ ok: true });
    }

    if (action === "connectRequesterGoogle") {
      const result = await db.runTransaction(async (tx) => {
        const caseSnapshot = await tx.get(ref);
        if (!caseSnapshot.exists) throw httpError("IDENTITY_CASE_NOT_FOUND", "This access / identity case no longer exists.", 404);
        const accessCase = caseSnapshot.data() as CaseData;
        if (accessCase.type !== "identity_conflict") throw httpError("IDENTITY_CASE_TYPE_INVALID", "This record is not an access / identity case.");
        const uid = String(accessCase.uid ?? "");
        const targetPlayerId = playerId(accessCase.playerId);
        const providerUidHash = String(accessCase.requester?.providerUidHash ?? "");
        if (!uid || !targetPlayerId || !/^[a-f0-9]{64}$/.test(providerUidHash)) throw httpError("IDENTITY_CASE_REFERENCE_INVALID", "This case is missing a safe canonical account or requester reference.");

        const userRef = db.collection("users").doc(uid);
        const subjectRef = db.collection("playerIdentityAliases").doc(`google_${providerUidHash}`);
        const playerRef = db.collection("playerIdentityAliases").doc(`google_player_${targetPlayerId}`);
        const conflictRef = db.collection("playerIdentityAliases").doc(`google_conflict_${targetPlayerId}`);
        const userSnapshot = await tx.get(userRef);
        const subjectSnapshot = await tx.get(subjectRef);
        const playerSnapshot = await tx.get(playerRef);
        const conflictSnapshot = await tx.get(conflictRef);
        if (!userSnapshot.exists) throw httpError("IDENTITY_CASE_ACCOUNT_MISSING", "The existing private BoardSignal could not be loaded.");
        const account = userSnapshot.data() as AccountData;
        const canonicalUsername = String(account.chessCom?.canonicalUsername ?? accessCase.canonicalUsername ?? "").trim();
        if (account.uid !== uid || account.role !== "player" || playerId(account.chessCom?.playerId) !== targetPlayerId || !canonicalUsername) throw httpError("IDENTITY_CASE_ACCOUNT_MISMATCH", "BoardSignal stopped a canonical account mismatch.");
        if (account.accessStatus !== "active" || account.identityStatus === "revoked") throw httpError("IDENTITY_CASE_ACCOUNT_INACTIVE", "This private BoardSignal is not active. Google was not connected.");

        const subject = subjectSnapshot.exists ? subjectSnapshot.data() as AliasData : undefined;
        if (subject && (subject.provider !== "google_access" || subject.providerUidHash !== providerUidHash || subject.uid !== uid || playerId(subject.playerId) !== targetPlayerId)) throw httpError("GOOGLE_ACCESS_IN_USE", "This requester Google identity is already attached to a different active private BoardSignal. Nothing was merged or overwritten.");
        const reverse = playerSnapshot.exists ? playerSnapshot.data() as AliasData : undefined;
        if (reverse && (reverse.provider !== "google_access_player" || reverse.providerUidHash !== providerUidHash || reverse.uid !== uid || playerId(reverse.playerId) !== targetPlayerId)) throw httpError("GOOGLE_ACCESS_PLAYER_ALREADY_LINKED", "This BoardSignal already has a different Google return key. Nothing was replaced or merged.");

        const linkedAt = subject?.linkedAt ?? reverse?.linkedAt ?? now;
        tx.set(subjectRef, { provider: "google_access", providerUidHash, uid, playerId: targetPlayerId, canonicalUsername, linkedAt, ...(subject?.lastUsedAt ? { lastUsedAt: subject.lastUsedAt } : {}) }, { merge: true });
        tx.set(playerRef, { provider: "google_access_player", providerUidHash, uid, playerId: targetPlayerId, canonicalUsername, linkedAt }, { merge: true });
        const conflict = conflictSnapshot.exists ? conflictSnapshot.data() as AliasData : undefined;
        const remaining = Array.isArray(conflict?.requesters) ? conflict!.requesters!.filter((item) => item?.providerUidHash && item.providerUidHash !== providerUidHash) : [];
        if (conflictSnapshot.exists) {
          if (remaining.length) tx.set(conflictRef, { requesters: remaining }, { merge: true });
          else tx.delete(conflictRef);
        }
        tx.set(userRef, { googleAccessConnectedAt: linkedAt, googleAccessOrigin: account.googleAccessOrigin || "existing_player_linked_google", identityConflictOpen: remaining.length > 0 }, { merge: true });
        tx.set(ref, { status: "resolved", updatedAt: now, resolvedAt: now, founder: { lastAction: "connect_requester_google_to_existing_boardsignal", lastActionAt: now }, resolution: { type: "google_connected_to_existing_uid", uid, playerId: targetPlayerId } }, { merge: true });
        return { uid, playerId: targetPlayerId, linkedAt };
      });
      return response({ ok: true, result });
    }

    throw httpError("IDENTITY_CASE_ACTION_INVALID", "Choose a supported access / identity case action.", 400);
  } catch (error) {
    const status = Number((error as { status?: number }).status ?? 500);
    return response({ ok: false, code: String((error as { code?: string }).code ?? "IDENTITY_CASE_ACTION_FAILED"), error: error instanceof Error ? error.message : "The access / identity case could not be updated." }, Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500);
  }
}
