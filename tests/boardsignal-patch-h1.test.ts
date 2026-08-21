import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  REVIEW_DUE_GRACE_MS,
  deriveFounderOperation,
  filterFounderOperationRows,
  summarizeFounderHistoryVisibility,
  type FounderOperationComparableRow,
} from "../src/lib/boardsignal/founderOperationsLogic";
import { boardSignalPresentationLabel } from "../src/lib/boardsignal/presentationLanguage";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const now = new Date("2026-08-21T18:00:00.000Z");

function rowFrom(input: Parameters<typeof deriveFounderOperation>[0]): FounderOperationComparableRow {
  const derived = deriveFounderOperation(input, now);
  return {
    ...derived,
    uid: input.uid,
    username: input.username,
    reviewCount: 1,
    nextDeskDueAt: input.nextDeskDueAt,
    lastSeenAt: input.lastSeenAt,
    unreadReplies: input.unreadReplies ?? 0,
    exceptionCount: input.exceptionCount ?? 0,
    identityConflict: input.identityConflict ?? false,
    pendingRequest: input.pendingRequest ?? false,
    forming: derived.forming,
  };
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}
function luminance(hex: string) {
  const values = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}
function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

// 1. Stale June forming state cannot survive into August.
test("H.1 1 stale June forming becomes review-check truth", () => {
  const result = deriveFounderOperation({ uid: "A", username: "vastu_rajpara", forming: true, nextDeskDueAt: "2026-06-29", lastSeenAt: "2026-08-20T10:00:00.000Z" }, now);
  assert.equal(result.forming, false);
  assert.equal(result.reviewCheckRequired, true);
  assert.equal(result.currentState, "REVIEW CHECK REQUIRED");
});

// 2. The Founder server returns derived.forming and metrics consume row.forming.
test("H.1 2 stale forming cannot inflate Reviews Forming metric", () => {
  const server = read("src/lib/boardsignal/server/founderOperations.ts");
  assert.match(server, /forming:\s*derived\.forming/);
  assert.match(server, /reviewsForming:\s*rows\.filter\(\(row\) => row\.forming\)\.length/);
});

// 3. The shared filter consumes the same effective row.forming value.
test("H.1 3 stale forming cannot pass Reviews Forming filter", () => {
  const stale = rowFrom({ uid: "A", username: "vastu_rajpara", forming: true, nextDeskDueAt: "2026-06-29", lastSeenAt: "2026-08-20T10:00:00.000Z" });
  assert.equal(filterFounderOperationRows([stale], "reviews_forming").length, 0);
});

// 4. A genuinely current/future forming Review remains forming.
test("H.1 4 future forming remains current", () => {
  const result = deriveFounderOperation({ uid: "B", username: "future", forming: true, nextDeskDueAt: "2026-08-25", lastSeenAt: "2026-08-21T10:00:00.000Z" }, now);
  assert.equal(result.forming, true);
  assert.equal(result.reviewCheckRequired, false);
  assert.equal(result.currentState, "FORMING");
});

// 5. Existing 12-hour grace semantics remain authoritative.
test("H.1 5 due grace remains intact", () => {
  const due = "2026-08-21";
  const inside = new Date(Date.parse("2026-08-21T00:00:00.000Z") + REVIEW_DUE_GRACE_MS - 1);
  const result = deriveFounderOperation({ uid: "C", username: "grace", forming: true, nextDeskDueAt: due, lastSeenAt: "2026-08-21T01:00:00.000Z" }, inside);
  assert.equal(result.forming, true);
  assert.equal(result.reviewCheckRequired, false);
});

test("H.1 fixture D stored non-forming overdue still requires a Review check", () => {
  const result = deriveFounderOperation({ uid: "D0", username: "overdue", forming: false, nextDeskDueAt: "2026-06-29", lastSeenAt: "2026-08-20T10:00:00.000Z" }, now);
  assert.equal(result.forming, false);
  assert.equal(result.reviewCheckRequired, true);
  assert.equal(result.currentState, "REVIEW CHECK REQUIRED");
});

