const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pulse = require("../.test-dist-universe-pulse/src/lib/boardsignal/pulse.js");
const universe = require("../.test-dist-universe-pulse/src/lib/boardsignal/universe.js");
const memory = require("../.test-dist-universe-pulse/src/lib/boardsignal/memory.js");
const communications = require("../.test-dist-universe-pulse/src/lib/boardsignal/communications.js");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function participant(player, source = "live", extra = {}) {
  return {
    id: `${source}:${player.toLowerCase()}`,
    player,
    source,
    verified: true,
    periodLabel: "1–7 Aug 2026",
    periodEnd: "2026-08-07",
    games: 10,
    score: 60,
    winningRun: 3,
    pools: [],
    ...extra,
  };
}
function episode(extra = {}) {
  return {
    status: "forming",
    periodStart: "2026-08-08",
    periodEnd: "2026-08-14",
    periodLabel: "8–14 Aug 2026",
    checkedAt: "2026-08-12T05:00:00.000Z",
    daysComplete: 5,
    daysRemaining: 2,
    games: 4,
    wins: 3,
    draws: 0,
    losses: 1,
    currentWinRun: 2,
    currentLossRun: 0,
    sessions: 1,
    pools: [{ pool: "Rapid", games: 4, wins: 3, draws: 0, losses: 1, ratingStart: 800, ratingEnd: 812, ratingDelta: 12 }],
    nextDeskDueAt: "2026-08-15",
    ...extra,
  };
}
function liveDesk(extra = {}) {
  return {
    source: "live",
    provenance: { verified: true, sourceLabel: "LIVE" },
    player: { requestedUsername: "PulsePlayer", username: "PulsePlayer", playerId: 4242 },
    period: { start: "2026-08-01", end: "2026-08-07", label: "1–7 Aug 2026", isLastActive: false, latestCompletedLabel: "1–7 Aug 2026" },
    games: 12,
    wins: 8,
    draws: 1,
    losses: 3,
    score: 70.8,
    headline: "A supported week",
    summary: "Supported public summary.",
    longestWinStreak: 5,
    longestLossStreak: 2,
    sessions: 3,
    checkmateWins: 3,
    timeoutLosses: 0,
    resignationLosses: 0,
    primaryPool: "Rapid",
    days: [
      { date: "2026-08-06", label: "Thu", wins: 2, draws: 0, losses: 1, games: 3 },
      { date: "2026-08-07", label: "Fri", wins: 4, draws: 0, losses: 1, games: 5 },
    ],
    pools: [{ pool: "Rapid", games: 12, record: "8-1-3", wins: 8, draws: 1, losses: 3, firstRecordedRating: 800, lastRecordedRating: 847, change: 47, peak: 850, low: 795 }],
    openings: [],
    candidates: [],
    signals: {
      green: { label: "GREEN", title: "Private green", copy: "private green" },
      amber: { label: "AMBER", title: "SECRET AMBER", copy: "private amber" },
      red: { label: "RED", title: "SECRET RED", copy: "private red" },
      blue: { label: "BLUE", title: "SECRET BLUE", copy: "private blue" },
    },
    ...extra,
  };
}
function event(id, playerId, publishedAt, extra = {}) {
  return {
    eventId: id,
    eventType: "entered_top3",
    playerId,
    canonicalUsername: `P${playerId}`,
    occurredAt: publishedAt,
    publishedAt,
    headline: "Entered the Top 3",
    supportingFact: "Supported public fact.",
    dataMode: "live",
    finality: "official",
    safePublic: true,
    rankAfter: 3,
    ...extra,
  };
}

test("current-week delta is factual, deterministic and provisional", () => {
  const before = episode({ games: 2, wins: 1, losses: 1, currentWinRun: 1, sessions: 1, pools: [{ pool: "Rapid", games: 2, wins: 1, draws: 0, losses: 1, ratingStart: 800, ratingEnd: 794, ratingDelta: -6 }] });
  const after = episode({ games: 6, wins: 5, losses: 1, currentWinRun: 4, sessions: 2, pools: [{ pool: "Rapid", games: 6, wins: 5, draws: 0, losses: 1, ratingStart: 800, ratingEnd: 818, ratingDelta: 18 }] });
  const card = pulse.deriveCurrentEpisodeDelta(before, after);
  assert.ok(card);
  assert.match(card.facts.join(" "), /4 games entered/);
  assert.match(card.facts.join(" "), /Rapid moved \+24/);
  assert.match(card.facts.join(" "), /winning run reached 4/);
  assert.equal(pulse.deriveCurrentEpisodeDelta(after, { ...after, checkedAt: "2026-08-12T06:00:00.000Z" }), undefined);

  const provisional = pulse.currentEpisodeToProvisionalParticipant("PulsePlayer", "4242", episode({ currentWinRun: 4 }));
  assert.match(provisional.id, /^provisional:/);
  const cards = pulse.deriveProvisionalCards(pulse.buildActiveUniverseBoards([provisional], []), provisional.id);
  assert.ok(cards.length > 0);
  assert.ok(cards.every((item) => item.finality === "provisional"));
  assert.ok(cards.some((item) => /PROVISIONAL/.test(item.body)));
  assert.ok(cards.every((item) => /official/i.test(item.body)));
});

