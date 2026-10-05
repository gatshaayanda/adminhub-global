"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BETA_PREVIEW_POLL_MS = exports.BETA_MAGIC_ACCESS_LIFETIME_MS = exports.BETA_MAGIC_ACCESS_TOKEN_BYTES = exports.BETA_PREVIEW_STATUS_TOKEN_BYTES = void 0;
exports.betaPreviewContainsPrivateFields = betaPreviewContainsPrivateFields;
exports.normalizePreviewRatingPool = normalizePreviewRatingPool;
exports.validPreviewContactEmail = validPreviewContactEmail;
exports.BETA_PREVIEW_STATUS_TOKEN_BYTES = 32;
exports.BETA_MAGIC_ACCESS_TOKEN_BYTES = 32;
exports.BETA_MAGIC_ACCESS_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
exports.BETA_PREVIEW_POLL_MS = 25_000;
const FORBIDDEN_PREVIEW_KEYS = [
    "signals", "green", "amber", "red", "blue", "candidates", "evidence", "engineResults", "recurrence", "recurringPatterns",
    "preferredContactValue", "preferredContactMethod", "betaContactConsent", "accessCode", "passHash", "passSalt", "firebaseToken",
    "privateNotes", "privateMessage", "contact", "email", "discord", "telegram",
];
function betaPreviewContainsPrivateFields(value) {
    if (!value || typeof value !== "object")
        return false;
    const queue = [value];
    while (queue.length) {
        const current = queue.pop();
        if (!current || typeof current !== "object")
            continue;
        if (Array.isArray(current)) {
            queue.push(...current);
            continue;
        }
        for (const [key, nested] of Object.entries(current)) {
            const normalized = key.toLowerCase();
            if (FORBIDDEN_PREVIEW_KEYS.some((forbidden) => normalized === forbidden.toLowerCase()))
                return true;
            if (nested && typeof nested === "object")
                queue.push(nested);
        }
    }
    return false;
}
function normalizePreviewRatingPool(value) {
    const pool = String(value ?? "").toLowerCase();
    return pool === "rapid" || pool === "blitz" || pool === "bullet" ? pool : undefined;
}
function validPreviewContactEmail(value) {
    return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
