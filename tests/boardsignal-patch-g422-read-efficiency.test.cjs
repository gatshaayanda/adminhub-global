const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const client = read("src/components/AskBoardSignal.tsx");
const route = read("src/app/api/boardsignal/guide/route.ts");
const universe = read("src/lib/boardsignal/server/universePulse.ts");

function block(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `missing ${startNeedle}`);
  const end = endNeedle ? source.indexOf(endNeedle, start + startNeedle.length) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
}

test("1. authenticated Ask BoardSignal observation is silent while the panel is closed", () => {
  assert.match(client, /if \(playerRoomMode && !open\) return/);
  assert.match(client, /panelOpen:\s*playerRoomMode \? open : undefined/);
  assert.match(client, /OBSERVATION_COOLDOWN_MS = 30_000/);
  assert.match(client, /observationGateRef/);
});

test("2. the server rejects hidden observation from old cached clients before private context loading", () => {
  const observe = block(route, 'if (action === "observe")', 'if (action === "ask")');
  const gate = observe.indexOf('body.mode !== "beta_preview" && body.panelOpen !== true');
  const load = observe.indexOf("guideContextObservation");
  assert.ok(gate >= 0, "missing closed-panel server gate");
  assert.ok(load > gate, "private context loader must come after the closed-panel gate");
  assert.match(observe, /return response\(\{ ok: true, observation: undefined \}\)/);
});

test("3. Universe missing-state repair is lease protected and reads no private population collections", () => {
  const repair = block(universe, "async function repairMaterializedUniverseState", "export async function loadActiveUniverseState");
  assert.match(repair, /acquireBootstrapLease\(now\)/);
  assert.match(repair, /publicUniverseParticipants/);
  assert.match(repair, /MATERIALIZED_PARTICIPANT_LIMIT \+ 1/);
  assert.doesNotMatch(repair, /collection\(["']users["']\)|collection\(["']desks["']\)|collection\(["']factualReviews["']\)|collection\(["']evidence["']\)|bootstrapActiveDeskRecords|bootstrapMaterializedUniverse/);
});

test("4. first safe repair establishes current state and subsequent normal reads stay O(1)", () => {
  const normal = block(universe, "export async function loadActiveUniverseState", "export async function rebuildMaterializedUniverseState");
  assert.match(normal, /stateRef\(\)\.get\(\)/);
  assert.match(normal, /repairMaterializedUniverseState\(now\)/);
  assert.match(normal, /materialized:\s*"hit"[\s\S]*approxDocumentReads:\s*1/);
  const rebuild = block(universe, "export async function rebuildMaterializedUniverseState", "export async function upsertMaterializedUniverseParticipant");
  assert.match(rebuild, /materializedStateFromParticipants\(participants, previousEvents, now, \(previous\?\.revision \?\? 0\) \+ 1, true\)/);
});

test("5. bounded repair refuses silent truncation above the materialized participant cap", () => {
  const repair = block(universe, "async function repairMaterializedUniverseState", "export async function loadActiveUniverseState");
  const rebuild = block(universe, "export async function rebuildMaterializedUniverseState", "export async function upsertMaterializedUniverseParticipant");
  assert.match(repair, /snapshot\.size > MATERIALIZED_PARTICIPANT_LIMIT/);
  assert.match(rebuild, /participantsSnapshot\.size > MATERIALIZED_PARTICIPANT_LIMIT/);
  assert.match(universe, /BOARDSIGNAL_UNIVERSE_MATERIALIZED_LIMIT/);
});
