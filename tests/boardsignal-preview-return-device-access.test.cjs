const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const BASELINE_SHA = 'b24191dca59c0ce5c33631c414745df4f17d02d7';
const normalizeText = (value) => value.replace(/\r\n/g, '\n');
const assertBaselineFile = (file) => {
  const current = normalizeText(read(file));
  const baseline = normalizeText(execFileSync('git', ['show', `${BASELINE_SHA}:${file}`], { cwd: root, encoding: 'utf8' }));
  assert.equal(current, baseline, `${file} changed from locked baseline ${BASELINE_SHA}`);
};
const pkg = JSON.parse(read('package.json'));
const requestForm = read('src/components/UsernameDeskForm.tsx');
const homepage = read('src/app/page.tsx');
const previewRoom = read('src/components/BetaPreviewRoom.tsx');
const previewRuntime = read('src/lib/boardsignal/previewRuntime.mjs');
const previewReturn = read('src/lib/boardsignal/previewReturn.ts');
const activation = read('src/lib/boardsignal/activation.ts');
const serverActivation = read('src/lib/boardsignal/server/activation.ts');
const betaRequests = read('src/lib/boardsignal/server/betaRequests.ts');
const previewRoute = read('src/app/api/boardsignal/beta-preview/[requestId]/route.ts');
const browserPush = read('src/components/BrowserPushControl.tsx');
const profile = read('src/components/PlayerProfileNotifications.tsx');
const firestore = read('firestore.rules');
const sw = read('public/sw.js');
const css = read('src/app/globals.css');

function section(source, start, end) {
  const from = source.indexOf(start);
  if (from < 0) throw new Error(`missing ${start}`);
  const to = end ? source.indexOf(end, from + start.length) : source.length;
  return source.slice(from, to < 0 ? source.length : to);
}
function all(source, parts) { return parts.every((part) => typeof part === 'string' ? source.includes(part) : part.test(source)); }

const updateReturn = section(betaRequests, 'export async function updateFoundingBetaReturnPreference', 'export async function listFoundingBetaRequests');
const approval = section(betaRequests, 'export async function approveFoundingBetaRequest', 'export async function confirmFoundingBetaIdentity');
const provisionalClaim = section(serverActivation, 'export async function claimProvisionalBetaPreview', 'export async function claimBetaPreviewAccess');
const registerDevice = section(serverActivation, 'export async function registerBetaPreviewNotificationDevice', 'export async function notifyApprovedBetaPreviewDevice');
const openRoom = section(previewRoom, 'async function openPlayerRoom', 'async function leaveOtherPlayerForRecovery');
const previewType = section(activation, 'export type BoardSignalBetaPreview', 'export type BetaActivationReturnMethod');

test('Patch K normal private entry is one Google action while public Universe remains open', () => {
  assert.ok(all(requestForm, ['GoogleSignInButton', 'action: "return"', 'New to BoardSignal?', 'Already have BoardSignal?', 'What&apos;s your Chess.com username?']));
  assert.ok(requestForm.includes('GOOGLE_ACCESS_NOT_LINKED'));
  assert.ok(!/OR EXPLORE THE PUBLIC UNIVERSE|EXPLORE PUBLIC BOARDSIGNAL|public-universe-username-form|\/boardsignal\/build\//.test(requestForm));
  assert.ok(all(homepage, ['Explore the Universe', 'No sign-in required.']));
  assert.ok(!requestForm.includes('/boardsignal/preview/${encodeURIComponent(requestId)}'));
});

test('legacy Preview remains public-safe and can enter provisional private access immediately', () => {
  assert.ok(all(previewRoom, ['Your private BoardSignal is ready to open now.', 'Continue to My BoardSignal', 'previewCanContinue(status)']));
  assert.ok(previewRuntime.includes('status?.state === "preview_ready" && status.provisionalAccessReady === true'));
  assert.ok(serverActivation.includes('provisionalAccessReady: status === "pending" && !provisionalClaimedAt'));
  assert.ok(all(provisionalClaim, ['identityStatus: "provisional"', 'identityReviewStatus: "pending"', 'accessStatus: "active"', 'activationDevice: null']));
  assert.ok(all(activation, ['"red"', '"amber"', '"blue"', '"evidence"']) && !/preferredContact|betaContactConsent|activationDevice|fcm/i.test(previewType));
});

test('Preview no longer asks for notification permission before value or private entry', () => {
  assert.ok(!previewRoom.includes('Notification.requestPermission'));
  assert.ok(all(openRoom, ['Notification.permission === "granted"', 'registerBoardSignalBrowserPush(idToken)']));
  assert.ok(browserPush.includes('navigator.serviceWorker.ready'));
  assert.ok(!previewRoom.includes('serviceWorker.register('));
});

test('legacy device-return API remains possession-protected without being the Patch K onboarding gate', () => {
  assert.ok(registerDevice.includes('verifyBetaPreviewStatusCredential(input.requestId, input.statusToken)'));
  assert.ok(all(previewRoute, ['action === "registerDevice"', 'statusToken: body.statusToken', 'fcmToken: body.fcmToken']));
  assert.ok(!previewRoute.includes('export async function GET'));
  assert.ok(!requestForm.includes('registerDevice'));
});

test('same-device Preview possession survives closure and cleans up safely', () => {
  assert.ok(all(previewReturn, ['boardsignal-beta-preview-return-v1', 'window.localStorage.setItem', 'Date.parse(existing.createdAt) > Date.parse(createdAt)']));
  assert.ok(all(previewReturn, ['Date.parse(parsed.expiresAt) <= now', 'window.localStorage.removeItem(STORAGE_KEY)']));
  assert.ok(provisionalClaim.includes('activationDevice: null'));
  assert.ok(openRoom.includes('clearPreviewEntryState()'));
  assert.ok(previewRoom.includes('["rejected", "expired", "claimed"].includes(nextStatus.state)'));
});

test('legacy return preferences remain server-side compatibility, not required setup', () => {
  assert.ok(all(updateReturn, ['method === "return_here"', 'method === "email"', 'method === "discord"', 'method === "telegram"']));
  assert.ok(updateReturn.includes('request.status !== "pending"'));
  assert.ok(!section(updateReturn, 'method === "return_here"', '} else {').includes('validateContact'));
  assert.ok(all(profile, ['BoardSignal contact', '"Not opted in"']));
  assert.ok(previewRoom.includes('Google is optional and can be connected later as a return key.'));
});

test('legacy approved and recovery access remain additive and do not replace current sessions', () => {
  assert.ok(approval.includes('loadExistingFoundingBetaAccess(request.chessPlayerId)'));
  assert.ok(!approval.includes('resetFoundingBetaAccess'));
  assert.ok(!/revokeRefreshTokens|revokeExistingFirebaseSession/.test(approval));
  assert.ok(previewRoom.includes('Existing magic access, fallback access and current sessions remain valid.'));
  assert.ok(all(openRoom, ['decidePreviewEntry', 'resumeSameUid(expectedUid)', 'cross_account']));
});

test('locked infrastructure and release gates remain unchanged', () => {
  assertBaselineFile('public/sw.js');
  assertBaselineFile('firestore.rules');
  assert.equal(pkg.scripts.prebuild, 'npm run prepare:stockfish && npm run test:contrast');
  assert.ok(pkg.scripts['test:contrast'] === 'node scripts/check-boardsignal-contrast.mjs' && all(css, ['beta-preview-return', 'var(--bs-text-primary)', 'var(--bs-surface-paper)']));
  assert.ok(firestore.length > 0 && sw.length > 0);
});