import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import type { BoardSignalAccount, BoardSignalFounderContactMethod } from "../account";
import {
  deriveFounderOperation,
  summarizeFounderHistoryVisibility,
} from "../founderOperationsLogic";
import { storedReviewLifecycle, type ReviewHistoryBackfillState } from "../historyBackfill";
import { latestOfficialChessStatePeriod, type CanonicalReportPeriod } from "../reviewPeriods";
import type { CompletedReviewHistoryItem } from "../reviewHistory";
import { getAdminDb } from "../../../utils/firebaseAdmin";
import { loadRecentReportPeriodTruth } from "./reviewPeriods";
import {
  FOUNDER_MATERIALIZED_VERSION,
  founderPendingSummaryFromInput,
  founderSummaryFromRow,
  loadFounderOperationRows,
  loadFounderOperationsAggregate,
  rebuildFounderAggregateFromSummaries,
  upsertFounderPendingRequestSummary,
  upsertFounderPlayerSummary,
  type FounderOperationsRow,
} from "./founderMaterialized";

const MAX_ACTIVE_REVIEWS = 4;
const FOUNDER_BOOTSTRAP_LEASE_MS = 60_000;

type OriginalBetaMarker = { periodStart?: string; periodEnd?: string; retiredAt?: string };
type OperationsAccount = BoardSignalAccount & {
  originalBetaPlayer?: boolean;
  originalBetaHistoryPeriods?: Record<string, OriginalBetaMarker>;
  reviewHistoryBackfill?: ReviewHistoryBackfillState;
};
type StoredReview = {
  deskKey?: string;
  periodEnd?: string;
  publishedAt?: string;
  importedAt?: string;
  reviewLifecycle?: "organic_live" | "historical_backfill" | "original_beta";
  countsTowardRetention?: boolean;
  summary?: { deskKey?: string; periodStart?: string; periodEnd?: string; periodLabel?: string };
  desk?: { source?: string; provenance?: { verified?: boolean } };
  originalBeta?: { seedHandle?: string; history?: CompletedReviewHistoryItem };
};
type PendingRequest = { id: string; chessPlayerId?: number; canonicalUsername?: string; preferredContactMethod?: string; preferredContactValue?: string; requestedAt?: string; status?: string; profileUrl?: string };
type ReviewPeriod = { periodStart: string; periodEnd: string; periodLabel?: string; source: "original" | "live" | "historical" };

function clean<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function normalize(value?: string) { return String(value ?? "").trim().replace(/^@/, "").toLowerCase(); }
function identityConflict(account: OperationsAccount) { return account.identityStatus === "revoked" || account.identityReviewStatus === "rejected"; }
function cadenceWeekForming(account: OperationsAccount) { return account.accessStatus === "active" && Boolean(account.cadenceAnchor); }
function historicalPublishedPeriods(account: OperationsAccount) {
  return Object.values(account.reviewHistoryBackfill?.evaluated ?? {}).filter((evaluation) => evaluation?.status === "published").length;
}
function validPeriod(data: StoredReview): ReviewPeriod | undefined {
  const history = data.originalBeta?.history;
  const start = history?.periodStart ?? data.summary?.periodStart;
  const end = history?.periodEnd ?? data.summary?.periodEnd ?? data.periodEnd;
  if (!start || !end) return undefined;
  const lifecycle = storedReviewLifecycle(data);
  const source = history ? "original" as const : lifecycle === "historical_backfill" ? "historical" as const : lifecycle === "organic_live" ? "live" as const : undefined;
  return source ? { periodStart: start, periodEnd: end, periodLabel: history?.periodLabel ?? data.summary?.periodLabel, source } : undefined;
}

function historyItemFromStored(documentId: string, data: StoredReview): CompletedReviewHistoryItem | undefined {
  if (data.originalBeta?.history) return { ...data.originalBeta.history, reviewKey: String(data.originalBeta.history.reviewKey ?? documentId), reviewLifecycle: "original_beta" };
  return undefined;
}

