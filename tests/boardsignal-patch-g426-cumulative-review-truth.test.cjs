const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const productionSrc = read("src/lib/boardsignal/reviewProduction.ts");
const serverPeriods = read("src/lib/boardsignal/server/reviewPeriods.ts");
const persistence = read("src/lib/boardsignal/server/persistence.ts");
const roomRoute = read("src/app/api/boardsignal/player-room/route.ts");
const founderMat = read("src/lib/boardsignal/server/founderMaterialized.ts");
const founderOps = read("src/lib/boardsignal/server/founderOperations.ts");
const founderUi = read("src/components/FounderOperationsConsole.tsx");
const universe = read("src/lib/boardsignal/server/universePulse.ts");
const contract = read("BOARD_SIGNAL_PRODUCT_CONTRACT.md");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "boardsignal-g426-"));
const compiled = ts.transpileModule(productionSrc, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  reportDiagnostics: true,
});
const diagnostics = (compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
assert.equal(diagnostics.length, 0, diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
const js = path.join(tmp, "reviewProduction.js");
fs.writeFileSync(js, compiled.outputText);
const production = require(js);

test("1. every Review lifecycle contributes to cumulative product output", () => {
  const stats = production.reviewProductionFromFacts([
    { periodStart: "2026-07-01", reviewLifecycle: "original_beta" },
    { periodStart: "2026-07-08", reviewLifecycle: "organic_live" },
    { periodStart: "2026-06-24", reviewLifecycle: "historical_backfill" },
  ], new Date("2026-08-25T00:00:00Z"));
  assert.equal(stats.totalReviews, 3);
  assert.equal(stats.originalBetaReviews, 1);
  assert.equal(stats.organicLiveReviews, 1);
  assert.equal(stats.historicalBackfillReviews, 1);
});

test("2. one player-week is counted once even if multiple representations exist", () => {
  const stats = production.reviewProductionFromFacts([
    { periodStart: "2026-07-08", reviewLifecycle: "historical_backfill" },
    { periodStart: "2026-07-08", reviewLifecycle: "organic_live" },
    { periodStart: "2026-07-08", reviewLifecycle: "original_beta" },
  ]);
  assert.equal(stats.totalReviews, 1);
  assert.equal(stats.originalBetaReviews, 1);
  assert.equal(stats.organicLiveReviews, 0);
  assert.equal(stats.historicalBackfillReviews, 0);
});

test("3. reviewPeriods remains the idempotency gate for write-time aggregation", () => {
  assert.ok(serverPeriods.includes('existing?.outcome === "review" && result.outcome === "no_activity"'));
  assert.ok(serverPeriods.includes('result.outcome !== "review" || existing?.outcome === "review"'));
  assert.ok(serverPeriods.includes("addReviewProductionFact"));
  assert.ok(serverPeriods.includes("transaction.set(userRef, { reviewProduction:"));
});

test("4. publication records the lifecycle chosen by publishPrivateDesk", () => {
  assert.ok(roomRoute.includes('"reviewLifecycle" in publication'));
  assert.ok(roomRoute.includes("accountWithReviewProduction"));
});

test("5. Player Room heavy memory still rotates at four", () => {
  assert.ok(read("src/lib/boardsignal/memory.ts").includes("ordered.slice(0, 4)"));
  assert.ok(persistence.includes("retainLatestFour(entries)"));
  assert.ok(persistence.includes("deleteDeskTree(account.uid, removed.documentId)"));
});

test("6. Original Manual proof comes from the complete repository registry", () => {
  assert.ok(founderMat.includes("ORIGINAL_BETA_REVIEW_TOTAL = ORIGINAL_BETA_SOURCES.length"));
  assert.ok(founderOps.includes("Object.keys(account.originalBetaHistoryPeriods ?? {}).length"));
});

test("7. dashboard separates total output from retention", () => {
  assert.ok(founderMat.includes("const verifiedReviews = originalReviews + liveReviews"));
  assert.ok(founderMat.includes("const totalReviewsProduced = verifiedReviews + historicalPeriods"));
  for (const label of ["TOTAL REVIEWS", "ORIGINAL MANUAL", "ORGANIC LIVE", "HISTORICAL ONBOARDING", "RETENTION REVIEWS"]) {
    assert.ok(founderUi.includes(`"${label}"`));
  }
});

test("8. historical onboarding does not inflate retention depth", () => {
  const start = founderMat.indexOf("export function founderSummaryFromRow");
  const end = founderMat.indexOf("export function founderPendingSummaryFromInput", start);
  const summary = founderMat.slice(start, end);
  assert.ok(summary.includes("const retentionDepth = baseline + liveReviews"));
  assert.equal(summary.includes("retentionDepth = baseline + liveReviews + historicalPeriods"), false);
});

test("9. cumulative truth self-heals from bounded tiny review-period facts", () => {
  const start = founderMat.indexOf("export async function reconcileFounderLifecycleTruth");
  const end = founderMat.indexOf("type PendingSourceRequest", start);
  const repair = founderMat.slice(start, end);
  assert.ok(founderMat.includes("FOUNDER_LIFECYCLE_TRUTH_VERSION = 3"));
  assert.ok(repair.includes('collectionGroup("reviewPeriods").limit(FOUNDER_REVIEW_FACT_RECONCILE_LIMIT + 1)'));
  assert.ok(repair.includes("reviewProductionFromFacts"));
  assert.equal(repair.includes('collection("desks")'), false);
  assert.equal(repair.includes('collection("evidence")'), false);
});

test("10. ordinary Founder aggregate load stays materialized", () => {
  const start = founderMat.indexOf("export async function loadFounderOperationsAggregate");
  const end = founderMat.indexOf("export async function loadFounderOperationRows", start);
  const normal = founderMat.slice(start, end);
  assert.ok(normal.includes("const snapshot = await aggregateRef().get()"));
  assert.ok(normal.includes("approxDocumentReads: 1"));
});

test("11. Universe stays a materialized current projection", () => {
  const start = universe.indexOf("export async function loadActiveUniverseState");
  const end = universe.indexOf("export async function rebuildMaterializedUniverseState", start);
  const normal = universe.slice(start, end);
  assert.ok(normal.includes("stateRef().get()"));
  assert.equal(normal.includes("reviewProduction"), false);
  assert.equal(normal.includes("reviewPeriods"), false);
  assert.equal(normal.includes('collection("users")'), false);
  assert.ok(persistence.includes("upsertMaterializedUniverseParticipant"));
});

test("12. contract preserves four heavy Desks plus cumulative truth", () => {
  assert.ok(contract.includes("Review production truth is cumulative"));
  assert.ok(contract.includes("Historical Onboarding counts toward total Review output but does not count as a player return"));
  assert.ok(contract.includes("Universe remains a materialized current projection"));
});
