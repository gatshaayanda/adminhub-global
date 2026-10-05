"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveSignalFamilies = deriveSignalFamilies;
exports.deskKeyFor = deskKeyFor;
exports.toDeskSummary = toDeskSummary;
exports.retainLatestFour = retainLatestFour;
exports.updatePersonalRecords = updatePersonalRecords;
exports.buildPoolProgress = buildPoolProgress;
exports.deriveRecurringPatterns = deriveRecurringPatterns;
exports.buildEventHooks = buildEventHooks;
exports.buildSafePublicCoverage = buildSafePublicCoverage;
function poolScore(pool) {
    if (pool.games <= 0 || pool.wins === undefined || pool.draws === undefined)
        return undefined;
    return Number((((pool.wins + pool.draws / 2) / pool.games) * 100).toFixed(1));
}
function supported(signal) {
    return signal.status !== "withheld" && Boolean(signal.title.trim());
}
function familyFromEvidence(desk, signal) {
    if (!supported(signal) || !signal.evidenceIds?.length)
        return undefined;
    const candidates = signal.evidenceIds
        .map((id) => desk.candidates.find((candidate) => candidate.id === id))
        .filter((candidate) => Boolean(candidate));
    const counts = new Map();
    for (const candidate of candidates) {
        const family = candidate.kind === "resignation"
            ? "playable_resignation"
            : candidate.kind === "timeout"
                ? "clock_conversion"
                : candidate.motif === "queen-safety"
                    ? "queen_safety"
                    : candidate.motif === "king-safety"
                        ? "king_safety"
                        : candidate.motif === "forcing-reply"
                            ? "forcing_reply"
                            : candidate.motif === "material"
                                ? "material_conversion"
                                : "general_decision";
        counts.set(family, (counts.get(family) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}
function deriveSignalFamilies(desk) {
    const bestPool = [...desk.pools]
        .filter((pool) => (pool.change ?? 0) > 0)
        .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0];
    const greenFamily = (desk.strengths?.passedPawnConversionGames ?? 0) >= 2
        ? "passed_pawn_conversion"
        : desk.longestWinStreak >= 4
            ? "winning_run"
            : (desk.checkmateWins ?? 0) >= 3
                ? "checkmate_finish"
                : bestPool && (bestPool.change ?? 0) >= 20
                    ? "rating_climb"
                    : undefined;
    const difficultBand = (desk.opponentBands ?? []).some((band) => (band.games >= Math.max(8, Math.ceil(desk.games * 0.08)) && band.score <= 35));
    const positivePool = desk.pools.some((pool) => (pool.change ?? 0) > 0);
    const negativePool = desk.pools.some((pool) => (pool.change ?? 0) < 0);
    const amberFamily = difficultBand
        ? "opponent_band"
        : positivePool && negativePool
            ? "pool_divergence"
            : desk.games < 8
                ? "narrow_sample"
                : desk.longestLossStreak >= 4
                    ? "loss_run"
                    : undefined;
    const correctionFamily = familyFromEvidence(desk, desk.signals.red);
    return {
        greenFamily,
        amberFamily,
        redFamily: correctionFamily,
        blueFamily: supported(desk.signals.blue) ? correctionFamily : undefined,
    };
}
function deskKeyFor(desk) {
    return desk.episodeKey
        ?? `${desk.player.playerId ?? desk.player.username.toLowerCase()}:${desk.period.start}:${desk.period.end}`;
}
function toDeskSummary(desk) {
    const scoreForColor = (record) => (record.games ? Number((((record.wins + record.draws / 2) / record.games) * 100).toFixed(1)) : undefined);
    return {
        deskKey: deskKeyFor(desk),
        periodStart: desk.period.start,
        periodEnd: desk.period.end,
        periodLabel: desk.period.label,
        games: desk.games,
        wins: desk.wins,
        draws: desk.draws,
        losses: desk.losses,
        scorePct: desk.score,
        pools: desk.pools.map((pool) => ({
            pool: pool.pool.toLowerCase(),
            games: pool.games,
            wins: pool.wins,
            draws: pool.draws,
            losses: pool.losses,
            scorePct: poolScore(pool),
            ratingStart: pool.firstRecordedRating,
            ratingEnd: pool.lastRecordedRating,
            ratingDelta: pool.change ?? (pool.firstRecordedRating !== undefined && pool.lastRecordedRating !== undefined
                ? pool.lastRecordedRating - pool.firstRecordedRating
                : undefined),
            ratingHigh: pool.peak,
            ratingLow: pool.low,
        })),
        longestWinRun: desk.longestWinStreak,
        longestLossRun: desk.longestLossStreak,
        whiteScorePct: desk.colorRecords ? scoreForColor(desk.colorRecords.white) : undefined,
        blackScorePct: desk.colorRecords ? scoreForColor(desk.colorRecords.black) : undefined,
        sessions: desk.sessions ?? undefined,
        medianGameLength: desk.gameLength?.medianMoves,
        terminationDistributions: desk.terminations,
        openingFamilies: desk.openings.filter((opening) => opening.games >= 3),
        signalFamilies: deriveSignalFamilies(desk),
        previousBlue: supported(desk.signals.blue) ? { title: desk.signals.blue.title, copy: desk.signals.blue.copy } : undefined,
        previousAmber: supported(desk.signals.amber) ? { title: desk.signals.amber.title, copy: desk.signals.amber.copy } : undefined,
    };
}
function retainLatestFour(entries) {
    const unique = new Map();
    for (const entry of entries)
        unique.set(entry.deskKey, entry);
    const ordered = [...unique.values()].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
    return { retained: ordered.slice(0, 4), removed: ordered.slice(4) };
}
function updatePersonalRecords(records, summary) {
    const next = records ?? {
        desksCompleted: 0,
        personalBestWinRun: 0,
        largestPoolSpecificRatingClimb: {},
    };
    const climbs = { ...next.largestPoolSpecificRatingClimb };
    for (const pool of summary.pools) {
        if (pool.ratingDelta === undefined)
            continue;
        climbs[pool.pool] = Math.max(climbs[pool.pool] ?? Number.NEGATIVE_INFINITY, pool.ratingDelta);
    }
    return {
        ...next,
        desksCompleted: next.desksCompleted + 1,
        personalBestWinRun: Math.max(next.personalBestWinRun, summary.longestWinRun),
        largestPoolSpecificRatingClimb: climbs,
    };
}
function buildPoolProgress(summaries, minimumGames = 3) {
    const chronological = [...summaries].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
    const poolNames = new Set(chronological.flatMap((summary) => summary.pools.map((pool) => pool.pool)));
    return [...poolNames].sort().flatMap((poolName) => {
        const points = chronological.flatMap((summary) => {
            const pool = summary.pools.find((item) => item.pool === poolName && item.games >= minimumGames);
            return pool ? [{
                    deskKey: summary.deskKey,
                    periodLabel: summary.periodLabel,
                    games: pool.games,
                    scorePct: pool.scorePct,
                    ratingDelta: pool.ratingDelta,
                }] : [];
        });
        return points.length >= 2 ? [{ pool: poolName, points }] : [];
    });
}
function families(summary) {
    return Object.values(summary.signalFamilies).filter((family) => Boolean(family));
}
function deriveRecurringPatterns(summaries) {
    const chronological = [...summaries].sort((a, b) => a.periodStart.localeCompare(b.periodStart)).slice(-4);
    if (chronological.length < 2)
        return [];
    const latest = chronological.at(-1);
    const previous = chronological.at(-2);
    const allFamilies = new Set(chronological.flatMap(families));
    const output = [];
    for (const family of allFamilies) {
        const appearances = chronological.filter((summary) => families(summary).includes(family)).length;
        if (appearances >= 2 && families(latest).includes(family)) {
            output.push({
                family,
                status: "repeated",
                appearances,
                desksCompared: chronological.length,
                message: `We've seen this before. This pattern crossed the evidence threshold in ${appearances} of your last ${chronological.length} Desks.`,
            });
        }
        else if (families(previous).includes(family) && !families(latest).includes(family)) {
            output.push({
                family,
                status: "not-repeated",
                appearances,
                desksCompared: chronological.length,
                message: "That pattern was not repeated in this episode.",
            });
        }
    }
    return output.sort((a, b) => b.appearances - a.appearances || a.family.localeCompare(b.family));
}
function buildEventHooks(latestDesk, currentEpisode, now = new Date()) {
    const occurredAt = now.toISOString();
    const hooks = [];
    if (latestDesk) {
        hooks.push({ type: "desk_ready", occurredAt, deskKey: deskKeyFor(latestDesk) });
        if (supported(latestDesk.signals.blue))
            hooks.push({ type: "blue_reminder_available", occurredAt, deskKey: deskKeyFor(latestDesk) });
        if (supported(latestDesk.signals.amber))
            hooks.push({ type: "amber_watch_available", occurredAt, deskKey: deskKeyFor(latestDesk) });
    }
    if (currentEpisode) {
        hooks.push({ type: currentEpisode.games ? "episode_progress" : "episode_started", occurredAt, data: { games: currentEpisode.games, daysComplete: currentEpisode.daysComplete } });
        if (currentEpisode.daysRemaining === 0 && currentEpisode.games === 0)
            hooks.push({ type: "inactive_episode", occurredAt });
    }
    return hooks;
}
function buildSafePublicCoverage(desk, consent, visibility = { publicPlayerPage: true, universeCoverage: true }) {
    if (!consent || desk.source === "fixture" || !desk.provenance.verified || !desk.player.playerId)
        return undefined;
    const positiveRatingMovements = desk.pools.flatMap((pool) => {
        const delta = pool.change ?? (pool.firstRecordedRating !== undefined && pool.lastRecordedRating !== undefined
            ? pool.lastRecordedRating - pool.firstRecordedRating
            : undefined);
        return delta !== undefined && delta > 0 ? [{ pool: pool.pool, games: pool.games, delta }] : [];
    });
    const headline = desk.longestWinStreak >= 2
        ? `${desk.longestWinStreak} straight wins formed a positive run.`
        : (desk.checkmateWins ?? 0) > 0
            ? `${desk.checkmateWins} win${desk.checkmateWins === 1 ? "" : "s"} ended in checkmate.`
            : positiveRatingMovements[0]
                ? `${positiveRatingMovements[0].pool} moved +${positiveRatingMovements[0].delta} across the episode.`
                : desk.wins > 0
                    ? `${desk.wins} completed win${desk.wins === 1 ? "" : "s"} in the episode.`
                    : undefined;
    if (!headline)
        return undefined;
    return {
        chessPlayerId: String(desk.player.playerId),
        username: desk.player.username,
        avatar: desk.player.avatar,
        periodEnd: desk.period.end,
        periodLabel: desk.period.label,
        headline,
        visibility,
        positiveFacts: {
            games: desk.games,
            wins: desk.wins,
            draws: desk.draws,
            scorePct: desk.score >= 50 ? desk.score : undefined,
            longestWinRun: desk.longestWinStreak >= 2 ? desk.longestWinStreak : undefined,
            checkmateWins: (desk.checkmateWins ?? 0) > 0 ? desk.checkmateWins ?? undefined : undefined,
            positiveRatingMovements,
        },
    };
}
