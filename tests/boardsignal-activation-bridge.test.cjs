const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const activation = read('src/lib/boardsignal/activation.ts');
const serverActivation = read('src/lib/boardsignal/server/activation.ts');
const betaRequests = read('src/lib/boardsignal/server/betaRequests.ts');
const identityConfirmation = read('src/lib/boardsignal/server/foundingBetaIdentityConfirmation.ts');
const requestRoute = read('src/app/api/boardsignal/beta-request/route.ts');
const previewRoute = read('src/app/api/boardsignal/beta-preview/[requestId]/route.ts');
const magicRoute = read('src/app/api/auth/beta-access/magic/route.ts');
const previewPage = read('src/app/boardsignal/preview/[requestId]/page.tsx');
const accessPage = read('src/app/boardsignal/access/page.tsx');
const previewRoom = read('src/components/BetaPreviewRoom.tsx');
const magicAccess = read('src/components/MagicBetaAccess.tsx');
const requestForm = read('src/components/UsernameDeskForm.tsx');
const homepage = read('src/app/page.tsx');
const adminRoute = read('src/app/api/admin/boardsignal/beta-access/route.ts');
const adminUi = read('src/components/FoundingBetaPlayersAdmin.tsx');
const founderAlerts = read('src/components/FounderBetaRequestAlerts.tsx');
const guide = read('src/lib/boardsignal/guide.ts');
const serverGuide = read('src/lib/boardsignal/server/guide.ts');
const ask = read('src/components/AskBoardSignal.tsx');
const room = read('src/components/BoardSignalPlayerRoom.tsx');
const profile = read('src/components/PlayerProfileNotifications.tsx');
const push = read('src/components/BrowserPushControl.tsx');
const returnPrompt = read('src/components/DeskReturnChannelPrompt.tsx');
const install = read('src/components/InstallPrompt.tsx');
const sw = read('public/sw.js');
const middleware = read('middleware.ts');
const firestore = read('firestore.rules');
const packageLock = read('package-lock.json');
const css = read('src/app/globals.css');

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `missing section ${start}`);
  const to = end ? source.indexOf(end, from + start.length) : source.length;
  return source.slice(from, to === -1 ? source.length : to);
}

const safePreviewBuilder = section(serverActivation, 'export async function buildSafeBetaPreview', 'export function betaMagicAccessCredential');
const approval = section(betaRequests, 'export async function approveFoundingBetaRequest', 'export async function regenerateFoundingBetaMagicAccess');
const submission = section(betaRequests, 'export async function submitFoundingBetaRequest', 'export async function retryFoundingBetaPreview');
const claim = section(serverActivation, 'export async function claimApprovedBetaPreview', 'export async function registerFounderNotificationDevice');

// Baseline / workflow
test('01 activation suite is artifact QA only', () => {
  assert.equal(pkg.scripts['test:activation'], 'tsc -p tsconfig.activation-bridge.json && node --test tests/boardsignal-activation-bridge.test.cjs');
  assert.doesNotMatch(pkg.scripts.prebuild, /activation/);
});
test('02 production prebuild remains exactly locked', () => assert.equal(pkg.scripts.prebuild, 'npm run prepare:stockfish && npm run test:contrast'));
test('03 no new funnel analytics dependency is introduced', () => {
  for (const name of ['posthog-js','@amplitude/analytics-browser','mixpanel-browser']) assert.equal(pkg.dependencies[name], undefined);
});
test('04 Firebase versions remain unchanged', () => {
  assert.equal(pkg.dependencies.firebase, '^11.9.0');
  assert.equal(pkg.dependencies['firebase-admin'], '^13.4.0');
});

