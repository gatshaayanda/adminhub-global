import "server-only";

import type { DocumentData } from "firebase-admin/firestore";
import type { BoardSignalAccount } from "../account";
import { storedReviewLifecycle, type ReviewHistoryBackfillState } from "../historyBackfill";
import {
  latestCompletedReviewPeriods,
  mergeReportPeriodTruth,
  mergeReviewPeriodResult,
  reportPeriodLabel,
  reviewHistoryCoverage,
  type CanonicalReportPeriod,
  type ReviewHistoryCoverage,
  type ReviewPeriodResult,
} from "../reviewPeriods";
import type { CompletedReviewHistoryItem } from "../reviewHistory";
import { getAdminDb } from "../../../utils/firebaseAdmin";
import { addReviewProductionFact, validReviewProductionStats, type ReviewProductionStats } from "../reviewProduction";
import { loadCompletedReviewHistory } from "./persistence";
import { logFirestoreReadBudget, noteFirestoreServiceFailure } from "./firestoreService";

export type RecentReportPeriodTruth = { periods: CanonicalReportPeriod[]; coverage: ReviewHistoryCoverage };
type AccountWithBackfill = BoardSignalAccount & { reviewHistoryBackfill?: ReviewHistoryBackfillState };
function ledgerRef(uid: string, periodStart: string) { return getAdminDb().collection("users").doc(uid).collection("reviewPeriods").doc(periodStart); }
function clean<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function validStoredResult(data: DocumentData | undefined): ReviewPeriodResult | undefined {
  if (!data || (data.outcome !== "review" && data.outcome !== "no_activity")) return undefined;
  const periodStart = String(data.periodStart ?? "");
  const periodEnd = String(data.periodEnd ?? "");
  if (!periodStart || !periodEnd) return undefined;
  return { periodStart, periodEnd, periodLabel: String(data.periodLabel ?? reportPeriodLabel(periodStart, periodEnd)), outcome: data.outcome, reviewKey: typeof data.reviewKey === "string" ? data.reviewKey : undefined, reviewLifecycle: storedReviewLifecycle(data), evaluatedAt: typeof data.evaluatedAt === "string" ? data.evaluatedAt : new Date(0).toISOString() };
}
function reconstructedBackfillResults(account: AccountWithBackfill, targets: CanonicalReportPeriod[], now: Date) {
  const allowed = new Set(targets.map((period) => period.periodStart));
  return Object.entries(account.reviewHistoryBackfill?.evaluated ?? {}).flatMap(([periodStart, evaluation]) => {
    if (!allowed.has(periodStart) || !evaluation || (evaluation.status !== "published" && evaluation.status !== "no_activity")) return [];
    const target = targets.find((period) => period.periodStart === periodStart)!;
    return [{ ...target, outcome: evaluation.status === "no_activity" ? "no_activity" as const : "review" as const, reviewLifecycle: "historical_backfill" as const, evaluatedAt: evaluation.evaluatedAt || account.reviewHistoryBackfill?.lastAttemptAt || now.toISOString() } satisfies ReviewPeriodResult];
  });
}

export async function loadRecentReportPeriodTruth(
  account: AccountWithBackfill,
  now = new Date(),
  persistCompatibility = true,
  completedReviewHistory?: CompletedReviewHistoryItem[],
): Promise<RecentReportPeriodTruth> {
  const started = Date.now();
  if (!account.cadenceAnchor) return { periods: [], coverage: { evaluatedCount: 0, totalCount: 0 } };
  const targets = latestCompletedReviewPeriods(account.cadenceAnchor, now);
  if (!targets.length) return { periods: [], coverage: { evaluatedCount: 0, totalCount: 0 } };
  const db = getAdminDb();
  try {
    const snapshots = await db.getAll(...targets.map((period) => ledgerRef(account.uid, period.periodStart)));
    const ledger = snapshots.flatMap((snapshot) => { const result = validStoredResult(snapshot.data()); return result ? [result] : []; });
    const known = new Map(ledger.map((item) => [item.periodStart, item]));

    // If all canonical slots already have durable outcomes, do not reload Review history merely to re-prove them.
    if (targets.every((period) => known.has(period.periodStart))) {
      const periods = mergeReportPeriodTruth(targets, known.values());
      logFirestoreReadBudget({ operation: "review_period_truth", durationMs: Date.now() - started, materialized: "hit", resultSize: periods.length, approxDocumentReads: targets.length });
      return { periods, coverage: reviewHistoryCoverage(periods) };
    }

    const history = completedReviewHistory ?? await loadCompletedReviewHistory(account.uid);
    for (const review of history) {
      if (known.has(review.periodStart) || !targets.some((period) => period.periodStart === review.periodStart)) continue;
      known.set(review.periodStart, { periodStart: review.periodStart, periodEnd: review.periodEnd, periodLabel: review.periodLabel, outcome: "review", reviewKey: review.reviewKey, reviewLifecycle: review.reviewLifecycle, evaluatedAt: now.toISOString() });
    }
    for (const result of reconstructedBackfillResults(account, targets, now)) if (!known.has(result.periodStart)) known.set(result.periodStart, result);

    if (persistCompatibility) {
      const missingOnDisk = Array.from(known.values()).filter((item) => !ledger.some((existing) => existing.periodStart === item.periodStart));
      if (missingOnDisk.length) {
        const batch = db.batch();
        for (const result of missingOnDisk) batch.set(ledgerRef(account.uid, result.periodStart), clean(result), { merge: false });
        await batch.commit();
      }
    }
    const periods = mergeReportPeriodTruth(targets, known.values());
    logFirestoreReadBudget({ operation: "review_period_truth", durationMs: Date.now() - started, materialized: completedReviewHistory ? "hit" : "miss", resultSize: periods.length, approxDocumentReads: targets.length + (completedReviewHistory ? 0 : Math.min(4, history.length)) });
    return { periods, coverage: reviewHistoryCoverage(periods) };
  } catch (error) {
    const failure = noteFirestoreServiceFailure(error);
    logFirestoreReadBudget({ operation: "review_period_truth", durationMs: Date.now() - started, failure: failure?.kind });
    throw error;
  }
}

export async function recordReviewPeriodResult(uid: string, result: ReviewPeriodResult): Promise<ReviewProductionStats | undefined> {
  const db = getAdminDb();
  const ref = ledgerRef(uid, result.periodStart);
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async (transaction) => {
    const [snapshot, userSnapshot] = await Promise.all([transaction.get(ref), transaction.get(userRef)]);
    const existingData = snapshot.data() as (Partial<ReviewPeriodResult> & Record<string, unknown>) | undefined;
    const existing = validStoredResult(existingData);
    const currentProduction = validReviewProductionStats(userSnapshot.data()?.reviewProduction);

    if (existing?.outcome === "review" && result.outcome === "no_activity") return currentProduction;

    const merged = mergeReviewPeriodResult(existingData, result);
    transaction.set(ref, clean(merged), { merge: false });

    if (result.outcome !== "review" || existing?.outcome === "review") return currentProduction;

    const lifecycle = result.reviewLifecycle ?? "organic_live";
    const nextProduction = addReviewProductionFact(
      currentProduction,
      { periodStart: result.periodStart, reviewLifecycle: lifecycle },
      new Date(result.evaluatedAt),
    );
    transaction.set(userRef, { reviewProduction: clean(nextProduction) }, { merge: true });
    return nextProduction;
  });
}
