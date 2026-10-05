"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const processor_1 = require("../src/lib/boardsignal/processor");
const interpretation_1 = require("../src/lib/boardsignal/interpretation");
const quality_1 = require("../src/lib/boardsignal/quality");
const snoopy_1 = require("../src/lib/boardsignal/fixtures/snoopy");
function fixture() {
    return {
        source: "live",
        provenance: { verified: true, sourceLabel: "Synthetic engine fixture", fixtureId: "core-fixture" },
        player: { requestedUsername: "player", username: "player", playerId: 1 },
        period: { start: "2026-08-03", end: "2026-08-09", label: "3–9 August 2026", isLastActive: false, latestCompletedLabel: "3–9 August 2026" },
        episodeKey: "1:2026-08-03:2026-08-09",
        cadence: { anchorStart: "2026-08-03", nextStart: "2026-08-10", nextEnd: "2026-08-16", nextAvailableOn: "2026-08-17" },
        games: 4, wins: 2, losses: 2, draws: 0, score: 50,
        headline: "A four-game week.", summary: "Four games supplied one supported correction.",
        longestWinStreak: 2, longestLossStreak: 2, sessions: 2, checkmateWins: 1, timeoutLosses: 0, resignationLosses: 0, primaryPool: "rapid",
        days: [
            { date: "2026-08-03", label: "Mon 3", wins: 1, losses: 1, draws: 0 },
            { date: "2026-08-04", label: "Tue 4", wins: 1, losses: 0, draws: 0 },
            { date: "2026-08-05", label: "Wed 5", wins: 0, losses: 1, draws: 0 },
            { date: "2026-08-06", label: "Thu 6", wins: 0, losses: 0, draws: 0 },
            { date: "2026-08-07", label: "Fri 7", wins: 0, losses: 0, draws: 0 },
            { date: "2026-08-08", label: "Sat 8", wins: 0, losses: 0, draws: 0 },
            { date: "2026-08-09", label: "Sun 9", wins: 0, losses: 0, draws: 0 },
        ],
        pools: [{ pool: "rapid", games: 4, record: "2W · 0D · 2L", firstRecordedRating: 1000, lastRecordedRating: 1008, peak: 1012, low: 994 }],
        openings: [],
        signals: {
            green: { label: "Green · Preserve", title: "Two wins supplied the positive evidence.", copy: "Keep the concrete finishes." },
            amber: { label: "Amber · Monitor", title: "Two losses stayed visible.", copy: "Review the selected positions." },
            red: { label: "Red · Reviewing", title: "Reviewing.", copy: "Reviewing." },
            blue: { label: "Blue · Preparing", title: "Preparing.", copy: "Preparing." },
        },
        candidates: [
            { id: "P01", gameUrl: "https://www.chess.com/game/live/1", opponent: "one", playerColor: "white", result: "loss", reason: "Qh6 allowed Bxh6.", kind: "player-move", motif: "queen-safety", movePlayed: "Qh6", opponentReply: "Bxh6", fenBefore: "4k3/8/8/8/8/8/4K3/7Q w - - 0 1", fenAfter: "4k3/8/7Q/8/8/8/4K3/8 b - - 1 1", reconstruction: "legal" },
            { id: "P02", gameUrl: "https://www.chess.com/game/live/2", opponent: "two", playerColor: "black", result: "loss", reason: "Qxe4 allowed Nxe4.", kind: "player-move", motif: "queen-safety", movePlayed: "Qxe4+", opponentReply: "Nxe4", fenBefore: "4k3/8/8/8/4q3/8/4K3/8 b - - 0 1", fenAfter: "4k3/8/8/8/4q3/8/4K3/8 w - - 1 2", reconstruction: "legal" },
        ],
        caveats: ["Ratings use recorded game boundaries."],
        validation: { gamesReceived: 4, gamesReconstructed: 4, candidatePositions: 2, rulesVersion: "boardsignal-rules-1.0.0" },
    };
}
(0, node_test_1.default)("anchored cadence advances in exact seven-day blocks", () => {
    const period = (0, processor_1.latestCompletedAlignedWeek)("2026-07-05", new Date("2026-08-10T12:00:00Z"));
    strict_1.default.equal(period.start.toISOString().slice(0, 10), "2026-08-02");
    strict_1.default.equal(period.end.toISOString().slice(0, 10), "2026-08-08");
});
(0, node_test_1.default)("playable resignation requires an engine evaluation, not a termination count", () => {
    const candidate = { ...fixture().candidates[0], kind: "resignation", fenAfter: undefined };
    const reviewed = (0, interpretation_1.finalizeEngineResult)(candidate, { id: candidate.id, depth: 12, beforeCp: -85 });
    strict_1.default.equal(reviewed.classification, "playable-resignation");
});
(0, node_test_1.default)("two engine-supported queen misses select a queen-safety Red and Blue", () => {
    const desk = fixture();
    const results = {
        P01: { id: "P01", depth: 12, beforeCp: 400, afterCp: -600, evaluationLossCp: 1000, classification: "major-miss", bestMoveSan: "Qf7" },
        P02: { id: "P02", depth: 12, beforeCp: -100, afterCp: -700, evaluationLossCp: 600, classification: "major-miss", bestMoveSan: "Qe5" },
    };
    const interpreted = (0, interpretation_1.applyEngineInterpretation)(desk, results);
    strict_1.default.equal(interpreted.complete, true);
    strict_1.default.match(interpreted.desk.signals.red.title, /queen vulnerable/i);
    strict_1.default.match(interpreted.desk.signals.blue.title, /Queen landing there/i);
    strict_1.default.equal((0, quality_1.validateDeskForPublication)(interpreted.desk, results).status, "PASS");
});
(0, node_test_1.default)("partial PDF-style placeholders fail publication", () => {
    const desk = fixture();
    desk.source = "fixture";
    desk.provenance = { verified: true, sourceLabel: "Regression fixture", fixtureId: "partial-placeholder" };
    desk.days = [];
    desk.pools[0].firstRecordedRating = undefined;
    desk.signals.amber.copy = "BoardSignal does not turn one week into a permanent claim about the player.";
    const report = (0, quality_1.validateDeskForPublication)(desk);
    strict_1.default.equal(report.status, "FAIL");
    strict_1.default.ok(report.codes.includes("DAILY_TIMELINE_INCOMPLETE"));
    strict_1.default.ok(report.codes.includes("RATING_EVIDENCE_INCOHERENT"));
    strict_1.default.ok(report.codes.includes("INTERNAL_OR_FILLER_COPY_VISIBLE"));
});
(0, node_test_1.default)("one reviewed mistake is evidence, not a behavioural Red diagnosis", () => {
    const desk = fixture();
    const results = {
        P01: { id: "P01", depth: 14, status: "complete", beforeCp: 300, afterCp: -200, evaluationLossCp: 500, classification: "major-miss", bestMoveSan: "Qf7" },
        P02: { id: "P02", depth: 14, status: "complete", beforeCp: -500, afterCp: -520, evaluationLossCp: 20, classification: "supported" },
    };
    const interpreted = (0, interpretation_1.applyEngineInterpretation)(desk, results);
    strict_1.default.equal(interpreted.complete, true);
    strict_1.default.equal(interpreted.desk.signals.red.status, "withheld");
    strict_1.default.equal(interpreted.desk.signals.blue.status, "withheld");
    strict_1.default.match(interpreted.desk.signals.red.title, /No repeated/i);
    strict_1.default.equal((0, quality_1.validateDeskForPublication)(interpreted.desk, results).status, "PASS");
});
(0, node_test_1.default)("engine failure preserves candidates and reports the engine stage truthfully", () => {
    const desk = fixture();
    const results = {
        P01: { id: "P01", depth: 0, status: "failed", failureCode: "ENGINE_UCI_TIMEOUT", failureReason: "Position analysis did not start in time." },
        P02: { id: "P02", depth: 0, status: "failed", failureCode: "ENGINE_UCI_TIMEOUT", failureReason: "Position analysis did not start in time." },
    };
    const interpreted = (0, interpretation_1.applyEngineInterpretation)(desk, results);
    strict_1.default.equal(interpreted.complete, true);
    strict_1.default.equal(interpreted.desk.candidates.length, 2);
    strict_1.default.equal(interpreted.desk.validation?.candidatePositions, 2);
    const report = (0, quality_1.validateDeskForPublication)(interpreted.desk, results);
    strict_1.default.equal(report.status, "FAIL");
    strict_1.default.ok(report.codes.includes("ENGINE_REVIEW_UNAVAILABLE"));
    strict_1.default.ok(report.codes.includes("ENGINE_REVIEW_INCOMPLETE"));
    strict_1.default.ok(!report.codes.includes("POSITION_EVIDENCE_MISSING"));
});
(0, node_test_1.default)("Snoopy-style evidence selects passed-pawn Green, opponent-band Amber, and forcing-reply Red", () => {
    const desk = fixture();
    const expected = snoopy_1.snoopyFixture.expected;
    desk.games = expected.games;
    desk.wins = expected.wins;
    desk.draws = expected.draws;
    desk.losses = expected.losses;
    desk.score = expected.score;
    desk.longestWinStreak = expected.longestWinStreak;
    desk.longestLossStreak = expected.longestLossStreak;
    desk.days = [
        { date: "2026-08-03", label: "Mon 3", wins: 10, draws: 1, losses: 7 },
        { date: "2026-08-04", label: "Tue 4", wins: 8, draws: 1, losses: 6 },
        { date: "2026-08-05", label: "Wed 5", wins: 7, draws: 0, losses: 6 },
        { date: "2026-08-06", label: "Thu 6", wins: 7, draws: 1, losses: 0 },
        { date: "2026-08-07", label: "Fri 7", wins: 7, draws: 1, losses: 6 },
        { date: "2026-08-08", label: "Sat 8", wins: 6, draws: 0, losses: 11 },
        { date: "2026-08-09", label: "Sun 9", wins: 6, draws: 0, losses: 7 },
    ];
    desk.pools = [
        { pool: "rapid", games: 90, record: "44W · 4D · 42L", firstRecordedRating: 1560, lastRecordedRating: 1568, peak: 1610, low: 1542 },
        { pool: "blitz", games: 6, record: "6W · 0D · 0L", firstRecordedRating: 1400, lastRecordedRating: 1450 },
        { pool: "bullet", games: 2, record: "1W · 0D · 1L", firstRecordedRating: 1300, lastRecordedRating: 1300 },
    ];
    desk.strengths = { forcingAdvancedPawnGames: 2, promotionGames: 1, passedPawnConversionGames: 2 };
    desk.opponentBands = [{ pool: "rapid", label: "1600–1699", games: 14, wins: 3, draws: 1, losses: 10, score: 25 }];
    desk.candidates = [
        { ...desk.candidates[0], id: "P01", role: "correction", motif: "forcing-reply", opponent: "Nialn1k" },
        { ...desk.candidates[1], id: "P02", role: "correction", motif: "king-safety", opponent: "NightOfTheRealm25" },
        { ...desk.candidates[0], id: "P03", gameId: "game-3", gameUrl: "https://www.chess.com/game/live/3", role: "correction", motif: "forcing-reply", opponent: "third" },
        { ...desk.candidates[0], id: "P04", gameId: "game-4", gameUrl: "https://www.chess.com/game/live/4", role: "strength", result: "win", reason: "a8=Q promoted a verified passed pawn." },
        { ...desk.candidates[1], id: "P05", gameId: "game-5", gameUrl: "https://www.chess.com/game/live/5", role: "strength", result: "win", reason: "exf7+ advanced a verified passed pawn to the seventh rank." },
    ];
    desk.validation = { gamesReceived: 98, gamesReconstructed: 98, candidatePositions: 5, rulesVersion: "boardsignal-rules-1.0.0" };
    const results = {
        P01: { id: "P01", depth: 14, beforeCp: 40, afterCp: -380, evaluationLossCp: 420, classification: "major-miss" },
        P02: { id: "P02", depth: 14, beforeCp: -20, afterCp: -350, evaluationLossCp: 330, classification: "major-miss" },
        P03: { id: "P03", depth: 14, beforeCp: 90, afterCp: -210, evaluationLossCp: 300, classification: "major-miss" },
        P04: { id: "P04", depth: 14, beforeCp: 700, afterCp: 900, evaluationLossCp: 0, classification: "supported" },
        P05: { id: "P05", depth: 14, beforeCp: 250, afterCp: 400, evaluationLossCp: 0, classification: "supported" },
    };
    const interpreted = (0, interpretation_1.applyEngineInterpretation)(desk, results).desk;
    strict_1.default.match(interpreted.signals.green.title, /Verified passed pawns became forcing weapons/i);
    strict_1.default.match(interpreted.signals.amber.title, /1600–1699 rapid opponents: 3W · 1D · 10L/i);
    strict_1.default.match(interpreted.signals.red.title, /forcing reply/i);
});
