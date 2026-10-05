"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePlayerToken = requirePlayerToken;
exports.ensureStablePlayerAccount = ensureStablePlayerAccount;
exports.createAuthCompletionTicket = createAuthCompletionTicket;
exports.markChessComOAuthLinked = markChessComOAuthLinked;
exports.consumeAuthCompletionTicket = consumeAuthCompletionTicket;
exports.accountForToken = accountForToken;
exports.acceptFoundingBetaAgreement = acceptFoundingBetaAgreement;
exports.updatePlayerPreferences = updatePlayerPreferences;
exports.savePendingFactualReview = savePendingFactualReview;
exports.loadPendingFactualReviews = loadPendingFactualReviews;
exports.publishPrivateDesk = publishPrivateDesk;
exports.loadPublishedDesks = loadPublishedDesks;
exports.buildPlayerRoomSnapshot = buildPlayerRoomSnapshot;
require("server-only");
const node_crypto_1 = require("node:crypto");
const firebaseAdmin_1 = require("../../../utils/firebaseAdmin");
const account_1 = require("../account");
const memory_1 = require("../memory");
const quality_1 = require("../quality");
const factualReview_1 = require("../factualReview");
const universePulse_1 = require("./universePulse");
function clean(value) {
    return JSON.parse(JSON.stringify(value));
}
function safeDocumentId(value) {
    return value.replaceAll("/", "_").slice(0, 700);
}
function hashTicket(ticket) {
    return (0, node_crypto_1.createHash)("sha256").update(ticket).digest("hex");
}
function publicIdentityAllowed(account) {
    return account.identityStatus !== "provisional" && account.identityStatus !== "revoked";
}
async function recordUniversePulseException(account, type, error) {
    const createdAt = new Date().toISOString();
    const id = safeDocumentId((0, node_crypto_1.createHash)("sha256")
        .update(`${account.uid}:${type}:${createdAt.slice(0, 13)}`)
        .digest("hex"));
    await (0, firebaseAdmin_1.getAdminDb)().collection("exceptions").doc(id).set(clean({
        type,
        uid: account.uid,
        username: account.chessCom.canonicalUsername,
        title: "Universe Pulse refresh unavailable",
        message: error instanceof Error ? error.message : "Universe Pulse work failed.",
        createdAt,
    }), { merge: true }).catch(() => undefined);
}
async function requirePlayerToken(request) {
    const authorization = request.headers.get("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    if (!match)
        throw Object.assign(new Error("Player authentication is required."), { status: 401 });
    try {
        return await (0, firebaseAdmin_1.getAdminAuth)().verifyIdToken(match[1], true);
    }
    catch {
        throw Object.assign(new Error("The Player Room session is no longer valid."), { status: 401 });
    }
}
async function ensureStablePlayerAccount(identity) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const identityKey = (0, account_1.canonicalPlayerKey)(identity);
    const mappingRef = db.collection("chessPlayerAccounts").doc(identityKey);
    const defaultAccount = (0, account_1.createFoundingBetaAccount)(identity);
    const account = await db.runTransaction(async (transaction) => {
        const mapping = await transaction.get(mappingRef);
        const uid = mapping.exists && typeof mapping.data()?.uid === "string"
            ? mapping.data().uid
            : defaultAccount.uid;
        const userRef = db.collection("users").doc(uid);
        const existingUser = await transaction.get(userRef);
        const existing = existingUser.exists ? existingUser.data() : undefined;
        const base = existing ?? defaultAccount;
        const next = {
            ...base,
            uid,
            chessCom: identity,
            privacy: {
                ...defaultAccount.privacy,
                ...(base.privacy ?? {}),
                publicPlayerPage: true,
                universeCoverage: true,
            },
            notificationPreferences: {
                ...(0, account_1.defaultNotificationPreferences)(),
                ...(base.notificationPreferences ?? {}),
                founderUpdates: base.notificationPreferences?.founderUpdates ?? true,
            },
            eligibleCoverageKeys: [...new Set([
                    ...(existing?.eligibleCoverageKeys ?? []),
                    identityKey,
                    identity.canonicalUsername.toLowerCase(),
                ])],
        };
        transaction.set(mappingRef, clean({ uid, playerId: identity.playerId, canonicalUsername: identity.canonicalUsername }), { merge: true });
        transaction.set(userRef, clean(next), { merge: true });
        transaction.set(db.collection("playerIdentityAliases").doc(identity.canonicalUsername.toLowerCase()), clean({ uid, playerId: identity.playerId }), { merge: true });
        transaction.set(db.collection("publicPlayers").doc(identityKey), clean({
            chessPlayerId: identityKey,
            username: identity.canonicalUsername,
            usernameKey: identity.canonicalUsername.toLowerCase(),
            avatar: identity.avatar,
            profileUrl: identity.profileUrl,
            pageEnabled: true,
        }), { merge: true });
        return next;
    });
    return account;
}
async function createAuthCompletionTicket(account) {
    const ticket = (0, node_crypto_1.randomBytes)(32).toString("base64url");
    const data = {
        uid: account.uid,
        identity: account.chessCom,
        expiresAt: Date.now() + 5 * 60 * 1000,
    };
    await (0, firebaseAdmin_1.getAdminDb)().collection("authCompletionTickets").doc(hashTicket(ticket)).set(clean(data));
    return ticket;
}
async function markChessComOAuthLinked(uid) {
    const chessComOAuthLinkedAt = new Date().toISOString();
    await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(uid).set({
        chessComOAuthLinkedAt,
        identityStatus: "oauth_verified",
        identityReviewStatus: "confirmed",
    }, { merge: true });
    return chessComOAuthLinkedAt;
}
async function consumeAuthCompletionTicket(ticket) {
    if (!/^[A-Za-z0-9_-]{32,100}$/.test(ticket))
        throw Object.assign(new Error("The sign-in completion ticket is invalid."), { status: 400 });
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const ref = db.collection("authCompletionTickets").doc(hashTicket(ticket));
    return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists)
            throw Object.assign(new Error("The sign-in completion ticket was not found."), { status: 400 });
        const data = snapshot.data();
        if (data.consumedAt || data.expiresAt < Date.now()) {
            throw Object.assign(new Error("The sign-in completion ticket has expired or was already used."), { status: 400 });
        }
        transaction.update(ref, { consumedAt: Date.now() });
        return data;
    });
}
function identityFromToken(token) {
    const playerId = Number(token.chessPlayerId);
    const canonicalUsername = String(token.chessUsername ?? "").trim();
    if (!Number.isSafeInteger(playerId) || playerId <= 0 || !canonicalUsername) {
        throw Object.assign(new Error("This account is not linked to a verified Chess.com identity."), { status: 403 });
    }
    return { playerId, canonicalUsername };
}
async function accountForToken(token) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const snapshot = await db.collection("users").doc(token.uid).get();
    if (snapshot.exists) {
        const account = snapshot.data();
        if (account.identityStatus === "revoked" || account.accessStatus !== "active") {
            throw Object.assign(new Error("This BoardSignal access is no longer active."), { status: 403, code: "ACCOUNT_ACCESS_REVOKED" });
        }
        const allowPublicIdentity = publicIdentityAllowed(account);
        const normalized = {
            ...account,
            privacy: {
                additionalPositiveHighlights: false,
                publicGameLinks: false,
                expandedPublicProfile: false,
                ...(account.privacy ?? {}),
                publicPlayerPage: allowPublicIdentity ? true : false,
                universeCoverage: allowPublicIdentity ? true : false,
            },
            notificationPreferences: {
                ...(0, account_1.defaultNotificationPreferences)(),
                ...(account.notificationPreferences ?? {}),
                founderUpdates: account.notificationPreferences?.founderUpdates ?? true,
            },
        };
        if (JSON.stringify(normalized.privacy) !== JSON.stringify(account.privacy)
            || JSON.stringify(normalized.notificationPreferences) !== JSON.stringify(account.notificationPreferences)) {
            await snapshot.ref.set(clean({ privacy: normalized.privacy, notificationPreferences: normalized.notificationPreferences }), { merge: true });
        }
        return normalized;
    }
    const account = await ensureStablePlayerAccount(identityFromToken(token));
    if (account.uid !== token.uid)
        throw Object.assign(new Error("Verified identity mapping did not match this Player Room session."), { status: 403 });
    return account;
}
async function acceptFoundingBetaAgreement(token) {
    const account = await accountForToken(token);
    const acceptedAt = new Date().toISOString();
    const update = {
        betaAgreementVersion: account_1.FOUNDING_BETA_AGREEMENT_VERSION,
        betaAgreementAcceptedAt: acceptedAt,
        lastSeenAt: acceptedAt,
    };
    await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(account.uid).set(update, { merge: true });
    return { ...account, ...update };
}
async function updatePlayerPreferences(token, privacy, notificationPreferences, contact) {
    const account = await accountForToken(token);
    const allowPublicIdentity = publicIdentityAllowed(account);
    const normalizedPrivacy = {
        ...account.privacy,
        ...privacy,
        publicPlayerPage: allowPublicIdentity ? true : false,
        universeCoverage: allowPublicIdentity ? true : false,
    };
    const normalizedNotifications = {
        ...(0, account_1.defaultNotificationPreferences)(),
        ...notificationPreferences,
    };
    const values = [...Object.values(normalizedPrivacy), ...Object.values(normalizedNotifications)]
        .filter((value) => typeof value === "boolean");
    if (values.length < 2) {
        throw Object.assign(new Error("Player Room preferences were invalid."), { status: 400 });
    }
    let contactUpdate = {};
    if (contact) {
        const method = contact.preferredContactMethod;
        const value = contact.preferredContactValue?.trim();
        if (!["email", "discord", "telegram"].includes(method) || value.length > 160) {
            throw Object.assign(new Error("The Founding Beta contact settings were invalid."), { status: 400 });
        }
        if (contact.betaContactConsent === true && !value) {
            throw Object.assign(new Error("A reachable Founding Beta contact is required while contact consent is enabled."), { status: 400 });
        }
        if (contact.betaContactConsent === true && method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            throw Object.assign(new Error("Enter a valid email address."), { status: 400 });
        }
        contactUpdate = {
            preferredContactMethod: method,
            preferredContactValue: value,
            betaContactConsent: contact.betaContactConsent === true,
            contactConfirmedAt: contact.betaContactConsent === true ? new Date().toISOString() : account.contactConfirmedAt,
        };
    }
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const preferencesConfirmedAt = new Date().toISOString();
    await db.collection("users").doc(account.uid).set(clean({
        privacy: normalizedPrivacy,
        notificationPreferences: normalizedNotifications,
        preferencesConfirmedAt,
        universeParticipationDisclosedAt: account.universeParticipationDisclosedAt ?? preferencesConfirmedAt,
        ...contactUpdate,
    }), { merge: true });
    if (allowPublicIdentity) {
        await db.collection("publicPlayers").doc((0, account_1.canonicalPlayerKey)(account.chessCom)).set(clean({
            chessPlayerId: (0, account_1.canonicalPlayerKey)(account.chessCom),
            username: account.chessCom.canonicalUsername,
            usernameKey: account.chessCom.canonicalUsername.toLowerCase(),
            avatar: account.chessCom.avatar,
            profileUrl: account.chessCom.profileUrl,
            pageEnabled: true,
        }), { merge: true });
        const coverage = await db.collection("publicCoverage")
            .where("chessPlayerId", "==", (0, account_1.canonicalPlayerKey)(account.chessCom))
            .get();
        await Promise.all(coverage.docs.map((document) => (document.ref.set(clean({ visibility: { publicPlayerPage: true, universeCoverage: true } }), { merge: true }))));
    }
    const updatedAccount = {
        ...account,
        privacy: normalizedPrivacy,
        notificationPreferences: normalizedNotifications,
        preferencesConfirmedAt,
        universeParticipationDisclosedAt: account.universeParticipationDisclosedAt ?? preferencesConfirmedAt,
        ...contactUpdate,
    };
    if (allowPublicIdentity) {
        await (0, universePulse_1.recordNewPlayerUniverseIntro)(updatedAccount).catch(async (error) => {
            await recordUniversePulseException(updatedAccount, "universe_new_player_event", error);
        });
    }
    return {
        privacy: normalizedPrivacy,
        notificationPreferences: normalizedNotifications,
        preferencesConfirmedAt,
        ...contactUpdate,
    };
}
async function savePendingFactualReview(token, desk) {
    const account = await accountForToken(token);
    const next = (0, factualReview_1.createFactualReviewDraft)(account, desk);
    const ref = (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(account.uid).collection("factualReviews").doc(safeDocumentId(next.deskKey));
    return (0, firebaseAdmin_1.getAdminDb)().runTransaction(async (transaction) => {
        const existing = await transaction.get(ref);
        const createdAt = typeof existing.data()?.createdAt === "string" ? String(existing.data().createdAt) : next.createdAt;
        const stored = { ...next, createdAt, updatedAt: new Date().toISOString() };
        transaction.set(ref, clean(stored), { merge: false });
        return stored;
    });
}
async function loadPendingFactualReviews(uid) {
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(uid).collection("factualReviews").get();
    return snapshot.docs
        .map((document) => document.data())
        .filter((draft) => draft.schemaVersion === "boardsignal-factual-review-v1" && draft.status === "engine_pending")
        .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
}
async function deleteDeskTree(uid, deskDocumentId) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const deskRef = db.collection("users").doc(uid).collection("desks").doc(deskDocumentId);
    const evidence = await deskRef.collection("evidence").get();
    const batch = db.batch();
    evidence.docs.forEach((document) => batch.delete(document.ref));
    batch.delete(deskRef);
    await batch.commit();
}
async function publishPrivateDesk(token, desk, engineResults) {
    const account = await accountForToken(token);
    if (desk.source !== "live" || !desk.provenance.verified) {
        throw Object.assign(new Error("Only a verified LIVE Desk can enter a Player Room."), { status: 422 });
    }
    if (desk.player.playerId !== account.chessCom.playerId
        || desk.player.username.toLowerCase() !== account.chessCom.canonicalUsername.toLowerCase()) {
        throw Object.assign(new Error("This Desk does not belong to the authenticated Chess.com player."), { status: 403 });
    }
    const quality = (0, quality_1.validateDeskForPublication)(desk, engineResults);
    if (quality.status !== "PASS") {
        throw Object.assign(new Error(`The Desk did not clear publication validation: ${quality.codes.join(" · ")}`), { status: 422 });
    }
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const allowPublicIdentity = publicIdentityAllowed(account);
    const beforeUniverseState = allowPublicIdentity ? await (0, universePulse_1.loadActiveUniverseState)().catch(async (error) => {
        await recordUniversePulseException(account, "universe_pre_publish_snapshot", error);
        return undefined;
    }) : undefined;
    const summary = (0, memory_1.toDeskSummary)(desk);
    const deskDocumentId = safeDocumentId(summary.deskKey);
    const desksRef = db.collection("users").doc(account.uid).collection("desks");
    const deskRef = desksRef.doc(deskDocumentId);
    const factualReviewRef = db.collection("users").doc(account.uid).collection("factualReviews").doc(deskDocumentId);
    const previous = await desksRef.get();
    const alreadyPublished = previous.docs.some((document) => document.id === deskDocumentId);
    const oldEvidence = await deskRef.collection("evidence").get();
    const batch = db.batch();
    oldEvidence.docs.forEach((document) => batch.delete(document.ref));
    const deskWithoutEvidence = { ...desk, candidates: [] };
    batch.set(deskRef, clean({
        deskKey: summary.deskKey,
        periodEnd: summary.periodEnd,
        summary,
        desk: deskWithoutEvidence,
        publishedAt: new Date().toISOString(),
    }));
    desk.candidates.forEach((candidate, positionOrder) => {
        batch.set(deskRef.collection("evidence").doc(safeDocumentId(candidate.id)), clean({
            positionOrder,
            candidate,
            engineResult: engineResults[candidate.id],
        }));
    });
    // A factual review is retired only in the same successful private-Desk write.
    batch.delete(factualReviewRef);
    await batch.commit();
    const entries = [
        ...previous.docs.filter((document) => document.id !== deskDocumentId).map((document) => ({
            deskKey: String(document.data().deskKey),
            periodEnd: String(document.data().periodEnd ?? document.data().summary?.periodEnd),
            documentId: document.id,
        })),
        { deskKey: summary.deskKey, periodEnd: summary.periodEnd, documentId: deskDocumentId },
    ];
    const retention = (0, memory_1.retainLatestFour)(entries);
    for (const removed of retention.removed)
        await deleteDeskTree(account.uid, removed.documentId);
    const currentRecords = (await db.collection("users").doc(account.uid).get()).data()?.personalRecords;
    const personalRecords = alreadyPublished ? currentRecords : (0, memory_1.updatePersonalRecords)(currentRecords, summary);
    await db.collection("users").doc(account.uid).set(clean({
        cadenceAnchor: account.cadenceAnchor ?? desk.cadence?.anchorStart ?? desk.period.start,
        nextDeskDueAt: desk.cadence?.nextAvailableOn,
        previousBlue: summary.previousBlue,
        previousAmber: summary.previousAmber,
        personalRecords,
        lastSeenAt: new Date().toISOString(),
    }), { merge: true });
    const publicCoverage = allowPublicIdentity ? (0, memory_1.buildSafePublicCoverage)(desk, true, { publicPlayerPage: true, universeCoverage: true }) : undefined;
    if (publicCoverage) {
        const publicId = safeDocumentId(`${account.chessCom.playerId}:${summary.deskKey}`);
        await db.collection("publicCoverage").doc(publicId).set(clean(publicCoverage));
    }
    if (allowPublicIdentity && !alreadyPublished && beforeUniverseState) {
        await (0, universePulse_1.recordCompletedDeskUniverseArtifacts)({
            account,
            desk,
            deskKey: summary.deskKey,
            beforeState: beforeUniverseState,
            deskCountAfter: retention.retained.length,
        }).catch(async (error) => {
            await recordUniversePulseException(account, "universe_completed_desk_artifacts", error);
        });
    }
    else if (allowPublicIdentity && alreadyPublished) {
        await (0, universePulse_1.ensureShareMomentsForActiveDesks)(account, [{ desk, summary }], beforeUniverseState).catch(async (error) => {
            await recordUniversePulseException(account, "universe_share_backfill", error);
        });
    }
    return { deskKey: summary.deskKey, removedDeskKeys: retention.removed.map((item) => item.deskKey) };
}
async function loadPublishedDesks(uid) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const deskSnapshots = await db.collection("users").doc(uid).collection("desks")
        .orderBy("periodEnd", "desc")
        .limit(4)
        .get();
    return Promise.all(deskSnapshots.docs.map(async (document) => {
        const data = document.data();
        const evidence = await document.ref.collection("evidence").orderBy("positionOrder", "asc").get();
        const candidates = [];
        const engineResults = {};
        for (const evidenceDocument of evidence.docs) {
            const item = evidenceDocument.data();
            candidates.push(item.candidate);
            if (item.engineResult)
                engineResults[item.candidate.id] = item.engineResult;
        }
        return { desk: { ...data.desk, candidates }, engineResults, summary: data.summary };
    }));
}
async function buildPlayerRoomSnapshot(token, currentEpisode, progressUnavailable) {
    const account = await accountForToken(token);
    await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(account.uid).set(clean({
        lastSeenAt: new Date().toISOString(),
        latestProgressCheckedAt: currentEpisode?.checkedAt,
        currentEpisodeSummary: currentEpisode,
        nextDeskDueAt: currentEpisode?.nextDeskDueAt ?? account.nextDeskDueAt,
    }), { merge: true });
    const desks = await loadPublishedDesks(account.uid);
    const summaries = desks.map((item) => item.summary);
    const publishedKeys = new Set(summaries.map((summary) => summary.deskKey));
    const factualReviews = await loadPendingFactualReviews(account.uid);
    const obsoleteFactualReviews = factualReviews.filter((draft) => publishedKeys.has(draft.deskKey));
    if (obsoleteFactualReviews.length) {
        const cleanup = (0, firebaseAdmin_1.getAdminDb)().batch();
        obsoleteFactualReviews.forEach((draft) => cleanup.delete((0, firebaseAdmin_1.getAdminDb)().collection("users").doc(account.uid).collection("factualReviews").doc(safeDocumentId(draft.deskKey))));
        await cleanup.commit();
    }
    const latest = desks[0]?.desk;
    const pendingFactualReview = factualReviews.find((draft) => (!publishedKeys.has(draft.deskKey)
        && (!latest || draft.periodEnd > latest.period.end)));
    const generationRequired = pendingFactualReview ? false : !latest || Boolean(latest.cadence?.nextAvailableOn
        && latest.cadence.nextAvailableOn <= new Date().toISOString().slice(0, 10));
    const accountSnapshot = (await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(account.uid).get()).data();
    let pulse;
    let pulseUnavailable;
    try {
        pulse = await (0, universePulse_1.buildPlayerPulse)({ account: accountSnapshot, latestDesk: latest, currentEpisode });
    }
    catch (error) {
        pulseUnavailable = "Universe Pulse is temporarily unavailable. Your saved Desks are unchanged.";
        await recordUniversePulseException(accountSnapshot, "universe_player_room_pulse", error);
    }
    if (desks.length && publicIdentityAllowed(accountSnapshot)) {
        await (0, universePulse_1.ensureShareMomentsForActiveDesks)(accountSnapshot, desks).catch(async (error) => {
            await recordUniversePulseException(accountSnapshot, "universe_share_backfill", error);
        });
    }
    const shareMoments = publicIdentityAllowed(accountSnapshot) ? await (0, universePulse_1.listPlayerShareMoments)(account.chessCom.playerId, summaries.map((summary) => summary.deskKey)).catch(async (error) => {
        await recordUniversePulseException(accountSnapshot, "universe_share_load", error);
        return [];
    }) : [];
    return {
        account: accountSnapshot,
        desks,
        progress: (0, memory_1.buildPoolProgress)(summaries),
        recurringPatterns: (0, memory_1.deriveRecurringPatterns)(summaries),
        personalRecords: accountSnapshot.personalRecords ?? {
            desksCompleted: summaries.length,
            personalBestWinRun: Math.max(0, ...summaries.map((summary) => summary.longestWinRun)),
            largestPoolSpecificRatingClimb: {},
        },
        currentEpisode,
        pendingFactualReview,
        progressUnavailable,
        pulseUnavailable,
        generationRequired,
        pulse,
        shareMoments,
    };
}
