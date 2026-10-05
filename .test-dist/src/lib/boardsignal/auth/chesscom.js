"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChessComOAuthConfig = getChessComOAuthConfig;
exports.createPkcePair = createPkcePair;
exports.buildChessComAuthorizationUrl = buildChessComAuthorizationUrl;
exports.exchangeChessComCode = exchangeChessComCode;
exports.parseChessComOAuthProfile = parseChessComOAuthProfile;
exports.fetchChessComOAuthProfile = fetchChessComOAuthProfile;
const node_crypto_1 = require("node:crypto");
const account_1 = require("../account");
const callbackUri_1 = require("./callbackUri");
function getChessComOAuthConfig(env = process.env) {
    const status = (0, account_1.getChessComOAuthStatus)(env);
    if (!status.enabled)
        return undefined;
    const redirectUri = (0, callbackUri_1.resolveChessComCallbackUri)(env.CHESSCOM_REDIRECT_URI, env.NODE_ENV);
    if (!redirectUri)
        return undefined;
    return {
        clientId: env.CHESSCOM_CLIENT_ID,
        clientSecret: env.CHESSCOM_CLIENT_SECRET,
        authorizeUrl: env.CHESSCOM_AUTHORIZE_URL,
        tokenUrl: env.CHESSCOM_TOKEN_URL,
        profileUrl: env.CHESSCOM_PROFILE_URL,
        scopes: env.CHESSCOM_SCOPES,
        redirectUri,
        usePkce: env.CHESSCOM_PKCE_ENABLED === "true",
    };
}
function createPkcePair() {
    const verifier = (0, node_crypto_1.randomBytes)(48).toString("base64url");
    const challenge = (0, node_crypto_1.createHash)("sha256").update(verifier).digest("base64url");
    return { verifier, challenge };
}
function buildChessComAuthorizationUrl(config, state, codeChallenge) {
    const url = new URL(config.authorizeUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("scope", config.scopes);
    url.searchParams.set("state", state);
    if (config.usePkce && codeChallenge) {
        url.searchParams.set("code_challenge", codeChallenge);
        url.searchParams.set("code_challenge_method", "S256");
    }
    return url;
}
async function exchangeChessComCode(config, code, codeVerifier) {
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
    });
    if (config.usePkce && codeVerifier)
        body.set("code_verifier", codeVerifier);
    const response = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json();
    if (!response.ok || !payload.access_token) {
        throw new Error(payload.error_description ?? payload.error ?? `Chess.com token exchange returned ${response.status}.`);
    }
    return payload.access_token;
}
function parseChessComOAuthProfile(payload) {
    if (!payload || typeof payload !== "object")
        throw new Error("Chess.com did not return a usable identity profile.");
    const record = payload;
    const playerId = Number(record.player_id ?? record.playerId ?? record.id);
    const canonicalUsername = String(record.username ?? record.user_name ?? "").trim();
    if (!Number.isSafeInteger(playerId) || playerId <= 0 || !canonicalUsername) {
        throw new Error("Chess.com OAuth did not return the stable player ID and canonical username BoardSignal requires.");
    }
    return {
        playerId,
        canonicalUsername,
        avatar: typeof record.avatar === "string" ? record.avatar : undefined,
        profileUrl: typeof record.url === "string" ? record.url : undefined,
    };
}
async function fetchChessComOAuthProfile(config, accessToken) {
    const response = await fetch(config.profileUrl, {
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
        throw new Error(`Chess.com profile request returned ${response.status}.`);
    return parseChessComOAuthProfile(await response.json());
}
