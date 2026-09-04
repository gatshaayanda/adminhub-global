const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const scale = require('../.test-dist-universe-pulse/src/lib/boardsignal/universeScale.js');

function member(playerId, value, secondary = 0, boardKey = 'rating-climb:rapid') {
  return {
    boardKey,
    categoryId: boardKey.split(':')[0],
    categoryTitle: 'Board',
    boardDescription: 'Description',
    minimumLabel: 'Minimum',
    playerId: String(playerId),
    participantId: `live:${playerId}`,
    player: `Player${playerId}`,
    value,
    secondary,
    valueLabel: String(value),
    evidence: 'safe public evidence',
    sortKey: scale.buildUniverseV2SortKey(value, secondary, String(playerId)),
  };
}

function makeTrieNodes(members, target) {
  const path = scale.rankTreePath(target.sortKey);
  const nodes = path.map(() => ({}));
  for (const item of members) {
    const itemPath = scale.rankTreePath(item.sortKey);
    for (let depth = 0; depth < path.length; depth += 1) {
      if (itemPath[depth].nodeId !== path[depth].nodeId) continue;
      const branch = itemPath[depth].branch;
      nodes[depth][branch] = (nodes[depth][branch] || 0) + 1;
    }
  }
  return nodes;
}

for (const population of [199, 200, 201, 500, 1000, 2000]) {
  test(`${population} players remain inside the v2 bounded model`, () => {
    const model = scale.universeV2ComplexityModel(population);
    assert.equal(model.population, population);
    assert.equal(model.rankTreeDepth, 43);
    assert.equal(model.participantUpdate.populationReads, 0);
  });
}

test('10,000-player model retains exact 43-level rank depth', () => {
  const model = scale.universeV2ComplexityModel(10000);
  assert.equal(model.population, 10000);
  assert.equal(model.rankTreeDepth, 43);
  assert.equal(model.playerStandingRead.rankTreeDepth, 43);
});

test('ordinary v2 upsert is population-independent', () => {
  const server = read('src/lib/boardsignal/server/universePulse.ts');
  assert.match(server, /async function upsertUniverseV2Index/);
  assert.match(server, /rankTreePath/);
  assert.doesNotMatch(server.slice(server.indexOf('async function upsertUniverseV2Index'), server.indexOf('async function removeUniverseV2Index')), /rebuildMaterializedUniverseState/);
  for (const population of [200, 1000, 2000, 10000]) {
    const model = scale.universeV2ComplexityModel(population);
    assert.equal(model.participantUpdate.bounded, true);
    assert.equal(model.participantUpdate.populationReads, 0);
    assert.equal(model.participantUpdate.rankTreeDepth, 43);
  }
});

test('ordinary v2 delete is population-independent', () => {
  const server = read('src/lib/boardsignal/server/universePulse.ts');
  assert.match(server, /async function removeUniverseV2Index/);
  assert.doesNotMatch(server.slice(server.indexOf('async function removeUniverseV2Index'), server.indexOf('async function loadUniverseV2ActiveState')), /rebuildMaterializedUniverseState/);
  for (const population of [200, 1000, 2000, 10000]) {
    const model = scale.universeV2ComplexityModel(population);
    assert.equal(model.participantDelete.bounded, true);
    assert.equal(model.participantDelete.populationReads, 0);
  }
});

test('Player Room standing lookup stays bounded', () => {
  const server = read('src/lib/boardsignal/server/universePulse.ts');
  assert.match(server, /loadUniverseV2PlayerContext/);
  assert.match(server, /limit\(1\)/);
  assert.match(server, /v2Meta\?\.phase === "v2-active"/);
  const model = scale.universeV2ComplexityModel(10000);
  assert.deepEqual(model.playerStandingRead, { populationReads: 0, rankTreeDepth: 43, bounded: true });
});

test('public Universe read stays bounded', () => {
  const server = read('src/lib/boardsignal/server/universePulse.ts');
  const start = server.indexOf('export async function loadActiveUniverseState');
  const end = server.indexOf('export async function rebuildMaterializedUniverseState', start);
  const normal = server.slice(start, end);
  assert.match(normal, /v2Meta\?\.phase === "v2-active"/);
  assert.match(normal, /loadUniverseV2ActiveState/);
  assert.doesNotMatch(normal, /collection\("users"\)/);
  assert.deepEqual(scale.universeV2ComplexityModel(10000).publicUniverseRead, { populationReads: 0, bounded: true });
});

