import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth, getAdminDb } from "../../../utils/firebaseAdmin";
import {
  FOUNDING_BETA_AGREEMENT_VERSION,
  canonicalPlayerKey,
  createFoundingBetaAccount,
  type BoardSignalAccount,
  type BoardSignalNotificationPreferences,
  type BoardSignalPrivacySettings,
  type StableChessComIdentity,
} from "../account";
import {
  buildPoolProgress,
  buildSafePublicCoverage,
  deriveRecurringPatterns,
  retainLatestFour,
  toDeskSummary,
  updatePersonalRecords,
  type CurrentEpisodeSummary,
  type DeskSummary,
  type PersonalRecords,
  type ProgressSeries,
  type RecurringPattern,
} from "../memory";
import { validateDeskForPublication } from "../quality";
import type { BoardSignalDesk, DeskEngineResult } from "../types";

export type PublishedDeskBundle = {
  desk: BoardSignalDesk;
  engineResults: Record<string, DeskEngineResult>;
  summary: DeskSummary;
};

export type PlayerRoomSnapshot = {
  account: BoardSignalAccount;
  desks: PublishedDeskBundle[];
  progress: ProgressSeries[];
  recurringPatterns: RecurringPattern[];
  personalRecords: PersonalRecords;
  currentEpisode?: CurrentEpisodeSummary;
  progressUnavailable?: string;
  generationRequired: boolean;
};

type AuthTicket = {
  uid: string;
  identity: StableChessComIdentity;
  expiresAt: number;
  consumedAt?: number;
};

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function safeDocumentId(value: string) {
  return value.replaceAll("/", "_").slice(0, 700);
}

function hashTicket(ticket: string) {
  return createHash("sha256").update(ticket).digest("hex");
}

export async function requirePlayerToken(request: Request): Promise<DecodedIdToken> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) throw Object.assign(new Error("Player authentication is required."), { status: 401 });
  try {
    return await getAdminAuth().verifyIdToken(match[1], true);
  } catch {
    throw Object.assign(new Error("The Player Room session is no longer valid."), { status: 401 });
  }
}

export async function ensureStablePlayerAccount(identity: StableChessComIdentity) {
  const db = getAdminDb();
  const identityKey = canonicalPlayerKey(identity);
  const mappingRef = db.collection("chessPlayerAccounts").doc(identityKey);
  const defaultAccount = createFoundingBetaAccount(identity);
  const account = await db.runTransaction(async (transaction) => {
    const mapping = await transaction.get(mappingRef);
    const uid = mapping.exists && typeof mapping.data()?.uid === "string"
      ? mapping.data()!.uid as string
      : defaultAccount.uid;
    const userRef = db.collection("users").doc(uid);
    const existingUser = await transaction.get(userRef);
    const existing = existingUser.exists ? existingUser.data() as BoardSignalAccount : undefined;
    const next: BoardSignalAccount = {
      ...(existing ?? defaultAccount),
      uid,
      chessCom: identity,
      eligibleCoverageKeys: [...new Set([
        ...(existing?.eligibleCoverageKeys ?? []),
        identityKey,
        identity.canonicalUsername.toLowerCase(),
      ])],
    };
    transaction.set(mappingRef, clean({ uid, playerId: identity.playerId, canonicalUsername: identity.canonicalUsername }), { merge: true });
    transaction.set(userRef, clean(next), { merge: true });
    transaction.set(db.collection("playerIdentityAliases").doc(identity.canonicalUsername.toLowerCase()), clean({ uid, playerId: identity.playerId }), { merge: true });
    transaction.set(db.collection("publicPlayers").doc(identityKey), clean({
      chessPlayerId: identityKey,
      username: identity.canonicalUsername,
      usernameKey: identity.canonicalUsername.toLowerCase(),
      avatar: identity.avatar,
      profileUrl: identity.profileUrl,
      pageEnabled: next.privacy.publicPlayerPage,
    }), { merge: true });
    return next;
  });
  return account;
}

export async function createAuthCompletionTicket(account: BoardSignalAccount) {
  const ticket = randomBytes(32).toString("base64url");
  const data: AuthTicket = {
    uid: account.uid,
    identity: account.chessCom,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  await getAdminDb().collection("authCompletionTickets").doc(hashTicket(ticket)).set(clean(data));
  return ticket;
}

export async function markChessComOAuthLinked(uid: string) {
  const chessComOAuthLinkedAt = new Date().toISOString();
  await getAdminDb().collection("users").doc(uid).set({ chessComOAuthLinkedAt }, { merge: true });
  return chessComOAuthLinkedAt;
}

export async function consumeAuthCompletionTicket(ticket: string) {
  if (!/^[A-Za-z0-9_-]{32,100}$/.test(ticket)) throw Object.assign(new Error("The sign-in completion ticket is invalid."), { status: 400 });
  const db = getAdminDb();
  const ref = db.collection("authCompletionTickets").doc(hashTicket(ticket));
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw Object.assign(new Error("The sign-in completion ticket was not found."), { status: 400 });
    const data = snapshot.data() as AuthTicket;
    if (data.consumedAt || data.expiresAt < Date.now()) {
      throw Object.assign(new Error("The sign-in completion ticket has expired or was already used."), { status: 400 });
    }
    transaction.update(ref, { consumedAt: Date.now() });
    return data;
  });
}

