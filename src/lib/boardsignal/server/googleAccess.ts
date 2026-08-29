import "server-only";

import { createHash } from "node:crypto";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import type { BoardSignalAccount } from "../account";
import { firebaseUidForChessPlayer } from "../account";
import { resolveChessComPlayer } from "../processor";
import { getAdminAuth, getAdminDb } from "../../../utils/firebaseAdmin";
import { refreshFounderPlayerSummaryByUid } from "./founderOperations";

const GOOGLE_ALIAS_PREFIX = "google_";
const GOOGLE_PLAYER_ALIAS_PREFIX = "google_player_";
const GOOGLE_CONFLICT_ALIAS_PREFIX = "google_conflict_";
const GOOGLE_LAST_USED_WRITE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const IDENTITY_HELP_REPEAT_WINDOW_MS = 60 * 60 * 1000;
const MAX_IDENTITY_HELP_REQUESTERS = 5;

export const GOOGLE_ACCESS_BUDGET = Object.freeze({
  link: { directReads: 3, writes: 3 },
  return: { directReads: 3, writes: "0 normally; 1 at most once per 24h per Google mapping" },
  identityHelp: { directReads: "2 normal + bounded conflict transaction reads", writes: "0 when no established target; otherwise 2" },
});

type GoogleIdentity = {
  firebaseUid: string;
  providerUidHash: string;
  verifiedEmail?: string;
};

type GoogleSubjectAlias = {
  provider?: string;
  providerUidHash?: string;
  uid?: string;
  playerId?: number;
  canonicalUsername?: string;
  linkedAt?: string;
  lastUsedAt?: string;
};

type GooglePlayerAlias = GoogleSubjectAlias & {
  provider?: string;
};

type IdentityHelpRequester = {
  providerUidHash: string;
  requestedAt: string;
};

type IdentityHelpAlias = {
  provider?: string;
  uid?: string;
  playerId?: number;
  canonicalUsername?: string;
  openedAt?: string;
  requesters?: IdentityHelpRequester[];
};

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function googleSubjectHash(firebaseUid: string) {
  return createHash("sha256").update(`boardsignal-google:${firebaseUid}`).digest("hex");
}

function googleSubjectAliasId(providerUidHash: string) {
  return `${GOOGLE_ALIAS_PREFIX}${providerUidHash}`;
}

function googlePlayerAliasId(playerId: number) {
  return `${GOOGLE_PLAYER_ALIAS_PREFIX}${playerId}`;
}

function googleConflictAliasId(playerId: number) {
  return `${GOOGLE_CONFLICT_ALIAS_PREFIX}${playerId}`;
}

function playerId(value: unknown) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function httpError(code: string, message: string, status = 409) {
  return Object.assign(new Error(message), { code, status });
}

function activeBoardSignalAccount(snapshot: DocumentSnapshot, expectedUid: string, expectedPlayerId?: number) {
  if (!snapshot.exists) throw httpError("GOOGLE_ACCESS_NOT_LINKED", "No active BoardSignal is connected to this Google account.", 404);
  const account = snapshot.data() as BoardSignalAccount;
  if (account.uid !== expectedUid || account.role !== "player") throw httpError("GOOGLE_ACCESS_MAPPING_MISMATCH", "BoardSignal stopped an identity mapping mismatch.", 409);
  if (account.accessStatus !== "active" || account.identityStatus === "revoked") throw httpError("GOOGLE_ACCESS_REVOKED", "This BoardSignal access is not active.", 403);
  if (expectedPlayerId && account.chessCom?.playerId !== expectedPlayerId) throw httpError("GOOGLE_ACCESS_MAPPING_MISMATCH", "BoardSignal stopped an identity mapping mismatch.", 409);
  return account;
}

