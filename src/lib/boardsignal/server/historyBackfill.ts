import "server-only";

import { randomBytes } from "node:crypto";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  REVIEW_HISTORY_BACKFILL_VERSION,
  REVIEW_HISTORY_LEASE_MS,
  backfillComplete,
  evaluatedBackfillSlots,
  historicalSettlementDecision,
  leaseIsActive,
  nextBackfillPeriod,
  resumableHistoricalBackfillWork,
  type HistoricalBackfillWork,
  type HistoricalReviewEvaluation,
  type HistoricalReviewPeriod,
  type ReviewHistoryBackfillState,
} from "../historyBackfill";
import { hasAcceptedCurrentBetaAgreement, type BoardSignalAccount } from "../account";
import { latestCompletedReviewPeriods, mergeReviewPeriodResult, reportPeriodLabel, type ReviewPeriodResult } from "../reviewPeriods";
import { getAdminDb } from "../../../utils/firebaseAdmin";
import { accountForToken, loadCompletedReviewHistory } from "./persistence";
import { loadRecentReportPeriodTruth } from "./reviewPeriods";
import { logFirestoreReadBudget, noteFirestoreServiceFailure } from "./firestoreService";

function clean<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function isoNow(now = new Date()) { return now.toISOString(); }
type AccountWithBackfill = BoardSignalAccount & { reviewHistoryBackfill?: ReviewHistoryBackfillState };
function eligibleForBackfill(account: BoardSignalAccount) { return hasAcceptedCurrentBetaAgreement(account) && Boolean(account.preferencesConfirmedAt) && account.accessStatus === "active" && account.role === "player"; }
function targetsFor(account: BoardSignalAccount, now: Date): HistoricalReviewPeriod[] { return account.cadenceAnchor ? latestCompletedReviewPeriods(account.cadenceAnchor, now).map((period) => ({ start: period.periodStart, end: period.periodEnd })) : []; }
function sameTargets(a: HistoricalReviewPeriod[] = [], b: HistoricalReviewPeriod[] = []) { return a.length === b.length && a.every((period, index) => period.start === b[index]?.start && period.end === b[index]?.end); }
function stateForTargets(previous: ReviewHistoryBackfillState | undefined, targets: HistoricalReviewPeriod[], now: Date): ReviewHistoryBackfillState {
  const allowed = new Set(targets.map((period) => period.start));
  const evaluated = Object.fromEntries(Object.entries(previous?.evaluated ?? {}).filter(([start]) => allowed.has(start)));
  const keepLease = previous?.lease && allowed.has(previous.lease.periodStart) && leaseIsActive(previous.lease, now) ? previous.lease : undefined;
  return { version: REVIEW_HISTORY_BACKFILL_VERSION, status: "pending", targetPeriods: targets, evaluated, lease: keepLease, activationBaseline: previous?.activationBaseline ?? false, establishedAt: previous?.establishedAt ?? isoNow(now), lastAttemptAt: previous?.lastAttemptAt, lastError: previous?.lastError };
}

