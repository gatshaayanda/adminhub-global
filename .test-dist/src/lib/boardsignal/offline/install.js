"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PWA_DISMISS_MS = exports.PWA_ENGAGED_EVENT = exports.PWA_INSTALL_REQUEST_EVENT = exports.PWA_DISMISSED_KEY = exports.PWA_ENGAGED_KEY = void 0;
exports.isStandaloneBoardSignal = isStandaloneBoardSignal;
exports.isIosInstallCandidate = isIosInstallCandidate;
exports.markBoardSignalPwaEngaged = markBoardSignalPwaEngaged;
exports.installDismissedRecently = installDismissedRecently;
exports.PWA_ENGAGED_KEY = "boardsignal:pwa-engaged-at";
exports.PWA_DISMISSED_KEY = "boardsignal:pwa-install-dismissed-at";
exports.PWA_INSTALL_REQUEST_EVENT = "boardsignal:install-request";
exports.PWA_ENGAGED_EVENT = "boardsignal:pwa-engaged";
exports.PWA_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
function isStandaloneBoardSignal() {
    if (typeof window === "undefined")
        return false;
    return window.matchMedia?.("(display-mode: standalone)").matches || Boolean(navigator.standalone);
}
function isIosInstallCandidate() {
    if (typeof navigator === "undefined" || isStandaloneBoardSignal())
        return false;
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return ios;
}
function markBoardSignalPwaEngaged() {
    if (typeof window === "undefined")
        return;
    window.localStorage.setItem(exports.PWA_ENGAGED_KEY, new Date().toISOString());
    window.dispatchEvent(new CustomEvent(exports.PWA_ENGAGED_EVENT));
}
function installDismissedRecently() {
    if (typeof window === "undefined")
        return false;
    const raw = window.localStorage.getItem(exports.PWA_DISMISSED_KEY);
    const when = raw ? Date.parse(raw) : NaN;
    return Number.isFinite(when) && Date.now() - when < exports.PWA_DISMISS_MS;
}
