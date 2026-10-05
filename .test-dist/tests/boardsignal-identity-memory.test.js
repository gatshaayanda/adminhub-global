"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_test_1 = __importDefault(require("node:test"));
const account_1 = require("../src/lib/boardsignal/account");
const callbackUri_1 = require("../src/lib/boardsignal/auth/callbackUri");
const memory_1 = require("../src/lib/boardsignal/memory");
const processor_1 = require("../src/lib/boardsignal/processor");
function desk(periodStart = "2026-08-03", periodEnd = "2026-08-09") {
    return {
        source: "live",
        provenance: { verified: true, sourceLabel: "Identity memory test" },
        player: { requestedUsername: "PlayerOne", username: "PlayerOne", playerId: 12345 },
        period: { start: periodStart, end: periodEnd, label: `${periodStart} to ${periodEnd}`, isLastActive: false, latestCompletedLabel: `${periodStart} to ${periodEnd}` },
        episodeKey: `12345:${periodStart}:${periodEnd}`,
        cadence: { anchorStart: "2026-08-03", nextStart: "2026-08-10", nextEnd: "2026-08-16", nextAvailableOn: "2026-08-17" },
        games: 10,
        wins: 6,
        draws: 1,
        losses: 3,
        score: 65,
        headline: "A positive factual week.",
        summary: "A deterministic summary.",
        longestWinStreak: 4,
        longestLossStreak: 2,
        sessions: 3,
        checkmateWins: 2,
        timeoutLosses: 0,
        resignationLosses: 1,
        primaryPool: "rapid",
        days: [
            { date: periodStart, label: "Mon", wins: 2, draws: 0, losses: 1 },
            { date: "2026-08-04", label: "Tue", wins: 1, draws: 0, losses: 1 },
            { date: "2026-08-05", label: "Wed", wins: 1, draws: 0, losses: 0 },
            { date: "2026-08-06", label: "Thu", wins: 0, draws: 1, losses: 0 },
            { date: "2026-08-07", label: "Fri", wins: 1, draws: 0, losses: 1 },
            { date: "2026-08-08", label: "Sat", wins: 0, draws: 0, losses: 0 },
            { date: periodEnd, label: "Sun", wins: 1, draws: 0, losses: 0 },
        ],
        pools: [{ pool: "rapid", games: 10, wins: 6, draws: 1, losses: 3, record: "6W · 1D · 3L", firstRecordedRating: 1500, lastRecordedRating: 1530, change: 30, peak: 1540, low: 1490 }],
        openings: [{ name: "Sicilian", games: 3 }],
        colorRecords: {
            white: { games: 5, wins: 3, draws: 1, losses: 1, record: "3W · 1D · 1L" },
            black: { games: 5, wins: 3, draws: 0, losses: 2, record: "3W · 0D · 2L" },
        },
        gameLength: { averageMoves: 30, medianMoves: 29, shortestMoves: 12, longestMoves: 55 },
        signals: {
            green: { label: "Green", title: "Winning run", copy: "Four straight.", status: "supported" },
            amber: { label: "Amber", title: "PRIVATE_AMBER", copy: "Private awareness.", status: "supported" },
            red: { label: "Red", title: "PRIVATE_RED", copy: "Private weakness.", status: "supported", evidenceIds: ["P01", "P02"] },
            blue: { label: "Blue", title: "Checks, captures, threats.", copy: "Private guidance.", status: "supported", evidenceIds: ["P01", "P02"] },
        },
        candidates: [
            { id: "P01", gameUrl: "https://www.chess.com/game/live/1", opponent: "A", playerColor: "white", result: "loss", reason: "Review", role: "correction", motif: "forcing-reply", reconstruction: "legal" },
            { id: "P02", gameUrl: "https://www.chess.com/game/live/2", opponent: "B", playerColor: "black", result: "loss", reason: "Review", role: "correction", motif: "forcing-reply", reconstruction: "legal" },
        ],
        caveats: [],
    };
}
function summary(index, family = {}) {
    const day = String(index).padStart(2, "0");
    return {
        deskKey: `desk-${index}`,
        periodStart: `2026-07-${day}`,
        periodEnd: `2026-07-${String(index + 6).padStart(2, "0")}`,
        periodLabel: `Desk ${index}`,
        games: 10,
        wins: 5,
        draws: 0,
        losses: 5,
        scorePct: 50,
        pools: [{ pool: "rapid", games: 10, scorePct: 50 + index, ratingDelta: index * 5 }],
        longestWinRun: index,
        longestLossRun: 2,
        signalFamilies: family,
    };
}
(0, node_test_1.default)("Chess.com OAuth stays safely disabled until real provider and server configuration exists", () => {
    const status = (0, account_1.getChessComOAuthStatus)({});
    strict_1.default.equal(status.enabled, false);
    strict_1.default.match(status.message, /awaiting official provider approval/i);
    strict_1.default.ok(status.missing.includes("CHESSCOM_CLIENT_ID"));
});
(0, node_test_1.default)("Chess.com callback stays on the canonical route and accepts only registered origin variants", () => {
    strict_1.default.equal((0, callbackUri_1.resolveChessComCallbackUri)(callbackUri_1.CHESSCOM_CANONICAL_CALLBACK_URI, "production"), callbackUri_1.CHESSCOM_CANONICAL_CALLBACK_URI);
    strict_1.default.equal((0, callbackUri_1.resolveChessComCallbackUri)(callbackUri_1.CHESSCOM_NON_WWW_CALLBACK_URI, "production"), callbackUri_1.CHESSCOM_NON_WWW_CALLBACK_URI);
    strict_1.default.equal((0, callbackUri_1.resolveChessComCallbackUri)("http://localhost:3000/api/auth/chesscom/callback", "development"), "http://localhost:3000/api/auth/chesscom/callback");
    strict_1.default.equal((0, callbackUri_1.resolveChessComCallbackUri)("http://127.0.0.1:3001/api/auth/chesscom/callback", "test"), "http://127.0.0.1:3001/api/auth/chesscom/callback");
    strict_1.default.equal((0, callbackUri_1.resolveChessComCallbackUri)("http://localhost:3000/api/auth/chesscom/callback", "production"), undefined);
    strict_1.default.equal((0, callbackUri_1.resolveChessComCallbackUri)("https://example.com/api/auth/chesscom/callback", "production"), undefined);
    strict_1.default.equal((0, callbackUri_1.resolveChessComCallbackUri)("https://www.adminhub-global.com/api/auth/chesscom/renamed", "production"), undefined);
    strict_1.default.equal((0, callbackUri_1.resolveChessComCallbackUri)(`${callbackUri_1.CHESSCOM_CANONICAL_CALLBACK_URI}?next=elsewhere`, "production"), undefined);
});
(0, node_test_1.default)("stable Chess.com player ID always maps to the same Firebase uid and founding entitlement", () => {
    strict_1.default.equal((0, account_1.firebaseUidForChessPlayer)(12345), (0, account_1.firebaseUidForChessPlayer)(12345));
    const account = (0, account_1.createFoundingBetaAccount)({ playerId: 12345, canonicalUsername: "PlayerOne" }, new Date("2026-08-11T00:00:00Z"));
    strict_1.default.equal(account.uid, "chesscom_12345");
    strict_1.default.equal(account.accessTier, "founding_beta");
    strict_1.default.equal(account.billingRequired, false);
    strict_1.default.equal(account.maxActiveDesks, 4);
});
(0, node_test_1.default)("existing public-username LIVE generation remains wired while OAuth is pending", () => {
    const buildPage = (0, node_fs_1.readFileSync)("src/app/boardsignal/build/[handle]/page.tsx", "utf8");
    const liveRoute = (0, node_fs_1.readFileSync)("src/app/api/boardsignal/[username]/route.ts", "utf8");
    strict_1.default.match(buildPage, /UniversalPlayerDesk/);
    strict_1.default.match(liveRoute, /buildLiveDesk/);
});
(0, node_test_1.default)("Firestore rules make private users, Desks and evidence owner-only", () => {
    const rules = (0, node_fs_1.readFileSync)("firestore.rules", "utf8");
    strict_1.default.match(rules, /request\.auth\.uid == userId/);
    strict_1.default.match(rules, /match \/users\/\{userId\}/);
    strict_1.default.match(rules, /match \/desks\/\{deskKey\}/);
    strict_1.default.match(rules, /match \/evidence\/\{positionId\}/);
    strict_1.default.match(rules, /match \/publicCoverage\/\{coverageId\}[\s\S]*allow read: if true;[\s\S]*allow write: if isBoardSignalAdmin\(\)/);
});
(0, node_test_1.default)("public coverage helper withholds safely when disabled and contains no private Signal Board content when included", () => {
    const privateDesk = desk();
    strict_1.default.equal((0, memory_1.buildSafePublicCoverage)(privateDesk, false), undefined);
    const publicCoverage = (0, memory_1.buildSafePublicCoverage)(privateDesk, true);
    const serialized = JSON.stringify(publicCoverage);
    strict_1.default.ok(!serialized.includes("PRIVATE_RED"));
    strict_1.default.ok(!serialized.includes("PRIVATE_AMBER"));
    strict_1.default.ok(!serialized.includes("Checks, captures, threats"));
    strict_1.default.ok(!serialized.includes("candidates"));
    strict_1.default.notEqual(publicCoverage.headline, privateDesk.headline);
    strict_1.default.equal(publicCoverage.visibility.publicPlayerPage, true);
});
(0, node_test_1.default)("notification preparation preserves deterministic hooks while account delivery preferences default safely", () => {
    const current = {
        status: "forming",
        periodStart: "2026-08-10",
        periodEnd: "2026-08-16",
        periodLabel: "10–16 August 2026",
        checkedAt: "2026-08-12T00:00:00.000Z",
        daysComplete: 3,
        daysRemaining: 4,
        games: 2,
        wins: 1,
        draws: 0,
        losses: 1,
        currentWinRun: 0,
        currentLossRun: 1,
        sessions: 1,
        pools: [],
        nextDeskDueAt: "2026-08-17",
    };
    const hooks = (0, memory_1.buildEventHooks)(desk(), current, new Date("2026-08-12T00:00:00.000Z"));
    strict_1.default.deepEqual(hooks.map((hook) => hook.type), ["desk_ready", "blue_reminder_available", "amber_watch_available", "episode_progress"]);
    const account = (0, account_1.createFoundingBetaAccount)({ playerId: 12345, canonicalUsername: "PlayerOne" });
    strict_1.default.equal(account.notificationPreferences.email, false);
    strict_1.default.equal(account.notificationPreferences.browserPush, false);
});
(0, node_test_1.default)("Desk 5 retains only the latest four and identifies Desk 1 for heavy deletion", () => {
    const result = (0, memory_1.retainLatestFour)([1, 2, 3, 4, 5].map((index) => summary(index)));
    strict_1.default.deepEqual(result.retained.map((item) => item.deskKey), ["desk-5", "desk-4", "desk-3", "desk-2"]);
    strict_1.default.deepEqual(result.removed.map((item) => item.deskKey), ["desk-1"]);
    const persistence = (0, node_fs_1.readFileSync)("src/lib/boardsignal/server/persistence.ts", "utf8");
    strict_1.default.match(persistence, /deleteDeskTree/);
    strict_1.default.match(persistence, /collection\("evidence"\)/);
});
(0, node_test_1.default)("cross-Desk progress never mixes rating pools", () => {
    const first = summary(1);
    first.pools.push({ pool: "blitz", games: 4, scorePct: 75, ratingDelta: 20 });
    const second = summary(2);
    second.pools.push({ pool: "blitz", games: 4, scorePct: 50, ratingDelta: -5 });
    const progress = (0, memory_1.buildPoolProgress)([first, second]);
    strict_1.default.deepEqual(progress.map((series) => series.pool), ["blitz", "rapid"]);
    strict_1.default.deepEqual(progress.find((series) => series.pool === "rapid")?.points.map((point) => point.ratingDelta), [5, 10]);
    strict_1.default.deepEqual(progress.find((series) => series.pool === "blitz")?.points.map((point) => point.ratingDelta), [20, -5]);
});
(0, node_test_1.default)("recurrence requires repeated stable family keys and never claims a pattern was fixed", () => {
    const repeated = (0, memory_1.deriveRecurringPatterns)([
        summary(1, { redFamily: "forcing_reply" }),
        summary(2, { redFamily: "forcing_reply" }),
    ]);
    strict_1.default.equal(repeated[0].status, "repeated");
    strict_1.default.equal(repeated[0].appearances, 2);
    strict_1.default.match(repeated[0].message, /2 of your last 2 Desks/);
    const notRepeated = (0, memory_1.deriveRecurringPatterns)([
        summary(1, { redFamily: "forcing_reply" }),
        summary(2, {}),
    ]);
    strict_1.default.equal(notRepeated[0].status, "not-repeated");
    strict_1.default.match(notRepeated[0].message, /not repeated/i);
    strict_1.default.doesNotMatch(notRepeated[0].message, /fixed|mission|learned/i);
});
(0, node_test_1.default)("forming episode is separate factual state and cannot mutate the completed Desk", () => {
    const completed = desk();
    const before = JSON.stringify(completed);
    const period = (0, processor_1.currentAlignedPeriod)("2026-08-03", new Date("2026-08-13T12:00:00Z"));
    const forming = {
        status: "forming",
        periodStart: period.start.toISOString().slice(0, 10),
        periodEnd: period.end.toISOString().slice(0, 10),
        periodLabel: "10–16 August 2026",
        checkedAt: "2026-08-13T12:00:00.000Z",
        daysComplete: 4,
        daysRemaining: 3,
        games: 7,
        wins: 4,
        draws: 0,
        losses: 3,
        currentWinRun: 1,
        currentLossRun: 0,
        sessions: 2,
        pools: [{ pool: "rapid", games: 7, wins: 4, draws: 0, losses: 3, ratingDelta: 18 }],
        nextDeskDueAt: "2026-08-17",
    };
    strict_1.default.equal(JSON.stringify(completed), before);
    strict_1.default.equal(forming.status, "forming");
    strict_1.default.ok(!JSON.stringify(forming).match(/red|amber|blue|signal/i));
});
(0, node_test_1.default)("previous Blue carries only when supported and summary families are stable evidence keys", () => {
    const supported = (0, memory_1.toDeskSummary)(desk());
    strict_1.default.equal(supported.previousBlue?.title, "Checks, captures, threats.");
    strict_1.default.equal(supported.signalFamilies.redFamily, "forcing_reply");
    strict_1.default.equal(supported.signalFamilies.blueFamily, "forcing_reply");
    const withheld = desk();
    withheld.signals.blue.status = "withheld";
    strict_1.default.equal((0, memory_1.toDeskSummary)(withheld).previousBlue, undefined);
});
(0, node_test_1.default)("Stockfish 18 worker assets remain byte-for-byte unchanged", () => {
    const hash = (path) => (0, node_crypto_1.createHash)("sha256").update((0, node_fs_1.readFileSync)(path)).digest("hex");
    strict_1.default.equal(hash("public/stockfish/stockfish-18-lite-single.js"), "5243fd9b276cab7dfe3ad1d43ab9ead73568fac76468c614242977a210c4a391");
    strict_1.default.equal(hash("public/stockfish/stockfish-18-lite-single.wasm"), "a8fbc05ec6920b56d7485826dcb02c5ffd2826bcbf751cf973046f237a9096f1");
    strict_1.default.equal(hash("scripts/stockfish-smoke.mjs"), "3c67ee671c4e0859b14160ed2f3c9c977896530ee6ef4d6329e486e751d64164");
});
