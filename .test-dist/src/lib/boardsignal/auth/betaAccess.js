"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BETA_ACCESS_LOCK_MINUTES = exports.BETA_ACCESS_MAX_FAILED_ATTEMPTS = void 0;
exports.isValidBetaAccessCode = isValidBetaAccessCode;
exports.generateBetaAccessCode = generateBetaAccessCode;
exports.hashBetaAccessCode = hashBetaAccessCode;
exports.createBetaAccessCredential = createBetaAccessCredential;
exports.verifyBetaAccessCode = verifyBetaAccessCode;
exports.evaluateBetaAccessAttempt = evaluateBetaAccessAttempt;
const node_crypto_1 = require("node:crypto");
exports.BETA_ACCESS_MAX_FAILED_ATTEMPTS = 5;
exports.BETA_ACCESS_LOCK_MINUTES = 15;
const ACCESS_CODE_PATTERN = /^BS-[A-Za-z0-9_-]{24,64}$/;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
function isValidBetaAccessCode(value) {
    return ACCESS_CODE_PATTERN.test(value);
}
function generateBetaAccessCode() {
    return `BS-${(0, node_crypto_1.randomBytes)(24).toString("base64url")}`;
}
function hashBetaAccessCode(accessCode, salt) {
    return (0, node_crypto_1.scryptSync)(accessCode, Buffer.from(salt, "base64url"), SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS).toString("base64url");
}
function createBetaAccessCredential(identity, now = new Date(), existing) {
    const accessCode = generateBetaAccessCode();
    const passSalt = (0, node_crypto_1.randomBytes)(18).toString("base64url");
    const timestamp = now.toISOString();
    const record = {
        playerId: identity.playerId,
        canonicalUsername: identity.canonicalUsername,
        passHash: hashBetaAccessCode(accessCode, passSalt),
        passSalt,
        status: "active",
        createdAt: existing?.createdAt ?? timestamp,
        ...(existing ? { resetAt: timestamp } : {}),
        failedAttempts: 0,
    };
    return { accessCode, record };
}
function verifyBetaAccessCode(accessCode, record) {
    if (!isValidBetaAccessCode(accessCode))
        return false;
    const expected = Buffer.from(record.passHash, "base64url");
    const submitted = Buffer.from(hashBetaAccessCode(accessCode, record.passSalt), "base64url");
    return expected.length === submitted.length && (0, node_crypto_1.timingSafeEqual)(expected, submitted);
}
function evaluateBetaAccessAttempt(record, accessCode, now = new Date()) {
    if (record.status === "revoked")
        return { ok: false, code: "BETA_ACCESS_REVOKED" };
    const lockedUntil = record.lockedUntil ? new Date(record.lockedUntil) : undefined;
    if (lockedUntil && Number.isFinite(lockedUntil.getTime()) && lockedUntil.getTime() > now.getTime()) {
        return { ok: false, code: "BETA_ACCESS_LOCKED" };
    }
    if (verifyBetaAccessCode(accessCode, record)) {
        return { ok: true, code: "BETA_ACCESS_ACCEPTED", patch: { failedAttempts: 0, lockedUntil: null } };
    }
    const failuresBeforeAttempt = lockedUntil ? 0 : Math.max(0, record.failedAttempts || 0);
    const failedAttempts = failuresBeforeAttempt + 1;
    if (failedAttempts >= exports.BETA_ACCESS_MAX_FAILED_ATTEMPTS) {
        return {
            ok: false,
            code: "BETA_ACCESS_LOCKED",
            patch: {
                failedAttempts: 0,
                lockedUntil: new Date(now.getTime() + exports.BETA_ACCESS_LOCK_MINUTES * 60_000).toISOString(),
            },
        };
    }
    return { ok: false, code: "BETA_ACCESS_INVALID", patch: { failedAttempts, lockedUntil: null } };
}
