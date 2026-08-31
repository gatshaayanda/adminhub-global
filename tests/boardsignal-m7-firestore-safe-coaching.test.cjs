const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const coachingSource = read('src/lib/boardsignal/coaching.ts');
const serverCoaching = read('src/lib/boardsignal/server/coaching.ts');
const feedbackServer = read('src/lib/boardsignal/server/currentFeedback.ts');
const engagementServer = read('src/lib/boardsignal/server/playerRoomEngagement.ts');

function loadCoaching() {
  const compiled = ts.transpileModule(coachingSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require, console }, { filename: 'coaching.js' });
  return module.exports;
}

const m7 = loadCoaching();
const now = '2026-08-31T09:45:00.000Z';

function assertNoUndefined(value, pathLabel = 'root') {
  if (value === undefined) assert.fail(`undefined at ${pathLabel}`);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUndefined(item, `${pathLabel}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) assertNoUndefined(item, `${pathLabel}.${key}`);
}

function fact(overrides = {}) {
  return {
    id: 'g1:f',
    gameId: 'g1',
    gameUrl: 'https://www.chess.com/game/live/g1',
    summary: 'A real supporting event.',
    ...overrides,
  };
}

function currentEpisode(facts = [fact()]) {
  return {
    status: 'forming',
    periodStart: '2026-08-31',
    periodEnd: '2026-09-06',
    periodLabel: '31 Aug–6 Sep',
    checkedAt: now,
    daysComplete: 1,
    daysRemaining: 6,
    games: 4,
    wins: 2,
    draws: 0,
    losses: 2,
    currentWinRun: 0,
    currentLossRun: 1,
    sessions: 1,
    pools: [],
    nextDeskDueAt: '2026-09-07',
    nextGameGuidance: {
      status: 'available',
      source: 'current_week',
      family: 'forcing_reply',
      title: 'Check the reply.',
      copy: 'Scan checks and captures first.',
      gamesConsidered: 4,
      evidenceCount: facts.length,
      supportingFacts: facts,
    },
  };
}

function previousEpisode() {
  const episode = currentEpisode([]);
  episode.nextGameGuidance = {
    status: 'fallback_previous_review',
    source: 'previous_review',
    title: 'Old cue',
    copy: 'Old copy',
    gamesConsidered: 2,
    evidenceCount: 0,
    supportingFacts: [],
    previousReviewPeriod: '24–30 Aug',
  };
  return episode;
}

test('current-period candidate without previousReviewPeriod is Firestore-safe', () => {
  const candidate = m7.coachingCandidateForEpisode(currentEpisode());
  assert.equal(candidate.provenance, 'current_period');
  assert.equal('previousReviewPeriod' in candidate, false);
  const state = m7.stateForNewCandidate(candidate, now);
  assert.equal('previousReviewPeriod' in state, false);
  const persisted = m7.firestoreSafeCoachingState(state);
  assertNoUndefined(persisted);
});

test('stateForNewCandidate never persists an undefined previousReviewPeriod', () => {
  const candidate = m7.coachingCandidateForEpisode(currentEpisode());
  const persisted = m7.firestoreSafeCoachingState(m7.stateForNewCandidate(candidate, now));
  assert.equal(Object.prototype.hasOwnProperty.call(persisted, 'previousReviewPeriod'), false);
  assertNoUndefined(persisted);
});

test('coaching state with no Level-3 example is Firestore-safe', () => {
  const candidate = m7.coachingCandidateForEpisode(currentEpisode([]));
  const state = m7.stateForNewCandidate(candidate, now);
  assert.equal(state.examples.length, 0);
  assert.equal('selectedExampleId' in state, false);
  assert.equal('selectedExampleSnapshot' in state, false);
  const persisted = m7.firestoreSafeCoachingState(state);
  assertNoUndefined(persisted);
});

test('real coaching example with missing optional metadata is Firestore-safe', () => {
  const candidate = m7.coachingCandidateForEpisode(currentEpisode([fact({ gameUrl: undefined })]));
  assert.equal(candidate.examples.length, 1);
  const example = candidate.examples[0];
  for (const key of ['occurredAt', 'opponent', 'opponentRating', 'pool', 'moveNumber', 'movePlayed', 'opponentReply', 'gameUrl']) {
    assert.equal(Object.prototype.hasOwnProperty.call(example, key), false, `${key} should be omitted`);
  }
  assertNoUndefined(m7.firestoreSafeCoachingState(m7.stateForNewCandidate(candidate, now)));
});

test('recursive sanitizer removes undefined from nested coaching arrays and objects without mutating input', () => {
  const input = {
    schemaVersion: 2,
    coachingSignalKey: 'm7:2026-08-31:current:forcing_reply',
    periodStart: '2026-08-31',
    periodEnd: '2026-09-06',
    source: 'current_week',
    provenance: 'current_period',
    level: 1,
    cueTitle: 'Cue',
    cueCopy: 'Copy',
    level2Copy: 'Explain',
    evidenceCount: 1,
    gamesConsidered: 2,
    reactions: {},
    examples: [{ id: 'g1:f', gameId: 'g1', summary: 'x', opponent: undefined, nested: { missing: undefined, keep: null } }, undefined],
    presentedSessionIds: ['s1', undefined, 's2'],
    createdAt: now,
    updatedAt: now,
    family: undefined,
  };
  const persisted = m7.firestoreSafeCoachingState(input);
  assertNoUndefined(persisted);
  assert.equal(persisted.examples.length, 1);
  assert.equal(persisted.presentedSessionIds.length, 2);
  assert.equal(persisted.examples[0].nested.keep, null);
  assert.equal(Object.prototype.hasOwnProperty.call(input, 'family'), true);
  assert.equal(input.examples.length, 2);
});

test('previous-review coaching preserves a real previousReviewPeriod', () => {
  const candidate = m7.coachingCandidateForEpisode(previousEpisode());
  assert.equal(candidate.provenance, 'previous_review');
  assert.equal(candidate.previousReviewPeriod, '24–30 Aug');
  const persisted = m7.firestoreSafeCoachingState(m7.stateForNewCandidate(candidate, now));
  assert.equal(persisted.previousReviewPeriod, '24–30 Aug');
  assertNoUndefined(persisted);
});

test('current-period provenance and Level 1 → 2 → 3 progression are unchanged', () => {
  const candidate = m7.coachingCandidateForEpisode(currentEpisode([fact(), fact({ id: 'g2:f', gameId: 'g2', gameUrl: 'https://www.chess.com/game/live/g2' })]));
  let state = m7.stateForNewCandidate(candidate, now);
  assert.equal(state.provenance, 'current_period');
  let first = m7.presentCoachingForSession(state, 'm3:first-session', 1_000_000);
  assert.equal(first.state.level, 1);
  let second = m7.presentCoachingForSession(first.state, 'm3:second-session', 1_100_001);
  assert.equal(second.state.level, 2);
  let third = m7.presentCoachingForSession(second.state, 'm3:third-session', 1_200_002);
  assert.equal(third.state.level, 3);
  assertNoUndefined(m7.firestoreSafeCoachingState(third.state));
});

test('every canonical coachingState Firestore write is sanitized', () => {
  assert.match(serverCoaching, /firestoreSafeCoachingState\(\{[\s\S]*existing/);
  assert.match(serverCoaching, /const persistedNext = firestoreSafeCoachingState\(next\)/);
  assert.match(feedbackServer, /const nextState = firestoreSafeCoachingState\(transition\.state\)/);
  assert.match(feedbackServer, /nextState = firestoreSafeCoachingState\(nextState\)/);
  assert.match(engagementServer, /const persistedCoaching = coachingPresentation \? firestoreSafeCoachingState\(coachingPresentation\.state\) : undefined/);
  assert.doesNotMatch([serverCoaching, feedbackServer, engagementServer].join('\n'), /ignoreUndefinedProperties/);
});

test('feedback and example-cycle/View Game/Ask interaction states stay Firestore-safe', () => {
  const candidate = m7.coachingCandidateForEpisode(currentEpisode([fact(), fact({ id: 'g2:f', gameId: 'g2', gameUrl: 'https://www.chess.com/game/live/g2' })]));
  let state = { ...m7.stateForNewCandidate(candidate, now), level: 3 };
  state = m7.applyCoachingReaction(state, 3, 'not_helpful', '2026-08-31T09:46:00.000Z').state;
  assertNoUndefined(m7.firestoreSafeCoachingState(state));
  const cycled = m7.cycleCoachingExample(state, '2026-08-31T09:47:00.000Z');
  assertNoUndefined(m7.firestoreSafeCoachingState(cycled));
  const viewed = { ...cycled, viewGameCount: (cycled.viewGameCount ?? 0) + 1, updatedAt: '2026-08-31T09:48:00.000Z' };
  const asked = { ...viewed, askEscalationAt: '2026-08-31T09:49:00.000Z', updatedAt: '2026-08-31T09:49:00.000Z' };
  assertNoUndefined(m7.firestoreSafeCoachingState(viewed));
  assertNoUndefined(m7.firestoreSafeCoachingState(asked));
});

test('Google and fallback return providers do not alter the coaching persistence contract', () => {
  const providerUses = engagementServer.match(/body\.accessProvider/g) ?? [];
  assert.equal(providerUses.length, 1);
  assert.match(engagementServer, /accessProvider: body\.accessProvider/);
  assert.doesNotMatch(engagementServer, /if\s*\([^)]*accessProvider|switch\s*\([^)]*accessProvider/);
  assert.match(engagementServer, /persistedCoaching/);
});

test('constructors guard optional fields instead of assigning undefined values', () => {
  assert.match(coachingSource, /candidate\.previousReviewPeriod !== undefined \? \{ previousReviewPeriod: candidate\.previousReviewPeriod \} : \{\}/);
  assert.match(coachingSource, /selected \? \{ selectedExampleId: selected\.id, selectedExampleSnapshot: selected \} : \{\}/);
  assert.match(coachingSource, /fact\.opponent !== undefined \? \{ opponent: fact\.opponent \} : \{\}/);
});
