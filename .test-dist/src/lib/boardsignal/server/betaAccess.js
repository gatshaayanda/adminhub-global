"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateFoundingBetaAccess = authenticateFoundingBetaAccess;
exports.createFoundingBetaAccess = createFoundingBetaAccess;
exports.loadExistingFoundingBetaAccess = loadExistingFoundingBetaAccess;
exports.resetFoundingBetaAccess = resetFoundingBetaAccess;
exports.revokeFoundingBetaAccess = revokeFoundingBetaAccess;
exports.listFounderPlayerIdentities = listFounderPlayerIdentities;
require("server-only");
const betaAccess_1 = require("../auth/betaAccess");
const processor_1 = require("../processor");
const firebaseAdmin_1 = require("../../../utils/firebaseAdmin");
const persistence_1 = require("./persistence");
const publicCoverageRepair_1 = require("./publicCoverageRepair");
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{2,50}$/;
function betaAccessError(code) {
    const status = code === "BETA_ACCESS_LOCKED" ? 429 : code === "BETA_ACCESS_REVOKED" ? 403 : 401;
    const message = code === "BETA_ACCESS_LOCKED"
        ? "Founding Beta Access is temporarily locked after repeated unsuccessful attempts. Try again later or ask BoardSignal for a reset."
        : code === "BETA_ACCESS_REVOKED"
            ? "This Founding Beta Access has been revoked. Ask BoardSignal for a new private access code."
            : "The Chess.com username and private access code did not match an active Founding Beta account.";
    return Object.assign(new Error(message), { status, code });
}
function normalizeUsername(value) {
    const username = value.trim().replace(/^@/, "");
    if (!USERNAME_PATTERN.test(username)) {
        throw Object.assign(new Error("Enter a valid Chess.com username."), { status: 400, code: "INVALID_USERNAME" });
    }
    return username;
}
function validatePlayerId(value) {
    const playerId = Number(value);
    if (!Number.isSafeInteger(playerId) || playerId <= 0) {
        throw Object.assign(new Error("A stable Chess.com player ID is required."), { status: 400, code: "INVALID_PLAYER_ID" });
    }
    return playerId;
}
function clean(value) {
    return JSON.parse(JSON.stringify(value));
}
async function revokeExistingFirebaseSession(uid) {
    const auth = (0, firebaseAdmin_1.getAdminAuth)();
    try {
        await auth.getUser(uid);
        await auth.revokeRefreshTokens(uid);
    }
    catch (error) {
        if (error.code !== "auth/user-not-found")
            throw error;
    }
}
function stableIdentityFromResolved(resolved) {
    if (!Number.isSafeInteger(resolved.playerId) || !resolved.playerId) {
        throw Object.assign(new Error("Chess.com did not return the stable player ID BoardSignal requires."), { status: 422, code: "STABLE_PLAYER_ID_MISSING" });
    }
    return {
        playerId: resolved.playerId,
        canonicalUsername: resolved.username,
        avatar: resolved.avatar,
        profileUrl: resolved.profileUrl,
    };
}
async function authenticateFoundingBetaAccess(usernameInput, accessCodeInput) {
    const username = normalizeUsername(usernameInput);
    const accessCode = accessCodeInput.trim();
    if (!(0, betaAccess_1.isValidBetaAccessCode)(accessCode))
        throw betaAccessError("BETA_ACCESS_INVALID");
    const resolved = await (0, processor_1.resolveChessComPlayer)(username);
    const identity = stableIdentityFromResolved(resolved);
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const accessRef = db.collection("betaAccess").doc(String(identity.playerId));
    const attempt = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(accessRef);
        if (!snapshot.exists)
            return { ok: false, code: "BETA_ACCESS_INVALID" };
        const record = snapshot.data();
        if (record.playerId !== identity.playerId)
            return { ok: false, code: "BETA_ACCESS_INVALID" };
        const result = (0, betaAccess_1.evaluateBetaAccessAttempt)(record, accessCode);
        if (result.patch) {
            transaction.set(accessRef, clean({ ...result.patch, canonicalUsername: identity.canonicalUsername }), { merge: true });
        }
        return result;
    });
    if (!attempt.ok)
        throw betaAccessError(attempt.code);
    const account = await (0, persistence_1.ensureStablePlayerAccount)(identity);
    if (account.accessStatus !== "active") {
        throw Object.assign(new Error("This BoardSignal account is not active."), { status: 403, code: "ACCOUNT_NOT_ACTIVE" });
    }
    return { account, identity };
}
async function createFoundingBetaAccess(usernameInput) {
    const username = normalizeUsername(usernameInput);
    const resolved = await (0, processor_1.resolveChessComPlayer)(username);
    const identity = stableIdentityFromResolved(resolved);
    const account = await (0, persistence_1.ensureStablePlayerAccount)(identity);
    const ref = (0, firebaseAdmin_1.getAdminDb)().collection("betaAccess").doc(String(identity.playerId));
    const existing = await ref.get();
    if (existing.exists) {
        throw Object.assign(new Error("Founding Beta Access already exists for this player. Use Reset Access to issue a new code."), { status: 409, code: "BETA_ACCESS_EXISTS" });
    }
    const credential = (0, betaAccess_1.createBetaAccessCredential)(identity);
    await ref.create(clean(credential.record));
    return { account, accessCode: credential.accessCode };
}
async function loadExistingFoundingBetaAccess(playerIdInput) {
    const playerId = validatePlayerId(playerIdInput);
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const accessRef = db.collection("betaAccess").doc(String(playerId));
    const accessSnapshot = await accessRef.get();
    if (!accessSnapshot.exists) {
        throw Object.assign(new Error("No Founding Beta Access record exists for this player."), { status: 404, code: "BETA_ACCESS_NOT_FOUND" });
    }
    const record = accessSnapshot.data();
    if (record.playerId !== playerId) {
        throw Object.assign(new Error("The Founding Beta Access record does not match this stable player ID."), { status: 409, code: "BETA_ACCESS_IDENTITY_MISMATCH" });
    }
    const mapSnapshot = await db.collection("chessPlayerAccounts").doc(String(playerId)).get();
    const mappedUid = typeof mapSnapshot.data()?.uid === "string" ? String(mapSnapshot.data().uid) : `chesscom_${playerId}`;
    const accountSnapshot = await db.collection("users").doc(mappedUid).get();
    const account = accountSnapshot.data();
    if (!account || account.uid !== mappedUid || account.chessCom?.playerId !== playerId) {
        throw Object.assign(new Error("The existing Founding Beta account could not be loaded for this stable player ID."), { status: 409, code: "BETA_ACCOUNT_NOT_FOUND" });
    }
    // Compatibility path only: reading an existing Beta Access record must never
    // rotate its hash/salt or revoke the player's already-valid Firebase session.
    return { account, record };
}
async function resetFoundingBetaAccess(playerIdInput) {
    const playerId = validatePlayerId(playerIdInput);
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const ref = db.collection("betaAccess").doc(String(playerId));
    const snapshot = await ref.get();
    if (!snapshot.exists)
        throw Object.assign(new Error("No Founding Beta Access record exists for this player."), { status: 404, code: "BETA_ACCESS_NOT_FOUND" });
    const previous = snapshot.data();
    const accountSnapshot = await db.collection("users").doc(`chesscom_${playerId}`).get();
    const account = accountSnapshot.data();
    const identity = account?.chessCom ?? { playerId, canonicalUsername: previous.canonicalUsername };
    const credential = (0, betaAccess_1.createBetaAccessCredential)(identity, new Date(), previous);
    await ref.set(clean(credential.record));
    if (account?.uid)
        await revokeExistingFirebaseSession(account.uid);
    return { account, accessCode: credential.accessCode };
}
async function revokeFoundingBetaAccess(playerIdInput) {
    const playerId = validatePlayerId(playerIdInput);
    const ref = (0, firebaseAdmin_1.getAdminDb)().collection("betaAccess").doc(String(playerId));
    const snapshot = await ref.get();
    if (!snapshot.exists)
        throw Object.assign(new Error("No Founding Beta Access record exists for this player."), { status: 404, code: "BETA_ACCESS_NOT_FOUND" });
    await ref.set({ status: "revoked", failedAttempts: 0, lockedUntil: null }, { merge: true });
    await revokeExistingFirebaseSession(`chesscom_${playerId}`);
    return { playerId, status: "revoked" };
}
async function listFounderPlayerIdentities() {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const [users, access] = await Promise.all([
        db.collection("users").get(),
        db.collection("betaAccess").get(),
    ]);
    const accessByPlayer = new Map(access.docs.map((document) => [document.id, document.data()]));
    const accounts = users.docs
        .map((document) => document.data())
        .filter((account) => account.role === "player" && Number.isSafeInteger(account.chessCom?.playerId));
    return Promise.all(accounts.map(async (account) => {
        const publicHighlights = await (0, publicCoverageRepair_1.inspectSafePublicCoverageForAccount)(account);
        const betaAccess = accessByPlayer.get(String(account.chessCom.playerId));
        const betaAccessStatus = betaAccess?.status ?? "not_created";
        return {
            uid: account.uid,
            username: account.chessCom.canonicalUsername,
            playerId: account.chessCom.playerId,
            avatar: account.chessCom.avatar,
            profileUrl: account.chessCom.profileUrl,
            betaAccessStatus,
            accountStatus: account.accessStatus,
            desksStored: publicHighlights.retainedReviews,
            latestDesk: publicHighlights.latestReview,
            publicHighlights: {
                status: publicHighlights.status,
                retainedReviews: publicHighlights.retainedReviews,
                expectedCoverage: publicHighlights.expectedCoverage,
                liveCoverage: publicHighlights.liveCoverage,
                repairAvailable: publicHighlights.repairAvailable,
            },
            lastSeen: account.lastSeenAt,
            oauthLinked: Boolean(account.chessComOAuthLinkedAt),
            preferredContactMethod: account.betaContactConsent === true ? account.preferredContactMethod : undefined,
            preferredContactValue: account.betaContactConsent === true ? account.preferredContactValue : undefined,
            betaContactConsent: account.betaContactConsent,
            identityStatus: account.identityStatus ?? (account.chessComOAuthLinkedAt ? "oauth_verified" : undefined),
        };
    })).then((rows) => rows.sort((a, b) => a.username.localeCompare(b.username)));
}
