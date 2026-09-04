const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const room = read('src/components/BoardSignalPlayerRoom.tsx');
const engagement = read('src/components/CurrentBoardSignalEngagement.tsx');
const systemCss = read('src/app/boardsignal-system.css');
const layout = read('src/app/layout.tsx');
const companionCss = systemCss.slice(systemCss.indexOf('BoardSignal Companion UI — post-P2 presentation layer'));

function section(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.notEqual(a, -1, `missing ${start}`);
  assert.notEqual(b, -1, `missing ${end}`);
  return source.slice(a, b);
}

test('companion Current leads with last-game freshness before coaching and evidence', () => {
  const current = section(room, 'function CurrentEpisodeCard', 'function ReviewHistorySection');
  const lastGame = current.indexOf('YOUR LAST GAME');
  const signal = current.indexOf('CURRENT BOARDSIGNAL');
  const next = current.indexOf('BEFORE YOUR NEXT GAME');
  const evidence = current.indexOf('SUPPORTING EVIDENCE');
  assert.ok(lastGame >= 0 && signal > lastGame && next > signal && evidence > next);
  assert.equal(current.match(/YOUR LAST GAME/g)?.length, 1, 'last game must not be duplicated inside evidence');
});

test('navigation keeps the six canonical tabs while symbols lead scanning', () => {
  for (const [id, label, icon] of [
    ['desk', 'Current', 'Home'],
    ['progress', 'Progress', 'TrendingUp'],
    ['universe', 'Universe', 'Globe2'],
    ['friends', 'Friends', 'Users'],
    ['inbox', 'Inbox', 'Inbox'],
    ['profile', 'Profile', 'User'],
  ]) assert.match(room, new RegExp(`id: "${id}" as const, label: "${label}", icon: ${icon}`));
  assert.match(room, /role="tablist"/);
  assert.match(room, /aria-selected=\{tab === item\.id\}/);
  assert.match(room, /ArrowRight/);
  assert.match(room, /event\.key === "Home"/);
  assert.match(room, /event\.key === "End"/);
});

test('manual refresh reuses the existing Player Room load gate without polling or a new endpoint', () => {
  const refresh = section(room, 'const refreshCurrent', 'useEffect(() => onAuthStateChanged');
  assert.match(refresh, /loadRoom\(user, true\)/);
  assert.doesNotMatch(refresh, /fetch\(/);
  assert.doesNotMatch(room, /setInterval\(/);
  assert.match(room, /aria-label="Refresh Current BoardSignal"/);
});

test('existing current coaching engagement mount remains intact', () => {
  assert.match(room, /g3-before-next-game companion-signal-card/);
  assert.match(engagement, /document\.querySelector<HTMLElement>\("\.g3-before-next-game"\)/);
  assert.match(engagement, /Helpful\?/);
  assert.match(engagement, /👍/);
  assert.match(engagement, /👎/);
});

test('Progress keeps history depth and ends with icon-led continuation', () => {
  const progress = section(room, 'function ProgressSection', 'function ShareMomentsSection');
  assert.match(progress, /PlayerReviewNotesTimeline/);
  assert.match(progress, /RECURRING PATTERNS/);
  assert.match(progress, /COMPATIBLE TRENDS/);
  assert.match(progress, /PAST PERIODS/);
  assert.match(progress, /ProgressContinuation/);
  assert.match(room, /function ProgressContinuation/);
  assert.match(room, /<Globe2/);
  assert.match(room, /<Users/);
  assert.match(room, /<Inbox/);
  assert.match(room, /<User/);
});

test('companion styling stays inside the single BoardSignal visual-system import and is reduced-motion safe', () => {
  const imports = [...layout.matchAll(/^import "\.\/(.+\.css)";/gm)].map((match) => match[1]);
  assert.deepEqual(imports, ['globals.css', 'boardsignal-system.css']);
  assert.ok(companionCss.length > 1000);
  assert.match(companionCss, /@media \(max-width: 390px\)/);
  assert.match(companionCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(companionCss, /companion-refresh-button\.is-refreshing svg/);
  assert.doesNotMatch(companionCss, /marquee|bounce|pulse/i);
});

test('companion continuation uses only the canonical configured community link', () => {
  assert.match(room, /BOARDSIGNAL_SUPPORT_DISCORD_URL/);
  assert.doesNotMatch(room, /instagram\.com|youtube\.com/i);
});
