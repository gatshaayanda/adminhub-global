import "server-only";

import type { BoardSignalFounderContactMethod } from "../account";
import {
  deriveFounderOperation,
  summarizeFounderHistoryVisibility,
  type FounderHistoryVisibility,
  type FounderOperationComparableRow,
} from "../founderOperationsLogic";
import type { CanonicalReportPeriod, ReviewHistoryCoverage } from "../reviewPeriods";
import { getAdminDb } from "../../../utils/firebaseAdmin";
import { logFirestoreReadBudget, noteFirestoreServiceFailure } from "./firestoreService";

export const FOUNDER_MATERIALIZED_VERSION = "boardsignal-founder-operations-v1" as const;
const FOUNDER_PENDING_RECONCILE_LIMIT = 200;
const FOUNDER_LIFECYCLE_TRUTH_VERSION = 2 as const;
const FOUNDER_LIFECYCLE_RECONCILE_LIMIT = 200;

export type FounderOperationsRow = FounderOperationComparableRow & {
  playerId?: number;
  profileUrl?: string;
  avatar?: string;
  accountStatus?: string;
  identityStatus?: string;
  identityReviewStatus?: string;
  publicHighlightsStatus?: string;
  preferredContactMethod?: string;
  preferredContactValue?: string;
  latestReview?: { deskKey?: string; periodStart?: string; periodEnd?: string; periodLabel?: string; publishedAt?: string };
  latestReportPeriod?: CanonicalReportPeriod;
  recentReportPeriods?: CanonicalReportPeriod[];
  historyCoverage?: ReviewHistoryCoverage;
  officialChessStatePeriod?: { periodStart?: string; periodEnd?: string; periodLabel?: string };
  reviewPeriods: Array<{ periodStart: string; periodEnd: string; periodLabel?: string; source: "original" | "live" }>;
  history: FounderHistoryVisibility;
  lastContactedAt?: string;
  lastContactMethod?: BoardSignalFounderContactMethod;
  followUpSnoozedUntil?: string;
  pendingRequestId?: string;
  exceptionTitles: string[];
  accessStatus?: string;
};

export type FounderValidationContribution = {
  served: number;
  verifiedReviews: number;
  originalReviews: number;
  liveReviews: number;
  historicalPeriods: number;
  originalToLive: number;
  retentionDepth: number;
};

export type FounderPlayerSummary = {
  version: typeof FOUNDER_MATERIALIZED_VERSION;
  playerId: string;
  uid: string;
  updatedAt: string;
  active: boolean;
  row: FounderOperationsRow;
  validation: FounderValidationContribution;
};

export type FounderPendingRequestSummary = {
  version: typeof FOUNDER_MATERIALIZED_VERSION;
  requestId: string;
  updatedAt: string;
  active: boolean;
  row: FounderOperationsRow;
};

export type FounderOperationsAggregate = {
  version: typeof FOUNDER_MATERIALIZED_VERSION;
  revision: number;
  bootstrapComplete: boolean;
  lifecycleTruthVersion?: number;
  generatedAt: string;
  attention: { newRequests: number; followUpsDue: number; unreadReplies: number; exceptions: number; identityConflicts: number };
  metrics: { activePlayers: number; reviewsForming: number; reviewsReady: number; followUpsDue: number; notSeenRecently: number; unreadReplies: number };
  validation: { playersServed: number; verifiedReviews: number; originalReviews: number; liveReviews: number; historicalPeriods: number; originalToLive: number; r2Plus: number; r3Plus: number; r4: number; dataCompleteness: string };
};

type Contribution = {
  activePlayers: number;
  reviewsForming: number;
  reviewsReady: number;
  followUpsDue: number;
  notSeenRecently: number;
  unreadReplies: number;
  exceptions: number;
  identityConflicts: number;
  playersServed: number;
  verifiedReviews: number;
  originalReviews: number;
  liveReviews: number;
  historicalPeriods: number;
  originalToLive: number;
  r2Plus: number;
  r3Plus: number;
  r4: number;
};

const DATA_COMPLETENESS = "Verified Reviews remain Original Beta plus organic LIVE Reviews. Historical onboarding is shown separately as game-bearing historical periods and does not count as a retention return or qualifying Review. Reviews Forming counts active players with an established cadence-aligned current week, not only players whose cached Player Room progress happened to refresh recently.";

