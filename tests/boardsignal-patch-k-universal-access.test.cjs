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
const betaRequests = read('src/lib/boardsignal/server/betaRequests.ts');
const activation = read('src/lib/boardsignal/server/activation.ts');
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
  assert.match(googleServer, /identities\?\.\["google\.com"\]/);
  assert.match(googleServer, /playerIdentityAliases/);
  assert.match(googleServer, /google_player_/);
  assert.match(googleServer, /createCustomToken\(account\.uid/);
  assert.match(googleServer, /GOOGLE_ACCESS_MAPPING_MISMATCH/);
  assert.match(googleServer, /Accounts are never merged automatically/);
  assert.doesNotMatch(googleServer, /listUsers|collection\("users"\)\.get\(|createUser\(/);
  assert.doesNotMatch(section(googleServer, 'export async function linkGoogleAccess', 'export async function returnWithGoogle'), /identityStatus:\s*"oauth_verified"|publicPlayerPage:\s*true|universeCoverage:\s*true/);
  assert.match(account, /googleAccessConnectedAt\?: string/);
});

test('Google link and return preserve the same UID and do not migrate Reviews, Journal or Progress', () => {
  const linked = section(googleServer, 'export async function linkGoogleAccess', 'export async function returnWithGoogle');
  const returned = section(googleServer, 'export async function returnWithGoogle', 'async function notifyFounderIdentityConflict');
  assert.match(linked, /const userRef = db\.collection\("users"\)\.doc\(playerToken\.uid\)/);
  assert.match(returned, /createCustomToken\(account\.uid/);
  assert.match(usernameForm, /stableFirebaseUidForPlayerId\(confirmation\.playerId\)/);
  assert.match(usernameForm, /credentialMatchesExpectedUid\(expectedUid, signed\.user\.uid\)/);
  for (const privateSurface of ['collection("desks")', 'reviewJournal', 'reviewHistoryBackfill', 'currentEpisodeSummary', 'recursiveDelete']) {
    assert.doesNotMatch(linked, new RegExp(privateSurface.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(returned, new RegExp(privateSurface.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('return is bounded, active-only and cannot revive revoked access', () => {
  const returned = section(googleServer, 'export async function returnWithGoogle', 'async function notifyFounderIdentityConflict');
  assert.match(returned, /subjectRef\.get\(\)/);
  assert.match(returned, /userRef\.get\(\)/);
  assert.match(returned, /playerRef\.get\(\)/);
  assert.match(googleServer, /account\.accessStatus !== "active" \|\| account\.identityStatus === "revoked"/);
  assert.match(googleServer, /GOOGLE_LAST_USED_WRITE_INTERVAL_MS = 24/);
  assert.doesNotMatch(returned, /collection\("users"\)\.where|collection\("users"\)\.get/);
  assert.match(googleRoute, /action === "return"/);
});

test('new player is username first, confirmed on the same page, then opens private BoardSignal with optional Google', () => {
  assert.match(usernameForm, /Chess\.com username/);
  assert.match(usernameForm, /SHOW ME MY REVIEW/);
  assert.match(usernameForm, /WE FOUND YOU/);
  assert.match(usernameForm, /preview\.games/);
  assert.match(usernameForm, /OPEN MY BOARDSIGNAL/);
  assert.match(usernameForm, /CONTINUE WITH GOOGLE/);
  assert.match(usernameForm, /CONTINUE WITHOUT GOOGLE/);
  assert.match(usernameForm, /Private\. Saved\. No Chess\.com password required\./);
  assert.match(usernameForm, /Google is a BoardSignal return key/);
  assert.doesNotMatch(usernameForm, /window\.location\.assign\(`\/boardsignal\/preview|router\.(?:push|replace)\(`\/boardsignal\/preview/);
  assert.match(usernameForm, /action: "claim"/);
  assert.match(usernameForm, /router\.replace\(`\/boardsignal\/player-room/);
  assert.match(login, /RETURN TO MY BOARDSIGNAL/);
  assert.match(login, /GoogleAccessButton/);

  const ordinaryCopy = [usernameForm, login, profile].join('\n');
  assert.doesNotMatch(ordinaryCopy, /PROVISIONAL PLAYER|PENDING FOUNDER REVIEW|PREVIEW ACTIVE|WAITING FOR APPROVAL|FOUNDER WILL REVIEW YOU/i);
});

test('existing-account collision requires Google plus explicit case contact and never opens private data', () => {
  assert.match(usernameForm, /THIS BOARDSIGNAL ALREADY EXISTS/);
  assert.match(usernameForm, /I NEED ACCESS TO THIS CHESS\.COM PROFILE/);
  assert.match(googleButton, /caseContactMethod/);
  assert.match(googleButton, /caseContactValue/);
  assert.match(googleButton, /<option value="email">Email<\/option>/);
  assert.match(googleButton, /<option value="discord">Discord<\/option>/);
  assert.match(googleButton, /This contact is for this identity case only/);
  assert.match(googleButton, /action: "identityHelp"/);
  assert.match(googleRoute, /did not grant, replace, merge, transfer or expose a private BoardSignal account/);

  const identityHelp = section(googleServer, 'export async function requestGoogleIdentityHelp');
  assert.match(identityHelp, /collection\("exceptions"\)/);
  assert.match(identityHelp, /GOOGLE_IDENTITY_CONFLICT/);
  assert.match(identityHelp, /identityConflictOpen: true/);
  assert.match(identityHelp, /chesscom_message/);
  assert.match(identityHelp, /BOARDSIGNAL_FOUNDER_CHESSCOM_USERNAME/);
  assert.match(identityHelp, /public_profile/);
  assert.match(identityHelp, /notifyFounderIdentityConflict/);
  assert.doesNotMatch(identityHelp, /createCustomToken|signInWithCustomToken/);
  assert.doesNotMatch(identityHelp, /transaction\.set\(subjectRef|google_access_player/);
  assert.match(founderOperations, /account\.identityConflictOpen === true/);
  assert.match(founderOperations, /identityConflict: identityConflict\(account\)/);
});

test('Founder notifications are exception-only in the normal K journey', () => {
  const submitRequest = section(betaRequests, 'export async function submitFoundingBetaRequest', 'export async function retryFoundingBetaPreview');
  const instantClaim = section(activation, 'export async function claimProvisionalBetaPreview', 'export async function claimBetaPreviewAccess');
  const identityHelp = section(googleServer, 'export async function requestGoogleIdentityHelp');
  assert.doesNotMatch(submitRequest, /notifyFounderOfBetaRequest/);
  assert.doesNotMatch(instantClaim, /notifyFounderOfProvisionalClaim/);
  assert.match(identityHelp, /notifyFounderIdentityConflict/);
});

test('Google email convenience never silently grants contact, notification, marketing or Trustpilot consent', () => {
  assert.match(profile, /readGoogleEmailPrefill/);
  assert.match(profile, /if \(method === "email" && !contact\.trim\(\)\) setContact\(email\)/);
  assert.match(profile, /checked=\{consent\}/);
  assert.match(profile, /Google may pre-fill an email for convenience, but it never switches this consent on/);
  assert.match(profile, /email: emailContactReady \? notifications\.email : false/);
  assert.doesNotMatch(section(profile, 'async function connectGoogle', 'async function save'), /setConsent\(true\)|betaContactConsent:\s*true|email:\s*true/);
  assert.match(googleButton, /does not opt you into marketing, product notifications, Trustpilot invitations/);
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

test('safe Preview/status backend remains available while the ordinary journey no longer depends on understanding Preview', () => {
  assert.match(activation, /export async function claimProvisionalBetaPreview/);
  assert.match(activation, /export async function verifyBetaPreviewStatusCredential/);
  assert.match(betaRequests, /createBetaPreviewStatusCredential/);
  assert.match(usernameForm, /\/api\/boardsignal\/beta-preview\//);
  assert.match(preview, /BetaPreviewStatus/);
});

test('homepage proof is one cached aggregate product projection and never traffic theatre', () => {
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
  assert.doesNotMatch(homepage, /0\.0|0 reviews|Trustpilot/i);
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