// 6. A newly ready Review still wins over stale due/check state.
test("H.1 6 ready-not-seen priority remains intact", () => {
  const result = deriveFounderOperation({
    uid: "D", username: "ready", forming: true, nextDeskDueAt: "2026-06-29",
    lastSeenAt: "2026-08-20T08:00:00.000Z",
    latestReview: { publishedAt: "2026-08-21T08:00:00.000Z", periodStart: "2026-08-13", periodEnd: "2026-08-19" },
  }, now);
  assert.equal(result.forming, false);
  assert.equal(result.reviewCheckRequired, false);
  assert.equal(result.readyNotSeen, true);
  assert.equal(result.currentState, "REVIEW READY · NOT SEEN");
});

// 7. A past due date is presented as expected, never future "next" language.
test("H.1 7 past review date is not labelled NEXT REVIEW", () => {
  const stale = deriveFounderOperation({ uid: "E", username: "past", nextDeskDueAt: "2026-06-29" }, now);
  assert.equal(stale.reviewDateLabel, "EXPECTED REVIEW");
  const future = deriveFounderOperation({ uid: "F", username: "future", nextDeskDueAt: "2026-08-25" }, now);
  assert.equal(future.reviewDateLabel, "NEXT REVIEW");
  assert.doesNotMatch(read("src/components/FounderOperationsConsole.tsx"), /<span>NEXT REVIEW<\/span>/);
});

// 8. H.1 does not change Patch H retention accounting.
test("H.1 8 historical backfill remains separate from qualifying Review retention", () => {
  const server = read("src/lib/boardsignal/server/founderOperations.ts");
  assert.match(server, /verifiedDocuments = allVerifiedDocuments\.filter\(\(\{ period \}\) => period\.source !== "historical"\)/);
  assert.match(server, /reviewCount:\s*snapshot\.verified\.length/);
  assert.match(server, /activationBaseline === true/);
});

// 9. no_activity evaluates history without becoming a Review.
test("H.1 9 no-activity is evaluated history, not a Review", () => {
  const history = summarizeFounderHistoryVisibility({
    status: "pending",
    targetPeriods: [
      { start: "2026-08-13", end: "2026-08-19" }, { start: "2026-08-06", end: "2026-08-12" },
      { start: "2026-07-30", end: "2026-08-05" }, { start: "2026-07-23", end: "2026-07-29" },
    ],
    evaluated: { "2026-08-06": { status: "no_activity" } },
  }, ["2026-08-13"]);
  assert.equal(history.evaluatedSlots, 2);
  assert.equal(history.reviewSlots, 1);
  assert.equal(history.noActivitySlots, 1);
});

// 10. Partial history reports the exact evaluated fraction.
test("H.1 10 partial history reports x of 4", () => {
  const history = summarizeFounderHistoryVisibility({
    status: "retryable",
    targetPeriods: [
      { start: "2026-08-13", end: "2026-08-19" }, { start: "2026-08-06", end: "2026-08-12" },
      { start: "2026-07-30", end: "2026-08-05" }, { start: "2026-07-23", end: "2026-07-29" },
    ],
    evaluated: { "2026-08-06": { status: "published" } },
  }, ["2026-08-13"]);
  assert.deepEqual([history.evaluatedSlots, history.totalSlots, history.pendingSlots, history.status], [2, 4, 2, "retryable"]);
});

