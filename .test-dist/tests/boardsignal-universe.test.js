"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const universe_1 = require("../src/lib/boardsignal/universe");
function participant(player, pools = [], extra = {}) {
    return {
        id: `seed:${player.toLowerCase()}`,
        player,
        source: "seed",
        verified: true,
        periodLabel: "3–9 August 2026",
        periodEnd: "2026-08-09",
        games: 12,
        score: 55,
        pools,
        coverage: { href: `/feed#${player}`, headline: `${player} positive coverage` },
        ...extra,
    };
}
function desk(username = "new-player", source = "live") {
    return {
        source,
        provenance: { verified: true, sourceLabel: "Universe test" },
        player: { requestedUsername: username, username },
        period: { start: "2026-08-03", end: "2026-08-09", label: "3–9 August 2026", isLastActive: false, latestCompletedLabel: "3–9 August 2026" },
        cadence: { anchorStart: "2026-08-03", nextStart: "2026-08-10", nextEnd: "2026-08-16", nextAvailableOn: "2026-08-17" },
        games: 10,
        wins: 7,
        draws: 0,
        losses: 3,
        score: 70,
        headline: "A positive test Desk.",
        summary: "Only public factual metrics enter recognition.",
        longestWinStreak: 4,
        longestLossStreak: 2,
        sessions: 2,
        checkmateWins: 2,
        timeoutLosses: 0,
        resignationLosses: 0,
        primaryPool: "rapid",
        days: [
            { date: "2026-08-03", label: "Mon 3", wins: 1, draws: 0, losses: 1 },
            { date: "2026-08-04", label: "Tue 4", wins: 0, draws: 0, losses: 0 },
            { date: "2026-08-05", label: "Wed 5", wins: 0, draws: 0, losses: 0 },
            { date: "2026-08-06", label: "Thu 6", wins: 0, draws: 0, losses: 0 },
            { date: "2026-08-07", label: "Fri 7", wins: 0, draws: 0, losses: 0 },
            { date: "2026-08-08", label: "Sat 8", wins: 2, draws: 0, losses: 1 },
            { date: "2026-08-09", label: "Sun 9", wins: 4, draws: 0, losses: 1 },
        ],
        pools: [{ pool: "rapid", games: 10, record: "7W · 0D · 3L", firstRecordedRating: 1700, lastRecordedRating: 1760, change: 60, peak: 1760, low: 1690 }],
        openings: [],
        signals: {
            green: { label: "Green · Preserve", title: "Positive fact", copy: "Positive public-safe fact." },
            amber: { label: "Amber · Monitor", title: "AMBER_PRIVATE_SENTINEL", copy: "Awareness only." },
            red: { label: "Red · Fix first", title: "PRIVATE_RED_SECRET", copy: "Never publish this." },
            blue: { label: "Blue · Carry with you", title: "Checks, captures, forcing threats.", copy: "A short ungraded reminder." },
        },
        candidates: [],
        caveats: [],
    };
}
(0, node_test_1.default)("rating boards remain pool-separated and enforce minimum games", () => {
    const field = [
        participant("RapidOne", [{ pool: "rapid", games: 12, start: 1000, end: 1030, change: 30 }]),
        participant("BulletOne", [{ pool: "bullet", games: 30, start: 1800, end: 1900, change: 100 }]),
        participant("TinySample", [{ pool: "rapid", games: 2, start: 900, end: 1100, change: 200 }]),
    ];
    const climbBoards = (0, universe_1.buildUniverseBoards)(field).filter((board) => board.categoryId === "rating-climb");
    strict_1.default.equal(climbBoards.length, 2);
    strict_1.default.deepEqual(climbBoards.find((board) => board.scopeLabel === "Rapid")?.entries.map((item) => item.player), ["RapidOne"]);
    strict_1.default.deepEqual(climbBoards.find((board) => board.scopeLabel === "Bullet")?.entries.map((item) => item.player), ["BulletOne"]);
    strict_1.default.ok(!JSON.stringify(climbBoards).includes("TinySample"));
});
(0, node_test_1.default)("public recognition exposes only a positive top three", () => {
    const field = [
        participant("A", [], { winningRun: 9 }),
        participant("B", [], { winningRun: 8 }),
        participant("C", [], { winningRun: 7 }),
        participant("D", [], { winningRun: 6 }),
    ];
    const board = (0, universe_1.buildUniverseBoards)(field).find((item) => item.categoryId === "winning-run");
    strict_1.default.deepEqual((0, universe_1.publicTopThree)(board).map((item) => item.player), ["A", "B", "C"]);
    strict_1.default.equal((0, universe_1.publicTopThree)(board).length, 3);
});
(0, node_test_1.default)("all eight achievement categories exist even while an evidence field is forming", () => {
    const groups = (0, universe_1.buildUniverseCategoryGroups)([participant("A", [], { winningRun: 3 })]);
    strict_1.default.equal(groups.length, 8);
    strict_1.default.ok(groups.some((group) => group.id === "best-upset" && group.boards.length === 0));
});
(0, node_test_1.default)("a current LIVE Desk replaces the matching seed only in that player's comparison", () => {
    const current = desk("snoopyissocute", "live");
    const founding = [
        participant("snoopyissocute", [{ pool: "rapid", games: 90, end: 1568 }]),
        participant("Second", [{ pool: "rapid", games: 8, end: 1600 }]),
        participant("Third", [{ pool: "rapid", games: 8, end: 1500 }]),
    ];
    const view = (0, universe_1.buildPlayerUniverseView)(founding, current);
    const rapid = view.standings.find((standing) => standing.categoryId === "rapid-rating-leader");
    strict_1.default.equal(rapid.denominator, 3);
    strict_1.default.equal(rapid.rank, 1);
    strict_1.default.equal(rapid.label, "PODIUM");
});
(0, node_test_1.default)("fixtures never enter recognition and private Signal Board text never enters a Universe participant", () => {
    strict_1.default.equal((0, universe_1.deskToUniverseParticipant)(desk("fixture-player", "fixture")), undefined);
    const publicParticipant = (0, universe_1.deskToUniverseParticipant)(desk("live-player", "live"));
    const serialized = JSON.stringify(publicParticipant);
    strict_1.default.ok(!serialized.includes("PRIVATE_RED_SECRET"));
    strict_1.default.ok(!serialized.includes("AMBER_PRIVATE_SENTINEL"));
});
(0, node_test_1.default)("between-Desk return carries supported Blue and Amber, never Red", () => {
    const previous = desk();
    const loop = (0, universe_1.buildDeskReturnLoop)(previous, []);
    strict_1.default.equal(loop.previousBlue?.title, "Checks, captures, forcing threats.");
    strict_1.default.equal(loop.amberWatch?.title, "AMBER_PRIVATE_SENTINEL");
    strict_1.default.equal(loop.nextDeskDueAt, "2026-08-17");
    strict_1.default.ok(!JSON.stringify(loop).includes("PRIVATE_RED_SECRET"));
    previous.signals.blue.status = "withheld";
    strict_1.default.equal((0, universe_1.buildDeskReturnLoop)(previous).previousBlue, undefined);
});
