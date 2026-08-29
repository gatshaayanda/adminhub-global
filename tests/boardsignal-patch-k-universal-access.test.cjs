const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const BASELINE_SHA = '2d528c38cd7441324cf98b472fb77db5def640c7';
const normalizeText = (value) => value.replace(/\r\n/g, '\n');
const assertBaselineFile = (file) => {
  const current = normalizeText(read(file));
  const baseline = normalizeText(execFileSync('git', ['show', `${BASELINE_SHA}:${file}`], { cwd: root, encoding: 'utf8' }));
  assert.equal(current, baseline, `${file} changed from frozen Patch K baseline ${BASELINE_SHA}`);
};

const googleServer = read('src/lib/boardsignal/server/googleAccess.ts');
const googleClient = read('src/lib/boardsignal/client/googleAccess.ts');
const googleRoute = read('src/app/api/boardsignal/google-access/route.ts');
const googleButton = read('src/components/GoogleAccessButton.tsx');
const usernameForm = read('src/components/UsernameDeskForm.tsx');
const profile = read('src/components/PlayerProfileNotifications.tsx');
const login = read('src/components/ChessComLoginPanel.tsx');
const preview = read('src/components/BetaPreviewRoom.tsx');
const proof = read('src/lib/boardsignal/server/publicProof.ts');
const homepage = read('src/app/page.tsx');
const account = read('src/lib/boardsignal/account.ts');
const founderOperations = read('src/lib/boardsignal/server/founderOperations.ts');
const deletion = read('src/lib/boardsignal/server/accountDeletion.ts');
const pkg = JSON.parse(read('package.json'));

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `missing ${start}`);
  const to = end ? source.indexOf(end, from + start.length) : source.length;
  return source.slice(from, to < 0 ? source.length : to);
}