// 11. Complete history can contain Reviews and no-activity without lying.
test("H.1 11 complete history reports evaluated state truthfully", () => {
  const history = summarizeFounderHistoryVisibility({
    status: "complete",
    targetPeriods: [
      { start: "2026-08-13", end: "2026-08-19" }, { start: "2026-08-06", end: "2026-08-12" },
      { start: "2026-07-30", end: "2026-08-05" }, { start: "2026-07-23", end: "2026-07-29" },
    ],
    evaluated: {
      "2026-08-13": { status: "published" }, "2026-08-06": { status: "published" },
      "2026-07-30": { status: "no_activity" }, "2026-07-23": { status: "existing" },
    },
  });
  assert.deepEqual([history.evaluatedSlots, history.reviewSlots, history.noActivitySlots, history.pendingSlots, history.status], [4, 3, 1, 0, "complete"]);
});

// H.1 correction: completed history remains immutable after an old existing Review rotates out.
test("H.1 correction complete history cannot regress when an existing Review ages out", () => {
  const targetPeriods = [
    { start: "2026-08-13", end: "2026-08-19" }, { start: "2026-08-06", end: "2026-08-12" },
    { start: "2026-07-30", end: "2026-08-05" }, { start: "2026-07-23", end: "2026-07-29" },
  ];
  const history = summarizeFounderHistoryVisibility({
    status: "complete",
    targetPeriods,
    evaluated: {
      "2026-08-13": { status: "published" },
      "2026-08-06": { status: "published" },
      "2026-07-30": { status: "no_activity" },
    },
  }, []);
  assert.deepEqual(
    [history.evaluatedSlots, history.reviewSlots, history.noActivitySlots, history.pendingSlots, history.status],
    [4, 3, 1, 0, "complete"],
  );
});

// The same missing evidence remains pending unless Patch H itself says the target window completed.
test("H.1 correction missing historical slot is not fabricated before complete", () => {
  const targetPeriods = [
    { start: "2026-08-13", end: "2026-08-19" }, { start: "2026-08-06", end: "2026-08-12" },
    { start: "2026-07-30", end: "2026-08-05" }, { start: "2026-07-23", end: "2026-07-29" },
  ];
  for (const status of ["pending", "retryable"] as const) {
    const history = summarizeFounderHistoryVisibility({
      status,
      targetPeriods,
      evaluated: {
        "2026-08-13": { status: "published" },
        "2026-08-06": { status: "published" },
        "2026-07-30": { status: "no_activity" },
      },
    }, []);
    assert.deepEqual(
      [history.evaluatedSlots, history.reviewSlots, history.noActivitySlots, history.pendingSlots, history.status],
      [3, 2, 1, 1, status],
    );
  }
});

test("H.1 correction Founder detail labels qualifying Review truthfully", () => {
  const consoleSource = read("src/components/FounderOperationsConsole.tsx");
  assert.match(consoleSource, /<dt>Latest qualifying Review<\/dt><dd>\{row\.latestReview\?\.periodLabel \?\? "No qualifying Review"\}<\/dd>/);
  assert.doesNotMatch(consoleSource, /<dt>Latest Review<\/dt>/);
  assert.doesNotMatch(consoleSource, /No completed Review/);
});

// 12. Original Beta/organic validation semantics remain untouched.
test("H.1 12 Original Beta and organic retention semantics remain intact", () => {
  const server = read("src/lib/boardsignal/server/founderOperations.ts");
  assert.match(server, /source: "original"/);
  assert.match(server, /source: review\.source/);
  assert.match(server, /summarizeOperationalRetention\(evidence, originalToLive, historicalActivationPlayers\)/);
});

