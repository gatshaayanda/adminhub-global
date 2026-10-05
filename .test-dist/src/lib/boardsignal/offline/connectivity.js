"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOARDSIGNAL_RECONNECTED_EVENT = exports.BOARDSIGNAL_CONNECTIVITY_ENDPOINT = void 0;
exports.probeBoardSignalConnectivity = probeBoardSignalConnectivity;
exports.BOARDSIGNAL_CONNECTIVITY_ENDPOINT = "/api/boardsignal/connectivity";
exports.BOARDSIGNAL_RECONNECTED_EVENT = "boardsignal:reconnected";
async function probeBoardSignalConnectivity(signal) {
    const response = await fetch(`${exports.BOARDSIGNAL_CONNECTIVITY_ENDPOINT}?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        signal,
        headers: { "Cache-Control": "no-store" },
    });
    return response.status === 204;
}