test('Founder health read stays bounded', () => {
  const server = read('src/lib/boardsignal/server/universePulse.ts');
  const route = read('src/app/api/admin/boardsignal/universe-health/route.ts');
  const component = read('src/components/FounderUniverseHealth.tsx');
  const admin = read('src/app/admin/page.tsx');
  const start = server.indexOf('export async function loadUniverseV2Health');
  const end = server.indexOf('export async function loadUniverseV2ActivationProof', start);
  const health = server.slice(start, end);
  assert.match(health, /Promise\.all\(\[universeV2MetaRef\(\)\.get\(\), stateRef\(\)\.get\(\)\]\)/);
  assert.doesNotMatch(health, /collection\("users"\)|collection\("desks"\)|chess\.com|lichess/i);
  assert.match(route, /migrateUniverseV2Page/);
  assert.match(route, /cutoverUniverseV2Production/);
  assert.match(component, /Founder-only compact health/);
  assert.match(admin, /<FounderUniverseHealth \/>/);
  assert.deepEqual(scale.universeV2ComplexityModel(10000).founderHealthRead, { populationReads: 0, bounded: true });
});

test('rank-count traversal produces the exact rank without scanning members', () => {
  const members = [member('a', 30), member('b', 20), member('c', 10), member('d', 5)];
  const target = members[2];
  assert.equal(scale.rankFromCountTree(target.sortKey, makeTrieNodes(members, target)), 3);
});

test('ties are deterministic by secondary metric', () => {
  const ranked = scale.rankedUniverseV2Members([member('a', 10, 1), member('b', 10, 2)]);
  assert.equal(ranked[0].playerId, 'b');
  assert.equal(ranked[1].playerId, 'a');
});

test('same-score ordering is deterministic regardless of insertion order', () => {
  const a = member('100', 10, 2);
  const b = member('200', 10, 2);
  const forward = scale.rankedUniverseV2Members([a, b]).map((item) => item.playerId);
  const reverse = scale.rankedUniverseV2Members([b, a]).map((item) => item.playerId);
  assert.deepEqual(reverse, forward);
});

test('top-N entry and exit are deterministic', () => {
  const field = [member('1', 30), member('2', 20), member('3', 10)];
  assert.deepEqual(scale.topUniverseV2Members(field, 2).map((item) => item.playerId), ['1', '2']);
  const entered = [field[0], member('2', 5), field[2]];
  assert.deepEqual(scale.topUniverseV2Members(entered, 2).map((item) => item.playerId), ['1', '3']);
});

test('board/category movement is represented as remove-old plus add-new membership', () => {
  const oldMember = member('7', 12, 0, 'winning-run:all');
  const newMember = member('7', 40, 0, 'rating-climb:rapid');
  const before = new Map([[oldMember.boardKey, oldMember]]);
  before.delete(oldMember.boardKey);
  before.set(newMember.boardKey, newMember);
  assert.equal(before.has('winning-run:all'), false);
  assert.equal(before.get('rating-climb:rapid').playerId, '7');
});

test('privacy opt-out decrements authoritative count exactly once', () => {
  assert.equal(scale.countTransition(201, true, false), 200);
  assert.equal(scale.countTransition(200, false, false), 200);
});

test('deletion removes one canonical participant without underflow', () => {
  assert.equal(scale.countTransition(1, true, false), 0);
  assert.equal(scale.countTransition(0, true, false), 0);
});

test('re-entry restores authoritative count exactly once', () => {
  assert.equal(scale.countTransition(200, false, true), 201);
  assert.equal(scale.countTransition(201, true, true), 201);
});

test('duplicate publication does not double-count', () => {
  assert.equal(scale.countTransition(201, true, true), 201);
});

