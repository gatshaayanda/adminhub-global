"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foundingUniverseGroups = exports.foundingBetaField = exports.founderCoverageStory = void 0;
const boardsignal_1 = require("./boardsignal");
const universe_1 = require("@/lib/boardsignal/universe");
/**
 * Positive comparison facts transcribed from approved Founder Lab Desks.
 * Missing facts stay missing: public copy, a rating peak, or a termination count
 * never gets converted into a ranking metric unless the exact metric is present.
 */
const approvedFacts = {
    bada_billa: {
        winningRun: 4,
        strongFinish: { games: 4, wins: 4, draws: 0, losses: 0 },
    },
    kylian_mbappe_lottinreal: { checkmateWins: 13 },
    mrinbetween23: { winningRun: 5 },
    captainrangade: { checkmateWins: 3 },
    snoopyissocute: {
        winningRun: 7,
        pools: [{ pool: "rapid", games: 90, end: 1568, peak: 1610, low: 1542 }],
    },
    jefsonfs: {
        pools: [{ pool: "rapid", games: 12, change: 27 }],
    },
    iizorgii: { checkmateWins: 15 },
    "i-know-kungfu": {
        winningRun: 5,
        pools: [{ pool: "rapid", games: 24, start: 652, peak: 705 }],
    },
    harshhmishra: {
        pools: [{ pool: "bullet", games: 285, start: 1886, end: 1977, change: 91, peak: 2060 }],
    },
    alexcet8: {
        winningRun: 2,
        pools: [{ pool: "rapid", games: 8, start: 610, end: 581, peak: 610, low: 581, change: -29 }],
    },
};
exports.founderCoverageStory = {
    id: "founder-eight-game-run",
    eyebrow: "Winning run",
    headline: "Four opening losses did not stop an eight-game winning run.",
    summary: "The approved founding Desk recorded eight consecutive wins before the direction changed later in the episode.",
    stat: "8 straight",
    detail: "Longest winning run",
    tone: "blue",
    period: "1–7 Jul",
    feature: true,
};
function addMoment(participant) {
    return { ...participant, moment: (0, universe_1.deriveMomentFact)(participant) };
}
const approvedBetaParticipants = boardsignal_1.betaDesks.map((desk) => {
    const facts = approvedFacts[desk.handle.toLowerCase()] ?? {};
    const participant = {
        id: `seed:${desk.handle.toLowerCase()}`,
        player: desk.handle,
        source: "seed",
        verified: true,
        periodLabel: desk.period,
        periodEnd: desk.periodEnd,
        games: desk.games,
        score: Number(desk.score.replace("%", "")),
        winningRun: facts.winningRun,
        checkmateWins: facts.checkmateWins,
        pools: facts.pools ?? [],
        strongFinish: facts.strongFinish,
        coverage: {
            href: `/feed#coverage-${desk.publicStory.id}`,
            headline: desk.publicStory.headline,
        },
    };
    return addMoment(participant);
});
const ayandaParticipant = addMoment({
    id: "seed:ayandakopano",
    player: boardsignal_1.privateWeek.player,
    source: "seed",
    verified: true,
    periodLabel: boardsignal_1.privateWeek.period,
    periodEnd: "2026-07-07",
    games: boardsignal_1.privateWeek.games,
    score: Number(boardsignal_1.privateWeek.score.replace("%", "")),
    winningRun: 8,
    pools: [{
            pool: "rapid",
            games: boardsignal_1.privateWeek.games,
            start: boardsignal_1.privateWeek.ratingStart,
            end: boardsignal_1.privateWeek.ratingEnd,
            change: boardsignal_1.privateWeek.ratingChange,
            peak: boardsignal_1.privateWeek.peak,
            low: boardsignal_1.privateWeek.low,
        }],
    strongFinish: { games: 6, wins: 3, draws: 0, losses: 3 },
    coverage: {
        href: `/feed#coverage-${exports.founderCoverageStory.id}`,
        headline: exports.founderCoverageStory.headline,
    },
});
/**
 * Replace this adapter with a persistent shared comparison source later.
 * The recognition UI consumes UniverseParticipant[], so persistence does not
 * require a component rewrite.
 */
exports.foundingBetaField = [
    ...approvedBetaParticipants,
    ayandaParticipant,
];
exports.foundingUniverseGroups = (0, universe_1.buildUniverseCategoryGroups)(exports.foundingBetaField);
