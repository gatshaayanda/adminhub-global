import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  backfillComplete,
  historicalSettlementDecision,
  nextBackfillPeriod,
  resumableHistoricalBackfillWork,
  reviewCountsTowardRetention,
  type HistoricalBackfillLease,
  type HistoricalReviewEvaluation,
  type HistoricalReviewPeriod,
  type ReviewHistoryBackfillState,
} from "../src/lib/boardsignal/historyBackfill";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const serverBackfill = read("src/lib/boardsignal/server/historyBackfill.ts");
const worker = read("src/components/BoardSignalHistoryWorker.tsx");
const playerRoomRoute = read("src/app/api/boardsignal/player-room/route.ts");
const universePulse = read("src/lib/boardsignal/server/universePulse.ts");
const serverPeriods = read("src/lib/boardsignal/server/reviewPeriods.ts");
const founderRoute = read("src/app/api/admin/boardsignal/founder-engagement/route.ts");
const founderCards = read("src/components/FounderOperationsConsole.tsx");

const periods: HistoricalReviewPeriod[] = [
  { start: "2026-08-05", end: "2026-08-11" },
  { start: "2026-08-12", end: "2026-08-18" },
  { start: "2026-08-19", end: "2026-08-25" },
  { start: "2026-08-26", end: "2026-09-01" },
];
const NOW = new Date("2026-09-02T10:00:00.000Z");
const leaseL1: HistoricalBackfillLease = {
  periodStart: periods[0].start,
  leaseId: "lease-L1",
  claimedAt: "2026-09-02T09:55:00.000Z",
  leaseUntil: "2026-09-02T10:15:00.000Z",
};
const leaseL2: HistoricalBackfillLease = {
  periodStart: periods[1].start,
  leaseId: "lease-L2",
  claimedAt: "2026-09-02T10:16:00.000Z",
  leaseUntil: "2026-09-02T10:36:00.000Z",
};

function stateWith(lease?: HistoricalBackfillLease, evaluated: Record<string, HistoricalReviewEvaluation> = {}): ReviewHistoryBackfillState {
  return {
    version: 1,
    status: "pending",
    targetPeriods: periods,
    evaluated,
    lease,
    establishedAt: "2026-09-02T09:50:00.000Z",
  };
}

test("historical onboarding: zero Review history remains eligible for oldest missing work", () => {
  assert.doesNotMatch(serverBackfill, /if\s*\(\s*!establishedHistory\.length\s*\)\s*return undefined/);
  assert.match(serverBackfill, /loadRecentReportPeriodTruth\(account,\s*now,\s*true,\s*establishedHistory\)/);
  assert.equal(nextBackfillPeriod(periods, {}, [])?.start, periods[0].start);
});

test("history resume: active lease reconstructs the same work across reload and two tabs without mutating lease identity", () => {
  const state = stateWith(leaseL1);
  const before = structuredClone(state);
  const tabA = resumableHistoricalBackfillWork(periods, state, "2026-08-26", [], NOW);
  const tabB = resumableHistoricalBackfillWork(periods, state, "2026-08-26", [], NOW);
  assert.deepEqual(tabA, tabB);
  assert.equal(tabA?.leaseId, "lease-L1");
  assert.equal(tabA?.periodStart, "2026-08-05");
  assert.equal(tabA?.periodEnd, "2026-08-11");
  assert.equal(tabA?.requestCadenceAnchor, "2026-08-26");
  assert.deepEqual(state, before, "ordinary resume must not extend leaseUntil or rewrite claimedAt");
  assert.match(serverBackfill, /const persistedActiveLease = leaseIsActive\(persistedState\?\.lease, now\)/);
  assert.match(serverBackfill, /if \(persistedActiveLease\) \{[\s\S]*resumableHistoricalBackfillWork/);
});

test("history resume: unresolved active target is preserved for stale recovery instead of silently replaced", () => {
  const missingTargetLease = { ...leaseL1, periodStart: "2026-07-29" };
  assert.equal(resumableHistoricalBackfillWork(periods, stateWith(missingTargetLease), "2026-08-26", [], NOW), undefined);
  assert.match(serverBackfill, /persistedActiveLease && !targets\.some\(\(period\) => period\.start === persistedActiveLease\.periodStart\)\) return undefined/);
  const anomalyGuard = serverBackfill.indexOf("persistedActiveLease && !targets.some");
  const mint = serverBackfill.indexOf("const leaseId = randomBytes");
  assert.ok(anomalyGuard >= 0 && mint > anomalyGuard);
});