export async function claimHistoricalBackfillWork(token: DecodedIdToken, now = new Date(), preloadedAccount?: AccountWithBackfill): Promise<HistoricalBackfillWork | undefined> {
  const started = Date.now();
  try {
    const account = preloadedAccount ?? await accountForToken(token) as AccountWithBackfill;
    if (!eligibleForBackfill(account) || !account.cadenceAnchor) return undefined;
    const targets = targetsFor(account, now);
    if (!targets.length) return undefined;
    const establishedHistory = await loadCompletedReviewHistory(account.uid);
    // Empty completed Review history is valid: durable period truth still decides which canonical slots need recovery.
    // G.4.2: reuse this exact already-loaded history while reconstructing any missing ledger slots.
    const truth = await loadRecentReportPeriodTruth(account, now, true, establishedHistory);
    const evaluatedFromLedger: Record<string, HistoricalReviewEvaluation> = Object.fromEntries(truth.periods.flatMap((period) => period.outcome ? [[period.periodStart, { status: period.outcome === "review" ? "existing" : "no_activity", evaluatedAt: period.evaluatedAt ?? isoNow(now) } satisfies HistoricalReviewEvaluation]] : []));
    const existingStarts = truth.periods.filter((period) => period.outcome === "review").map((period) => period.periodStart);
    const db = getAdminDb();
    const accountRef = db.collection("users").doc(account.uid);
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(accountRef);
      if (!snapshot.exists) return undefined;
      const fresh = snapshot.data() as AccountWithBackfill;
      const persistedState = fresh.reviewHistoryBackfill;
      const persistedActiveLease = leaseIsActive(persistedState?.lease, now) ? persistedState?.lease : undefined;
      // An active claim that no longer maps to the current completed target window is anomalous.
      // Do not replace it with different work; stale lease expiry/retry semantics remain authoritative.
      if (persistedActiveLease && !targets.some((period) => period.start === persistedActiveLease.periodStart)) return undefined;
      let state = persistedState;
      if (!state || state.version !== REVIEW_HISTORY_BACKFILL_VERSION || !sameTargets(state.targetPeriods, targets)) state = stateForTargets(state, targets, now);
      else if (!leaseIsActive(state.lease, now)) state = { ...state, lease: undefined };
      state = { ...state, evaluated: { ...(state.evaluated ?? {}), ...evaluatedFromLedger } };
      if (backfillComplete(targets, state.evaluated, existingStarts)) {
        transaction.set(accountRef, clean({ reviewHistoryBackfill: { ...state, status: "complete" as const, lease: undefined, completedAt: isoNow(now), lastError: undefined } }), { merge: true });
        return undefined;
      }
      if (persistedActiveLease) {
        return resumableHistoricalBackfillWork(
          targets,
          { lease: persistedActiveLease, evaluated: state.evaluated },
          account.cadenceAnchor!,
          existingStarts,
          now,
        );
      }
      if (leaseIsActive(state.lease, now)) return undefined;
      const target = nextBackfillPeriod(targets, state.evaluated, existingStarts);
      if (!target) return undefined;
      const leaseId = randomBytes(16).toString("hex");
      const claimedAt = isoNow(now);
      const leaseUntil = new Date(now.getTime() + REVIEW_HISTORY_LEASE_MS).toISOString();
      state = { ...state, status: "pending", lease: { periodStart: target.start, leaseId, claimedAt, leaseUntil }, completedAt: undefined, lastAttemptAt: claimedAt, lastError: undefined };
      transaction.set(accountRef, clean({ reviewHistoryBackfill: state }), { merge: true });
      return { periodStart: target.start, periodEnd: target.end, requestCadenceAnchor: account.cadenceAnchor!, leaseId, completedSlots: evaluatedBackfillSlots(targets, state.evaluated, existingStarts), totalSlots: targets.length };
    });
    logFirestoreReadBudget({ operation: "history_claim", durationMs: Date.now() - started, resultSize: result ? 1 : 0, approxDocumentReads: 1 + Math.min(4, establishedHistory.length) + Math.min(4, targets.length) + 1 });
    return result;
  } catch (error) {
    const failure = noteFirestoreServiceFailure(error);
    logFirestoreReadBudget({ operation: "history_claim", durationMs: Date.now() - started, failure: failure?.kind });
    throw error;
  }
}

