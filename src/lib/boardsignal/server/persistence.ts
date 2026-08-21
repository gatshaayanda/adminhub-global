import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth, getAdminDb } from "../../../utils/firebaseAdmin";
import {
  FOUNDING_BETA_AGREEMENT_VERSION,
  canonicalPlayerKey,
  createFoundingBetaAccount,
  defaultNotificationPreferences,
  type BoardSignalAccount,
  type BoardSignalContactMethod,
  type BoardSignalNotificationPreferences,
  type BoardSignalPrivacySettings,
  type StableChessComIdentity,
} from "../account";
import {
  buildSafePublicCoverage,
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
import { createFactualReviewDraft, type FactualReviewDraft } from "../factualReview";
import {
  buildReviewProgress,
  deriveRecurringPatternsFromReviewHistory,
  liveDeskToReviewHistory,
  type CompletedReviewHistoryItem,
} from "../reviewHistory";
import {
  REVIEW_HISTORY_BACKFILL_VERSION,
  fourPeriodWindow,
  storedReviewLifecycle,
  type ReviewHistoryBackfillState,
  type ReviewLifecycle,
} from "../historyBackfill";
import type { PlayerPulse, SafeShareMoment } from "../pulse";
import {
  buildPlayerPulse,
  ensureShareMomentsForActiveDesks,
  listPlayerShareMoments,
  loadActiveUniverseState,
  recordCompletedDeskUniverseArtifacts,
  recordNewPlayerUniverseIntro,
} from "./universePulse";

export type PublishedDeskBundle = {
  desk: BoardSignalDesk;
  engineResults: Record<string, DeskEngineResult>;
  summary: DeskSummary;
  reviewLifecycle: ReviewLifecycle;
  countsTowardRetention: boolean;
};

export type PlayerRoomSnapshot = {
  account: BoardSignalAccount;
  desks: PublishedDeskBundle[];
  reviewHistory: CompletedReviewHistoryItem[];
  originalBetaReturn: boolean;
  progress: ProgressSeries[];
  recurringPatterns: RecurringPattern[];
  personalRecords: PersonalRecords;
  currentEpisode?: CurrentEpisodeSummary;
  pendingFactualReview?: FactualReviewDraft;
  progressUnavailable?: string;
  pulseUnavailable?: string;
  generationRequired: boolean;
  pulse?: PlayerPulse;
  shareMoments: Array<SafeShareMoment & { activeDesk?: boolean }>;
};

type AuthTicket = {
  uid: string;
  identity: StableChessComIdentity;
  expiresAt: number;
  consumedAt?: number;
};

type PublishOptions = {
  reviewLifecycle?: ReviewLifecycle;
  historyLeaseId?: string;
};

type AccountWithBackfill = BoardSignalAccount & { reviewHistoryBackfill?: ReviewHistoryBackfillState };

type StoredDeskDocument = {
  deskKey?: string;
  periodEnd?: string;
  summary?: DeskSummary;
  desk?: BoardSignalDesk;
  reviewLifecycle?: ReviewLifecycle;
  countsTowardRetention?: boolean;
  publishedAt?: string;
  importedAt?: string;
  originalBeta?: unknown;
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

function publicIdentityAllowed(account: BoardSignalAccount) {
  return account.identityStatus !== "provisional" && account.identityStatus !== "revoked";
}

async function recordUniversePulseException(account: BoardSignalAccount, type: string, error: unknown) {
  const createdAt = new Date().toISOString();
  const id = safeDocumentId(createHash("sha256")
    .update(`${account.uid}:${type}:${createdAt.slice(0, 13)}`)
    .digest("hex"));
  await getAdminDb().collection("exceptions").doc(id).set(clean({
    type,
    uid: account.uid,
    username: account.chessCom.canonicalUsername,
    title: "Universe Pulse refresh unavailable",
    message: error instanceof Error ? error.message : "Universe Pulse work failed.",
    createdAt,
  }), { merge: true }).catch(() => undefined);
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
    const base = existing ?? defaultAccount;
    const next: BoardSignalAccount = {
      ...base,
      uid,
      chessCom: identity,
      privacy: {
        ...defaultAccount.privacy,
        ...(base.privacy ?? {}),
        publicPlayerPage: true,
        universeCoverage: true,
      },
      notificationPreferences: {
        ...defaultNotificationPreferences(),
        ...(base.notificationPreferences ?? {}),
        founderUpdates: base.notificationPreferences?.founderUpdates ?? true,
      },
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
      pageEnabled: true,
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
  await getAdminDb().collection("users").doc(uid).set({
    chessComOAuthLinkedAt,
    identityStatus: "oauth_verified",
    identityReviewStatus: "confirmed",
  }, { merge: true });
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
  if (snapshot.exists) {
    const account = snapshot.data() as BoardSignalAccount;
    if (account.identityStatus === "revoked" || account.accessStatus !== "active") {
      throw Object.assign(new Error("This BoardSignal access is no longer active."), { status: 403, code: "ACCOUNT_ACCESS_REVOKED" });
    }
    const allowPublicIdentity = publicIdentityAllowed(account);
    const normalized: BoardSignalAccount = {
      ...account,
      privacy: {
        additionalPositiveHighlights: false,
        publicGameLinks: false,
        expandedPublicProfile: false,
        ...(account.privacy ?? {}),
        publicPlayerPage: allowPublicIdentity ? true : false,
        universeCoverage: allowPublicIdentity ? true : false,
      },
      notificationPreferences: {
        ...defaultNotificationPreferences(),
        ...(account.notificationPreferences ?? {}),
        founderUpdates: account.notificationPreferences?.founderUpdates ?? true,
      },
    };
    if (JSON.stringify(normalized.privacy) !== JSON.stringify(account.privacy)
      || JSON.stringify(normalized.notificationPreferences) !== JSON.stringify(account.notificationPreferences)) {
      await snapshot.ref.set(clean({ privacy: normalized.privacy, notificationPreferences: normalized.notificationPreferences }), { merge: true });
    }
    return normalized;
  }
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
  contact?: {
    preferredContactMethod: BoardSignalContactMethod;
    preferredContactValue: string;
    betaContactConsent: boolean;
  },
) {
  const account = await accountForToken(token);
  const allowPublicIdentity = publicIdentityAllowed(account);
  const normalizedPrivacy: BoardSignalPrivacySettings = {
    ...account.privacy,
    ...privacy,
    publicPlayerPage: allowPublicIdentity ? true : false,
    universeCoverage: allowPublicIdentity ? true : false,
  };
  const normalizedNotifications: BoardSignalNotificationPreferences = {
    ...defaultNotificationPreferences(),
    ...notificationPreferences,
  };
  const values = [...Object.values(normalizedPrivacy), ...Object.values(normalizedNotifications)]
    .filter((value): value is boolean => typeof value === "boolean");
  if (values.length < 2) throw Object.assign(new Error("Player Room preferences were invalid."), { status: 400 });

  let contactUpdate: Record<string, unknown> = {};
  if (contact) {
    const method = contact.preferredContactMethod;
    const value = contact.preferredContactValue?.trim();
    if (!(["email", "discord", "telegram"] as string[]).includes(method) || value.length > 160) throw Object.assign(new Error("The Founding Access contact settings were invalid."), { status: 400 });
    if (contact.betaContactConsent === true && !value) throw Object.assign(new Error("A reachable Founding Access contact is required while contact consent is enabled."), { status: 400 });
    if (contact.betaContactConsent === true && method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw Object.assign(new Error("Enter a valid email address."), { status: 400 });
    contactUpdate = {
      preferredContactMethod: method,
      preferredContactValue: value,
      betaContactConsent: contact.betaContactConsent === true,
      contactConfirmedAt: contact.betaContactConsent === true ? new Date().toISOString() : account.contactConfirmedAt,
    };
  }

  const db = getAdminDb();
  const preferencesConfirmedAt = new Date().toISOString();
  await db.collection("users").doc(account.uid).set(clean({
    privacy: normalizedPrivacy,
    notificationPreferences: normalizedNotifications,
    preferencesConfirmedAt,
    universeParticipationDisclosedAt: account.universeParticipationDisclosedAt ?? preferencesConfirmedAt,
    ...contactUpdate,
  }), { merge: true });
  if (allowPublicIdentity) {
    await db.collection("publicPlayers").doc(canonicalPlayerKey(account.chessCom)).set(clean({
      chessPlayerId: canonicalPlayerKey(account.chessCom),
      username: account.chessCom.canonicalUsername,
      usernameKey: account.chessCom.canonicalUsername.toLowerCase(),
      avatar: account.chessCom.avatar,
      profileUrl: account.chessCom.profileUrl,
      pageEnabled: true,
    }), { merge: true });
    const coverage = await db.collection("publicCoverage").where("chessPlayerId", "==", canonicalPlayerKey(account.chessCom)).get();
    await Promise.all(coverage.docs.map((document) => document.ref.set(clean({ visibility: { publicPlayerPage: true, universeCoverage: true } }), { merge: true })));
  }
  const updatedAccount = { ...account, privacy: normalizedPrivacy, notificationPreferences: normalizedNotifications, preferencesConfirmedAt, universeParticipationDisclosedAt: account.universeParticipationDisclosedAt ?? preferencesConfirmedAt, ...contactUpdate };
  if (allowPublicIdentity) await recordNewPlayerUniverseIntro(updatedAccount).catch(async (error) => recordUniversePulseException(updatedAccount, "universe_new_player_event", error));
  return { privacy: normalizedPrivacy, notificationPreferences: normalizedNotifications, preferencesConfirmedAt, ...contactUpdate };
}

export async function savePendingFactualReview(token: DecodedIdToken, desk: BoardSignalDesk, options: PublishOptions = {}): Promise<FactualReviewDraft> {
  const account = await accountForToken(token);
  if (options.reviewLifecycle === "historical_backfill") {
    const state = (account as AccountWithBackfill).reviewHistoryBackfill;
    if (!state?.lease || state.lease.periodStart !== desk.period.start || state.lease.leaseId !== options.historyLeaseId) {
      throw Object.assign(new Error("Historical Review claim is no longer active."), { status: 409, code: "HISTORY_LEASE_MISMATCH" });
    }
  }
  const next = createFactualReviewDraft(account, desk);
  const ref = getAdminDb().collection("users").doc(account.uid).collection("factualReviews").doc(safeDocumentId(next.deskKey));
  return getAdminDb().runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    const createdAt = typeof existing.data()?.createdAt === "string" ? String(existing.data()!.createdAt) : next.createdAt;
    const stored = { ...next, createdAt, updatedAt: new Date().toISOString() };
    transaction.set(ref, clean(stored), { merge: false });
    return stored;
  });
}

export async function loadPendingFactualReviews(uid: string): Promise<FactualReviewDraft[]> {
  const snapshot = await getAdminDb().collection("users").doc(uid).collection("factualReviews").get();
  return snapshot.docs.map((document) => document.data() as FactualReviewDraft)
    .filter((draft) => draft.schemaVersion === "boardsignal-factual-review-v1" && draft.status === "engine_pending")
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
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

export async function publishPrivateDesk(token: DecodedIdToken, desk: BoardSignalDesk, engineResults: Record<string, DeskEngineResult>, options: PublishOptions = {}) {
  const account = await accountForToken(token);
  if (desk.source !== "live" || !desk.provenance.verified) throw Object.assign(new Error("Only a verified LIVE Review can enter a Player Room."), { status: 422 });
  if (desk.player.playerId !== account.chessCom.playerId || desk.player.username.toLowerCase() !== account.chessCom.canonicalUsername.toLowerCase()) throw Object.assign(new Error("This Review does not belong to the authenticated Chess.com player."), { status: 403 });
  const quality = validateDeskForPublication(desk, engineResults);
  if (quality.status !== "PASS") throw Object.assign(new Error(`The Review did not clear publication validation: ${quality.codes.join(" · ")}`), { status: 422 });

  const db = getAdminDb();
  const summary = toDeskSummary(desk);
  const deskDocumentId = safeDocumentId(summary.deskKey);
  const desksRef = db.collection("users").doc(account.uid).collection("desks");
  const deskRef = desksRef.doc(deskDocumentId);
  const factualReviewRef = db.collection("users").doc(account.uid).collection("factualReviews").doc(deskDocumentId);
  const previous = await desksRef.get();
  const existingDocument = previous.docs.find((document) => document.id === deskDocumentId);
  if (existingDocument) {
    await factualReviewRef.delete().catch(() => undefined);
    return { deskKey: summary.deskKey, removedDeskKeys: [], alreadyPublished: true };
  }

  const initialHistorical = !account.cadenceAnchor && previous.empty;
  const historical = options.reviewLifecycle === "historical_backfill" || initialHistorical;
  const lifecycle: ReviewLifecycle = historical ? "historical_backfill" : "organic_live";
  if (historical && !initialHistorical) {
    const state = (account as AccountWithBackfill).reviewHistoryBackfill;
    if (!state?.lease || state.lease.periodStart !== desk.period.start || state.lease.leaseId !== options.historyLeaseId) {
      throw Object.assign(new Error("Historical Review claim is no longer active."), { status: 409, code: "HISTORY_LEASE_MISMATCH" });
    }
  }

  const allowPublicIdentity = publicIdentityAllowed(account);
  const beforeUniverseState = !historical && allowPublicIdentity ? await loadActiveUniverseState().catch(async (error) => {
    await recordUniversePulseException(account, "universe_pre_publish_snapshot", error);
    return undefined;
  }) : undefined;

  const oldEvidence = await deskRef.collection("evidence").get();
  const batch = db.batch();
  oldEvidence.docs.forEach((document) => batch.delete(document.ref));
  const deskWithoutEvidence = { ...desk, candidates: [] };
  const storedAt = new Date().toISOString();
  batch.set(deskRef, clean({
    deskKey: summary.deskKey,
    periodEnd: summary.periodEnd,
    summary,
    desk: deskWithoutEvidence,
    reviewLifecycle: lifecycle,
    countsTowardRetention: !historical,
    occurredAt: `${summary.periodEnd}T23:59:59.999Z`,
    ...(historical ? { importedAt: storedAt } : { publishedAt: storedAt }),
  }));
  desk.candidates.forEach((candidate, positionOrder) => {
    batch.set(deskRef.collection("evidence").doc(safeDocumentId(candidate.id)), clean({ positionOrder, candidate, engineResult: engineResults[candidate.id] }));
  });
  if (initialHistorical) {
    batch.set(db.collection("users").doc(account.uid), clean({
      cadenceAnchor: desk.period.start,
      nextDeskDueAt: desk.cadence?.nextAvailableOn,
      reviewHistoryBackfill: {
        version: REVIEW_HISTORY_BACKFILL_VERSION,
        status: "pending",
        targetPeriods: fourPeriodWindow(desk.period.start),
        evaluated: { [desk.period.start]: { status: "published", evaluatedAt: storedAt } },
        activationBaseline: true,
        establishedAt: storedAt,
      } satisfies ReviewHistoryBackfillState,
    }), { merge: true });
  }
  batch.delete(factualReviewRef);
  await batch.commit();

  const entries = [
    ...previous.docs.map((document) => ({ deskKey: String(document.data().deskKey), periodEnd: String(document.data().periodEnd ?? document.data().summary?.periodEnd), documentId: document.id })),
    { deskKey: summary.deskKey, periodEnd: summary.periodEnd, documentId: deskDocumentId },
  ];
  const retention = retainLatestFour(entries);
  for (const removed of retention.removed) {
    const removedPrevious = previous.docs.find((document) => document.id === removed.documentId)?.data() as StoredDeskDocument | undefined;
    if (historical && removedPrevious?.originalBeta) continue;
    await deleteDeskTree(account.uid, removed.documentId);
  }

  const accountUpdate: Record<string, unknown> = {};
  if (!historical) {
    const currentRecords = (await db.collection("users").doc(account.uid).get()).data()?.personalRecords as PersonalRecords | undefined;
    const updatedRecords = updatePersonalRecords(currentRecords, summary);
    accountUpdate.cadenceAnchor = account.cadenceAnchor ?? desk.cadence?.anchorStart ?? desk.period.start;
    accountUpdate.nextDeskDueAt = desk.cadence?.nextAvailableOn;
    accountUpdate.previousBlue = summary.previousBlue;
    accountUpdate.previousAmber = summary.previousAmber;
    accountUpdate.personalRecords = {
      ...(updatedRecords ?? { personalBestWinRun: summary.longestWinRun, largestPoolSpecificRatingClimb: {} }),
      desksCompleted: retention.retained.length,
    } satisfies PersonalRecords;
    accountUpdate.lastSeenAt = storedAt;
  }
  if (Object.keys(accountUpdate).length) await db.collection("users").doc(account.uid).set(clean(accountUpdate), { merge: true });

  if (!historical) {
    const publicCoverage = allowPublicIdentity ? buildSafePublicCoverage(desk, true, { publicPlayerPage: true, universeCoverage: true }) : undefined;
    if (publicCoverage) {
      const publicId = safeDocumentId(`${account.chessCom.playerId}:${summary.deskKey}`);
      await db.collection("publicCoverage").doc(publicId).set(clean(publicCoverage));
    }
    if (allowPublicIdentity && beforeUniverseState) {
      await recordCompletedDeskUniverseArtifacts({ account, desk, deskKey: summary.deskKey, beforeState: beforeUniverseState, deskCountAfter: retention.retained.length }).catch(async (error) => {
        await recordUniversePulseException(account, "universe_completed_desk_artifacts", error);
      });
    }
  }
  return { deskKey: summary.deskKey, removedDeskKeys: retention.removed.map((item) => item.deskKey), reviewLifecycle: lifecycle };
}

export async function loadPublishedDesks(uid: string): Promise<PublishedDeskBundle[]> {
  const db = getAdminDb();
  const deskSnapshots = await db.collection("users").doc(uid).collection("desks").orderBy("periodEnd", "desc").limit(4).get();
  const liveDocuments = deskSnapshots.docs.filter((document) => {
    const data = document.data() as StoredDeskDocument;
    return Boolean(data.desk && data.summary && data.desk.source === "live" && data.desk.provenance.verified);
  });
  return Promise.all(liveDocuments.map(async (document) => {
    const data = document.data() as StoredDeskDocument & { desk: BoardSignalDesk; summary: DeskSummary };
    const evidence = await document.ref.collection("evidence").orderBy("positionOrder", "asc").get();
    const candidates: BoardSignalDesk["candidates"] = [];
    const engineResults: Record<string, DeskEngineResult> = {};
    for (const evidenceDocument of evidence.docs) {
      const item = evidenceDocument.data() as { candidate: BoardSignalDesk["candidates"][number]; engineResult?: DeskEngineResult };
      candidates.push(item.candidate);
      if (item.engineResult) engineResults[item.candidate.id] = item.engineResult;
    }
    const lifecycle = storedReviewLifecycle(data) ?? "organic_live";
    return {
      desk: { ...data.desk, candidates },
      engineResults,
      summary: data.summary,
      reviewLifecycle: lifecycle,
      countsTowardRetention: lifecycle !== "historical_backfill" && data.countsTowardRetention !== false,
    };
  }));
}

export async function loadCompletedReviewHistory(uid: string): Promise<CompletedReviewHistoryItem[]> {
  const snapshot = await getAdminDb().collection("users").doc(uid).collection("desks").orderBy("periodEnd", "desc").limit(4).get();
  return snapshot.docs.flatMap((document) => {
    const data = document.data() as { desk?: BoardSignalDesk; summary?: DeskSummary; originalBeta?: { history?: CompletedReviewHistoryItem } };
    if (data.originalBeta?.history) return [{ ...data.originalBeta.history, reviewKey: String(data.originalBeta.history.reviewKey ?? document.id) }];
    if (data.desk?.source === "live" && data.desk.provenance.verified && data.summary) return [liveDeskToReviewHistory(data.desk, data.summary)];
    return [];
  }).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
}

export async function buildPlayerRoomSnapshot(token: DecodedIdToken, currentEpisode?: CurrentEpisodeSummary, progressUnavailable?: string): Promise<PlayerRoomSnapshot> {
  const account = await accountForToken(token);
  await getAdminDb().collection("users").doc(account.uid).set(clean({
    lastSeenAt: new Date().toISOString(),
    latestProgressCheckedAt: currentEpisode?.checkedAt,
    currentEpisodeSummary: currentEpisode,
    nextDeskDueAt: currentEpisode?.nextDeskDueAt ?? account.nextDeskDueAt,
  }), { merge: true });
  const desks = await loadPublishedDesks(account.uid);
  const reviewHistory = await loadCompletedReviewHistory(account.uid);
  const summaries = desks.map((item) => item.summary);
  const publishedKeys = new Set(summaries.map((summary) => summary.deskKey));
  const factualReviews = await loadPendingFactualReviews(account.uid);
  const obsoleteFactualReviews = factualReviews.filter((draft) => publishedKeys.has(draft.deskKey));
  if (obsoleteFactualReviews.length) {
    const cleanup = getAdminDb().batch();
    obsoleteFactualReviews.forEach((draft) => cleanup.delete(getAdminDb().collection("users").doc(account.uid).collection("factualReviews").doc(safeDocumentId(draft.deskKey))));
    await cleanup.commit();
  }
  const latest = desks[0]?.desk;
  const pendingFactualReview = factualReviews.find((draft) => !publishedKeys.has(draft.deskKey) && (!latest || draft.periodEnd > latest.period.end));
  const generationRequired = pendingFactualReview ? false : !latest || Boolean(latest.cadence?.nextAvailableOn && latest.cadence.nextAvailableOn <= new Date().toISOString().slice(0, 10));
  const accountSnapshot = (await getAdminDb().collection("users").doc(account.uid).get()).data() as BoardSignalAccount & { personalRecords?: PersonalRecords; originalBetaPlayer?: boolean };
  const storedRecords = accountSnapshot.personalRecords ?? { desksCompleted: 0, personalBestWinRun: 0, largestPoolSpecificRatingClimb: {} };
  const knownHistoricalRuns = reviewHistory.flatMap((review) => review.longestWinRun === undefined ? [] : [review.longestWinRun]);
  const personalRecords: PersonalRecords = { ...storedRecords, desksCompleted: reviewHistory.length, personalBestWinRun: Math.max(storedRecords.personalBestWinRun, ...knownHistoricalRuns, 0) };
  let pulse: PlayerPulse | undefined;
  let pulseUnavailable: string | undefined;
  try {
    pulse = await buildPlayerPulse({ account: accountSnapshot, latestDesk: latest, currentEpisode });
  } catch (error) {
    pulseUnavailable = "Universe Pulse is temporarily unavailable. Your saved Reviews are unchanged.";
    await recordUniversePulseException(accountSnapshot, "universe_player_room_pulse", error);
  }
  const organicDesks = desks.filter((item) => item.reviewLifecycle !== "historical_backfill");
  if (organicDesks.length && publicIdentityAllowed(accountSnapshot)) {
    await ensureShareMomentsForActiveDesks(accountSnapshot, organicDesks).catch(async (error) => recordUniversePulseException(accountSnapshot, "universe_share_backfill", error));
  }
  const organicSummaries = organicDesks.map((item) => item.summary);
  const shareMoments = publicIdentityAllowed(accountSnapshot) ? await listPlayerShareMoments(account.chessCom.playerId, organicSummaries.map((summary) => summary.deskKey)).catch(async (error) => {
    await recordUniversePulseException(accountSnapshot, "universe_share_load", error);
    return [] as Array<SafeShareMoment & { activeDesk?: boolean }>;
  }) : [];
  return {
    account: accountSnapshot,
    desks,
    reviewHistory,
    originalBetaReturn: accountSnapshot.originalBetaPlayer === true || reviewHistory.some((review) => review.source === "original_beta"),
    progress: buildReviewProgress(reviewHistory),
    recurringPatterns: deriveRecurringPatternsFromReviewHistory(reviewHistory),
    personalRecords,
    currentEpisode,
    pendingFactualReview,
    progressUnavailable,
    pulseUnavailable,
    generationRequired,
    pulse,
    shareMoments,
  };
}