function clean<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function zeroContribution(): Contribution { return { activePlayers: 0, reviewsForming: 0, reviewsReady: 0, followUpsDue: 0, notSeenRecently: 0, unreadReplies: 0, exceptions: 0, identityConflicts: 0, playersServed: 0, verifiedReviews: 0, originalReviews: 0, liveReviews: 0, historicalPeriods: 0, originalToLive: 0, r2Plus: 0, r3Plus: 0, r4: 0 }; }
function nonnegative(value: number) { return Math.max(0, Math.round(value)); }
function emptyAggregate(now = new Date()): FounderOperationsAggregate {
  return {
    version: FOUNDER_MATERIALIZED_VERSION,
    revision: 0,
    bootstrapComplete: false,
    generatedAt: now.toISOString(),
    attention: { newRequests: 0, followUpsDue: 0, unreadReplies: 0, exceptions: 0, identityConflicts: 0 },
    metrics: { activePlayers: 0, reviewsForming: 0, reviewsReady: 0, followUpsDue: 0, notSeenRecently: 0, unreadReplies: 0 },
    validation: { playersServed: 0, verifiedReviews: 0, originalReviews: 0, liveReviews: 0, historicalPeriods: 0, originalToLive: 0, r2Plus: 0, r3Plus: 0, r4: 0, dataCompleteness: DATA_COMPLETENESS },
  };
}

function contributionForSummary(summary: FounderPlayerSummary | undefined): Contribution {
  if (!summary?.active) return zeroContribution();
  const row = summary.row;
  const retentionDepth = summary.validation.retentionDepth;
  return {
    activePlayers: 1,
    reviewsForming: row.forming ? 1 : 0,
    reviewsReady: row.readyNotSeen ? 1 : 0,
    followUpsDue: row.followUpStatus === "due" ? 1 : 0,
    notSeenRecently: row.notSeenRecently ? 1 : 0,
    unreadReplies: Math.max(0, Number(row.unreadReplies) || 0),
    exceptions: row.exceptionCount > 0 || row.reviewCheckRequired ? 1 : 0,
    identityConflicts: row.identityConflict ? 1 : 0,
    playersServed: summary.validation.served,
    verifiedReviews: summary.validation.verifiedReviews,
    originalReviews: summary.validation.originalReviews,
    liveReviews: summary.validation.liveReviews,
    historicalPeriods: summary.validation.historicalPeriods ?? 0,
    originalToLive: summary.validation.originalToLive,
    r2Plus: retentionDepth >= 2 ? 1 : 0,
    r3Plus: retentionDepth >= 3 ? 1 : 0,
    r4: retentionDepth >= 4 ? 1 : 0,
  };
}

function applyDelta(aggregate: FounderOperationsAggregate, before: Contribution, after: Contribution, now = new Date()): FounderOperationsAggregate {
  const delta = (key: keyof Contribution) => after[key] - before[key];
  const followUpsDue = nonnegative(aggregate.metrics.followUpsDue + delta("followUpsDue"));
  const unreadReplies = nonnegative(aggregate.metrics.unreadReplies + delta("unreadReplies"));
  return {
    ...aggregate,
    version: FOUNDER_MATERIALIZED_VERSION,
    revision: aggregate.revision + 1,
    generatedAt: now.toISOString(),
    metrics: {
      activePlayers: nonnegative(aggregate.metrics.activePlayers + delta("activePlayers")),
      reviewsForming: nonnegative(aggregate.metrics.reviewsForming + delta("reviewsForming")),
      reviewsReady: nonnegative(aggregate.metrics.reviewsReady + delta("reviewsReady")),
      followUpsDue,
      notSeenRecently: nonnegative(aggregate.metrics.notSeenRecently + delta("notSeenRecently")),
      unreadReplies,
    },
    attention: {
      ...aggregate.attention,
      followUpsDue,
      unreadReplies,
      exceptions: nonnegative(aggregate.attention.exceptions + delta("exceptions")),
      identityConflicts: nonnegative(aggregate.attention.identityConflicts + delta("identityConflicts")),
    },
    validation: {
      ...aggregate.validation,
      playersServed: nonnegative(aggregate.validation.playersServed + delta("playersServed")),
      verifiedReviews: nonnegative(aggregate.validation.verifiedReviews + delta("verifiedReviews")),
      originalReviews: nonnegative(aggregate.validation.originalReviews + delta("originalReviews")),
      liveReviews: nonnegative(aggregate.validation.liveReviews + delta("liveReviews")),
      historicalPeriods: nonnegative((aggregate.validation.historicalPeriods ?? 0) + delta("historicalPeriods")),
      originalToLive: nonnegative(aggregate.validation.originalToLive + delta("originalToLive")),
      r2Plus: nonnegative(aggregate.validation.r2Plus + delta("r2Plus")),
      r3Plus: nonnegative(aggregate.validation.r3Plus + delta("r3Plus")),
      r4: nonnegative(aggregate.validation.r4 + delta("r4")),
      dataCompleteness: DATA_COMPLETENESS,
    },
  };
}

