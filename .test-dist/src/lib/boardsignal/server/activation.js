"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activationSecretHash = activationSecretHash;
exports.createBetaPreviewStatusCredential = createBetaPreviewStatusCredential;
exports.buildSafeBetaPreview = buildSafeBetaPreview;
exports.betaMagicAccessCredential = betaMagicAccessCredential;
exports.consumeBetaMagicTicket = consumeBetaMagicTicket;
exports.verifyBetaPreviewStatusCredential = verifyBetaPreviewStatusCredential;
exports.claimProvisionalBetaPreview = claimProvisionalBetaPreview;
exports.claimBetaPreviewAccess = claimBetaPreviewAccess;
exports.publicBetaPreviewStatus = publicBetaPreviewStatus;
exports.claimApprovedBetaPreview = claimApprovedBetaPreview;
exports.registerBetaPreviewNotificationDevice = registerBetaPreviewNotificationDevice;
exports.notifyApprovedBetaPreviewDevice = notifyApprovedBetaPreviewDevice;
exports.registerFounderNotificationDevice = registerFounderNotificationDevice;
exports.unregisterFounderNotificationDevice = unregisterFounderNotificationDevice;
exports.founderNotificationDeviceCount = founderNotificationDeviceCount;
exports.notifyFounderOfBetaRequest = notifyFounderOfBetaRequest;
require("server-only");
const node_crypto_1 = require("node:crypto");
const account_1 = require("../account");
const activation_1 = require("../activation");
const processor_1 = require("../processor");
const pulse_1 = require("../pulse");
const universe_1 = require("../universe");
const universeField_1 = require("../../../data/universeField");
const firebaseAdmin_1 = require("../../../utils/firebaseAdmin");
const universePulse_1 = require("./universePulse");
function clean(value) { return JSON.parse(JSON.stringify(value)); }
function activationSecretHash(value) { return (0, node_crypto_1.createHash)("sha256").update(value).digest("hex"); }
function sameHash(expected, raw) {
    if (!expected || !/^[a-f0-9]{64}$/.test(expected))
        return false;
    const actual = activationSecretHash(raw);
    try {
        return (0, node_crypto_1.timingSafeEqual)(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
    }
    catch {
        return false;
    }
}
function createBetaPreviewStatusCredential() {
    const token = (0, node_crypto_1.randomBytes)(activation_1.BETA_PREVIEW_STATUS_TOKEN_BYTES).toString("base64url");
    return { token, hash: activationSecretHash(token) };
}
function safeHeadlineFromDesk(desk) {
    const positivePool = [...desk.pools]
        .filter((pool) => typeof pool.change === "number" && pool.change > 0)
        .sort((a, b) => Number(b.change ?? 0) - Number(a.change ?? 0))[0];
    if (desk.longestWinStreak >= 3)
        return `${desk.longestWinStreak} straight wins formed the strongest run in this week.`;
    if (positivePool?.change)
        return `${positivePool.pool.toUpperCase()} moved +${positivePool.change} across this seven-day chapter.`;
    if (desk.checkmateWins && desk.checkmateWins > 0)
        return `${desk.checkmateWins} win${desk.checkmateWins === 1 ? "" : "s"} finished by checkmate.`;
    return `${desk.games} completed games give BoardSignal a real seven-day chapter to work with.`;
}
function fieldPlayers(boards, previewUsername) {
    const seen = new Set();
    const players = [];
    for (const board of boards) {
        for (const entry of board.entries) {
            const key = entry.player.toLowerCase();
            if (key === previewUsername.toLowerCase() || seen.has(key))
                continue;
            seen.add(key);
            players.push({
                canonicalUsername: entry.player,
                placement: `#${entry.rank} ${board.title}${board.scopeLabel ? ` · ${board.scopeLabel}` : ""}`,
                safeHighlight: entry.coverageHeadline,
                href: entry.coverageHref,
            });
            if (players.length >= 6)
                return players;
        }
    }
    return players;
}
async function buildSafeBetaPreview(identity, now = new Date()) {
    let desk;
    let noPlayableWeek = false;
    try {
        desk = await (0, processor_1.buildLiveDesk)(identity.canonicalUsername, { referenceDate: now });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (/no public game archives|no completed standard game|no games were played/i.test(message) || error.code === "NO_ACTIVITY")
            noPlayableWeek = true;
        else
            throw error;
    }
    const universe = await (0, universePulse_1.loadActiveUniverseState)(now).catch(() => ({ liveParticipants: [], boards: [], groups: [], recentEvents: [], whatsHot: [] }));
    const recentUniverseActivity = universe.recentEvents.slice(0, 8).map((event) => ({
        eventId: event.eventId,
        canonicalUsername: event.canonicalUsername,
        headline: event.headline,
        supportingFact: event.supportingFact,
        publishedAt: event.publishedAt,
    }));
    if (!desk || noPlayableWeek) {
        const preview = {
            canonicalUsername: identity.canonicalUsername,
            avatar: identity.avatar,
            playerId: identity.playerId,
            profileUrl: identity.profileUrl,
            playableWeek: false,
            games: 0, wins: 0, draws: 0, losses: 0, score: 0,
            pools: [],
            safeHeadline: "BoardSignal found this Chess.com profile, but there isn't a playable completed week to show yet.",
            safeHighlight: "Your first completed seven-day chapter becomes the baseline for everything that follows.",
            universePreview: [],
            publicPlayers: fieldPlayers(universe.boards, identity.canonicalUsername),
            recentUniverseActivity,
            generatedAt: now.toISOString(),
        };
        if ((0, activation_1.betaPreviewContainsPrivateFields)(preview))
            throw new Error("Private data was blocked from the beta preview.");
        return clean(preview);
    }
    const participant = (0, universe_1.deskToUniverseParticipant)(desk);
    let universePreview = [];
    let previewBoards = universe.boards;
    if (participant) {
        previewBoards = (0, pulse_1.buildActiveUniverseBoards)([...universe.liveParticipants, participant], universeField_1.foundingBetaField, universe.liveParticipants);
        universePreview = (0, pulse_1.standingsFromActiveBoards)(previewBoards, participant.id)
            .sort((a, b) => a.rank - b.rank)
            .slice(0, 5)
            .map((standing) => ({
            categoryId: standing.categoryId,
            categoryTitle: standing.categoryTitle,
            scopeLabel: standing.scopeLabel,
            rank: standing.rank,
            denominator: standing.denominator,
            valueLabel: standing.valueLabel,
            label: "PROVISIONAL",
            nearestAbove: standing.nearestAbove,
        }));
    }
    const preview = {
        canonicalUsername: identity.canonicalUsername,
        avatar: identity.avatar,
        playerId: identity.playerId,
        profileUrl: identity.profileUrl,
        playableWeek: true,
        period: {
            start: desk.period.start,
            end: desk.period.end,
            label: desk.period.label,
            mode: desk.period.isLastActive ? "latest_active" : "latest_completed",
            disclosure: desk.period.isLastActive ? "Latest active week — the latest completed week had no games, so this older active block is shown without treating it as current form." : undefined,
        },
        games: desk.games,
        wins: desk.wins,
        draws: desk.draws,
        losses: desk.losses,
        score: desk.score,
        pools: desk.pools.map((pool) => ({
            pool: pool.pool,
            games: pool.games,
            wins: pool.wins,
            draws: pool.draws,
            losses: pool.losses,
            ratingStart: pool.firstRecordedRating,
            ratingEnd: pool.lastRecordedRating,
            ratingDelta: pool.change,
        })),
        primaryPool: desk.primaryPool,
        strongestWinRun: desk.longestWinStreak,
        activeDays: desk.days.filter((day) => day.wins + day.draws + day.losses > 0).length,
        safeHeadline: safeHeadlineFromDesk(desk),
        safeHighlight: safeHeadlineFromDesk(desk),
        universePreview,
        publicPlayers: fieldPlayers(previewBoards, identity.canonicalUsername),
        recentUniverseActivity,
        generatedAt: now.toISOString(),
    };
    if ((0, activation_1.betaPreviewContainsPrivateFields)(preview))
        throw new Error("Private data was blocked from the beta preview.");
    return clean(preview);
}
function betaMagicAccessCredential(requestId, playerId, uid, now = new Date()) {
    const secret = (0, node_crypto_1.randomBytes)(activation_1.BETA_MAGIC_ACCESS_TOKEN_BYTES).toString("base64url");
    const ticket = `${Buffer.from(requestId).toString("base64url")}.${secret}`;
    const expiresAt = new Date(now.getTime() + activation_1.BETA_MAGIC_ACCESS_LIFETIME_MS).toISOString();
    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.adminhub-global.com";
    return {
        ticket,
        hash: activationSecretHash(ticket),
        expiresAt,
        link: `${site}/boardsignal/access#ticket=${ticket}`,
        record: { ticketHash: activationSecretHash(ticket), expiresAt, createdAt: now.toISOString(), requestId, playerId, uid },
    };
}
function requestIdFromMagicTicket(ticket) {
    const [encoded, secret, extra] = ticket.split(".");
    if (!encoded || !secret || extra || secret.length < 32)
        return undefined;
    try {
        const requestId = Buffer.from(encoded, "base64url").toString("utf8");
        return /^[A-Za-z0-9_-]{1,180}$/.test(requestId) ? requestId : undefined;
    }
    catch {
        return undefined;
    }
}
async function consumeBetaMagicTicket(ticketInput) {
    const ticket = String(ticketInput ?? "").trim();
    if (ticket.length < 40 || ticket.length > 220)
        throw Object.assign(new Error("This BoardSignal access link is invalid."), { status: 400, code: "MAGIC_ACCESS_INVALID" });
    const requestId = requestIdFromMagicTicket(ticket);
    if (!requestId)
        throw Object.assign(new Error("This BoardSignal access link is invalid."), { status: 400, code: "MAGIC_ACCESS_INVALID" });
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const ref = db.collection("betaRequests").doc(requestId);
    const data = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists)
            throw Object.assign(new Error("This BoardSignal access link was not found."), { status: 404, code: "MAGIC_ACCESS_NOT_FOUND" });
        const request = snapshot.data();
        const magic = request.magicAccess;
        const provisionalRecovery = request.status === "pending" && Boolean(request.provisionalClaimedAt) && request.identityReviewStatus !== "rejected";
        if (!(request.status === "approved" || provisionalRecovery) || !magic || !sameHash(String(magic.ticketHash ?? ""), ticket)) {
            throw Object.assign(new Error("This BoardSignal access link is no longer active."), { status: 403, code: "MAGIC_ACCESS_INVALID" });
        }
        if (magic.consumedAt || Date.parse(String(magic.expiresAt ?? "")) <= Date.now()) {
            throw Object.assign(new Error("This BoardSignal access link expired or was already used."), { status: 410, code: "MAGIC_ACCESS_EXPIRED" });
        }
        const consumedAt = new Date().toISOString();
        transaction.set(ref, { magicAccess: { ...magic, consumedAt }, claimedAt: consumedAt }, { merge: true });
        return {
            requestId,
            uid: String(magic.uid ?? ""),
            playerId: Number(magic.playerId),
            canonicalUsername: String(request.canonicalUsername ?? ""),
            consumedAt,
            identityStatus: provisionalRecovery ? "provisional" : "founder_reviewed",
        };
    });
    if (!data.uid || !Number.isSafeInteger(data.playerId) || data.playerId <= 0 || !data.canonicalUsername)
        throw Object.assign(new Error("This BoardSignal access link is incomplete."), { status: 500 });
    const customToken = await (0, firebaseAdmin_1.getAdminAuth)().createCustomToken(data.uid, {
        role: "player",
        accessTier: "founding_beta",
        chessPlayerId: String(data.playerId),
        chessUsername: data.canonicalUsername,
        boardsignalAuthProvider: "founding_beta_magic",
        boardsignalIdentityStatus: data.identityStatus,
    });
    return { ...data, customToken };
}
async function verifyBetaPreviewStatusCredential(requestId, statusTokenInput) {
    const statusToken = String(statusTokenInput ?? "").trim();
    if (statusToken.length < 32 || statusToken.length > 160)
        throw Object.assign(new Error("Preview access is invalid."), { status: 401, code: "PREVIEW_STATUS_INVALID" });
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("betaRequests").doc(requestId).get();
    if (!snapshot.exists)
        throw Object.assign(new Error("This BoardSignal preview was not found."), { status: 404, code: "PREVIEW_NOT_FOUND" });
    const request = snapshot.data();
    if (!sameHash(String(request.statusTokenHash ?? ""), statusToken))
        throw Object.assign(new Error("Preview access is invalid."), { status: 401, code: "PREVIEW_STATUS_INVALID" });
    return { ref: snapshot.ref, request };
}
function founderAlertState(result, attemptedAt = new Date().toISOString()) {
    const status = result.delivered > 0 ? "delivered" : result.eligible ? "failed" : "not_eligible";
    return { status: status, attemptedAt };
}
async function notifyFounderOfProvisionalClaim(input) {
    if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim())
        return { eligible: false, delivered: 0, failed: 0 };
    const devices = await (0, firebaseAdmin_1.getAdminDb)().collection("founderNotificationDevices").get();
    if (devices.empty)
        return { eligible: false, delivered: 0, failed: 0 };
    const link = `/admin/players?request=${encodeURIComponent(input.requestId)}`;
    let delivered = 0;
    let failed = 0;
    for (const device of devices.docs) {
        const token = String(device.data().token ?? "");
        if (!token)
            continue;
        try {
            await (0, firebaseAdmin_1.getAdminMessaging)().send({
                token,
                notification: { title: "BoardSignal", body: `${input.canonicalUsername} entered their provisional Player Room.` },
                webpush: { fcmOptions: { link } },
                data: { type: "founder_beta_provisional_claim", link, requestId: input.requestId },
            });
            delivered += 1;
        }
        catch (error) {
            failed += 1;
            const code = String(error.code ?? "");
            if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token"))
                await device.ref.delete().catch(() => undefined);
        }
    }
    return { eligible: true, delivered, failed };
}
function provisionalIdentityFromRequest(request) {
    const playerId = Number(request.chessPlayerId);
    const canonicalUsername = String(request.canonicalUsername ?? "").trim();
    if (!Number.isSafeInteger(playerId) || playerId <= 0 || !canonicalUsername) {
        throw Object.assign(new Error("This BoardSignal Preview is missing its stable Chess.com identity."), { status: 409, code: "PREVIEW_IDENTITY_INCOMPLETE" });
    }
    return {
        playerId,
        canonicalUsername,
        avatar: typeof request.avatar === "string" ? request.avatar : undefined,
        profileUrl: typeof request.profileUrl === "string" ? request.profileUrl : undefined,
    };
}
async function claimProvisionalBetaPreview(requestId, statusTokenInput) {
    const verified = await verifyBetaPreviewStatusCredential(requestId, statusTokenInput);
    const statusToken = String(statusTokenInput ?? "").trim();
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const claim = await db.runTransaction(async (transaction) => {
        const fresh = await transaction.get(verified.ref);
        if (!fresh.exists)
            throw Object.assign(new Error("This BoardSignal Preview was not found."), { status: 404, code: "PREVIEW_NOT_FOUND" });
        const request = fresh.data();
        if (!sameHash(String(request.statusTokenHash ?? ""), statusToken))
            throw Object.assign(new Error("Preview access is invalid."), { status: 401, code: "PREVIEW_STATUS_INVALID" });
        if (request.status !== "pending" || request.identityReviewStatus === "rejected") {
            throw Object.assign(new Error("This Preview cannot start provisional private access."), { status: 409, code: "PROVISIONAL_ACCESS_UNAVAILABLE" });
        }
        const identity = provisionalIdentityFromRequest(request);
        const uid = (0, account_1.firebaseUidForChessPlayer)(identity.playerId);
        const mappingRef = db.collection("chessPlayerAccounts").doc(String(identity.playerId));
        const userRef = db.collection("users").doc(uid);
        const accessRef = db.collection("betaAccess").doc(String(identity.playerId));
        const [mapping, userSnapshot, betaAccess] = await Promise.all([
            transaction.get(mappingRef),
            transaction.get(userRef),
            transaction.get(accessRef),
        ]);
        const mappedUid = mapping.exists && typeof mapping.data()?.uid === "string" ? String(mapping.data().uid) : uid;
        if (mappedUid !== uid) {
            throw Object.assign(new Error("This BoardSignal already exists. Use the existing private access or recovery path."), { status: 409, code: "ESTABLISHED_ACCOUNT_EXISTS" });
        }
        const existing = userSnapshot.exists ? userSnapshot.data() : undefined;
        const alreadyThisProvisionalClaim = Boolean(request.provisionalClaimedAt)
            && existing?.uid === uid
            && existing.identityStatus === "provisional"
            && existing.identityReviewStatus !== "rejected";
        if (!alreadyThisProvisionalClaim && (userSnapshot.exists || betaAccess.exists)) {
            throw Object.assign(new Error("This BoardSignal already exists. Use the existing private access or recovery path."), { status: 409, code: "ESTABLISHED_ACCOUNT_EXISTS" });
        }
        if (existing?.identityStatus === "founder_reviewed" || existing?.identityStatus === "oauth_verified" || existing?.identityStatus === "revoked" || existing?.chessComOAuthLinkedAt) {
            throw Object.assign(new Error("This BoardSignal already exists. Use the existing private access or recovery path."), { status: 409, code: "ESTABLISHED_ACCOUNT_EXISTS" });
        }
        const claimedAt = typeof request.provisionalClaimedAt === "string" ? String(request.provisionalClaimedAt) : new Date().toISOString();
        const base = existing ?? (0, account_1.createFoundingBetaAccount)(identity, new Date(claimedAt));
        const hasExternalContact = ["email", "discord", "telegram"].includes(String(request.preferredContactMethod ?? ""))
            && typeof request.preferredContactValue === "string"
            && Boolean(String(request.preferredContactValue).trim())
            && request.betaContactConsent === true;
        const next = {
            ...base,
            uid,
            chessCom: identity,
            accessTier: "founding_beta",
            accessStatus: "active",
            identityStatus: "provisional",
            identityReviewStatus: "pending",
            contactConfirmedAt: base.contactConfirmedAt ?? claimedAt,
            preferencesConfirmedAt: base.preferencesConfirmedAt ?? claimedAt,
            privacy: {
                ...base.privacy,
                publicPlayerPage: false,
                universeCoverage: false,
            },
            notificationPreferences: {
                ...base.notificationPreferences,
                email: hasExternalContact && request.preferredContactMethod === "email" ? true : base.notificationPreferences.email,
            },
            ...(hasExternalContact ? {
                preferredContactMethod: request.preferredContactMethod,
                preferredContactValue: String(request.preferredContactValue),
                betaContactConsent: true,
            } : {}),
            lastSeenAt: claimedAt,
        };
        transaction.set(mappingRef, clean({ uid, playerId: identity.playerId, canonicalUsername: identity.canonicalUsername }), { merge: true });
        transaction.set(userRef, clean(next), { merge: true });
        transaction.set(db.collection("playerIdentityAliases").doc(identity.canonicalUsername.toLowerCase()), clean({ uid, playerId: identity.playerId }), { merge: true });
        transaction.set(verified.ref, clean({
            firebaseUid: uid,
            provisionalClaimedAt: claimedAt,
            identityReviewStatus: "pending",
            activationDevice: null,
        }), { merge: true });
        return { uid, playerId: identity.playerId, canonicalUsername: identity.canonicalUsername, claimedAt, firstClaim: !request.provisionalClaimedAt };
    });
    const customToken = await (0, firebaseAdmin_1.getAdminAuth)().createCustomToken(claim.uid, {
        role: "player",
        accessTier: "founding_beta",
        chessPlayerId: String(claim.playerId),
        chessUsername: claim.canonicalUsername,
        boardsignalAuthProvider: "beta_preview_provisional",
        boardsignalIdentityStatus: "provisional",
    });
    if (claim.firstClaim) {
        const attemptedAt = new Date().toISOString();
        const result = await notifyFounderOfProvisionalClaim({ requestId, canonicalUsername: claim.canonicalUsername })
            .catch(() => ({ eligible: true, delivered: 0, failed: 1 }));
        await verified.ref.set({ founderAlertProvisionalClaim: founderAlertState(result, attemptedAt) }, { merge: true }).catch(() => undefined);
    }
    return { ...claim, customToken, provisional: true };
}
async function claimBetaPreviewAccess(requestId, statusTokenInput) {
    const verified = await verifyBetaPreviewStatusCredential(requestId, statusTokenInput);
    const status = String(verified.request.status ?? "pending");
    if (status === "approved")
        return claimApprovedBetaPreview(requestId, statusTokenInput);
    return claimProvisionalBetaPreview(requestId, statusTokenInput);
}
function publicBetaPreviewStatus(requestId, request) {
    const status = String(request.status ?? "pending");
    const magic = request.magicAccess;
    const magicExpired = status === "approved" && !request.claimedAt && magic?.expiresAt && Date.parse(String(magic.expiresAt)) <= Date.now();
    const provisionalClaimedAt = typeof request.provisionalClaimedAt === "string" ? request.provisionalClaimedAt : undefined;
    const state = request.claimedAt || provisionalClaimedAt ? "claimed" : magicExpired ? "expired" : status === "approved" ? "approved" : status === "rejected" ? "rejected" : "preview_ready";
    return clean({
        requestId,
        state,
        canonicalUsername: String(request.canonicalUsername ?? "Player"),
        requestedAt: typeof request.requestedAt === "string" ? request.requestedAt : undefined,
        avatar: typeof request.avatar === "string" ? request.avatar : undefined,
        preview: request.previewSnapshot,
        previewError: typeof request.previewError === "string" ? request.previewError : undefined,
        accessReady: status === "approved" && !request.claimedAt && !magicExpired,
        provisionalAccessReady: status === "pending" && !provisionalClaimedAt && request.identityReviewStatus !== "rejected",
        approvedAt: typeof request.decidedAt === "string" ? request.decidedAt : undefined,
        claimedAt: typeof request.claimedAt === "string" ? request.claimedAt : undefined,
        provisionalClaimedAt,
        identityReviewStatus: ["pending", "confirmed", "rejected"].includes(String(request.identityReviewStatus ?? "")) ? request.identityReviewStatus : status === "approved" ? "confirmed" : status === "rejected" ? "rejected" : "pending",
        magicAccessExpiresAt: typeof magic?.expiresAt === "string" ? magic.expiresAt : undefined,
        emailDelivery: ["delivered", "failed", "not_eligible", "not_configured"].includes(String(request.accessEmailDelivery ?? "")) ? request.accessEmailDelivery : undefined,
        activationReturnMethod: ["device", "email", "discord", "telegram", "return_here"].includes(String(request.activationReturnMethod ?? "")) ? request.activationReturnMethod : undefined,
        preferredContactMethod: ["email", "discord", "telegram"].includes(String(request.preferredContactMethod ?? "")) ? request.preferredContactMethod : undefined,
        preferredContactValue: typeof request.preferredContactValue === "string" ? request.preferredContactValue : undefined,
        betaContactConsent: request.betaContactConsent === true ? true : undefined,
        deviceAlertsEnabled: Boolean(request.activationDevice?.registeredAt),
        deviceDelivery: ["delivered", "failed", "not_eligible"].includes(String(request.activationDeviceDelivery ?? "")) ? request.activationDeviceDelivery : undefined,
    });
}
async function claimApprovedBetaPreview(requestId, statusTokenInput) {
    const verified = await verifyBetaPreviewStatusCredential(requestId, statusTokenInput);
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const claim = await db.runTransaction(async (transaction) => {
        const fresh = await transaction.get(verified.ref);
        const request = fresh.data();
        if (request.status !== "approved")
            throw Object.assign(new Error("Private access is not ready yet."), { status: 409, code: "ACCESS_NOT_READY" });
        if (request.claimedAt)
            throw Object.assign(new Error("This preview access was already claimed. Open My Player Room or use the fallback access path."), { status: 409, code: "ACCESS_ALREADY_CLAIMED" });
        const currentMagic = request.magicAccess;
        if (!currentMagic || Date.parse(String(currentMagic.expiresAt ?? "")) <= Date.now())
            throw Object.assign(new Error("This one-time access window expired. Ask Ayanda to prepare a fresh access link."), { status: 410, code: "MAGIC_ACCESS_EXPIRED" });
        if (!sameHash(String(request.statusTokenHash ?? ""), String(statusTokenInput ?? "").trim()))
            throw Object.assign(new Error("Preview access is invalid."), { status: 401 });
        const playerId = Number(request.chessPlayerId);
        const uid = String(request.firebaseUid ?? `chesscom_${playerId}`);
        const canonicalUsername = String(request.canonicalUsername ?? "");
        if (!Number.isSafeInteger(playerId) || playerId <= 0 || !canonicalUsername)
            throw Object.assign(new Error("Approved identity is incomplete."), { status: 500 });
        const claimedAt = new Date().toISOString();
        const magic = request.magicAccess;
        transaction.set(verified.ref, { claimedAt, previewClaimConsumedAt: claimedAt, activationDevice: null, ...(magic ? { magicAccess: { ...magic, consumedAt: claimedAt } } : {}) }, { merge: true });
        return { playerId, uid, canonicalUsername, claimedAt };
    });
    const customToken = await (0, firebaseAdmin_1.getAdminAuth)().createCustomToken(claim.uid, {
        role: "player",
        accessTier: "founding_beta",
        chessPlayerId: String(claim.playerId),
        chessUsername: claim.canonicalUsername,
        boardsignalAuthProvider: "founding_beta_preview_claim",
    });
    return { ...claim, customToken };
}
async function registerBetaPreviewNotificationDevice(input) {
    if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim())
        throw Object.assign(new Error("Device alerts are not configured yet."), { status: 503, code: "PREVIEW_PUSH_NOT_CONFIGURED" });
    const verified = await verifyBetaPreviewStatusCredential(input.requestId, input.statusToken);
    const token = String(input.fcmToken ?? "").trim();
    if (token.length < 20 || token.length > 4096)
        throw Object.assign(new Error("This device did not return a valid notification registration."), { status: 400, code: "PREVIEW_PUSH_TOKEN_INVALID" });
    const fresh = await verified.ref.get();
    const request = fresh.data();
    if (request.status !== "pending")
        throw Object.assign(new Error("Device return settings can only change while this Preview is pending."), { status: 409, code: "PREVIEW_RETURN_LOCKED" });
    const now = new Date().toISOString();
    await verified.ref.set(clean({
        activationReturnMethod: "device",
        activationDevice: { token, registeredAt: now, updatedAt: now, userAgentSummary: String(input.userAgent ?? "").slice(0, 300) },
        activationReturnUpdatedAt: now,
    }), { merge: true });
    return { registered: true, activationReturnMethod: "device" };
}
async function notifyApprovedBetaPreviewDevice(input) {
    const token = String(input.fcmToken ?? "").trim();
    if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim() || token.length < 20)
        return { eligible: false, delivered: 0, failed: 0, status: "not_eligible" };
    const link = `/boardsignal/preview/${encodeURIComponent(input.requestId)}`;
    try {
        await (0, firebaseAdmin_1.getAdminMessaging)().send({
            token,
            notification: { title: "BoardSignal", body: "Your private Player Room is ready.\nOpen BoardSignal to continue." },
            webpush: { fcmOptions: { link } },
            data: { type: "beta_preview_approved", link, requestId: input.requestId },
        });
        return { eligible: true, delivered: 1, failed: 0, status: "delivered" };
    }
    catch {
        return { eligible: true, delivered: 0, failed: 1, status: "failed" };
    }
}
async function registerFounderNotificationDevice(fcmTokenInput, userAgentInput) {
    const token = String(fcmTokenInput ?? "").trim();
    if (token.length < 20 || token.length > 4096)
        throw Object.assign(new Error("Founder browser alert token is invalid."), { status: 400 });
    if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim())
        throw Object.assign(new Error("Founder browser alerts require BoardSignal Web Push configuration."), { status: 503 });
    const id = Buffer.from(token).toString("base64url").slice(0, 180);
    const now = new Date().toISOString();
    await (0, firebaseAdmin_1.getAdminDb)().collection("founderNotificationDevices").doc(id).set(clean({ token, createdAt: now, updatedAt: now, userAgent: String(userAgentInput ?? "").slice(0, 500) }), { merge: true });
    return { registered: true };
}
async function unregisterFounderNotificationDevice(fcmTokenInput) {
    const collection = (0, firebaseAdmin_1.getAdminDb)().collection("founderNotificationDevices");
    const token = String(fcmTokenInput ?? "").trim();
    if (token) {
        const id = Buffer.from(token).toString("base64url").slice(0, 180);
        await collection.doc(id).delete().catch(() => undefined);
    }
    return { registered: false };
}
async function founderNotificationDeviceCount() {
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("founderNotificationDevices").get().catch(() => ({ size: 0 }));
    return snapshot.size ?? 0;
}
async function notifyFounderOfBetaRequest(input) {
    if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim())
        return { eligible: false, delivered: 0, failed: 0 };
    const devices = await (0, firebaseAdmin_1.getAdminDb)().collection("founderNotificationDevices").get();
    if (devices.empty)
        return { eligible: false, delivered: 0, failed: 0 };
    const link = `/admin/players?request=${encodeURIComponent(input.requestId)}`;
    let delivered = 0;
    let failed = 0;
    for (const device of devices.docs) {
        const token = String(device.data().token ?? "");
        if (!token)
            continue;
        try {
            await (0, firebaseAdmin_1.getAdminMessaging)().send({
                token,
                notification: { title: "BoardSignal", body: input.previewReady === false ? `New beta request — ${input.canonicalUsername}\nRequest saved; preview needs a retry.` : `New beta request — ${input.canonicalUsername}\nPreview is ready; identity review is pending.` },
                webpush: { fcmOptions: { link } },
                data: { type: "founder_beta_request", link, requestId: input.requestId },
            });
            delivered += 1;
        }
        catch (error) {
            failed += 1;
            const code = String(error.code ?? "");
            if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token"))
                await device.ref.delete().catch(() => undefined);
        }
    }
    return { eligible: true, delivered, failed };
}
