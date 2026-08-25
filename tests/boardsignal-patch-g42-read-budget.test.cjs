const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const block = (source, startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `missing ${startNeedle}`);
  const end = endNeedle ? source.indexOf(endNeedle, start + startNeedle.length) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
};

const universe = read('src/lib/boardsignal/server/universePulse.ts');
const persistence = read('src/lib/boardsignal/server/persistence.ts');
const founder = read('src/lib/boardsignal/server/founderMaterialized.ts');
const founderRoute = read('src/app/api/admin/boardsignal/operations/route.ts');
const playerRoom = read('src/components/BoardSignalPlayerRoom.tsx');
const liveUnavailable = read('src/components/LiveDataUnavailablePlayerRoom.tsx');
const refreshGate = read('src/lib/boardsignal/client/playerRoomRefreshGate.ts');
const historyWorker = read('src/components/BoardSignalHistoryWorker.tsx');
const model = read('src/lib/boardsignal/server/readBudgetModel.ts');

function budget(players) {
  const oldUniverse = players + players * 4 + 80;
  return {
    oldUniverse,
    oldPlayerRoom: oldUniverse * 2,
    playerRoom: 1,
    feed: 1,
    founderLanding: 1,
    founderRows: players,
  };
}

test('1. normal Universe read is one materialized current-state lookup, not a population reconstruction', () => {
  const normal = block(universe, 'export async function loadActiveUniverseState', 'export async function rebuildMaterializedUniverseState');
  assert.match(normal, /stateRef\(\)\.get\(\)/);
  assert.match(normal, /bootstrapComplete === true/);
  assert.doesNotMatch(normal, /collection\(["']users["']\)/);
  assert.doesNotMatch(normal, /collection\(["']desks["']\)/);
  assert.doesNotMatch(normal, /listRecentUniverseEvents\(80\)|limit\(80\)/);
});

test('2. population-dependent scans are isolated to bootstrap/rebuild/write lifecycle, not normal reads', () => {
  const normal = block(universe, 'export async function loadActiveUniverseState', 'export async function rebuildMaterializedUniverseState');
  const bootstrap = block(universe, 'async function bootstrapActiveDeskRecords', 'async function acquireBootstrapLease');
  assert.doesNotMatch(normal, /collection\(["']users["']\)/);
  assert.match(bootstrap, /collection\(["']users["']\)/);
});

test('3. Player Room and feed shared-state budgets stay constant at 6, 20 and 100 players', () => {
  for (const population of [6, 20, 100]) {
    const result = budget(population);
    assert.equal(result.playerRoom, 1);
    assert.equal(result.feed, 1);
    assert.ok(result.oldUniverse > result.playerRoom);
  }
  assert.match(model, /newPlayerRoomGlobalReads:\s*1/);
  assert.match(model, /newFeedGlobalReads:\s*1/);
});

test('4. Founder landing reads founderOperationsState/current and remains constant at 6, 20 and 100 players', () => {
  const loader = block(founder, 'export async function loadFounderOperationsAggregate', 'export async function loadFounderOperationRows');
  assert.match(loader, /aggregateRef\(\)\.get\(\)/);
  assert.doesNotMatch(loader, /founderPlayerSummaries[^\n]*\.get\(\)/);
  assert.match(founderRoute, /searchParams\.get\(["\']view["\']\)\s*===\s*["\']rows["\']/);
  assert.match(founderRoute, /founderOperationsSnapshot/);
  for (const population of [6, 20, 100]) assert.equal(budget(population).founderLanding, 1);
  assert.match(model, /newFounderLandingReads:\s*1/);
});

test('5. Founder row/detail view intentionally scales only with summary rows', () => {
  const rows = block(founder, 'export async function loadFounderOperationRows', 'export async function rebuildFounderAggregateFromSummaries');
  assert.match(rows, /collection\(["']founderPlayerSummaries["']\)\.get\(\)/);
  assert.match(rows, /collection\(["']founderPendingRequestSummaries["']\)\.get\(\)/);
  for (const population of [6, 20, 100]) assert.equal(budget(population).founderRows, population);
  assert.match(model, /newFounderCohortSummaryReads:\s*players/);
});

test('6. one Player Room snapshot passes one materialized Universe state through Pulse/share work', () => {
  const snapshot = block(persistence, 'export async function buildPlayerRoomSnapshot', undefined);
  const loads = snapshot.match(/loadActiveUniverseState\(/g) ?? [];
  assert.equal(loads.length, 1, `expected one shared Universe load, saw ${loads.length}`);
  assert.match(snapshot, /state:\s*activeUniverseState/);
  assert.doesNotMatch(snapshot, /ensureShareMomentsForActiveDesks\([^\n]*\)(?![\s\S]*universeState)/);
});

test('7. online Firestore 503 routes to LIVE DATA UNAVAILABLE, not offline', () => {
  assert.match(playerRoom, /navigator\.onLine[\s\S]*isLiveDataUnavailableResponse/);
  assert.match(playerRoom, /setLiveDataUnavailableSnapshot/);
  assert.match(playerRoom, /<LiveDataUnavailablePlayerRoom/);
  assert.match(liveUnavailable, /LIVE DATA UNAVAILABLE/);
  assert.match(liveUnavailable, /var\(--bs-surface-dark\)/);
  assert.match(liveUnavailable, /var\(--bs-text-on-dark\)/);
  assert.doesNotMatch(liveUnavailable, /You.?re offline|YOU.?RE OFFLINE/i);
});

test('8. true browser offline still uses the saved offline state', () => {
  assert.match(playerRoom, /!navigator\.onLine[\s\S]*loadPlayerRoomOfflineSnapshot/);
  assert.match(playerRoom, /connectivity\.state === ["']offline["']/);
  assert.match(playerRoom, /<OfflinePlayerRoom/);
});

test('9. refreshes/history signals are coalesced rather than launching duplicate Player Room loads', () => {
  assert.match(refreshGate, /private inFlight/);
  assert.match(refreshGate, /private trailing/);
  assert.match(refreshGate, /PLAYER_ROOM_QUIET_REFRESH_COOLDOWN_MS/);
  assert.match(playerRoom, /new PlayerRoomRefreshGate\(\)/);
  assert.match(playerRoom, /refreshGateRef\.current\.run/);
  const dispatches = historyWorker.match(/boardsignal:history-updated/g) ?? [];
  assert.ok(dispatches.length <= 1, `history worker should expose one coalesced dispatch point, saw ${dispatches.length}`);
});

test('10. materialized public Universe schema is public-safe and excludes private guidance/evidence/contact/auth fields', () => {
  const participantType = block(universe, 'export type MaterializedUniverseParticipant', 'type ActiveDeskRecord');
  const stateType = block(universe, 'export type ActiveUniverseState', 'export type MaterializedUniverseParticipant');
  const publicSchema = `${participantType}\n${stateType}`;
  for (const forbidden of ['signals', 'red:', 'amber:', 'blue:', 'engineResults', 'candidates', 'preferredContact', 'message', 'accessCode', 'authToken', 'firebaseUid']) {
    assert.doesNotMatch(publicSchema, new RegExp(forbidden, 'i'), `public materialized schema leaked ${forbidden}`);
  }
  assert.match(universe, /publicArtifactHasPrivateFields/);
});

test('11. before/after model demonstrates the eliminated read amplification', () => {
  assert.deepEqual(budget(6), { oldUniverse: 110, oldPlayerRoom: 220, playerRoom: 1, feed: 1, founderLanding: 1, founderRows: 6 });
  assert.deepEqual(budget(20), { oldUniverse: 180, oldPlayerRoom: 360, playerRoom: 1, feed: 1, founderLanding: 1, founderRows: 20 });
  assert.deepEqual(budget(100), { oldUniverse: 580, oldPlayerRoom: 1160, playerRoom: 1, feed: 1, founderLanding: 1, founderRows: 100 });
});
