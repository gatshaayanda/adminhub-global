import "server-only";

import { createHash } from "node:crypto";
import type { BoardSignalAccount, StableChessComIdentity } from "../account";
import { createFoundingBetaAccount, firebaseUidForChessPlayer } from "../account";
import { resolveChessComPlayer } from "../processor";
import { getAdminAuth, getAdminDb, getAdminMessaging } from "../../../utils/firebaseAdmin";
import { refreshFounderPlayerSummaryByUid } from "./founderOperations";
import { verifyGoogleAccessToken } from "./googleAccess";

export const GOOGLE_ONBOARDING_BUDGET = Object.freeze({
  resolveProfile: { firestoreReads: 0, firestoreWrites: 0, chessComProfileResolutions: 1 },
  claimProfile: { transactionReads: 4, writesWhenNew: 5, privateReviewGeneration: 0 },
  identityConflict: { directReads: 3, boundedTransactionReads: 2, writes: 3 },
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

type IdentityConflictContact = {
  method: "email" | "discord";
  value: string;
};

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

function identityConflictId(playerId: number, providerUidHash: string) {
  return `google_identity_${playerId}_${providerUidHash.slice(0, 32)}`;
}

function validateUsername(value: unknown) {
  const username = String(value ?? "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_-]{2,50}$/.test(username)) {
    throw httpError("GOOGLE_ONBOARDING_USERNAME_INVALID", "Enter a valid Chess.com username.", 400);
  }
  return username;
}

function validateCaseContact(methodInput: unknown, valueInput: unknown): IdentityConflictContact {
  const method = String(methodInput ?? "").trim().toLowerCase();
  const value = String(valueInput ?? "").trim();
  if (method !== "email" && method !== "discord") {
    throw httpError("IDENTITY_CONFLICT_CONTACT_REQUIRED", "Choose Email or Discord for this ownership-review case.", 400);
  }
  if (value.length < 2 || value.length > 160) {
    throw httpError("IDENTITY_CONFLICT_CONTACT_REQUIRED", "Enter one contact value for this ownership-review case.", 400);
  }
  if (method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw httpError("IDENTITY_CONFLICT_EMAIL_INVALID", "Enter a valid email address for this ownership-review case.", 400);
  }
  return { method, value } as IdentityConflictContact;
}

function resolvedIdentity(resolved: Awaited<ReturnType<typeof resolveChessComPlayer>>): StableChessComIdentity {
  const playerId = Number(resolved.playerId);
  if (!Number.isSafeInteger(playerId) || playerId <= 0) {
    throw httpError("GOOGLE_ONBOARDING_PLAYER_ID_REQUIRED", "Chess.com did not return the stable player ID BoardSignal requires.", 422);
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
  const username = validateUsername(usernameInput);
  const identity = resolvedIdentity(await resolveChessComPlayer(username));
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
  const username = validateUsername(usernameInput);
  const identity = resolvedIdentity(await resolveChessComPlayer(username));
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
      // New K onboarding has no mandatory marketing/contact gate. No contact or
      // notification consent is inferred from the Google identity.
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

async function notifyFounderOfIdentityConflict(input: { caseId: string; targetUid: string; canonicalUsername: string }) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim()) return { eligible: false, delivered: 0, failed: 0 };
  const devices = await getAdminDb().collection("founderNotificationDevices").get();
  if (devices.empty) return { eligible: false, delivered: 0, failed: 0 };
  const link = `/admin/players?uid=${encodeURIComponent(input.targetUid)}`;
  let delivered = 0;
  let failed = 0;
  for (const device of devices.docs) {
    const token = String(device.data().token ?? "");
    if (!token) continue;
    try {
      await getAdminMessaging().send({
        token,
        notification: { title: "BoardSignal", body: `Identity conflict — ${input.canonicalUsername}` },
        webpush: { fcmOptions: { link } },
        data: { type: "boardsignal_identity_conflict", link, caseId: input.caseId },
      });
      delivered += 1;
    } catch (error) {
      failed += 1;
      const code = String((error as { code?: string }).code ?? "");
      if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
        await device.ref.delete().catch(() => undefined);
      }
    }
  }
  return { eligible: true, delivered, failed };
}

export async function requestGoogleIdentityHelp(
  googleIdToken: unknown,
  usernameInput: unknown,
  contactMethodInput: unknown,
  contactValueInput: unknown,
) {
  const google = await verifyGoogleAccessToken(googleIdToken);
  const contact = validateCaseContact(contactMethodInput, contactValueInput);
  const username = validateUsername(usernameInput);
  const resolved = resolvedIdentity(await resolveChessComPlayer(username));
  const db = getAdminDb();
  const mappingRef = db.collection("chessPlayerAccounts").doc(String(resolved.playerId));
  const mapping = await mappingRef.get();
  const targetUid = mapping.exists && typeof mapping.data()?.uid === "string"
    ? String(mapping.data()!.uid)
    : firebaseUidForChessPlayer(resolved.playerId);
  const targetRef = db.collection("users").doc(targetUid);
  const subjectRef = db.collection("playerIdentityAliases").doc(googleSubjectAliasId(google.providerUidHash));
  const [targetSnapshot, subjectSnapshot] = await Promise.all([targetRef.get(), subjectRef.get()]);
  const target = targetSnapshot.exists ? targetSnapshot.data() as BoardSignalAccount : undefined;
  const subject = subjectSnapshot.exists ? subjectSnapshot.data() as GoogleSubjectAlias : undefined;

  if (!target || target.role !== "player" || target.chessCom?.playerId !== resolved.playerId || target.accessStatus === "deleted") {
    return { recorded: false };
  }
  if (subject?.provider === "google_access" && subject.uid === targetUid && Number(subject.playerId) === resolved.playerId) {
    return { recorded: false };
  }

  const caseId = identityConflictId(resolved.playerId, google.providerUidHash);
  const conflictRef = db.collection("identityConflicts").doc(caseId);
  const exceptionRef = db.collection("exceptions").doc(caseId);
  const openedAt = new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    const [freshTarget, existingCase] = await Promise.all([
      transaction.get(targetRef),
      transaction.get(conflictRef),
    ]);
    if (!freshTarget.exists) return;
    const account = freshTarget.data() as BoardSignalAccount;
    if (account.role !== "player" || account.chessCom?.playerId !== resolved.playerId || account.accessStatus === "deleted") return;
    const prior = existingCase.exists ? existingCase.data() as Record<string, unknown> : undefined;
    const createdAt = typeof prior?.createdAt === "string" ? String(prior.createdAt) : openedAt;

    transaction.set(conflictRef, clean({
      caseId,
      type: "identity_conflict",
      status: "open",
      targetUid,
      playerId: resolved.playerId,
      canonicalUsername: resolved.canonicalUsername,
      requester: {
        provider: "google",
        providerUidHash: google.providerUidHash,
      },
      caseContact: contact,
      // Case contact is not product/marketing consent and is never copied into
      // account notification preferences.
      contactPurpose: "identity_conflict_only",
      ownershipProof: {
        status: "not_requested",
        allowedMethods: ["chesscom_message_challenge", "public_profile_challenge"],
      },
      createdAt,
      updatedAt: openedAt,
    }), { merge: true });
    transaction.set(exceptionRef, clean({
      type: "identity_conflict",
      uid: targetUid,
      username: resolved.canonicalUsername,
      title: "IDENTITY CONFLICT",
      message: "A Google-authenticated requester asked for ownership review of an established Chess.com profile. No private data or mapping was transferred.",
      caseId,
      createdAt,
      updatedAt: openedAt,
    }), { merge: true });
    transaction.set(targetRef, { identityConflictOpen: true, identityConflictOpenedAt: account.identityConflictOpenedAt ?? openedAt }, { merge: true });
  });

  await refreshFounderPlayerSummaryByUid(targetUid).catch(() => undefined);
  const founderAlert = await notifyFounderOfIdentityConflict({ caseId, targetUid, canonicalUsername: resolved.canonicalUsername })
    .catch(() => ({ eligible: true, delivered: 0, failed: 1 }));
  await conflictRef.set({ founderAlert, founderAlertAttemptedAt: new Date().toISOString() }, { merge: true }).catch(() => undefined);
  return { recorded: true, caseId };
}