export async function verifyGoogleAccessToken(idTokenInput: unknown): Promise<GoogleIdentity> {
  const idToken = String(idTokenInput ?? "").trim();
  if (idToken.length < 100 || idToken.length > 20_000) throw httpError("GOOGLE_TOKEN_REQUIRED", "Google sign-in did not return a valid Firebase token.", 401);
  let decoded: DecodedIdToken;
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken, true);
  } catch {
    throw httpError("GOOGLE_TOKEN_INVALID", "Google sign-in could not be verified.", 401);
  }
  const provider = decoded.firebase?.sign_in_provider;
  if (provider !== "google.com") throw httpError("GOOGLE_PROVIDER_REQUIRED", "Use a Google-authenticated Firebase session for Google access.", 401);
  if (!decoded.uid) throw httpError("GOOGLE_TOKEN_INVALID", "Google sign-in did not return a stable Firebase identity.", 401);
  return {
    firebaseUid: decoded.uid,
    providerUidHash: googleSubjectHash(decoded.uid),
    verifiedEmail: decoded.email_verified === true && typeof decoded.email === "string" ? decoded.email : undefined,
  };
}

function customTokenClaims(account: BoardSignalAccount, provider: string) {
  return {
    role: "player",
    accessTier: account.accessTier,
    chessPlayerId: String(account.chessCom.playerId),
    chessUsername: account.chessCom.canonicalUsername,
    boardsignalAuthProvider: provider,
    boardsignalIdentityStatus: account.identityStatus ?? "provisional",
  };
}

export async function linkGoogleAccess(playerToken: DecodedIdToken, googleIdToken: unknown) {
  const google = await verifyGoogleAccessToken(googleIdToken);
  const db = getAdminDb();
  const userRef = db.collection("users").doc(playerToken.uid);
  const subjectRef = db.collection("playerIdentityAliases").doc(googleSubjectAliasId(google.providerUidHash));
  const claimedPlayerId = playerId(playerToken.chessPlayerId);
  if (!claimedPlayerId) throw httpError("GOOGLE_LINK_PLAYER_ID_REQUIRED", "This Player Room session is missing its stable Chess.com identity.", 403);
  const playerRef = db.collection("playerIdentityAliases").doc(googlePlayerAliasId(claimedPlayerId));
  const now = new Date().toISOString();

  const result = await db.runTransaction(async (transaction) => {
    const accountSnapshot = await transaction.get(userRef);
    const subjectSnapshot = await transaction.get(subjectRef);
    const playerSnapshot = await transaction.get(playerRef);
    const account = activeBoardSignalAccount(accountSnapshot, playerToken.uid, claimedPlayerId);

    const subject = subjectSnapshot.exists ? subjectSnapshot.data() as GoogleSubjectAlias : undefined;
    if (subject && (subject.provider !== "google_access" || subject.providerUidHash !== google.providerUidHash || subject.uid !== account.uid || Number(subject.playerId) !== claimedPlayerId)) {
      throw httpError("GOOGLE_ACCESS_IN_USE", "This Google account is already connected to another BoardSignal. Accounts are never merged automatically.", 409);
    }

    const reverse = playerSnapshot.exists ? playerSnapshot.data() as GooglePlayerAlias : undefined;
    if (reverse && (reverse.provider !== "google_access_player" || reverse.uid !== account.uid || Number(reverse.playerId) !== claimedPlayerId || reverse.providerUidHash !== google.providerUidHash)) {
      throw httpError("GOOGLE_ACCESS_PLAYER_ALREADY_LINKED", "This BoardSignal already has a different Google return key. BoardSignal will not replace or merge it automatically.", 409);
    }

    const linkedAt = subject?.linkedAt ?? reverse?.linkedAt ?? now;
    transaction.set(subjectRef, clean({
      provider: "google_access",
      providerUidHash: google.providerUidHash,
      uid: account.uid,
      playerId: claimedPlayerId,
      canonicalUsername: account.chessCom.canonicalUsername,
      linkedAt,
      ...(subject?.lastUsedAt ? { lastUsedAt: subject.lastUsedAt } : {}),
    }), { merge: true });
    transaction.set(playerRef, clean({
      provider: "google_access_player",
      providerUidHash: google.providerUidHash,
      uid: account.uid,
      playerId: claimedPlayerId,
      canonicalUsername: account.chessCom.canonicalUsername,
      linkedAt,
    }), { merge: true });
    transaction.set(userRef, { googleAccessConnectedAt: linkedAt }, { merge: true });
    return { account, linkedAt };
  });

  return {
    linkedAt: result.linkedAt,
    verifiedEmail: google.verifiedEmail,
    identityStatus: result.account.identityStatus ?? "provisional",
    chessComOwnershipVerified: result.account.identityStatus === "oauth_verified",
  };
}

