"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_DELIVERY_TYPES = void 0;
exports.boardSignalMessageLink = boardSignalMessageLink;
exports.isValidBoardSignalEmail = isValidBoardSignalEmail;
exports.accountCanReceiveBoardSignalEmail = accountCanReceiveBoardSignalEmail;
exports.absoluteBoardSignalLink = absoluteBoardSignalLink;
exports.EMAIL_DELIVERY_TYPES = new Set([
    "desk_ready",
    "universe_achievement",
    "beta_update",
    "feedback_request",
    "custom",
]);
function boardSignalMessageLink(type) {
    switch (type) {
        case "desk_ready":
        case "episode_update":
        case "blue_reminder":
            return "/boardsignal/player-room?tab=desk";
        case "universe_achievement":
            return "/boardsignal/player-room?tab=universe";
        case "friend_request":
        case "friend_accepted":
            return "/boardsignal/player-room?tab=friends";
        case "beta_update":
        case "feedback_request":
        case "custom":
            return "/boardsignal/player-room?tab=inbox";
    }
}
function isValidBoardSignalEmail(value) {
    if (typeof value !== "string")
        return false;
    const email = value.trim();
    if (!email || email.length > 254 || /\s/.test(email))
        return false;
    return /^[^@]+@[^@]+\.[^@]+$/.test(email);
}
function accountCanReceiveBoardSignalEmail(account, type) {
    if (!exports.EMAIL_DELIVERY_TYPES.has(type))
        return false;
    if (account.betaContactConsent !== true)
        return false;
    if (account.preferredContactMethod !== "email")
        return false;
    if (!isValidBoardSignalEmail(account.preferredContactValue))
        return false;
    if (account.notificationPreferences?.email !== true)
        return false;
    if (type === "desk_ready" && account.notificationPreferences.deskReady !== true)
        return false;
    if (type === "universe_achievement" && account.notificationPreferences.universeAchievement !== true)
        return false;
    if (["beta_update", "feedback_request", "custom"].includes(type) && account.notificationPreferences.founderUpdates !== true)
        return false;
    return true;
}
function absoluteBoardSignalLink(link) {
    const raw = link?.trim();
    if (!raw)
        return undefined;
    if (/^https:\/\//i.test(raw))
        return raw;
    const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.adminhub-global.com").replace(/\/$/, "");
    return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}
