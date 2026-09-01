import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  backfillComplete,
  nextBackfillPeriod,
  reviewCountsTowardRetention,
  type HistoricalReviewEvaluation,
  type HistoricalReviewPeriod,
} from "../src/lib/boardsignal/historyBackfill";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const serverBackfill = read("src/lib/boardsignal/server/historyBackfill.ts");
const worker = read("src/components/BoardSignalHistoryWorker.tsx");
const playerRoomRoute = read("src/app/api/boardsignal/player-room/route.ts");
const universePulse = read("src/lib/boardsignal/server/universePulse.ts");
const serverPeriods = read("src/lib/boardsignal/server/reviewPeriods.ts");

const periods: HistoricalReviewPeriod[] = [
  { start: "2026-08-01", end: "2026-08-07" },
  { start: "2026-08-08", end: "2026-08-14" },
  { start: "2026-08-15", end: "2026-08-21" },
  { start: "2026-08-22", end: "2026-08-28" },
];

test("historical onboarding: zero Review history remains eligible for oldest missing work", () => {
  assert.doesNotMatch(serverBackfill, /if\s*\(\s*!establishedHistory\.length\s*\)\s*return undefined/);
  assert.match(serverBackfill, /loadRecentReportPeriodTruth\(account,\s*now,\s*true,\s*establishedHistory\)/);
  assert.equal(nextBackfillPeriod(periods, {}, [])?.start, periods[0].start);
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

test("historical onboarding: claim and settlement retain lease/concurrency protection", () => {
  assert.match(serverBackfill, /runTransaction/);
  assert.match(serverBackfill, /if \(leaseIsActive\(state\.lease, now\)\) return undefined/);
  assert.match(serverBackfill, /HISTORY_LEASE_MISMATCH/);
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