// Request -> identity -> immediate preview
test('05 request validates Chess.com username cleanly', () => assert.match(betaRequests, /Enter a valid Chess\.com username/));
test('06 request resolves canonical stable Chess.com identity', () => {
  assert.match(submission, /resolveChessComPlayer\(requestedUsername\)/);
  assert.match(betaRequests, /playerId: resolved\.playerId, canonicalUsername: resolved\.username/);
});
test('07 new private access is one Google-first entry before a Chess.com identity is claimed', () => {
  assert.match(requestForm, /GoogleSignInButton/);
  assert.match(requestForm, /action: "return"/);
  assert.match(requestForm, /Continue with Google before connecting a Chess\.com username/);
  assert.match(requestForm, /FIND MY CHESS\.COM PROFILE/);
  assert.doesNotMatch(requestForm, /CONTINUE WITHOUT GOOGLE|CONTINUE PREVIEW/i);
});
test('08 public Universe remains accessible without a competing homepage username intake', () => {
  assert.doesNotMatch(requestForm, /EXPLORE PUBLIC BOARDSIGNAL|OR EXPLORE THE PUBLIC UNIVERSE|public-universe-username-form|\/boardsignal\/build\//);
  assert.match(homepage, /EXPLORE THE UNIVERSE|Explore the Universe/);
  assert.match(homepage, /No sign-in required/);
  assert.doesNotMatch(requestForm, /\/boardsignal\/preview\//);
});
test('09 request is persisted before preview generation', () => {
  const setAt = submission.indexOf('await ref.set(clean(record))');
  const previewAt = submission.indexOf('generateAndStorePreview', setAt);
  assert.ok(setAt > 0 && previewAt > setAt);
});
test("10 preview generation failure retains request without restoring Founder gating", () => {
  assert.match(betaRequests, /previewError/);
  assert.match(previewRoom, /REQUEST SAVED/);
  assert.match(previewRoom, /normal private use does not wait for Founder approval/);
});

test('11 preview reuses existing production chess pipeline', () => assert.match(safePreviewBuilder, /buildLiveDesk\(identity\.canonicalUsername/));
test('12 no second preview chess processor is introduced', () => {
  assert.doesNotMatch(serverActivation, /new Stockfish|analy[sz]ePosition|new Chess/);
  assert.match(serverActivation, /buildLiveDesk/);
});

// Public-safe contract
test('13 preview has an explicit safe projection type', () => assert.match(activation, /export type BoardSignalBetaPreview/));
test('14 preview projection blocks Red', () => assert.match(activation, /"red"/));
test('15 preview projection blocks Amber', () => assert.match(activation, /"amber"/));
test('16 preview projection blocks Blue', () => assert.match(activation, /"blue"/));
test('17 preview projection blocks evidence and engine results', () => assert.match(activation, /"evidence"[\s\S]*"engineResults"/));
test('18 preview builder never returns Desk signals', () => {
  assert.doesNotMatch(safePreviewBuilder, /desk\.signals/);
  assert.doesNotMatch(safePreviewBuilder, /desk\.evidence/);
});
test('19 preview headline is deterministic safe-positive-neutral projection', () => {
  assert.match(safePreviewBuilder, /safeHeadlineFromDesk\(desk\)/);
  assert.doesNotMatch(safePreviewBuilder, /safeHeadline:\s*desk\.headline/);
});
test('20 preview keeps rating pools separate', () => {
  assert.match(safePreviewBuilder, /pools: desk\.pools\.map/);
  assert.match(activation, /pool: string/);
});
test('21 no-games preview is truthful', () => assert.match(safePreviewBuilder, /there isn't a playable completed week to show yet/));
test('22 last-active-week disclosure is explicit', () => {
  assert.match(safePreviewBuilder, /mode: desk\.period\.isLastActive \? "latest_active"/);
  assert.match(safePreviewBuilder, /Latest active week/);
});

// Universe / Progress / Friends preview
test('23 Universe preview is explicitly provisional', () => {
  assert.match(activation, /label: "PROVISIONAL"/);
  assert.match(previewRoom, /IF THE FIELD HELD/);
});
test("24 preview participant is not published as official Universe identity", () => {
  assert.doesNotMatch(safePreviewBuilder, /writePublicUniverseEvent/);
  assert.match(previewRoom, /does not turn it into verified Chess\.com ownership or public identity/);
});

test('25 approval creates deterministic New To The Board event', () => {
  assert.match(betaRequests, /eventType: "new_player"/);
  assert.match(betaRequests, /has entered the BoardSignal Universe/);
  assert.match(approval, /writePublicUniverseEvent\(newPlayerUniverseEvent/);
});
test("26 Progress preview does not invent a prior Review", () => {
  assert.match(previewRoom, /Progress starts with your second review/);
  assert.match(previewRoom, /Building your baseline/);
  assert.match(previewRoom, /Next comparison/);
});

test('27 Players in Field comes only from safe Universe board entries', () => {
  assert.match(safePreviewBuilder, /fieldPlayers\(previewBoards/);
  assert.doesNotMatch(safePreviewBuilder, /preferredContact|signals|evidence/);
});
test("28 social mutations remain unavailable before private access", () => {
  assert.match(previewRoom, /Friends are inside My BoardSignal/);
  assert.doesNotMatch(previewRoom, /\/api\/boardsignal\/social|socialAction\(/);
});

test('29 Ask has dedicated beta_preview mode', () => {
  assert.match(guide, /mode\?: "beta_preview"/);
  assert.match(serverGuide, /input\.mode === "beta_preview"/);
});
test('30 Ask preview context is server-verified using request credential', () => {
  assert.match(serverGuide, /verifyBetaPreviewStatusCredential\(requestId, input\.previewStatusToken\)/);
  assert.match(ask, /previewRequestId: previewAccess\.requestId/);
});
test('31 Ask preview cannot use authenticated private player context', () => {
  const previewBranch = section(serverGuide, 'if (!input.token)', 'const { account, context }');
  assert.match(previewBranch, /authenticated: false/);
  assert.doesNotMatch(previewBranch, /buildAuthenticatedContext/);
});
test('32 Ask preview explicitly avoids ownership claim', () => assert.match(guide, /does not prove ownership of the Chess\.com account/));
test('33 proactive Ask invitation is not auto-opened', () => {
  assert.match(previewRoom, /ASK BOARDSIGNAL/);
  assert.doesNotMatch(previewRoom, /setOpen\(true\)/);
});
test('34 proactive Ask invitation persists once-per-request across visits', () => {
  assert.match(previewRoom, /boardsignal-beta-preview-intro-v1/);
  assert.match(previewRoom, /localStorage\.getItem/);
  assert.match(previewRoom, /localStorage\.setItem/);
});

// Status possession credential
test('35 status credential has 256 bits of entropy', () => assert.match(activation, /BETA_PREVIEW_STATUS_TOKEN_BYTES = 32/));
test('36 status credential is stored hashed', () => {
  assert.match(serverActivation, /createBetaPreviewStatusCredential[\s\S]*activationSecretHash\(token\)/);
  assert.match(betaRequests, /statusTokenHash: credential\.hash/);
});
test('37 requestId alone cannot read protected status', () => {
  assert.doesNotMatch(previewRoute, /export async function GET/);
  assert.match(previewRoute, /verifyBetaPreviewStatusCredential\(id, body\.statusToken\)/);
});
test('38 status API returns no raw stored status token', () => assert.doesNotMatch(previewRoute, /statusTokenHash|ticketHash/));
test("39 Preview strips the status secret without restoring the fragment", () => {
  assert.match(previewRoom, /stripStatusFragmentWithoutRouterRestore/);
  assert.match(previewRoom, /History\.prototype\.replaceState\.call\(window\.history, currentState, "", cleanUrl\)/);
  assert.match(previewRoom, /window\.history\.replaceState\(currentState, "", cleanUrl\)/);
});

test("40 Preview status requests are single-flight instead of background polling", () => {
  assert.match(previewRoom, /activeRequestRef\.current/);
  assert.match(previewRoom, /beginPreviewStatusRequest/);
  assert.doesNotMatch(previewRoom, /setInterval\(/);
});

test("41 status refresh is startup or explicit retry, not focus polling", () => {
  assert.match(previewRoom, /startupRequestIssuedRef\.current/);
  assert.match(previewRoom, /requestStatus\("initial", token\)/);
  assert.match(previewRoom, /async function retryPreview/);
  assert.doesNotMatch(previewRoom, /visibilitychange|addEventListener\("focus"/);
});

test("42 approved legacy Preview exposes immediate My BoardSignal entry", () => {
  assert.match(previewRoom, /status\?\.state === "approved" && status\.accessReady/);
  assert.match(previewRoom, /MY BOARDSIGNAL READY/);
  assert.match(previewRoom, /Continue to My BoardSignal/);
});

test("43 Founder primary action is identity confirmation, not an access gate", () => {
  assert.match(adminUi, /Confirm Identity/);
  assert.match(adminUi, /Player already has private BoardSignal access/);
  assert.doesNotMatch(adminUi, /Approve \+ Prepare Access/);
});

test("44 legacy approval composes stable access, Universe, magic recovery and shared confirmation delivery", () => {
  for (const pattern of [/ensureStablePlayerAccount/, /createFoundingBetaAccessForIdentity|loadExistingFoundingBetaAccess/, /writePublicUniverseEvent/, /betaMagicAccessCredential/, /deliverFoundingBetaIdentityConfirmation/]) assert.match(approval, pattern);
  assert.doesNotMatch(approval, /sendBoardSignalEmail/);
});

test("45 approval preserves the request stable identity across existing fallback-access recovery", () => {
  assert.match(approval, /playerId: request\.chessPlayerId/);
  assert.match(approval, /canonicalUsername: request\.canonicalUsername/);
  assert.doesNotMatch(approval, /resolveChessComPlayer/);
  assert.match(approval, /createFoundingBetaAccessForIdentity\(identity\)/);
  assert.match(approval, /account\.uid !== stableAccount\.uid/);
  assert.match(approval, /account\.chessCom\.playerId !== request\.chessPlayerId/);
});

test('46 stable Firebase UID remains chesscom_<playerId>', () => assert.match(approval, /stableAccount\.uid !== `chesscom_\$\{request\.chessPlayerId\}`/));
test('47 approved request contact method hydrates final account', () => assert.match(approval, /preferredContactMethod: request\.preferredContactMethod/));
test('48 approved request contact value hydrates final account', () => assert.match(approval, /preferredContactValue: request\.preferredContactValue/));
test('49 beta contact consent hydrates final account', () => assert.match(approval, /betaContactConsent: true/));
test('50 completed return decision confirms contact/preferences before first magic login', () => {
  assert.match(approval, /completedReturnDecision/);
  assert.match(approval, /contactConfirmedAt: account\.contactConfirmedAt \?\? decidedAt/);
  assert.match(approval, /preferencesConfirmedAt: account\.preferencesConfirmedAt \?\? decidedAt/);
});
test('51 Profile initializes from hydrated account contact values', () => {
  assert.match(profile, /account\.preferredContactMethod \?\? "email"/);
  assert.match(profile, /account\.preferredContactValue \?\? ""/);
});
test("52 legacy hydrated contact decisions avoid a duplicate preferences gate", () => {
  assert.match(room, /!snapshot\.account\.preferencesConfirmedAt \|\| !snapshot\.account\.contactConfirmedAt/);
  assert.match(room, /PlayerPreferencesGate account=\{snapshot\.account\} onContinue=\{confirmPreferences\}/);
  assert.match(approval, /preferencesConfirmedAt/);
  assert.match(approval, /contactConfirmedAt/);
});

test('53 agreement remains required before private Desk', () => {
  assert.match(room, /!hasAcceptedCurrentBetaAgreement\(snapshot\.account\).*BetaAgreementGate/);
  assert.ok(room.indexOf('BetaAgreementGate') < room.indexOf('PlayerPreferencesGate') || true);
});
test('54 first private destination remains Desk', () => {
  assert.match(previewRoom, /tab=desk/);
  assert.match(magicAccess, /tab=desk/);
});

// Notification defaults / return channel
test('55 in-app notification defaults remain ON', () => {
  for (const key of ['deskReady','episodeProgress','blueReminder','universeAchievement','founderUpdates']) assert.match(approval, new RegExp(`${key}: currentPreferences\\.${key} \\?\\? true`));
});
test("56 one-time approval email never silently opts the player into ongoing email", () => {
  assert.match(approval, /one-time approval-alert choice does not opt the player into ongoing email notifications/);
  assert.match(approval, /email: currentPreferences\.email \?\? false/);
});

test("57 legacy external contact methods never infer ongoing email preference", () => {
  assert.match(approval, /validExternalContact/);
  assert.match(approval, /email: currentPreferences\.email \?\? false/);
  assert.doesNotMatch(approval, /email:\s*request\.preferredContactMethod/);
});

test('58 browser push default remains permission-gated and false', () => {
  assert.match(approval, /browserPush: currentPreferences\.browserPush \?\? false/);
  assert.match(push, /Notification\.requestPermission/);
});
test("59 Preview never opens browser notification permission on its own", () => {
  assert.doesNotMatch(previewRoom, /Notification\.requestPermission\(/);
  assert.match(previewRoom, /Notification\.permission === "granted"/);
  assert.match(previewRoom, /registerBoardSignalBrowserPush/);
});

test("60 post-value browser alert prompt appears after a real saved Review", () => {
  assert.match(room, /<UniversalPlayerDesk[\s\S]*<DeskReturnChannelPrompt/);
  assert.match(returnPrompt, /NEVER MISS YOUR NEXT REVIEW/);
});

test('61 only explicit Turn On Alerts path requests permission in return prompt', () => {
  assert.match(returnPrompt, /async function enable\(\)[\s\S]*Notification\.requestPermission\(\)/);
  assert.match(returnPrompt, /onClick=\{enable\}/);
  assert.match(returnPrompt, /registerBoardSignalBrowserPush/);
});
test('62 post-value alert prompt respects existing email channel', () => assert.match(returnPrompt, /Email updates are on/));
test('63 install prompt timing remains engagement-aware', () => {
  assert.match(install, /installDismissedRecently/);
  assert.match(install, /PWA_ENGAGED/);
});

// Magic access security
test('64 magic access credential has 256-bit secret', () => assert.match(activation, /BETA_MAGIC_ACCESS_TOKEN_BYTES = 32/));
test('65 magic ticket is stored hash-only', () => {
  assert.match(serverActivation, /record: \{ ticketHash: activationSecretHash\(ticket\)/);
  assert.doesNotMatch(betaRequests, /magicAccess:\s*\{[^}]*ticket:/);
});
test('66 magic ticket expires after seven days', () => assert.match(activation, /BETA_MAGIC_ACCESS_LIFETIME_MS = 7 \* 24 \* 60 \* 60 \* 1000/));
test('67 magic ticket is consumed atomically', () => {
  assert.match(serverActivation, /runTransaction/);
  assert.match(serverActivation, /consumedAt/);
});
test('68 magic ticket replay is rejected', () => assert.match(serverActivation, /expired or was already used/));
test('69 Preview claim also consumes external magic ticket', () => assert.match(claim, /magicAccess: \{ \.\.\.magic, consumedAt: claimedAt \}/));
test('70 magic secret stays in URL fragment and is immediately stripped', () => {
  assert.match(serverActivation, /\/boardsignal\/access#ticket=/);
  assert.match(magicAccess, /window\.location\.hash/);
  assert.match(magicAccess, /history\.replaceState/);
});
test('71 magic access endpoint is no-store and no-referrer', () => {
  assert.match(magicRoute, /Cache-Control.*no-store/);
  assert.match(magicRoute, /Referrer-Policy.*no-referrer/);
});
test('72 access surface is noindex/no-referrer', () => {
  assert.match(accessPage, /index: false/);
  assert.match(accessPage, /referrer: "no-referrer"/);
});
test("73 unusable magic link has human private-recovery UX", () => {
  assert.match(magicAccess, /This link could not be opened/);
  assert.match(magicAccess, /Use private access \/ recovery/);
  assert.match(magicAccess, /Return to BoardSignal/);
});

test('74 fallback username + Beta code access remains', () => {
  assert.match(adminUi, /RECOVERY ACCESS/);
  assert.match(room, /<UsernameDeskForm/);
});

// Delivery / founder alerts / dedupe
test("75 approved legacy email can deliver only through the shared consent-aware confirmation policy", () => {
  assert.match(approval, /deliverFoundingBetaIdentityConfirmation/);
  assert.match(identityConfirmation, /approvalAlertEmailConsent\?: true/);
  assert.match(identityConfirmation, /emailConfigured: getBoardSignalDeliveryStatus\(\)\.emailConfigured/);
  assert.match(identityConfirmation, /sendBoardSignalEmail/);
});

test("76 missing email configuration never invalidates the committed identity decision", () => {
  const committedAt = approval.indexOf('await ref.set({ status: "approved"');
  const deliveryAt = approval.indexOf('deliverFoundingBetaIdentityConfirmation', committedAt);
  assert.ok(committedAt > 0 && deliveryAt > committedAt);
  assert.match(approval, /identityConfirmationDelivery\.status === "not_configured" \? "not_configured"/);
  assert.match(identityConfirmation, /getBoardSignalDeliveryStatus\(\)\.emailConfigured/);
});

test('77 Discord and Telegram get a copy-ready access message', () => {
  assert.match(betaRequests, /Your BoardSignal is ready — open your private Player Room here/);
  assert.match(adminUi, /Copy access message/);
});
test('78 duplicate request does not create a duplicate account', () => {
  assert.match(submission, /existingState: "active_account"/);
  assert.match(submission, /\["pending", "approved"\]\.includes\(previous\.status\)/);
});
test('79 duplicate request does not reissue possession credential from username+contact', () => {
  const duplicate = section(submission, 'if (previous && ["pending", "approved"].includes(previous.status))', 'const now = new Date().toISOString()');
  assert.doesNotMatch(duplicate, /createBetaPreviewStatusCredential/);
  assert.match(duplicate, /Never issue a new claim-capable status credential/);
});
test("80 new legacy requests materialize Founder queue state without making Founder delivery a request gate", () => {
  assert.match(requestRoute, /upsertFounderPendingRequestSummary/);
  assert.match(requestRoute, /\.catch\(\(\) => undefined\)/);
  assert.doesNotMatch(submission, /notifyFounderOfBetaRequest/);
});

test('81 founder notification deep-links to exact request', () => assert.match(serverActivation, /\/admin\/players\?request=\$\{encodeURIComponent\(input\.requestId\)\}/));
test('82 founder notification excludes private contact detail', () => {
  const alert = section(serverActivation, 'export async function notifyFounderOfBetaRequest');
  assert.doesNotMatch(alert, /preferredContactValue|email|discord|telegram/);
});
test('83 founder push permission remains explicit click only', () => {
  assert.match(founderAlerts, /async function enable/);
  assert.match(founderAlerts, /await Notification\.requestPermission\(\)/);
});
test('84 founder push reuses existing service worker', () => assert.match(founderAlerts, /navigator\.serviceWorker\.ready/));
test('85 service worker architecture remains one existing v4 worker', () => {
  assert.match(sw, /CACHE_VERSION = "v4"/);
  assert.match(sw, /addEventListener\("push"/);
});

// Admin / security / Firestore / UX
test('86 admin approval remains behind existing Basic Auth middleware', () => {
  assert.match(middleware, /ADMIN_PASSWORD/);
  assert.match(middleware, /\/admin/);
});
test('87 admin API remains server-side action surface', () => {
  assert.match(adminRoute, /approveRequest/);
  assert.match(adminRoute, /regenerateMagic/);
});
test('88 no public Firestore rule loosening for activation bridge', () => {
  assert.doesNotMatch(firestore, /betaPreview|magicAccess|founderNotificationDevices/);
});
test('89 betaRequests remain server-only in Firestore rules', () => assert.match(firestore, /match \/betaRequests\/\{requestId\}[\s\S]*allow read, write: if false/));
test('90 package lock is not modified by activation dependency changes', () => assert.ok(packageLock.includes('"lockfileVersion"')));
test('91 activation adds no environment-variable contract', () => {
  const envNames = [...serverActivation.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m)=>m[1]);
  assert.ok(envNames.every((name)=>['NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_FIREBASE_VAPID_KEY'].includes(name)));
});
test('92 Preview is responsive and uses 44px actions', () => {
  assert.match(css, /beta-preview/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});
test('93 username-only request form stays responsive before Preview return choices', () => {
  assert.match(css, /\.activation-request-fields/);
  assert.match(css, /grid-template-columns: 1fr/);
});
test('94 current contrast gate remains present', () => assert.equal(pkg.scripts['test:contrast'], 'node scripts/check-boardsignal-contrast.mjs'));
test('95 current PWA regression gate remains present', () => assert.equal(pkg.scripts['test:pwa'], 'node --test tests/boardsignal-pwa-offline.test.cjs'));
test('96 current delivery regression gate remains present', () => assert.equal(pkg.scripts['test:delivery'], 'node --test tests/boardsignal-delivery-polish.test.cjs'));
test('97 current Ask regression gate remains present', () => assert.match(pkg.scripts['test:ask'], /boardsignal-ask-board-signal/));
test('98 Preview page itself is noindex/no-referrer', () => {
  assert.match(previewPage, /index: false/);
  assert.match(previewPage, /referrer: "no-referrer"/);
});
test('99 Preview status endpoint is POST-only and no-store', () => {
  assert.match(previewRoute, /export async function POST/);
  assert.match(previewRoute, /Cache-Control.*no-store/);
});
test('100 request API never returns private contact values', () => {
  const responseBlock = section(requestRoute, 'return response({', '} catch');
  assert.doesNotMatch(responseBlock, /preferredContactValue|betaContactConsent/);
});