export async function returnWithGoogle(googleIdToken: unknown, expectedPlayerIdInput?: unknown) {
  const google = await verifyGoogleAccessToken(googleIdToken);
  const expectedPlayerId = expectedPlayerIdInput === undefined || expectedPlayerIdInput === null || expectedPlayerIdInput === ""
    ? undefined
    : playerId(expectedPlayerIdInput);
  if (expectedPlayerIdInput !== undefined && expectedPlayerIdInput !== null && expectedPlayerIdInput !== "" && !expectedPlayerId) {
    throw httpError("GOOGLE_RETURN_PLAYER_ID_INVALID", "The requested BoardSignal identity was invalid.", 400);
  }

  const db = getAdminDb();
  const subjectRef = db.collection("playerIdentityAliases").doc(googleSubjectAliasId(google.providerUidHash));
  const subjectSnapshot = await subjectRef.get();
  if (!subjectSnapshot.exists) throw httpError("GOOGLE_ACCESS_NOT_LINKED", "No BoardSignal is connected to this Google account yet. Start with your Chess.com username, then connect Google from your Player Room.", 404);
  const subject = subjectSnapshot.data() as GoogleSubjectAlias;
  const mappedPlayerId = playerId(subject.playerId);
  if (subject.provider !== "google_access" || subject.providerUidHash !== google.providerUidHash || !subject.uid || !mappedPlayerId) {
    throw httpError("GOOGLE_ACCESS_MAPPING_MISMATCH", "BoardSignal stopped an invalid Google access mapping.", 409);
  }
  if (expectedPlayerId && mappedPlayerId !== expectedPlayerId) {
    throw httpError("GOOGLE_ACCESS_NOT_LINKED", "This Google account is not authorised for that BoardSignal. No private account was opened.", 404);
  }

  const userRef = db.collection("users").doc(subject.uid);
  const playerRef = db.collection("playerIdentityAliases").doc(googlePlayerAliasId(mappedPlayerId));
  const userSnapshot = await userRef.get();
  const playerSnapshot = await playerRef.get();
  const account = activeBoardSignalAccount(userSnapshot, subject.uid, mappedPlayerId);
  const reverse = playerSnapshot.exists ? playerSnapshot.data() as GooglePlayerAlias : undefined;
  if (!reverse || reverse.provider !== "google_access_player" || reverse.providerUidHash !== google.providerUidHash || reverse.uid !== account.uid || Number(reverse.playerId) !== mappedPlayerId) {
    throw httpError("GOOGLE_ACCESS_MAPPING_MISMATCH", "BoardSignal stopped an incomplete Google access mapping.", 409);
  }

  const lastUsed = subject.lastUsedAt ? Date.parse(subject.lastUsedAt) : 0;
  if (!Number.isFinite(lastUsed) || Date.now() - lastUsed >= GOOGLE_LAST_USED_WRITE_INTERVAL_MS) {
    await subjectRef.set({ lastUsedAt: new Date().toISOString() }, { merge: true }).catch(() => undefined);
  }

  const customToken = await getAdminAuth().createCustomToken(account.uid, customTokenClaims(account, "google_return"));
  return {
    customToken,
    uid: account.uid,
    playerId: account.chessCom.playerId,
    canonicalUsername: account.chessCom.canonicalUsername,
    verifiedEmail: google.verifiedEmail,
  };
}