export async function markHistoricalBackfillSlot(token: DecodedIdToken, input: { leaseId: string; periodStart: string; status: "no_activity" | "published" }, now = new Date()) {
  const started = Date.now();
  const account = await accountForToken(token) as AccountWithBackfill;
  const db = getAdminDb();
  const accountRef = db.collection("users").doc(account.uid);
  const periodRef = db.collection("users").doc(account.uid).collection("reviewPeriods").doc(input.periodStart);
  const targets = targetsFor(account, now);
  const state = await db.runTransaction(async (transaction) => {
    const [snapshot, periodSnapshot] = await Promise.all([transaction.get(accountRef), transaction.get(periodRef)]);
    if (!snapshot.exists) throw Object.assign(new Error("BoardSignal account not found."), { status: 404 });
    const fresh = snapshot.data() as AccountWithBackfill;
    let nextState = fresh.reviewHistoryBackfill;
    const existingData = periodSnapshot.data() as (Partial<ReviewPeriodResult> & Record<string, unknown>) | undefined;
    const durableOutcome = existingData?.outcome === "review" || existingData?.outcome === "no_activity" ? existingData.outcome : undefined;
    const settlementDecision = historicalSettlementDecision(nextState, input, durableOutcome);
    // A repeated successful settlement is a server-side no-op. Returning before any write also
    // guarantees that a newer active lease cannot be cleared by a late replay from older work.
    if (settlementDecision === "already_evaluated") return nextState;
    if (!nextState || nextState.version !== REVIEW_HISTORY_BACKFILL_VERSION) throw Object.assign(new Error("Historical Review state is not active."), { status: 409 });
    if (settlementDecision === "stale") throw Object.assign(new Error("Historical Review claim is no longer active."), { status: 409, code: "HISTORY_LEASE_MISMATCH" });
    const target = targets.find((period) => period.start === input.periodStart) ?? nextState.targetPeriods.find((period) => period.start === input.periodStart);
    if (!target) throw Object.assign(new Error("Historical Review period is no longer in the recent cadence window."), { status: 409 });
    const outcome = input.status === "published" ? "review" : "no_activity";
    const result: ReviewPeriodResult = { periodStart: target.start, periodEnd: target.end, periodLabel: reportPeriodLabel(target.start, target.end), outcome, reviewLifecycle: outcome === "review" ? "historical_backfill" : undefined, evaluatedAt: isoNow(now) };
    if (!(existingData?.outcome === "review" && outcome === "no_activity")) transaction.set(periodRef, clean(mergeReviewPeriodResult(existingData, result)), { merge: false });
    const evaluated: Record<string, HistoricalReviewEvaluation> = { ...(nextState.evaluated ?? {}), [input.periodStart]: { status: input.status, evaluatedAt: isoNow(now) } };
    const nextTargets = targets.length ? targets : nextState.targetPeriods;
    const complete = backfillComplete(nextTargets, evaluated);
    nextState = { ...nextState, targetPeriods: nextTargets, evaluated, lease: undefined, status: complete ? "complete" : "pending", ...(complete ? { completedAt: isoNow(now) } : { completedAt: undefined }), lastError: undefined };
    transaction.set(accountRef, clean({ reviewHistoryBackfill: nextState }), { merge: true });
    return nextState;
  });
  // Founder materialization is private derived state; failure never rolls back authoritative chronology.
  await import("./founderOperations").then(({ refreshFounderPlayerSummaryByUid }) => refreshFounderPlayerSummaryByUid(account.uid, now)).catch(() => undefined);
  logFirestoreReadBudget({ operation: "history_settle", durationMs: Date.now() - started, resultSize: 1, approxDocumentReads: 3 });
  return state;
}

export async function markHistoricalBackfillRetryable(token: DecodedIdToken, input: { leaseId: string; periodStart: string; error?: string }, now = new Date()) {
  const account = await accountForToken(token);
  const ref = getAdminDb().collection("users").doc(account.uid);
  return getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const state = snapshot.data()?.reviewHistoryBackfill as ReviewHistoryBackfillState | undefined;
    if (!state || !state.lease || state.lease.leaseId !== input.leaseId || state.lease.periodStart !== input.periodStart) return state;
    const next: ReviewHistoryBackfillState = { ...state, status: "retryable", lease: undefined, lastAttemptAt: isoNow(now), lastError: String(input.error ?? "Historical Review preparation failed.").slice(0, 300) };
    transaction.set(ref, clean({ reviewHistoryBackfill: next }), { merge: true });
    return next;
  });
}
