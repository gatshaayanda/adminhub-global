"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalSocialRelationshipId = canonicalSocialRelationshipId;
exports.socialBlockId = socialBlockId;
exports.resolveFriendRequestTransition = resolveFriendRequestTransition;
exports.canExposeGameLinks = canExposeGameLinks;
exports.socialPayloadHasPrivateFields = socialPayloadHasPrivateFields;
exports.buildHeadToHeadPayload = buildHeadToHeadPayload;
exports.isMeaningfulRivalGap = isMeaningfulRivalGap;
const PRIVATE_SOCIAL_FIELDS = [
    "red", "amber", "blue", "evidence", "engine", "correction", "recurrence", "privateNotes",
    "preferredContact", "preferredContactMethod", "preferredContactValue", "email", "discord", "telegram",
    "accessCode", "betaAccess", "firebaseUid", "uid", "notificationPreferences", "founderMessage",
];
function canonicalSocialRelationshipId(playerAId, playerBId) {
    if (!Number.isSafeInteger(playerAId) || !Number.isSafeInteger(playerBId) || playerAId <= 0 || playerBId <= 0) {
        throw new Error("Stable Chess.com player IDs are required.");
    }
    if (playerAId === playerBId)
        throw new Error("A player cannot connect with themselves.");
    return [playerAId, playerBId].sort((a, b) => a - b).join("_");
}
function socialBlockId(blockerPlayerId, blockedPlayerId) {
    if (blockerPlayerId === blockedPlayerId)
        throw new Error("A player cannot block themselves.");
    return `${blockerPlayerId}_${blockedPlayerId}`;
}
function resolveFriendRequestTransition(input) {
    if (input.actorPlayerId === input.targetPlayerId)
        return { allowed: false, reason: "self" };
    if (input.blockedEitherDirection)
        return { allowed: false, reason: "blocked" };
    if (!input.existing)
        return { allowed: true, action: "create_pending" };
    if (input.existing.status === "friends")
        return { allowed: false, reason: "already_friends" };
    if (input.existing.requestedByPlayerId === input.actorPlayerId)
        return { allowed: false, reason: "duplicate" };
    return { allowed: true, action: "accept_mutual" };
}
function canExposeGameLinks(publicGameLinks) {
    return publicGameLinks === true;
}
function socialPayloadHasPrivateFields(value) {
    if (!value || typeof value !== "object")
        return false;
    const visit = (item) => {
        if (Array.isArray(item))
            return item.some(visit);
        if (!item || typeof item !== "object")
            return false;
        return Object.entries(item).some(([key, nested]) => (PRIVATE_SOCIAL_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase())) || visit(nested)));
    };
    return visit(value);
}
function scoreFromSummaries(desks) {
    const games = desks.reduce((sum, desk) => sum + desk.games, 0);
    if (!games)
        return undefined;
    const points = desks.reduce((sum, desk) => sum + desk.wins + desk.draws / 2, 0);
    return Number(((points / games) * 100).toFixed(1));
}
function sharedPools(left, right) {
    const l = new Set(left.flatMap((desk) => desk.pools.map((pool) => pool.pool.toLowerCase())));
    return [...new Set(right.flatMap((desk) => desk.pools.map((pool) => pool.pool.toLowerCase())))]
        .filter((pool) => l.has(pool))
        .sort();
}
function poolRatingMovement(desks, poolName) {
    const values = desks.flatMap((desk) => desk.pools.filter((pool) => pool.pool.toLowerCase() === poolName && pool.ratingDelta !== undefined).map((pool) => pool.ratingDelta));
    return values.length ? values.reduce((sum, value) => sum + value, 0) : undefined;
}
function poolGames(desks, poolName) {
    return desks.reduce((sum, desk) => sum + desk.pools.filter((pool) => pool.pool.toLowerCase() === poolName).reduce((inner, pool) => inner + pool.games, 0), 0);
}
function latestScore(desks) {
    return desks[0]?.scorePct;
}
function strongestRun(desks) {
    return desks.reduce((best, desk) => Math.max(best, desk.longestWinRun), 0);
}
function movementNote(left, right, leftName, rightName, label) {
    if (left === undefined || right === undefined || left === right)
        return undefined;
    return left > right ? `${leftName} currently holds the edge in ${label}.` : `${rightName} currently holds the edge in ${label}.`;
}
function universePairs(left, right) {
    const key = (standing) => `${standing.categoryId}:${standing.scopeLabel ?? "all"}`;
    const leftMap = new Map(left.map((standing) => [key(standing), standing]));
    const rightMap = new Map(right.map((standing) => [key(standing), standing]));
    const keys = [...new Set([...leftMap.keys(), ...rightMap.keys()])].sort();
    return keys.flatMap((id) => {
        const l = leftMap.get(id);
        const r = rightMap.get(id);
        if (!l || !r)
            return [];
        const gap = Math.abs(l.rank - r.rank);
        return [{
                categoryId: l.categoryId,
                categoryTitle: l.categoryTitle,
                scopeLabel: l.scopeLabel,
                leftRank: l.rank,
                rightRank: r.rank,
                leftValueLabel: l.valueLabel,
                rightValueLabel: r.valueLabel,
                note: gap === 1 ? "One place separates you." : undefined,
            }];
    });
}
/**
 * Builds a public-safe sports comparison from only the latest active Desk summaries
 * and official Universe standings. Private Signal/evidence fields are not accepted.
 */
