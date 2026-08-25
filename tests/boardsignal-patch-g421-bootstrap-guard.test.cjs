const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/lib/boardsignal/server/universePulse.ts"), "utf8");

function block(startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `missing ${startNeedle}`);
  const end = endNeedle ? source.indexOf(endNeedle, start + startNeedle.length) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
}

test("ordinary Universe read is a single state document read and never invokes population bootstrap", () => {
  const normal = block("export async function loadActiveUniverseState", "export async function rebuildMaterializedUniverseState");
  assert.match(normal, /stateRef\(\)\.get\(\)/);
  assert.doesNotMatch(normal, /bootstrapMaterializedUniverse\(/);
  assert.doesNotMatch(normal, /collection\(["']users["']\)/);
  assert.match(normal, /BOARDSIGNAL_UNIVERSE_STATE_UNAVAILABLE/);
  assert.match(normal, /approxDocumentReads:\s*1/);
});

test("write-side repair uses only bounded materialized participant summaries", () => {
  const rebuild = block("export async function rebuildMaterializedUniverseState", "export async function upsertMaterializedUniverseParticipant");
  const upsert = block("export async function upsertMaterializedUniverseParticipant", "export async function removeMaterializedUniverseParticipant");
  assert.match(rebuild, /collection\(["']publicUniverseParticipants["']\)\.limit\(MATERIALIZED_PARTICIPANT_LIMIT\)\.get\(\)/);
  assert.doesNotMatch(rebuild, /collection\(["']users["']\)/);
  assert.doesNotMatch(upsert, /bootstrapMaterializedUniverse\(/);
  assert.match(upsert, /return rebuildMaterializedUniverseState\(now\)/);
});

test("legacy population bootstrap remains isolated and cannot be reached by ordinary read or upsert paths", () => {
  const bootstrap = block("async function bootstrapActiveDeskRecords", "async function acquireBootstrapLease");
  assert.match(bootstrap, /collection\(["']users["']\)/);
  const normal = block("export async function loadActiveUniverseState", "export async function rebuildMaterializedUniverseState");
  const upsert = block("export async function upsertMaterializedUniverseParticipant", "export async function removeMaterializedUniverseParticipant");
  assert.doesNotMatch(normal, /bootstrapActiveDeskRecords|bootstrapMaterializedUniverse/);
  assert.doesNotMatch(upsert, /bootstrapActiveDeskRecords|bootstrapMaterializedUniverse/);
});