test("completed Review input remains immutable while public-safe facts are derived", () => {
  const desk = liveDesk();
  const before = JSON.stringify(desk);
  const moments = pulse.nominateShareMoments(desk, []);
  assert.equal(JSON.stringify(desk), before);
  assert.ok(moments.length > 0 && moments.length <= 3);
  assert.ok(moments.every((moment) => moment.safePublic === true && moment.dataMode === "live"));
  assert.ok(moments.some((moment) => moment.headline === "5 straight wins"));
  const serialized = JSON.stringify(moments);
  assert.doesNotMatch(serialized, /SECRET RED|SECRET AMBER|SECRET BLUE|private red|private blue/);
  assert.equal(pulse.publicArtifactHasPrivateFields(moments), false);
});

test("new-player public introduction stays consent-gated and private-field safe", () => {
  const source = read("src/lib/boardsignal/server/universePulse.ts");
  assert.match(source, /if \(!account\.betaAgreementAcceptedAt \|\| !account\.universeParticipationDisclosedAt\) return undefined/);
  const start = source.indexOf("export async function recordNewPlayerUniverseIntro");
  const end = source.indexOf("function boardEntry", start);
  const block = source.slice(start, end);
  assert.doesNotMatch(block, /preferredContact|accessCode|firebaseUid|uid:/);
});

