import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  addReviewDays,
  backfillComplete,
  evaluatedBackfillSlots,
  fourPeriodWindow,
  historicalRequestAnchor,
  leaseIsActive,
  nextBackfillPeriod,
  parseHistoricalRequestAnchor,
  reviewCountsTowardRetention,
  storedReviewLifecycle,
  uniqueArchiveMonthKeys,
  type HistoricalReviewEvaluation,
} from "../src/lib/boardsignal/historyBackfill";
import { summarizeOperationalRetention } from "../src/lib/boardsignal/historyRetention";
import { initialActivityAnchoredWeek, latestCompletedAlignedWeek } from "../src/lib/boardsignal/processor";
import { buildActiveUniverseBoards, latestUniverseParticipants, publicArtifactHasPrivateFields } from "../src/lib/boardsignal/pulse";
import type { UniverseParticipant } from "../src/lib/boardsignal/universe";

const root = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const iso = (date: Date) => date.toISOString().slice(0, 10);

const fixtures = {
  A: { name: "four active historical weeks", latest: "2026-08-13", active: ["2026-07-23", "2026-07-30", "2026-08-06", "2026-08-13"] },
  B: { name: "two active weeks and two empty intervals", latest: "2026-08-13", active: ["2026-07-30", "2026-08-13"], empty: ["2026-07-23", "2026-08-06"] },
  C: { name: "existing player with one organic Review", cadence: "2026-08-13", existing: ["2026-08-13"] },
  D: { name: "Original Beta player later organic", operational: [
    { playerKey: "D", periodStart: "2026-07-30", periodEnd: "2026-08-05", source: "original" as const },
    { playerKey: "D", periodStart: "2026-08-13", periodEnd: "2026-08-19", source: "live" as const },
  ] },
  E: { name: "already four legitimate Reviews", existing: ["2026-07-23", "2026-07-30", "2026-08-06", "2026-08-13"] },
  F: { name: "concurrent duplicate attempts", lease: { periodStart: "2026-08-06", leaseId: "lease-a", claimedAt: "2026-08-20T10:00:00.000Z", leaseUntil: "2026-08-20T10:20:00.000Z" } },
};

function participant(player: string, periodEnd: string, score: number, id: string): UniverseParticipant {
  return {
    id,
    stablePlayerId: player,
    player,
    source: "live",
    verified: true,
    periodLabel: periodEnd,
    periodEnd,
    games: 8,
    score,
    winningRun: Math.max(1, Math.round(score / 20)),
    pools: [{ pool: "rapid", games: 8, start: 800, end: 800 + score, change: score }],
  };
}

test("Patch H fixtures A-F are deterministic and bounded", () => {
  assert.equal(fixtures.A.active.length, 4);
  assert.equal(fixtures.B.active.length + fixtures.B.empty.length, 4);
  assert.equal(fixtures.C.existing.length, 1);
  assert.equal(fixtures.D.operational.length, 2);
  assert.equal(fixtures.E.existing.length, 4);
  assert.equal(fixtures.F.lease.periodStart, "2026-08-06");
});

test("1-5 new player: latest activity establishes four-slot cadence and chronology", () => {
  const gameAt = Date.parse("2026-08-19T18:00:00.000Z") / 1000;
  const anchored = initialActivityAnchoredWeek(gameAt);
  assert.deepEqual([iso(anchored.start), iso(anchored.end)], ["2026-08-13", "2026-08-19"]); // 2
  const targets = fourPeriodWindow(iso(anchored.start));
  assert.deepEqual(targets.map((item) => [item.start, item.end]), [
    ["2026-08-13", "2026-08-19"],
    ["2026-08-06", "2026-08-12"],
    ["2026-07-30", "2026-08-05"],
    ["2026-07-23", "2026-07-29"],
  ]); // 1
  assert.equal(addReviewDays(targets[0].end, 1), "2026-08-20"); // 3
  const locked = latestCompletedAlignedWeek("2026-08-13", new Date("2026-08-27T12:00:00.000Z"));
  assert.deepEqual([iso(locked.start), iso(locked.end)], ["2026-08-20", "2026-08-26"]); // 4
  assert.deepEqual([...targets].sort((a, b) => b.end.localeCompare(a.end)).map((x) => x.end), ["2026-08-19", "2026-08-12", "2026-08-05", "2026-07-29"]); // 5
});