test('Google is an additive BoardSignal return key on the canonical chesscom UID', () => {
  assert.match(googleServer, /verifyIdToken\(idToken, true\)/);
  assert.match(googleServer, /sign_in_provider/);
  assert.match(googleServer, /provider !== "google\.com"/);
  assert.match(googleServer, /playerIdentityAliases/);
  assert.match(googleServer, /google_player_/);
  assert.match(googleServer, /createCustomToken\(account\.uid/);
  assert.match(googleServer, /GOOGLE_ACCESS_MAPPING_MISMATCH/);
  assert.match(googleServer, /Accounts are never merged automatically/);
  assert.doesNotMatch(googleServer, /listUsers|collection\("users"\)\.get\(|createUser\(/);
  assert.doesNotMatch(section(googleServer, 'export async function linkGoogleAccess', 'export async function returnWithGoogle'), /identityStatus:\s*"oauth_verified"|publicPlayerPage:\s*true|universeCoverage:\s*true/);
  assert.match(account, /googleAccessConnectedAt\?: string/);
});

test('return is bounded, active-only and cannot revive revoked access', () => {
  const returned = section(googleServer, 'export async function returnWithGoogle', 'export async function requestGoogleIdentityHelp');
  assert.match(returned, /subjectRef\.get\(\)/);
  assert.match(returned, /userRef\.get\(\)/);
  assert.match(returned, /playerRef\.get\(\)/);
  assert.match(googleServer, /account\.accessStatus !== "active" \|\| account\.identityStatus === "revoked"/);
  assert.match(googleServer, /GOOGLE_LAST_USED_WRITE_INTERVAL_MS = 24/);
  assert.doesNotMatch(returned, /collection\("users"\)\.where|collection\("users"\)\.get/);
  assert.match(googleRoute, /action === "return"/);
});

test('existing-account collision never opens private data and routes to identity attention', () => {
  assert.match(usernameForm, /I NEED ACCESS TO MY CHESS\.COM PROFILE/);
  assert.match(usernameForm, /expectedPlayerId=/);
  assert.match(googleButton, /action: "identityHelp"/);
  assert.match(googleRoute, /did not grant, replace, merge or expose a private BoardSignal account/);
  assert.match(googleServer, /identityConflictOpen: true/);
  assert.match(founderOperations, /account\.identityConflictOpen === true/);
  assert.match(founderOperations, /identityConflict: identityConflict\(account\)/);
  assert.doesNotMatch(section(googleServer, 'export async function requestGoogleIdentityHelp'), /createCustomToken|signInWithCustomToken/);
});

test('Google email convenience never silently grants contact or notification consent', () => {
  assert.match(profile, /readGoogleEmailPrefill/);
  assert.match(profile, /if \(method === "email" && !contact\.trim\(\)\) setContact\(email\)/);
  assert.match(profile, /checked=\{consent\}/);
  assert.match(profile, /Google may pre-fill an email for convenience, but it never switches this consent on/);
  assert.match(profile, /email: emailContactReady \? notifications\.email : false/);
  assert.doesNotMatch(section(profile, 'async function connectGoogle', 'async function save'), /setConsent\(true\)|betaContactConsent:\s*true|email:\s*true/);
});

test('Google popup errors are finite and actionable, including the exact unauthorized hostname', () => {
  for (const code of ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/unauthorized-domain', 'auth/operation-not-allowed', 'auth/network-request-failed']) {
    assert.match(googleClient, new RegExp(code.replace('/', '\\/')));
  }
  assert.match(googleClient, /window\.location\.hostname/);
  assert.match(googleButton, /finally \{\s*setBusy\(false\)/);
  assert.match(googleClient, /inMemoryPersistence/);
  assert.match(googleClient, /GOOGLE_ACCESS_APP_NAME/);
});

test('new first value remains username-first and Google remains optional', () => {
  assert.match(usernameForm, /Chess\.com username/);
  assert.match(usernameForm, /SHOW ME MY REVIEW/);
  assert.match(usernameForm, /Google is optional and comes after first private value/);
  assert.match(preview, /Continue to My BoardSignal/);
  assert.match(preview, /Google is optional and can be connected later as a return key/);
  assert.doesNotMatch(preview, /FOUNDER REVIEW/);
  assert.doesNotMatch(preview, /setInterval\(/);
  assert.match(login, /CONTINUE WITH GOOGLE|GoogleAccessButton/);
});

test('homepage proof is one cached aggregate projection and never traffic theatre', () => {
  assert.match(proof, /collection\("founderOperationsState"\)\.doc\("current"\)\.get\(\)/);
  assert.match(proof, /revalidate: 900/);
  assert.match(proof, /totalReviewsProduced/);
  assert.match(proof, /r2Plus/);
  assert.doesNotMatch(proof, /collection\("users"\)|collection\("desks"\)|fetch\(|api\.vercel\.com|VERCEL_ACCESS_TOKEN/i);
  assert.match(homepage, /Players served/);
  assert.match(homepage, /Reviews produced/);
  assert.match(homepage, /Reviews forming/);
  assert.match(homepage, /Returning players/);
  assert.match(homepage, /not site visitors or live-viewer theatre/);
});

test('engagement channels stay independent and Discord is optional', () => {
  assert.match(profile, /BrowserPushControl/);
  assert.match(profile, /JOIN THE BOARDSIGNAL DISCORD/);
  assert.match(homepage, /JOIN THE BOARDSIGNAL DISCORD/);
  assert.match(homepage, /discord\.gg\/CrWy3qJQtg|BOARDSIGNAL_SUPPORT_DISCORD_URL/);
  assert.match(profile, /Discord is never required for access and is not identity proof/);
  assert.doesNotMatch(profile, /guilds\.join|DiscordAuthProvider|discord oauth/i);
});

test('Google aliases remain inside existing full-account deletion lifecycle', () => {
  assert.match(googleServer, /collection\("playerIdentityAliases"\)/);
  assert.match(deletion, /collection\("playerIdentityAliases"\)\.where\("uid", "==", uid\)/);
  assert.match(deletion, /collection\("playerIdentityAliases"\)\.where\("playerId", "==", playerId\)/);
});

test('engine, Firestore browser rules and PWA service worker stay frozen', () => {
  assert.equal(pkg.scripts.prebuild, 'npm run prepare:stockfish && npm run test:contrast');
  assertBaselineFile('src/lib/boardsignal/quality.ts');
  assertBaselineFile('src/lib/boardsignal/processor.ts');
  assertBaselineFile('firestore.rules');
  assertBaselineFile('public/sw.js');
});
