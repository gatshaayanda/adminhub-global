const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const layout = read('src/app/layout.tsx');
const system = read('src/app/boardsignal-system.css');
const foundation = read('src/app/boardsignal-foundation.css');
const accessibility = read('src/app/boardsignal-accessibility.css');
const motion = read('src/app/boardsignal-motion.css');
const homepage = read('src/app/page.tsx');
const username = read('src/components/UsernameDeskForm.tsx');
const login = read('src/components/ChessComLoginPanel.tsx');
const install = read('src/components/InstallPrompt.tsx');
const installLib = read('src/lib/boardsignal/offline/install.ts');
const room = read('src/components/BoardSignalPlayerRoom.tsx');
const pkg = JSON.parse(read('package.json'));
const cascadeCheck = read('scripts/check-boardsignal-cascade.mjs');

function sourceOrder(source, fragments) {
  let previous = -1;
  for (const fragment of fragments) {
    const index = source.indexOf(fragment);
    assert.notEqual(index, -1, `missing ${fragment}`);
    assert.ok(index > previous, `${fragment} is out of required order`);
    previous = index;
  }
}

test('Patch L routes BoardSignal through one semantic visual-system entrypoint', () => {
  assert.match(layout, /import "\.\/globals\.css";/);
  assert.match(layout, /import "\.\/boardsignal-system\.css";/);
  for (const retiredImport of [
    'boardsignal-foundation.css',
    'boardsignal-accessibility.css',
    'boardsignal-motion.css',
    'boardsignal-player-room-g3.css',
    'boardsignal-h1-hotfix.css',
    'boardsignal-g4-universe.css',
    'boardsignal-g41-weekly-truth.css',
    'boardsignal-f2-readability.css',
  ]) assert.doesNotMatch(layout, new RegExp(`import "\\.\\/${retiredImport.replaceAll('.', '\\.')}`));

  for (const responsibility of [
    'boardsignal-foundation.css',
    'boardsignal-accessibility.css',
    'boardsignal-motion.css',
    'boardsignal-player-room-g3.css',
    'boardsignal-g4-universe.css',
    'boardsignal-g41-weekly-truth.css',
  ]) assert.match(system, new RegExp(`@import "\\.\\/${responsibility.replaceAll('.', '\\.')}"`));
  assert.doesNotMatch(system, /boardsignal-h1-hotfix\.css|boardsignal-f2-readability\.css/);
  assert.match(system, /Patch F\.2 and H\.1 are retired as separate cascade layers/);
});

test('existing semantic theme and accessibility foundations are consolidated, not replaced', () => {
  for (const token of ['--bs-surface', '--bs-text-primary', '--bs-text-muted', '--bs-brand-primary', '--bs-focus', '--bs-ui-border']) assert.match(foundation, new RegExp(`${token}:`));
  assert.match(foundation, /html\[data-bs-theme="dark"\]/);
  assert.match(accessibility, /@media \(forced-colors: active\)/);
  assert.match(accessibility, /:focus-visible/);
  assert.match(motion, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(system, /forced-color-adjust\s*:\s*none/i);
});

test('homepage keeps personal value before proof, explanation and Universe', () => {
  sourceOrder(homepage, ['personal-hero', 'boardsignal-live-proof', 'first-value-preview', 'THE BOARDSIGNAL UNIVERSE']);
  assert.match(username, /GET MY BOARDSIGNAL/);
  assert.match(username, /CONTINUE WITH GOOGLE/);
  assert.match(username, /OR EXPLORE THE PUBLIC UNIVERSE/);
  assert.doesNotMatch(homepage, /Founder beta|Fact Pack|Data Lab|seeded Desk/i);
});

test('returning-player access is Google-first and legacy recovery is progressively disclosed', () => {
  sourceOrder(login, ['RETURN TO MY BOARDSIGNAL', 'GoogleAccessButton', 'return-recovery-details']);
  assert.match(login, /Pick up where you left off/);
  assert.match(login, /Other sign-in or recovery options/);
  assert.match(login, /FoundingBetaAccessPanel/);
  assert.doesNotMatch(login, />Development access<[^]*return-recovery-details/);
});

test('install experience answers web-app-store confusion on Chromium and iOS after engagement', () => {
  assert.match(install, /PWA_ENGAGED_KEY/);
  assert.match(install, /pathname\.startsWith\("\/boardsignal\/player-room"\)/);
  assert.match(install, /beforeinstallprompt/);
  assert.match(install, /isIosInstallCandidate/);
  assert.match(install, /Add to Home Screen/);
  assert.match(install, /You do not need the App Store or Play Store/);
  assert.match(install, /No app store is required/);
  assert.match(installLib, /isStandaloneBoardSignal/);
  assert.match(installLib, /14 \* 24 \* 60 \* 60 \* 1000/);
});

test('engagement styling distinguishes actionable state from neutral counts', () => {
  assert.match(system, /\.bs-state-banner\.is-success/);
  assert.match(system, /\.bs-state-banner\.is-warning/);
  assert.match(system, /\.bs-state-banner\.is-error/);
  assert.match(system, /\.bs-neutral-count/);
  const navStart = room.indexOf('function RoomNav');
  const navEnd = room.indexOf('function FirstRoomDiscovery');
  const nav = room.slice(navStart, navEnd);
  assert.match(nav, /unreadCount > 0/);
  assert.match(nav, /friendRequestCount > 0/);
  assert.doesNotMatch(nav, /suggestedPlayerCount|officialPlayerCount|reviewsProduced|playersServed/);
});

test('motion remains state-based and reduced-motion safe', () => {
  assert.match(motion, /Motion explains meaningful state change/);
  assert.match(motion, /bs-motion-review-ready/);
  assert.match(motion, /bs-motion-unread-change/);
  assert.match(motion, /bs-motion-engine-active/);
  assert.match(motion, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(motion, /marquee|ticker[^\n]*animation|scan[^\n]*infinite|breathe[^\n]*infinite/i);
});

test('contrast command validates the active imported cascade', () => {
  assert.match(pkg.scripts['test:contrast'], /check-boardsignal-cascade\.mjs/);
  assert.match(cascadeCheck, /cssImports\(entryPath\)/);
  assert.match(cascadeCheck, /light/);
  assert.match(cascadeCheck, /dark/);
  assert.match(cascadeCheck, /system-dark/);
  for (const state of ['placeholder', 'focus', 'disabled', 'selected', 'unread', 'offline', 'saved offline', 'Review forming', 'loading', 'success', 'warning', 'error', 'badge', 'input']) assert.match(cascadeCheck, new RegExp(state, 'i'));
  assert.match(cascadeCheck, /forced colours/);
  assert.match(cascadeCheck, /reduced motion/);
});
