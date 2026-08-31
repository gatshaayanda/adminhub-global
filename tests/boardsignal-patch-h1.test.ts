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

function luminance(hex: string) {
  const value = hex.replace("#", "");
  const rgb = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(a: string, b: string) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

test("H.1 temporal truth keeps stale forming out of current operations", () => {
  const stale = deriveFounderOperation({ uid: "A", username: "vastu_rajpara", forming: true, nextDeskDueAt: "2026-06-29", lastSeenAt: "2026-08-20T10:00:00.000Z" }, now);
  assert.equal(stale.forming, false);
  assert.equal(stale.reviewCheckRequired, true);
  assert.equal(stale.currentState, "REVIEW CHECK REQUIRED");
  assert.equal(filterFounderOperationRows([rowFrom({ uid: "A", username: "vastu_rajpara", forming: true, nextDeskDueAt: "2026-06-29", lastSeenAt: "2026-08-20T10:00:00.000Z" })], "reviews_forming").length, 0);

  const future = deriveFounderOperation({ uid: "B", username: "future", forming: true, nextDeskDueAt: "2026-08-25", lastSeenAt: "2026-08-21T10:00:00.000Z" }, now);
  assert.equal(future.forming, true);
  assert.equal(future.reviewCheckRequired, false);
  assert.equal(future.currentState, "FORMING");

  const due = "2026-08-21";
  const insideGrace = new Date(Date.parse("2026-08-21T00:00:00.000Z") + REVIEW_DUE_GRACE_MS - 1);
  const grace = deriveFounderOperation({ uid: "C", username: "grace", forming: true, nextDeskDueAt: due, lastSeenAt: "2026-08-21T01:00:00.000Z" }, insideGrace);
  assert.equal(grace.forming, true);
  assert.equal(grace.reviewCheckRequired, false);
});

test("H.1 Review-ready state outranks stale due/check state and date labels stay truthful", () => {
  const ready = deriveFounderOperation({
    uid: "D", username: "ready", forming: true, nextDeskDueAt: "2026-06-29",
    lastSeenAt: "2026-08-20T08:00:00.000Z",
    latestReview: { publishedAt: "2026-08-21T08:00:00.000Z", periodStart: "2026-08-13", periodEnd: "2026-08-19" },
  }, now);
  assert.equal(ready.forming, false);
  assert.equal(ready.reviewCheckRequired, false);
  assert.equal(ready.readyNotSeen, true);
  assert.equal(ready.currentState, "REVIEW READY · NOT SEEN");

  assert.equal(deriveFounderOperation({ uid: "E", username: "past", nextDeskDueAt: "2026-06-29" }, now).reviewDateLabel, "EXPECTED REVIEW");
  assert.equal(deriveFounderOperation({ uid: "F", username: "future", nextDeskDueAt: "2026-08-25" }, now).reviewDateLabel, "NEXT REVIEW");
  assert.doesNotMatch(read("src/components/FounderOperationsConsole.tsx"), /<span>NEXT REVIEW<\/span>/);
});

test("H.1 founder metrics and retention keep historical onboarding separate from qualifying Reviews", () => {
  const server = read("src/lib/boardsignal/server/founderOperations.ts");
  const materialized = read("src/lib/boardsignal/server/founderMaterialized.ts");
  assert.match(server, /forming:\s*derived\.forming/);
  assert.match(materialized, /reviewsForming:\s*row\.forming \? 1 : 0/);
  assert.match(server, /const nonHistorical = periods\.filter\(\(period\) => period\.source !== "historical"\)/);
  assert.match(server, /reviewCount:\s*nonHistorical\.length/);
  assert.match(server, /reviewPeriods:\s*nonHistorical/);
  assert.match(server, /activationBaseline === true/);
  assert.match(server, /nonHistorical\.filter\(\(period\) => period\.source === "original"\)\.length/);
  assert.match(server, /nonHistorical\.filter\(\(period\) => period\.source === "live"\)\.length/);
  assert.match(materialized, /const baseline = originalReviews > 0 \|\| input\.activationBaseline === true \? 1 : 0/);
  assert.match(materialized, /const retentionDepth = baseline \+ liveReviews/);
  assert.match(materialized, /originalToLive: originalReviews > 0 && liveReviews > 0 \? 1 : 0/);
});

test("H.1 history visibility counts Reviews, no-activity and pending slots without fabrication", () => {
  const targets = [
    { start: "2026-08-13", end: "2026-08-19" },
    { start: "2026-08-06", end: "2026-08-12" },
    { start: "2026-07-30", end: "2026-08-05" },
    { start: "2026-07-23", end: "2026-07-29" },
  ];

  const partial = summarizeFounderHistoryVisibility({
    status: "retryable",
    targetPeriods: targets,
    evaluated: { "2026-08-06": { status: "no_activity" } },
  }, ["2026-08-13"]);
  assert.deepEqual([partial.evaluatedSlots, partial.reviewSlots, partial.noActivitySlots, partial.pendingSlots, partial.status], [2, 1, 1, 2, "retryable"]);

  const complete = summarizeFounderHistoryVisibility({
    status: "complete",
    targetPeriods: targets,
    evaluated: {
      "2026-08-13": { status: "published" },
      "2026-08-06": { status: "published" },
      "2026-07-30": { status: "no_activity" },
    },
  }, []);
  assert.deepEqual([complete.evaluatedSlots, complete.reviewSlots, complete.noActivitySlots, complete.pendingSlots, complete.status], [4, 3, 1, 0, "complete"]);

  for (const status of ["pending", "retryable"] as const) {
    const notComplete = summarizeFounderHistoryVisibility({
      status,
      targetPeriods: targets,
      evaluated: {
        "2026-08-13": { status: "published" },
        "2026-08-06": { status: "published" },
        "2026-07-30": { status: "no_activity" },
      },
    }, []);
    assert.deepEqual([notComplete.evaluatedSlots, notComplete.reviewSlots, notComplete.noActivitySlots, notComplete.pendingSlots, notComplete.status], [3, 2, 1, 1, status]);
  }
});

test("H.1 founder detail labels qualifying Review history truthfully", () => {
  const source = read("src/components/FounderOperationsConsole.tsx");
  const server = read("src/lib/boardsignal/server/founderOperations.ts");
  assert.match(server, /const nonHistorical = periods\.filter\(\(period\) => period\.source !== "historical"\)/);
  assert.match(server, /reviewCount:\s*nonHistorical\.length/);
  assert.match(server, /reviewPeriods:\s*nonHistorical/);
  assert.match(source, /PRODUCT HISTORY \/ VALIDATION/);
  assert.match(source, /REVIEWS PRODUCED/);
  assert.match(source, /HISTORICAL ONBOARDING/);
  assert.match(source, /Historical onboarding is real Review output, but it is not automatically a player return\./);
  assert.doesNotMatch(source, /<dt>Latest Review<\/dt>/);
  assert.doesNotMatch(source, /No completed Review/);
});

test("H.1 visual readability contracts survive Patch L consolidation", () => {
  const system = read("src/app/boardsignal-system.css");
  const layout = read("src/app/layout.tsx");

  assert.match(system, /\.universal-section\.pocket-card[\s\S]*background:\s*var\(--bs-surface-inverse\);[\s\S]*color:\s*var\(--bs-text-on-inverse\);/);
  assert.match(system, /\.universal-section\.pocket-card :is\(h1, h2, h3, h4, strong, label\)/);
  assert.ok(contrast("#101923", "#fffdf8") >= 4.5);
  assert.ok(contrast("#08111e", "#fffdf8") >= 4.5);

  assert.match(system, /\.required-participation-row[\s\S]*background:\s*var\(--bs-blue-soft\);[\s\S]*color:\s*var\(--bs-text-primary\);/);
  assert.match(system, /\.player-profile-section \.profile-settings-card :is\(input\[type="text"\], input\[type="email"\], select\)[\s\S]*background:\s*var\(--bs-surface-elevated\);[\s\S]*color:\s*var\(--bs-text-primary\);/);
  assert.ok(contrast("#e3e9ff", "#101923") >= 4.5);
  assert.ok(contrast("#19284b", "#f6f2e9") >= 4.5);

  assert.match(system, /\.universal-section\.universe-learning-section/);
  assert.match(system, /--bs-learning-card/);
  assert.match(layout, /import "\.\/boardsignal-system\.css";/);
  assert.doesNotMatch(layout, /import "\.\/boardsignal-h1-hotfix\.css";|import "\.\/boardsignal-f2-readability\.css";/);
});

test("H.1 protected player hierarchy and presentation language remain intact", () => {
  const quick = read("src/components/PlayerRoomQuickRead.tsx");
  assert.match(quick, /YOUR WEEK IN 20 SECONDS/);
  assert.match(quick, /WHAT HAPPENED/);
  assert.match(quick, /KEEPS HAPPENING/);
  assert.match(quick, /BEFORE NEXT GAME/);
  assert.doesNotMatch(read("src/app/boardsignal-system.css"), /\.player-room-quick-read\s*\{/);

  assert.equal(boardSignalPresentationLabel("FOUNDING BETA FIELD"), "FOUNDING ACCESS FIELD");
  assert.match(read("src/components/UniverseRecognition.tsx"), /boardSignalPresentationLabel/);
  const account = read("src/lib/boardsignal/account.ts");
  assert.match(account, /export type BoardSignalAccessTier = "founding_beta" \| "paid"/);
  assert.match(account, /accessTier:\s*"founding_beta"/);
});

test("H.1 analytics configuration still expects the dedicated Vercel token", () => {
  const traffic = read("src/lib/boardsignal/server/vercelTraffic.ts");
  assert.match(traffic, /process\.env\.BOARDSIGNAL_VERCEL_ANALYTICS_TOKEN\?\.trim\(\)/);
});
