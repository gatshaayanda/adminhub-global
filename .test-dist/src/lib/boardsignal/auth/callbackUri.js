"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHESSCOM_NON_WWW_CALLBACK_URI = exports.CHESSCOM_CANONICAL_CALLBACK_URI = exports.CHESSCOM_CALLBACK_PATH = void 0;
exports.resolveChessComCallbackUri = resolveChessComCallbackUri;
exports.CHESSCOM_CALLBACK_PATH = "/api/auth/chesscom/callback";
exports.CHESSCOM_CANONICAL_CALLBACK_URI = `https://www.adminhub-global.com${exports.CHESSCOM_CALLBACK_PATH}`;
exports.CHESSCOM_NON_WWW_CALLBACK_URI = `https://adminhub-global.com${exports.CHESSCOM_CALLBACK_PATH}`;
const PRODUCTION_ORIGINS = new Set([
    "https://www.adminhub-global.com",
    "https://adminhub-global.com",
]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
/**
 * Accepts only the registered BoardSignal callback route. Production stays on
 * the canonical domain (with the registered apex compatibility variant), while
 * local HTTP origins remain available outside production.
 */
function resolveChessComCallbackUri(configured, nodeEnv = process.env.NODE_ENV) {
    if (!configured?.trim())
        return undefined;
    try {
        const url = new URL(configured.trim());
        if (url.username || url.password || url.search || url.hash || url.pathname !== exports.CHESSCOM_CALLBACK_PATH)
            return undefined;
        if (PRODUCTION_ORIGINS.has(url.origin))
            return `${url.origin}${exports.CHESSCOM_CALLBACK_PATH}`;
        if (nodeEnv !== "production"
            && url.protocol === "http:"
            && LOCAL_HOSTS.has(url.hostname)) {
            return `${url.origin}${exports.CHESSCOM_CALLBACK_PATH}`;
        }
    }
    catch {
        return undefined;
    }
    return undefined;
}
