import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  FOUNDER_ACTION_FILTERS,
  FOUNDER_COMMAND_CENTER_HISTORY_LIMIT,
  appendFounderSnapshot,
  calculateFounderDeltas,
  createFounderLocalSnapshot,
  parseFounderSnapshotHistory,
  retentionConversion,
  sanitizeFounderLocalSnapshot,
  type FounderAggregateForSnapshot,
} from "../src/lib/boardsignal/founderCommandCenter";

function aggregate(overrides: Partial<FounderAggregateForSnapshot> = {}): FounderAggregateForSnapshot {
  return {
    generatedAt: "2026-08-27T10:00:00.000Z",
    revision: 12,
    attention: { newRequests: 1, followUpsDue: 2, unreadReplies: 3, exceptions: 0, identityConflicts: 0 },
    metrics: { activePlayers: 44, reviewsForming: 12, reviewsReady: 4, notSeenRecently: 7 },
    validation: { playersServed: 31, totalReviewsProduced: 68, liveReviews: 21, r2Plus: 8, r3Plus: 3, r4: 1 },
    ...overrides,
  };
}

test("Founder local snapshot contains aggregate counters only", () => {
  const value = createFounderLocalSnapshot(aggregate(), "2026-08-27T10:01:00.000Z") as unknown as Record<string, unknown>;
  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes("username"), false);
  assert.equal(serialized.includes("preferredContactValue"), false);
  assert.equal(serialized.includes("message"), false);
  assert.equal(serialized.includes("reviewData"), false);
  assert.deepEqual(Object.keys(value).sort(), ["capturedAt", "counters", "generatedAt", "revision"]);
});

test("snapshot sanitizer discards private or unknown player fields", () => {
  const safe = createFounderLocalSnapshot(aggregate());
  const poisoned = { ...safe, username: "private-player", preferredContactValue: "private@example.com", messages: ["private"] };
  const sanitized = sanitizeFounderLocalSnapshot(poisoned);
  assert.ok(sanitized);
  const serialized = JSON.stringify(sanitized);
  assert.equal(serialized.includes("private-player"), false);
  assert.equal(serialized.includes("private@example.com"), false);
  assert.equal(serialized.includes("messages"), false);
});

test("current-vs-previous delta math is deterministic", () => {
  const previous = createFounderLocalSnapshot(aggregate(), "2026-08-27T10:01:00.000Z");
  const current = createFounderLocalSnapshot(aggregate({
    attention: { newRequests: 2, followUpsDue: 1, unreadReplies: 3, exceptions: 1, identityConflicts: 0 },
    metrics: { activePlayers: 46, reviewsForming: 17, reviewsReady: 4, notSeenRecently: 5 },
    validation: { playersServed: 32, totalReviewsProduced: 72, liveReviews: 24, r2Plus: 9, r3Plus: 3, r4: 1 },
  }), "2026-08-27T11:01:00.000Z");
  const delta = calculateFounderDeltas(current, previous);
  assert.ok(delta);
  assert.equal(delta.activePlayers, 2);
  assert.equal(delta.totalReviewsProduced, 4);
  assert.equal(delta.liveReviews, 3);
  assert.equal(delta.playersServed, 1);
  assert.equal(delta.r2Plus, 1);
  assert.equal(delta.r3Plus, 0);
  assert.equal(delta.reviewsForming, 5);
  assert.equal(delta.notSeenRecently, -2);
  assert.equal(delta.exceptions, 1);
});

test("first snapshot does not invent a delta", () => {
  const current = createFounderLocalSnapshot(aggregate());
  assert.equal(calculateFounderDeltas(current), null);
});

test("Founder local history remains bounded at 30 successful snapshots", () => {
  let history = [] as ReturnType<typeof parseFounderSnapshotHistory>;
  for (let index = 0; index < 45; index += 1) {
    history = appendFounderSnapshot(history, createFounderLocalSnapshot(aggregate({ revision: index }), new Date(2026, 7, 27, 10, index).toISOString()));
  }
  assert.equal(FOUNDER_COMMAND_CENTER_HISTORY_LIMIT, 30);
  assert.equal(history.length, 30);
  assert.equal(history[0]?.revision, 15);
  assert.equal(history.at(-1)?.revision, 44);
});

test("stored history parser retains only bounded sanitized snapshots", () => {
  const snapshots = Array.from({ length: 35 }, (_, index) => ({
    ...createFounderLocalSnapshot(aggregate({ revision: index })),
    username: `player-${index}`,
  }));
  const parsed = parseFounderSnapshotHistory(JSON.stringify(snapshots));
  assert.equal(parsed.length, 30);
  assert.equal(JSON.stringify(parsed).includes("player-"), false);
});

test("action cards map to the established lazy Player Operations filters", () => {
  assert.deepEqual(FOUNDER_ACTION_FILTERS, {
    newRequests: "new_requests",
    followUpsDue: "follow_up_due",
    unreadReplies: "unread_replies",
    exceptions: "exceptions",
    identityConflicts: "identity",
  });
});

test("retention conversion reports only mathematically valid denominators", () => {
  assert.equal(retentionConversion(8, 40), 20);
  assert.equal(retentionConversion(3, 0), null);
  assert.equal(retentionConversion(1, Number.NaN), null);
});

test("Command Center initial path stays aggregate-only and detailed rows remain lazy", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/components/FounderOperationsConsole.tsx"), "utf8");
  assert.match(source, /fetchOperations\("\/api\/admin\/boardsignal\/operations"\)/);
  assert.match(source, /fetchOperations\("\/api\/admin\/boardsignal\/operations\?view=rows"\)/);
  assert.match(source, /useEffect\(\(\) => \{ void loadSummary\(\); \}, \[loadSummary\]\)/);
  assert.doesNotMatch(source, /useEffect\([^)]*loadRows/);
  assert.doesNotMatch(source, /setInterval|setTimeout\([^)]*fetch|requestAnimationFrame\([^)]*fetch/);
});

test("Newsroom and Traffic detail remain lazy", () => {
  const newsroom = fs.readFileSync(path.join(process.cwd(), "src/components/FounderNewsroomSummary.tsx"), "utf8");
  const traffic = fs.readFileSync(path.join(process.cwd(), "src/components/FounderTrafficAnalytics.tsx"), "utf8");
  assert.match(newsroom, /onToggle/);
  assert.match(newsroom, /\/api\/admin\/boardsignal\/newsroom/);
  assert.match(traffic, /onToggle/);
  assert.match(traffic, /\/api\/admin\/boardsignal\/traffic/);
});

test("retention ladder preserves established Review truth language", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/components/FounderOperationsConsole.tsx"), "utf8");
  assert.match(source, /Historical onboarding remains product output, not a return event/);
  assert.match(source, /Original Manual \+ Organic Live \+ Historical Onboarding/);
  assert.match(source, /Original Manual \+ Organic Live/);
});

test("Command Center supports reduced motion and responsive mobile layouts", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "src/components/FounderCommandCenter.module.css"), "utf8");
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /min-height:\s*44px/);
});

function luminance(hex: string): number {
  const rgb = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const linear = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("Founder Command Center primary telemetry colors exceed WCAG AA normal-text contrast", () => {
  for (const foreground of ["#f2f6f8", "#a9bac5", "#6fffb2", "#73dcff", "#ffd071", "#ff7e86"]) {
    assert.ok(contrast(foreground, "#071018") >= 4.5, `${foreground} must pass against the command background`);
  }
});