function buildHeadToHeadPayload(input) {
    const leftDesks = input.leftDesks.slice(0, 4);
    const rightDesks = input.rightDesks.slice(0, 4);
    const pools = sharedPools(leftDesks, rightDesks);
    const metrics = [];
    const leftLatest = latestScore(leftDesks);
    const rightLatest = latestScore(rightDesks);
    if (leftLatest !== undefined && rightLatest !== undefined) {
        metrics.push({
            key: "latest-score", label: "RECENT FORM", leftValue: `${leftLatest.toFixed(1)}%`, rightValue: `${rightLatest.toFixed(1)}%`,
            note: movementNote(leftLatest, rightLatest, input.left.canonicalUsername, input.right.canonicalUsername, "latest score"),
        });
    }
    const leftOverall = scoreFromSummaries(leftDesks);
    const rightOverall = scoreFromSummaries(rightDesks);
    if (leftOverall !== undefined && rightOverall !== undefined && (leftDesks.length > 1 || rightDesks.length > 1)) {
        metrics.push({ key: "active-score", label: "ACTIVE DESK SCORE", leftValue: `${leftOverall.toFixed(1)}%`, rightValue: `${rightOverall.toFixed(1)}%` });
    }
    metrics.push({
        key: "winning-run", label: "WINNING RUN", leftValue: String(strongestRun(leftDesks)), rightValue: String(strongestRun(rightDesks)),
        note: movementNote(strongestRun(leftDesks), strongestRun(rightDesks), input.left.canonicalUsername, input.right.canonicalUsername, "winning run"),
    });
    for (const pool of pools) {
        const leftMove = poolRatingMovement(leftDesks, pool);
        const rightMove = poolRatingMovement(rightDesks, pool);
        if (leftMove !== undefined && rightMove !== undefined) {
            metrics.push({
                key: `rating:${pool}`, label: "RATING MOVEMENT", scope: pool.toUpperCase(),
                leftValue: `${leftMove >= 0 ? "+" : ""}${leftMove}`, rightValue: `${rightMove >= 0 ? "+" : ""}${rightMove}`,
                note: movementNote(leftMove, rightMove, input.left.canonicalUsername, input.right.canonicalUsername, `${pool} rating movement`),
            });
        }
        metrics.push({ key: `games:${pool}`, label: "GAMES", scope: pool.toUpperCase(), leftValue: String(poolGames(leftDesks, pool)), rightValue: String(poolGames(rightDesks, pool)) });
    }
    const payload = {
        left: { ...input.left, desksAvailable: leftDesks.length },
        right: { ...input.right, desksAvailable: rightDesks.length },
        recentFourLabel: "RECENT FOUR-DESK VIEW",
        comparablePools: pools,
        metrics,
        universe: universePairs(input.leftStandings ?? [], input.rightStandings ?? []),
        gameLinksEnabled: {
            left: canExposeGameLinks(input.leftPublicGameLinks),
            right: canExposeGameLinks(input.rightPublicGameLinks),
        },
        privateFieldsExcluded: true,
    };
    if (socialPayloadHasPrivateFields(payload))
        throw new Error("Private data was blocked from Head-to-Head.");
    return payload;
}
function isMeaningfulRivalGap(input) {
    if (!input.samePool)
        return false;
    if (input.crossedRecently)
        return true;
    if (input.rankGap !== undefined && input.rankGap <= 2)
        return true;
    if (input.winningRunGap !== undefined && input.winningRunGap <= 2)
        return true;
    if (input.scoreGap !== undefined && input.scoreGap <= 5)
        return true;
    return false;
}
