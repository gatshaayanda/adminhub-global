const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const system = read('src/app/boardsignal-system.css');
const accessibility = read('src/app/boardsignal-accessibility.css');
const motion = read('src/app/boardsignal-motion.css');
const playerRoom = read('src/app/boardsignal-player-room-g3.css');
const universe = read('src/app/boardsignal-g4-universe.css');
const weeklyTruth = read('src/app/boardsignal-g41-weekly-truth.css');
const coaching = read('src/components/CurrentBoardSignalEngagement.tsx');
const coachingStyles = read('src/components/CurrentBoardSignalEngagement.module.css');
const proofStyles = read('src/components/HomeProofRail.module.css');

function afterM8(source) {
  const index = source.lastIndexOf('Patch M8');
  assert.ok(index >= 0, 'expected a Patch M8 presentation block');
  return source.slice(index);
}

test('M8 stays inside the existing semantic visual-system entrypoint', () => {
  for (const file of [
    'boardsignal-foundation.css',
    'boardsignal-accessibility.css',
    'boardsignal-motion.css',
    'boardsignal-player-room-g3.css',
    'boardsignal-g4-universe.css',
    'boardsignal-g41-weekly-truth.css',
  ]) assert.match(system, new RegExp(`@import "\\.\\/${file.replaceAll('.', '\\.')}"`));
  assert.doesNotMatch(system, /boardsignal-f2-readability\.css|boardsignal-h1-hotfix\.css/);
});

test('Current BoardSignal has a live editorial surface without a pulsing live indicator', () => {
  const m8 = afterM8(playerRoom);
  assert.match(m8, /\.current-boardsignal-lead/);
  assert.match(m8, /border-top:\s*4px solid var\(--bs-brand-primary\)/);
  assert.match(m8, /\.corner-live-status/);
  assert.match(m8, /background:\s*var\(--bs-blue-soft\)/);
  assert.doesNotMatch(m8, /pulse|animation\s*:/i);
});

test('Before Your Next Game is a distinct high-clarity cue, not a gamified panel', () => {
  const m8 = afterM8(playerRoom);
  assert.match(m8, /\.g3-before-next-game[\s\S]*border-left:\s*5px solid var\(--bs-lime\)/);
  assert.match(m8, /\.g3-before-next-game p[\s\S]*max-width:\s*62ch/);
  assert.doesNotMatch(m8, /streak|xp|level-up|combo|reward/i);
});

test('M7 progressive coaching remains Level 1 first and deepens only to stored Levels 2 and 3', () => {
  const level1 = coaching.indexOf('LEVEL 1 · QUICK CUE');
  const level2 = coaching.indexOf('LEVEL 2 · ANOTHER WAY TO THINK ABOUT IT');
  const level3 = coaching.indexOf('LEVEL 3 · HERE&apos;S ONE PLACE BOARDSIGNAL SAW IT');
  assert.ok(level1 >= 0 && level2 > level1 && level3 > level2);
  assert.match(coaching, /coaching\.level>=2/);
  assert.match(coaching, /coaching\.level>=3/);
  assert.match(coachingStyles, /\.levelOne[\s\S]*border-left:4px solid var\(--bs-brand-primary\)/);
  assert.match(coachingStyles, /\.depthBlock \+ \.depthBlock[\s\S]*var\(--bs-lime-readable\)/);
});

test('M8 feedback controls preserve practical targets and readable disabled states', () => {
  assert.match(coachingStyles, /min-height:48px/);
  assert.match(coachingStyles, /\.actions :global\(\.button\)[\s\S]*min-height:44px/);
  const disabled = coachingStyles.match(/\.reactionButtons button:disabled, \.actions button:disabled \{[^}]+\}/)?.[0] ?? '';
  assert.match(disabled, /opacity:1/);
  assert.match(disabled, /var\(--bs-bg-subtle\)/);
  assert.match(disabled, /var\(--bs-text-secondary\)/);
});