test('same-period retry preserves the previous official Review anchor', () => {
  const existing = scale.updateOfficialStandingProjection({
    playerId: '1', periodEnd: '2026-08-01', reviewLifecycle: 'organic_live', nowIso: '2026-08-01T00:00:00Z',
    standings: [{ boardKey: 'b', categoryId: 'c', categoryTitle: 'C', rank: 17, denominator: 103, value: 1, valueLabel: '1', player: 'P' }],
  });
  const next = scale.updateOfficialStandingProjection({
    existing, playerId: '1', periodEnd: '2026-08-08', reviewLifecycle: 'organic_live', nowIso: '2026-08-08T00:00:00Z',
    standings: [{ boardKey: 'b', categoryId: 'c', categoryTitle: 'C', rank: 11, denominator: 118, value: 2, valueLabel: '2', player: 'P' }],
  });
  const retry = scale.updateOfficialStandingProjection({
    existing: next, playerId: '1', periodEnd: '2026-08-08', reviewLifecycle: 'organic_live', nowIso: '2026-08-08T00:00:01Z',
    standings: [{ boardKey: 'b', categoryId: 'c', categoryTitle: 'C', rank: 10, denominator: 119, value: 2, valueLabel: '2', player: 'P' }],
  });
  assert.equal(retry.standings[0].previousOfficialRank, 17);
  assert.equal(retry.standings[0].movement, 7);
});

test('concurrent presence transitions are safe when each canonical presence change is transactional', () => {
  let count = 100;
  count = scale.countTransition(count, false, true);
  count = scale.countTransition(count, false, true);
  assert.equal(count, 102);
  assert.equal(scale.countTransition(count, true, true), 102);
});

test('denominator changes do not redefine movement semantics', () => {
  const previous = { rank: 17, denominator: 103 };
  const current = { rank: 11, denominator: 118 };
  assert.equal(scale.officialMovement(previous.rank, current.rank), 6);
  assert.notEqual(previous.denominator, current.denominator);
});

test('17 / 103 to 11 / 118 is movement +6', () => {
  assert.equal(scale.officialMovement(17, 11), 6);
});

test('stale or same-period historical writes cannot replace newer organic official state', () => {
  assert.equal(scale.shouldAcceptOfficialPublication({
    existingPeriodEnd: '2026-08-08', existingReviewLifecycle: 'organic_live',
    incomingPeriodEnd: '2026-08-01', incomingReviewLifecycle: 'historical_backfill',
  }), false);
  assert.equal(scale.shouldAcceptOfficialPublication({
    existingPeriodEnd: '2026-08-08', existingReviewLifecycle: 'organic_live',
    incomingPeriodEnd: '2026-08-08', incomingReviewLifecycle: 'historical_backfill',
  }), false);
});

test('historical backfill cannot create a fresh Universe event or fake movement', () => {
  assert.equal(scale.reviewLifecycleMayCreateFreshUniverseEvent('historical_backfill'), false);
  assert.equal(scale.reviewLifecycleMayCreateFreshUniverseEvent('organic_live'), true);
  const prior = scale.updateOfficialStandingProjection({
    playerId: '1', periodEnd: '2026-08-01', reviewLifecycle: 'organic_live', nowIso: '2026-08-01T00:00:00Z',
    standings: [{ boardKey: 'b', categoryId: 'c', categoryTitle: 'C', rank: 17, denominator: 103, value: 1, valueLabel: '1', player: 'P' }],
  });
  const historical = scale.updateOfficialStandingProjection({
    existing: prior, playerId: '1', periodEnd: '2026-08-08', reviewLifecycle: 'historical_backfill', nowIso: '2026-08-08T00:00:00Z',
    standings: [{ boardKey: 'b', categoryId: 'c', categoryTitle: 'C', rank: 11, denominator: 118, value: 2, valueLabel: '2', player: 'P' }],
  });
  assert.equal(historical.standings[0].movement, undefined);
  assert.equal(historical.standings[0].previousOfficialRank, undefined);
});

