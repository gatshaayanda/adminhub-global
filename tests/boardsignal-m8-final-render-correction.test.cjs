const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const journal = read('src/components/PlayerReviewJournal.tsx');
const page = read('src/app/boardsignal/player-room/page.tsx');
const g3 = read('src/app/boardsignal-player-room-g3.css');
const engagement = read('src/components/CurrentBoardSignalEngagement.tsx');
const engagementCss = read('src/components/CurrentBoardSignalEngagement.module.css');
const qaPage = read('src/app/boardsignal/qa/player-room-coaching/page.tsx');
const qaProbe = read('src/components/PlayerRoomCoachingQaProbe.tsx');
const chrome = read('scripts/check-boardsignal-m8-player-room-render.mjs');

function count(source, token) {
  return source.split(token).length - 1;
}

test('PlayerReviewJournal is notes/Your Take only and no longer mounts coaching', () => {
  assert.doesNotMatch(journal, /import CurrentBoardSignalEngagement/);
  assert.doesNotMatch(journal, /<CurrentBoardSignalEngagement\s*\/>/);
  assert.match(journal, /YOUR TAKE/);
  assert.match(journal, /ADD A NOTE/);
});

test('live Player Room owns exactly one page-level coaching mount', () => {
  assert.equal(count(page, '<CurrentBoardSignalEngagement/>'), 1);
  assert.equal(count(page, 'import CurrentBoardSignalEngagement'), 1);
});

test('Before Your Next Game inverse text is scoped to native direct children', () => {
  assert.match(g3, /\.g3-before-next-game > span,[\s\S]*\.g3-before-next-game > h3,[\s\S]*\.g3-before-next-game > p,[\s\S]*\.g3-before-next-game > small/);
  assert.doesNotMatch(g3, /\.g3-before-next-game\s+h3/);
  assert.doesNotMatch(g3, /\.g3-before-next-game\s+p/);
  assert.doesNotMatch(g3, /\.g3-before-next-game\s+small/);
  assert.doesNotMatch(g3, /!important/);
});

test('the real M7 component renders one progressive wrapper and exactly one active level contract', () => {
  assert.equal(count(engagement, 'aria-label="Progressive coaching explanation"'), 1);
  assert.equal(count(engagement, 'aria-label="Coaching level 2"'), 1);
  assert.equal(count(engagement, 'aria-label="Coaching level 3"'), 1);
  assert.match(engagement, /coaching\.level===1/);
  assert.match(engagement, /coaching\.level===2/);
  assert.match(engagement, /coaching\.level===3/);
  assert.doesNotMatch(engagement, /coaching\.level>=2|coaching\.level>=3/);
});

test('coaching module retains semantic authority and existing thumb targets', () => {
  assert.match(engagementCss, /\.depthBlock > p[\s\S]*color:var\(--bs-text-secondary\)/);
  assert.match(engagementCss, /\.example p[\s\S]*color:var\(--bs-text-secondary\)/);
  assert.match(engagementCss, /\.hold p[\s\S]*color:var\(--bs-text-secondary\)/);
  assert.match(engagementCss, /\.helpful[\s\S]*background:var\(--bs-blue-soft\)/);
  assert.match(engagementCss, /min-width:50px; min-height:48px/);
});

test('local-only Chrome fixture mounts the real self-contained component once', () => {
  assert.match(qaPage, /process\.env\.NODE_ENV === "production"\) notFound\(\)/);
  assert.equal(count(qaPage, '<CurrentBoardSignalEngagement />'), 1);
  assert.match(qaPage, /g3-before-next-game/);
  assert.match(qaProbe, /boardsignal:coaching-state/);
  assert.match(qaProbe, /Progressive coaching explanation/);
});

test('rendered QA locks one-level counts, one feedback row, computed contrast, overflow and touch targets', () => {
  assert.match(qaProbe, /expectedLevelOne/);
  assert.match(qaProbe, /expectedLevelTwo/);
  assert.match(qaProbe, /expectedLevelThree/);
  assert.match(qaProbe, /feedbackRows !== 1/);
  assert.match(qaProbe, /contrast\(levelTwoBody\)/);
  assert.match(qaProbe, /levelTwoContrast < 4\.5/);
  assert.match(qaProbe, /levelThreeContrast < 4\.5/);
  assert.match(qaProbe, /nativeTitle\) < 4\.5/);
  assert.match(qaProbe, /nativeCopy\) < 4\.5/);
  assert.match(qaProbe, /levelThreeGameValid/);
  assert.match(qaProbe, /levelThreeAskAvailable/);
  assert.match(qaProbe, /scrollWidth > window\.innerWidth \+ 2/);
  assert.match(qaProbe, /rect\.width < 50 \|\| rect\.height < 48/);
  for (const width of ['320', '360', '390', '1365']) assert.ok(chrome.includes(width));
  for (const theme of ['light', 'dark']) assert.ok(chrome.includes(`"${theme}"`));
  for (const level of ['1', '2', '3']) assert.ok(chrome.includes(level));
  assert.match(chrome, /progressiveCount !== 1/);
  assert.match(chrome, /feedbackRows !== 1/);
  assert.match(chrome, /Number\(probe\.level2Contrast\) < 4\.5/);
  assert.match(chrome, /Number\(probe\.level3Contrast\) < 4\.5/);
  assert.match(chrome, /levelThreeGameValid !== true/);
  assert.match(chrome, /levelThreeAskAvailable !== true/);
});