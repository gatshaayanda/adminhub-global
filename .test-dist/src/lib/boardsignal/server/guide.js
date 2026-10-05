"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordGuidePlayerRoomSnapshot = recordGuidePlayerRoomSnapshot;
exports.guideResponse = guideResponse;
exports.getGuideProfileState = getGuideProfileState;
exports.saveGuidePreference = saveGuidePreference;
exports.updateGuideState = updateGuideState;
exports.recordGuideFeedback = recordGuideFeedback;
exports.createGuideHandoff = createGuideHandoff;
exports.founderGuideSummary = founderGuideSummary;
require("server-only");
const node_crypto_1 = require("node:crypto");
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("@/utils/firebaseAdmin");
const guide_1 = require("../guide");
const persistence_1 = require("./persistence");
const communications_1 = require("./communications");
const delivery_1 = require("./delivery");
const delivery_2 = require("../delivery");
const social_1 = require("./social");
const universePulse_1 = require("./universePulse");
const activation_1 = require("./activation");
const MAX_MESSAGE = 1200;
const MAX_SUPPORT_MESSAGE = 1800;
const GUIDE_RELEASE_HINT = "friends-rivals-2026-08-12";
const TONES = new Set(["Balanced", "Direct", "Analytical", "Sports Desk", "Encouraging"]);
const DETAILS = new Set(["Short", "Standard", "Detailed"]);
function nowIso() { return new Date().toISOString(); }
function clean(value) {
    return Object.fromEntries(Object.entries(value).filter(([, nested]) => nested !== undefined));
}
function safeText(input, limit) { return String(input ?? "").trim().slice(0, limit); }
function safePath(input) {
    const value = safeText(input, 300);
    return value.startsWith("/") ? value : "/";
}
function safeActiveTab(input) {
    const value = safeText(input, 40).toLowerCase();
    return ["desk", "progress", "universe", "friends", "head-to-head", "inbox", "profile", "agreement", "beta-request"].includes(value) ? value : undefined;
}
function safeVisibleEntityId(input) {
    const value = Number(input);
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}
async function recordGuidePlayerRoomSnapshot(account, capture) {
    const pulseFacts = [
        ...(capture.pulse?.sinceAway ? [capture.pulse.sinceAway] : []),
        ...(capture.pulse?.boardMoved ?? []),
        ...(capture.pulse?.proximity ?? []),
        ...(capture.pulse?.fieldMoved ?? []).map((event) => ({ eyebrow: "THE FIELD MOVED", title: event.headline, body: event.supportingFact })),
    ].slice(0, 10).map((item) => ({ eyebrow: item.eyebrow, title: item.title ?? "", body: item.body ?? "", facts: "facts" in item ? item.facts : undefined }));
    const latestDesk = capture.latestDesk ? {
        periodLabel: capture.latestDesk.period.label,
        headline: capture.latestDesk.headline,
        summary: capture.latestDesk.summary,
        games: capture.latestDesk.games,
        wins: capture.latestDesk.wins,
        draws: capture.latestDesk.draws,
        losses: capture.latestDesk.losses,
        score: capture.latestDesk.score,
        primaryPool: capture.latestDesk.primaryPool,
        blue: capture.latestDesk.signals.blue ? { title: capture.latestDesk.signals.blue.title, copy: capture.latestDesk.signals.blue.copy } : undefined,
        amber: capture.latestDesk.signals.amber ? { title: capture.latestDesk.signals.amber.title, copy: capture.latestDesk.signals.amber.copy } : undefined,
        red: capture.latestDesk.signals.red ? { title: capture.latestDesk.signals.red.title, copy: capture.latestDesk.signals.red.copy } : undefined,
    } : undefined;
    await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(account.uid).collection("guide").doc("session").set(clean({
        updatedAt: nowIso(),
        currentEpisode: capture.currentEpisode,
        latestDesk,
        recentDeskLabels: capture.recentDeskLabels.slice(0, 4),
        pulseFacts,
        standings: (capture.pulse?.standings ?? []).slice(0, 12).map((standing) => ({
            categoryTitle: standing.categoryTitle,
            scopeLabel: standing.scopeLabel,
            rank: standing.rank,
            denominator: standing.denominator,
            valueLabel: standing.valueLabel,
        })),
        shareMoments: (capture.shareMoments ?? []).filter((moment) => moment.safePublic).slice(0, 3).map((moment) => ({
            id: moment.id, headline: moment.headline, supportingFact: moment.supportingFact, statValue: moment.statValue, statLabel: moment.statLabel,
        })),
    }), { merge: false });
}
async function loadGuidePreferences(uid) {
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(uid).collection("guide").doc("profile").get();
    const data = snapshot.data();
    return { ...guide_1.DEFAULT_GUIDE_PREFERENCES, ...(data ?? {}) };
}
async function loadGuideMemory(uid) {
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(uid).collection("guide").doc("memory").get();
    const data = snapshot.data();
    return { recentTopics: [], productSignals: [], ...(data ?? {}) };
}
function latestAnnouncement(messages) {
    // "What's new?" is product-release context, not the player's general Founder
    // conversation. Generic/custom support or test messages remain in Inbox but
    // must never masquerade as a BoardSignal product announcement.
    const message = messages.find((item) => (0, guide_1.isGuideWhatsNewMessage)(item));
    return message ? { id: message.id, title: message.title, body: message.body, link: message.link, actionLabel: message.actionLabel, createdAt: message.createdAt } : undefined;
}
async function buildAuthenticatedContext(token, pathname, activeTab, message = "", visibleEntityId, recentConversation = []) {
    const account = await (0, persistence_1.accountForToken)(token);
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const [sessionDoc, preferences, inbox, social] = await Promise.all([
        db.collection("users").doc(account.uid).collection("guide").doc("session").get(),
        loadGuidePreferences(account.uid),
        (0, communications_1.listPlayerInbox)(token).catch(() => ({ messages: [], unreadCount: 0 })),
        (0, social_1.socialOverview)(account).catch(() => ({ friends: [], incoming: [], outgoing: [], rivalWatch: [], socialPulse: [] })),
    ]);
    const session = (sessionDoc.data() ?? {});
    let comparison;
    const friend = social.friends.find((item) => item.playerId === visibleEntityId || message.toLowerCase().includes(item.canonicalUsername.toLowerCase()));
    if (friend)
        comparison = await (0, social_1.headToHead)(account, friend.playerId).catch(() => undefined);
    // Backfill useful account facts if the player has not opened the current Player Room since this patch.
    let latestDesk = session.latestDesk;
    let recentDeskLabels = Array.isArray(session.recentDeskLabels) ? session.recentDeskLabels : undefined;
    let shareMoments = Array.isArray(session.shareMoments) ? session.shareMoments : undefined;
    if (!latestDesk || !recentDeskLabels || !shareMoments) {
        const desks = await (0, persistence_1.loadPublishedDesks)(account.uid).catch(() => []);
        const latest = desks[0]?.desk;
        if (latest && !latestDesk)
            latestDesk = {
                periodLabel: latest.period.label, headline: latest.headline, summary: latest.summary, games: latest.games, wins: latest.wins,
                draws: latest.draws, losses: latest.losses, score: latest.score, primaryPool: latest.primaryPool,
                blue: latest.signals.blue ? { title: latest.signals.blue.title, copy: latest.signals.blue.copy } : undefined,
                amber: latest.signals.amber ? { title: latest.signals.amber.title, copy: latest.signals.amber.copy } : undefined,
                red: latest.signals.red ? { title: latest.signals.red.title, copy: latest.signals.red.copy } : undefined,
            };
        recentDeskLabels ??= desks.map((item) => item.summary.periodLabel).slice(0, 4);
        if (!shareMoments) {
            shareMoments = (await (0, universePulse_1.listPlayerShareMoments)(account.chessCom.playerId).catch(() => [])).slice(0, 3).map((moment) => ({ id: moment.id, headline: moment.headline, supportingFact: moment.supportingFact, statValue: moment.statValue, statLabel: moment.statLabel }));
        }
    }
    return {
        account,
        context: {
            authenticated: true,
            pathname,
            activeTab,
            canonicalUsername: account.chessCom.canonicalUsername,
            currentEpisode: (session.currentEpisode ?? account.currentEpisodeSummary),
            latestDesk,
            recentDeskLabels,
            pulseFacts: Array.isArray(session.pulseFacts) ? session.pulseFacts : [],
            standings: Array.isArray(session.standings) ? session.standings : [],
            shareMoments,
            friends: social.friends,
            incomingRequests: social.incoming,
            outgoingRequests: social.outgoing,
            rivalWatch: social.rivalWatch,
            comparison,
            unreadInboxCount: inbox.unreadCount,
            latestAnnouncement: latestAnnouncement(inbox.messages),
            notificationPreferences: account.notificationPreferences,
            deliveryStatus: (0, delivery_1.getBoardSignalDeliveryStatus)(),
            emailAccountReady: account.betaContactConsent === true && account.preferredContactMethod === "email" && (0, delivery_2.isValidBoardSignalEmail)(account.preferredContactValue) && account.notificationPreferences.email === true,
            preferences,
            tourState: (await db.collection("users").doc(account.uid).collection("guide").doc("state").get()).data()?.tourState ?? "unseen",
            releaseHintDismissed: (await db.collection("users").doc(account.uid).collection("guide").doc("state").get()).data()?.releaseHintDismissed === GUIDE_RELEASE_HINT,
            recentConversation,
            contextUpdatedAt: typeof session.updatedAt === "string" ? session.updatedAt : account.lastSeenAt,
        },
    };
}
function guidePreviewContext(preview, request) {
    const primary = preview.pools.find((pool) => pool.pool === preview.primaryPool) ?? preview.pools[0];
    return {
        canonicalUsername: preview.canonicalUsername, playableWeek: preview.playableWeek, periodLabel: preview.period?.label, disclosure: preview.period?.disclosure,
        games: preview.games, wins: preview.wins, draws: preview.draws, losses: preview.losses, score: preview.score, primaryPool: preview.primaryPool, primaryPoolDelta: primary?.ratingDelta,
        strongestWinRun: preview.strongestWinRun, safeHeadline: preview.safeHeadline, safeHighlight: preview.safeHighlight, generatedAt: preview.generatedAt,
        universePreview: preview.universePreview.map((item) => ({ categoryTitle: item.categoryTitle, scopeLabel: item.scopeLabel, rank: item.rank, denominator: item.denominator, valueLabel: item.valueLabel, nearestAbove: item.nearestAbove })),
        activationReturnMethod: ["device", "email", "discord", "telegram", "return_here"].includes(String(request?.activationReturnMethod ?? "")) ? request?.activationReturnMethod : undefined,
        deviceAlertsEnabled: Boolean(request?.activationDevice?.registeredAt),
    };
}
async function guideResponse(input) {
    const message = safeText(input.message, MAX_MESSAGE);
    const pathname = safePath(input.pathname);
    const activeTab = safeActiveTab(input.activeTab);
    const visibleEntityId = safeVisibleEntityId(input.visibleEntityId);
    const recentConversation = (0, guide_1.sanitizeGuideConversation)(input.recentConversation);
    if (!input.token) {
        if (input.mode === "beta_preview") {
            const requestId = safeText(input.previewRequestId, 180);
            const verified = await (0, activation_1.verifyBetaPreviewStatusCredential)(requestId, input.previewStatusToken);
            const preview = verified.request.previewSnapshot;
            if (!preview)
                throw Object.assign(new Error("This BoardSignal preview is not ready yet."), { status: 409 });
            const context = { authenticated: false, mode: "beta_preview", previewContext: guidePreviewContext(preview, verified.request), pathname, activeTab: "beta-request", recentConversation, deliveryStatus: (0, delivery_1.getBoardSignalDeliveryStatus)(), contextUpdatedAt: preview.generatedAt };
            return guide_1.deterministicGuideRenderer.render((0, guide_1.runGuideBrain)(message, context));
        }
        const context = { authenticated: false, pathname, activeTab, recentConversation, deliveryStatus: (0, delivery_1.getBoardSignalDeliveryStatus)() };
        return guide_1.deterministicGuideRenderer.render((0, guide_1.runGuideBrain)(message, context));
    }
    const { account, context } = await buildAuthenticatedContext(input.token, pathname, activeTab, message, visibleEntityId, recentConversation);
    const brain = (0, guide_1.runGuideBrain)(message, context);
    const response = guide_1.deterministicGuideRenderer.render(brain);
    await recordGuideInteraction(account, response.category ?? "general", brain.intent, message);
    return response;
}
async function recordGuideInteraction(account, category, topic, message) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const memory = (0, guide_1.boundedGuideMemory)(await loadGuideMemory(account.uid), topic, category === "general" ? undefined : category);
    const sentiment = (0, guide_1.expressedSentiment)(message);
    const updatedAt = nowIso();
    const next = clean({ ...memory, ...(sentiment ? { recentSentiment: sentiment, recentSentimentAt: updatedAt } : {}), updatedAt });
    await Promise.all([
        db.collection("users").doc(account.uid).collection("guide").doc("memory").set(next, { merge: true }),
        incrementGuideAnalytics(category),
    ]).catch(() => undefined);
}
async function incrementGuideAnalytics(category) {
    const period = new Date().toISOString().slice(0, 10);
    await (0, firebaseAdmin_1.getAdminDb)().collection("guideAnalytics").doc(period).set({
        period,
        usage: firestore_1.FieldValue.increment(1),
        categories: { [category]: firestore_1.FieldValue.increment(1) },
        updatedAt: nowIso(),
    }, { merge: true });
}
async function getGuideProfileState(token) {
    const account = await (0, persistence_1.accountForToken)(token);
    const [preferences, state] = await Promise.all([
        loadGuidePreferences(account.uid),
        (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(account.uid).collection("guide").doc("state").get(),
    ]);
    return { preferences, tourState: state.data()?.tourState ?? "unseen", releaseHintDismissed: state.data()?.releaseHintDismissed === GUIDE_RELEASE_HINT };
}
async function saveGuidePreference(token, input) {
    if (input.confirmed !== true)
        throw Object.assign(new Error("Guide preference changes require explicit confirmation."), { status: 400 });
    const account = await (0, persistence_1.accountForToken)(token);
    const current = await loadGuidePreferences(account.uid);
    const preferredTone = typeof input.preferredTone === "string" && TONES.has(input.preferredTone) ? input.preferredTone : current.preferredTone;
    const preferredDetailLevel = typeof input.preferredDetailLevel === "string" && DETAILS.has(input.preferredDetailLevel) ? input.preferredDetailLevel : current.preferredDetailLevel;
    const preferredAddress = safeText(input.preferredAddress, 60) || current.preferredAddress;
    const next = { ...current, preferredTone, preferredDetailLevel, preferredAddress, lastExplicitToneFeedback: `Confirmed ${preferredTone}`, updatedAt: nowIso() };
    await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(account.uid).collection("guide").doc("profile").set(clean(next), { merge: true });
    return next;
}
async function updateGuideState(token, input) {
    if (input.confirmed !== true)
        throw Object.assign(new Error("This guide action requires explicit confirmation."), { status: 400 });
    const account = await (0, persistence_1.accountForToken)(token);
    const data = { updatedAt: nowIso() };
    if (["completed", "dismissed"].includes(String(input.tourState)))
        data.tourState = String(input.tourState);
    if (input.releaseHint === "dismiss")
        data.releaseHintDismissed = GUIDE_RELEASE_HINT;
    await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(account.uid).collection("guide").doc("state").set(data, { merge: true });
    return data;
}
async function recordGuideFeedback(token, input) {
    const account = await (0, persistence_1.accountForToken)(token);
    const id = (0, node_crypto_1.randomUUID)();
    const helpful = input.helpful === true ? true : input.helpful === false ? false : undefined;
    await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(account.uid).collection("guideFeedback").doc(id).set(clean({
        id, userId: account.uid, helpful, category: safeText(input.category, 60) || "general", note: safeText(input.note, 500) || undefined, createdAt: nowIso(),
    }));
    await (0, firebaseAdmin_1.getAdminDb)().collection("guideAnalytics").doc(new Date().toISOString().slice(0, 10)).set({ feedback: firestore_1.FieldValue.increment(1), updatedAt: nowIso() }, { merge: true }).catch(() => undefined);
    return { id };
}
async function createGuideHandoff(token, input) {
    if (input.confirmed !== true)
        throw Object.assign(new Error("Message Ayanda requires explicit confirmation."), { status: 400 });
    const account = await (0, persistence_1.accountForToken)(token);
    const body = safeText(input.message, MAX_SUPPORT_MESSAGE) || "I need help with BoardSignal.";
    const pathname = safePath(input.pathname);
    const activeTab = safeActiveTab(input.activeTab);
    const category = safeText(input.category, 60) || "support_request";
    const errorCode = safeText(input.errorCode, 80) || undefined;
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const threadId = `guide_${(0, node_crypto_1.randomUUID)()}`;
    const messageId = (0, node_crypto_1.randomUUID)();
    const createdAt = nowIso();
    const latestDesk = (await (0, persistence_1.loadPublishedDesks)(account.uid).catch(() => []))[0];
    const contextLines = [
        `Player: ${account.chessCom.canonicalUsername}`,
        `Page: ${pathname}${activeTab ? ` / ${activeTab}` : ""}`,
        `Latest completed Desk: ${latestDesk?.summary.periodLabel ?? "none"}`,
        `Current episode: ${account.currentEpisodeSummary?.status ?? "unknown"}${account.currentEpisodeSummary?.games !== undefined ? ` · ${account.currentEpisodeSummary.games} games` : ""}`,
        `Category: ${category}`,
        ...(errorCode ? [`Error code: ${errorCode}`] : []),
    ];
    const founderBody = `${body}\n\nContext:\n${contextLines.join("\n")}`;
    const threadRef = db.collection("users").doc(account.uid).collection("conversations").doc(threadId);
    await threadRef.set({ id: threadId, userId: account.uid, title: "Ask BoardSignal support", allowReply: true, createdAt, updatedAt: createdAt, unreadForFounder: true, lastSenderType: "player", source: "ask_boardsignal", supportCategory: category });
    const message = { id: messageId, userId: account.uid, threadId, body: founderBody, senderType: "player", createdAt };
    await threadRef.collection("messages").doc(messageId).set(message);
    await db.collection("users").doc(account.uid).collection("guide").doc("memory").set({ recentSupportIssue: category, unresolvedQuestion: body, updatedAt: createdAt }, { merge: true });
    return { threadId, messageId };
}
async function founderGuideSummary() {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const [users, analytics] = await Promise.all([
        db.collection("users").get(),
        db.collection("guideAnalytics").orderBy("period", "desc").limit(14).get().catch(() => ({ docs: [] })),
    ]);
    const accounts = users.docs.map((doc) => doc.data()).filter((account) => account.role === "player" && account.accessStatus === "active");
    const relationshipPulse = [];
    let unresolvedSupport = 0;
    let feedbackCount = 0;
    for (const account of accounts) {
        const [memoryDoc, prefDoc, feedback, threads] = await Promise.all([
            db.collection("users").doc(account.uid).collection("guide").doc("memory").get(),
            db.collection("users").doc(account.uid).collection("guide").doc("profile").get(),
            db.collection("users").doc(account.uid).collection("guideFeedback").limit(20).get(),
            db.collection("users").doc(account.uid).collection("conversations").where("unreadForFounder", "==", true).get(),
        ]);
        const memory = memoryDoc.data();
        const prefs = { ...guide_1.DEFAULT_GUIDE_PREFERENCES, ...prefDoc.data() };
        const now = Date.now();
        feedbackCount += feedback.docs.filter((doc) => now - Date.parse(String(doc.data().createdAt ?? "")) < 14 * 24 * 60 * 60 * 1000).length;
        const openAskThreads = threads.docs.filter((doc) => doc.data().source === "ask_boardsignal");
        unresolvedSupport += openAskThreads.length;
        const hasRecentSentiment = Boolean(memory?.recentSentimentAt) && now - Date.parse(String(memory?.recentSentimentAt)) < 14 * 24 * 60 * 60 * 1000;
        if (memory?.updatedAt || memory?.recentSupportIssue || memory?.productSignals?.length)
            relationshipPulse.push({
                username: account.chessCom.canonicalUsername,
                expressedSentiment: hasRecentSentiment ? memory?.recentSentiment ?? "neutral" : "neutral",
                engagement: account.lastSeenAt && now - Date.parse(account.lastSeenAt) < 7 * 24 * 60 * 60 * 1000 ? "active" : "quiet recently",
                oftenAsksAbout: (memory.productSignals ?? []).slice(0, 3),
                preferredCommunication: `${prefs.preferredTone} / ${prefs.preferredDetailLevel}`,
                openSupportIssue: openAskThreads.length ? memory?.recentSupportIssue ?? "Open Ask BoardSignal handoff" : "None",
                lastAskBoardSignalInteraction: memory.recentTopics?.[0] ?? "None",
                recommendedFounderContext: memory.productSignals?.[0] ? `Player has recently asked about ${memory.productSignals[0].replaceAll("_", " ")}.` : "No specific product context recorded.",
            });
    }
    const categories = {};
    let usage = 0;
    for (const doc of analytics.docs) {
        const data = doc.data();
        usage += Number(data.usage ?? 0);
        for (const [key, value] of Object.entries(data.categories ?? {}))
            categories[key] = (categories[key] ?? 0) + Number(value ?? 0);
    }
    return {
        usage,
        topQuestionCategories: Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([category, count]) => ({ category, count })),
        unresolvedSupportHandoffs: unresolvedSupport,
        recentFeedbackCount: feedbackCount,
        relationshipPulse: relationshipPulse.slice(0, 12),
    };
}
