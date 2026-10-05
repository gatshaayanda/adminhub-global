"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDING_BETA_AGREEMENT_VERSION = void 0;
exports.getChessComOAuthStatus = getChessComOAuthStatus;
exports.canonicalPlayerKey = canonicalPlayerKey;
exports.firebaseUidForChessPlayer = firebaseUidForChessPlayer;
exports.defaultNotificationPreferences = defaultNotificationPreferences;
exports.createFoundingBetaAccount = createFoundingBetaAccount;
exports.hasAcceptedCurrentBetaAgreement = hasAcceptedCurrentBetaAgreement;
const callbackUri_1 = require("./auth/callbackUri");
exports.FOUNDING_BETA_AGREEMENT_VERSION = "founding-beta-2026-08-12";
const REQUIRED_CHESSCOM_ENV = [
    "CHESSCOM_CLIENT_ID",
    "CHESSCOM_CLIENT_SECRET",
    "CHESSCOM_AUTHORIZE_URL",
    "CHESSCOM_TOKEN_URL",
    "CHESSCOM_PROFILE_URL",
    "CHESSCOM_SCOPES",
    "CHESSCOM_REDIRECT_URI",
    "BOARDSIGNAL_AUTH_STATE_SECRET",
    "FIREBASE_ADMIN_KEY",
];
function getChessComOAuthStatus(env) {
    const missing = REQUIRED_CHESSCOM_ENV.filter((name) => !env[name]?.trim());
    if (env.CHESSCOM_REDIRECT_URI?.trim()
        && !(0, callbackUri_1.resolveChessComCallbackUri)(env.CHESSCOM_REDIRECT_URI, env.NODE_ENV)) {
        missing.push("CHESSCOM_REDIRECT_URI_REGISTERED_CALLBACK");
    }
    const explicitlyEnabled = env.CHESSCOM_OAUTH_ENABLED === "true";
    const enabled = explicitlyEnabled && missing.length === 0;
    return {
        enabled,
        provider: "chesscom",
        missing,
        message: enabled
            ? "Chess.com account ownership sign-in is configured."
            : explicitlyEnabled
                ? "Chess.com sign-in is unavailable because required provider configuration is incomplete."
                : "Chess.com sign-in is awaiting official provider approval. Founding Beta Access remains available.",
    };
}
function canonicalPlayerKey(identity) {
    return String(identity.playerId);
}
function firebaseUidForChessPlayer(playerId) {
    if (!Number.isSafeInteger(playerId) || playerId <= 0) {
        throw new Error("A stable Chess.com player ID is required.");
    }
    return `chesscom_${playerId}`;
}
function defaultNotificationPreferences() {
    return {
        email: false,
        browserPush: false,
        deskReady: true,
        episodeProgress: true,
        blueReminder: true,
        amberWatch: false,
        universeAchievement: true,
        founderUpdates: true,
    };
}
function createFoundingBetaAccount(identity, now = new Date()) {
    const normalizedUsername = identity.canonicalUsername.trim().toLowerCase();
    return {
        uid: firebaseUidForChessPlayer(identity.playerId),
        role: "player",
        accessTier: "founding_beta",
        accessStatus: "active",
        billingRequired: false,
        maxActiveDesks: 4,
        chessCom: identity,
        privacy: {
            publicPlayerPage: true,
            universeCoverage: true,
            additionalPositiveHighlights: false,
            publicGameLinks: false,
            expandedPublicProfile: false,
        },
        notificationPreferences: defaultNotificationPreferences(),
        lastSeenAt: now.toISOString(),
        eligibleCoverageKeys: [String(identity.playerId), normalizedUsername],
    };
}
function hasAcceptedCurrentBetaAgreement(account) {
    return account.betaAgreementVersion === exports.FOUNDING_BETA_AGREEMENT_VERSION
        && Boolean(account.betaAgreementAcceptedAt);
}