test("history resume: expired lease is not resumable and ordinary reclaim path remains available", () => {
  const expired = { ...leaseL1, leaseUntil: "2026-09-02T09:59:59.000Z" };
  assert.equal(resumableHistoricalBackfillWork(periods, stateWith(expired), "2026-08-26", [], NOW), undefined);
  assert.match(serverBackfill, /const target = nextBackfillPeriod\(targets, state\.evaluated, existingStarts\)/);
  assert.match(serverBackfill, /const leaseId = randomBytes\(16\)\.toString\("hex"\)/);
});

test("history settlement: repeat completion is idempotent before lease ownership rejection", () => {
  const initial = stateWith(leaseL1);
  assert.equal(historicalSettlementDecision(initial, { leaseId: "lease-L1", periodStart: periods[0].start }), "owned");
  const settled = stateWith(undefined, { [periods[0].start]: { status: "published", evaluatedAt: NOW.toISOString() } });
  assert.equal(historicalSettlementDecision(settled, { leaseId: "lease-L1", periodStart: periods[0].start }), "already_evaluated");
  assert.equal(historicalSettlementDecision(stateWith(undefined), { leaseId: "lease-L1", periodStart: periods[0].start }, "review"), "already_evaluated");
  assert.equal(historicalSettlementDecision(stateWith(undefined), { leaseId: "lease-L1", periodStart: periods[0].start }, "no_activity"), "already_evaluated");
  const replay = serverBackfill.indexOf('if (settlementDecision === "already_evaluated") return nextState;');
  const stale = serverBackfill.indexOf('if (settlementDecision === "stale")');
  const periodWrite = serverBackfill.indexOf("transaction.set(periodRef", replay);
  assert.ok(replay >= 0 && stale > replay && periodWrite > replay);
});

test("history settlement: a late L1 replay cannot clear or modify a genuinely unresolved L2 lease", () => {
  const newer = stateWith(leaseL2);
  assert.equal(historicalSettlementDecision(newer, { leaseId: "lease-L1", periodStart: periods[0].start }), "stale");
  assert.equal(historicalSettlementDecision(newer, { leaseId: "lease-L1", periodStart: periods[0].start }, "review"), "already_evaluated");
  assert.deepEqual(newer.lease, leaseL2);
  assert.match(serverBackfill, /Returning before any write also[\s\S]*newer active lease cannot be cleared/);
});

test("history settlement: wrong-account or stale unresolved ownership remains rejected", () => {
  const otherAccountState = stateWith({ ...leaseL1, leaseId: "other-account-lease" });
  assert.equal(historicalSettlementDecision(otherAccountState, { leaseId: "lease-L1", periodStart: periods[0].start }), "stale");
  assert.match(serverBackfill, /const accountRef = db\.collection\("users"\)\.doc\(account\.uid\)/);
  assert.match(serverBackfill, /collection\("reviewPeriods"\)\.doc\(input\.periodStart\)/);
  assert.match(serverBackfill, /HISTORY_LEASE_MISMATCH/);
});