function aggregateRef() { return getAdminDb().collection("founderOperationsState").doc("current"); }
function summaryRef(playerId: number | string) { return getAdminDb().collection("founderPlayerSummaries").doc(String(playerId)); }
function pendingRef(requestId: string) { return getAdminDb().collection("founderPendingRequestSummaries").doc(requestId); }

type FounderLifecycleAccount = {
  uid?: string;
  role?: string;
  accessStatus?: string;
  cadenceAnchor?: string;
  reviewHistoryBackfill?: { evaluated?: Record<string, { status?: string }> };
};

function historicalPeriodsFromAccount(account: FounderLifecycleAccount | undefined) {
  return Object.values(account?.reviewHistoryBackfill?.evaluated ?? {}).filter((evaluation) => evaluation?.status === "published").length;
}

export async function reconcileFounderLifecycleTruth(now = new Date()): Promise<FounderOperationsAggregate> {
  const started = Date.now();
  const db = getAdminDb();
  const [users, summaries, pending] = await Promise.all([
    db.collection("users").limit(FOUNDER_LIFECYCLE_RECONCILE_LIMIT + 1).get(),
    db.collection("founderPlayerSummaries").limit(FOUNDER_LIFECYCLE_RECONCILE_LIMIT + 1).get(),
    db.collection("founderPendingRequestSummaries").where("active", "==", true).limit(FOUNDER_LIFECYCLE_RECONCILE_LIMIT + 1).get(),
  ]);

  if (users.size > FOUNDER_LIFECYCLE_RECONCILE_LIMIT || summaries.size > FOUNDER_LIFECYCLE_RECONCILE_LIMIT || pending.size > FOUNDER_LIFECYCLE_RECONCILE_LIMIT) {
    throw Object.assign(new Error("Founder lifecycle truth reconciliation exceeded its bounded safety limit."), {
      status: 503,
      code: "FOUNDER_LIFECYCLE_RECONCILE_LIMIT",
      retryAfterSeconds: 30,
    });
  }

  const accountsByUid = new Map(
    users.docs
      .map((document) => ({ id: document.id, data: document.data() as FounderLifecycleAccount }))
      .filter(({ data }) => data.role === "player")
      .map(({ id, data }) => [String(data.uid ?? id), data] as const),
  );

  const nextSummaries = summaries.docs
    .map((document) => document.data() as FounderPlayerSummary)
    .filter((summary) => summary.version === FOUNDER_MATERIALIZED_VERSION)
    .map((summary) => {
      const account = accountsByUid.get(summary.uid);
      const forming = account?.accessStatus === "active" && Boolean(account.cadenceAnchor);
      return {
        ...summary,
        updatedAt: now.toISOString(),
        row: { ...summary.row, forming },
        validation: { ...summary.validation, historicalPeriods: historicalPeriodsFromAccount(account) },
      } satisfies FounderPlayerSummary;
    });

  let aggregate = emptyAggregate(now);
  for (const summary of nextSummaries) aggregate = applyDelta(aggregate, zeroContribution(), contributionForSummary(summary), now);

  aggregate = {
    ...aggregate,
    bootstrapComplete: true,
    lifecycleTruthVersion: FOUNDER_LIFECYCLE_TRUTH_VERSION,
    revision: aggregate.revision + 1,
    generatedAt: now.toISOString(),
    attention: { ...aggregate.attention, newRequests: pending.size },
    validation: { ...aggregate.validation, dataCompleteness: DATA_COMPLETENESS },
  };

  const batch = db.batch();
  for (const summary of nextSummaries) batch.set(summaryRef(summary.playerId), clean(summary), { merge: false });
  batch.set(aggregateRef(), clean(aggregate), { merge: false });
  await batch.commit();

  logFirestoreReadBudget({
    operation: "founder_lifecycle_truth_reconcile",
    durationMs: Date.now() - started,
    materialized: "rebuild",
    resultSize: nextSummaries.length,
    approxDocumentReads: users.size + summaries.size + pending.size,
    querySizes: { users: users.size, summaries: summaries.size, pending: pending.size },
  });

  return aggregate;
}