test('completed Reviews stay calm and readable while Progress gains continuity', () => {
  const m8 = afterM8(playerRoom);
  assert.match(m8, /\.last-completed-review/);
  assert.match(m8, /box-shadow:\s*none/);
  assert.match(m8, /#what-mattered/);
  assert.match(m8, /#focus-next/);
  assert.match(m8, /max-width:\s*68ch/);
  assert.match(m8, /\.g3-progress-section[\s\S]*border-left:\s*3px solid var\(--bs-border-strong\)/);
  assert.doesNotMatch(m8, /streak|hot hand|win streak|rank up|level up/i);
});

test('Universe receives the strongest controlled expression while provisional truth remains visually distinct', () => {
  const m8 = afterM8(universe);
  assert.match(m8, /\.g4-live-field-header[\s\S]*background:\s*var\(--bs-surface-inverse\)/);
  assert.match(m8, /border-top:\s*4px solid var\(--bs-lime\)/);
  assert.match(m8, /\.g4-official-position-grid > article[\s\S]*var\(--bs-brand-primary\)/);
  assert.match(m8, /\.g4-provisional-block[\s\S]*dashed/);
  assert.doesNotMatch(m8, /animation\s*:|marquee|parallax|blur\(/i);
});

test('homepage proof is editorial/static on mount and remains readable', () => {
  const m8 = afterM8(proofStyles);
  assert.match(m8, /\.rail[\s\S]*background:\s*var\(--bs-surface\)/);
  assert.match(m8, /\.rail::before[\s\S]*background:\s*var\(--bs-brand-primary\)/);
  assert.match(m8, /\.story,[\s\S]*\.trustPanel[\s\S]*animation:\s*none/);
  assert.match(m8, /\.trustCopy p \{ font-size: \.76rem; \}/);
  assert.doesNotMatch(m8, /linear-gradient|animation[^;]*infinite/i);
});

test('static Current/Review/Progress mount motion is removed without disabling meaningful state motion', () => {
  const m8 = afterM8(weeklyTruth);
  assert.match(m8, /\.current-episode-card:not\(\.bs-motion-fact-change\)/);
  assert.match(m8, /\.universal-cover:not\(\.bs-motion-review-ready\)/);
  assert.match(m8, /animation:\s*none/);
  for (const state of ['bs-motion-fact-change', 'bs-motion-guidance-change', 'bs-motion-review-ready', 'bs-motion-unread-change', 'bs-motion-engine-state']) {
    assert.match(motion, new RegExp(`\\.${state}`));
  }
  assert.match(motion, /last-active-banner\.bs-motion-engine-active[\s\S]*infinite/);
});

test('offline, Ask and Founder support surfaces remain restrained and semantically explicit', () => {
  const m8 = afterM8(weeklyTruth);
  assert.match(m8, /offline-player-room/);
  assert.match(m8, /border-left:\s*4px solid var\(--bs-warning\)/);
  assert.match(m8, /\.ask-bs-panel[\s\S]*var\(--bs-surface-elevated\)/);
  assert.match(m8, /\.founder-ops-console[\s\S]*box-shadow:\s*none/);
  assert.doesNotMatch(m8, /backdrop-filter|filter:\s*blur|glass|celebrat/i);
});

test('accessibility and narrow-screen contracts remain active', () => {
  assert.match(accessibility, /:focus-visible/);
  assert.match(accessibility, /@media \(forced-colors: active\)/);
  assert.doesNotMatch(accessibility, /forced-color-adjust\s*:\s*none/i);
  for (const width of ['390', '360', '320']) assert.match(accessibility, new RegExp(`max-width: ${width}px`));
  assert.match(playerRoom, /@media \(max-width: 680px\)/);
});

test('M8 introduces no decorative infinite motion or glass/parallax system', () => {
  const touched = [afterM8(playerRoom), afterM8(universe), afterM8(weeklyTruth), afterM8(proofStyles), coachingStyles].join('\n');
  assert.doesNotMatch(touched, /animation[^;]*infinite|marquee|parallax|backdrop-filter|filter:\s*blur|perspective\s*:/i);
});
