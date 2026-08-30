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
const homepageStyles = read('src/app/page.module.css');
const username = read('src/components/UsernameDeskForm.tsx');
const usernameStyles = read('src/components/UsernameDeskForm.module.css');
const login = read('src/components/ChessComLoginPanel.tsx');
const googleButton = read('src/components/GoogleSignInButton.tsx');
const googleClient = read('src/lib/boardsignal/client/googleAccess.ts');
const header = read('src/components/Header.tsx');
const install = read('src/components/InstallPrompt.tsx');
const installLib = read('src/lib/boardsignal/offline/install.ts');
const room = read('src/components/BoardSignalPlayerRoom.tsx');
const offlineRoom = read('src/components/OfflinePlayerRoom.tsx');
const liveUnavailable = read('src/components/LiveDataUnavailablePlayerRoom.tsx');
const pkg = JSON.parse(read('package.json'));
const contrastEntry = read('scripts/check-boardsignal-contrast.mjs');
const cascadeCheck = read('scripts/check-boardsignal-cascade.mjs');
const vercel = JSON.parse(read('vercel.json'));

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

test('homepage has one obvious private entry before proof, explanation and Universe', () => {
  sourceOrder(homepage, ['personal-hero', 'boardsignal-social-proof', 'homepage-universe-entry', 'first-value-preview', 'THE BOARDSIGNAL UNIVERSE']);
  assert.match(username, /GET MY BOARDSIGNAL/);
  assert.match(username, /GoogleSignInButton/);
  assert.match(username, /action: "return"/);
  assert.match(username, /Already have BoardSignal\?/);
  assert.match(username, /New here\?/);
  assert.doesNotMatch(username, /OR EXPLORE THE PUBLIC UNIVERSE|EXPLORE PUBLIC BOARDSIGNAL|public-universe-username-form|\/boardsignal\/build\//);
  assert.doesNotMatch(homepage, /ChessComLoginPanel|home-player-room-entry/);
  assert.match(homepage, /Explore the Universe/);
  assert.doesNotMatch(homepage, /Founder beta|Fact Pack|Data Lab|seeded Desk/i);
});

test('homepage credibility leads with meaningful proof and masks weak returning-player counts', () => {
  assert.match(homepage, /liveProof\?\.playersServed/);
  assert.match(homepage, /liveProof\?\.reviewsProduced/);
  assert.match(homepage, /liveProof\?\.returningPlayers/);
  assert.match(homepage, /RETURNING_PLAYER_PROOF_THRESHOLD = 20/);
  assert.match(homepage, /Reviews?[^\n]*completed across/);
  assert.match(homepage, /Read independent reviews on Trustpilot/);
  assert.match(homepage, /https:\/\/www\.trustpilot\.com\/review\/adminhub-global\.com/);
  assert.match(homepage, /UsersRound/);
  assert.match(system, /\.boardsignal-social-proof/);
  assert.match(system, /bs-proof-sheen/);
  assert.match(homepageStyles, /\.proofSentence/);
  assert.match(homepageStyles, /\.trustLink/);
  assert.doesNotMatch(system.slice(system.indexOf('@keyframes bs-proof-sheen'), system.indexOf('.boardsignal-social-proof-mark')), /infinite/i);
  assert.match(system, /prefers-reduced-motion[\s\S]*boardsignal-social-proof::after/);
  assert.doesNotMatch(homepage, /liveProof\.reviewsForming|REAL BOARDSIGNAL PRODUCT PROOF|Players served|Reviews produced|Returning players|Reviews forming|BoardSignal product activity only|Vercel visitors|pageviews/i);
  assert.doesNotMatch(homepage, /\b49\b|\b72\b|\b8\b/);
});

test('one Google action resolves returning players before starting new-player username onboarding', () => {
  assert.match(username, /action: "return"/);
  assert.match(username, /GOOGLE_ACCESS_NOT_LINKED/);
  assert.match(username, /signInWithCustomToken/);
  assert.match(username, /router\.replace\("\/boardsignal\/player-room\?source=google&tab=desk"\)/);
  assert.match(username, /Now connect your Chess\.com profile\./);
  assert.match(username, /YES — THIS IS MINE/);
  assert.match(login, /Other sign-in or recovery options/);
  assert.match(login, /FoundingBetaAccessPanel/);
  const recoveryStart = login.indexOf('return-recovery-details');
  const developmentStart = login.indexOf('Development access');
  assert.ok(recoveryStart >= 0 && developmentStart > recoveryStart, 'development access must stay inside progressive recovery disclosure');
});

test('new-player confirmation and identity-conflict states use a dedicated responsive app layout', () => {
  assert.match(username, /OnboardingSteps/);
  assert.match(username, /EXISTING BOARDSIGNAL FOUND/);
  assert.match(username, /I still need help recovering this account/);
  assert.match(username, /details className=\{styles\.helpDetails\}/);
  assert.doesNotMatch(username, /beta-request-success|boardsignal-inline-confirmation|activation-request-form|beta-universe-disclosure/);
  assert.match(usernameStyles, /\.card\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(usernameStyles, /\.steps\s*\{[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(usernameStyles, /\.actions\s*\{[\s\S]*flex-wrap:\s*wrap/);
  assert.match(usernameStyles, /\.helpForm\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(usernameStyles, /@media \(max-width: 680px\)[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(homepageStyles, /\.heroGrid\s*\{[\s\S]*minmax\(0, 1\.08fr\)[\s\S]*minmax\(20rem, \.92fr\)/);
  assert.match(homepageStyles, /@media \(max-width: 980px\)[\s\S]*\.heroGrid[\s\S]*minmax\(0, 1fr\)/);
});

test('Google entry uses a recognizable Google identity button instead of BoardSignal CTA styling', () => {
  assert.match(googleButton, /Continue with Google/);
  for (const colour of ['#4285F4', '#34A853', '#FBBC05', '#EA4335']) assert.match(googleButton, new RegExp(colour, 'i'));
  assert.doesNotMatch(googleButton, /className="button(?:\s|\")/);
  assert.doesNotMatch(googleButton, /ArrowRight/);
  assert.match(system, /\.google-signin-button/);
  assert.match(system, /#747775/i);
  assert.match(system, /#131314/i);
  assert.match(system, /#8e918f/i);
  assert.match(system, /Google Sans/);
  assert.doesNotMatch(system.slice(system.indexOf('.google-signin-button'), system.indexOf('.google-entry-paths')), /var\(--bs-lime\)|button-lime/);
});

test('Google failures stay player-facing and never expose Firebase configuration instructions', () => {
  assert.match(googleClient, /auth\/unauthorized-domain/);
  assert.match(googleClient, /temporarily unavailable on this address/);
  assert.doesNotMatch(googleClient, /Firebase Authentication|Authorized domains|Authentication →|Sign-in method|Enable Google|Firebase\./i);
});

test('Universe is the permanent public-world navigation noun', () => {
  assert.match(header, /label: "Universe", href: "\/feed"/);
  assert.doesNotMatch(header, /Around BoardSignal/);
});

test('return and recovery layout cannot collapse into a one-character column', () => {
  assert.match(system, /\.chesscom-login-panel\s*\{[\s\S]*grid-template-columns:\s*auto minmax\(16rem, 1fr\) minmax\(15rem, 23rem\)/);
  assert.match(system, /\.chesscom-login-copy,[\s\S]*\.chesscom-login-actions[\s\S]*min-width:\s*0/);
  assert.match(system, /@media \(max-width: 980px\)[\s\S]*\.chesscom-login-panel \{ grid-template-columns: auto minmax\(0, 1fr\); \}/);
  assert.match(system, /@media \(max-width: 680px\)[\s\S]*\.chesscom-login-panel \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(system, /overflow-wrap:\s*break-word/);
  assert.match(system, /word-break:\s*normal/);
  assert.match(usernameStyles, /overflow:\s*hidden/);
  assert.match(usernameStyles, /max-width:\s*100%/);
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

test('saved and live-unavailable Player Room preserve player language and shell continuity', () => {
  assert.match(offlineRoom, /type OfflineTab = "desk" \| "progress" \| "universe" \| "friends"/);
  assert.doesNotMatch(offlineRoom, /item === "pulse" \? "Pulse"/);
  assert.match(offlineRoom, /Review/);
  assert.match(offlineRoom, /Progress/);
  assert.match(offlineRoom, /Universe/);
  assert.match(offlineRoom, /Friends/);
  assert.match(offlineRoom, /Your first Review is your baseline/);
  assert.doesNotMatch(offlineRoom, /Firebase account|Stockfish completion/);
  assert.doesNotMatch(liveUnavailable, /Firestore's free daily allowance|free Firestore allowance/);
  assert.match(liveUnavailable, /LIVE DATA PAUSED/);
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
  assert.doesNotMatch(motion, /animation\s*:\s*[^;]*(?:scan|breathe)[^;]*infinite/i);
});

test('stable contrast command delegates to the active imported cascade validator', () => {
  assert.equal(pkg.scripts['test:contrast'], 'node scripts/check-boardsignal-contrast.mjs');
  assert.match(contrastEntry, /check-boardsignal-cascade\.mjs/);
  assert.match(cascadeCheck, /cssImports\(entryPath\)/);
  assert.match(cascadeCheck, /light/);
  assert.match(cascadeCheck, /dark/);
  assert.match(cascadeCheck, /system-dark/);
  for (const state of ['placeholder', 'focus', 'disabled', 'selected', 'unread', 'offline', 'saved offline', 'Review forming', 'loading', 'success', 'warning', 'error', 'badge', 'input']) assert.match(cascadeCheck, new RegExp(state, 'i'));
  assert.match(cascadeCheck, /forced colours/);
  assert.match(cascadeCheck, /reduced motion/);
});

test('Patch L branch explicitly opts out of automatic Vercel previews', () => {
  assert.equal(vercel.git?.deploymentEnabled?.['boardsignal-patch-l-experience-system-universe-engagement'], false);
  assert.equal(vercel.crons?.[0]?.path, '/api/cron/boardsignal-return');
});