function identityFromToken(token: DecodedIdToken): StableChessComIdentity {
  const playerId = Number(token.chessPlayerId);
  const canonicalUsername = String(token.chessUsername ?? "").trim();
  if (!Number.isSafeInteger(playerId) || playerId <= 0 || !canonicalUsername) {
    throw Object.assign(new Error("This account is not linked to a verified Chess.com identity."), { status: 403 });
  }
  return { playerId, canonicalUsername };
}

export async function accountForToken(token: DecodedIdToken) {
  const db = getAdminDb();
  const snapshot = await db.collection("users").doc(token.uid).get();
  if (snapshot.exists) return snapshot.data() as BoardSignalAccount;
  const account = await ensureStablePlayerAccount(identityFromToken(token));
  if (account.uid !== token.uid) throw Object.assign(new Error("Verified identity mapping did not match this Player Room session."), { status: 403 });
  return account;
}

export async function acceptFoundingBetaAgreement(token: DecodedIdToken) {
  const account = await accountForToken(token);
  const acceptedAt = new Date().toISOString();
  const update = {
    betaAgreementVersion: FOUNDING_BETA_AGREEMENT_VERSION,
    betaAgreementAcceptedAt: acceptedAt,
    lastSeenAt: acceptedAt,
  };
  await getAdminDb().collection("users").doc(account.uid).set(update, { merge: true });
  return { ...account, ...update };
}

export async function updatePlayerPreferences(
  token: DecodedIdToken,
  privacy: BoardSignalPrivacySettings,
  notificationPreferences: BoardSignalNotificationPreferences,
) {
  const account = await accountForToken(token);
  const values = [...Object.values(privacy), ...Object.values(notificationPreferences)];
  if (!values.every((value) => typeof value === "boolean")) {
    throw Object.assign(new Error("Player Room preferences were invalid."), { status: 400 });
  }
  const db = getAdminDb();
  const preferencesConfirmedAt = new Date().toISOString();
  await db.collection("users").doc(account.uid).set(clean({ privacy, notificationPreferences, preferencesConfirmedAt }), { merge: true });
  await db.collection("publicPlayers").doc(canonicalPlayerKey(account.chessCom)).set(clean({
    chessPlayerId: canonicalPlayerKey(account.chessCom),
    username: account.chessCom.canonicalUsername,
    usernameKey: account.chessCom.canonicalUsername.toLowerCase(),
    avatar: account.chessCom.avatar,
    profileUrl: account.chessCom.profileUrl,
    pageEnabled: privacy.publicPlayerPage,
  }), { merge: true });
  const coverage = await db.collection("publicCoverage")
    .where("chessPlayerId", "==", canonicalPlayerKey(account.chessCom))
    .get();
  await Promise.all(coverage.docs.map((document) => (
    privacy.publicPlayerPage || privacy.universeCoverage
      ? document.ref.set(clean({ visibility: { publicPlayerPage: privacy.publicPlayerPage, universeCoverage: privacy.universeCoverage } }), { merge: true })
      : document.ref.delete()
  )));
  return { privacy, notificationPreferences, preferencesConfirmedAt };
}

async function deleteDeskTree(uid: string, deskDocumentId: string) {
  const db = getAdminDb();
  const deskRef = db.collection("users").doc(uid).collection("desks").doc(deskDocumentId);
  const evidence = await deskRef.collection("evidence").get();
  const batch = db.batch();
  evidence.docs.forEach((document) => batch.delete(document.ref));
  batch.delete(deskRef);
  await batch.commit();
}