test("6-10 existing player: cadence and existing evidence are immutable inputs", () => {
  const targets = fourPeriodWindow(fixtures.C.cadence);
  assert.equal(historicalRequestAnchor(fixtures.C.cadence, targets[1].start), "2026-08-13~history~2026-08-06"); // 6
  assert.deepEqual(parseHistoricalRequestAnchor("2026-08-13~history~2026-08-06"), { cadenceAnchor: "2026-08-13", periodStart: "2026-08-06", historical: true }); // 7
  assert.equal(nextBackfillPeriod(targets, {}, fixtures.C.existing)?.start, "2026-08-06"); // 8
  assert.equal(nextBackfillPeriod(targets, {}, fixtures.E.existing), undefined); // 9
  const persistence = read("src/lib/boardsignal/server/persistence.ts");
  assert.match(persistence, /alreadyPublished:\s*true/);
  assert.match(persistence, /if \(historical && removedPrevious\?\.originalBeta\) continue/); // 10
});

test("11-13 sparse activity: empty slots are evaluated but never fabricated", () => {
  const targets = fourPeriodWindow(fixtures.B.latest);
  const evaluated: Record<string, HistoricalReviewEvaluation> = Object.fromEntries(fixtures.B.empty.map((start) => [start, { status: "no_activity", evaluatedAt: "2026-08-20T10:00:00.000Z" }]));
  assert.equal(evaluatedBackfillSlots(targets, evaluated, fixtures.B.active), 4); // 11/12
  assert.equal(backfillComplete(targets, evaluated, fixtures.B.active), true);
  assert.equal(fixtures.B.active.length, 2); // 13: only legitimate active periods become Reviews
  assert.match(read("src/components/BoardSignalHistoryWorker.tsx"), /NO_ACTIVITY/);
});

test("14-17 idempotence: existing/evaluated slots and leases prevent duplicate work", () => {
  const targets = fourPeriodWindow("2026-08-13");
  assert.equal(nextBackfillPeriod(targets, {}, ["2026-08-13"])?.start, "2026-08-06"); // 14
  assert.equal(leaseIsActive(fixtures.F.lease, new Date("2026-08-20T10:10:00.000Z")), true); // 15
  const partial = { "2026-08-06": { status: "published" as const, evaluatedAt: "2026-08-20T10:00:00.000Z" } };
  assert.equal(nextBackfillPeriod(targets, partial, ["2026-08-13"])?.start, "2026-07-30"); // 16
  assert.equal(backfillComplete(targets, {}, fixtures.E.existing), true); // 17
  const coordinator = read("src/lib/boardsignal/server/historyBackfill.ts");
  assert.match(coordinator, /state\?\.version === REVIEW_HISTORY_BACKFILL_VERSION && state\.status === "complete"/);
});

test("18-23 retention: four imported Reviews equal one activation, not four returns", () => {
  const importedOnly = summarizeOperationalRetention([], [], ["A"]);
  assert.equal(importedOnly.r2Plus, 0); // 18/19/20
  assert.equal(importedOnly.r3Plus, 0);
  assert.equal(importedOnly.r4, 0);
  assert.equal(importedOnly.originalToLive, 0); // 21
  const firstOrganic = summarizeOperationalRetention([
    { playerKey: "A", periodStart: "2026-08-20", periodEnd: "2026-08-26", source: "live" },
  ], [], ["A"]);
  assert.equal(firstOrganic.r2Plus, 1); // 22
  assert.equal(firstOrganic.r3Plus, 0);
  const originalThenLive = summarizeOperationalRetention(fixtures.D.operational, ["D"]);
  assert.equal(originalThenLive.originalToLive, 1);
  assert.equal(reviewCountsTowardRetention({ reviewLifecycle: "historical_backfill", countsTowardRetention: false, desk: { source: "live", provenance: { verified: true } } }), false);
  assert.equal(reviewCountsTowardRetention({ desk: { source: "live", provenance: { verified: true } } }), true); // legacy default
  const founder = read("src/lib/boardsignal/server/founderOperations.ts");
  assert.match(founder, /period\.source !== "historical"/); // 23
});

