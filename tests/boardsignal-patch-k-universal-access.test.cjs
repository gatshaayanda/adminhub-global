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
const googleOnboarding = read('src/lib/boardsignal/server/googleOnboarding.ts');
const googleClient = read('src/lib/boardsignal/client/googleAccess.ts');
const googleRoute = read('src/app/api/boardsignal/google-access/route.ts');
const googleButton = read('src/components/GoogleAccessButton.tsx');
const googleBrandButton = read('src/components/GoogleSignInButton.tsx');
const usernameForm = read('src/components/UsernameDeskForm.tsx');
const profile = read('src/components/PlayerProfileNotifications.tsx');
const login = read('src/components/ChessComLoginPanel.tsx');
const room = read('src/components/BoardSignalPlayerRoom.tsx');
const friends = read('src/components/PlayerFriends.tsx');
const preview = read('src/components/BetaPreviewRoom.tsx');
const activation = read('src/lib/boardsignal/server/activation.ts');
const betaRequests = read('src/lib/boardsignal/server/betaRequests.ts');
const proof = read('src/lib/boardsignal/server/publicProof.ts');
const trafficProof = read('src/lib/boardsignal/server/publicTrafficProof.ts');
const proofRail = read('src/components/HomeProofRail.tsx');
const homepage = read('src/app/page.tsx');
const account = read('src/lib/boardsignal/account.ts');
const founderOperations = read('src/lib/boardsignal/server/founderOperations.ts');
const deletion = read('src/lib/boardsignal/server/accountDeletion.ts');
const agents = read('AGENTS.md');
const contract = read('BOARD_SIGNAL_PRODUCT_CONTRACT.md');
const pkg = JSON.parse(read('package.json'));

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `missing ${start}`);
  const to = end ? source.indexOf(end, from + start.length) : source.length;
  return source.slice(from, to < 0 ? source.length : to);
}

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('persona A — a new private player is Google first, then username, confirmation, stable private BoardSignal', () => {
  assert.match(usernameForm, /GET MY BOARDSIGNAL/);
  assert.match(usernameForm, /GoogleSignInButton/);
  assert.match(usernameForm, /Now connect your Chess\.com profile\./);
  assert.match(usernameForm, /OnboardingSteps/);
  assert.match(usernameForm, /action: "resolveProfile"/);
  assert.match(usernameForm, /IS THIS YOUR CHESS\.COM PROFILE\?/);
  assert.match(usernameForm, /YES — THIS IS MINE/);
  assert.match(usernameForm, /action: "claimProfile"/);
  assert.doesNotMatch(usernameForm, /CONTINUE WITHOUT GOOGLE/);
  assert.doesNotMatch(usernameForm, /\/api\/boardsignal\/beta-request|\/api\/boardsignal\/beta-preview/);

  assert.match(googleRoute, /action === "resolveProfile"/);
  assert.match(googleRoute, /action === "claimProfile"/);
  assert.match(googleOnboarding, /verifyGoogleAccessToken\(googleIdToken\)/);
  assert.match(googleOnboarding, /resolveChessComPlayer\(username\)/);
  assert.match(googleOnboarding, /firebaseUidForChessPlayer\(identity\.playerId\)/);
  assert.match(googleOnboarding, /createFoundingBetaAccount/);
  assert.match(googleOnboarding, /identityStatus: "provisional"/);
  assert.match(googleOnboarding, /publicPlayerPage: false/);
  assert.match(googleOnboarding, /universeCoverage: false/);
  assert.match(googleOnboarding, /createCustomToken\(result\.account\.uid/);
  assert.doesNotMatch(googleOnboarding, /buildLiveDesk|publishDesk|collection\("desks"\)/);
  assert.match(room, /!snapshot\.account\.googleAccessConnectedAt && !hasAcceptedCurrentBetaAgreement/);
});

test('persona B — public Universe stays available without a competing homepage username intake', () => {
  assert.doesNotMatch(usernameForm, /EXPLORE PUBLIC BOARDSIGNAL|OR EXPLORE THE PUBLIC UNIVERSE|public-universe-username-form|\/boardsignal\/build\//);
  assert.match(homepage, /THE BOARDSIGNAL UNIVERSE/);
  assert.match(homepage, /EXPLORE THE UNIVERSE|Explore the Universe/);
  assert.match(homepage, /Public positive highlights only|Private improvement guidance/);
  assert.doesNotMatch(usernameForm, /\/api\/boardsignal\/beta-request|claimProvisionalBetaPreview|openDirectReview/);
  assert.match(googleOnboarding, /verifyGoogleAccessToken\(googleIdToken\)/);
});

test('persona C — one Google entry returns an existing player to the exact mapped UID', () => {
  const returned = section(googleServer, 'export async function returnWithGoogle', 'async function notifyFounderIdentityConflict');
  assert.match(returned, /subjectRef\.get\(\)/);
  assert.match(returned, /userRef\.get\(\)/);
  assert.match(returned, /playerRef\.get\(\)/);
  assert.match(returned, /createCustomToken\(account\.uid/);
  assert.match(returned, /uid: account\.uid/);
  assert.match(usernameForm, /action: "return"/);
  assert.match(usernameForm, /GOOGLE_ACCESS_NOT_LINKED/);
  assert.match(usernameForm, /signInWithCustomToken/);
  assert.match(googleServer, /account\.accessStatus !== "active" \|\| account\.identityStatus === "revoked"/);
  assert.match(login, /Other sign-in or recovery options/);
});

test('persona D — legacy player connects Google additively with no Review, Journal, Progress or social migration', () => {
  const linked = section(googleServer, 'export async function linkGoogleAccess', 'export async function returnWithGoogle');
  assert.match(linked, /collection\("users"\)\.doc\(playerToken\.uid\)/);
  assert.match(linked, /googleAccessConnectedAt/);
  assert.match(profile, /CONNECT GOOGLE/);
  assert.match(account, /googleAccessConnectedAt\?: string/);
  for (const privateSurface of ['collection("desks")', 'reviewJournal', 'reviewHistoryBackfill', 'currentEpisodeSummary', 'conversations', 'friends', 'recursiveDelete']) {
    assert.doesNotMatch(linked, new RegExp(escaped(privateSurface)));
  }
  assert.match(deletion, /collection\("playerIdentityAliases"\)\.where\("uid", "==", uid\)/);
  assert.match(deletion, /collection\("playerIdentityAliases"\)\.where\("playerId", "==", playerId\)/);
});

test('persona E — collision fails closed and only creates a Google-authenticated identity dispute', () => {
  assert.match(googleOnboarding, /CHESS_PROFILE_ALREADY_HAS_BOARDSIGNAL/);
  assert.match(usernameForm, /EXISTING BOARDSIGNAL FOUND/);
  assert.match(usernameForm, /EXISTING PLAYER RECOVERY/);
  assert.match(usernameForm, /I still need help recovering this account/);
  assert.match(usernameForm, /REQUEST ACCOUNT HELP/);
  assert.match(usernameForm, /caseContactMethod/);
  assert.match(usernameForm, /caseContactValue/);
  assert.match(usernameForm, /identityHelp/);

  const identityHelp = section(googleServer, 'export async function requestGoogleIdentityHelp');
  assert.match(identityHelp, /verifyGoogleAccessToken/);
  assert.match(identityHelp, /identityCaseContact/);
  assert.match(identityHelp, /collection\("exceptions"\)/);
  assert.match(identityHelp, /GOOGLE_IDENTITY_CONFLICT/);
  assert.match(identityHelp, /identityConflictOpen: true/);
  assert.match(identityHelp, /chesscom_message/);
  assert.match(identityHelp, /public_profile/);
  assert.match(identityHelp, /notifyFounderIdentityConflict/);
  assert.doesNotMatch(identityHelp, /createCustomToken|transaction\.set\(subjectRef/);
  assert.match(founderOperations, /account\.identityConflictOpen === true/);
  assert.match(founderOperations, /identityConflict: identityConflict\(account\)/);
});

test('persona F — cancelling or failing Google does not create an orphan private claim', () => {
  for (const code of ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/unauthorized-domain', 'auth/operation-not-allowed', 'auth/network-request-failed']) {
    assert.match(googleClient, new RegExp(code.replace('/', '\\/')));
  }
  assert.match(googleClient, /inMemoryPersistence/);
  assert.match(googleClient, /finally \{[\s\S]*signOut\(googleAuth\)/);
  const beforeGoogle = section(usernameForm, 'async function startGoogle', 'async function resolveProfile');
  assert.match(beforeGoogle, /action: "return"/);
  assert.match(beforeGoogle, /GOOGLE_ACCESS_NOT_LINKED/);
  assert.doesNotMatch(beforeGoogle, /action: "claimProfile"|beta-request|createFoundingBetaAccount/);
});

test('persona G — social discovery reuses the existing suggested-player endpoint', () => {
  assert.match(friends, /\/api\/boardsignal\/social\?view=suggested/);
  assert.match(room, /\/api\/boardsignal\/social\?view=suggested/);
  assert.match(room, /suggestedPlayerCount/);
  assert.match(room, /DISCOVER PLAYERS/);
  assert.doesNotMatch(room, /new recommendation engine|recommendationScore|recommendedPlayersCollection/i);
});

test('persona H — numeric badges are only real unread or incoming actionable state', () => {
  const nav = section(room, 'function RoomNav', 'function FirstRoomDiscovery');
  assert.match(nav, /friendRequestCount > 0/);
  assert.match(nav, /incoming friend request/);
  assert.match(nav, /unreadCount > 0/);
  assert.doesNotMatch(nav, /suggestedPlayerCount|players represented|officialPlayerCount/);
  const discovery = section(room, 'function FirstRoomDiscovery', 'function CurrentEpisodeCard');
  assert.match(discovery, /suggestedPlayerCount/);
  assert.doesNotMatch(discovery, /unread-badge/);
});

test('persona I — Universe is the public-safe world and private guidance stays private', () => {
  assert.match(homepage, /THE BOARDSIGNAL UNIVERSE/);
  assert.match(room, /\{ id: "universe", label: "Universe" \}/);
  assert.match(room, /See what&apos;s happening across BoardSignal, discover players, and connect around the chess you&apos;re already playing/);
  assert.match(homepage, /Public positive highlights only/);
  assert.match(homepage, /Private improvement guidance/);
  assert.doesNotMatch(homepage, /WHAT I'LL TRY|FOLLOW-UP|privateNotes|engineResults/);
});

test('persona J — quotas stay bounded with no anonymous Review-generation or population scan', () => {
  assert.match(googleOnboarding, /GOOGLE_ONBOARDING_BUDGET/);
  assert.match(googleOnboarding, /transactionReads: 4/);
  assert.match(googleOnboarding, /writesWhenNew: 5/);
  assert.match(googleOnboarding, /privateReviewGeneration: 0/);
  assert.doesNotMatch(googleOnboarding, /collection\("users"\)\.get|listUsers|buildLiveDesk|collectionGroup/);
  assert.match(proof, /collection\("founderOperationsState"\)\.doc\("current"\)\.get\(\)/);
  assert.match(proof, /revalidate: 900/);
  assert.doesNotMatch(proof, /collection\("users"\)|collection\("desks"\)|api\.vercel\.com|VERCEL_ACCESS_TOKEN/i);
  assert.match(trafficProof, /getFounderTraffic\(30\)/);
  assert.match(trafficProof, /revalidate: 900/);
  assert.doesNotMatch(trafficProof, /collection\("users"\)|collection\("desks"\)|BOARDSIGNAL_VERCEL_ANALYTICS_TOKEN/i);
});

test('Journal and Progress remain on the stable BoardSignal UID across Google link and return', () => {
  const linked = section(googleServer, 'export async function linkGoogleAccess', 'export async function returnWithGoogle');
  const returned = section(googleServer, 'export async function returnWithGoogle', 'async function notifyFounderIdentityConflict');
  assert.match(linked, /userRef = db\.collection\("users"\)\.doc\(playerToken\.uid\)/);
  assert.match(returned, /createCustomToken\(account\.uid/);
  assert.match(room, /PlayerReviewJournal/);
  assert.match(room, /ProgressSection/);
  for (const operation of ['delete', 'recursiveDelete', 'reviewJournal', 'reviewHistoryBackfill', 'collection("desks")']) {
    assert.doesNotMatch(linked, new RegExp(escaped(operation)));
    assert.doesNotMatch(returned, new RegExp(escaped(operation)));
  }
});

test('normal copy no longer presents Preview or Founder approval as the new-user journey', () => {
  const ordinaryCopy = [usernameForm, homepage, login, profile, room].join('\n');
  assert.doesNotMatch(usernameForm, /BOARD SIGNAL PREVIEW|CONTINUE PREVIEW|FOUNDER REVIEW|WAITING FOR APPROVAL|CONTINUE WITHOUT GOOGLE/i);
  assert.doesNotMatch(ordinaryCopy, /PROVISIONAL PLAYER|PENDING FOUNDER REVIEW|PREVIEW ACTIVE|WAITING FOR APPROVAL|FOUNDER WILL REVIEW YOU/i);
  assert.match(activation, /export async function verifyBetaPreviewStatusCredential/);
  assert.match(activation, /export async function claimProvisionalBetaPreview/);
  assert.match(betaRequests, /createBetaPreviewStatusCredential/);
  assert.match(preview, /BetaPreviewStatus/);
});

test('homepage proof combines product truth, anonymous traffic and restrained independent reputation support', () => {
  assert.match(proof, /activePlayers/);
  assert.match(proof, /totalReviewsProduced/);
  assert.match(proof, /playersServed/);
  assert.match(proof, /reviewsForming/);
  assert.match(proof, /retentionReviews/);
  assert.match(homepage, /HomeProofRail/);
  assert.match(proofRail, /PUBLIC_PROOF_MINIMUM = 20/);
  assert.match(proofRail, /active player accounts/);
  assert.doesNotMatch(proofRail, /proof\.reviewsForming|Reviews are forming now/i);
  assert.match(proofRail, /Reviews completed across/);
  assert.match(proofRail, /retention Reviews from later player cycles/);
  assert.match(proofRail, /site visitors/);
  assert.match(proofRail, /page views/);
  assert.match(proofRail, /last 30 days/);
  assert.match(proofRail, /anonymous aggregated Vercel Web Analytics — not player accounts/);
  assert.match(proofRail, /BoardSignal is on Trustpilot through Admin Hub/);
  assert.match(proofRail, /CHECK OUR TRUSTPILOT PROFILE/);
  assert.match(proofRail, /not filtered by rating or sentiment/);
  assert.match(proofRail, /https:\/\/www\.trustpilot\.com\/review\/adminhub-global\.com/);
  assert.match(trafficProof, /visitors30d/);
  assert.match(trafficProof, /pageviews30d/);
  assert.doesNotMatch(proofRail, /returningPlayers|R2\+|R3\+|R4\+/i);
  assert.doesNotMatch(proofRail, /TrustScore|Trustpilot rating|stars? out of|\b0\.0\b|\b0 reviews\b/i);
  assert.doesNotMatch([homepage, proofRail].join('\n'), /\b87\b|\b72\b|\b49\b|\b41\b|\b44\b|\b365\b|\b2335\b|2,335/);
});

test('Google entry remains real Google auth and uses recognizable Google branding without changing identity security', () => {
  assert.match(googleClient, /GoogleAuthProvider/);
  assert.match(googleClient, /signInWithPopup/);
  assert.match(googleClient, /prompt: "select_account"/);
  assert.match(googleBrandButton, /Continue with Google/);
  for (const colour of ['#4285F4', '#34A853', '#FBBC05', '#EA4335']) assert.match(googleBrandButton, new RegExp(colour, 'i'));
  assert.doesNotMatch(googleBrandButton, /button-lime|ArrowRight/);
});

test('Google email and identity-case contact never silently grant product or Trustpilot consent', () => {
  assert.match(profile, /Google may pre-fill an email for convenience, but it never switches this consent on/);
  assert.match(profile, /checked=\{consent\}/);
  assert.match(usernameForm, /not marketing, notification or Trustpilot consent/);
  assert.match(googleButton, /does not opt you into marketing, product notifications, Trustpilot invitations/);
});

test('product contract and working rules describe the final Google-first private access model', () => {
  assert.match(agents, /new-private primary action is `Continue with Google`/);
  assert.match(agents, /Public Universe exploration remains available without authentication/);
  assert.match(contract, /first primary action is `Continue with Google`/);
  assert.match(contract, /Google identifies the BoardSignal requester but does not prove Chess\.com ownership/);
  assert.match(contract, /public Universe exploration remains available without authentication/i);
});

test('engine, Firestore browser rules and PWA service worker stay frozen', () => {
  assert.equal(pkg.scripts.prebuild, 'npm run prepare:stockfish && npm run test:contrast');
  assertBaselineFile('src/lib/boardsignal/quality.ts');
  assertBaselineFile('src/lib/boardsignal/processor.ts');
  assertBaselineFile('firestore.rules');
  assertBaselineFile('public/sw.js');
});
