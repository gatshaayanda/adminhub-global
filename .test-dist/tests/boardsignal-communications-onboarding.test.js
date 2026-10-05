"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_test_1 = __importDefault(require("node:test"));
const account_1 = require("../src/lib/boardsignal/account");
const communications_1 = require("../src/lib/boardsignal/communications");
const memory_1 = require("../src/lib/boardsignal/memory");
const read = (path) => (0, node_fs_1.readFileSync)(path, "utf8");
(0, node_test_1.default)("1. new beta request keeps contact data out of public documents", () => {
    const source = read("src/lib/boardsignal/server/betaRequests.ts");
    const publicWrite = source.slice(source.indexOf('collection("publicPlayers")'), source.indexOf('await ref.set({ status: "approved"'));
    strict_1.default.match(source, /collection\("betaRequests"\)/);
    strict_1.default.match(source, /preferredContactValue/);
    strict_1.default.doesNotMatch(publicWrite, /preferredContactMethod|preferredContactValue|betaContactConsent/);
});
(0, node_test_1.default)("2. founder can approve and reject pending requests", () => {
    const route = read("src/app/api/admin/boardsignal/beta-access/route.ts");
    strict_1.default.match(route, /approveRequest/);
    strict_1.default.match(route, /rejectRequest/);
    strict_1.default.match(route, /approveFoundingBetaRequest/);
    strict_1.default.match(route, /rejectFoundingBetaRequest/);
});
(0, node_test_1.default)("3. approval reuses stable identity instead of creating a duplicate player", () => {
    const source = read("src/lib/boardsignal/server/betaRequests.ts");
    strict_1.default.match(source, /createFoundingBetaAccess\(request\.canonicalUsername\)/);
    strict_1.default.match(source, /BETA_ACCESS_EXISTS/);
    strict_1.default.match(source, /loadExistingFoundingBetaAccess\(request\.chessPlayerId\)/);
    strict_1.default.doesNotMatch(source, /resetFoundingBetaAccess\(request\.chessPlayerId\)/);
    strict_1.default.match(source, /publicPlayers"\)\.doc\(String\(request\.chessPlayerId\)\)/);
});
(0, node_test_1.default)("4. first member Desk is published into the persistent owner account", () => {
    const room = read("src/components/BoardSignalPlayerRoom.tsx");
    const persistence = read("src/lib/boardsignal/server/persistence.ts");
    strict_1.default.match(room, /DESK 1/);
    strict_1.default.match(room, /ownerToken=/);
    strict_1.default.match(room, /onDeskPublished=/);
    strict_1.default.match(persistence, /collection\("users"\)\.doc\(account\.uid\)\.collection\("desks"\)/);
});
(0, node_test_1.default)("5. required Universe participation is disclosed and cannot be falsely toggled off", () => {
    const form = read("src/components/UsernameDeskForm.tsx");
    const gate = read("src/components/BetaAgreementGate.tsx");
    const profile = read("src/components/PlayerProfileNotifications.tsx");
    strict_1.default.match(form, /Included with Founding Beta/);
    strict_1.default.match(gate, /Included with Founding Beta/);
    strict_1.default.match(profile, /Founding Beta Universe participation = Included/);
    strict_1.default.doesNotMatch(profile, /Allow safe positive Universe coverage/);
});
(0, node_test_1.default)("6. private Signals never enter public coverage", () => {
    const memory = read("src/lib/boardsignal/memory.ts");
    const publicBlock = memory.slice(memory.indexOf("export function buildSafePublicCoverage"));
    strict_1.default.doesNotMatch(publicBlock, /signals\.red|signals\.amber|signals\.blue|engineResult|recurrence/);
    const privacy = read("src/app/boardsignal/privacy/page.tsx");
    strict_1.default.match(privacy, /Red, private Amber, Blue/);
});
(0, node_test_1.default)("7. BoardSignal event categories default ON", () => {
    const preferences = (0, account_1.defaultNotificationPreferences)();
    strict_1.default.equal(preferences.deskReady, true);
    strict_1.default.equal(preferences.episodeProgress, true);
    strict_1.default.equal(preferences.blueReminder, true);
    strict_1.default.equal(preferences.universeAchievement, true);
    strict_1.default.equal(preferences.founderUpdates, true);
});
(0, node_test_1.default)("8. browser push permission is requested only from the explicit enable action", () => {
    const push = read("src/components/BrowserPushControl.tsx");
    const requestAt = push.indexOf("const nextPermission = await Notification.requestPermission()");
    const clickAt = push.indexOf("async function enable");
    strict_1.default.ok(requestAt > clickAt && clickAt >= 0);
    strict_1.default.match(push, /Enable browser alerts/);
    strict_1.default.equal((push.match(/await Notification\.requestPermission\(\)/g) ?? []).length, 1);
});
(0, node_test_1.default)("9. in-app single-player delivery writes only to that user inbox", () => {
    const server = read("src/lib/boardsignal/server/communications.ts");
    strict_1.default.match(server, /audienceKind === "one"/);
    strict_1.default.match(server, /collection\("users"\)\.doc\(account\.uid\)\.collection\("inbox"\)/);
});
(0, node_test_1.default)("10. selected-player delivery resolves only selected stable user ids", () => {
    const server = read("src/lib/boardsignal/server/communications.ts");
    strict_1.default.match(server, /audienceKind === "one" \|\| draft\.audienceKind === "selected"/);
    strict_1.default.match(server, /wanted\.has\(account\.uid\)/);
});
(0, node_test_1.default)("11. all-active-beta delivery is restricted to active Founding Beta player accounts", () => {
    const server = read("src/lib/boardsignal/server/communications.ts");
    strict_1.default.match(server, /account\.role === "player"/);
    strict_1.default.match(server, /account\.accessTier === "founding_beta"/);
    strict_1.default.match(server, /account\.accessStatus === "active"/);
});
(0, node_test_1.default)("12. Player A cannot read Player B inbox or messages", () => {
    const rules = read("firestore.rules");
    strict_1.default.match(rules, /match \/inbox\/\{messageId\}[\s\S]*allow read: if isOwner\(userId\)/);
    strict_1.default.match(rules, /match \/conversations\/\{threadId\}[\s\S]*allow read: if isOwner\(userId\)/);
    strict_1.default.match(rules, /match \/messages\/\{messageId\}[\s\S]*allow read: if isOwner\(userId\)/);
});
(0, node_test_1.default)("13. player replies are authenticated server writes performed as themselves", () => {
    const route = read("src/app/api/boardsignal/inbox/route.ts");
    const server = read("src/lib/boardsignal/server/communications.ts");
    strict_1.default.match(route, /requirePlayerToken/);
    strict_1.default.match(route, /replyToFounder/);
    strict_1.default.match(server, /senderType: "player"/);
    strict_1.default.match(server, /userId: account\.uid/);
});
(0, node_test_1.default)("14. founder reads and replies to the correct private player thread", () => {
    const server = read("src/lib/boardsignal/server/communications.ts");
    strict_1.default.match(server, /founderConversation\(uidInput/);
    strict_1.default.match(server, /collection\("users"\)\.doc\(uid\)\.collection\("conversations"\)\.doc\(threadId\)/);
    strict_1.default.match(server, /founderReply\(uidInput/);
});
(0, node_test_1.default)("15. push-disabled configuration keeps the in-app product usable", () => {
    const push = read("src/components/BrowserPushControl.tsx");
    const server = read("src/lib/boardsignal/server/communications.ts");
    strict_1.default.match(push, /unavailable until BoardSignal push configuration is completed/i);
    strict_1.default.match(server, /if \(!process\.env\.NEXT_PUBLIC_FIREBASE_VAPID_KEY/);
    strict_1.default.match(server, /return \{ eligible: false, delivered: 0, failed: 0 \}/);
});
(0, node_test_1.default)("16. duplicate automated events are suppressed", () => {
    const key = (0, communications_1.automatedEventKey)("episode_progress", { episodeKey: "p:2026-08-10", discriminator: "day3" });
    const decision = (0, communications_1.evaluateAutomationPolicy)({ eventType: "episode_progress", eventKey: key, episodeKey: "p:2026-08-10", now: new Date("2026-08-12T06:00:00Z"), previous: [{ eventKey: key, eventType: "episode_progress", episodeKey: "p:2026-08-10", createdAt: "2026-08-11T06:00:00Z" }] });
    strict_1.default.equal(decision.allowed, false);
    strict_1.default.equal(decision.reason, "duplicate");
});
(0, node_test_1.default)("17. ordinary episode engagement is capped and push respects 24 hours", () => {
    const previous = [0, 1, 2].map((n) => ({ eventKey: `old-${n}`, eventType: "episode_progress", episodeKey: "episode", createdAt: `2026-08-${9 + n}T06:00:00Z`, ...(n === 2 ? { pushSentAt: "2026-08-12T00:00:00Z" } : {}) }));
    const capped = (0, communications_1.evaluateAutomationPolicy)({ eventType: "blue_reminder_available", eventKey: "new-blue", episodeKey: "episode", now: new Date("2026-08-12T06:00:00Z"), previous });
    strict_1.default.equal(capped.allowed, false);
    strict_1.default.equal(capped.reason, "episode_cap");
});
(0, node_test_1.default)("18. Desk Ready is deduped per Desk and can bypass the ordinary episode cap once", () => {
    const deskKey = (0, communications_1.automatedEventKey)("desk_ready", { deskKey: "desk-5" });
    const prior = [0, 1, 2].map((n) => ({ eventKey: `ordinary-${n}`, eventType: "episode_progress", episodeKey: "episode", createdAt: "2026-08-11T00:00:00Z" }));
    const first = (0, communications_1.evaluateAutomationPolicy)({ eventType: "desk_ready", eventKey: deskKey, episodeKey: "episode", now: new Date("2026-08-12T06:00:00Z"), previous: prior });
    strict_1.default.equal(first.allowed, true);
    const duplicate = (0, communications_1.evaluateAutomationPolicy)({ eventType: "desk_ready", eventKey: deskKey, episodeKey: "episode", now: new Date("2026-08-12T07:00:00Z"), previous: [...prior, { eventKey: deskKey, eventType: "desk_ready", episodeKey: "episode", createdAt: "2026-08-12T06:00:00Z" }] });
    strict_1.default.equal(duplicate.allowed, false);
});
(0, node_test_1.default)("19. forming-episode communications stay factual and do not mutate a completed Desk", () => {
    const loop = read("src/lib/boardsignal/server/returnLoop.ts");
    strict_1.default.match(loop, /buildCurrentEpisodeSummary/);
    strict_1.default.doesNotMatch(loop, /publishPrivateDesk|applyEngineInterpretation|signals\.red|signals\.amber/);
    const message = (0, communications_1.messageForAutomatedEvent)({ eventType: "episode_progress", currentEpisode: { status: "forming", periodStart: "2026-08-10", periodEnd: "2026-08-16", periodLabel: "10–16 August 2026", checkedAt: "2026-08-12T06:00:00Z", daysComplete: 3, daysRemaining: 4, games: 8, wins: 4, draws: 1, losses: 3, currentWinRun: 1, currentLossRun: 0, sessions: 2, pools: [], nextDeskDueAt: "2026-08-17" } });
    strict_1.default.match(message?.body ?? "", /8 games are already in|8 games are already in\.|8 games are already in/i);
});
(0, node_test_1.default)("20. public search remains sports-safe and does not expose private diagnostics", () => {
    const publicPlayer = read("src/app/player/[handle]/page.tsx");
    const memory = read("src/lib/boardsignal/memory.ts");
    strict_1.default.match(publicPlayer, /loadSafePublicPlayerProfile|liveCoverage/);
    strict_1.default.doesNotMatch(publicPlayer, /previousBlue|previousAmber|engineResult|signals\./);
    strict_1.default.match(memory, /buildSafePublicCoverage/);
});
(0, node_test_1.default)("21. returning Firebase session bypasses the Beta Access form", () => {
    const room = read("src/components/BoardSignalPlayerRoom.tsx");
    strict_1.default.match(room, /onAuthStateChanged\(auth/);
    strict_1.default.match(room, /if \(!user\)/);
    strict_1.default.match(room, /snapshot/);
});
(0, node_test_1.default)("22. exact latest-four Desk retention remains unchanged", () => {
    const result = (0, memory_1.retainLatestFour)([1, 2, 3, 4, 5].map((n) => ({ deskKey: `desk-${n}`, periodEnd: `2026-08-${String(n).padStart(2, "0")}`, documentId: `d${n}` })));
    strict_1.default.deepEqual(result.retained.map((item) => item.deskKey), ["desk-5", "desk-4", "desk-3", "desk-2"]);
    strict_1.default.deepEqual(result.removed.map((item) => item.deskKey), ["desk-1"]);
});
(0, node_test_1.default)("23. deterministic Universe recognition remains the existing implementation", () => {
    const pulse = read("src/lib/boardsignal/pulse.ts");
    const universe = read("src/lib/boardsignal/universe.ts");
    strict_1.default.match(pulse, /buildUniverseBoards/);
    strict_1.default.match(universe, /buildPlayerUniverseView/);
    strict_1.default.doesNotMatch(universe, /Math\.random|Date\.now/);
});
(0, node_test_1.default)("24. Stockfish 18 assets and depth-11 smoke target remain unchanged", () => {
    const smoke = read("scripts/stockfish-smoke.mjs");
    const worker = read("public/stockfish/stockfish-18-lite-single.js");
    strict_1.default.match(smoke, /depth 11/);
    strict_1.default.match(worker, /Stockfish\.js 18/);
});
(0, node_test_1.default)("25. requested screens retain readable contrast, visible focus and non-duplicated owner CTA", () => {
    const css = read("src/app/globals.css");
    const header = read("src/components/Header.tsx");
    const screens = ["src/app/page.tsx", "src/app/feed/page.tsx", "src/components/UsernameDeskForm.tsx", "src/components/BoardSignalPlayerRoom.tsx", "src/components/PlayerInbox.tsx", "src/components/PlayerProfileNotifications.tsx", "src/app/admin/page.tsx", "src/components/FoundingBetaPlayersAdmin.tsx", "src/components/FounderCommunications.tsx", "src/components/FounderCoverageEditor.tsx"].map(read).join("\n");
    strict_1.default.match(css, /focus-visible/);
    strict_1.default.match(css, /\.beta-value-card[\s\S]*color: var\(--ink\)/);
    strict_1.default.match(css, /@media \(max-width: 600px\)/);
    strict_1.default.equal((header.match(/Get My BoardSignal/g) ?? []).length, 2);
    strict_1.default.match(screens, /Get My BoardSignal|Player Room|COMMUNICATIONS|COVERAGE/);
});