test("official board movement is official while What's Hot stays deterministic and decays", () => {
  const cards = pulse.deriveBoardMovement([
    { key: "winning-run:all", categoryId: "winning-run", categoryTitle: "Winning Run", rank: 5, denominator: 8, value: 3, valueLabel: "3 straight" },
  ], [
    { key: "winning-run:all", categoryId: "winning-run", categoryTitle: "Winning Run", rank: 3, denominator: 8, value: 5, valueLabel: "5 straight" },
  ]);
  assert.equal(cards[0].finality, "official");
  assert.match(cards[0].body, /#5 → #3/);

  const now = new Date("2026-08-12T06:00:00.000Z");
  const events = [event("b", "2", "2026-08-12T05:00:00.000Z"), event("a", "1", "2026-08-12T05:00:00.000Z")];
  assert.deepEqual(pulse.rankWhatsHot(events, now).map((item) => item.eventId), pulse.rankWhatsHot([...events].reverse(), now).map((item) => item.eventId));
  assert.equal(pulse.rankWhatsHot([event("old", "1", "2026-08-04T05:00:00.000Z")], now).length, 0);
  const crowded = [
    event("a1", "1", "2026-08-12T05:50:00.000Z", { eventType: "new_leader", rankAfter: 1 }),
    event("a2", "1", "2026-08-12T05:40:00.000Z"),
    event("a3", "1", "2026-08-12T05:30:00.000Z"),
    event("b1", "2", "2026-08-12T05:20:00.000Z"),
    event("c1", "3", "2026-08-12T05:10:00.000Z"),
  ];
  assert.ok(pulse.rankWhatsHot(crowded, now, 8).filter((item) => item.playerId === "1").length <= 2);
});

test("Universe comparison keeps pools separate, latest identity authoritative and fixtures out", () => {
  const boards = pulse.buildActiveUniverseBoards([
    participant("RapidOne", "live", { pools: [{ pool: "rapid", games: 6, start: 800, end: 830, change: 30 }] }),
    participant("BlitzOne", "live", { pools: [{ pool: "blitz", games: 6, start: 900, end: 940, change: 40 }] }),
  ], []);
  assert.ok(boards.some((board) => board.key === "rating-climb:rapid" && board.entries.every((entry) => entry.player === "RapidOne")));
  assert.ok(boards.some((board) => board.key === "rating-climb:blitz" && board.entries.every((entry) => entry.player === "BlitzOne")));

  const live = participant("SamePlayer", "live", { winningRun: 2 });
  const seed = participant("SamePlayer", "seed", { winningRun: 9 });
  const duplicateBoard = pulse.buildActiveUniverseBoards([live], [seed]).find((item) => item.key === "winning-run:all");
  assert.equal(duplicateBoard.entries.filter((entry) => entry.player === "SamePlayer").length, 1);
  assert.equal(duplicateBoard.entries.find((entry) => entry.player === "SamePlayer").value, 2);

  const active = Array.from({ length: 6 }, (_, i) => participant(`Live${i}`, "live", { winningRun: 3 + i }));
  const seededBoard = pulse.buildActiveUniverseBoards(active, [participant("SeedStar", "seed", { winningRun: 20 })]).find((item) => item.key === "winning-run:all");
  assert.equal(seededBoard.fieldLabel, "BOARDSIGNAL FIELD");
  assert.equal(seededBoard.entries.some((entry) => entry.player === "SeedStar"), false);
  assert.equal(universe.deskToUniverseParticipant({ source: "fixture", provenance: { verified: true } }), undefined);
});

test("latest-four memory bounds the active ranking adapter", () => {
  const result = memory.retainLatestFour([1,2,3,4,5].map((n) => ({ deskKey: `d${n}`, periodEnd: `2026-0${n}-07` })));
  assert.deepEqual(result.retained.map((item) => item.deskKey), ["d5", "d4", "d3", "d2"]);
  assert.deepEqual(result.removed.map((item) => item.deskKey), ["d1"]);
  const desks = [1,2,3,4,5].map((n) => ({ deskKey: `d${n}`, periodEnd: `2026-0${n}-07`, participant: participant(`P${n}`, "live", { winningRun: n + 1 }) }));
  const retained = memory.retainLatestFour(desks).retained;
  const board = pulse.buildActiveUniverseBoards(retained.map((item) => item.participant), []).find((item) => item.key === "winning-run:all");
  assert.equal(board.entries.some((entry) => entry.player === "P1"), false);
});

test("public Share Moment route and native-share fallback never require a private Desk", () => {
  assert.equal(pulse.shareMomentUrl("https://boardsignal.example/", "abc_123"), "https://boardsignal.example/share/abc_123");
  assert.match(read("src/components/ShareMomentActions.tsx"), /navigator\.share[\s\S]*navigator\.clipboard\.writeText/);
  const page = read("src/app/share/[momentId]/page.tsx");
  assert.match(page, /loadPublicShareMoment/);
  assert.doesNotMatch(page, /loadPublishedDesks|engineResults|signals\.red|signals\.blue/);
  const moment = pulse.nominateShareMoments(liveDesk(), [])[0];
  for (const field of ["desk", "signals", "candidates", "engineResults"]) assert.equal(field in moment, false);
});

test("share acquisition now enters the Google-first homepage without reviving beta-request UI", () => {
  const tracker = read("src/app/api/boardsignal/share/[momentId]/track/route.ts");
  const client = read("src/components/ShareAttributionClient.tsx");
  const form = read("src/components/UsernameDeskForm.tsx");
  const googleButton = read("src/components/GoogleSignInButton.tsx");
  assert.match(tracker, /share_viewed[\s\S]*share_tapped[\s\S]*cta_clicked/);
  assert.match(client, /type AttributionEvent = "share_viewed" \| "cta_clicked"/);
  assert.match(client, /source: "boardSignalShare"/);
  assert.match(client, /\?source=boardSignalShare&shareMomentId=/);
  assert.match(form, /GoogleSignInButton/);
  assert.match(googleButton, /Continue with Google/);
  assert.doesNotMatch(form, /beta_request_started|beta_request_submitted|CONTINUE PREVIEW/i);
});

test("public artifact validator and communications caps remain intact", () => {
  const safe = event("safe", "1", "2026-08-12T05:00:00.000Z");
  assert.equal(pulse.publicArtifactHasPrivateFields(safe), false);
  assert.equal(pulse.publicArtifactHasPrivateFields({ ...safe, blue: "private" }), true);
  assert.equal(pulse.publicArtifactHasPrivateFields({ ...safe, preferredContactValue: "secret" }), true);

  const now = new Date("2026-08-12T06:00:00.000Z");
  const duplicate = communications.evaluateAutomationPolicy({ eventType: "universe_top3", eventKey: "u:1", episodeKey: "e1", now, previous: [{ eventKey: "u:1", eventType: "universe_top3", episodeKey: "e1", createdAt: now.toISOString() }] });
  assert.equal(duplicate.allowed, false);
  const capped = communications.evaluateAutomationPolicy({ eventType: "universe_top3", eventKey: "u:4", episodeKey: "e1", now, previous: [1,2,3].map((n) => ({ eventKey: `u:${n}`, eventType: "episode_progress", episodeKey: "e1", createdAt: now.toISOString() })) });
  assert.equal(capped.reason, "episode_cap");
});

test("existing Beta Access and Inbox security architecture remain intact", () => {
  assert.equal(fs.existsSync(path.join(root, "src/app/api/auth/beta-access/sign-in/route.ts")), true);
  assert.match(read("src/lib/boardsignal/server/betaAccess.ts"), /ensureStablePlayerAccount/);
  assert.match(read("src/app/api/auth/beta-access/sign-in/route.ts"), /createCustomToken\(account\.uid/);
  assert.equal(fs.existsSync(path.join(root, "src/app/api/boardsignal/inbox/route.ts")), true);
  assert.match(read("firestore.rules"), /match \/inbox\/\{messageId\}[\s\S]*allow read: if isOwner\(userId\)[\s\S]*allow write: if false/);
});

test("deterministic Universe ranking ordering remains intact", () => {
  const boards = universe.buildUniverseBoards([participant("Three", "live", { winningRun: 3 }), participant("Five", "live", { winningRun: 5 })]);
  const win = boards.find((board) => board.key === "winning-run:all");
  assert.deepEqual(win.entries.map((entry) => [entry.player, entry.rank]), [["Five", 1], ["Three", 2]]);
});
