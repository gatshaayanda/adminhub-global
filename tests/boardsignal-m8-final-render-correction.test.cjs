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

test('the real coaching component renders one rotating presentation control surface', () => {
  assert.equal(count(engagement, 'aria-label="Coaching controls"'), 1);
  assert.equal(count(engagement, 'aria-label="Feedback for this coaching explanation"'), 1);
  assert.match(engagement, /coaching\.level===3\?<ExampleDetails/);
  assert.match(engagement, /coaching\.reactions\?\.\[coaching\.level\]/);
  assert.match(engagement, /TRY ANOTHER EXPLANATION/);
  assert.match(engagement, /nextManualCoachingVariant\(coaching\)/);
  assert.match(engagement, /aria-pressed=\{reaction==="helpful"\}/);
  assert.match(engagement, /aria-pressed=\{reaction==="not_helpful"\}/);
  assert.doesNotMatch(engagement, /Progressive coaching explanation|Coaching level [123]|LEVEL [123] ·|automatic explanation ladder/i);
});

test('coaching module retains semantic authority and practical touch targets', () => {
  assert.match(engagementCss, /\.reactionButtons button[\s\S]*min-width:50px; min-height:48px/);
  assert.match(engagementCss, /\.reactionButtons button\[aria-pressed="true"\][\s\S]*var\(--bs-brand-primary\)/);
  assert.match(engagementCss, /\.actions :global\(\.button\), \.switcher :global\(\.button\)[\s\S]*min-height:48px/);
  assert.match(engagementCss, /\.helpful[\s\S]*background:var\(--bs-blue-soft\)/);
  assert.match(engagementCss, /\.exampleDetails[\s\S]*background:var\(--bs-surface\)/);
  assert.match(engagementCss, /button:disabled[\s\S]*opacity:1[\s\S]*var\(--bs-bg-subtle\)[\s\S]*var\(--bs-text-secondary\)/);
});

test('local-only Chrome fixture mounts the real self-contained component once', () => {
  assert.match(qaPage, /process\.env\.NODE_ENV === "production"\) notFound\(\)/);
  assert.equal(count(qaPage, '<CurrentBoardSignalEngagement />'), 1);
  assert.match(qaPage, /g3-before-next-game/);
  assert.match(qaProbe, /boardsignal:coaching-state/);
  assert.match(qaProbe, /aria-label="Coaching controls"/);
  assert.match(qaProbe, /Feedback for this coaching explanation/);
  assert.match(qaProbe, /player-level-language/);
  assert.match(qaProbe, /legacy-progressive-surface/);
});

test('rendered QA locks one presentation, one feedback row, contrast, overflow and touch targets', () => {
  assert.match(qaProbe, /presentationCount/);
  assert.match(qaProbe, /feedbackCount/);
  assert.match(qaProbe, /titleContrast/);
  assert.match(qaProbe, /copyContrast/);
  assert.match(qaProbe, /feedbackButtons\.length !== 2/);
  assert.match(qaProbe, /rect\.width < 50 \|\| rect\.height < 48/);
  assert.match(qaProbe, /manual-switch:missing/);
  assert.match(qaProbe, /game-link:missing/);
  assert.match(qaProbe, /ask:missing/);
  assert.match(qaProbe, /scrollWidth > window\.innerWidth \+ 2/);
  for (const width of ['320', '360', '390', '412', '1365']) assert.ok(chrome.includes(width));
  for (const theme of ['light', 'dark']) assert.ok(chrome.includes(`"${theme}"`));
  for (const variant of ['1', '2', '3']) assert.ok(chrome.includes(variant));
  assert.match(chrome, /presentationCount !== 1/);
  assert.match(chrome, /feedbackCount !== 1/);
  assert.match(chrome, /Number\(probe\.titleContrast\) < 4\.5/);
  assert.match(chrome, /Number\(probe\.copyContrast\) < 4\.5/);
  assert.match(chrome, /playerLevelLanguage !== false/);
  assert.doesNotMatch(chrome, /progressiveCount|level1Count|level2Count|level3Count|expectedCounts/);
});