async function sourcePlayerSummary(account: OperationsAccount, now = new Date()) {
  const db = getAdminDb();
  const desksSnapshot = await db.collection("users").doc(account.uid).collection("desks").orderBy("periodEnd", "desc").limit(MAX_ACTIVE_REVIEWS).get();
  const documents = desksSnapshot.docs.map((document) => ({ id: document.id, data: document.data() as StoredReview }));
  const periods = documents.flatMap(({ data }) => { const period = validPeriod(data); return period ? [period] : []; });
  const nonHistorical = periods.filter((period) => period.source !== "historical").map((period) => ({ ...period, source: period.source as "original" | "live" }));
  const latestNonHistorical = documents.flatMap(({ data }) => {
    const period = validPeriod(data);
    return period && period.source !== "historical" ? [{ data, period }] : [];
  })[0];
  const originalHistory = documents.flatMap(({ id, data }) => { const item = historyItemFromStored(id, data); return item ? [item] : []; });
  const liveHistory = documents.flatMap(({ id, data }) => {
    const period = validPeriod(data);
    if (!period || period.source === "historical" || data.originalBeta?.history) return [];
    return [{ reviewKey: String(data.deskKey ?? id), periodStart: period.periodStart, periodEnd: period.periodEnd, periodLabel: period.periodLabel ?? `${period.periodStart} → ${period.periodEnd}`, reviewLifecycle: "organic_live" as const, source: "live" as const } as CompletedReviewHistoryItem];
  });
  const completedHistory = [...originalHistory, ...liveHistory].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));

  const [unread, coverage, reportTruth, exceptions] = await Promise.all([
    db.collection("users").doc(account.uid).collection("conversations").where("unreadForFounder", "==", true).get().catch(() => ({ size: 0, docs: [] })),
    db.collection("publicCoverage").where("chessPlayerId", "==", String(account.chessCom.playerId)).get().catch(() => ({ size: 0 })),
    loadRecentReportPeriodTruth(account, now, false, completedHistory).catch(() => ({ periods: [] as CanonicalReportPeriod[], coverage: { evaluatedCount: 0, totalCount: 0 } })),
    db.collection("exceptions").where("uid", "==", account.uid).limit(20).get().catch(() => ({ docs: [] })),
  ]);
  const activeExceptions = (exceptions as { docs: Array<{ data(): { title?: string; message?: string; resolvedAt?: string; createdAt?: string } }> }).docs.map((document) => document.data()).filter((item) => !item.resolvedAt);
  const latestReview = latestNonHistorical ? { deskKey: latestNonHistorical.data.deskKey, periodStart: latestNonHistorical.period.periodStart, periodEnd: latestNonHistorical.period.periodEnd, periodLabel: latestNonHistorical.period.periodLabel, publishedAt: latestNonHistorical.data.publishedAt } : undefined;
  const unreadReplies = Number((unread as { size?: number }).size ?? 0);
  const publicHighlightsStatus = account.identityStatus === "provisional" ? "waiting_identity_review" : periods.length === 0 ? "no_completed_review" : Number((coverage as { size?: number }).size ?? 0) > 0 ? "live" : "repair_needed";
  const derived = deriveFounderOperation({
    uid: account.uid,
    username: account.chessCom.canonicalUsername,
    preferredContactValue: account.preferredContactValue,
    lastSeenAt: account.lastSeenAt,
    nextDeskDueAt: account.nextDeskDueAt ?? account.currentEpisodeSummary?.nextDeskDueAt,
    forming: cadenceWeekForming(account),
    latestReview,
    unreadReplies,
    unreadReplyAt: (unread as { docs?: Array<{ data(): { updatedAt?: string } }> }).docs?.map((document) => document.data().updatedAt).filter((value): value is string => Boolean(value)).sort()[0],
    exceptionAt: activeExceptions.map((item) => item.createdAt).filter((value): value is string => Boolean(value)).sort()[0],
    exceptionCount: activeExceptions.length,
    identityConflict: identityConflict(account),
    founderOps: account.founderOps,
  }, now);
  const officialChessState = latestOfficialChessStatePeriod(periods);
  const row: FounderOperationsRow = {
    ...derived,
    uid: account.uid,
    username: account.chessCom.canonicalUsername,
    playerId: account.chessCom.playerId,
    profileUrl: account.chessCom.profileUrl || `https://www.chess.com/member/${encodeURIComponent(account.chessCom.canonicalUsername)}`,
    avatar: account.chessCom.avatar,
    reviewCount: nonHistorical.length,
    reviewPeriods: nonHistorical,
    history: summarizeFounderHistoryVisibility(account.reviewHistoryBackfill, periods.map((period) => period.periodStart)),
    latestReview,
    latestReportPeriod: reportTruth.periods.at(-1),
    recentReportPeriods: reportTruth.periods,
    historyCoverage: reportTruth.coverage,
    officialChessStatePeriod: officialChessState ? { periodStart: officialChessState.periodStart, periodEnd: officialChessState.periodEnd, periodLabel: officialChessState.periodLabel } : undefined,
    nextDeskDueAt: account.nextDeskDueAt ?? account.currentEpisodeSummary?.nextDeskDueAt,
    lastSeenAt: account.lastSeenAt,
    unreadReplies,
    exceptionCount: activeExceptions.length,
    exceptionTitles: activeExceptions.map((item) => item.title ?? item.message ?? "BoardSignal exception"),
    identityConflict: identityConflict(account),
    pendingRequest: false,
    forming: derived.forming,
    preferredContactMethod: account.preferredContactMethod,
    preferredContactValue: account.preferredContactValue,
    accountStatus: account.accessStatus,
    accessStatus: account.accessStatus,
    identityStatus: account.identityStatus,
    identityReviewStatus: account.identityReviewStatus,
    publicHighlightsStatus,
    lastContactedAt: account.founderOps?.lastContactedAt,
    lastContactMethod: account.founderOps?.lastContactMethod,
    followUpSnoozedUntil: account.founderOps?.followUpSnoozedUntil,
  };
  const originalReviews = Math.max(
    nonHistorical.filter((period) => period.source === "original").length,
    Object.keys(account.originalBetaHistoryPeriods ?? {}).length,
    account.originalBetaPlayer ? 1 : 0,
  );
  const liveReviews = Math.max(
    account.reviewProduction?.organicLiveReviews ?? 0,
    nonHistorical.filter((period) => period.source === "live").length,
  );
  const historicalPeriods = Math.max(
    account.reviewProduction?.historicalBackfillReviews ?? 0,
    historicalPublishedPeriods(account),
  );
  return founderSummaryFromRow({
    playerId: account.chessCom.playerId,
    uid: account.uid,
    row,
    originalReviews,
    liveReviews,
    historicalPeriods,
    reviewProduction: account.reviewProduction,
    activationBaseline: account.reviewHistoryBackfill?.activationBaseline === true,
    updatedAt: now.toISOString(),
  });
}