export async function publishPrivateDesk(
  token: DecodedIdToken,
  desk: BoardSignalDesk,
  engineResults: Record<string, DeskEngineResult>,
) {
  const account = await accountForToken(token);
  if (desk.source !== "live" || !desk.provenance.verified) {
    throw Object.assign(new Error("Only a verified LIVE Desk can enter a Player Room."), { status: 422 });
  }
  if (desk.player.playerId !== account.chessCom.playerId
    || desk.player.username.toLowerCase() !== account.chessCom.canonicalUsername.toLowerCase()) {
    throw Object.assign(new Error("This Desk does not belong to the authenticated Chess.com player."), { status: 403 });
  }
  const quality = validateDeskForPublication(desk, engineResults);
  if (quality.status !== "PASS") {
    throw Object.assign(new Error(`The Desk did not clear publication validation: ${quality.codes.join(" · ")}`), { status: 422 });
  }

  const db = getAdminDb();
  const summary = toDeskSummary(desk);
  const deskDocumentId = safeDocumentId(summary.deskKey);
  const desksRef = db.collection("users").doc(account.uid).collection("desks");
  const deskRef = desksRef.doc(deskDocumentId);
  const previous = await desksRef.get();
  const alreadyPublished = previous.docs.some((document) => document.id === deskDocumentId);

  const oldEvidence = await deskRef.collection("evidence").get();
  const batch = db.batch();
  oldEvidence.docs.forEach((document) => batch.delete(document.ref));
  const deskWithoutEvidence = { ...desk, candidates: [] };
  batch.set(deskRef, clean({
    deskKey: summary.deskKey,
    periodEnd: summary.periodEnd,
    summary,
    desk: deskWithoutEvidence,
    publishedAt: new Date().toISOString(),
  }));
  desk.candidates.forEach((candidate, positionOrder) => {
    batch.set(deskRef.collection("evidence").doc(safeDocumentId(candidate.id)), clean({
      positionOrder,
      candidate,
      engineResult: engineResults[candidate.id],
    }));
  });
  await batch.commit();

  const entries = [
    ...previous.docs.filter((document) => document.id !== deskDocumentId).map((document) => ({
      deskKey: String(document.data().deskKey),
      periodEnd: String(document.data().periodEnd ?? document.data().summary?.periodEnd),
      documentId: document.id,
    })),
    { deskKey: summary.deskKey, periodEnd: summary.periodEnd, documentId: deskDocumentId },
  ];
  const retention = retainLatestFour(entries);
  for (const removed of retention.removed) await deleteDeskTree(account.uid, removed.documentId);

  const currentRecords = (await db.collection("users").doc(account.uid).get()).data()?.personalRecords as PersonalRecords | undefined;
  const personalRecords = alreadyPublished ? currentRecords : updatePersonalRecords(currentRecords, summary);
  await db.collection("users").doc(account.uid).set(clean({
    cadenceAnchor: account.cadenceAnchor ?? desk.cadence?.anchorStart ?? desk.period.start,
    nextDeskDueAt: desk.cadence?.nextAvailableOn,
    previousBlue: summary.previousBlue,
    previousAmber: summary.previousAmber,
    personalRecords,
    lastSeenAt: new Date().toISOString(),
  }), { merge: true });

  const publicCoverage = buildSafePublicCoverage(
    desk,
    account.privacy.publicPlayerPage || account.privacy.universeCoverage,
    { publicPlayerPage: account.privacy.publicPlayerPage, universeCoverage: account.privacy.universeCoverage },
  );
  if (publicCoverage) {
    const publicId = safeDocumentId(`${account.chessCom.playerId}:${summary.deskKey}`);
    await db.collection("publicCoverage").doc(publicId).set(clean(publicCoverage));
  }
  return { deskKey: summary.deskKey, removedDeskKeys: retention.removed.map((item) => item.deskKey) };
}

export async function loadPublishedDesks(uid: string): Promise<PublishedDeskBundle[]> {
  const db = getAdminDb();
  const deskSnapshots = await db.collection("users").doc(uid).collection("desks")
    .orderBy("periodEnd", "desc")
    .limit(4)
    .get();
  return Promise.all(deskSnapshots.docs.map(async (document) => {
    const data = document.data() as { desk: BoardSignalDesk; summary: DeskSummary };
    const evidence = await document.ref.collection("evidence").orderBy("positionOrder", "asc").get();
    const candidates: BoardSignalDesk["candidates"] = [];
    const engineResults: Record<string, DeskEngineResult> = {};
    for (const evidenceDocument of evidence.docs) {
      const item = evidenceDocument.data() as {
        candidate: BoardSignalDesk["candidates"][number];
        engineResult?: DeskEngineResult;
      };
      candidates.push(item.candidate);
      if (item.engineResult) engineResults[item.candidate.id] = item.engineResult;
    }
    return { desk: { ...data.desk, candidates }, engineResults, summary: data.summary };
  }));
}

export async function buildPlayerRoomSnapshot(
  token: DecodedIdToken,
  currentEpisode?: CurrentEpisodeSummary,
  progressUnavailable?: string,
): Promise<PlayerRoomSnapshot> {
  const account = await accountForToken(token);
  await getAdminDb().collection("users").doc(account.uid).set(clean({
    lastSeenAt: new Date().toISOString(),
    latestProgressCheckedAt: currentEpisode?.checkedAt,
    currentEpisodeSummary: currentEpisode,
    nextDeskDueAt: currentEpisode?.nextDeskDueAt ?? account.nextDeskDueAt,
  }), { merge: true });
  const desks = await loadPublishedDesks(account.uid);
  const summaries = desks.map((item) => item.summary);
  const latest = desks[0]?.desk;
  const generationRequired = !latest || Boolean(
    latest.cadence?.nextAvailableOn
    && latest.cadence.nextAvailableOn <= new Date().toISOString().slice(0, 10),
  );
  const accountSnapshot = (await getAdminDb().collection("users").doc(account.uid).get()).data() as BoardSignalAccount & { personalRecords?: PersonalRecords };
  return {
    account: accountSnapshot,
    desks,
    progress: buildPoolProgress(summaries),
    recurringPatterns: deriveRecurringPatterns(summaries),
    personalRecords: accountSnapshot.personalRecords ?? {
      desksCompleted: summaries.length,
      personalBestWinRun: Math.max(0, ...summaries.map((summary) => summary.longestWinRun)),
      largestPoolSpecificRatingClimb: {},
    },
    currentEpisode,
    progressUnavailable,
    generationRequired,
  };
}