test("history interruption recovery: lease-only, factual checkpoint, engine interruption and lost settlement response remain recoverable", () => {
  const leaseOnly = resumableHistoricalBackfillWork(periods, stateWith(leaseL1), "2026-08-26", [], NOW);
  assert.equal(leaseOnly?.leaseId, leaseL1.leaseId);
  assert.match(worker, /reviewLifecycle:\"historical_backfill\",historyLeaseId:work\.leaseId/);
  assert.match(worker, /reviewLifecycle:\"historical_backfill\",historyLeaseId:activeWork\.leaseId/);
  assert.match(worker, /key=\{`\$\{work\.periodStart\}:\$\{work\.leaseId\}`\}/);
  assert.equal(historicalSettlementDecision(stateWith(undefined), { leaseId: leaseL1.leaseId, periodStart: periods[0].start }, "review"), "already_evaluated");
  assert.equal(historicalSettlementDecision(stateWith(undefined, { [periods[0].start]: { status: "published", evaluatedAt: NOW.toISOString() } }), { leaseId: leaseL1.leaseId, periodStart: periods[0].start }), "already_evaluated");
});

test("historical onboarding: genuine no-activity settles without a fake Review and can advance", () => {
  const evaluated: Record<string, HistoricalReviewEvaluation> = {
    [periods[0].start]: { status: "no_activity", evaluatedAt: "2026-09-01T00:00:00.000Z" },
  };
  assert.equal(nextBackfillPeriod(periods, evaluated, [])?.start, periods[1].start);
  assert.match(worker, /code===\"NO_ACTIVITY\"|code === \"NO_ACTIVITY\"/);
  assert.match(worker, /postState\(activeUser,claimed,\"noActivity\"\)/);
  assert.doesNotMatch(serverPeriods, /collection\(\"desks\"\)[\s\S]*no_activity/);
});

test("historical onboarding: partial existing history processes only the missing oldest slot", () => {
  assert.equal(nextBackfillPeriod(periods, {}, [periods[0].start, periods[2].start])?.start, periods[1].start);
});

test("historical onboarding: complete durable truth returns no additional work", () => {
  const evaluated = Object.fromEntries(periods.map((period) => [period.start, { status: "no_activity", evaluatedAt: "2026-09-01T00:00:00.000Z" }])) as Record<string, HistoricalReviewEvaluation>;
  assert.equal(backfillComplete(periods, evaluated), true);
  assert.equal(nextBackfillPeriod(periods, evaluated), undefined);
});

test("historical lifecycle survives remount instead of becoming organic_live", () => {
  assert.match(worker, /historyLeaseId:work\.leaseId/);
  assert.match(worker, /historyLeaseId:activeWork\.leaseId/);
  assert.match(worker, /reviewLifecycle:\"historical_backfill\"/);
  assert.doesNotMatch(worker, /reviewLifecycle:\"organic_live\"/);
});

test("current 2–8 Sep zero-game truth is separate from historical 26 Aug–1 Sep work", () => {
  const current = { periodStart: "2026-09-02", periodEnd: "2026-09-08", games: 0 };
  const historical = periods.at(-1)!;
  assert.deepEqual(historical, { start: "2026-08-26", end: "2026-09-01" });
  assert.equal(current.games, 0);
  assert.ok(historical.end < current.periodStart);
  const historicalLease = { ...leaseL1, periodStart: historical.start };
  const work = resumableHistoricalBackfillWork(periods, stateWith(historicalLease), "2026-08-26", [], NOW);
  assert.equal(work?.periodStart, "2026-08-26");
  assert.equal(work?.periodEnd, "2026-09-01");
  assert.match(worker, /latestCompletedReviewPeriods\(claimed\.requestCadenceAnchor\)\.at\(-1\)/);
});

test("Founder history diagnostic reuses safe existing status/count truth and exposes no raw lease token", () => {
  for (const marker of ["HISTORY · PROCESSING", "HISTORY · COMPLETE", "HISTORY · NO QUALIFYING ACTIVITY", "HISTORY · RETRY REQUIRED"]) assert.ok(founderCards.includes(marker));
  for (const marker of ["evaluatedSlots", "totalSlots", "reviewSlots", "noActivitySlots", "currentPeriod", "lastAttemptAt", "lastError", "completedAt"]) assert.ok(founderRoute.includes(marker));
  assert.doesNotMatch(founderRoute, /leaseId|leaseUntil|claimedAt/);
});

test("historical onboarding: historical Reviews continue into ordinary private Progress", () => {
  assert.match(playerRoomRoute, /snapshot\.progress = buildReviewProgress\(snapshot\.reviewHistory\)/);
  assert.match(playerRoomRoute, /snapshot\.recurringPatterns = deriveRecurringPatternsFromReviewHistory\(snapshot\.reviewHistory\)/);
});

test("historical onboarding: historical Reviews remain excluded from ordinary retention", () => {
  assert.equal(reviewCountsTowardRetention({ reviewLifecycle: "historical_backfill" }), false);
  assert.match(worker, /reviewLifecycle:\"historical_backfill\"/);
});

test("historical onboarding: Universe fresh-news safeguards stay locked", () => {
  assert.match(universePulse, /reviewLifecycle === \"historical_backfill\"/);
  assert.match(universePulse, /events:\s*\[\]/);
  assert.match(universePulse, /shareMoments:\s*\[\]/);
});

test("historical onboarding: newest completed game-bearing period remains ordinary-live owned", () => {
  assert.match(worker, /latestCompletedReviewPeriods\(claimed\.requestCadenceAnchor\)\.at\(-1\)/);
  assert.match(worker, /Ordinary live Review generation has priority for the latest completed game-bearing period\./);
});

test("historical onboarding: transient failures remain retryable and never become no_activity", () => {
  assert.match(worker, /postState\(activeUser,claimed,\"retryable\"/);
  assert.match(serverBackfill, /status: \"retryable\"/);
  assert.match(serverBackfill, /existingData\?\.outcome === \"review\" && outcome === \"no_activity\"/);
});
