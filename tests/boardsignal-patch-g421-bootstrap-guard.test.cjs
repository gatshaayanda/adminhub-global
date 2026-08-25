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

test("ordinary Universe read remains bounded and cannot invoke legacy population bootstrap", () => {
  const normal = block("export async function loadActiveUniverseState", "export async function rebuildMaterializedUniverseState");
  assert.match(normal, /stateRef\(\)\.get\(\)/);
  assert.match(normal, /repairMaterializedUniverseState\(now\)/);
  assert.doesNotMatch(normal, /bootstrapMaterializedUniverse\(/);
  assert.doesNotMatch(normal, /collection\(["']users["']\)/);
  assert.doesNotMatch(normal, /collection\(["']desks["']\)/);
  assert.match(normal, /BOARDSIGNAL_UNIVERSE_STATE_UNAVAILABLE/);
  assert.match(normal, /approxDocumentReads:\s*1/);
});

test("missing state repairs only from lease-protected bounded public participant summaries", () => {
  const repair = block("async function repairMaterializedUniverseState", "export async function loadActiveUniverseState");
  assert.match(repair, /acquireBootstrapLease\(now\)/);
  assert.match(repair, /collection\(["']publicUniverseParticipants["']\)[\s\S]*limit\(MATERIALIZED_PARTICIPANT_LIMIT \+ 1\)/);
  assert.match(repair, /snapshot\.size > MATERIALIZED_PARTICIPANT_LIMIT/);
  assert.match(repair, /materializedStateFromParticipants\(participants, \[\], now, 1, true\)/);
  assert.doesNotMatch(repair, /collection\(["']users["']\)|collection\(["']desks["']\)|bootstrapActiveDeskRecords|bootstrapMaterializedUniverse/);
});

test("write-side repair uses only bounded materialized participant summaries", () => {
  const rebuild = block("export async function rebuildMaterializedUniverseState", "export async function upsertMaterializedUniverseParticipant");
  const upsert = block("export async function upsertMaterializedUniverseParticipant", "export async function removeMaterializedUniverseParticipant");
  assert.match(rebuild, /collection\(["']publicUniverseParticipants["']\)\.limit\(MATERIALIZED_PARTICIPANT_LIMIT \+ 1\)\.get\(\)/);
  assert.match(rebuild, /participantsSnapshot\.size > MATERIALIZED_PARTICIPANT_LIMIT/);
  assert.match(rebuild, /materializedStateFromParticipants\(participants, previousEvents, now, \(previous\?\.revision \?\? 0\) \+ 1, true\)/);
  assert.doesNotMatch(rebuild, /collection\(["']users["']\)/);
  assert.doesNotMatch(upsert, /bootstrapMaterializedUniverse\(/);
  assert.match(upsert, /return rebuildMaterializedUniverseState\(now\)/);
});

test("legacy population bootstrap remains isolated and cannot be reached by ordinary read, repair or upsert paths", () => {
  const bootstrap = block("async function bootstrapActiveDeskRecords", "async function acquireBootstrapLease");
  assert.match(bootstrap, /collection\(["']users["']\)/);
  const repair = block("async function repairMaterializedUniverseState", "export async function loadActiveUniverseState");
  const normal = block("export async function loadActiveUniverseState", "export async function rebuildMaterializedUniverseState");
  const upsert = block("export async function upsertMaterializedUniverseParticipant", "export async function removeMaterializedUniverseParticipant");
  assert.doesNotMatch(repair, /bootstrapActiveDeskRecords|bootstrapMaterializedUniverse/);
  assert.doesNotMatch(normal, /bootstrapActiveDeskRecords|bootstrapMaterializedUniverse/);
  assert.doesNotMatch(upsert, /bootstrapActiveDeskRecords|bootstrapMaterializedUniverse/);
});
