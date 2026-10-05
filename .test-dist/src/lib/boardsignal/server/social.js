"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFriendRequest = sendFriendRequest;
exports.acceptFriendRequest = acceptFriendRequest;
exports.declineFriendRequest = declineFriendRequest;
exports.cancelFriendRequest = cancelFriendRequest;
exports.unfriend = unfriend;
exports.blockPlayer = blockPlayer;
exports.setRivalPin = setRivalPin;
exports.searchSocialPlayers = searchSocialPlayers;
exports.socialOverview = socialOverview;
exports.headToHead = headToHead;
exports.suggestedSocialPlayers = suggestedSocialPlayers;
require("server-only");
const node_crypto_1 = require("node:crypto");
const account_1 = require("../account");
const pulse_1 = require("../pulse");
const universe_1 = require("../universe");
const social_1 = require("../social");
const firebaseAdmin_1 = require("../../../utils/firebaseAdmin");
const communications_1 = require("./communications");
const persistence_1 = require("./persistence");
const universePulse_1 = require("./universePulse");
function clean(value) { return JSON.parse(JSON.stringify(value)); }
function nowIso(now = new Date()) { return now.toISOString(); }
function numericPlayerId(value) {
    const playerId = Number(value);
    if (!Number.isSafeInteger(playerId) || playerId <= 0)
        throw Object.assign(new Error("A stable Chess.com player ID is required."), { status: 400 });
    return playerId;
}
function activeSocialMember(account) {
    return Boolean(account
        && account.role === "player"
        && account.accessStatus === "active"
        && account.accessTier === "founding_beta"
        && (0, account_1.hasAcceptedCurrentBetaAgreement)(account)
        && account.universeParticipationDisclosedAt);
}
async function accountByPlayerId(playerId) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const mapping = await db.collection("chessPlayerAccounts").doc(String(playerId)).get();
    const uid = mapping.exists && typeof mapping.data()?.uid === "string" ? String(mapping.data().uid) : `chesscom_${playerId}`;
    const snapshot = await db.collection("users").doc(uid).get();
    const account = snapshot.exists ? snapshot.data() : undefined;
    if (!activeSocialMember(account))
        throw Object.assign(new Error("That BoardSignal player is not available for social connection."), { status: 404 });
    return account;
}
async function blocksEitherDirection(a, b) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const [ab, ba] = await Promise.all([
        db.collection("socialBlocks").doc((0, social_1.socialBlockId)(a, b)).get(),
        db.collection("socialBlocks").doc((0, social_1.socialBlockId)(b, a)).get(),
    ]);
    return ab.exists || ba.exists;
}
function projectionFor(account, other, relationship, status, previous) {
    return {
        relationshipId: relationship.id,
        otherPlayerId: other.chessCom.playerId,
        canonicalUsername: other.chessCom.canonicalUsername,
        avatar: other.chessCom.avatar,
        status,
        updatedAt: relationship.updatedAt,
        rivalPinned: previous?.rivalPinned === true,
    };
}
async function projection(uid, otherPlayerId) {
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(uid).collection("social").doc(String(otherPlayerId)).get();
    return snapshot.exists ? snapshot.data() : undefined;
}
async function createFriendshipFromPending(relationship, actor, target, now = new Date()) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const ref = db.collection("socialRelationships").doc(relationship.id);
    const updatedAt = nowIso(now);
    const next = { ...relationship, status: "friends", acceptedAt: updatedAt, updatedAt };
    const actorPrevious = await projection(actor.uid, target.chessCom.playerId);
    const targetPrevious = await projection(target.uid, actor.chessCom.playerId);
    await db.runTransaction(async (transaction) => {
        const latest = await transaction.get(ref);
        if (!latest.exists || latest.data()?.status !== "pending")
            throw Object.assign(new Error("This friend request is no longer pending."), { status: 409 });
        transaction.set(ref, clean(next));
        transaction.set(db.collection("users").doc(actor.uid).collection("social").doc(String(target.chessCom.playerId)), clean(projectionFor(actor, target, next, "friends", actorPrevious)));
        transaction.set(db.collection("users").doc(target.uid).collection("social").doc(String(actor.chessCom.playerId)), clean(projectionFor(target, actor, next, "friends", targetPrevious)));
    });
    return next;
}
async function sendFriendRequest(actor, targetPlayerIdInput) {
    const targetPlayerId = numericPlayerId(targetPlayerIdInput);
    if (actor.chessCom.playerId === targetPlayerId)
        throw Object.assign(new Error("You cannot send a friend request to yourself."), { status: 400 });
    const target = await accountByPlayerId(targetPlayerId);
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const id = (0, social_1.canonicalSocialRelationshipId)(actor.chessCom.playerId, targetPlayerId);
    if (await blocksEitherDirection(actor.chessCom.playerId, targetPlayerId)) {
        throw Object.assign(new Error("This social connection is unavailable."), { status: 403 });
    }
    const ref = db.collection("socialRelationships").doc(id);
    const existingSnapshot = await ref.get();
    const existing = existingSnapshot.exists ? existingSnapshot.data() : undefined;
    const transition = (0, social_1.resolveFriendRequestTransition)({ actorPlayerId: actor.chessCom.playerId, targetPlayerId, existing });
    if (!transition.allowed) {
        const message = transition.reason === "duplicate" ? "A friend request is already pending." : transition.reason === "already_friends" ? "You are already friends." : "This social connection is unavailable.";
        throw Object.assign(new Error(message), { status: 409 });
    }
    if (transition.action === "accept_mutual" && existing) {
        const relationship = await createFriendshipFromPending(existing, actor, target);
        await (0, communications_1.sendRelationshipNotification)(target, {
            id: `friend_accepted_${relationship.id}`,
            type: "friend_accepted",
            title: "Friend connected",
            body: `You're now connected with ${actor.chessCom.canonicalUsername}.`,
            link: "/boardsignal/player-room?tab=friends",
            actionLabel: "Compare",
        }).catch(() => undefined);
        return { status: "friends", relationship };
    }
    const rateRef = db.collection("socialRequestRateLimits").doc(`${actor.chessCom.playerId}_${targetPlayerId}`);
    const rate = await rateRef.get();
    const nextAllowedAt = Number(rate.data()?.nextAllowedAt ?? 0);
    if (rate.exists && Number.isFinite(nextAllowedAt) && nextAllowedAt > Date.now()) {
        throw Object.assign(new Error("A recent friend request was already sent to this player. Try again later."), { status: 429 });
    }
    const timestamp = nowIso();
    const relationship = {
        id,
        playerAId: Math.min(actor.chessCom.playerId, targetPlayerId),
        playerAUid: actor.chessCom.playerId < targetPlayerId ? actor.uid : target.uid,
        playerBId: Math.max(actor.chessCom.playerId, targetPlayerId),
        playerBUid: actor.chessCom.playerId < targetPlayerId ? target.uid : actor.uid,
        status: "pending",
        requestedByPlayerId: actor.chessCom.playerId,
        requestedAt: timestamp,
        updatedAt: timestamp,
    };
    await db.runTransaction(async (transaction) => {
        const latest = await transaction.get(ref);
        if (latest.exists)
            throw Object.assign(new Error("A social relationship already exists for these players."), { status: 409 });
        transaction.create(ref, clean(relationship));
        transaction.set(rateRef, clean({ actorPlayerId: actor.chessCom.playerId, targetPlayerId, lastSentAt: timestamp, nextAllowedAt: Date.now() + 6 * 60 * 60 * 1000 }));
        transaction.set(db.collection("users").doc(actor.uid).collection("social").doc(String(targetPlayerId)), clean(projectionFor(actor, target, relationship, "outgoing")));
        transaction.set(db.collection("users").doc(target.uid).collection("social").doc(String(actor.chessCom.playerId)), clean(projectionFor(target, actor, relationship, "incoming")));
    });
    await (0, communications_1.sendRelationshipNotification)(target, {
        id: `friend_request_${relationship.id}`,
        type: "friend_request",
        title: "Friend request",
        body: `${actor.chessCom.canonicalUsername} wants to connect on BoardSignal.`,
        link: "/boardsignal/player-room?tab=friends",
        actionLabel: "View request",
    }).catch(() => undefined);
    return { status: "pending", relationship };
}
async function pendingRelationshipFor(actor, otherPlayerId) {
    const id = (0, social_1.canonicalSocialRelationshipId)(actor.chessCom.playerId, otherPlayerId);
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("socialRelationships").doc(id).get();
    if (!snapshot.exists)
        throw Object.assign(new Error("The friend request was not found."), { status: 404 });
    const relationship = snapshot.data();
    if (relationship.status !== "pending")
        throw Object.assign(new Error("The friend request is no longer pending."), { status: 409 });
    return relationship;
}
async function acceptFriendRequest(actor, otherPlayerIdInput) {
    const otherPlayerId = numericPlayerId(otherPlayerIdInput);
    const relationship = await pendingRelationshipFor(actor, otherPlayerId);
    if (relationship.requestedByPlayerId === actor.chessCom.playerId)
        throw Object.assign(new Error("Only the receiving player can accept this request."), { status: 403 });
    if (await blocksEitherDirection(actor.chessCom.playerId, otherPlayerId))
        throw Object.assign(new Error("This social connection is unavailable."), { status: 403 });
    const other = await accountByPlayerId(otherPlayerId);
    const next = await createFriendshipFromPending(relationship, actor, other);
    await (0, communications_1.sendRelationshipNotification)(other, {
        id: `friend_accepted_${next.id}`,
        type: "friend_accepted",
        title: "Friend request accepted",
        body: `You're now connected with ${actor.chessCom.canonicalUsername}.`,
        link: "/boardsignal/player-room?tab=friends",
        actionLabel: "Compare",
    }).catch(() => undefined);
    return next;
}
async function declineFriendRequest(actor, otherPlayerIdInput) {
    const otherPlayerId = numericPlayerId(otherPlayerIdInput);
    const relationship = await pendingRelationshipFor(actor, otherPlayerId);
    if (relationship.requestedByPlayerId === actor.chessCom.playerId)
        throw Object.assign(new Error("Use cancel for an outgoing request."), { status: 403 });
    const db = (0, firebaseAdmin_1.getAdminDb)();
    await db.runTransaction(async (transaction) => {
        transaction.delete(db.collection("socialRelationships").doc(relationship.id));
        transaction.delete(db.collection("users").doc(actor.uid).collection("social").doc(String(otherPlayerId)));
        const otherUid = relationship.playerAId === otherPlayerId ? relationship.playerAUid : relationship.playerBUid;
        transaction.delete(db.collection("users").doc(otherUid).collection("social").doc(String(actor.chessCom.playerId)));
    });
    return { declined: true };
}
async function cancelFriendRequest(actor, otherPlayerIdInput) {
    const otherPlayerId = numericPlayerId(otherPlayerIdInput);
    const relationship = await pendingRelationshipFor(actor, otherPlayerId);
    if (relationship.requestedByPlayerId !== actor.chessCom.playerId)
        throw Object.assign(new Error("Only the sender can cancel this request."), { status: 403 });
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const otherUid = relationship.playerAId === otherPlayerId ? relationship.playerAUid : relationship.playerBUid;
    await db.runTransaction(async (transaction) => {
        transaction.delete(db.collection("socialRelationships").doc(relationship.id));
        transaction.delete(db.collection("users").doc(actor.uid).collection("social").doc(String(otherPlayerId)));
        transaction.delete(db.collection("users").doc(otherUid).collection("social").doc(String(actor.chessCom.playerId)));
    });
    return { cancelled: true };
}
async function unfriend(actor, otherPlayerIdInput) {
    const otherPlayerId = numericPlayerId(otherPlayerIdInput);
    const id = (0, social_1.canonicalSocialRelationshipId)(actor.chessCom.playerId, otherPlayerId);
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const ref = db.collection("socialRelationships").doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data()?.status !== "friends")
        throw Object.assign(new Error("That friendship is not active."), { status: 404 });
    const relationship = snapshot.data();
    const otherUid = relationship.playerAId === otherPlayerId ? relationship.playerAUid : relationship.playerBUid;
    await db.runTransaction(async (transaction) => {
        transaction.delete(ref);
        transaction.delete(db.collection("users").doc(actor.uid).collection("social").doc(String(otherPlayerId)));
        transaction.delete(db.collection("users").doc(otherUid).collection("social").doc(String(actor.chessCom.playerId)));
    });
    return { unfriended: true };
}
async function blockPlayer(actor, otherPlayerIdInput) {
    const otherPlayerId = numericPlayerId(otherPlayerIdInput);
    if (otherPlayerId === actor.chessCom.playerId)
        throw Object.assign(new Error("You cannot block yourself."), { status: 400 });
    const other = await accountByPlayerId(otherPlayerId);
    const relationshipId = (0, social_1.canonicalSocialRelationshipId)(actor.chessCom.playerId, otherPlayerId);
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const blockRef = db.collection("socialBlocks").doc((0, social_1.socialBlockId)(actor.chessCom.playerId, otherPlayerId));
    const timestamp = nowIso();
    await db.runTransaction(async (transaction) => {
        transaction.set(blockRef, clean({ blockerPlayerId: actor.chessCom.playerId, blockedPlayerId: otherPlayerId, createdAt: timestamp }));
        transaction.delete(db.collection("socialRelationships").doc(relationshipId));
        transaction.delete(db.collection("users").doc(actor.uid).collection("social").doc(String(otherPlayerId)));
        transaction.delete(db.collection("users").doc(other.uid).collection("social").doc(String(actor.chessCom.playerId)));
        transaction.set(db.collection("users").doc(actor.uid).collection("social").doc(String(otherPlayerId)), clean({
            otherPlayerId,
            canonicalUsername: other.chessCom.canonicalUsername,
            avatar: other.chessCom.avatar,
            status: "blocked",
            updatedAt: timestamp,
        }));
    });
    return { blocked: true };
}
async function setRivalPin(actor, otherPlayerIdInput, pinned) {
    const otherPlayerId = numericPlayerId(otherPlayerIdInput);
    const id = (0, social_1.canonicalSocialRelationshipId)(actor.chessCom.playerId, otherPlayerId);
    const relationship = await (0, firebaseAdmin_1.getAdminDb)().collection("socialRelationships").doc(id).get();
    if (!relationship.exists || relationship.data()?.status !== "friends")
        throw Object.assign(new Error("Rival Watch can only pin an accepted friend."), { status: 403 });
    await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(actor.uid).collection("social").doc(String(otherPlayerId)).set({ rivalPinned: pinned, updatedAt: nowIso() }, { merge: true });
    return { pinned };
}
function safeStandingLabel(standing) {
    return standing ? `#${standing.rank} ${standing.categoryTitle}${standing.scopeLabel ? ` · ${standing.scopeLabel}` : ""}` : undefined;
}
async function safePlayerCard(account, relationship, state) {
    const desks = await (0, persistence_1.loadPublishedDesks)(account.uid);
    const latest = desks[0];
    const publicMoments = await (0, firebaseAdmin_1.getAdminDb)().collection("publicShareMoments").where("playerId", "==", String(account.chessCom.playerId)).limit(8).get().catch(() => ({ docs: [] }));
    const safeHighlight = publicMoments.docs
        .map((document) => document.data())
        .filter((moment) => moment.safePublic === true && moment.supportingFact)
        .sort((a, b) => String(b.periodEnd ?? "").localeCompare(String(a.periodEnd ?? "")))[0]?.supportingFact;
    const participant = latest?.desk ? (0, universe_1.deskToUniverseParticipant)(latest.desk) : undefined;
    const standings = participant && state ? (0, pulse_1.standingsFromActiveBoards)(state.boards, participant.id) : [];
    const best = [...standings].sort((a, b) => a.rank - b.rank || a.categoryTitle.localeCompare(b.categoryTitle))[0];
    return {
        playerId: account.chessCom.playerId,
        canonicalUsername: account.chessCom.canonicalUsername,
        avatar: account.chessCom.avatar,
        profileUrl: account.chessCom.profileUrl,
        relationshipStatus: relationship?.status === "blocked" ? undefined : relationship?.status,
        latestDeskPeriod: latest?.summary.periodLabel,
        primaryPool: latest?.desk.primaryPool,
        safeHighlight,
        universePlacement: safeStandingLabel(best),
        rivalPinned: relationship?.rivalPinned === true,
    };
}
async function ownerProjections(actor) {
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(actor.uid).collection("social").get();
    return snapshot.docs.map((document) => document.data());
}
async function searchSocialPlayers(actor, queryInput) {
    const query = String(queryInput ?? "").trim().toLowerCase();
    if (query.length < 2)
        return [];
    const [users, projections, state] = await Promise.all([
        (0, firebaseAdmin_1.getAdminDb)().collection("users").get(),
        ownerProjections(actor),
        (0, universePulse_1.loadActiveUniverseState)().catch(() => undefined),
    ]);
    const projectionMap = new Map(projections.map((item) => [item.otherPlayerId, item]));
    const accounts = users.docs.map((document) => document.data())
        .filter(activeSocialMember)
        .filter((account) => account.chessCom.playerId !== actor.chessCom.playerId)
        .filter((account) => account.chessCom.canonicalUsername.toLowerCase().includes(query))
        .slice(0, 12);
    const visible = [];
    for (const account of accounts) {
        if (await blocksEitherDirection(actor.chessCom.playerId, account.chessCom.playerId))
            continue;
        visible.push(account);
    }
    return Promise.all(visible.map((account) => safePlayerCard(account, projectionMap.get(account.chessCom.playerId), state)));
}
function socialEventKey(event, viewerId) {
    return (0, node_crypto_1.createHash)("sha256").update(`${viewerId}:${event.eventId}`).digest("hex").slice(0, 32);
}
async function socialOverview(actor) {
    const [projections, state] = await Promise.all([ownerProjections(actor), (0, universePulse_1.loadActiveUniverseState)().catch(() => undefined)]);
    const visible = projections.filter((item) => item.status !== "blocked");
    const cards = await Promise.all(visible.map(async (item) => {
        const account = await accountByPlayerId(item.otherPlayerId).catch(() => undefined);
        return account ? safePlayerCard(account, item, state) : undefined;
    }));
    const byId = new Map(cards.filter((card) => Boolean(card)).map((card) => [card.playerId, card]));
    const friends = visible.filter((item) => item.status === "friends").flatMap((item) => byId.get(item.otherPlayerId) ? [byId.get(item.otherPlayerId)] : []);
    const incoming = visible.filter((item) => item.status === "incoming").flatMap((item) => byId.get(item.otherPlayerId) ? [byId.get(item.otherPlayerId)] : []);
    const outgoing = visible.filter((item) => item.status === "outgoing").flatMap((item) => byId.get(item.otherPlayerId) ? [byId.get(item.otherPlayerId)] : []);
    const friendIds = new Set(friends.map((item) => String(item.playerId)));
    const socialPulse = (state?.recentEvents ?? []).filter((event) => friendIds.has(event.playerId)).slice(0, 8).map((event) => ({
        id: socialEventKey(event, actor.chessCom.playerId),
        playerId: Number(event.playerId),
        eyebrow: "A FRIEND MOVED",
        headline: event.headline,
        supportingFact: event.supportingFact,
        publishedAt: event.publishedAt,
    }));
    const actorDesks = await (0, persistence_1.loadPublishedDesks)(actor.uid);
    const actorPrimaryPool = actorDesks[0]?.desk.primaryPool?.toLowerCase();
    const actorParticipant = actorDesks[0]?.desk ? (0, universe_1.deskToUniverseParticipant)(actorDesks[0].desk) : undefined;
    const actorStandings = actorParticipant && state ? (0, pulse_1.standingsFromActiveBoards)(state.boards, actorParticipant.id) : [];
    const rivalWatch = [];
    for (const friend of friends) {
        const friendAccount = await accountByPlayerId(friend.playerId).catch(() => undefined);
        const friendDesks = friendAccount ? await (0, persistence_1.loadPublishedDesks)(friendAccount.uid) : [];
        const friendParticipant = friendDesks[0]?.desk ? (0, universe_1.deskToUniverseParticipant)(friendDesks[0].desk) : undefined;
        const friendStandings = friendParticipant && state ? (0, pulse_1.standingsFromActiveBoards)(state.boards, friendParticipant.id) : [];
        let near;
        for (const standing of actorStandings) {
            const other = friendStandings.find((item) => item.categoryId === standing.categoryId && item.scopeLabel === standing.scopeLabel);
            if (!other)
                continue;
            if (!standing.scopeLabel && actorPrimaryPool && friend.primaryPool && actorPrimaryPool !== friend.primaryPool.toLowerCase())
                continue;
            const rankGap = Math.abs(standing.rank - other.rank);
            if (!(0, social_1.isMeaningfulRivalGap)({ samePool: true, rankGap }))
                continue;
            const label = standing.rank < other.rank ? "YOU MOVED AHEAD" : standing.rank > other.rank ? "ONE PLACE AHEAD" : "RIVAL WATCH";
            const detail = `${standing.categoryTitle}${standing.scopeLabel ? ` · ${standing.scopeLabel}` : ""}: #${standing.rank} vs #${other.rank}.`;
            if (!near || rankGap < near.gap)
                near = { label, detail, gap: rankGap };
        }
        if (friend.rivalPinned || near)
            rivalWatch.push({ player: friend, label: friend.rivalPinned ? "RIVAL WATCH" : near.label, detail: near?.detail ?? "Pinned for private Head-to-Head context." });
    }
    return { friends, incoming, outgoing, rivalWatch: rivalWatch.slice(0, 8), socialPulse };
}
async function headToHead(actor, otherPlayerIdInput) {
    const otherPlayerId = numericPlayerId(otherPlayerIdInput);
    const id = (0, social_1.canonicalSocialRelationshipId)(actor.chessCom.playerId, otherPlayerId);
    const relationship = await (0, firebaseAdmin_1.getAdminDb)().collection("socialRelationships").doc(id).get();
    if (!relationship.exists || relationship.data()?.status !== "friends")
        throw Object.assign(new Error("Head-to-Head is available after both players accept the friendship."), { status: 403 });
    if (await blocksEitherDirection(actor.chessCom.playerId, otherPlayerId))
        throw Object.assign(new Error("This social comparison is unavailable."), { status: 403 });
    const other = await accountByPlayerId(otherPlayerId);
    const [leftBundles, rightBundles, state] = await Promise.all([(0, persistence_1.loadPublishedDesks)(actor.uid), (0, persistence_1.loadPublishedDesks)(other.uid), (0, universePulse_1.loadActiveUniverseState)()]);
    const leftParticipant = leftBundles[0]?.desk ? (0, universe_1.deskToUniverseParticipant)(leftBundles[0].desk) : undefined;
    const rightParticipant = rightBundles[0]?.desk ? (0, universe_1.deskToUniverseParticipant)(rightBundles[0].desk) : undefined;
    return (0, social_1.buildHeadToHeadPayload)({
        left: { playerId: actor.chessCom.playerId, canonicalUsername: actor.chessCom.canonicalUsername, avatar: actor.chessCom.avatar },
        right: { playerId: other.chessCom.playerId, canonicalUsername: other.chessCom.canonicalUsername, avatar: other.chessCom.avatar },
        leftDesks: leftBundles.map((bundle) => bundle.summary),
        rightDesks: rightBundles.map((bundle) => bundle.summary),
        leftStandings: leftParticipant ? (0, pulse_1.standingsFromActiveBoards)(state.boards, leftParticipant.id) : [],
        rightStandings: rightParticipant ? (0, pulse_1.standingsFromActiveBoards)(state.boards, rightParticipant.id) : [],
        leftPublicGameLinks: actor.privacy.publicGameLinks,
        rightPublicGameLinks: other.privacy.publicGameLinks,
    });
}
async function suggestedSocialPlayers(actor) {
    const [users, projections, state] = await Promise.all([(0, firebaseAdmin_1.getAdminDb)().collection("users").get(), ownerProjections(actor), (0, universePulse_1.loadActiveUniverseState)().catch(() => undefined)]);
    const excluded = new Set(projections.map((item) => item.otherPlayerId));
    const candidates = users.docs.map((document) => document.data())
        .filter(activeSocialMember)
        .filter((account) => account.chessCom.playerId !== actor.chessCom.playerId && !excluded.has(account.chessCom.playerId))
        .slice(0, 10);
    const output = [];
    for (const account of candidates) {
        if (await blocksEitherDirection(actor.chessCom.playerId, account.chessCom.playerId))
            continue;
        output.push(await safePlayerCard(account, undefined, state));
        if (output.length >= 4)
            break;
    }
    return output;
}
