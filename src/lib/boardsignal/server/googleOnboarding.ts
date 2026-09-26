import "server-only";

import type { BoardSignalAccount, StableChessComIdentity } from "../account";
import { createFoundingBetaAccount, firebaseUidForChessPlayer } from "../account";
import { resolveChessComIdentityInput } from "../chessComIdentityResolution";
import { getAdminAuth, getAdminDb } from "../../../utils/firebaseAdmin";
import { verifyGoogleAccessToken } from "./googleAccess";

export const GOOGLE_ONBOARDING_BUDGET = Object.freeze({
  resolveProfile: { firestoreReads: 0, firestoreWrites: 0, chessComProfileResolutions: 1 },
  claimProfile: { transactionReads: 4, writesWhenNew: 5, privateReviewGeneration: 0 },
});

type GoogleSubjectAlias = {
  provider?: string;
  providerUidHash?: string;
  uid?: string;
  playerId?: number;
  canonicalUsername?: string;
  linkedAt?: string;
  lastUsedAt?: string;
};

type GooglePlayerAlias = GoogleSubjectAlias & { provider?: string };

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function httpError(code: string, message: string, status = 409) {
  return Object.assign(new Error(message), { code, status });
}

function googleSubjectAliasId(providerUidHash: string) {
  return `google_${providerUidHash}`;
}

function googlePlayerAliasId(playerId: number) {
  return `google_player_${playerId}`;
}

function resolvedIdentity(resolved: Awaited<ReturnType<typeof resolveChessComIdentityInput>>): StableChessComIdentity {
  const playerId = Number(resolved.playerId);
  if (!Number.isSafeInteger(playerId) || playerId <= 0) {
    throw httpError("CHESS_COM_UNAVAILABLE", "Chess.com is temporarily unavailable. Your BoardSignal account is fine — try again shortly.", 503);
  }
  return {
    playerId,
    canonicalUsername: resolved.username,
    avatar: resolved.avatar,
    profileUrl: resolved.profileUrl,
  };
}