type PendingSourceRequest = {
  id: string;
  chessPlayerId?: number;
  canonicalUsername?: string;
  preferredContactMethod?: string;
  preferredContactValue?: string;
  requestedAt?: string;
  status?: string;
  profileUrl?: string;
};

export async function reconcileFounderPendingRequestState(now = new Date()): Promise<FounderOperationsAggregate | undefined> {
  const db = getAdminDb();
  const started = Date.now();
  const [aggregateSnapshot, sourcePending, materializedPending] = await Promise.all([
    aggregateRef().get(),
    db.collection("betaRequests").where("status", "==", "pending").limit(FOUNDER_PENDING_RECONCILE_LIMIT + 1).get(),
    db.collection("founderPendingRequestSummaries").where("active", "==", true).limit(FOUNDER_PENDING_RECONCILE_LIMIT + 1).get(),
  ]);

  if (sourcePending.size > FOUNDER_PENDING_RECONCILE_LIMIT || materializedPending.size > FOUNDER_PENDING_RECONCILE_LIMIT) {
    throw Object.assign(new Error("Founder pending-request reconciliation exceeded its bounded safety limit."), {
      status: 503,
      code: "FOUNDER_PENDING_RECONCILE_LIMIT",
      retryAfterSeconds: 30,
    });
  }

  const aggregate = aggregateSnapshot.exists ? aggregateSnapshot.data() as FounderOperationsAggregate : undefined;
  if (!aggregate || aggregate.version !== FOUNDER_MATERIALIZED_VERSION || aggregate.bootstrapComplete !== true) return undefined;

  const actual = new Map(sourcePending.docs.map((document) => {
    const request = { id: document.id, ...document.data() } as PendingSourceRequest;
    return [request.id, request] as const;
  }));
  const materialized = new Map(materializedPending.docs.map((document) => [document.id, document.data() as FounderPendingRequestSummary] as const));

  const batch = db.batch();
  let writes = 0;

  for (const [requestId, request] of actual) {
    const expected = founderPendingSummaryFromInput(request, now);
    const existing = materialized.get(requestId);
    if (!existing || JSON.stringify(clean(existing.row)) !== JSON.stringify(clean(expected.row)) || existing.active !== true || existing.version !== FOUNDER_MATERIALIZED_VERSION) {
      batch.set(pendingRef(requestId), clean(expected), { merge: false });
      writes += 1;
    }
  }

  for (const requestId of materialized.keys()) {
    if (!actual.has(requestId)) {
      batch.delete(pendingRef(requestId));
      writes += 1;
    }
  }

  let next = aggregate;
  if (aggregate.attention.newRequests !== actual.size) {
    next = {
      ...aggregate,
      revision: aggregate.revision + 1,
      generatedAt: now.toISOString(),
      attention: { ...aggregate.attention, newRequests: actual.size },
    };
    batch.set(aggregateRef(), clean(next), { merge: false });
    writes += 1;
  }

  if (writes > 0) await batch.commit();

  logFirestoreReadBudget({
    operation: "founder_pending_reconcile",
    durationMs: Date.now() - started,
    materialized: writes > 0 ? "rebuild" : "hit",
    resultSize: actual.size,
    approxDocumentReads: 1 + sourcePending.size + materializedPending.size,
    querySizes: { sourcePending: sourcePending.size, materializedPending: materializedPending.size },
  });

  return next;
}

