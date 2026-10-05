"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitFoundingBetaRequest = submitFoundingBetaRequest;
exports.retryFoundingBetaPreview = retryFoundingBetaPreview;
exports.updateFoundingBetaReturnPreference = updateFoundingBetaReturnPreference;
exports.listFoundingBetaRequests = listFoundingBetaRequests;
exports.approveFoundingBetaRequest = approveFoundingBetaRequest;
exports.confirmFoundingBetaIdentity = confirmFoundingBetaIdentity;
exports.revokeProvisionalFoundingBetaIdentity = revokeProvisionalFoundingBetaIdentity;
exports.regenerateFoundingBetaMagicAccess = regenerateFoundingBetaMagicAccess;
exports.rejectFoundingBetaRequest = rejectFoundingBetaRequest;
require("server-only");
const node_crypto_1 = require("node:crypto");
const account_1 = require("../account");
const delivery_1 = require("../delivery");
const processor_1 = require("../processor");
const firebaseAdmin_1 = require("../../../utils/firebaseAdmin");
const activation_1 = require("./activation");
const betaAccess_1 = require("./betaAccess");
const persistence_1 = require("./persistence");
const publicCoverageRepair_1 = require("./publicCoverageRepair");
const delivery_2 = require("./delivery");
const email_1 = require("./email");
const universePulse_1 = require("./universePulse");
const CONTACT_METHODS = new Set(["email", "discord", "telegram"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function clean(value) { return JSON.parse(JSON.stringify(value)); }
function identityFromResolved(resolved) {
    if (!Number.isSafeInteger(resolved.playerId) || !resolved.playerId) {
        throw Object.assign(new Error("Chess.com did not return the stable player ID BoardSignal requires."), { status: 422 });
    }
    return { playerId: resolved.playerId, canonicalUsername: resolved.username, avatar: resolved.avatar, profileUrl: resolved.profileUrl };
}
function validateContact(methodValue, contactValue, consentValue) {
    const method = String(methodValue ?? "").toLowerCase();
    const value = String(contactValue ?? "").trim();
    if (!CONTACT_METHODS.has(method))
        throw Object.assign(new Error("Choose Email, Discord or Telegram."), { status: 400 });
    if (consentValue !== true)
        throw Object.assign(new Error("Contact consent is required for a Founding Beta request."), { status: 400 });
    if (value.length < 2 || value.length > 160)
        throw Object.assign(new Error("Enter one reachable contact value."), { status: 400 });
    if (method === "email" && !EMAIL_PATTERN.test(value))
        throw Object.assign(new Error("Enter a valid email address."), { status: 400 });
    return { method, value };
}
function clientKey(request) {
    const raw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
    return (0, node_crypto_1.createHash)("sha256").update(raw).digest("hex").slice(0, 40);
}
async function enforceRequestRateLimit(request, now = new Date()) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const bucket = now.toISOString().slice(0, 10);
    const ref = db.collection("betaRequestRateLimits").doc(`${bucket}_${clientKey(request)}`);
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const count = Number(snapshot.data()?.count ?? 0);
        if (count >= 5)
            throw Object.assign(new Error("Too many Founding Beta requests were submitted from this connection today. Try again later."), { status: 429 });
        transaction.set(ref, { count: count + 1, bucket, updatedAt: now.toISOString() }, { merge: true });
    });
}
async function existingStableAccount(identity) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const map = await db.collection("chessPlayerAccounts").doc(String(identity.playerId)).get();
    const uid = typeof map.data()?.uid === "string" ? String(map.data().uid) : `chesscom_${identity.playerId}`;
    const user = await db.collection("users").doc(uid).get();
    return user.exists ? user.data() : undefined;
}
async function generateAndStorePreview(ref, identity) {
    try {
        const preview = await (0, activation_1.buildSafeBetaPreview)(identity);
        await ref.set(clean({ previewSnapshot: preview, previewGeneratedAt: preview.generatedAt, previewError: null }), { merge: true });
        return { preview };
    }
    catch (error) {
        const previewError = error instanceof Error ? error.message : "Chess.com did not return the preview yet.";
        await ref.set({ previewError, previewGeneratedAt: new Date().toISOString() }, { merge: true });
        return { previewError };
    }
}
async function submitFoundingBetaRequest(input) {
    await enforceRequestRateLimit(input.request);
    const requestedUsername = String(input.username ?? "").trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_-]{2,50}$/.test(requestedUsername))
        throw Object.assign(new Error("Enter a valid Chess.com username."), { status: 400 });
    const hasLegacyContactInput = input.preferredContactMethod !== undefined || input.preferredContactValue !== undefined || input.betaContactConsent !== undefined;
    const contact = hasLegacyContactInput ? validateContact(input.preferredContactMethod, input.preferredContactValue, input.betaContactConsent) : undefined;
    const identity = identityFromResolved(await (0, processor_1.resolveChessComPlayer)(requestedUsername));
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const id = String(identity.playerId);
    const ref = db.collection("betaRequests").doc(id);
    const existingAccount = await existingStableAccount(identity);
    if (existingAccount?.accessStatus === "active") {
        return {
            request: {
                id,
                chessPlayerId: identity.playerId,
                canonicalUsername: identity.canonicalUsername,
                avatar: identity.avatar,
                profileUrl: identity.profileUrl,
                ...(contact ? { preferredContactMethod: contact.method, preferredContactValue: contact.value, betaContactConsent: true } : {}),
                requestedAt: existingAccount.lastSeenAt ?? new Date().toISOString(),
                status: "approved",
                statusTokenHash: "",
                firebaseUid: existingAccount.uid,
            },
            existingState: "active_account",
        };
    }
    const previousSnapshot = await ref.get();
    const previous = previousSnapshot.exists ? previousSnapshot.data() : undefined;
    if (previous && ["pending", "approved"].includes(previous.status)) {
        let preview = previous.previewSnapshot;
        let previewError = previous.previewError;
        if (!preview) {
            const generated = await generateAndStorePreview(ref, identity);
            preview = generated.preview;
            previewError = generated.previewError;
        }
        // Never issue a new claim-capable status credential from username + contact knowledge alone.
        // The original opaque credential remains the possession factor for an open Preview tab;
        // otherwise access recovery goes through the configured delivery/founder path.
        return {
            request: { ...previous, previewSnapshot: preview, previewError },
            preview,
            previewError,
            existingState: previous.status === "pending" ? "pending" : "approved_unclaimed",
        };
    }
    const now = new Date().toISOString();
    const source = input.source === "boardSignalShare" ? "boardSignalShare" : undefined;
    const shareMomentId = source && /^[A-Za-z0-9_-]{3,220}$/.test(String(input.shareMomentId ?? "")) ? String(input.shareMomentId) : undefined;
    const credential = (0, activation_1.createBetaPreviewStatusCredential)();
    const record = {
        id,
        chessPlayerId: identity.playerId,
        canonicalUsername: identity.canonicalUsername,
        avatar: identity.avatar,
        profileUrl: identity.profileUrl,
        ...(contact ? { preferredContactMethod: contact.method, preferredContactValue: contact.value, betaContactConsent: true, activationReturnMethod: contact.method } : {}),
        requestedAt: now,
        status: "pending",
        identityReviewStatus: "pending",
        source,
        shareMomentId,
        statusTokenHash: credential.hash,
    };
    await ref.set(clean(record));
    const generated = await generateAndStorePreview(ref, identity);
    const founderAlertAttemptedAt = new Date().toISOString();
    const founderAlert = await (0, activation_1.notifyFounderOfBetaRequest)({ requestId: id, canonicalUsername: identity.canonicalUsername, previewReady: Boolean(generated.preview) }).catch(() => ({ delivered: 0, failed: 1, eligible: true }));
    const founderAlertRequest = {
        status: (founderAlert.delivered > 0 ? "delivered" : founderAlert.eligible ? "failed" : "not_eligible"),
        attemptedAt: founderAlertAttemptedAt,
    };
    await ref.set({ founderAlertRequest, ...(founderAlert.delivered > 0 ? { founderAlertSentAt: founderAlertAttemptedAt } : {}) }, { merge: true }).catch(() => undefined);
    const finalRecord = { ...record, founderAlertRequest, previewSnapshot: generated.preview, previewGeneratedAt: generated.preview?.generatedAt, previewError: generated.previewError };
    return { request: finalRecord, statusToken: credential.token, preview: generated.preview, previewError: generated.previewError };
}
async function retryFoundingBetaPreview(requestId) {
    const ref = (0, firebaseAdmin_1.getAdminDb)().collection("betaRequests").doc(requestId);
    const snapshot = await ref.get();
    if (!snapshot.exists)
        throw Object.assign(new Error("The Founding Beta request was not found."), { status: 404 });
    const request = snapshot.data();
    const identity = { playerId: request.chessPlayerId, canonicalUsername: request.canonicalUsername, avatar: request.avatar, profileUrl: request.profileUrl };
    return generateAndStorePreview(ref, identity);
}
async function updateFoundingBetaReturnPreference(input) {
    const verified = await (0, activation_1.verifyBetaPreviewStatusCredential)(input.requestId, input.statusToken);
    const snapshot = await verified.ref.get();
    const request = snapshot.data();
    if (request.status !== "pending")
        throw Object.assign(new Error("Return settings can only change while this Preview is pending."), { status: 409, code: "PREVIEW_RETURN_LOCKED" });
    const method = String(input.method ?? "");
    if (!["device", "email", "discord", "telegram", "return_here"].includes(method))
        throw Object.assign(new Error("Choose how BoardSignal should bring you back."), { status: 400 });
    const now = new Date().toISOString();
    if (method === "email" || method === "discord" || method === "telegram") {
        const contact = validateContact(method, input.contactValue, input.betaContactConsent);
        await verified.ref.set(clean({ activationReturnMethod: method, activationReturnUpdatedAt: now, preferredContactMethod: contact.method, preferredContactValue: contact.value, betaContactConsent: true, activationDevice: null }), { merge: true });
    }
    else if (method === "return_here") {
        await verified.ref.set(clean({ activationReturnMethod: method, activationReturnUpdatedAt: now, activationDevice: null }), { merge: true });
    }
    else {
        throw Object.assign(new Error("Use Notify this device to enable device alerts."), { status: 400, code: "PREVIEW_DEVICE_ACTION_REQUIRED" });
    }
    const refreshed = await verified.ref.get();
    return refreshed.data();
}
async function listFoundingBetaRequests(status) {
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("betaRequests").get();
    return snapshot.docs.map((document) => document.data()).filter((request) => !status || request.status === status).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}