function activeAccount(value: unknown, uid: string, playerId: number) {
  const account = value as BoardSignalAccount | undefined;
  if (!account || account.uid !== uid || account.role !== "player" || account.chessCom?.playerId !== playerId) {
    throw httpError("GOOGLE_ACCESS_MAPPING_MISMATCH", "BoardSignal stopped an invalid identity mapping.", 409);
  }
  if (account.accessStatus !== "active" || account.identityStatus === "revoked") {
    throw httpError("GOOGLE_ACCESS_REVOKED", "This BoardSignal access is not active.", 403);
  }
  return account;
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

export async function resolveGoogleOnboardingProfile(googleIdToken: unknown, usernameInput: unknown) {
  await verifyGoogleAccessToken(googleIdToken);
  const identity = resolvedIdentity(await resolveChessComIdentityInput(usernameInput));
  return {
    playerId: identity.playerId,
    canonicalUsername: identity.canonicalUsername,
    avatar: identity.avatar,
    profileUrl: identity.profileUrl,
    safeConfirmation: "BoardSignal found this public Chess.com profile. Confirm it before any new private BoardSignal is created.",
  };
}

export async function claimGoogleOnboardingProfile(googleIdToken: unknown, usernameInput: unknown) {
  const google = await verifyGoogleAccessToken(googleIdToken);
  const identity = resolvedIdentity(await resolveChessComIdentityInput(usernameInput));
  const uid = firebaseUidForChessPlayer(identity.playerId);
  const db = getAdminDb();
  const subjectRef = db.collection("playerIdentityAliases").doc(googleSubjectAliasId(google.providerUidHash));
  const playerRef = db.collection("playerIdentityAliases").doc(googlePlayerAliasId(identity.playerId));
  const mappingRef = db.collection("chessPlayerAccounts").doc(String(identity.playerId));
  const userRef = db.collection("users").doc(uid);
  const usernameAliasRef = db.collection("playerIdentityAliases").doc(identity.canonicalUsername.toLowerCase());
  const now = new Date().toISOString();

  const result = await db.runTransaction(async (transaction) => {
    const [subjectSnapshot, playerSnapshot, mappingSnapshot, userSnapshot] = await Promise.all([
      transaction.get(subjectRef),
      transaction.get(playerRef),
      transaction.get(mappingRef),
      transaction.get(userRef),
    ]);

    const subject = subjectSnapshot.exists ? subjectSnapshot.data() as GoogleSubjectAlias : undefined;
    const reverse = playerSnapshot.exists ? playerSnapshot.data() as GooglePlayerAlias : undefined;
    const mappedUid = mappingSnapshot.exists && typeof mappingSnapshot.data()?.uid === "string"
      ? String(mappingSnapshot.data()!.uid)
      : undefined;

    if (subject) {
      if (subject.provider !== "google_access" || subject.providerUidHash !== google.providerUidHash || !subject.uid || Number(subject.playerId) <= 0) {
        throw httpError("GOOGLE_ACCESS_MAPPING_MISMATCH", "BoardSignal stopped an invalid Google access mapping.", 409);
      }
      if (subject.uid !== uid || Number(subject.playerId) !== identity.playerId) {
        throw httpError("GOOGLE_ACCESS_IN_USE", "This Google account is already connected to a different BoardSignal. Accounts are never merged automatically.", 409);
      }
      if (!userSnapshot.exists || mappedUid !== uid || !reverse || reverse.provider !== "google_access_player" || reverse.uid !== uid || reverse.providerUidHash !== google.providerUidHash) {
        throw httpError("GOOGLE_ACCESS_MAPPING_MISMATCH", "BoardSignal stopped an incomplete Google access mapping.", 409);
      }
      return { account: activeAccount(userSnapshot.data(), uid, identity.playerId), created: false };
    }

    if (userSnapshot.exists || mappingSnapshot.exists || playerSnapshot.exists) {
      throw httpError(
        "CHESS_PROFILE_ALREADY_HAS_BOARDSIGNAL",
        "This Chess.com profile already has a BoardSignal. Private data was not opened or changed.",
        409,
      );
    }

    const base = createFoundingBetaAccount(identity, new Date(now));
    const account: BoardSignalAccount = {
      ...base,
      uid,
      chessCom: identity,
      googleAccessConnectedAt: now,
      identityStatus: "provisional",
      identityReviewStatus: "pending",
      // Google proves the BoardSignal requester, not Chess.com ownership.
      privacy: {
        ...base.privacy,
        publicPlayerPage: false,
        universeCoverage: false,
      },
      // New K onboarding has no mandatory contact gate. No contact, marketing,
      // Trustpilot or notification consent is inferred from Google authentication.
      preferencesConfirmedAt: now,
      contactConfirmedAt: now,
      notificationPreferences: {
        ...base.notificationPreferences,
        email: false,
      },
      lastSeenAt: now,
    };

    transaction.set(mappingRef, clean({ uid, playerId: identity.playerId, canonicalUsername: identity.canonicalUsername }), { merge: false });
    transaction.set(userRef, clean(account), { merge: false });
    transaction.set(usernameAliasRef, clean({ uid, playerId: identity.playerId }), { merge: true });
    transaction.set(subjectRef, clean({
      provider: "google_access",
      providerUidHash: google.providerUidHash,
      uid,
      playerId: identity.playerId,
      canonicalUsername: identity.canonicalUsername,
      linkedAt: now,
    }), { merge: false });
    transaction.set(playerRef, clean({
      provider: "google_access_player",
      providerUidHash: google.providerUidHash,
      uid,
      playerId: identity.playerId,
      canonicalUsername: identity.canonicalUsername,
      linkedAt: now,
    }), { merge: false });
    return { account, created: true };
  });

  const customToken = await getAdminAuth().createCustomToken(result.account.uid, customTokenClaims(result.account, result.created ? "google_onboarding" : "google_return"));
  return {
    customToken,
    uid: result.account.uid,
    playerId: result.account.chessCom.playerId,
    canonicalUsername: result.account.chessCom.canonicalUsername,
    created: result.created,
    googleIdentityVerified: true,
    chessComOwnership: result.account.identityStatus === "oauth_verified" ? "verified" : "provisional",
  };
}
