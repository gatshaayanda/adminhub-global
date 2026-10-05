"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectSafePublicCoverageForAccount = inspectSafePublicCoverageForAccount;
exports.ensureSafePublicCoverageForAccount = ensureSafePublicCoverageForAccount;
exports.repairSafePublicCoverageForPlayer = repairSafePublicCoverageForPlayer;
require("server-only");
const memory_1 = require("../memory");
const firebaseAdmin_1 = require("../../../utils/firebaseAdmin");
function clean(value) {
    return JSON.parse(JSON.stringify(value));
}
function safeDocumentId(value) {
    return value.replaceAll("/", "_").slice(0, 700);
}
function publicCoverageDocumentId(playerId, deskKey) {
    return safeDocumentId(`${playerId}:${deskKey}`);
}
function publicIdentityAllowed(account) {
    return account.identityStatus !== "provisional" && account.identityStatus !== "revoked";
}
function canonicalize(value) {
    if (Array.isArray(value))
        return value.map(canonicalize);
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => [key, canonicalize(item)]));
    }
    return value;
}
function sameSafeCoverage(actual, expected) {
    return JSON.stringify(canonicalize(clean(actual))) === JSON.stringify(canonicalize(clean(expected)));
}
async function loadRetainedCompletedReviews(account) {
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(account.uid).collection("desks")
        .orderBy("periodEnd", "desc")
        .limit(4)
        .get();
    return snapshot.docs.map((document) => document.data());
}
function stateForBlockedAccount(account) {
    if (account.identityStatus === "provisional" && account.accessStatus === "active")
        return "waiting_identity_review";
    return "unavailable";
}
async function reconcileSafePublicCoverage(account, writeRepair) {
    const retained = await loadRetainedCompletedReviews(account);
    const latest = retained[0];
    const latestReview = latest?.deskKey && latest.summary?.periodLabel && (latest.summary.periodEnd ?? latest.periodEnd)
        ? {
            deskKey: latest.deskKey,
            periodLabel: latest.summary.periodLabel,
            periodEnd: String(latest.summary.periodEnd ?? latest.periodEnd),
        }
        : undefined;
    const eligible = account.accessStatus === "active" && publicIdentityAllowed(account);
    if (!eligible) {
        return {
            eligible: false,
            retainedReviews: retained.length,
            projected: 0,
            expectedCoverage: 0,
            alreadyPresent: 0,
            liveCoverage: 0,
            createdOrUpdated: 0,
            status: stateForBlockedAccount(account),
            repairAvailable: false,
            latestReview,
        };
    }
    if (!retained.length) {
        return {
            eligible: true,
            retainedReviews: 0,
            projected: 0,
            expectedCoverage: 0,
            alreadyPresent: 0,
            liveCoverage: 0,
            createdOrUpdated: 0,
            status: "no_completed_review",
            repairAvailable: false,
            latestReview,
        };
    }
    const expected = retained.flatMap((review) => {
        if (!review.desk || !review.deskKey)
            return [];
        const coverage = (0, memory_1.buildSafePublicCoverage)(review.desk, true, { publicPlayerPage: true, universeCoverage: true });
        return coverage ? [{ review, coverage }] : [];
    });
    if (!expected.length) {
        return {
            eligible: true,
            retainedReviews: retained.length,
            projected: 0,
            expectedCoverage: 0,
            alreadyPresent: 0,
            liveCoverage: 0,
            createdOrUpdated: 0,
            status: "no_safe_highlight",
            repairAvailable: false,
            latestReview,
        };
    }
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const inspected = await Promise.all(expected.map(async ({ review, coverage }) => {
        const ref = db.collection("publicCoverage").doc(publicCoverageDocumentId(account.chessCom.playerId, review.deskKey));
        const snapshot = await ref.get();
        const matches = snapshot.exists && sameSafeCoverage(snapshot.data(), coverage);
        return { ref, coverage, matches };
    }));
    const alreadyPresent = inspected.filter((item) => item.matches).length;
    const missingOrIncomplete = inspected.filter((item) => !item.matches);
    let createdOrUpdated = 0;
    if (writeRepair && missingOrIncomplete.length) {
        for (const item of missingOrIncomplete) {
            // Replace the deterministic public projection with the existing safe builder output only.
            // This path deliberately does not invoke Universe history/events/share-moment helpers.
            await item.ref.set(clean(item.coverage));
            createdOrUpdated += 1;
        }
    }
    const liveCoverage = alreadyPresent + createdOrUpdated;
    const repaired = writeRepair && liveCoverage === expected.length;
    const status = alreadyPresent === expected.length || repaired
        ? "live"
        : "repair_needed";
    return {
        eligible: true,
        retainedReviews: retained.length,
        projected: expected.length,
        expectedCoverage: expected.length,
        alreadyPresent,
        liveCoverage,
        createdOrUpdated,
        status,
        repairAvailable: status === "repair_needed",
        latestReview,
    };
}
async function inspectSafePublicCoverageForAccount(account) {
    return reconcileSafePublicCoverage(account, false);
}
async function ensureSafePublicCoverageForAccount(account) {
    return reconcileSafePublicCoverage(account, true);
}
function validateStablePlayerId(value) {
    const playerId = Number(value);
    if (!Number.isSafeInteger(playerId) || playerId <= 0) {
        throw Object.assign(new Error("A stable Chess.com player ID is required."), { status: 400, code: "INVALID_PLAYER_ID" });
    }
    return playerId;
}
async function repairSafePublicCoverageForPlayer(playerIdInput) {
    const playerId = validateStablePlayerId(playerIdInput);
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const mapping = await db.collection("chessPlayerAccounts").doc(String(playerId)).get();
    const uid = typeof mapping.data()?.uid === "string" ? String(mapping.data().uid) : `chesscom_${playerId}`;
    const accountSnapshot = await db.collection("users").doc(uid).get();
    const account = accountSnapshot.data();
    if (!account || account.uid !== uid || account.chessCom?.playerId !== playerId) {
        throw Object.assign(new Error("The stable BoardSignal account could not be resolved for this Chess.com player ID."), {
            status: 404,
            code: "PLAYER_ACCOUNT_NOT_FOUND",
        });
    }
    return ensureSafePublicCoverageForAccount(account);
}
