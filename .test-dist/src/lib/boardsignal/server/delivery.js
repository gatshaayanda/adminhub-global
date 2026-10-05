"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBoardSignalDeliveryStatus = getBoardSignalDeliveryStatus;
exports.getFounderDeliveryStatus = getFounderDeliveryStatus;
exports.accountEmailEligibleWithConfiguration = accountEmailEligibleWithConfiguration;
require("server-only");
const delivery_1 = require("../delivery");
const firebaseAdmin_1 = require("../../../utils/firebaseAdmin");
function getBoardSignalDeliveryStatus() {
    const browserPushConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim());
    const resendKey = Boolean(process.env.RESEND_API_KEY?.trim());
    const emailFrom = Boolean(process.env.BOARDSIGNAL_EMAIL_FROM?.trim());
    return {
        inApp: true,
        browserPushConfigured,
        emailConfigured: resendKey && emailFrom,
        emailProvider: resendKey || emailFrom ? "resend" : "none",
    };
}
async function getFounderDeliveryStatus() {
    const status = getBoardSignalDeliveryStatus();
    const users = await (0, firebaseAdmin_1.getAdminDb)().collection("users").get();
    const accounts = users.docs
        .map((document) => document.data())
        .filter((account) => account.role === "player" && account.accessTier === "founding_beta" && account.accessStatus === "active");
    const tokenCounts = await Promise.all(accounts.map(async (account) => {
        const tokens = await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(account.uid).collection("pushTokens").get().catch(() => undefined);
        return tokens?.size ?? 0;
    }));
    return {
        ...status,
        registeredDevices: tokenCounts.reduce((sum, value) => sum + value, 0),
    };
}
function accountEmailEligibleWithConfiguration(account, type) {
    return getBoardSignalDeliveryStatus().emailConfigured && (0, delivery_1.accountCanReceiveBoardSignalEmail)(account, type);
}