function newPlayerUniverseEvent(request, decidedAt) {
    return {
        eventId: (0, node_crypto_1.createHash)("sha256").update(`new-player:${request.chessPlayerId}`).digest("hex"),
        eventType: "new_player",
        playerId: String(request.chessPlayerId),
        canonicalUsername: request.canonicalUsername,
        avatar: request.avatar,
        occurredAt: decidedAt,
        publishedAt: decidedAt,
        headline: `${request.canonicalUsername} has entered the BoardSignal Universe.`,
        supportingFact: "First Desk forming.",
        dataMode: "live",
        finality: "official",
        safePublic: true,
    };
}
function accessMessage(username, link) {
    return `Your BoardSignal is ready — open your private Player Room here:\n${link}`;
}
async function reconcileConfirmedPublicHighlights(account) {
    try {
        return await (0, publicCoverageRepair_1.ensureSafePublicCoverageForAccount)(account);
    }
    catch (error) {
        return {
            status: "repair_needed",
            repairAvailable: true,
            error: error instanceof Error ? error.message : "Public highlights could not be reconciled.",
        };
    }
}
async function approveFoundingBetaRequest(requestId) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const ref = db.collection("betaRequests").doc(requestId);
    const snapshot = await ref.get();
    if (!snapshot.exists)
        throw Object.assign(new Error("The Founding Beta request was not found."), { status: 404 });
    const request = snapshot.data();
    if (request.status !== "pending")
        throw Object.assign(new Error(`This request is already ${request.status}.`), { status: 409 });
    // Approval reuses the stable Chess.com identity already verified at request time.
    // Do not make a second username lookup the authority for account ownership.
    const identity = {
        playerId: request.chessPlayerId,
        canonicalUsername: request.canonicalUsername,
        avatar: request.avatar,
        profileUrl: request.profileUrl,
    };
    const stableAccount = await (0, persistence_1.ensureStablePlayerAccount)(identity);
    if (stableAccount.uid !== `chesscom_${request.chessPlayerId}` || stableAccount.chessCom.playerId !== request.chessPlayerId) {
        throw Object.assign(new Error("The Founding Beta request no longer matches its stable BoardSignal identity."), { status: 409, code: "BETA_IDENTITY_MISMATCH" });
    }
    let result;
    let newlyCreatedAccess = true;
    try {
        result = await (0, betaAccess_1.createFoundingBetaAccess)(request.canonicalUsername);
    }
    catch (error) {
        if (String(error.code) !== "BETA_ACCESS_EXISTS")
            throw error;
        newlyCreatedAccess = false;
        // Legacy compatibility: an existing fallback credential is already valid.
        // Reuse it without rotating its hash/salt and without revoking Firebase sessions.
        const existing = await (0, betaAccess_1.loadExistingFoundingBetaAccess)(request.chessPlayerId);
        result = { account: existing.account };
    }
    if (!result.account)
        throw Object.assign(new Error("The existing Founding Beta identity could not be loaded."), { status: 409 });
    const account = result.account;
    if (account.uid !== stableAccount.uid || account.uid !== `chesscom_${request.chessPlayerId}` || account.chessCom.playerId !== request.chessPlayerId) {
        throw Object.assign(new Error("The Founding Beta Access result no longer matches its verified request identity."), { status: 409, code: "BETA_IDENTITY_MISMATCH" });
    }
    const decidedAt = new Date().toISOString();
    const currentPreferences = account.notificationPreferences ?? (0, account_1.defaultNotificationPreferences)();
    const validExternalContact = Boolean(request.preferredContactMethod && request.preferredContactValue && request.betaContactConsent === true);
    const completedReturnDecision = Boolean(request.activationReturnMethod || validExternalContact);
    const consentedEmail = request.preferredContactMethod === "email" && request.betaContactConsent === true && (0, delivery_1.isValidBoardSignalEmail)(request.preferredContactValue);
    const notificationPreferences = {
        ...(0, account_1.defaultNotificationPreferences)(),
        ...currentPreferences,
        email: newlyCreatedAccess && consentedEmail ? true : currentPreferences.email ?? false,
        browserPush: currentPreferences.browserPush ?? false,
        deskReady: currentPreferences.deskReady ?? true,
        episodeProgress: currentPreferences.episodeProgress ?? true,
        blueReminder: currentPreferences.blueReminder ?? true,
        universeAchievement: currentPreferences.universeAchievement ?? true,
        founderUpdates: currentPreferences.founderUpdates ?? true,
    };
    const confirmedAccount = {
        ...account,
        ...(validExternalContact ? { preferredContactMethod: request.preferredContactMethod, preferredContactValue: request.preferredContactValue, betaContactConsent: true } : {}),
        ...(completedReturnDecision ? { contactConfirmedAt: account.contactConfirmedAt ?? decidedAt, preferencesConfirmedAt: account.preferencesConfirmedAt ?? decidedAt } : {}),
        universeParticipationDisclosedAt: account.universeParticipationDisclosedAt ?? decidedAt,
        identityStatus: "founder_reviewed",
        identityReviewStatus: "confirmed",
        founderReviewedAt: account.founderReviewedAt ?? decidedAt,
        privacy: { ...account.privacy, publicPlayerPage: true, universeCoverage: true },
        notificationPreferences,
    };
    await db.collection("users").doc(account.uid).set(clean({
        ...(validExternalContact ? { preferredContactMethod: request.preferredContactMethod, preferredContactValue: request.preferredContactValue, betaContactConsent: true } : {}),
        ...(completedReturnDecision ? { contactConfirmedAt: account.contactConfirmedAt ?? decidedAt, preferencesConfirmedAt: account.preferencesConfirmedAt ?? decidedAt } : {}),
        universeParticipationDisclosedAt: account.universeParticipationDisclosedAt ?? decidedAt,
        identityStatus: "founder_reviewed",
        identityReviewStatus: "confirmed",
        founderReviewedAt: account.founderReviewedAt ?? decidedAt,
        privacy: { ...account.privacy, publicPlayerPage: true, universeCoverage: true },
        notificationPreferences,
    }), { merge: true });
    await db.collection("publicPlayers").doc(String(request.chessPlayerId)).set(clean({
        chessPlayerId: String(request.chessPlayerId), username: request.canonicalUsername, usernameKey: request.canonicalUsername.toLowerCase(), avatar: request.avatar, profileUrl: request.profileUrl, pageEnabled: true,
    }), { merge: true });
    const publicHighlights = await reconcileConfirmedPublicHighlights(confirmedAccount);
    await (0, universePulse_1.writePublicUniverseEvent)(newPlayerUniverseEvent(request, decidedAt));
    const magic = (0, activation_1.betaMagicAccessCredential)(request.id, request.chessPlayerId, account.uid, new Date(decidedAt));
    await ref.set({ status: "approved", identityReviewStatus: "confirmed", decidedAt, firebaseUid: account.uid, magicAccess: magic.record, claimedAt: null, previewClaimConsumedAt: null }, { merge: true });
    let accessEmailDelivery = "not_eligible";
    if (consentedEmail) {
        const delivery = (0, delivery_2.getBoardSignalDeliveryStatus)();
        if (!delivery.emailConfigured)
            accessEmailDelivery = "not_configured";
        else {
            const email = await (0, email_1.sendBoardSignalEmail)({
                to: String(request.preferredContactValue),
                subject: "Your BoardSignal is ready",
                text: `Your private Player Room is ready.\n\nOpen My Player Room: ${magic.link}`,
            });
            accessEmailDelivery = email.delivered ? "delivered" : "failed";
        }
        await ref.set({ accessEmailDelivery }, { merge: true });
    }
    const previewDevice = request.activationReturnMethod === "device" ? request.activationDevice : undefined;
    const deviceDelivery = await (0, activation_1.notifyApprovedBetaPreviewDevice)({ requestId: request.id, fcmToken: previewDevice?.token }).catch(() => ({ eligible: true, delivered: 0, failed: 1, status: "failed" }));
    await ref.set({ activationDeviceDelivery: deviceDelivery.status }, { merge: true }).catch(() => undefined);
    return {
        request: { ...request, status: "approved", identityReviewStatus: "confirmed", decidedAt, firebaseUid: account.uid, magicAccess: magic.record, accessEmailDelivery, activationDeviceDelivery: deviceDelivery.status },
        account: confirmedAccount,
        accessCode: result.accessCode,
        magicLink: magic.link,
        magicAccessExpiresAt: magic.expiresAt,
        approvalMessage: accessMessage(request.canonicalUsername, magic.link),
        accessEmailDelivery,
        deviceDelivery: deviceDelivery.status,
        publicHighlights,
    };
}
async function confirmFoundingBetaIdentity(requestId) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const ref = db.collection("betaRequests").doc(requestId);
    const snapshot = await ref.get();
    if (!snapshot.exists)
        throw Object.assign(new Error("The Founding Beta request was not found."), { status: 404 });
    const request = snapshot.data();
    if (request.status === "approved" && request.identityReviewStatus === "confirmed") {
        return { request, alreadyConfirmed: true, playerAlreadyInside: Boolean(request.provisionalClaimedAt || request.claimedAt) };
    }
    if (request.status !== "pending" || request.identityReviewStatus === "rejected") {
        throw Object.assign(new Error("This Founding Beta identity cannot be confirmed from its current state."), { status: 409 });
    }
    // If the player has not entered yet, preserve the existing reviewed-approval
    // flow so historical magic/Beta recovery remains compatible.
    if (!request.provisionalClaimedAt) {
        const approved = await approveFoundingBetaRequest(requestId);
        return { ...approved, alreadyConfirmed: false, playerAlreadyInside: false };
    }
    const uid = request.firebaseUid ?? `chesscom_${request.chessPlayerId}`;
    const userRef = db.collection("users").doc(uid);
    const userSnapshot = await userRef.get();
    const account = userSnapshot.data();
    if (!account || account.uid !== uid || account.chessCom?.playerId !== request.chessPlayerId || account.identityStatus !== "provisional") {
        throw Object.assign(new Error("The provisional Player Room no longer matches this stable request identity."), { status: 409, code: "PROVISIONAL_IDENTITY_MISMATCH" });
    }
    const decidedAt = new Date().toISOString();
    const confirmedAccount = {
        ...account,
        identityStatus: "founder_reviewed",
        identityReviewStatus: "confirmed",
        founderReviewedAt: decidedAt,
        universeParticipationDisclosedAt: account.universeParticipationDisclosedAt ?? decidedAt,
        privacy: { ...account.privacy, publicPlayerPage: true, universeCoverage: true },
    };
    await userRef.set(clean({
        identityStatus: "founder_reviewed",
        identityReviewStatus: "confirmed",
        founderReviewedAt: decidedAt,
        universeParticipationDisclosedAt: account.universeParticipationDisclosedAt ?? decidedAt,
        privacy: { ...account.privacy, publicPlayerPage: true, universeCoverage: true },
    }), { merge: true });
    await db.collection("publicPlayers").doc(String(request.chessPlayerId)).set(clean({
        chessPlayerId: String(request.chessPlayerId),
        username: request.canonicalUsername,
        usernameKey: request.canonicalUsername.toLowerCase(),
        avatar: request.avatar,
        profileUrl: request.profileUrl,
        pageEnabled: true,
    }), { merge: true });
    const publicHighlights = await reconcileConfirmedPublicHighlights(confirmedAccount);
    await ref.set({ status: "approved", identityReviewStatus: "confirmed", decidedAt }, { merge: true });
    await (0, universePulse_1.writePublicUniverseEvent)(newPlayerUniverseEvent(request, decidedAt));
    return {
        request: { ...request, status: "approved", identityReviewStatus: "confirmed", decidedAt },
        account: confirmedAccount,
        publicHighlights,
        alreadyConfirmed: false,
        playerAlreadyInside: true,
    };
}
async function revokeProvisionalFoundingBetaIdentity(requestId) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const ref = db.collection("betaRequests").doc(requestId);
    const snapshot = await ref.get();
    if (!snapshot.exists)
        throw Object.assign(new Error("The Founding Beta request was not found."), { status: 404 });
    const request = snapshot.data();
    if (!request.provisionalClaimedAt) {
        if (request.status === "pending")
            return rejectFoundingBetaRequest(requestId);
        throw Object.assign(new Error("Only an active provisional Player Room can be revoked here."), { status: 409 });
    }
    const uid = request.firebaseUid ?? `chesscom_${request.chessPlayerId}`;
    const userRef = db.collection("users").doc(uid);
    const userSnapshot = await userRef.get();
    const account = userSnapshot.data();
    if (!account || account.chessCom?.playerId !== request.chessPlayerId || account.identityStatus !== "provisional") {
        throw Object.assign(new Error("This request is not an active provisional BoardSignal identity."), { status: 409, code: "PROVISIONAL_REVOKE_BLOCKED" });
    }
    const revokedAt = new Date().toISOString();
    await userRef.set({ identityStatus: "revoked", identityReviewStatus: "rejected", accessStatus: "paused" }, { merge: true });
    await ref.set({ status: "rejected", identityReviewStatus: "rejected", decidedAt: revokedAt, revokedAt, activationDevice: null }, { merge: true });
    await (0, firebaseAdmin_1.getAdminAuth)().revokeRefreshTokens(uid);
    return { request: { ...request, status: "rejected", identityReviewStatus: "rejected", decidedAt: revokedAt, revokedAt }, uid, revokedAt };
}
async function regenerateFoundingBetaMagicAccess(requestId) {
    const ref = (0, firebaseAdmin_1.getAdminDb)().collection("betaRequests").doc(requestId);
    const snapshot = await ref.get();
    if (!snapshot.exists)
        throw Object.assign(new Error("The Founding Beta request was not found."), { status: 404 });
    const request = snapshot.data();
    const provisionalRecovery = request.status === "pending" && Boolean(request.provisionalClaimedAt) && request.identityReviewStatus !== "rejected";
    if (!(request.status === "approved" || provisionalRecovery))
        throw Object.assign(new Error("Private recovery access is not available for this request yet."), { status: 409 });
    const uid = request.firebaseUid ?? `chesscom_${request.chessPlayerId}`;
    const magic = (0, activation_1.betaMagicAccessCredential)(request.id, request.chessPlayerId, uid);
    await ref.set(clean({ magicAccess: magic.record, claimedAt: null, previewClaimConsumedAt: null }), { merge: true });
    return { request, magicLink: magic.link, magicAccessExpiresAt: magic.expiresAt, approvalMessage: accessMessage(request.canonicalUsername, magic.link) };
}
async function rejectFoundingBetaRequest(requestId) {
    const ref = (0, firebaseAdmin_1.getAdminDb)().collection("betaRequests").doc(requestId);
    const snapshot = await ref.get();
    if (!snapshot.exists)
        throw Object.assign(new Error("The Founding Beta request was not found."), { status: 404 });
    const request = snapshot.data();
    if (request.status !== "pending")
        throw Object.assign(new Error(`This request is already ${request.status}.`), { status: 409 });
    const decidedAt = new Date().toISOString();
    await ref.set({ status: "rejected", decidedAt, activationDevice: null }, { merge: true });
    return { ...request, status: "rejected", decidedAt };
}