test('v2 public index model rejects private-field leakage', () => {
  const server = read('src/lib/boardsignal/server/universePulse.ts');
  assert.match(server, /containsPrivateUniverseV2Field\(document\)/);
  assert.match(server, /publicArtifactHasPrivateFields\(document\)/);
  assert.equal(scale.containsPrivateUniverseV2Field({ player: 'safe', evidence: 'public' }), false);
  assert.equal(scale.containsPrivateUniverseV2Field({ player: 'safe', nested: { uid: 'secret' } }), true);
  assert.equal(scale.containsPrivateUniverseV2Field({ journal: ['secret'] }), true);
});

test('migration is paged, resumable and cursor-based', () => {
  const server = read('src/lib/boardsignal/server/universePulse.ts');
  assert.match(server, /publicUniverseParticipants"\)\.orderBy\("playerId", "asc"\)\.limit\(UNIVERSE_V2_MIGRATION_PAGE_SIZE\)/);
  assert.match(server, /startAfter\(meta\.migrationCursor\)/);
  assert.doesNotMatch(server.slice(server.indexOf('export async function migrateUniverseV2Page'), server.indexOf('export async function repairUniverseV2Player')), /collection\("users"\)|collection\("desks"\)/);
  let meta = scale.beginUniverseV2Migration(scale.initialUniverseV2Meta('2026-09-04T00:00:00Z'), '2026-09-04T00:01:00Z');
  meta = scale.recordUniverseV2MigrationPage(meta, { indexedPlayerCount: 100, migrationCursor: 'player-100', sourceExhausted: false, nowIso: '2026-09-04T00:02:00Z' });
  assert.equal(meta.phase, 'migrating');
  assert.equal(meta.migrationCursor, 'player-100');
  assert.equal(meta.sourceExhausted, false);
  assert.equal(scale.universeV2ComplexityModel(10000).migrationPage.populationReads, 100);
});

test('partial migration keeps v1 read authority', () => {
  const server = read('src/lib/boardsignal/server/universePulse.ts');
  assert.match(server, /if \(v2Meta\?\.phase === "v2-active"\)/);
  let meta = scale.beginUniverseV2Migration(scale.initialUniverseV2Meta('2026-09-04T00:00:00Z'), '2026-09-04T00:01:00Z');
  meta = scale.recordUniverseV2MigrationPage(meta, { indexedPlayerCount: 100, migrationCursor: '100', sourceExhausted: false, nowIso: '2026-09-04T00:02:00Z' });
  assert.equal(meta.readAuthority, 'v1');
  assert.equal(scale.readAuthorityForPhase(meta.phase), 'v1');
});

test('v2-ready still uses v1 authority after certification', () => {
  const server = read('src/lib/boardsignal/server/universePulse.ts');
  assert.match(server, /certifyUniverseV2Production/);
  let meta = scale.beginUniverseV2Migration(scale.initialUniverseV2Meta('2026-09-04T00:00:00Z'), '2026-09-04T00:01:00Z');
  meta = scale.recordUniverseV2MigrationPage(meta, { indexedPlayerCount: 105, sourceExhausted: true, nowIso: '2026-09-04T00:02:00Z' });
  meta = scale.certifyUniverseV2(meta, 105, '2026-09-04T00:03:00Z');
  assert.equal(meta.phase, 'v2-ready');
  assert.equal(meta.readAuthority, 'v1');
});

test('explicit cutover alone makes v2 authoritative', () => {
  const route = read('src/app/api/admin/boardsignal/universe-health/route.ts');
  assert.match(route, /case "cutover"/);
  assert.match(route, /case "rollback"/);
  let meta = scale.beginUniverseV2Migration(scale.initialUniverseV2Meta('2026-09-04T00:00:00Z'), '2026-09-04T00:01:00Z');
  meta = scale.recordUniverseV2MigrationPage(meta, { indexedPlayerCount: 105, sourceExhausted: true, nowIso: '2026-09-04T00:02:00Z' });
  meta = scale.certifyUniverseV2(meta, 105, '2026-09-04T00:03:00Z');
  assert.equal(meta.readAuthority, 'v1');
  meta = scale.cutoverUniverseV2(meta, '2026-09-04T00:04:00Z');
  assert.equal(meta.phase, 'v2-active');
  assert.equal(meta.readAuthority, 'v2');
  assert.throws(() => scale.rollbackUniverseV2(meta, '2026-09-04T00:05:00Z'), /incident carriage/);
});