export async function refreshFounderPlayerSummary(account: OperationsAccount, now = new Date()) {
  if (account.role !== "player") return;
  const summary = await sourcePlayerSummary(account, now);
  await upsertFounderPlayerSummary(summary, now);
  return summary;
}

export async function refreshFounderPlayerSummaryByUid(uid: string, now = new Date()) {
  const snapshot = await getAdminDb().collection("users").doc(uid).get();
  if (!snapshot.exists) return;
  return refreshFounderPlayerSummary(snapshot.data() as OperationsAccount, now);
}

function bootstrapLeaseRef() { return getAdminDb().collection("founderOperationsState").doc("bootstrapLease"); }
async function acquireBootstrapLease(now = new Date()) {
  const db = getAdminDb();
  return db.runTransaction(async (transaction) => {
    const [current, lease] = await Promise.all([transaction.get(db.collection("founderOperationsState").doc("current")), transaction.get(bootstrapLeaseRef())]);
    if (current.exists && current.data()?.version === FOUNDER_MATERIALIZED_VERSION && current.data()?.bootstrapComplete === true) return false;
    const data = lease.data() as { leaseUntil?: string } | undefined;
    if (data?.leaseUntil && data.leaseUntil > now.toISOString()) return false;
    transaction.set(bootstrapLeaseRef(), { leaseUntil: new Date(now.getTime() + FOUNDER_BOOTSTRAP_LEASE_MS).toISOString(), startedAt: now.toISOString() }, { merge: false });
    return true;
  });
}