export async function upsertFounderPlayerSummary(summary: FounderPlayerSummary, now = new Date()) {
  const db = getAdminDb();
  await db.runTransaction(async (transaction) => {
    const [previousSnapshot, aggregateSnapshot] = await Promise.all([transaction.get(summaryRef(summary.playerId)), transaction.get(aggregateRef())]);
    const previous = previousSnapshot.exists ? previousSnapshot.data() as FounderPlayerSummary : undefined;
    const aggregate = aggregateSnapshot.exists ? aggregateSnapshot.data() as FounderOperationsAggregate : emptyAggregate(now);
    const next = applyDelta(aggregate, contributionForSummary(previous), contributionForSummary(summary), now);
    transaction.set(summaryRef(summary.playerId), clean(summary), { merge: false });
    transaction.set(aggregateRef(), clean(next), { merge: false });
  });
}

export async function removeFounderPlayerSummary(playerId: number | string, now = new Date()) {
  const db = getAdminDb();
  await db.runTransaction(async (transaction) => {
    const [previousSnapshot, aggregateSnapshot] = await Promise.all([transaction.get(summaryRef(playerId)), transaction.get(aggregateRef())]);
    if (!previousSnapshot.exists) return;
    const previous = previousSnapshot.data() as FounderPlayerSummary;
    const aggregate = aggregateSnapshot.exists ? aggregateSnapshot.data() as FounderOperationsAggregate : emptyAggregate(now);
    transaction.delete(summaryRef(playerId));
    transaction.set(aggregateRef(), clean(applyDelta(aggregate, contributionForSummary(previous), zeroContribution(), now)), { merge: false });
  });
}

