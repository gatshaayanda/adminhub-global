"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSavedBetaPreviewReturn = loadSavedBetaPreviewReturn;
exports.saveBetaPreviewReturn = saveBetaPreviewReturn;
exports.clearSavedBetaPreviewReturn = clearSavedBetaPreviewReturn;
const activation_1 = require("./activation");
const STORAGE_KEY = "boardsignal-beta-preview-return-v1";
function validRecord(value) {
    if (!value || typeof value !== "object")
        return false;
    const record = value;
    return typeof record.requestId === "string" && /^[A-Za-z0-9_-]{1,180}$/.test(record.requestId)
        && typeof record.canonicalUsername === "string" && record.canonicalUsername.length > 0 && record.canonicalUsername.length <= 80
        && typeof record.statusCredential === "string" && record.statusCredential.length >= 32 && record.statusCredential.length <= 160
        && typeof record.createdAt === "string" && Number.isFinite(Date.parse(record.createdAt))
        && typeof record.expiresAt === "string" && Number.isFinite(Date.parse(record.expiresAt));
}
function loadSavedBetaPreviewReturn(now = Date.now()) {
    if (typeof window === "undefined")
        return undefined;
    try {
        const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
        if (!validRecord(parsed) || Date.parse(parsed.expiresAt) <= now) {
            window.localStorage.removeItem(STORAGE_KEY);
            return undefined;
        }
        return parsed;
    }
    catch {
        window.localStorage.removeItem(STORAGE_KEY);
        return undefined;
    }
}
function saveBetaPreviewReturn(input) {
    if (typeof window === "undefined")
        return undefined;
    const existing = loadSavedBetaPreviewReturn();
    const createdAt = input.createdAt ?? (existing?.requestId === input.requestId ? existing.createdAt : new Date().toISOString());
    if (existing && existing.requestId !== input.requestId && Date.parse(existing.createdAt) > Date.parse(createdAt))
        return existing;
    const expiresAt = input.expiresAt ?? new Date(Date.parse(createdAt) + activation_1.BETA_MAGIC_ACCESS_LIFETIME_MS).toISOString();
    const record = {
        requestId: input.requestId,
        canonicalUsername: input.canonicalUsername.slice(0, 80),
        statusCredential: input.statusCredential,
        createdAt,
        expiresAt,
    };
    if (!validRecord(record))
        return undefined;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return record;
}
function clearSavedBetaPreviewReturn(requestId) {
    if (typeof window === "undefined")
        return;
    if (!requestId) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
    }
    const current = loadSavedBetaPreviewReturn();
    if (!current || current.requestId === requestId)
        window.localStorage.removeItem(STORAGE_KEY);
}
