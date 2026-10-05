"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_test_1 = __importDefault(require("node:test"));
const account_1 = require("../src/lib/boardsignal/account");
const betaAccess_1 = require("../src/lib/boardsignal/auth/betaAccess");
const playerA = { playerId: 12345, canonicalUsername: "PlayerOne" };
const playerB = { playerId: 67890, canonicalUsername: "PlayerTwo" };
const credentialA = (0, betaAccess_1.createBetaAccessCredential)(playerA, new Date("2026-08-11T12:00:00.000Z"));
const credentialB = (0, betaAccess_1.createBetaAccessCredential)(playerB, new Date("2026-08-11T12:00:00.000Z"));
function applyPatch(record, patch) {
    const next = { ...record, ...(patch ?? {}) };
    if (next.lockedUntil === null)
        delete next.lockedUntil;
    return next;
}
(0, node_test_1.default)("valid Founding Beta Access verifies only the approved stable Chess.com player", () => {
    strict_1.default.equal((0, betaAccess_1.verifyBetaAccessCode)(credentialA.accessCode, credentialA.record), true);
    strict_1.default.equal(credentialA.record.playerId, playerA.playerId);
    strict_1.default.equal(credentialA.record.canonicalUsername, playerA.canonicalUsername);
});
(0, node_test_1.default)("Founding Beta Access and future Chess.com OAuth share the exact stable Firebase uid", () => {
    strict_1.default.equal((0, account_1.firebaseUidForChessPlayer)(credentialA.record.playerId), "chesscom_12345");
    const route = (0, node_fs_1.readFileSync)("src/app/api/auth/beta-access/sign-in/route.ts", "utf8");
    const oauthCallback = (0, node_fs_1.readFileSync)("src/app/api/auth/chesscom/callback/route.ts", "utf8");
    strict_1.default.match(route, /authenticateFoundingBetaAccess/);
    strict_1.default.match(route, /createCustomToken\(account\.uid/);
    strict_1.default.match(oauthCallback, /ensureStablePlayerAccount\(identity\)/);
});
(0, node_test_1.default)("wrong Founding Beta code is rejected", () => {
    const attempt = (0, betaAccess_1.evaluateBetaAccessAttempt)(credentialA.record, credentialB.accessCode, new Date("2026-08-11T12:01:00.000Z"));
    strict_1.default.equal(attempt.ok, false);
    strict_1.default.equal(attempt.code, "BETA_ACCESS_INVALID");
});
(0, node_test_1.default)("revoked Founding Beta code is rejected even when its hash is correct", () => {
    const attempt = (0, betaAccess_1.evaluateBetaAccessAttempt)({ ...credentialA.record, status: "revoked" }, credentialA.accessCode);
    strict_1.default.equal(attempt.ok, false);
    strict_1.default.equal(attempt.code, "BETA_ACCESS_REVOKED");
});
(0, node_test_1.default)("repeated failures produce a temporary lockout that rejects the correct code", () => {
    const now = new Date("2026-08-11T12:00:00.000Z");
    let record = { ...credentialA.record };
    let final = (0, betaAccess_1.evaluateBetaAccessAttempt)(record, credentialB.accessCode, now);
    for (let attempt = 1; attempt < betaAccess_1.BETA_ACCESS_MAX_FAILED_ATTEMPTS; attempt += 1) {
        record = applyPatch(record, final.patch);
        final = (0, betaAccess_1.evaluateBetaAccessAttempt)(record, credentialB.accessCode, now);
    }
    strict_1.default.equal(final.ok, false);
    strict_1.default.equal(final.code, "BETA_ACCESS_LOCKED");
    record = applyPatch(record, final.patch);
    const correctDuringLock = (0, betaAccess_1.evaluateBetaAccessAttempt)(record, credentialA.accessCode, new Date("2026-08-11T12:05:00.000Z"));
    strict_1.default.equal(correctDuringLock.code, "BETA_ACCESS_LOCKED");
});
(0, node_test_1.default)("raw Founding Beta code is never part of the persisted credential record", () => {
    const persisted = JSON.stringify(credentialA.record);
    strict_1.default.ok(!persisted.includes(credentialA.accessCode));
    strict_1.default.deepEqual(Object.keys(credentialA.record).sort(), [
        "canonicalUsername", "createdAt", "failedAttempts", "passHash", "passSalt", "playerId", "status",
    ]);
    strict_1.default.match(credentialA.record.passHash, /^[A-Za-z0-9_-]+$/);
    strict_1.default.notEqual(credentialA.record.passHash, credentialA.accessCode);
});
(0, node_test_1.default)("player A access cannot authenticate against player B record", () => {
    strict_1.default.equal((0, betaAccess_1.verifyBetaAccessCode)(credentialA.accessCode, credentialB.record), false);
    const server = (0, node_fs_1.readFileSync)("src/lib/boardsignal/server/betaAccess.ts", "utf8");
    strict_1.default.match(server, /collection\("betaAccess"\)\.doc\(String\(identity\.playerId\)\)/);
    strict_1.default.match(server, /record\.playerId !== identity\.playerId/);
});
(0, node_test_1.default)("returning Firebase sessions bypass the access form and open My Player Room", () => {
    const room = (0, node_fs_1.readFileSync)("src/components/BoardSignalPlayerRoom.tsx", "utf8");
    const form = (0, node_fs_1.readFileSync)("src/components/FoundingBetaAccessPanel.tsx", "utf8");
    strict_1.default.match(room, /onAuthStateChanged\(auth/);
    strict_1.default.match(room, /if \(!user\)/);
    strict_1.default.match(form, /browserLocalPersistence/);
    strict_1.default.match(room, /Sign out/);
});
(0, node_test_1.default)("public username to LIVE Desk remains available without authentication", () => {
    const buildPage = (0, node_fs_1.readFileSync)("src/app/boardsignal/build/[handle]/page.tsx", "utf8");
    const usernameForm = (0, node_fs_1.readFileSync)("src/components/UsernameDeskForm.tsx", "utf8");
    const liveRoute = (0, node_fs_1.readFileSync)("src/app/api/boardsignal/[username]/route.ts", "utf8");
    strict_1.default.match(buildPage, /UniversalPlayerDesk/);
    strict_1.default.match(usernameForm, /Get My BoardSignal/);
    strict_1.default.doesNotMatch(usernameForm, /Build My Desk/);
    strict_1.default.match(liveRoute, /buildLiveDesk/);
    strict_1.default.doesNotMatch(liveRoute, /requirePlayerToken/);
});
(0, node_test_1.default)("private Player Room remains owner-only and Beta Access records remain server-only", () => {
    const rules = (0, node_fs_1.readFileSync)("firestore.rules", "utf8");
    strict_1.default.match(rules, /function isOwner\(userId\)[\s\S]*request\.auth\.uid == userId/);
    strict_1.default.match(rules, /match \/users\/\{userId\}[\s\S]*allow read, create, update, delete: if isOwner\(userId\)/);
    strict_1.default.match(rules, /match \/betaAccess\/\{playerId\}[\s\S]*allow read, write: if false/);
});
(0, node_test_1.default)("Founder Beta Access management API relies on the existing Basic Auth middleware without double-auth", () => {
    const middleware = (0, node_fs_1.readFileSync)("middleware.ts", "utf8");
    const api = (0, node_fs_1.readFileSync)("src/app/api/admin/boardsignal/beta-access/route.ts", "utf8");
    strict_1.default.match(middleware, /startsWith\('\/api\/admin\/boardsignal\/'\)/);
    strict_1.default.match(middleware, /'\/api\/admin\/boardsignal\/:path\*'/);
    strict_1.default.match(middleware, /Basic realm="Admin Area"/);
    strict_1.default.doesNotMatch(api, /requireFounderBasicAuth/);
    strict_1.default.match(api, /listFounderPlayerIdentities\(\)/);
    strict_1.default.match(api, /createFoundingBetaAccess\(body\.username\)/);
    strict_1.default.match(api, /resetFoundingBetaAccess\(body\.playerId\)/);
    strict_1.default.match(api, /revokeFoundingBetaAccess\(body\.playerId\)/);
    strict_1.default.match(api, /accessCode: result\.accessCode/);
    strict_1.default.match(api, /errorStatus\(error\)/);
});
(0, node_test_1.default)("Founder middleware rejects unauthenticated Beta Access requests and permits valid Founder auth", async () => {
    process.env.ADMIN_PASSWORD = "focused-founder-test-secret";
    const { middleware } = await Promise.resolve().then(() => __importStar(require("../middleware")));
    const request = (authorization) => ({
        nextUrl: { pathname: "/api/admin/boardsignal/beta-access" },
        headers: new Headers(authorization ? { authorization } : undefined),
    });
    const unauthenticated = middleware(request());
    strict_1.default.equal(unauthenticated.status, 401);
    strict_1.default.equal(unauthenticated.headers.get("www-authenticate"), 'Basic realm="Admin Area"');
    const rejected = middleware(request(`Basic ${Buffer.from("founder:wrong-secret").toString("base64")}`));
    strict_1.default.equal(rejected.status, 403);
    const authenticated = middleware(request(`Basic ${Buffer.from("founder:focused-founder-test-secret").toString("base64")}`));
    strict_1.default.equal(authenticated.status, 200);
    strict_1.default.equal(authenticated.headers.get("x-middleware-next"), "1");
});
(0, node_test_1.default)("Beta Access adds no Google, email-password, magic-link, URL-code, or credential logging flow", () => {
    const client = (0, node_fs_1.readFileSync)("src/components/FoundingBetaAccessPanel.tsx", "utf8");
    const route = (0, node_fs_1.readFileSync)("src/app/api/auth/beta-access/sign-in/route.ts", "utf8");
    const combined = `${client}\n${route}`;
    strict_1.default.doesNotMatch(combined, /GoogleAuthProvider|signInWithEmailAndPassword|sendSignInLinkToEmail|magic.?link/i);
    strict_1.default.doesNotMatch(route, /console\.|searchParams|URLSearchParams/);
    strict_1.default.match(client, /method: "POST"/);
    strict_1.default.match(client, /signInWithCustomToken/);
});
