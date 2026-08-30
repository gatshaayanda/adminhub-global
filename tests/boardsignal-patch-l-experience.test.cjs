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
const homeProofRail = read('src/components/HomeProofRail.tsx');
const homeProofStyles = read('src/components/HomeProofRail.module.css');
const publicProof = read('src/lib/boardsignal/server/publicProof.ts');
const publicTrafficProof = read('src/lib/boardsignal/server/publicTrafficProof.ts');
const trustpilotBridge = read('src/components/TrustpilotInvitationBridge.tsx');
const trustpilotRoute = read('src/app/api/boardsignal/trustpilot-invitation/route.ts');
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
const qaPage = read('src/app/boardsignal/qa/onboarding/page.tsx');
const qaProbe = read('src/components/OnboardingQaProbe.tsx');
const renderQa = read('scripts/check-boardsignal-onboarding-render.mjs');
const workflow = read('.github/workflows/boardsignal-patch-l-guard.yml');
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

test('homepage has one obvious private entry followed by compact proof, explanation and Universe', () => {
  sourceOrder(homepage, ['personal-hero', 'hero-username-card', '<HomeProofRail', 'homepage-universe-entry', 'first-value-preview', 'THE BOARDSIGNAL UNIVERSE']);
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

test('homepage credibility uses every strong public stat while keeping product and audience truth distinct', () => {
  assert.match(homepage, /loadPublicBoardSignalProof/);
  assert.match(homepage, /loadPublicBoardSignalTrafficProof/);
  assert.match(homepage, /HomeProofRail/);
  assert.match(homeProofRail, /PUBLIC_PROOF_MINIMUM = 20/);
  assert.match(homeProofRail, /proof\.activePlayers/);
  assert.match(homeProofRail, /proof\.reviewsForming/);
  assert.match(homeProofRail, /proof\.reviewsProduced/);
  assert.match(homeProofRail, /proof\.playersServed/);
  assert.match(homeProofRail, /proof\.retentionReviews/);
  assert.match(homeProofRail, /active player accounts/);
  assert.match(homeProofRail, /Reviews are forming now/);
  assert.match(homeProofRail, /Reviews completed across/);
  assert.match(homeProofRail, /retention Review records from ongoing player history/);
  assert.match(homeProofRail, /site visitors/);
  assert.match(homeProofRail, /page views/);
  assert.match(homeProofRail, /last 30 days/);
  assert.match(homeProofRail, /anonymous aggregated Vercel Web Analytics — not player accounts/);
  assert.match(homeProofRail, /BoardSignal is on Trustpilot through Admin Hub/);
  assert.match(homeProofRail, /CHECK OUR TRUSTPILOT PROFILE/);
  assert.match(homeProofRail, /not filtered by rating or sentiment/);
  assert.match(homeProofRail, /https:\/\/www\.trustpilot\.com\/review\/adminhub-global\.com/);
  assert.match(publicProof, /activePlayers: count\(metrics\.activePlayers\)/);
  assert.match(publicProof, /reviewsForming: count\(metrics\.reviewsForming\)/);
  assert.match(publicProof, /reviewsProduced: count\(validation\.totalReviewsProduced\)/);
  assert.match(publicProof, /playersServed: count\(validation\.playersServed\)/);
  assert.match(publicProof, /retentionReviews: count\(validation\.verifiedReviews\)/);
  assert.match(publicTrafficProof, /getFounderTraffic\(30\)/);
  assert.match(publicTrafficProof, /visitors30d/);
  assert.match(publicTrafficProof, /pageviews30d/);
  assert.doesNotMatch(publicTrafficProof, /BOARDSIGNAL_VERCEL_ANALYTICS_TOKEN/);
  assert.doesNotMatch(homeProofRail, /returningPlayers|R2\+|R3\+|R4\+/i);
  assert.doesNotMatch(homeProofRail, /TrustScore|Trustpilot rating|stars? out of|\b0\.0\b|\b0 reviews\b/i);
  assert.doesNotMatch([homepage, homeProofRail].join('\n'), /\b87\b|\b72\b|\b49\b|\b41\b|\b44\b|\b365\b|\b2335\b|2,335/);
});

test('homepage proof stays editorial instead of cloning the Founder dashboard', () => {
  assert.match(homeProofRail, /storyList/);
  assert.match(homeProofRail, /data-proof-story/);
  assert.match(homeProofRail, /trustPanel/);
  assert.doesNotMatch(homeProofRail, /styles\.metrics|styles\.metric\b|metricTop/);
  assert.doesNotMatch(homeProofStyles, /\.metrics\s*\{|\.metric\s*\{/);
});

test('homepage proof motion is compositor-safe, one-shot and reduced-motion safe', () => {
  assert.match(homeProofStyles, /@keyframes proofRailEnter/);
  assert.match(homeProofStyles, /@keyframes proofStoryEnter/);
  assert.match(homeProofStyles, /@keyframes proofTrustEnter/);
  assert.match(homeProofStyles, /opacity/);
  assert.match(homeProofStyles, /transform/);
  assert.match(homeProofStyles, /--proof-delay/);
  assert.match(homeProofStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(homeProofStyles, /animation[^;]*infinite/i);
  assert.doesNotMatch(homeProofStyles, /@keyframes[^}]*\b(?:width|height|top|left|margin|padding)\s*:/i);
});

test('Trustpilot invitation stays post-experience, fair and non-selective', () => {
  assert.match(layout, /TrustpilotInvitationBridge/);
  assert.match(layout, /invitejs\.trustpilot\.com\/tp\.min\.js/);
  assert.match(trustpilotBridge, /saved\?\.desks\?\.length/);
  assert.match(trustpilotRoute, /account\.accessStatus !== "active"/);
  assert.match(trustpilotRoute, /reviewProduction\?\.totalReviews \?\? 0\) < 1/);
  assert.match(trustpilotRoute, /BOARD_SIGNAL_ROLLING_INVITATION_LIMIT = 45/);
  assert.match(trustpilotRoute, /canonicalUsername\?\.trim\(\)\.toLowerCase\(\) === FOUNDER_USERNAME/);
  assert.doesNotMatch(trustpilotRoute, /starRating|trustScore|positiveExperience|negativeExperience|sentiment|feedbackScore/i);
  assert.doesNotMatch(trustpilotBridge, /starRating|trustScore|positiveExperience|negativeExperience|sentiment|feedbackScore/i);
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

test('real Chrome QA covers proof plus every onboarding state at desktop and phone widths', () => {
  assert.match(qaPage, /HomeProofRail/);
  assert.match(qaPage, /QA_PROOF/);
  assert.match(qaPage, /QA_TRAFFIC/);
  assert.match(qaProbe, /data-boardsignal-home-proof/);
  assert.match(qaProbe, /inspectReadableBox\(proof/);
  for (const state of ['google', 'username', 'profile', 'collision']) assert.match(renderQa, new RegExp(state));
  for (const width of ['320', '360', '375', '390', '412', '430', '1365']) assert.match(renderQa, new RegExp(width));
  assert.match(renderQa, /BOARD_SIGNAL_ONBOARDING_RENDER_PASS/);
  assert.match(workflow, /Render onboarding in real Chrome at desktop and mobile widths/);
  assert.match(workflow, /npm run dev -- -p 3100/);
  assert.match(workflow, /check-boardsignal-onboarding-render\.mjs/);
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
  assert.match(homeProofStyles, /@keyframes proofStoryEnter/);
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
