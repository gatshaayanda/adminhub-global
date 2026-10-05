"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSafePublicPlayerProfile = loadSafePublicPlayerProfile;
require("server-only");
const firebaseAdmin_1 = require("../../../utils/firebaseAdmin");
/** Reads only the physically separate, opt-in public projection. */
async function loadSafePublicPlayerProfile(handle) {
    if (!(0, firebaseAdmin_1.isFirebaseAdminConfigured)())
        return undefined;
    const usernameKey = handle.trim().replace(/^@/, "").toLowerCase();
    if (!usernameKey)
        return undefined;
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const players = await db.collection("publicPlayers").where("usernameKey", "==", usernameKey).limit(1).get();
    const playerDocument = players.docs[0];
    if (!playerDocument)
        return undefined;
    const player = playerDocument.data();
    if (player.pageEnabled !== true || !player.chessPlayerId || !player.username)
        return undefined;
    const coverageSnapshot = await db.collection("publicCoverage")
        .where("chessPlayerId", "==", player.chessPlayerId)
        .get();
    const coverage = coverageSnapshot.docs
        .map((document) => document.data())
        .filter((item) => item.visibility?.publicPlayerPage === true)
        .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
    return {
        chessPlayerId: player.chessPlayerId,
        username: player.username,
        avatar: player.avatar,
        profileUrl: player.profileUrl,
        coverage,
    };
}
