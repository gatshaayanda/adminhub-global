const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'boardsignal-g4-'));

function compile(rel) {
  const src = path.join(ROOT, rel);
  const out = path.join(OUT, rel.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const result = ts.transpileModule(fs.readFileSync(src, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: src,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${rel} should transpile without syntax diagnostics`);
  fs.writeFileSync(out, result.outputText);
}

for (const rel of [
  'src/lib/boardsignal/universe.ts',
  'src/lib/boardsignal/pulse.ts',
  'src/lib/boardsignal/reviewHistory.ts',
  'src/lib/boardsignal/historyBackfill.ts',
]) compile(rel);

const universe = require(path.join(OUT, 'src/lib/boardsignal/universe.js'));
const pulse = require(path.join(OUT, 'src/lib/boardsignal/pulse.js'));
const history = require(path.join(OUT, 'src/lib/boardsignal/reviewHistory.js'));
const backfill = require(path.join(OUT, 'src/lib/boardsignal/historyBackfill.js'));

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const board = (boards, key) => boards.find((item) => item.key === key);

function participant({
  id = 'live:1', stablePlayerId = '1', player = 'Player1', source = 'live', verified = true,
  periodEnd = '2026-08-09', games = 8, score = 62.5, winningRun = 3,
  rapid = { games: 5, start: 1000, end: 1030, low: 990, peak: 1030, change: 30 },
  blitz, bullet, strongFinish = { games: 3, wins: 2, draws: 1, losses: 0 }, bestUpset,
  coverage,
} = {}) {
  const pools = [];
  if (rapid) pools.push({ pool: 'rapid', ...rapid });
  if (blitz) pools.push({ pool: 'blitz', ...blitz });
  if (bullet) pools.push({ pool: 'bullet', ...bullet });
  return { id, stablePlayerId, aliases: [], player, source, verified, periodLabel: periodEnd, periodEnd, games, score, winningRun, pools, strongFinish, bestUpset, coverage };
}

function standing(key, rank, denominator = 10, categoryTitle = 'Biggest Rating Climb', scopeLabel = 'Rapid') {
  return { key, categoryId: 'rating-climb', categoryTitle, scopeLabel, rank, denominator, value: 30, valueLabel: '+30' };
}

function event(overrides = {}) {
  return {
    eventId: overrides.eventId ?? 'e1', eventType: overrides.eventType ?? 'rank_move', playerId: overrides.playerId ?? '1',
    canonicalUsername: overrides.canonicalUsername ?? 'Player1', occurredAt: overrides.occurredAt ?? '2026-08-21T12:00:00.000Z',
    publishedAt: overrides.publishedAt ?? '2026-08-21T12:00:00.000Z', headline: overrides.headline ?? 'Moved', supportingFact: overrides.supportingFact ?? 'Fact',
    dataMode: 'live', finality: overrides.finality ?? 'official', safePublic: true,
    hidden: overrides.hidden, currentValue: overrides.currentValue ?? 20, previousValue: overrides.previousValue ?? 10,
    rankAfter: overrides.rankAfter ?? 2, rankBefore: overrides.rankBefore ?? 4,
  };
}

// Identity + latest official state.
test('01 latest completed Review wins for one stable player by periodEnd', () => {
  const rows = pulse.latestUniverseParticipants([
    participant({ id: 'a', stablePlayerId: '42', periodEnd: '2026-08-02' }),
    participant({ id: 'b', stablePlayerId: '42', periodEnd: '2026-08-09' }),
  ]);
  assert.deepEqual(rows.map((x) => x.id), ['b']);
});

test('02 official selection ignores input ordering', () => {
  const rows = pulse.latestUniverseParticipants([
    participant({ id: 'new', stablePlayerId: '42', periodEnd: '2026-08-09' }),
    participant({ id: 'old', stablePlayerId: '42', periodEnd: '2026-08-02' }),
  ]);
  assert.equal(rows[0].id, 'new');
});

test('03 imported/published timestamps are irrelevant to latest participant selection', () => {
  const old = { ...participant({ id: 'old', stablePlayerId: '42', periodEnd: '2026-08-02' }), importedAt: '2099-01-01', publishedAt: '2099-01-01' };
  const current = { ...participant({ id: 'current', stablePlayerId: '42', periodEnd: '2026-08-09' }), importedAt: '2000-01-01', publishedAt: '2000-01-01' };
  assert.equal(pulse.latestUniverseParticipants([old, current])[0].id, 'current');
});

test('04 same-period tie is deterministic by participant id', () => {
  const rows = pulse.latestUniverseParticipants([
    participant({ id: 'z', stablePlayerId: '42' }), participant({ id: 'a', stablePlayerId: '42' }),
  ]);
  assert.equal(rows[0].id, 'a');
});

test('05 alias fallback collapses same username when stable ID is absent', () => {
  const a = participant({ id: 'a', stablePlayerId: undefined, player: 'AliasName', periodEnd: '2026-08-02' });
  const b = participant({ id: 'b', stablePlayerId: undefined, player: 'aliasname', periodEnd: '2026-08-09' });
  assert.equal(pulse.latestUniverseParticipants([a, b]).length, 1);
});

test('06 distinct stable IDs sharing a display username are preserved', () => {
  const rows = pulse.latestUniverseParticipants([
    participant({ id: 'a', stablePlayerId: '1', player: 'Same' }), participant({ id: 'b', stablePlayerId: '2', player: 'Same' }),
  ]);
  assert.equal(rows.length, 2);
});

test('07 ranked Universe entries preserve stablePlayerId', () => {
  const b = board(universe.buildUniverseBoards([participant({ stablePlayerId: '991' })]), 'rating-climb:rapid');
  assert.equal(b.entries[0].stablePlayerId, '991');
});

test('08 unverified participants never enter ranking boards', () => {
  assert.equal(universe.buildUniverseBoards([participant({ verified: false })]).length, 0);
});

// Existing formulas + pool boundaries.
test('09 rating climb requires at least five games', () => {
  const b = board(universe.buildUniverseBoards([participant({ rapid: { games: 4, start: 1000, end: 1040, low: 990, change: 40 } })]), 'rating-climb:rapid');
  assert.equal(b, undefined);
});

test('10 rating climb requires positive movement', () => {
  assert.equal(board(universe.buildUniverseBoards([participant({ rapid: { games: 5, start: 1000, end: 1000, low: 990, change: 0 } })]), 'rating-climb:rapid'), undefined);
});

test('11 rating climb ranks larger movement first', () => {
  const b = board(universe.buildUniverseBoards([
    participant({ id: 'a', stablePlayerId: '1', player: 'A', rapid: { games: 5, start: 1000, end: 1020, low: 990, change: 20 } }),
    participant({ id: 'b', stablePlayerId: '2', player: 'B', rapid: { games: 5, start: 1000, end: 1040, low: 990, change: 40 } }),
  ]), 'rating-climb:rapid');
  assert.deepEqual(b.entries.map((x) => x.player), ['B', 'A']);
});

test('12 score remains the existing secondary tie-break for equal rating climb', () => {
  const b = board(universe.buildUniverseBoards([
    participant({ id: 'a', stablePlayerId: '1', player: 'A', score: 55 }), participant({ id: 'b', stablePlayerId: '2', player: 'B', score: 70 }),
  ]), 'rating-climb:rapid');
  assert.deepEqual(b.entries.map((x) => x.player), ['B', 'A']);
});

test('13 username remains deterministic final tie-break', () => {
  const b = board(universe.buildUniverseBoards([
    participant({ id: 'z', stablePlayerId: '1', player: 'Zed', score: 60 }), participant({ id: 'a', stablePlayerId: '2', player: 'Alpha', score: 60 }),
  ]), 'rating-climb:rapid');
  assert.deepEqual(b.entries.map((x) => x.player), ['Alpha', 'Zed']);
});

test('14 Rapid and Blitz rating climbs stay separate', () => {
  const boards = universe.buildUniverseBoards([participant({ blitz: { games: 5, start: 800, end: 830, low: 790, change: 30 } })]);
  assert.ok(board(boards, 'rating-climb:rapid'));
  assert.ok(board(boards, 'rating-climb:blitz'));
});

test('15 Bullet receives its own rating-climb board', () => {
  const boards = universe.buildUniverseBoards([participant({ bullet: { games: 5, start: 700, end: 730, low: 690, change: 30 } })]);
  assert.ok(board(boards, 'rating-climb:bullet'));
});

test('16 winning run requires at least two consecutive wins and three games', () => {
  assert.equal(board(universe.buildUniverseBoards([participant({ winningRun: 1 })]), 'winning-run:all'), undefined);
  assert.ok(board(universe.buildUniverseBoards([participant({ winningRun: 2, games: 3 })]), 'winning-run:all'));
});

test('17 rating recovery uses finish above recorded low', () => {
  const b = board(universe.buildUniverseBoards([participant({ rapid: { games: 5, start: 1000, end: 1020, low: 970, change: 20 } })]), 'rating-recovery:rapid');
  assert.equal(b.entries[0].value, 50);
});

test('18 strong finish requires at least three games', () => {
  assert.equal(board(universe.buildUniverseBoards([participant({ strongFinish: { games: 2, wins: 2, draws: 0, losses: 0 } })]), 'strong-finish:all'), undefined);
});

test('19 strong finish requires score above 50 percent', () => {
  assert.equal(board(universe.buildUniverseBoards([participant({ strongFinish: { games: 4, wins: 2, draws: 0, losses: 2 } })]), 'strong-finish:all'), undefined);
});

test('20 Rapid rating leader requires three Rapid games and exact end boundary', () => {
  const fail = board(universe.buildUniverseBoards([participant({ rapid: { games: 2, start: 1000, end: 1030, low: 990, change: 30 } })]), 'rapid-rating-leader:rapid');
  const pass = board(universe.buildUniverseBoards([participant({ rapid: { games: 3, start: 1000, end: 1030, low: 990, change: 30 } })]), 'rapid-rating-leader:rapid');
  assert.equal(fail, undefined); assert.ok(pass);
});

test('21 best upset remains pool-specific', () => {
  const b = board(universe.buildUniverseBoards([participant({ bestUpset: { pool: 'rapid', ratingGap: 180, opponentLabel: 'Opp' } })]), 'best-upset:rapid');
  assert.equal(b.entries[0].value, 180);
  assert.equal(board(universe.buildUniverseBoards([participant({ bestUpset: { pool: 'rapid', ratingGap: 180 } })]), 'best-upset:blitz'), undefined);
});

test('22 breakthrough keeps five-game 50-percent and +25 rule', () => {
  assert.ok(board(universe.buildUniverseBoards([participant({ score: 50, rapid: { games: 5, start: 1000, end: 1025, low: 990, change: 25 } })]), 'breakthrough-desk:rapid'));
  assert.equal(board(universe.buildUniverseBoards([participant({ score: 49.9, rapid: { games: 5, start: 1000, end: 1025, low: 990, change: 25 } })]), 'breakthrough-desk:rapid'), undefined);
});

test('23 moment selection prefers qualifying winning run over smaller positive facts', () => {
  const fact = universe.deriveMomentFact(participant({ winningRun: 4 }));
  assert.equal(fact.valueLabel, '4 straight');
});

test('24 category definitions remain the approved eight categories', () => {
  assert.equal(universe.UNIVERSE_CATEGORY_DEFINITIONS.length, 8);
});

// Seed/live transition.
test('25 LIVE_FIELD_THRESHOLD remains exactly six', () => assert.equal(pulse.LIVE_FIELD_THRESHOLD, 6));

test('26 below threshold active board retains seed context', () => {
  const live = [participant({ id: 'live:1', stablePlayerId: '1', player: 'Live1' })];
  const seed = [participant({ id: 'seed:a', stablePlayerId: 'seed-a', player: 'SeedA', source: 'seed' })];
  const b = board(pulse.buildActiveUniverseBoards(live, seed, live), 'rating-climb:rapid');
  assert.equal(b.fieldLabel, 'FOUNDING BETA FIELD');
  assert.equal(b.entries.length, 2);
});

test('27 six comparable live players transition board to BOARDSIGNAL FIELD', () => {
  const live = Array.from({ length: 6 }, (_, i) => participant({ id: `live:${i}`, stablePlayerId: String(i), player: `P${i}`, rapid: { games: 5, start: 1000, end: 1030 + i, low: 990, change: 30 + i } }));
  const b = board(pulse.buildActiveUniverseBoards(live, [participant({ id: 'seed', stablePlayerId: 's', player: 'Seed', source: 'seed' })], live), 'rating-climb:rapid');
  assert.equal(b.fieldLabel, 'BOARDSIGNAL FIELD');
  assert.equal(b.entries.length, 6);
});

test('28 transitioned board excludes seed entries', () => {
  const live = Array.from({ length: 6 }, (_, i) => participant({ id: `live:${i}`, stablePlayerId: String(i), player: `P${i}`, rapid: { games: 5, start: 1000, end: 1030 + i, low: 990, change: 30 + i } }));
  const b = board(pulse.buildActiveUniverseBoards(live, [participant({ id: 'seed', stablePlayerId: 's', player: 'Seed', source: 'seed' })], live), 'rating-climb:rapid');
  assert.ok(!b.entries.some((x) => x.player === 'Seed'));
});

test('29 seed/live duplicate with same stable ID is removed before transition', () => {
  const live = [participant({ id: 'live:1', stablePlayerId: '42', player: 'NewName' })];
  const seed = [participant({ id: 'seed:1', stablePlayerId: '42', player: 'OldName', source: 'seed' })];
  const b = board(pulse.buildActiveUniverseBoards(live, seed, live), 'rating-climb:rapid');
  assert.equal(b.entries.length, 1);
  assert.equal(b.entries[0].player, 'NewName');
});

test('30 stable-ID seed is not collapsed merely because another stable player shares its username', () => {
  const live = [participant({ id: 'live:1', stablePlayerId: '1', player: 'Shared' })];
  const seed = [participant({ id: 'seed:2', stablePlayerId: '2', player: 'Shared', source: 'seed' })];
  const b = board(pulse.buildActiveUniverseBoards(live, seed, live), 'rating-climb:rapid');
  assert.equal(b.entries.length, 2);
});

test('31 alias-only seed duplicate is still removed against stable live aliases', () => {
  const live = [{ ...participant({ id: 'live:1', stablePlayerId: '1', player: 'Current' }), aliases: ['OldAlias'] }];
  const seed = participant({ id: 'seed', stablePlayerId: undefined, player: 'oldalias', source: 'seed' });
  const b = board(pulse.buildActiveUniverseBoards(live, [seed], live), 'rating-climb:rapid');
  assert.equal(b.entries.length, 1);
});

// Review movement vs field movement.
test('32 Review movement reports entering a board', () => assert.match(pulse.deriveReviewMovement([], [standing('a', 6)])[0].body, /Entered #6/));
test('33 Review movement reports moving up', () => assert.match(pulse.deriveReviewMovement([standing('a', 8)], [standing('a', 4)])[0].body, /UP 4/));
test('34 Review movement reports new leader', () => assert.match(pulse.deriveReviewMovement([standing('a', 2)], [standing('a', 1)])[0].body, /NEW LEADER/));
test('35 Review movement reports held rank', () => assert.match(pulse.deriveReviewMovement([standing('a', 3)], [standing('a', 3)])[0].body, /Held #3/));
test('36 Review movement reports downward movement truthfully', () => assert.match(pulse.deriveReviewMovement([standing('a', 2)], [standing('a', 5)])[0].body, /DOWN 3/));

test('37 field movement ignores held rank', () => assert.equal(pulse.deriveBoardMovement([standing('a', 4)], [standing('a', 4)]).length, 0));
test('38 field movement does not invent movement without previous snapshot', () => assert.equal(pulse.deriveBoardMovement([], [standing('a', 4)]).length, 0));
test('39 field movement language attributes change to newer completed Review around viewer', () => assert.match(pulse.deriveBoardMovement([standing('a', 4)], [standing('a', 5)])[0].body, /changed the official field around you/));
test('40 Review movement and field movement have distinct card kinds', () => {
  assert.equal(pulse.deriveReviewMovement([standing('a', 8)], [standing('a', 4)])[0].kind, 'review-moved');
  assert.equal(pulse.deriveBoardMovement([standing('a', 8)], [standing('a', 4)])[0].kind, 'board-moved');
});

// Provisional isolation + freshness/public safety.
test('41 current episode converts to stable private provisional participant', () => {
  const current = { periodStart: '2026-08-10', periodEnd: '2026-08-16', periodLabel: '10–16 Aug', checkedAt: '2026-08-12T00:00:00Z', games: 5, wins: 3, draws: 0, losses: 2, sessions: 2, daysComplete: 3, currentWinRun: 2, currentLossRun: 0, pools: [{ pool: 'Rapid', games: 5, wins: 3, draws: 0, losses: 2, ratingStart: 1000, ratingEnd: 1020, ratingDelta: 20 }] };
  const p = pulse.currentEpisodeToProvisionalParticipant('Me', '99', current);
  assert.equal(p.id, 'provisional:99'); assert.equal(p.stablePlayerId, '99'); assert.equal(p.periodEnd, '2026-08-16');
});

test('42 provisional cards are visibly labelled PROVISIONAL in body and finality', () => {
  const provisional = participant({ id: 'provisional:99', stablePlayerId: '99', player: 'Me', rapid: { games: 5, start: 1000, end: 1050, low: 990, change: 50 } });
  const boards = pulse.buildActiveUniverseBoards([provisional], [], [provisional]);
  const cards = pulse.deriveProvisionalCards(boards, provisional.id);
  assert.ok(cards.length); assert.equal(cards[0].finality, 'provisional'); assert.match(cards[0].body, /PROVISIONAL/);
});

test('43 public hotness excludes provisional events', () => assert.equal(pulse.rankWhatsHot([event({ finality: 'provisional' })], new Date('2026-08-22T00:00:00Z')).length, 0));
test('44 public hotness excludes hidden events', () => assert.equal(pulse.rankWhatsHot([event({ hidden: true })], new Date('2026-08-22T00:00:00Z')).length, 0));
test('45 public hotness excludes events older than seven days', () => assert.equal(pulse.rankWhatsHot([event({ publishedAt: '2026-08-01T00:00:00Z' })], new Date('2026-08-22T00:00:00Z')).length, 0));
test('46 public hotness limits one player to two while field diversity exists', () => {
  const events = [event({ eventId: 'a1', playerId: '1' }), event({ eventId: 'a2', playerId: '1', rankAfter: 1 }), event({ eventId: 'a3', playerId: '1', rankAfter: 3 }), event({ eventId: 'b1', playerId: '2' }), event({ eventId: 'c1', playerId: '3' })];
  const ranked = pulse.rankWhatsHot(events, new Date('2026-08-22T00:00:00Z'), 5);
  assert.ok(ranked.filter((x) => x.playerId === '1').length <= 2);
});

test('47 private-field scanner catches nested private keys', () => assert.equal(pulse.publicArtifactHasPrivateFields({ public: { evidence: ['private'] } }), true));
test('48 private-field scanner allows public-safe ranking facts', () => assert.equal(pulse.publicArtifactHasPrivateFields({ playerId: '1', rank: 3, headline: 'Strong week' }), false));
test('49 share moment URL encodes identifier and normalizes trailing slash', () => assert.equal(pulse.shareMomentUrl('https://example.com/', 'a b'), 'https://example.com/share/a%20b'));

// Patch H lifecycle remains authoritative.
test('50 stored historical lifecycle is recognized', () => assert.equal(backfill.storedReviewLifecycle({ reviewLifecycle: 'historical_backfill' }), 'historical_backfill'));
test('51 historical Review never counts toward retention', () => assert.equal(backfill.reviewCountsTowardRetention({ reviewLifecycle: 'historical_backfill' }), false));
test('52 organic Review counts toward retention', () => assert.equal(backfill.reviewCountsTowardRetention({ reviewLifecycle: 'organic_live' }), true));
test('53 original beta retains its lifecycle', () => assert.equal(backfill.storedReviewLifecycle({ originalBeta: { source: 'legacy' } }), 'original_beta'));
test('54 four-period backfill window stays bounded at four', () => assert.equal(backfill.fourPeriodWindow('2026-08-03').length, 4));

// Review History presentation metadata.
test('55 CompletedReviewHistoryItem can preserve historical_backfill lifecycle through live conversion', () => {
  const desk = { provenance: { sourceLabel: 'Chess.com', verified: true }, player: { username: 'P' }, period: { start: '2026-08-03', end: '2026-08-09', label: '3–9 Aug' }, games: 5, wins: 3, draws: 0, losses: 2, score: 60, longestWinStreak: 2, pools: [], signals: { green: { status: 'withheld', title: '', copy: '' }, red: { status: 'withheld', title: '', copy: '' }, blue: { status: 'withheld', title: '', copy: '' } }, headline: 'Week', summary: 'Summary', primaryPool: 'rapid' };
  const summary = { deskKey: 'key', periodStart: '2026-08-03', periodEnd: '2026-08-09', periodLabel: '3–9 Aug', games: 5, wins: 3, draws: 0, losses: 2, scorePct: 60, pools: [], longestWinRun: 2, longestLossRun: 1, signalFamilies: {} };
  const item = history.liveDeskToReviewHistory(desk, summary, 'historical_backfill');
  assert.equal(item.reviewLifecycle, 'historical_backfill');
});

test('56 historical Review presents HISTORICAL REVIEW', () => assert.equal(history.reviewHistoryLifecycleLabel({ source: 'live', reviewLifecycle: 'historical_backfill' }), 'HISTORICAL REVIEW'));
test('57 organic Review presents COMPLETED REVIEW', () => assert.equal(history.reviewHistoryLifecycleLabel({ source: 'live', reviewLifecycle: 'organic_live' }), 'COMPLETED REVIEW'));
test('58 Original Beta presents ORIGINAL REVIEW', () => assert.equal(history.reviewHistoryLifecycleLabel({ source: 'original_beta', reviewLifecycle: 'original_beta' }), 'ORIGINAL REVIEW'));

// Server/data orchestration integration boundaries.
test('59 persistence preserves storedReviewLifecycle when building completed Review history', () => {
  const src = read('src/lib/boardsignal/server/persistence.ts');
  assert.match(src, /storedReviewLifecycle\(data\)/);
  assert.match(src, /liveDeskToReviewHistory\([^;]+lifecycle \?\? "organic_live"/s);
});

test('60 historical Universe participant strips fresh public coverage while retaining ranking path', () => {
  const src = read('src/lib/boardsignal/server/universePulse.ts');
  assert.match(src, /reviewLifecycle === "historical_backfill"/);
  assert.match(src, /if \(record\.reviewLifecycle === "historical_backfill"\)[\s\S]*return withoutCoverage/);
});

test('61 historical artifact writer is defense-in-depth suppressed', () => {
  const src = read('src/lib/boardsignal/server/universePulse.ts');
  assert.match(src, /if \(input\.reviewLifecycle === "historical_backfill"\)[\s\S]*events: \[\][\s\S]*shareMoments: \[\]/);
});

test('62 Review movement uses stored publication standing snapshots rather than reconstructing the population', () => {
  const src = read('src/lib/boardsignal/server/universePulse.ts');
  assert.match(src, /currentReviewStanding\?: PulseStandingSnapshot\[\]/);
  assert.match(src, /previousReviewStanding\?: PulseStandingSnapshot\[\]/);
  assert.match(src, /deriveReviewMovement\(input\.previousReviewStanding, input\.currentReviewStanding\)/);
});

test('63 persistence stores official Universe standing snapshots at Review publication', () => {
  const src = read('src/lib/boardsignal/server/persistence.ts');
  assert.match(src, /universeStandingAtPublication\?: PulseStandingSnapshot\[\]/);
  assert.match(src, /universeStandingAtPublication: artifacts\.officialStandingSnapshots/);
  assert.match(src, /currentReviewStanding: latestBundle\?\.universeStandingAtPublication/);
  assert.match(src, /previousReviewStanding: previousBundle\?\.universeStandingAtPublication/);
});

test('64 materialized Pulse does not rebuild historical population fields on ordinary reads', () => {
  const src = read('src/lib/boardsignal/server/universePulse.ts');
  assert.doesNotMatch(src, /canReconstructFieldAsOf|boardsFromRecordsAsOf|recordsAsOf|seedsAsOf/);
});

test('65 since-last-visit field movement only compares snapshots when latest Review period is unchanged', () => {
  const src = read('src/lib/boardsignal/server/universePulse.ts');
  assert.match(src, /const latestReviewPeriodEnd = input\.latestDesk\?\.period\.end/);
  assert.match(src, /previous && previous\.latestReviewPeriodEnd === latestReviewPeriodEnd/);
  assert.match(src, /const boardMoved = sameReviewAsLastVisit \?/);
  assert.match(src, /const fieldMoved = sameReviewAsLastVisit && Number\.isFinite\(previousSeenAt\)/);
});

test('66 provisional projection removes official self and cannot trigger live-field transition', () => {
  const src = read('src/lib/boardsignal/server/universePulse.ts');
  assert.match(src, /const withoutSelf = state\.liveParticipants\.filter\(\(participant\) => participant\.stablePlayerId !== String\(input\.account\.chessCom\.playerId\)\)/);
  assert.match(src, /buildActiveUniverseBoards\(\[\.\.\.withoutSelf, provisionalParticipant\], foundingBetaField, state\.liveParticipants\)/);
});

test('67 active official state exposes truthful official player count', () => {
  const src = read('src/lib/boardsignal/server/universePulse.ts');
  assert.match(src, /officialPlayerCount/);
});

// Authenticated migration + UI truth.
test('68 authenticated Review wraps UniversalPlayerDesk in supplied Pulse provider', () => {
  const src = read('src/components/BoardSignalPlayerRoom.tsx');
  assert.match(src, /<AuthenticatedUniverseProvider pulse=\{snapshot\.pulse\} unavailable=\{snapshot\.pulseUnavailable\}>\s*<UniversalPlayerDesk[^>]+presentationMode="player-room"/s);
});

test('69 authenticated Around This Review explicitly reports Pulse unavailable', () => {
  const src = read('src/components/UniverseRecognition.tsx');
  assert.match(src, /Around this Review is temporarily unavailable\./);
});

test('70 authenticated Around This Review does not render legacy view when provider exists', () => {
  const src = read('src/components/UniverseRecognition.tsx');
  assert.match(src, /if \(authenticated\) return <AuthenticatedReviewUniverse/);
});

test('71 hidden BoardSignalHistoryWorker remains compatible because provider is optional and worker source is untouched', () => {
  const worker = read('src/components/BoardSignalHistoryWorker.tsx');
  assert.match(worker, /<UniversalPlayerDesk/);
  const universeUi = read('src/components/UniverseRecognition.tsx');
  assert.match(universeUi, /createContext<AuthenticatedUniverseContextValue \| null>\(null\)/);
});

test('72 Review History presentation uses lifecycle-aware customer label', () => {
  const src = read('src/components/BoardSignalPlayerRoom.tsx');
  assert.match(src, /reviewHistoryLifecycleLabel\(review\)/);
  assert.doesNotMatch(src, /review\.source === "original_beta" \? " · ORIGINAL BETA" : " · LIVE"/);
});

test('73 authenticated Universe hierarchy starts with LIVE FIELD then official position then Review movement', () => {
  const src = read('src/components/BoardSignalPlayerRoom.tsx');
  const live = src.indexOf('LIVE FIELD');
  const position = src.indexOf('YOUR OFFICIAL POSITION', live);
  const movement = src.indexOf('YOUR REVIEW MOVEMENT', position);
  assert.ok(live >= 0 && position > live && movement > position);
});

test('74 provisional section follows since-last-visit and stays explicitly provisional', () => {
  const src = read('src/components/BoardSignalPlayerRoom.tsx');
  const since = src.indexOf('SINCE YOUR LAST VISIT');
  const provisional = src.indexOf('THIS WEEK · PROVISIONAL', since);
  assert.ok(provisional > since);
  assert.match(src, /forming week has not become official/);
});

test('75 From the Field does not fabricate /player username when coverageHref is absent', () => {
  const src = read('src/components/BoardSignalPlayerRoom.tsx');
  assert.doesNotMatch(src, /entry\.coverageHref \?\? `\/player\//);
  assert.match(src, /entry\.coverageHref \? <Link href=\{entry\.coverageHref\}/);
});

test('76 From the Field keeps a legitimate coverageHref link', () => {
  const src = read('src/components/BoardSignalPlayerRoom.tsx');
  assert.match(src, /entry\.coverageHref \? <Link href=\{entry\.coverageHref\}>/);
});

test('77 public field removes static fallback and avoids historical freshness language', () => {
  const src = read('src/app/feed/page.tsx');
  const recognition = read('src/components/UniverseRecognition.tsx');
  assert.doesNotMatch(src, /foundingUniverseGroups/);
  assert.match(recognition, /CURRENT OFFICIAL LEADERS/);
  assert.doesNotMatch(recognition, /THIS WEEK&apos;S LEADERS/);
});

test('78 public feed exposes explicit current-field unavailable truth', () => {
  const src = read('src/app/feed/page.tsx');
  assert.match(src, /CURRENT FIELD TEMPORARILY UNAVAILABLE/);
});

test('79 founding coverage is explicitly archival', () => {
  const src = read('src/app/feed/page.tsx');
  assert.match(src, /ARCHIVE · FOUNDING COVERAGE/);
  assert.match(src, /story\.period/);
});

test('80 G.4 stylesheet is inserted before protected F.2 final layer', () => {
  const src = read('src/app/layout.tsx');
  const g4 = src.indexOf('boardsignal-g4-universe.css');
  const f2 = src.indexOf('boardsignal-f2-readability.css');
  assert.ok(g4 >= 0 && f2 > g4);
  const imports = src.match(/import "\.\/boardsignal-[^"]+\.css";/g) ?? [];
  assert.match(imports.at(-1), /boardsignal-f2-readability\.css/);
});

test('81 H.1 stylesheet remains ahead of G.4 and is not removed', () => {
  const src = read('src/app/layout.tsx');
  assert.ok(src.indexOf('boardsignal-h1-hotfix.css') < src.indexOf('boardsignal-g4-universe.css'));
});

test('82 G.3 Player Room stylesheet remains loaded and six-tab vocabulary remains intact', () => {
  assert.match(read('src/app/layout.tsx'), /boardsignal-player-room-g3\.css/);
  const room = read('src/components/BoardSignalPlayerRoom.tsx');
  for (const label of ['Review', 'Progress', 'Around BoardSignal', 'Friends', 'Inbox', 'Profile']) assert.match(room, new RegExp(`label: "${label}"`));
});

test('83 G.4 CSS gives mobile grids a single minmax column without horizontal rank tables', () => {
  const css = read('src/app/boardsignal-g4-universe.css');
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
});

test('84 G.4 CSS has explicit focus-visible treatment', () => assert.match(read('src/app/boardsignal-g4-universe.css'), /:focus-visible/));
test('85 G.4 CSS respects prefers-reduced-motion', () => assert.match(read('src/app/boardsignal-g4-universe.css'), /@media \(prefers-reduced-motion: reduce\)/));

test('86 no protected persistence retention definition was replaced by G.4', () => {
  const src = read('src/lib/boardsignal/server/persistence.ts');
  assert.match(src, /countsTowardRetention: !historical/);
});

test('87 historical persistence still uses importedAt rather than fabricated publishedAt', () => {
  const src = read('src/lib/boardsignal/server/persistence.ts');
  assert.match(src, /historical[\s\S]*importedAt/s);
});

test('88 Patch H historical request anchors remain intact', () => {
  assert.equal(backfill.parseHistoricalRequestAnchor(backfill.historicalRequestAnchor('2026-08-10', '2026-07-20')).periodStart, '2026-07-20');
});

test('89 public/private safety still names core private signal keys', () => {
  assert.equal(pulse.publicArtifactHasPrivateFields({ red: { title: 'private' } }), true);
  assert.equal(pulse.publicArtifactHasPrivateFields({ amber: { title: 'private' } }), true);
  assert.equal(pulse.publicArtifactHasPrivateFields({ privateNotes: 'x' }), true);
});

test('90 no G.4 source changes LIVE_FIELD_THRESHOLD literal', () => assert.match(read('src/lib/boardsignal/pulse.ts'), /export const LIVE_FIELD_THRESHOLD = 6;/));
