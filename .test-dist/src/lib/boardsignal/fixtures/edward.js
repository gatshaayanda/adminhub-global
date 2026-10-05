"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.edwardFixture = void 0;
exports.edwardFixture = {
    source: "fixture",
    verified: true,
    id: "edward-resignation-guard",
    username: "edward",
    period: { start: "unavailable", end: "unavailable" },
    expected: { resignationCount: 52 },
    invariants: [
        "The factual resignation count may be displayed.",
        "The count must never automatically become a premature-resignation diagnosis.",
        "Repeated playable engine evaluations are required for resignation guidance.",
    ],
};
