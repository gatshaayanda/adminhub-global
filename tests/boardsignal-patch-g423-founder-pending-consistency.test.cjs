const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/lib/boardsignal/server/founderMaterialized.ts"), "utf8");

function block(startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `missing ${startNeedle}`);
  const end = endNeedle ? source.indexOf(endNeedle, start + startNeedle.length) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
}

test("1. Founder pending reconciliation uses authoritative pending requests, not all players", () => {
  const reconcile = block("export async function reconcileFounderPendingRequestState", "export async function upsertFounderPlayerSummary");
  assert.match(reconcile, /collection\("betaRequests"\)\.where\("status", "==", "pending"\)/);
  assert.match(reconcile, /collection\("founderPendingRequestSummaries"\)\.where\("active", "==", true\)/);
  assert.doesNotMatch(reconcile, /collection\("users"\)|founderPlayerSummaries/);
});

test("2. reconciliation is bounded and refuses silent overflow", () => {
  const reconcile = block("export async function reconcileFounderPendingRequestState", "export async function upsertFounderPlayerSummary");
  assert.match(reconcile, /FOUNDER_PENDING_RECONCILE_LIMIT \+ 1/);
  assert.match(reconcile, /FOUNDER_PENDING_RECONCILE_LIMIT/);
  assert.match(reconcile, /FOUNDER_PENDING_RECONCILE_LIMIT/);
});

test("3. stale derived request summaries are deleted and missing summaries are recreated", () => {
  const reconcile = block("export async function reconcileFounderPendingRequestState", "export async function upsertFounderPlayerSummary");
  assert.match(reconcile, /if \(!actual\.has\(requestId\)\)[\s\S]*batch\.delete\(pendingRef\(requestId\)\)/);
  assert.match(reconcile, /founderPendingSummaryFromInput\(request, now\)/);
  assert.match(reconcile, /batch\.set\(pendingRef\(requestId\)/);
});

test("4. New Requests is reset to authoritative source truth", () => {
  const reconcile = block("export async function reconcileFounderPendingRequestState", "export async function upsertFounderPlayerSummary");
  assert.match(reconcile, /aggregate\.attention\.newRequests !== actual\.size/);
  assert.match(reconcile, /newRequests: actual\.size/);
});

test("5. approval/rejection cleanup immediately reconciles and landing self-heals", () => {
  const clear = block("export async function clearFounderPendingRequestSummary", "export async function loadFounderOperationsAggregate");
  const load = block("export async function loadFounderOperationsAggregate", "export async function loadFounderOperationRows");
  assert.match(clear, /return reconcileFounderPendingRequestState\(now\)/);
  assert.match(load, /reconcileFounderPendingRequestState\(now\)/);
  assert.doesNotMatch(load, /collection\("users"\)|loadFounderOperationRows\(/);
});
