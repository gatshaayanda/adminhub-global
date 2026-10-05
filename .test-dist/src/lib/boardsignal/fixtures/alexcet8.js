"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alexcet8Fixture = void 0;
exports.alexcet8Fixture = {
    source: "fixture",
    verified: true,
    id: "alexcet8-2026-07-05",
    username: "Alexcet8",
    period: { start: "2026-07-05", end: "2026-07-11" },
    expected: {
        games: 8,
        wins: 2,
        draws: 0,
        losses: 6,
        firstRecordedRating: 610,
        lastRecordedRating: 581,
        ratingChange: -29,
        resultSequence: ["loss", "loss", "win", "win", "loss", "loss", "loss", "loss"],
    },
    invariants: [
        "The final score is not a complete Desk.",
        "Queen-safety and playable-resignation claims require their linked reviewed positions.",
        "Daily sequence, rating movement and game links must remain present.",
    ],
};