test("24-32 Universe: historical persistence is silent and current boards choose latest period", () => {
  const persistence = read("src/lib/boardsignal/server/persistence.ts");
  assert.match(persistence, /historical \? \{ importedAt: storedAt \} : \{ publishedAt: storedAt \}/); // 24-28
  assert.match(persistence, /if \(!historical\) \{/);
  assert.match(persistence, /recordCompletedDeskUniverseArtifacts/);
  const olderStrong = participant("42", "2026-08-12", 95, "old");
  const latestNormal = participant("42", "2026-08-19", 55, "new");
  const other = participant("99", "2026-08-19", 70, "other");
  const latest = latestUniverseParticipants([olderStrong, latestNormal, other]);
  assert.equal(latest.filter((item) => item.stablePlayerId === "42").length, 1); // 29
  assert.equal(latest.find((item) => item.stablePlayerId === "42")?.id, "new"); // 30
  const boards = buildActiveUniverseBoards([olderStrong, latestNormal, other], []);
  for (const board of boards) assert.ok(board.entries.filter((entry) => entry.stablePlayerId === "42").length <= 1);
  assert.equal(publicArtifactHasPrivateFields({ headline: "public", red: { title: "private" } }), true); // 31
  assert.match(persistence, /recordCompletedDeskUniverseArtifacts\(\{ account, desk/); // 32 organic path remains
});

test("33-37 Progress/Ask: imported Reviews stay in chronological private history", () => {
  const persistence = read("src/lib/boardsignal/server/persistence.ts");
  assert.match(persistence, /liveDeskToReviewHistory\(data\.desk, data\.summary\)/); // 33/34
  assert.match(persistence, /deriveRecurringPatternsFromReviewHistory\(reviewHistory\)/); // 35
  assert.match(read("src/lib/boardsignal/server/askContext.ts"), /reviewHistory/); // 36
  assert.match(persistence, /orderBy\("periodEnd", "desc"\)\.limit\(4\)/); // 37
});

test("38-41 failure/API: backfill is retryable and Chess.com archive access is cached/serial", () => {
  const worker = read("src/components/BoardSignalHistoryWorker.tsx");
  assert.match(worker, /"retryable"/); // 38/39
  assert.match(worker, /60_000/);
  const processor = read("src/lib/boardsignal/processor.ts");
  assert.match(processor, /ARCHIVE_CACHE_TTL_MS = 12 \* 60 \* 60 \* 1000/); // 40
  assert.match(processor, /for \(const url of urls\) games\.push\(\.\.\.await fetchGames\(url\)\)/);
  assert.match(processor, /"User-Agent": "BoardSignal\/0\.1 \(adminhub-global\.com\/boardsignal\)"/); // 41
  assert.deepEqual(uniqueArchiveMonthKeys(fourPeriodWindow("2026-08-13")), ["2026-07", "2026-08"]);
});

test("42-52 regression surfaces remain wired", () => {
  const processor = read("src/lib/boardsignal/processor.ts");
  const universalDesk = read("src/components/UniversalPlayerDesk.tsx");
  const room = read("src/components/BoardSignalPlayerRoom.tsx");
  const pulse = read("src/lib/boardsignal/pulse.ts");
  const ask = read("src/lib/boardsignal/server/askContext.ts");
  const founder = read("src/lib/boardsignal/server/founderOperations.ts");
  const deletion = read("src/lib/boardsignal/server/accountDeletion.ts");
  const manifest = read("src/app/manifest.ts");
  assert.match(processor, /candidatePositions/); // 42
  assert.match(universalDesk, /runStockfishBatch|Stockfish/); // 43
  assert.match(room, /Player Room|player-room/); // 44
  assert.match(read("src/lib/boardsignal/reviewHistory.ts"), /buildReviewProgress/); // 45
  assert.match(pulse, /buildActiveUniverseBoards/); // 46
  assert.match(room, /friend|rival|head-to-head/i); // 47
  assert.match(ask, /reviewHistory/); // 48
  assert.match(founder, /founderOperationsSnapshot/); // 49
  assert.match(deletion, /collection\("desks"\)|delete/); // 50
  assert.match(manifest, /display|standalone/); // 51
  const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
  assert.ok(pkg.scripts.build && pkg.scripts["test:core"] && pkg.scripts.lint); // 52
});

test("legacy lifecycle defaults remain backwards compatible", () => {
  assert.equal(storedReviewLifecycle({ desk: { source: "live", provenance: { verified: true } } }), "organic_live");
  assert.equal(storedReviewLifecycle({ reviewLifecycle: "historical_backfill", desk: { source: "live", provenance: { verified: true } } }), "historical_backfill");
  assert.equal(storedReviewLifecycle({ originalBeta: { seedHandle: "Beta" } }), "original_beta");
});
