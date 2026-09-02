const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pulse = read("src/lib/boardsignal/pulse.ts");
const universe = read("src/lib/boardsignal/server/universePulse.ts");
const ops = read("src/lib/boardsignal/server/founderOperations.ts");
const mat = read("src/lib/boardsignal/server/founderMaterialized.ts");
const ui = read("src/components/FounderOperationsConsole.tsx");
const persistence = read("src/lib/boardsignal/server/persistence.ts");

test("1. public Universe evidence is narrowly allowed while private fields stay blocked", () => {
  assert.match(pulse, /function isSafeUniverseEvidence/);
  assert.match(pulse, /key === "evidence"/);
  assert.doesNotMatch(pulse, /"blue", "evidence", "engineResults"/);
  for (const key of ["red","amber","blue","engineResults","privateProgress","privateNotes"]) assert.match(pulse, new RegExp(`"${key}"`));
});

test("2. Universe normal read remains materialized and cannot population-scan", () => {
  const start = universe.indexOf("export async function loadActiveUniverseState");
  const end = universe.indexOf("export async function rebuildMaterializedUniverseState", start);
  const normal = universe.slice(start, end);
  assert.match(normal, /stateRef\(\)\.get\(\)/);
  assert.match(normal, /repairMaterializedUniverseState\(now\)/);
  assert.doesNotMatch(normal, /collection\("users"\)|bootstrapMaterializedUniverse|bootstrapActiveDeskRecords/);
});

test("3. Reviews Forming derives from cadence truth, including Player Room activity updates", () => {
  assert.match(ops, /forming: cadenceWeekForming\(account\)/);
  assert.doesNotMatch(ops, /forming: account\.currentEpisodeSummary\?\.status/);
  assert.match(persistence, /forming: account\.accessStatus === "active" && Boolean\(account\.cadenceAnchor\)/);
  assert.match(ui, /REVIEW · \{row\.review\.status \?\? "NOT CHECKED"\}/);
  assert.match(ui, /reviewProgressLabel\(row\)/);
});

test("4. historical onboarding counts as Review output but does not inflate retentionDepth", () => {
  assert.match(ops, /historicalPublishedPeriods\(account\)/);
  assert.match(mat, /historicalPeriods/);
  assert.match(ui, /HISTORICAL ONBOARDING/);
  assert.match(ui, /REVIEWS PRODUCED/);
  const start = mat.indexOf("export function founderSummaryFromRow");
  const end = mat.indexOf("export function founderPendingSummaryFromInput", start);
  const summary = mat.slice(start, end);
  assert.match(summary, /const totalReviewsProduced = originalReviews \+ liveReviews \+ historicalPeriods/);
  assert.match(summary, /const retentionDepth = baseline \+ liveReviews/);
  assert.doesNotMatch(summary, /retentionDepth[^\n]*historicalPeriods/);
});

test("5. existing Founder aggregate self-heals once through a bounded account/summary reconciliation", () => {
  const start = mat.indexOf("export async function reconcileFounderLifecycleTruth");
  const end = mat.indexOf("type PendingSourceRequest", start);
  const repair = mat.slice(start, end);
  assert.match(repair, /FOUNDER_LIFECYCLE_RECONCILE_LIMIT \+ 1/);
  assert.match(repair, /collection\("users"\)/);
  assert.match(repair, /collection\("founderPlayerSummaries"\)/);
  assert.doesNotMatch(repair, /collection\("desks"\)|collection\("evidence"\)|resolveChessComPlayer/);
  assert.match(repair, /collectionGroup\("reviewPeriods"\).*FOUNDER_REVIEW_FACT_RECONCILE_LIMIT/s);
  assert.match(repair, /lifecycleTruthVersion: FOUNDER_LIFECYCLE_TRUTH_VERSION/);
});