// 13. Final specialized pocket surface owns both background/foreground and passes contrast.
test("H.1 13 pocket-card combined cascade owns readable inverse surface", () => {
  const css = read("src/app/boardsignal-h1-hotfix.css");
  assert.match(css, /\.universal-section\.pocket-card\s*\{[\s\S]*background:\s*var\(--bs-surface-inverse\);[\s\S]*color:\s*var\(--bs-text-on-inverse\);/);
  assert.match(css, /\.universal-section\.pocket-card :is\(h1, h2, h3, h4, strong, label\)/);
  assert.match(css, /\.universal-section\.pocket-card ::selection/);
  assert.match(css, /\.universal-section\.pocket-card :where\([\s\S]*\):focus-visible/);
  assert.ok(contrast("#101923", "#fffdf8") >= 4.5);
  assert.ok(contrast("#08111e", "#fffdf8") >= 4.5);
  const layout = read("src/app/layout.tsx");
  assert.ok(layout.indexOf("boardsignal-player-room-g3.css") < layout.indexOf("boardsignal-h1-hotfix.css"));
  assert.ok(layout.indexOf("boardsignal-h1-hotfix.css") < layout.indexOf("boardsignal-f2-readability.css"));
});

// 14. Required participation/Profile fields use semantic theme-aware contracts.
test("H.1 14 dark-mode Profile participation and controls are semantic", () => {
  const css = read("src/app/boardsignal-h1-hotfix.css");
  assert.match(css, /\.required-participation-row\s*\{[\s\S]*background:\s*var\(--bs-blue-soft\);[\s\S]*color:\s*var\(--bs-text-primary\);/);
  assert.match(css, /\.required-participation-row p \{ color: var\(--bs-text-secondary\); \}/);
  assert.match(css, /\.player-profile-section \.profile-settings-card :is\(input\[type="text"\], input\[type="email"\], select\)[\s\S]*background:\s*var\(--bs-surface-elevated\);[\s\S]*color:\s*var\(--bs-text-primary\);/);
  assert.doesNotMatch(css, /#e9eeff|background:\s*white|color:\s*#324154/);
  assert.ok(contrast("#e3e9ff", "#101923") >= 4.5);
  assert.ok(contrast("#19284b", "#f6f2e9") >= 4.5);
  assert.ok(contrast("#ffffff", "#101923") >= 4.5);
  assert.ok(contrast("#162338", "#f6f2e9") >= 4.5);
});

// 15. The affected rendered field label no longer exposes Beta language.
test("H.1 15 customer-facing Founding Beta Field maps to Founding Access", () => {
  assert.equal(boardSignalPresentationLabel("FOUNDING BETA FIELD"), "FOUNDING ACCESS FIELD");
  const recognition = read("src/components/UniverseRecognition.tsx");
  assert.match(recognition, /boardSignalPresentationLabel/);
});

// 16. Internal founding_beta identifiers remain unchanged.
test("H.1 16 internal founding_beta values remain intact", () => {
  const server = read("src/lib/boardsignal/server/founderOperations.ts");
  assert.match(server, /account\.accessTier === "founding_beta"/);
});

// 17. G.3 Quick Read hierarchy remains intact and H.1 does not replace it.
test("H.1 17 protected G.3 Player Room hierarchy remains intact", () => {
  const quick = read("src/components/PlayerRoomQuickRead.tsx");
  assert.match(quick, /YOUR WEEK IN 20 SECONDS/);
  assert.match(quick, /WHAT HAPPENED/);
  assert.match(quick, /KEEPS HAPPENING/);
  assert.match(quick, /BEFORE NEXT GAME/);
  assert.doesNotMatch(read("src/app/boardsignal-h1-hotfix.css"), /\.player-room-quick-read\s*\{/);
});

// 18. Protected F.2 learning-card final contract remains present and last.
test("H.1 18 protected F.2 readability contract remains intact", () => {
  const f2 = read("src/app/boardsignal-f2-readability.css");
  assert.match(f2, /\.universal-section\.universe-learning-section/);
  assert.match(f2, /--bs-f2-learning-card-dark/);
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /boardsignal-h1-hotfix\.css";\nimport "\.\/boardsignal-f2-readability\.css";/);
});

test("H.1 analytics configuration still expects the dedicated Vercel token", () => {
  const traffic = read("src/lib/boardsignal/server/vercelTraffic.ts");
  assert.match(traffic, /process\.env\.BOARDSIGNAL_VERCEL_ANALYTICS_TOKEN\?\.trim\(\)/);
});
