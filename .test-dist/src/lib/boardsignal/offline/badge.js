"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boardSignalBadgingSupported = boardSignalBadgingSupported;
exports.syncBoardSignalAppBadge = syncBoardSignalAppBadge;
exports.clearBoardSignalAppBadge = clearBoardSignalAppBadge;
function boardSignalBadgingSupported() {
    if (typeof navigator === "undefined")
        return false;
    const badgeNavigator = navigator;
    return typeof badgeNavigator.setAppBadge === "function" && typeof badgeNavigator.clearAppBadge === "function";
}
async function syncBoardSignalAppBadge(unreadCount) {
    if (!boardSignalBadgingSupported())
        return false;
    const badgeNavigator = navigator;
    if (unreadCount > 0)
        await badgeNavigator.setAppBadge?.(Math.min(99, Math.max(1, Math.floor(unreadCount))));
    else
        await badgeNavigator.clearAppBadge?.();
    return true;
}
async function clearBoardSignalAppBadge() {
    if (!boardSignalBadgingSupported())
        return false;
    await navigator.clearAppBadge?.();
    return true;
}
