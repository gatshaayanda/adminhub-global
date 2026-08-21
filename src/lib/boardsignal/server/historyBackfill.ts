import "server-only";

import { randomBytes } from "node:crypto";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  REVIEW_HISTORY_BACKFILL_VERSION,
  REVIEW_HISTORY_LEASE_MS,
  backfillComplete,
  evaluatedBackfillSlots,
  fourPeriodWindow,
  leaseIsActive,
  nextBackfillPeriod,
  type HistoricalBackfillWork,
  type HistoricalReviewEvaluation,
  type ReviewHistoryBackfillState,
} from "../historyBackfill";
import { hasAcceptedCurrentBetaAgreement, type BoardSignalAccount } from "../account";
import { getAdminDb } from "../../../utils/firebaseAdmin";
import { accountForToken, loadCompletedReviewHistory } from "./persistence";

function clean<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function isoNow(now = new Date()) { return now.toISOString(); }

type AccountWithBackfill = BoardSignalAccount & { reviewHistoryBackfill?: ReviewHistoryBackfillState };

function eligibleForBackfill(account: BoardSignalAccount) {
  return hasAcceptedCurrentBetaAgreement(account)
    && Boolean(account.preferencesConfirmedAt)
    && account.accessStatus === "active"
    && account.role === "player";
}

function initialState(latestPeriodStart: string, now = new Date()): ReviewHistoryBackfillState {
  return {
    version: REVIEW_HISTORY_BACKFILL_VERSION,
    status: "pending",
    targetPeriods: fourPeriodWindow(latestPeriodStart),
    evaluated: {},
    establishedAt: isoNow(now),
  };
}

export async function claimHistoricalBackfillWork(token: DecodedIdToken, now = new Date()): Promise<HistoricalBackfillWork | undefined> {
  const account = await accountForToken(token);
  if (!eligibleForBackfill(account)) return undefined;
  const history = await loadCompletedReviewHistory(account.uid);
  if (!history.length || !account.cadenceAnchor) return undefined;

  const latestPeriodStart = [...history].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0].periodStart;
  const existingStarts = history.map((review) => review.periodStart);
  const db = getAdminDb();
  const accountRef = db.collection("users").doc(account.uid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(accountRef);
    if (!snapshot.exists) return undefined;
    const fresh = snapshot.data() as AccountWithBackfill;
    let state = fresh.reviewHistoryBackfill;
    if (!state || state.version !== REVIEW_HISTORY_BACKFILL_VERSION || !state.targetPeriods?.length) {
      state = initialState(latestPeriodStart, now);
    }

    if (backfillComplete(state.targetPeriods, state.evaluated, existingStarts)) {
      if (state.status !== "complete") {
        state = { ...state, status: "complete", lease: undefined, completedAt: isoNow(now), lastError: undefined };
        transaction.set(accountRef, clean({ reviewHistoryBackfill: state }), { merge: true });
      }
      return undefined;
    }

    if (leaseIsActive(state.lease, now)) return undefined;
    const target = nextBackfillPeriod(state.targetPeriods, state.evaluated, existingStarts);
    if (!target) return undefined;
    const leaseId = randomBytes(16).toString("hex");
    const claimedAt = isoNow(now);
    const leaseUntil = new Date(now.getTime() + REVIEW_HISTORY_LEASE_MS).toISOString();
    state = {
      ...state,
      status: "pending",
      lease: { periodStart: target.start, leaseId, claimedAt, leaseUntil },
      lastAttemptAt: claimedAt,
      lastError: undefined,
    };
    transaction.set(accountRef, clean({ reviewHistoryBackfill: state }), { merge: true });
    return {
      periodStart: target.start,
      periodEnd: target.end,
      requestCadenceAnchor: account.cadenceAnchor!,
      leaseId,
      completedSlots: evaluatedBackfillSlots(state.targetPeriods, state.evaluated, existingStarts),
      totalSlots: state.targetPeriods.length,
    };
  });
}

export async function markHistoricalBackfillSlot(
  token: DecodedIdToken,
  input: { leaseId: string; periodStart: string; status: "no_activity" | "published" },
  now = new Date(),
) {
  const account = await accountForToken(token);
  const db = getAdminDb();
  const accountRef = db.collection("users").doc(account.uid);
  const history = await loadCompletedReviewHistory(account.uid);
  const existingStarts = history.map((review) => review.periodStart);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(accountRef);
    if (!snapshot.exists) throw Object.assign(new Error("BoardSignal account not found."), { status: 404 });
    const fresh = snapshot.data() as AccountWithBackfill;
    const state = fresh.reviewHistoryBackfill;
    if (!state || state.version !== REVIEW_HISTORY_BACKFILL_VERSION) throw Object.assign(new Error("Historical Review state is not active."), { status: 409 });
    if (!state.lease || state.lease.leaseId !== input.leaseId || state.lease.periodStart !== input.periodStart) {
      throw Object.assign(new Error("Historical Review claim is no longer active."), { status: 409, code: "HISTORY_LEASE_MISMATCH" });
    }
    const evaluated: Record<string, HistoricalReviewEvaluation> = {
      ...(state.evaluated ?? {}),
      [input.periodStart]: { status: input.status, evaluatedAt: isoNow(now) },
    };
    const complete = backfillComplete(state.targetPeriods, evaluated, existingStarts);
    const next: ReviewHistoryBackfillState = {
      ...state,
      evaluated,
      lease: undefined,
      status: complete ? "complete" : "pending",
      ...(complete ? { completedAt: isoNow(now) } : {}),
      lastError: undefined,
    };
    transaction.set(accountRef, clean({ reviewHistoryBackfill: next }), { merge: true });
    return next;
  });
}

export async function markHistoricalBackfillRetryable(
  token: DecodedIdToken,
  input: { leaseId: string; periodStart: string; error?: string },
  now = new Date(),
) {
  const account = await accountForToken(token);
  const ref = getAdminDb().collection("users").doc(account.uid);
  return getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const state = snapshot.data()?.reviewHistoryBackfill as ReviewHistoryBackfillState | undefined;
    if (!state || !state.lease || state.lease.leaseId !== input.leaseId || state.lease.periodStart !== input.periodStart) return state;
    const next: ReviewHistoryBackfillState = {
      ...state,
      status: "retryable",
      lease: undefined,
      lastAttemptAt: isoNow(now),
      lastError: String(input.error ?? "Historical Review preparation failed.").slice(0, 300),
    };
    transaction.set(ref, clean({ reviewHistoryBackfill: next }), { merge: true });
    return next;
  });
}

export function isClaimedHistoricalPeriod(account: AccountWithBackfill, periodStart: string, leaseId?: string) {
  const lease = account.reviewHistoryBackfill?.lease;
  if (!lease || lease.periodStart !== periodStart) return false;
  return leaseId ? lease.leaseId === leaseId : true;
}
