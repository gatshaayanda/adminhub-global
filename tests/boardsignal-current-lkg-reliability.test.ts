import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  classifyCurrentCollectionFailure,
  samePeriodCurrentEpisodeFallback,
} from "../src/lib/boardsignal/server/currentEpisodeReliability";
import type { CurrentEpisodeSummary } from "../src/lib/boardsignal/memory";

const routeSource = readFileSync("src/app/api/boardsignal/player-room/route.ts", "utf8");
const playerRoomSource = readFileSync("src/components/BoardSignalPlayerRoom.tsx", "utf8");
const currentPeriod = { periodStart: "2026-08-31", periodEnd: "2026-09-06" };
const saved: CurrentEpisodeSummary = {
  status: "forming",
  periodStart: currentPeriod.periodStart,
  periodEnd: currentPeriod.periodEnd,
  periodLabel: "31 Aug–6 Sep",
  checkedAt: "2026-09-01T07:00:00.000Z",
  daysComplete: 2,
  daysRemaining: 5,
  games: 7,
  wins: 4,
  draws: 1,
  losses: 2,
  currentWinRun: 1,
  currentLossRun: 0,
  sessions: 2,
  pools: [],
  nextDeskDueAt: "2026-09-07",
};

test("R1: same-period successful snapshot is eligible after an upstream failure", () => {
  assert.deepEqual(samePeriodCurrentEpisodeFallback(saved, currentPeriod), saved);
});

test("R1: previous-period snapshot is rejected as Current", () => {
  const old = { ...saved, periodStart: "2026-08-24", periodEnd: "2026-08-30" };
  assert.equal(samePeriodCurrentEpisodeFallback(old, currentPeriod), undefined);
});

test("R1: a valid zero-game current snapshot remains a normal successful snapshot", () => {
  const zero = { ...saved, games: 0, wins: 0, draws: 0, losses: 0 };
  const fallback = samePeriodCurrentEpisodeFallback(zero, currentPeriod);
  assert.equal(fallback?.games, 0);
  assert.equal(fallback?.periodStart, currentPeriod.periodStart);
});

test("R1: failed refresh does not overwrite the successful persistence checkpoint", () => {
  assert.match(routeSource, /const factualCurrentEpisode = currentEpisode && !usingLastKnownGood/);
  assert.match(routeSource, /buildPlayerRoomSnapshot\(token, factualCurrentEpisode, progressUnavailable, account\)/);
  assert.match(routeSource, /currentEpisodeSummary: account\.currentEpisodeSummary/);
  assert.match(routeSource, /latestProgressCheckedAt: account\.latestProgressCheckedAt/);
});

test("R1: successful refresh path still persists fresh factual current state normally", () => {
  assert.match(routeSource, /currentEpisode = await buildCurrentEpisodeSummary/);
  assert.match(routeSource, /factualEpisodeCheckpoint\(currentEpisode\)/);
  assert.match(routeSource, /usingLastKnownGood = false/);
});

test("R1: source failures are classified without logging private player identity", () => {
  assert.deepEqual(classifyCurrentCollectionFailure({ status: 429 }), { kind: "chesscom_429", status: 429 });
  assert.deepEqual(classifyCurrentCollectionFailure({ status: 403 }), { kind: "chesscom_4xx", status: 403 });
  assert.deepEqual(classifyCurrentCollectionFailure({ status: 503 }), { kind: "chesscom_5xx", status: 503 });
  assert.deepEqual(classifyCurrentCollectionFailure({ name: "TimeoutError" }), { kind: "timeout" });
  assert.deepEqual(classifyCurrentCollectionFailure(new TypeError("fetch failed")), { kind: "network_fetch" });
  assert.deepEqual(classifyCurrentCollectionFailure(new Error("malformed")), { kind: "unexpected_current_collection" });
  assert.match(routeSource, /samePeriodFallbackUsed: usingLastKnownGood/);
  assert.match(routeSource, /lastSuccessfulCurrentCollectionAt/);
  assert.doesNotMatch(routeSource, /console\.warn\([^)]*canonicalUsername/s);
});

test("R1: failed fallback reuses stored same-period M7 presentation without advancing coaching", () => {
  assert.match(routeSource, /if \(usingLastKnownGood\) \{[\s\S]*validStoredCoachingState\(account\.coachingState\)[\s\S]*presentationFromCoachingState\(storedCoaching\)/);
  assert.match(routeSource, /else \{\s*coaching = await reconcilePlayerCoachingState\(account\.uid, currentEpisode\)/);
});

test("R1: failed fallback is not written into Guide\/Ask as a fresh current snapshot", () => {
  assert.match(routeSource, /currentEpisode: usingLastKnownGood \? undefined : currentEpisode/);
});

test("R1: route keeps retry state while restoring a usable same-period Current BoardSignal", () => {
  assert.match(routeSource, /progressUnavailable = "Current episode progress is temporarily unavailable\."/);
  assert.match(routeSource, /snapshot\.currentEpisode = fallbackCurrentEpisode/);
});

test("R1: same-period fallback keeps Current visible with a subtle truthful stale-refresh note", () => {
  assert.match(playerRoomSource, /currentEpisode \? <><CurrentEpisodeCard/);
  assert.match(playerRoomSource, /snapshot\.progressUnavailable \? <p className="forming-note" role="status">/);
  assert.match(playerRoomSource, /Showing your last successfully checked games\. BoardSignal couldn&apos;t refresh Chess\.com just now\./);
  assert.match(playerRoomSource, /Last successfully checked/);
});

test("R1: first-ever source failure says temporarily unavailable instead of catching up", () => {
  assert.match(playerRoomSource, /snapshot\.progressUnavailable \? "Current BoardSignal is temporarily unavailable\." : "Your current picture is catching up\."/);
  assert.match(playerRoomSource, /BoardSignal couldn't check your Chess\.com games just now\. Your account is set up — try again shortly\./);
});

test("R1: fresh and successful zero-game Current states remain normal and warning-free", () => {
  assert.match(playerRoomSource, /snapshot\.progressUnavailable \? <p className="forming-note"/);
  assert.match(playerRoomSource, /Games so far<\/span><strong>\{episode\.games\}<\/strong>/);
  assert.match(playerRoomSource, /BoardSignal will start adding factual current information as new Chess\.com games arrive\./);
  assert.doesNotMatch(playerRoomSource, /Chess\.com is down/i);
});
