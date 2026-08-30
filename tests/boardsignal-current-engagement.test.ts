import assert from "node:assert/strict";
import test from "node:test";
import type { CurrentEpisodeWithNextGameGuidance } from "../src/lib/boardsignal/activeWeekGuidance";
import { buildCurrentBoardSignalMoment } from "../src/lib/boardsignal/currentBoardSignalPresentation";
import type { PlayerPulse } from "../src/lib/boardsignal/pulse";

function episode(overrides: Partial<CurrentEpisodeWithNextGameGuidance> = {}): CurrentEpisodeWithNextGameGuidance {
  return {
    status: "forming",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    periodLabel: "Aug 24–30",
    checkedAt: "2026-08-30T12:00:00.000Z",
    daysComplete: 6,
    daysRemaining: 1,
    games: 6,
    wins: 3,
    draws: 1,
    losses: 2,
    currentWinRun: 1,
    currentLossRun: 0,
    sessions: 2,
    pools: [{ pool: "rapid", games: 6, wins: 3, draws: 1, losses: 2, ratingDelta: 8 }],
    nextDeskDueAt: "2026-08-31",
    nextGameGuidance: {
      status: "available",
      source: "current_week",
      family: "queen_safety",
      title: "Before the queen moves, scan the reply.",
      copy: "Check the opponent's immediate checks and captures first.",
      gamesConsidered: 6,
      evidenceCount: 2,
      supportingFacts: [],
    },
    ...overrides,
  };
}

test("Current BoardSignal moment favors a real winning run and keeps a deterministic item key", () => {
  const current = episode({ currentWinRun: 3, wins: 4, losses: 1 });
  const first = buildCurrentBoardSignalMoment({ episode: current });
  const second = buildCurrentBoardSignalMoment({ episode: current });
  assert.equal(first.variant, "positive_run");
  assert.match(first.headline, /3-game winning run/i);
  assert.equal(first.itemKey, second.itemKey);
});

test("Current BoardSignal moment calls a difficult run without manufacturing urgency", () => {
  const moment = buildCurrentBoardSignalMoment({ episode: episode({ currentLossRun: 3, wins: 1, losses: 4 }) });
  assert.equal(moment.variant, "difficult_run");
  assert.match(moment.headline, /3 losses in a row/i);
  assert.doesNotMatch(`${moment.headline} ${moment.evidence}`, /urgent|hurry|today/i);
});

test("draw-heavy current state stays factual rather than inventing a chess conclusion", () => {
  const moment = buildCurrentBoardSignalMoment({ episode: episode({ games: 5, wins: 1, draws: 3, losses: 1 }) });
  assert.equal(moment.variant, "draw_stable");
  assert.match(moment.evidence, /result fact, not a positional conclusion/i);
});

test("real since-away pulse takes priority and M1 language no longer calls Current BoardSignal an episode", () => {
  const pulse = {
    sinceAway: {
      id: "since-away:test",
      kind: "since-away",
      eyebrow: "SINCE YOU WERE AWAY",
      title: "2 new games changed the forming episode.",
      body: "Latest available Chess.com data since your previous Player Room visit.",
      facts: ["2 games entered this episode.", "1W · 0D · 1L since your last visit."],
      finality: "provisional",
    },
    fieldMoved: [], justIn: [], whatsHot: [], groups: [], standings: [], fieldLabels: [], officialPlayerCount: 0,
    boardMoved: [], reviewMovement: [], proximity: [], provisional: [], checkedAt: "2026-08-30T12:00:00.000Z",
  } as PlayerPulse;
  const moment = buildCurrentBoardSignalMoment({ episode: episode(), pulse });
  assert.equal(moment.variant, "since_away");
  assert.match(moment.headline, /current picture/i);
  assert.doesNotMatch(`${moment.headline} ${moment.evidence}`, /episode/i);
});

test("quiet current states may surface one restrained public-safe BoardSignal activity item", () => {
  const pulse = {
    fieldMoved: [],
    justIn: [{
      eventId: "event-1",
      eventType: "winning_run",
      playerId: "99",
      canonicalUsername: "OtherPlayer",
      occurredAt: "2026-08-30T10:00:00.000Z",
      publishedAt: "2026-08-30T10:00:00.000Z",
      headline: "OtherPlayer put together a strong run.",
      supportingFact: "Four straight wins in a completed Review.",
      dataMode: "live",
      finality: "official",
      safePublic: true,
    }],
    whatsHot: [], groups: [], standings: [], fieldLabels: [], officialPlayerCount: 1,
    boardMoved: [], reviewMovement: [], proximity: [], provisional: [], checkedAt: "2026-08-30T12:00:00.000Z",
  } as PlayerPulse;
  const quietEpisode = episode({
    games: 1,
    wins: 0,
    draws: 0,
    losses: 1,
    currentWinRun: 0,
    currentLossRun: 1,
    nextGameGuidance: {
      status: "insufficient_evidence",
      source: "insufficient_current_evidence",
      gamesConsidered: 1,
      supportingFacts: [],
      reason: "no_supported_fact",
    },
  });
  const moment = buildCurrentBoardSignalMoment({ episode: quietEpisode, pulse, canonicalUsername: "PlayerOne" });
  assert.equal(moment.variant, "quiet");
  assert.equal(moment.around?.headline, "OtherPlayer put together a strong run.");
});