export async function requestGoogleIdentityHelp(googleIdToken: unknown, usernameInput: unknown) {
  const google = await verifyGoogleAccessToken(googleIdToken);
  const requestedUsername = String(usernameInput ?? "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_-]{2,50}$/.test(requestedUsername)) throw httpError("IDENTITY_HELP_USERNAME_INVALID", "Enter a valid Chess.com username.", 400);

  const resolved = await resolveChessComPlayer(requestedUsername);
  const targetPlayerId = playerId(resolved.playerId);
  if (!targetPlayerId) throw httpError("IDENTITY_HELP_PLAYER_INVALID", "Chess.com did not return the stable player ID BoardSignal requires.", 422);
  const targetUid = firebaseUidForChessPlayer(targetPlayerId);
  const db = getAdminDb();
  const targetRef = db.collection("users").doc(targetUid);
  const subjectRef = db.collection("playerIdentityAliases").doc(googleSubjectAliasId(google.providerUidHash));
  const [targetSnapshot, subjectSnapshot] = await Promise.all([targetRef.get(), subjectRef.get()]);
  const target = targetSnapshot.exists ? targetSnapshot.data() as BoardSignalAccount : undefined;
  const subject = subjectSnapshot.exists ? subjectSnapshot.data() as GoogleSubjectAlias : undefined;

  if (!target || target.role !== "player" || target.uid !== targetUid || target.chessCom?.playerId !== targetPlayerId || target.accessStatus === "deleted") {
    return { recorded: false };
  }
  if (subject?.provider === "google_access" && subject.uid === targetUid && Number(subject.playerId) === targetPlayerId) {
    return { recorded: false };
  }

  const conflictRef = db.collection("playerIdentityAliases").doc(googleConflictAliasId(targetPlayerId));
  const openedAt = new Date().toISOString();
  await db.runTransaction(async (transaction) => {
    const latestTarget = await transaction.get(targetRef);
    const existingConflict = await transaction.get(conflictRef);
    if (!latestTarget.exists) return;
    const account = latestTarget.data() as BoardSignalAccount;
    if (account.uid !== targetUid || account.chessCom?.playerId !== targetPlayerId || account.accessStatus === "deleted") return;
    const conflict = existingConflict.exists ? existingConflict.data() as IdentityHelpAlias : undefined;
    const prior = Array.isArray(conflict?.requesters) ? conflict!.requesters!.filter((item) => item && typeof item.providerUidHash === "string" && typeof item.requestedAt === "string") : [];
    const previousSame = prior.find((item) => item.providerUidHash === google.providerUidHash);
    const previousAt = previousSame ? Date.parse(previousSame.requestedAt) : 0;
    const requesters = Number.isFinite(previousAt) && Date.now() - previousAt < IDENTITY_HELP_REPEAT_WINDOW_MS
      ? prior
      : [...prior.filter((item) => item.providerUidHash !== google.providerUidHash), { providerUidHash: google.providerUidHash, requestedAt: openedAt }].slice(-MAX_IDENTITY_HELP_REQUESTERS);
    transaction.set(conflictRef, clean({
      provider: "google_identity_conflict",
      uid: targetUid,
      playerId: targetPlayerId,
      canonicalUsername: resolved.username,
      openedAt: conflict?.openedAt ?? openedAt,
      requesters,
    }), { merge: true });
    transaction.set(targetRef, { identityConflictOpen: true, identityConflictOpenedAt: conflict?.openedAt ?? openedAt }, { merge: true });
  });

  await refreshFounderPlayerSummaryByUid(targetUid).catch(() => undefined);
  return { recorded: true };
}
