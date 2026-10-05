"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRecentUniverseEvents = listRecentUniverseEvents;
exports.loadUniverseHomepageLead = loadUniverseHomepageLead;
exports.loadActiveUniverseState = loadActiveUniverseState;
exports.writePublicUniverseEvent = writePublicUniverseEvent;
exports.recordNewPlayerUniverseIntro = recordNewPlayerUniverseIntro;
exports.upsertShareMoments = upsertShareMoments;
exports.recordCompletedDeskUniverseArtifacts = recordCompletedDeskUniverseArtifacts;
exports.ensureShareMomentsForActiveDesks = ensureShareMomentsForActiveDesks;
exports.listPlayerShareMoments = listPlayerShareMoments;
exports.loadPublicShareMoment = loadPublicShareMoment;
exports.buildPlayerPulse = buildPlayerPulse;
require("server-only");
const node_crypto_1 = require("node:crypto");
const pulse_1 = require("../pulse");
const universe_1 = require("../universe");
const universeField_1 = require("../../../data/universeField");
const firebaseAdmin_1 = require("../../../utils/firebaseAdmin");
function clean(value) { return JSON.parse(JSON.stringify(value)); }
function hashId(value) { return (0, node_crypto_1.createHash)("sha256").update(value).digest("hex"); }
function nowIso(now = new Date()) { return now.toISOString(); }
async function activeLiveDeskRecords() {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const users = await db.collection("users").get();
    const active = users.docs
        .map((document) => document.data())
        .filter((account) => account.role === "player" && account.accessTier === "founding_beta" && account.accessStatus === "active");
    const records = [];
    for (const account of active) {
        const desks = await db.collection("users").doc(account.uid).collection("desks")
            .orderBy("periodEnd", "desc")
            .limit(4)
            .get();
        for (const document of desks.docs) {
            const data = document.data();
            if (!data.desk || data.desk.source !== "live" || !data.desk.provenance.verified)
                continue;
            records.push({
                uid: account.uid,
                deskKey: String(data.deskKey ?? document.id),
                publishedAt: data.publishedAt,
                desk: data.desk,
            });
        }
    }
    return records;
}
function participantFromRecord(record) {
    const participant = (0, universe_1.deskToUniverseParticipant)(record.desk);
    if (!participant || participant.source !== "live")
        return undefined;
    return {
        ...participant,
        coverage: {
            href: `/player/${encodeURIComponent(record.desk.player.username)}`,
            headline: record.desk.headline || record.desk.summary,
        },
    };
}
async function listRecentUniverseEvents(limit = 80) {
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("publicUniverseEvents").orderBy("publishedAt", "desc").limit(limit).get().catch(() => ({ docs: [] }));
    return snapshot.docs
        .map((document) => document.data())
        .filter((event) => event.safePublic === true && event.hidden !== true && !(0, pulse_1.publicArtifactHasPrivateFields)(event));
}
async function loadUniverseHomepageLead() {
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("publicUniverseEvents")
        .where("homepageLead", "==", true)
        .limit(1)
        .get();
    const event = snapshot.docs[0]?.data();
    if (!event || event.safePublic !== true || event.hidden === true || (0, pulse_1.publicArtifactHasPrivateFields)(event))
        return undefined;
    return event;
}
async function loadActiveUniverseState(now = new Date()) {
    const records = await activeLiveDeskRecords();
    const liveParticipants = records.flatMap((record) => {
        const participant = participantFromRecord(record);
        return participant ? [participant] : [];
    });
    const boards = (0, pulse_1.buildActiveUniverseBoards)(liveParticipants, universeField_1.foundingBetaField);
    const recentEvents = await listRecentUniverseEvents();
    return {
        liveParticipants,
        boards,
        groups: (0, pulse_1.buildPulseUniverseGroups)(boards),
        recentEvents,
        whatsHot: (0, pulse_1.rankWhatsHot)(recentEvents, now),
    };
}
async function writePublicUniverseEvent(event) {
    if (!event.safePublic || (0, pulse_1.publicArtifactHasPrivateFields)(event)) {
        throw new Error("Unsafe data was blocked from the public Universe event store.");
    }
    await (0, firebaseAdmin_1.getAdminDb)().collection("publicUniverseEvents").doc(event.eventId).set(clean(event), { merge: true });
    return event;
}
async function recordNewPlayerUniverseIntro(account, now = new Date()) {
    if (!account.betaAgreementAcceptedAt || !account.universeParticipationDisclosedAt)
        return undefined;
    const eventId = hashId(`new-player:${account.chessCom.playerId}`);
    const existing = await (0, firebaseAdmin_1.getAdminDb)().collection("publicUniverseEvents").doc(eventId).get();
    if (existing.exists)
        return existing.data();
    const event = {
        eventId,
        eventType: "new_player",
        playerId: String(account.chessCom.playerId),
        canonicalUsername: account.chessCom.canonicalUsername,
        avatar: account.chessCom.avatar,
        occurredAt: account.universeParticipationDisclosedAt,
        publishedAt: nowIso(now),
        headline: `${account.chessCom.canonicalUsername} has entered the BoardSignal Universe.`,
        supportingFact: "First Desk forming.",
        dataMode: "live",
        finality: "official",
        safePublic: true,
    };
    return writePublicUniverseEvent(event);
}
function boardEntry(board, participantId) {
    return board?.entries.find((entry) => entry.participantId === participantId);
}
function eventTypeForMovement(beforeRank, afterRank) {
    if (afterRank === 1 && beforeRank !== 1)
        return "new_leader";
    if (afterRank <= 3 && (beforeRank === undefined || beforeRank > 3))
        return "entered_top3";
    if (afterRank <= 3 && beforeRank !== undefined && beforeRank <= 3 && beforeRank !== afterRank)
        return "podium_move";
    return "rank_move";
}
function eventHeadline(type, username, board, rank) {
    const scope = board.scopeLabel ? ` · ${board.scopeLabel}` : "";
    if (type === "new_leader")
        return `${username} is the new ${board.title}${scope} leader.`;
    if (type === "entered_top3")
        return `${username} entered the ${board.title}${scope} Top 3.`;
    if (type === "podium_move")
        return `${username} moved on the ${board.title}${scope} podium.`;
    return `${username} moved in ${board.title}${scope}.`;
}
function eventTypeForShareMoment(moment) {
    if (!moment)
        return "desk_completed";
    if (moment.categoryId === "rating-climb")
        return "rating_climb";
    if (moment.categoryId === "rating-recovery")
        return "rating_recovery";
    if (moment.categoryId === "winning-run")
        return "winning_run";
    if (moment.categoryId === "strong-finish")
        return "strong_finish";
    if (moment.categoryId === "breakthrough-desk")
        return "breakthrough";
    if (moment.categoryId === "best-upset")
        return "best_upset";
    if (moment.categoryId === "moment-of-the-week" || moment.categoryId === "checkmate-finish")
        return "moment_of_the_week";
    return "desk_completed";
}
async function pruneMundaneUniverseEvents(now = new Date()) {
    const cutoff = now.getTime() - pulse_1.PULSE_EVENT_RETENTION_MS;
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("publicUniverseEvents").orderBy("publishedAt", "asc").limit(120).get().catch(() => ({ docs: [] }));
    const stale = snapshot.docs.filter((document) => Date.parse(String(document.data().publishedAt ?? "")) < cutoff);
    if (!stale.length)
        return;
    const batch = (0, firebaseAdmin_1.getAdminDb)().batch();
    stale.forEach((document) => batch.delete(document.ref));
    await batch.commit();
}
async function upsertShareMoments(moments) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    for (const moment of moments) {
        if (!moment.safePublic || (0, pulse_1.publicArtifactHasPrivateFields)(moment))
            throw new Error("Unsafe data was blocked from a Share Moment.");
        await db.collection("publicShareMoments").doc(moment.id).set(clean(moment), { merge: true });
    }
    return moments;
}
async function recordCompletedDeskUniverseArtifacts(input) {
    const now = input.now ?? new Date();
    const afterState = await loadActiveUniverseState(now);
    const participantId = (0, pulse_1.deskParticipantId)(input.desk);
    if (!participantId)
        return { events: [], shareMoments: [], afterState };
    const deskParticipant = (0, universe_1.deskToUniverseParticipant)(input.desk);
    const deskBoards = deskParticipant ? (0, universe_1.buildUniverseBoards)([deskParticipant]) : [];
    const beforeByKey = new Map(input.beforeState.boards.map((board) => [board.key, board]));
    const events = [];
    for (const afterBoard of afterState.boards) {
        const after = boardEntry(afterBoard, participantId);
        if (!after)
            continue;
        const deskEntry = deskBoards.find((board) => board.key === afterBoard.key)?.entries[0];
        // Only attribute a board movement to this newly published Desk if its value
        // is the value now representing the player on that board.
        if (!deskEntry || Math.abs(deskEntry.value - after.value) > 0.0001)
            continue;
        const before = boardEntry(beforeByKey.get(afterBoard.key), participantId);
        if (before?.rank === after.rank && before?.value === after.value)
            continue;
        const type = eventTypeForMovement(before?.rank, after.rank);
        const event = {
            eventId: hashId(`${input.deskKey}:${afterBoard.key}:${type}:${before?.rank ?? "new"}:${after.rank}`),
            eventType: type,
            playerId: String(input.account.chessCom.playerId),
            canonicalUsername: input.account.chessCom.canonicalUsername,
            avatar: input.account.chessCom.avatar,
            deskKey: input.deskKey,
            episodeKey: input.desk.episodeKey,
            pool: afterBoard.scopeLabel?.toLowerCase(),
            categoryId: afterBoard.categoryId,
            occurredAt: input.desk.period.end,
            publishedAt: nowIso(now),
            previousValue: before?.value,
            currentValue: after.value,
            rankBefore: before?.rank,
            rankAfter: after.rank,
            headline: eventHeadline(type, input.account.chessCom.canonicalUsername, afterBoard, after.rank),
            supportingFact: after.evidence,
            dataMode: "live",
            finality: "official",
            safePublic: true,
        };
        events.push(event);
    }
    const officialStandings = (0, pulse_1.standingsFromActiveBoards)(afterState.boards, participantId);
    const shareMoments = (0, pulse_1.nominateShareMoments)(input.desk, officialStandings, now).map((moment) => ({ ...moment, deskKey: input.deskKey }));
    await upsertShareMoments(shareMoments);
    if (input.deskCountAfter === 1) {
        const strongest = shareMoments[0];
        events.unshift({
            eventId: hashId(`first-desk:${input.deskKey}`),
            eventType: "first_desk",
            playerId: String(input.account.chessCom.playerId),
            canonicalUsername: input.account.chessCom.canonicalUsername,
            avatar: input.account.chessCom.avatar,
            deskKey: input.deskKey,
            episodeKey: input.desk.episodeKey,
            occurredAt: input.desk.period.end,
            publishedAt: nowIso(now),
            headline: `First Desk is in for ${input.account.chessCom.canonicalUsername}.`,
            supportingFact: strongest?.supportingFact ?? `${input.desk.games} games closed the first completed seven-day Desk.`,
            dataMode: "live",
            finality: "official",
            safePublic: true,
        });
        const watch = officialStandings
            .filter((standing) => standing.rank >= 4 && standing.rank <= 5)
            .sort((a, b) => a.rank - b.rank || a.categoryTitle.localeCompare(b.categoryTitle))[0];
        if (watch) {
            events.push({
                eventId: hashId(`player-to-watch:${input.deskKey}:${watch.categoryId}:${watch.scopeLabel ?? "all"}`),
                eventType: "player_to_watch",
                playerId: String(input.account.chessCom.playerId),
                canonicalUsername: input.account.chessCom.canonicalUsername,
                avatar: input.account.chessCom.avatar,
                deskKey: input.deskKey,
                episodeKey: input.desk.episodeKey,
                pool: watch.scopeLabel?.toLowerCase(),
                categoryId: watch.categoryId,
                occurredAt: input.desk.period.end,
                publishedAt: nowIso(now),
                rankAfter: watch.rank,
                headline: `Player to watch: ${input.account.chessCom.canonicalUsername} opened at #${watch.rank} in ${watch.categoryTitle}${watch.scopeLabel ? ` · ${watch.scopeLabel}` : ""}.`,
                supportingFact: `${watch.valueLabel} placed the first completed Desk #${watch.rank} of ${watch.denominator} in the current official field.`,
                dataMode: "live",
                finality: "official",
                safePublic: true,
            });
        }
    }
    else if (!events.length) {
        const strongest = shareMoments[0];
        const eventType = eventTypeForShareMoment(strongest);
        events.push({
            eventId: hashId(`desk-completed:${input.deskKey}:${eventType}`),
            eventType,
            playerId: String(input.account.chessCom.playerId),
            canonicalUsername: input.account.chessCom.canonicalUsername,
            avatar: input.account.chessCom.avatar,
            deskKey: input.deskKey,
            episodeKey: input.desk.episodeKey,
            pool: strongest?.pool,
            categoryId: strongest?.categoryId === "checkmate-finish" ? "moment-of-the-week" : strongest?.categoryId,
            occurredAt: input.desk.period.end,
            publishedAt: nowIso(now),
            headline: strongest ? `${input.account.chessCom.canonicalUsername}: ${strongest.headline}.` : `${input.account.chessCom.canonicalUsername} published a new BoardSignal Desk.`,
            supportingFact: strongest?.supportingFact ?? `${input.desk.games} games closed the completed seven-day Desk.`,
            dataMode: "live",
            finality: "official",
            safePublic: true,
        });
    }
    for (const event of events.slice(0, 3))
        await writePublicUniverseEvent(event);
    await pruneMundaneUniverseEvents(now);
    return { events: events.slice(0, 3), shareMoments, afterState };
}
async function ensureShareMomentsForActiveDesks(account, desks, state) {
    if (!desks.length)
        return [];
    const active = state ?? await loadActiveUniverseState();
    const participantId = (0, pulse_1.deskParticipantId)(desks[0].desk);
    const standings = participantId ? (0, pulse_1.standingsFromActiveBoards)(active.boards, participantId) : [];
    const moments = desks.flatMap((bundle, index) => (0, pulse_1.nominateShareMoments)(bundle.desk, index === 0 ? standings : [], new Date())
        .map((moment) => ({ ...moment, deskKey: bundle.summary.deskKey })));
    await upsertShareMoments(moments);
    return moments;
}
async function listPlayerShareMoments(playerId, activeDeskKeys) {
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("publicShareMoments").where("playerId", "==", String(playerId)).get().catch(() => ({ docs: [] }));
    const active = activeDeskKeys ? new Set(activeDeskKeys) : undefined;
    return snapshot.docs
        .map((document) => document.data())
        .filter((moment) => moment.safePublic === true && !(0, pulse_1.publicArtifactHasPrivateFields)(moment))
        .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || a.id.localeCompare(b.id))
        .map((moment) => ({ ...moment, activeDesk: active ? active.has(moment.deskKey) : undefined }));
}
async function loadPublicShareMoment(momentId) {
    if (!/^[A-Za-z0-9_-]{3,220}$/.test(momentId))
        return undefined;
    const snapshot = await (0, firebaseAdmin_1.getAdminDb)().collection("publicShareMoments").doc(momentId).get();
    if (!snapshot.exists)
        return undefined;
    const moment = snapshot.data();
    if (moment.safePublic !== true || (0, pulse_1.publicArtifactHasPrivateFields)(moment))
        return undefined;
    return moment;
}
async function buildPlayerPulse(input) {
    const now = input.now ?? new Date();
    const state = await loadActiveUniverseState(now);
    const participantId = input.latestDesk ? (0, pulse_1.deskParticipantId)(input.latestDesk) : undefined;
    const standings = participantId ? (0, pulse_1.standingsFromActiveBoards)(state.boards, participantId) : [];
    const currentStandings = participantId ? (0, pulse_1.standingSnapshots)(state.boards, participantId) : [];
    const pulseRef = (0, firebaseAdmin_1.getAdminDb)().collection("users").doc(input.account.uid).collection("pulse").doc("current");
    const previousDoc = await pulseRef.get();
    const previous = previousDoc.exists ? previousDoc.data() : undefined;
    const sinceAway = (0, pulse_1.deriveCurrentEpisodeDelta)(previous?.currentEpisode, input.currentEpisode);
    const boardMoved = previous ? (0, pulse_1.deriveBoardMovement)(previous.standings ?? [], currentStandings) : [];
    const proximity = participantId ? (0, pulse_1.deriveProximityCards)(state.boards, participantId) : [];
    let provisional = [];
    if (input.currentEpisode && input.currentEpisode.games > 0) {
        const provisionalParticipant = (0, pulse_1.currentEpisodeToProvisionalParticipant)(input.account.chessCom.canonicalUsername, String(input.account.chessCom.playerId), input.currentEpisode);
        const withoutSelf = state.liveParticipants.filter((participant) => normalizePlayer(participant.player) !== normalizePlayer(input.account.chessCom.canonicalUsername));
        const projectedBoards = (0, pulse_1.buildActiveUniverseBoards)([...withoutSelf, provisionalParticipant], universeField_1.foundingBetaField, state.liveParticipants);
        provisional = (0, pulse_1.deriveProvisionalCards)(projectedBoards, provisionalParticipant.id);
    }
    const previousSeenAt = previous?.viewedAt ? Date.parse(previous.viewedAt) : NaN;
    const fieldMoved = Number.isFinite(previousSeenAt)
        ? state.recentEvents.filter((event) => event.playerId !== String(input.account.chessCom.playerId) && Date.parse(event.publishedAt) > previousSeenAt).slice(0, 5)
        : [];
    const snapshot = {
        viewedAt: nowIso(now),
        currentEpisode: input.currentEpisode,
        standings: currentStandings,
    };
    await pulseRef.set(clean(snapshot));
    return {
        checkedAt: nowIso(now),
        sinceAway,
        boardMoved,
        proximity,
        provisional,
        fieldMoved,
        whatsHot: state.whatsHot,
        groups: state.groups,
        standings,
        fieldLabels: [...new Set(state.boards.map((board) => board.fieldLabel))],
    };
}
function normalizePlayer(value) { return value.trim().toLowerCase(); }