async function bootstrapFounderMaterialization(now = new Date()) {
  if (!await acquireBootstrapLease(now)) return undefined;
  try {
    const db = getAdminDb();
    const [users, requests] = await Promise.all([db.collection("users").get(), db.collection("betaRequests").get()]);
    const accounts = users.docs.map((document) => document.data() as OperationsAccount).filter((account) => account.role === "player");
    for (const account of accounts) await refreshFounderPlayerSummary(account, now);
    for (const document of requests.docs) {
      const request = { id: document.id, ...document.data() } as PendingRequest;
      if (request.status === "pending") await upsertFounderPendingRequestSummary(founderPendingSummaryFromInput(request, now), now);
    }
    const aggregate = await rebuildFounderAggregateFromSummaries(now);
    await bootstrapLeaseRef().delete().catch(() => undefined);
    return aggregate;
  } catch (error) {
    await bootstrapLeaseRef().delete().catch(() => undefined);
    throw error;
  }
}

export async function founderOperationsSnapshot(now = new Date(), includeRows = false) {
  let aggregate = await loadFounderOperationsAggregate(now);
  if (!aggregate) {
    aggregate = await bootstrapFounderMaterialization(now);
    if (!aggregate) throw Object.assign(new Error("Founder operations are being prepared. Try again shortly."), { status: 503, code: "FOUNDER_OPERATIONS_BOOTSTRAPPING", retryAfterSeconds: 5 });
  }
  return { ...aggregate, rows: includeRows ? await loadFounderOperationRows() : [] };
}

async function accountForFounderOps(uidInput: unknown) {
  const uid = String(uidInput ?? "").trim();
  if (!uid || uid.startsWith("request:") || uid.includes("/")) throw Object.assign(new Error("A valid BoardSignal player is required."), { status: 400 });
  const ref = getAdminDb().collection("users").doc(uid);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw Object.assign(new Error("The BoardSignal player account was not found."), { status: 404 });
  const account = snapshot.data() as OperationsAccount;
  if (account.role !== "player") throw Object.assign(new Error("The BoardSignal player account was not found."), { status: 404 });
  return { ref, account };
}

export async function markFounderContacted(uidInput: unknown, methodInput: unknown, now = new Date()) {
  const method = String(methodInput ?? "") as BoardSignalFounderContactMethod;
  if (!["email", "discord", "telegram", "chesscom", "other"].includes(method)) throw Object.assign(new Error("Choose a valid contact method."), { status: 400 });
  const { ref, account } = await accountForFounderOps(uidInput);
  const founderOps = { ...(account.founderOps ?? {}), lastContactedAt: now.toISOString(), lastContactMethod: method };
  await ref.set({ founderOps }, { merge: true });
  await refreshFounderPlayerSummary({ ...account, founderOps }, now);
  return founderOps;
}

export async function snoozeFounderFollowUp(uidInput: unknown, daysInput: unknown, now = new Date()) {
  const days = Number(daysInput);
  if (![1, 3, 7].includes(days)) throw Object.assign(new Error("Choose a 1, 3, or 7 day snooze."), { status: 400 });
  const { ref, account } = await accountForFounderOps(uidInput);
  const founderOps = { ...(account.founderOps ?? {}), followUpSnoozedUntil: new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString() };
  await ref.set({ founderOps }, { merge: true });
  await refreshFounderPlayerSummary({ ...account, founderOps }, now);
  return founderOps;
}

export async function clearFounderFollowUpSnooze(uidInput: unknown, now = new Date()) {
  const { ref, account } = await accountForFounderOps(uidInput);
  await ref.update({ "founderOps.followUpSnoozedUntil": FieldValue.delete() });
  const founderOps = { ...(account.founderOps ?? {}) };
  delete founderOps.followUpSnoozedUntil;
  await refreshFounderPlayerSummary({ ...account, founderOps }, now);
  return { cleared: true };
}

export function normalizeFounderUsername(value?: string) { return normalize(value); }