export async function updateFounderPlayerActivity(input: {
  playerId: number;
  uid: string;
  lastSeenAt?: string;
  nextDeskDueAt?: string;
  forming?: boolean;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const db = getAdminDb();
  await db.runTransaction(async (transaction) => {
    const [summarySnapshot, aggregateSnapshot] = await Promise.all([transaction.get(summaryRef(input.playerId)), transaction.get(aggregateRef())]);
    if (!summarySnapshot.exists) return;
    const previous = summarySnapshot.data() as FounderPlayerSummary;
    if (previous.uid !== input.uid) return;
    const aggregate = aggregateSnapshot.exists ? aggregateSnapshot.data() as FounderOperationsAggregate : emptyAggregate(now);
    const rowInput = {
      ...previous.row,
      lastSeenAt: input.lastSeenAt ?? previous.row.lastSeenAt,
      nextDeskDueAt: input.nextDeskDueAt ?? previous.row.nextDeskDueAt,
      forming: input.forming ?? previous.row.forming,
    };
    const derived = deriveFounderOperation({
      uid: rowInput.uid,
      username: rowInput.username,
      preferredContactValue: rowInput.preferredContactValue,
      lastSeenAt: rowInput.lastSeenAt,
      nextDeskDueAt: rowInput.nextDeskDueAt,
      forming: rowInput.forming,
      latestReview: rowInput.latestReview,
      unreadReplies: rowInput.unreadReplies,
      pendingRequest: false,
      exceptionCount: rowInput.exceptionCount,
      identityConflict: rowInput.identityConflict,
      founderOps: { lastContactedAt: rowInput.lastContactedAt, lastContactMethod: rowInput.lastContactMethod, followUpSnoozedUntil: rowInput.followUpSnoozedUntil },
    }, now);
    const nextSummary: FounderPlayerSummary = { ...previous, updatedAt: now.toISOString(), row: { ...rowInput, ...derived, forming: derived.forming } };
    transaction.set(summaryRef(input.playerId), clean(nextSummary), { merge: false });
    transaction.set(aggregateRef(), clean(applyDelta(aggregate, contributionForSummary(previous), contributionForSummary(nextSummary), now)), { merge: false });
  });
}

export async function upsertFounderPendingRequestSummary(summary: FounderPendingRequestSummary, now = new Date()) {
  const db = getAdminDb();
  await db.runTransaction(async (transaction) => {
    const [previousSnapshot, aggregateSnapshot] = await Promise.all([transaction.get(pendingRef(summary.requestId)), transaction.get(aggregateRef())]);
    const wasActive = previousSnapshot.exists && (previousSnapshot.data() as FounderPendingRequestSummary).active;
    const aggregate = aggregateSnapshot.exists ? aggregateSnapshot.data() as FounderOperationsAggregate : emptyAggregate(now);
    const nextCount = nonnegative(aggregate.attention.newRequests + (summary.active && !wasActive ? 1 : !summary.active && wasActive ? -1 : 0));
    transaction.set(pendingRef(summary.requestId), clean(summary), { merge: false });
    transaction.set(aggregateRef(), clean({ ...aggregate, revision: aggregate.revision + 1, generatedAt: now.toISOString(), attention: { ...aggregate.attention, newRequests: nextCount } }), { merge: false });
  });
}

export async function clearFounderPendingRequestSummary(requestId: string, now = new Date()) {
  const db = getAdminDb();
  await db.runTransaction(async (transaction) => {
    const [previousSnapshot, aggregateSnapshot] = await Promise.all([transaction.get(pendingRef(requestId)), transaction.get(aggregateRef())]);
    if (!previousSnapshot.exists) return;
    const previous = previousSnapshot.data() as FounderPendingRequestSummary;
    const aggregate = aggregateSnapshot.exists ? aggregateSnapshot.data() as FounderOperationsAggregate : emptyAggregate(now);
    transaction.delete(pendingRef(requestId));
    const nextCount = nonnegative(aggregate.attention.newRequests - (previous.active ? 1 : 0));
    transaction.set(aggregateRef(), clean({ ...aggregate, revision: aggregate.revision + 1, generatedAt: now.toISOString(), attention: { ...aggregate.attention, newRequests: nextCount } }), { merge: false });
  });

  // Core request approval/rejection is authoritative. Reconcile the cheap
  // materialized pending view immediately so a missed best-effort summary
  // write/delete cannot leave Founder Newsroom lying about New Requests.
  return reconcileFounderPendingRequestState(now);
}

export async function loadFounderOperationsAggregate(now = new Date()): Promise<FounderOperationsAggregate | undefined> {
  const started = Date.now();
  try {
    const snapshot = await aggregateRef().get();
    let aggregate = snapshot.exists ? snapshot.data() as FounderOperationsAggregate : undefined;

    // One-time bounded repair of the existing Founder materialization.
    if (
      aggregate?.version === FOUNDER_MATERIALIZED_VERSION
      && aggregate.bootstrapComplete === true
      && aggregate.lifecycleTruthVersion !== FOUNDER_LIFECYCLE_TRUTH_VERSION
    ) {
      aggregate = await reconcileFounderLifecycleTruth(now);
    }

    // Normal Founder landing remains one aggregate-document read. Only when
    // that aggregate itself claims there are pending requests do we verify
    // the small pending-request materialization and repair stale truth.
    if (
      aggregate?.version === FOUNDER_MATERIALIZED_VERSION
      && aggregate.bootstrapComplete === true
      && aggregate.attention.newRequests > 0
    ) {
      aggregate = await reconcileFounderPendingRequestState(now) ?? aggregate;
    }

    logFirestoreReadBudget({
      operation: "founder_operations_aggregate",
      durationMs: Date.now() - started,
      materialized: aggregate ? "hit" : "miss",
      resultSize: aggregate?.metrics.activePlayers ?? 0,
      approxDocumentReads: 1,
    });

    return aggregate?.version === FOUNDER_MATERIALIZED_VERSION && aggregate.bootstrapComplete === true ? aggregate : undefined;
  } catch (error) {
    const failure = noteFirestoreServiceFailure(error);
    logFirestoreReadBudget({ operation: "founder_operations_aggregate", durationMs: Date.now() - started, failure: failure?.kind });
    throw error;
  }
}

export async function loadFounderOperationRows() {
  const started = Date.now();
  const [players, pending] = await Promise.all([
    getAdminDb().collection("founderPlayerSummaries").get(),
    getAdminDb().collection("founderPendingRequestSummaries").get(),
  ]);
  const rows = [
    ...players.docs.map((document) => document.data() as FounderPlayerSummary).filter((summary) => summary.version === FOUNDER_MATERIALIZED_VERSION && summary.active).map((summary) => summary.row),
    ...pending.docs.map((document) => document.data() as FounderPendingRequestSummary).filter((summary) => summary.version === FOUNDER_MATERIALIZED_VERSION && summary.active).map((summary) => summary.row),
  ];
  logFirestoreReadBudget({ operation: "founder_operations_rows", durationMs: Date.now() - started, materialized: "hit", resultSize: rows.length, approxDocumentReads: players.size + pending.size });
  return rows;
}

export async function rebuildFounderAggregateFromSummaries(now = new Date()) {
  const [players, pending] = await Promise.all([
    getAdminDb().collection("founderPlayerSummaries").get(),
    getAdminDb().collection("founderPendingRequestSummaries").get(),
  ]);
  let aggregate = emptyAggregate(now);
  for (const document of players.docs) {
    const summary = document.data() as FounderPlayerSummary;
    if (summary.version !== FOUNDER_MATERIALIZED_VERSION) continue;
    aggregate = applyDelta(aggregate, zeroContribution(), contributionForSummary(summary), now);
  }
  aggregate = {
    ...aggregate,
    bootstrapComplete: true,
    revision: aggregate.revision + 1,
    generatedAt: now.toISOString(),
    attention: {
      ...aggregate.attention,
      newRequests: pending.docs.map((document) => document.data() as FounderPendingRequestSummary).filter((summary) => summary.version === FOUNDER_MATERIALIZED_VERSION && summary.active).length,
    },
  };
  await aggregateRef().set(clean(aggregate), { merge: false });
  return aggregate;
}

export function founderSummaryFromRow(input: {
  playerId: number;
  uid: string;
  row: FounderOperationsRow;
  originalReviews: number;
  liveReviews: number;
  historicalPeriods?: number;
  activationBaseline?: boolean;
  updatedAt?: string;
}): FounderPlayerSummary {
  const verifiedReviews = input.originalReviews + input.liveReviews;
  const retentionDepth = verifiedReviews + (input.activationBaseline && input.originalReviews === 0 ? 1 : 0);
  return {
    version: FOUNDER_MATERIALIZED_VERSION,
    playerId: String(input.playerId),
    uid: input.uid,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    active: input.row.accessStatus === "active",
    row: input.row,
    validation: {
      served: retentionDepth > 0 ? 1 : 0,
      verifiedReviews,
      originalReviews: input.originalReviews,
      liveReviews: input.liveReviews,
      historicalPeriods: Math.max(0, Number(input.historicalPeriods) || 0),
      originalToLive: input.originalReviews > 0 && input.liveReviews > 0 ? 1 : 0,
      retentionDepth,
    },
  };
}

export function founderPendingSummaryFromInput(input: {
  id: string;
  canonicalUsername?: string;
  chessPlayerId?: number;
  profileUrl?: string;
  preferredContactMethod?: string;
  preferredContactValue?: string;
  requestedAt?: string;
  status?: string;
}, now = new Date()): FounderPendingRequestSummary {
  const derived = deriveFounderOperation({ uid: `request:${input.id}`, username: input.canonicalUsername ?? "Pending player", preferredContactValue: input.preferredContactValue, pendingRequest: true, pendingRequestAt: input.requestedAt }, now);
  const row: FounderOperationsRow = {
    ...derived,
    uid: `request:${input.id}`,
    username: input.canonicalUsername ?? "Pending player",
    playerId: input.chessPlayerId,
    profileUrl: input.profileUrl ?? (input.canonicalUsername ? `https://www.chess.com/member/${encodeURIComponent(input.canonicalUsername)}` : undefined),
    reviewCount: 0,
    reviewPeriods: [],
    history: summarizeFounderHistoryVisibility(undefined),
    unreadReplies: 0,
    exceptionCount: 0,
    exceptionTitles: [],
    identityConflict: false,
    pendingRequest: true,
    pendingRequestId: input.id,
    forming: derived.forming,
    preferredContactMethod: input.preferredContactMethod,
    preferredContactValue: input.preferredContactValue,
  };
  return { version: FOUNDER_MATERIALIZED_VERSION, requestId: input.id, updatedAt: now.toISOString(), active: input.status === "pending", row };
}
