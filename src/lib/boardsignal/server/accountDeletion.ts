import "server-only";

import type { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { firebaseUidForChessPlayer, type BoardSignalAccount } from "../account";
import { getAdminAuth, getAdminDb } from "../../../utils/firebaseAdmin";

const DELETE_CHUNK_SIZE = 200;

const PRIVATE_PLAYER_SUBCOLLECTIONS = [
  "desks",
  "factualReviews",
  "social",
  "inbox",
  "conversations",
  "pushTokens",
  "pulse",
  "automationEvents",
  "guide",
  "guideFeedback",
] as const;

type DeletionStage =
  | "resolve_target"
  | "fail_closed"
  | "revoke_sessions"
  | "private_player_tree"
  | "social_references"
  | "public_references"
  | "temporary_credentials"
  | "firebase_auth"
  | "identity_mappings"
  | "account_document"
  | "verify_reset";

export type BoardSignalAccountDeletionSummary = {
  playerId: number;
  canonicalUsername: string;
  alreadyDeleted: boolean;
  firebaseSessionsRevoked: boolean;
  firebaseAuthDeleted: boolean;
  accountDeleted: boolean;
  identityMappingsDeleted: number;
  betaAccessDeleted: boolean;
  betaRequestDeleted: boolean;
  desksDeleted: number;
  deskEvidenceDeleted: number;
  factualReviewsDeleted: number;
  privateSubcollectionsDeleted: string[];
  socialReferencesDeleted: number;
  publicReferencesDeleted: number;
  temporaryCredentialsDeleted: number;
};

export class BoardSignalAccountDeletionError extends Error {
  status: number;
  code: string;
  stage: DeletionStage;

  constructor(code: string, stage: DeletionStage, message: string, status = 409) {
    super(message);
    this.name = "BoardSignalAccountDeletionError";
    this.status = status;
    this.code = code;
    this.stage = stage;
  }
}

function stablePlayerId(value: unknown) {
  const playerId = Number(value);
  if (!Number.isSafeInteger(playerId) || playerId <= 0) {
    throw new BoardSignalAccountDeletionError("ACCOUNT_DELETION_PLAYER_ID_REQUIRED", "resolve_target", "A stable Chess.com player ID is required.", 400);
  }
  return playerId;
}

function normalizedConfirmation(value: unknown) {
  const username = String(value ?? "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_-]{2,50}$/.test(username)) {
    throw new BoardSignalAccountDeletionError("ACCOUNT_DELETION_CONFIRMATION_REQUIRED", "resolve_target", "Type the player's canonical Chess.com username to confirm deletion.", 400);
  }
  return username;
}

function sameUsername(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function identityConflict(detail: string): never {
  throw new BoardSignalAccountDeletionError(
    "ACCOUNT_DELETION_IDENTITY_CONFLICT",
    "resolve_target",
    `BoardSignal stopped account deletion because the stable identity records conflict: ${detail}`,
    409,
  );
}

async function existingAuthUser(uid: string) {
  try {
    return await getAdminAuth().getUser(uid);
  } catch (error) {
    if ((error as { code?: string }).code === "auth/user-not-found") return undefined;
    throw error;
  }
}

async function deleteDocumentsInChunks(documents: QueryDocumentSnapshot[]) {
  const db = getAdminDb();
  let deleted = 0;
  for (let offset = 0; offset < documents.length; offset += DELETE_CHUNK_SIZE) {
    const chunk = documents.slice(offset, offset + DELETE_CHUNK_SIZE);
    const batch = db.batch();
    chunk.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

async function queryDocuments(query: Query) {
  const snapshot = await query.get();
  return snapshot.docs;
}

async function deleteQueryInChunks(query: Query, validate?: (document: QueryDocumentSnapshot) => void) {
  let deleted = 0;
  while (true) {
    const snapshot = await query.limit(DELETE_CHUNK_SIZE).get();
    if (snapshot.empty) break;
    snapshot.docs.forEach((document) => validate?.(document));
    deleted += await deleteDocumentsInChunks(snapshot.docs);
  }
  return deleted;
}

function validateStableField(document: QueryDocumentSnapshot, field: string, expected: string | number) {
  const actual = document.data()?.[field];
  if (String(actual) !== String(expected)) identityConflict(`${document.ref.path} did not match ${field}=${expected}.`);
}

async function countDeskEvidence(uid: string) {
  const db = getAdminDb();
  const desks = await db.collection("users").doc(uid).collection("desks").get();
  let evidence = 0;
  for (const desk of desks.docs) {
    evidence += (await desk.ref.collection("evidence").get()).size;
  }
  return { desks: desks.size, evidence };
}

async function deletePrivatePlayerTree(uid: string) {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const factualReviews = await userRef.collection("factualReviews").get();
  const deskCounts = await countDeskEvidence(uid);

  // Firestore does not cascade subcollections. recursiveDelete is applied to the
  // explicit audited BoardSignal user collections so nested Desk evidence and
  // conversation messages are removed without assuming a 500-write ceiling.
  for (const collectionName of PRIVATE_PLAYER_SUBCOLLECTIONS) {
    await db.recursiveDelete(userRef.collection(collectionName));
  }

  return {
    desksDeleted: deskCounts.desks,
    deskEvidenceDeleted: deskCounts.evidence,
    factualReviewsDeleted: factualReviews.size,
    privateSubcollectionsDeleted: [...PRIVATE_PLAYER_SUBCOLLECTIONS],
  };
}

type SocialRelationshipData = {
  playerAId?: number;
  playerAUid?: string;
  playerBId?: number;
  playerBUid?: string;
};

async function deleteRelationshipInboxArtifacts(relationship: QueryDocumentSnapshot, playerId: number, uid: string) {
  const db = getAdminDb();
  const data = relationship.data() as SocialRelationshipData;
  const isA = Number(data.playerAId) === playerId;
  const isB = Number(data.playerBId) === playerId;
  if (isA === isB) identityConflict(`${relationship.ref.path} did not identify exactly one deleted-player endpoint.`);
  const targetUid = isA ? data.playerAUid : data.playerBUid;
  if (targetUid && targetUid !== uid) identityConflict(`${relationship.ref.path} pointed the deleted player at another uid.`);
  const otherUid = isA ? data.playerBUid : data.playerAUid;
  if (!otherUid || otherUid === uid) return 0;

  const relationshipId = relationship.id;
  const otherInbox = db.collection("users").doc(otherUid).collection("inbox");
  const refs = [
    otherInbox.doc(`friend_request_${relationshipId}`),
    otherInbox.doc(`friend_accepted_${relationshipId}`),
  ];
  const snapshots = await Promise.all(refs.map((ref) => ref.get()));
  const existing = snapshots.filter((snapshot) => snapshot.exists);
  await Promise.all(existing.map((snapshot) => snapshot.ref.delete()));
  return existing.length;
}

async function deleteSocialReferences(playerId: number, uid: string) {
  const db = getAdminDb();
  const relationships = new Map<string, QueryDocumentSnapshot>();
  for (const query of [
    db.collection("socialRelationships").where("playerAId", "==", playerId),
    db.collection("socialRelationships").where("playerBId", "==", playerId),
  ]) {
    for (const document of await queryDocuments(query)) relationships.set(document.ref.path, document);
  }

  let deleted = 0;
  for (const relationship of relationships.values()) {
    deleted += await deleteRelationshipInboxArtifacts(relationship, playerId, uid);
  }
  deleted += await deleteDocumentsInChunks([...relationships.values()]);

  // Remove every other user's projection of this stable player ID, including
  // orphan friend/rival cards whose global relationship record is already gone.
  deleted += await deleteQueryInChunks(
    db.collectionGroup("social").where("otherPlayerId", "==", playerId),
    (document) => validateStableField(document, "otherPlayerId", playerId),
  );
  deleted += await deleteQueryInChunks(
    db.collection("socialBlocks").where("blockerPlayerId", "==", playerId),
    (document) => validateStableField(document, "blockerPlayerId", playerId),
  );
  deleted += await deleteQueryInChunks(
    db.collection("socialBlocks").where("blockedPlayerId", "==", playerId),
    (document) => validateStableField(document, "blockedPlayerId", playerId),
  );
  deleted += await deleteQueryInChunks(
    db.collection("socialRequestRateLimits").where("actorPlayerId", "==", playerId),
    (document) => validateStableField(document, "actorPlayerId", playerId),
  );
  deleted += await deleteQueryInChunks(
    db.collection("socialRequestRateLimits").where("targetPlayerId", "==", playerId),
    (document) => validateStableField(document, "targetPlayerId", playerId),
  );
  return deleted;
}

async function deletePublicReferences(playerId: number) {
  const db = getAdminDb();
  const stablePlayerKey = String(playerId);
  let deleted = 0;

  const shareMoments = await queryDocuments(db.collection("publicShareMoments").where("playerId", "==", stablePlayerKey));
  for (const moment of shareMoments) {
    deleted += await deleteQueryInChunks(
      db.collection("shareAttribution").where("shareMomentId", "==", moment.id),
      (document) => validateStableField(document, "shareMomentId", moment.id),
    );
  }
  deleted += await deleteDocumentsInChunks(shareMoments);

  deleted += await deleteQueryInChunks(
    db.collection("publicUniverseEvents").where("playerId", "==", stablePlayerKey),
    (document) => validateStableField(document, "playerId", stablePlayerKey),
  );
  deleted += await deleteQueryInChunks(
    db.collection("publicCoverage").where("chessPlayerId", "==", stablePlayerKey),
    (document) => validateStableField(document, "chessPlayerId", stablePlayerKey),
  );

  const publicPlayerRef = db.collection("publicPlayers").doc(stablePlayerKey);
  const directPublicPlayer = await publicPlayerRef.get();
  if (directPublicPlayer.exists) {
    const storedId = directPublicPlayer.data()?.chessPlayerId;
    if (storedId !== undefined && String(storedId) !== stablePlayerKey) identityConflict(`${publicPlayerRef.path} belonged to another stable player.`);
    await publicPlayerRef.delete();
    deleted += 1;
  }
  deleted += await deleteQueryInChunks(
    db.collection("publicPlayers").where("chessPlayerId", "==", stablePlayerKey),
    (document) => validateStableField(document, "chessPlayerId", stablePlayerKey),
  );
  return deleted;
}

async function deleteTemporaryCredentials(uid: string, playerId: number) {
  const db = getAdminDb();
  let deleted = 0;
  deleted += await deleteQueryInChunks(
    db.collection("authCompletionTickets").where("uid", "==", uid),
    (document) => {
      validateStableField(document, "uid", uid);
      const ticketPlayerId = Number(document.data()?.identity?.playerId);
      if (Number.isSafeInteger(ticketPlayerId) && ticketPlayerId !== playerId) identityConflict(`${document.ref.path} carried a different Chess.com player ID.`);
    },
  );
  deleted += await deleteQueryInChunks(
    db.collection("exceptions").where("uid", "==", uid),
    (document) => validateStableField(document, "uid", uid),
  );
  return deleted;
}

async function deleteIdentityAliases(uid: string, playerId: number) {
  const db = getAdminDb();
  let deleted = 0;
  deleted += await deleteQueryInChunks(
    db.collection("playerIdentityAliases").where("uid", "==", uid),
    (document) => {
      validateStableField(document, "uid", uid);
      const aliasPlayerId = Number(document.data()?.playerId);
      if (Number.isSafeInteger(aliasPlayerId) && aliasPlayerId !== playerId) identityConflict(`${document.ref.path} carried a different Chess.com player ID.`);
    },
  );
  deleted += await deleteQueryInChunks(
    db.collection("playerIdentityAliases").where("playerId", "==", playerId),
    (document) => {
      validateStableField(document, "playerId", playerId);
      const aliasUid = document.data()?.uid;
      if (aliasUid !== undefined && String(aliasUid) !== uid) identityConflict(`${document.ref.path} pointed to another BoardSignal uid.`);
    },
  );
  return deleted;
}

async function assertResetComplete(input: { uid: string; playerId: number }) {
  const db = getAdminDb();
  const stablePlayerKey = String(input.playerId);
  const [
    user,
    mapping,
    betaAccess,
    betaRequest,
    aliasesByUid,
    aliasesByPlayer,
    tickets,
    publicPlayer,
    publicCoverage,
    publicEvents,
    publicMoments,
    relationshipsA,
    relationshipsB,
    socialProjections,
    authUser,
  ] = await Promise.all([
    db.collection("users").doc(input.uid).get(),
    db.collection("chessPlayerAccounts").doc(stablePlayerKey).get(),
    db.collection("betaAccess").doc(stablePlayerKey).get(),
    db.collection("betaRequests").doc(stablePlayerKey).get(),
    db.collection("playerIdentityAliases").where("uid", "==", input.uid).limit(1).get(),
    db.collection("playerIdentityAliases").where("playerId", "==", input.playerId).limit(1).get(),
    db.collection("authCompletionTickets").where("uid", "==", input.uid).limit(1).get(),
    db.collection("publicPlayers").doc(stablePlayerKey).get(),
    db.collection("publicCoverage").where("chessPlayerId", "==", stablePlayerKey).limit(1).get(),
    db.collection("publicUniverseEvents").where("playerId", "==", stablePlayerKey).limit(1).get(),
    db.collection("publicShareMoments").where("playerId", "==", stablePlayerKey).limit(1).get(),
    db.collection("socialRelationships").where("playerAId", "==", input.playerId).limit(1).get(),
    db.collection("socialRelationships").where("playerBId", "==", input.playerId).limit(1).get(),
    db.collectionGroup("social").where("otherPlayerId", "==", input.playerId).limit(1).get(),
    existingAuthUser(input.uid),
  ]);
  const resetIncomplete = user.exists
    || mapping.exists
    || betaAccess.exists
    || betaRequest.exists
    || !aliasesByUid.empty
    || !aliasesByPlayer.empty
    || !tickets.empty
    || publicPlayer.exists
    || !publicCoverage.empty
    || !publicEvents.empty
    || !publicMoments.empty
    || !relationshipsA.empty
    || !relationshipsB.empty
    || !socialProjections.empty
    || Boolean(authUser);
  if (resetIncomplete) {
    throw new BoardSignalAccountDeletionError(
      "ACCOUNT_DELETION_VERIFICATION_FAILED",
      "verify_reset",
      "BoardSignal could not verify a complete identity reset. The destructive operation can be retried safely.",
      500,
    );
  }
}

export async function deleteBoardSignalAccount(input: { playerId: unknown; confirmationUsername: unknown }): Promise<BoardSignalAccountDeletionSummary> {
  const playerId = stablePlayerId(input.playerId);
  const confirmationUsername = normalizedConfirmation(input.confirmationUsername);
  const stablePlayerKey = String(playerId);
  const uid = firebaseUidForChessPlayer(playerId);
  const db = getAdminDb();
  const auth = getAdminAuth();
  let stage: DeletionStage = "resolve_target";

  try {
    const mappingRef = db.collection("chessPlayerAccounts").doc(stablePlayerKey);
    const userRef = db.collection("users").doc(uid);
    const betaAccessRef = db.collection("betaAccess").doc(stablePlayerKey);
    const betaRequestRef = db.collection("betaRequests").doc(stablePlayerKey);
    const publicPlayerRef = db.collection("publicPlayers").doc(stablePlayerKey);
    const [mapping, userSnapshot, betaAccess, betaRequest, publicPlayer, aliasesByUid, aliasesByPlayer, authUser] = await Promise.all([
      mappingRef.get(),
      userRef.get(),
      betaAccessRef.get(),
      betaRequestRef.get(),
      publicPlayerRef.get(),
      db.collection("playerIdentityAliases").where("uid", "==", uid).get(),
      db.collection("playerIdentityAliases").where("playerId", "==", playerId).get(),
      existingAuthUser(uid),
    ]);

    if (mapping.exists) {
      const mappedUid = String(mapping.data()?.uid ?? "");
      const mappedPlayerId = Number(mapping.data()?.playerId ?? playerId);
      if (mappedUid !== uid || mappedPlayerId !== playerId) identityConflict(`${mappingRef.path} did not match ${uid}.`);
    }
    if (betaAccess.exists && Number(betaAccess.data()?.playerId) !== playerId) identityConflict(`${betaAccessRef.path} belonged to another player.`);
    if (betaRequest.exists && Number(betaRequest.data()?.chessPlayerId) !== playerId) identityConflict(`${betaRequestRef.path} belonged to another player.`);
    if (betaRequest.exists) {
      const request = betaRequest.data() as Record<string, unknown>;
      const magic = request.magicAccess as Record<string, unknown> | undefined;
      for (const candidateUid of [request.firebaseUid, magic?.uid]) {
        if (candidateUid !== undefined && String(candidateUid) !== uid) identityConflict(`${betaRequestRef.path} pointed to another BoardSignal uid.`);
      }
    }
    for (const alias of [...aliasesByUid.docs, ...aliasesByPlayer.docs]) {
      const aliasUid = alias.data()?.uid;
      const aliasPlayerId = Number(alias.data()?.playerId);
      if (aliasUid !== undefined && String(aliasUid) !== uid) identityConflict(`${alias.ref.path} pointed to another BoardSignal uid.`);
      if (Number.isSafeInteger(aliasPlayerId) && aliasPlayerId !== playerId) identityConflict(`${alias.ref.path} carried another Chess.com player ID.`);
    }
    if (publicPlayer.exists) {
      const publicPlayerId = publicPlayer.data()?.chessPlayerId;
      if (publicPlayerId !== undefined && String(publicPlayerId) !== stablePlayerKey) identityConflict(`${publicPlayerRef.path} belonged to another stable player.`);
    }
    if (authUser) {
      if (authUser.uid !== uid) identityConflict("Firebase Auth uid did not match the deterministic Chess.com identity.");
      const claimedPlayerId = Number(authUser.customClaims?.chessPlayerId);
      if (Number.isSafeInteger(claimedPlayerId) && claimedPlayerId !== playerId) identityConflict("Firebase Auth custom claims carried a different Chess.com player ID.");
      const claimedRole = authUser.customClaims?.role;
      if (claimedRole !== undefined && claimedRole !== "player") identityConflict("Firebase Auth custom claims did not identify a player account.");
    }

    const account = userSnapshot.exists ? userSnapshot.data() as BoardSignalAccount : undefined;
    if (account) {
      if (account.role !== "player") {
        throw new BoardSignalAccountDeletionError("ACCOUNT_DELETION_PLAYER_ONLY", "resolve_target", "Only BoardSignal player accounts can be deleted from this Founder action.", 403);
      }
      if (account.uid !== uid || account.chessCom?.playerId !== playerId) identityConflict(`${userRef.path} did not match the requested stable Chess.com identity.`);
    }

    // Historical alias document IDs are intentionally NOT canonical authority.
    // A stable Chess.com player can legitimately accumulate old username aliases
    // that all point to this same uid/playerId. Those aliases were validated above
    // only as identity bindings and are deleted later as historical lifecycle data.
    const authoritativeCanonicalCandidates = [
      account?.chessCom?.canonicalUsername,
      mapping.data()?.canonicalUsername,
      betaAccess.data()?.canonicalUsername,
      betaRequest.data()?.canonicalUsername,
      publicPlayer.data()?.username,
      authUser?.customClaims?.chessUsername,
    ].map((value) => typeof value === "string" ? value.trim() : "").filter(Boolean);
    const distinctCanonical = new Map(authoritativeCanonicalCandidates.map((value) => [value.toLowerCase(), value]));
    if (distinctCanonical.size > 1) identityConflict("authoritative canonical username records disagree for this stable Chess.com player ID.");
    const canonicalUsername = [...distinctCanonical.values()][0];

    const hasKnownLifecycle = Boolean(account || mapping.exists || betaAccess.exists || betaRequest.exists || publicPlayer.exists || !aliasesByUid.empty || !aliasesByPlayer.empty || authUser);
    if (!hasKnownLifecycle) {
      return {
        playerId,
        canonicalUsername: confirmationUsername,
        alreadyDeleted: true,
        firebaseSessionsRevoked: false,
        firebaseAuthDeleted: false,
        accountDeleted: false,
        identityMappingsDeleted: 0,
        betaAccessDeleted: false,
        betaRequestDeleted: false,
        desksDeleted: 0,
        deskEvidenceDeleted: 0,
        factualReviewsDeleted: 0,
        privateSubcollectionsDeleted: [...PRIVATE_PLAYER_SUBCOLLECTIONS],
        socialReferencesDeleted: 0,
        publicReferencesDeleted: 0,
        temporaryCredentialsDeleted: 0,
      };
    }
    if (!canonicalUsername || !sameUsername(confirmationUsername, canonicalUsername)) {
      throw new BoardSignalAccountDeletionError("ACCOUNT_DELETION_CONFIRMATION_MISMATCH", "resolve_target", "The typed Chess.com username did not match this BoardSignal player.", 400);
    }

    stage = "fail_closed";
    const deletionStartedAt = new Date().toISOString();
    if (account) await userRef.set({ accessStatus: "deleted", identityStatus: "revoked", identityReviewStatus: "rejected", deletionStartedAt }, { merge: true });
    if (betaAccess.exists) await betaAccessRef.set({ status: "revoked", failedAttempts: 0, lockedUntil: null }, { merge: true });
    if (betaRequest.exists) await betaRequestRef.set({ identityReviewStatus: "rejected", revokedAt: deletionStartedAt, deletionStartedAt }, { merge: true });
    if (publicPlayer.exists) await publicPlayerRef.set({ pageEnabled: false }, { merge: true });

    stage = "revoke_sessions";
    let firebaseSessionsRevoked = false;
    if (authUser) {
      await auth.updateUser(uid, { disabled: true });
      await auth.revokeRefreshTokens(uid);
      firebaseSessionsRevoked = true;
    }

    stage = "private_player_tree";
    const privateResult = await deletePrivatePlayerTree(uid);

    stage = "social_references";
    const socialReferencesDeleted = await deleteSocialReferences(playerId, uid);

    stage = "public_references";
    const publicReferencesDeleted = await deletePublicReferences(playerId);

    stage = "temporary_credentials";
    const temporaryCredentialsDeleted = await deleteTemporaryCredentials(uid, playerId);
    const betaAccessDeleted = (await betaAccessRef.get()).exists;
    if (betaAccessDeleted) await betaAccessRef.delete();
    const betaRequestDeleted = (await betaRequestRef.get()).exists;
    if (betaRequestDeleted) await betaRequestRef.delete();

    stage = "firebase_auth";
    let firebaseAuthDeleted = false;
    try {
      await auth.deleteUser(uid);
      firebaseAuthDeleted = true;
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    }

    stage = "identity_mappings";
    let identityMappingsDeleted = await deleteIdentityAliases(uid, playerId);
    const mappingNow = await mappingRef.get();
    if (mappingNow.exists) {
      const mappedUid = String(mappingNow.data()?.uid ?? "");
      if (mappedUid !== uid) identityConflict(`${mappingRef.path} changed to another uid during deletion.`);
      await mappingRef.delete();
      identityMappingsDeleted += 1;
    }

    stage = "account_document";
    const accountNow = await userRef.get();
    if (accountNow.exists) {
      const latestAccount = accountNow.data() as BoardSignalAccount;
      if (latestAccount.role !== "player" || latestAccount.uid !== uid || latestAccount.chessCom?.playerId !== playerId) {
        identityConflict(`${userRef.path} changed identity during deletion.`);
      }
      await userRef.delete();
    }

    stage = "verify_reset";
    await assertResetComplete({ uid, playerId });

    return {
      playerId,
      canonicalUsername,
      alreadyDeleted: false,
      firebaseSessionsRevoked,
      firebaseAuthDeleted,
      accountDeleted: true,
      identityMappingsDeleted,
      betaAccessDeleted,
      betaRequestDeleted,
      ...privateResult,
      socialReferencesDeleted,
      publicReferencesDeleted,
      temporaryCredentialsDeleted,
    };
  } catch (error) {
    if (error instanceof BoardSignalAccountDeletionError) throw error;
    throw new BoardSignalAccountDeletionError(
      "ACCOUNT_DELETION_FAILED",
      stage,
      "BoardSignal account deletion did not complete. Access remains fail-closed and the Founder can retry the operation.",
      500,
    );
  }
}
