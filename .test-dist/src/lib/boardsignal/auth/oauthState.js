"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newOAuthState = newOAuthState;
exports.sealOAuthState = sealOAuthState;
exports.openOAuthState = openOAuthState;
const node_crypto_1 = require("node:crypto");
function signature(value, secret) {
    return (0, node_crypto_1.createHmac)("sha256", secret).update(value).digest("base64url");
}
function newOAuthState() {
    return (0, node_crypto_1.randomBytes)(24).toString("base64url");
}
function sealOAuthState(payload, secret) {
    if (secret.length < 32)
        throw new Error("BOARDSIGNAL_AUTH_STATE_SECRET must be at least 32 characters.");
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${encoded}.${signature(encoded, secret)}`;
}
function openOAuthState(value, secret, now = Date.now()) {
    const [encoded, supplied] = value.split(".");
    if (!encoded || !supplied)
        return undefined;
    const expected = signature(encoded, secret);
    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(expected);
    if (suppliedBuffer.length !== expectedBuffer.length || !(0, node_crypto_1.timingSafeEqual)(suppliedBuffer, expectedBuffer))
        return undefined;
    try {
        const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
        if (!payload.state || !payload.createdAt || now - payload.createdAt > 10 * 60 * 1000)
            return undefined;
        return payload;
    }
    catch {
        return undefined;
    }
}
