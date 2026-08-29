const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const manifest = read('src/app/manifest.ts');
const sw = read('public/sw.js');
const register = read('src/components/ServiceWorkerRegister.tsx');
const install = read('src/components/InstallPrompt.tsx');
const installLib = read('src/lib/boardsignal/offline/install.ts');
const db = read('src/lib/boardsignal/offline/db.ts');
const snapshots = read('src/lib/boardsignal/offline/snapshots.ts');
const offlineTypes = read('src/lib/boardsignal/offline/types.ts');
const room = read('src/components/BoardSignalPlayerRoom.tsx');
const offlineRoom = read('src/components/OfflinePlayerRoom.tsx');
const friends = read('src/components/PlayerFriends.tsx');
const ask = read('src/components/AskBoardSignal.tsx');
const offlineGuide = read('src/lib/boardsignal/offline/guide.ts');
const connectivity = read('src/components/ConnectivityProvider.tsx');
const connectivityCore = read('src/lib/boardsignal/offline/connectivity.ts');
const connectivityRoute = read('src/app/api/boardsignal/connectivity/route.ts');
const profileDevice = read('src/components/DeviceOfflineControl.tsx');
const push = read('src/components/BrowserPushControl.tsx');
const css = read('src/app/globals.css');
const pkg = JSON.parse(read('package.json'));
const offlinePage = read('src/app/offline/page.tsx');
const offlinePlayerPage = read('src/app/offline/player-room/page.tsx');
const launch = read('src/components/PwaLaunchRedirect.tsx');

function pngSize(file) {
  const data = fs.readFileSync(path.join(root, file));
  assert.equal(data.toString('ascii', 1, 4), 'PNG');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}
function installHandlerSource() {
  const start = sw.indexOf('self.addEventListener("install"');
  const end = sw.indexOf('self.addEventListener("message"');
  return sw.slice(start, end);
}

test('manifest keeps the standalone BoardSignal identity, icons and shortcuts', () => {
  for (const pattern of [
    /name:\s*"BoardSignal — Weekly Chess Review"/,
    /short_name:\s*"BoardSignal"/,
    /id:\s*"\/boardsignal"/,
    /start_url:\s*"\/boardsignal\?source=pwa"/,
    /scope:\s*"\/"/,
    /display:\s*"standalone"/,
    /boardsignal-192\.png/,
    /boardsignal-512\.png/,
    /boardsignal-maskable-512\.png[\s\S]*purpose:\s*"maskable"/,
    /Player Room[\s\S]*\/boardsignal\/player-room/,
    /Inbox[\s\S]*tab=inbox/,
    /Friends[\s\S]*tab=friends/,
  ]) assert.match(manifest, pattern);
  assert.deepEqual(pngSize('public/icons/boardsignal-192.png'), { width: 192, height: 192 });
  assert.deepEqual(pngSize('public/icons/boardsignal-512.png'), { width: 512, height: 512 });
  assert.deepEqual(pngSize('public/icons/boardsignal-maskable-512.png'), { width: 512, height: 512 });
  assert.notDeepEqual(fs.readFileSync(path.join(root, 'public/icons/boardsignal-512.png')), fs.readFileSync(path.join(root, 'public/icons/boardsignal-maskable-512.png')));
});

test('one native service worker preserves private boundaries, bounded caches and push', () => {
  assert.equal((register.match(/navigator\.serviceWorker\.register\("\/sw\.js"/g) || []).length, 1);
  for (const pattern of [
    /boardsignal-shell-\$\{CACHE_VERSION\}/,
    /boardsignal-static-\$\{CACHE_VERSION\}/,
    /boardsignal-public-\$\{CACHE_VERSION\}/,
    /if \(request\.method !== "GET"\) return;/,
    /if \(url\.pathname\.startsWith\("\/api\/"\)\) return;/,
    /url\.pathname\.startsWith\("\/admin"\)/,
    /url\.pathname\.startsWith\("\/app"\)/,
    /url\.pathname\.startsWith\("\/connect"\)/,
    /\/boardsignal\/player-room[\s\S]*\/offline\/player-room/,
    /\/player\/[\s\S]*\/share\//,
    /url\.pathname\.startsWith\("\/stockfish\/"\)[\s\S]*cacheFirst/,
    /self\.addEventListener\("push"/,
    /showNotification/,
    /self\.addEventListener\("notificationclick"/,
    /openWindow/,
    /event\.data\?\.type === "SKIP_WAITING"[\s\S]*self\.skipWaiting\(\)/,
    /key\.startsWith\(BOARDSIGNAL_CACHE_PREFIX\)/,
    /trimCache\(PUBLIC_CACHE, 24\)/,
    /trimCache\(STATIC_CACHE, 80\)/,
    /precacheSafeShell/,
    /\/_next\/static\//,
  ]) assert.match(sw, pattern);
  assert.doesNotMatch(sw.slice(sw.indexOf('const APP_SHELL'), sw.indexOf('self.addEventListener("install"')), /stockfish/);
  assert.doesNotMatch(installHandlerSource(), /skipWaiting\s*\(/);
});

test('service worker update remains player-controlled and reloads once', () => {
  for (const pattern of [/registration\.waiting/, /BoardSignal update ready/, /waiting\.postMessage\(\{ type: "SKIP_WAITING" \}\)/, /controllerchange/, /reloadForUpdateRef\.current/, /Your current screen will not reload on its own/]) assert.match(register, pattern);
});

test('private offline data remains UID-scoped and bounded', () => {
  for (const pattern of [
    /BOARDSIGNAL_OFFLINE_DB_NAME = "boardsignal-offline-v1"/,
    /BOARDSIGNAL_OFFLINE_MAX_DESKS = 4/,
    /BOARDSIGNAL_OFFLINE_MAX_DRAFTS = 4/,
    /BOARDSIGNAL_OFFLINE_MAX_SOCIAL_COMPARISONS = 4/,
  ]) assert.match(offlineTypes, pattern);
  assert.match(db, /return `\$\{uid\}:\$\{kind\}:\$\{id\}`/);
  assert.match(db, /record\.uid !== expectedUid/);
  assert.match(db, /key\.startsWith\("boardsignal-"\)/);
  for (const pattern of [
    /if \(input\.account\.uid !== uid\) throw new Error\("Offline snapshot identity mismatch\."\)/,
    /slice\(0, BOARDSIGNAL_OFFLINE_MAX_DESKS\)/,
    /activeDeskKeys\.has\(point\.deskKey\)/,
    /lastSyncedAt:\s*now/,
    /savedAt:\s*now/,
  ]) assert.match(snapshots, pattern);
  assert.match(room, /previousUid && nextUid && previousUid !== nextUid[\s\S]*setSnapshot\(null\)[\s\S]*setOfflineSnapshot\(null\)[\s\S]*clearBoardSignalPrivateOfflineData\(previousUid\)/);
  assert.match(room, /user\?\.uid[\s\S]*clearBoardSignalPrivateOfflineData\(user\.uid\)/);
  assert.doesNotMatch(snapshots, /Firebase ID token|Beta Access plaintext|CRON_SECRET|VAPID/i);
});

test('saved Player Room stays truthful, read-only and aligned with live player language', () => {
  assert.match(offlinePlayerPage, /OfflinePlayerRoom/);
  assert.match(offlineRoom, /You're offline\. Showing your saved BoardSignal from/);
  assert.match(offlineRoom, /New Chess\.com games, Universe movement, messages and account changes are not included after/);
  assert.match(offlineRoom, /Latest four saved Reviews/);
  assert.match(offlineRoom, /UniversalPlayerDesk[\s\S]*publishedDesk=/);
  assert.match(offlineRoom, /PROGRESS · SAVED/);
  assert.match(offlineRoom, /UNIVERSE · SAVED/);
  assert.match(offlineRoom, /SINCE YOUR LAST SAVED VISIT/);
  assert.match(offlineRoom, /What's Hot — saved/);
  assert.match(offlineRoom, /FRIENDS · SAVED/);
  assert.match(offlineRoom, /Inbox needs a connection/);
  assert.match(offlineRoom, /no new analysis runs offline/);
  assert.match(offlineRoom, /No BoardSignal has been saved for this account on this device yet/);
  assert.doesNotMatch(offlineRoom, /PULSE · LAST SYNCHRONIZED|item === "pulse" \? "Pulse"/);
});

test('network-only social and account mutations never fake success offline', () => {
  assert.match(friends, /if \(!connectivity\.online\) \{ setError\("Reconnect to change your BoardSignal connections\."\); return; \}/);
  assert.match(friends, /Reconnect to search active BoardSignal players/);
  assert.match(friends, /disabled=\{Boolean\(busy\) \|\| !connectivity\.online\}/);
  assert.match(friends, /loadSocialOfflineSnapshot\(uid\)/);
  assert.match(friends, /savedComparison/);
  assert.match(profileDevice, /disabled=\{!connectivity\.online/);
  assert.match(read('src/components/PlayerProfileNotifications.tsx'), /disabled=\{busy \|\| !connectivity\.online/);
  assert.match(room, /Reconnect before accepting the Founding Access Agreement/);
  assert.match(room, /Reconnect before changing BoardSignal account or communication settings/);
  assert.match(room, /Reconnect before finishing or saving a review/);
  assert.match(room, /connectivity\.state !== "offline"[\s\S]*loadPlayerRoomOfflineSnapshot\(user\.uid\)/);
  assert.match(room, /Reconnect to sign in/);
  assert.match(push, /navigator\.serviceWorker\.ready/);
  assert.match(push, /Reconnect before changing browser alerts/);
});

test('Friends loading-loop protections remain intact', () => {
  for (const pattern of [
    /const onChangedRef = useRef\(onChanged\)/,
    /useEffect\(\(\) => \{ onChangedRef\.current = onChanged; \}, \[onChanged\]\)/,
    /const load = useCallback[\s\S]*\}, \[messageTarget, token\]\)/,
    /loadedTokenRef = useRef<string \| undefined>\(undefined\)/,
    /shouldRunInitialFriendsLoad\(loadedTokenRef\.current, token\)/,
    /AbortController/,
    /12000/,
    /Your board gets better with people you know/,
  ]) assert.match(friends, pattern);
  assert.doesNotMatch(friends, /\}, \[onChanged, token/);
});

test('Ask BoardSignal keeps a bounded factual offline path', () => {
  assert.match(ask, /if \(!connectivity\.online\)/);
  assert.match(ask, /buildOfflineGuideResponse/);
  assert.match(ask, /saveOfflineDraft/);
  assert.match(ask, /Saved locally\. When you're back online/);
  assert.match(ask, /Your message draft for Ayanda is ready/);
  assert.match(ask, /Send to Ayanda/);
  assert.match(offlineGuide, /You're offline/);
  assert.match(offlineGuide, /can't check Chess\.com for anything newer/);
  assert.match(offlineGuide, /don't create new chess analysis/);
  assert.match(snapshots, /slice\(0, BOARDSIGNAL_OFFLINE_MAX_DRAFTS\)/);
});

test('connectivity recovery is probed independently and coordinated once', () => {
  assert.match(connectivityCore, /\/api\/boardsignal\/connectivity/);
  assert.match(connectivityRoute, /status:\s*204/);
  assert.match(connectivityRoute, /["']Cache-Control["']:\s*"no-store[^"']*"/);
  assert.doesNotMatch(connectivityRoute, /firebase|firestore|requirePlayerToken|database/i);
  assert.match(connectivity, /inFlightRef/);
  assert.match(connectivityCore, /BOARDSIGNAL_RECONNECTED_EVENT = "boardsignal:reconnected"/);
  assert.match(room, /reconnectRefreshRef/);
  assert.match(room, /boardsignal:refresh-complete/);
  assert.match(offlineRoom, /boardsignal:pwa-recovery-refresh/);
  assert.match(offlineRoom, /window\.location\.replace\("\/boardsignal\/player-room"\)/);
});

test('install experience is engagement-aware, standalone-aware and clear on iOS', () => {
  assert.match(install, /pathname\.startsWith\("\/boardsignal\/player-room"\)/);
  assert.match(install, /PWA_ENGAGED_KEY/);
  assert.match(install, /installDismissedRecently/);
  assert.match(installLib, /14 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(install, /beforeinstallprompt/);
  assert.match(install, /appinstalled/);
  assert.match(install, /isIosInstallCandidate/);
  assert.match(install, /Add to Home Screen/);
  assert.match(install, /App Store or Play Store/);
  assert.match(profileDevice, /Add to Home Screen/);
  assert.match(profileDevice, /Install BoardSignal/);
  assert.match(launch, /isStandaloneBoardSignal/);
  assert.match(launch, /window\.location\.replace\("\/boardsignal\/player-room"\)/);
});

test('offline page and standalone CSS preserve readable native-feeling UX', () => {
  assert.match(offlinePage, /The newsroom lost its signal/);
  assert.match(offlinePage, /Open saved Player Room/);
  assert.match(css, /@media \(display-mode: standalone\)/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /\.bs-connectivity-strip\.is-offline[\s\S]*var\(--bs-text-on-dark\)/);
  assert.match(css, /\.offline-room-tabs button[\s\S]*min-height:\s*44px/);
  assert.match(css, /\.device-offline-actions \.button[\s\S]*min-height:\s*44px/);
  assert.match(css, /\.install-card \{ display: none !important; \}/);
});

test('artifact QA keeps production prebuild stable and PWA suite separate', () => {
  assert.equal(pkg.scripts.prebuild, 'npm run prepare:stockfish && npm run test:contrast');
  assert.ok(pkg.scripts['test:pwa']);
  assert.doesNotMatch(pkg.scripts.prebuild, /test:pwa/);
  assert.equal(pkg.dependencies?.workbox, undefined);
  assert.equal(pkg.dependencies?.['next-pwa'], undefined);
  const pwaSources = [
    'src/lib/boardsignal/offline/db.ts',
    'src/lib/boardsignal/offline/types.ts',
    'src/lib/boardsignal/offline/snapshots.ts',
    'src/lib/boardsignal/offline/connectivity.ts',
    'src/lib/boardsignal/offline/install.ts',
    'src/components/ConnectivityProvider.tsx',
    'src/components/DeviceOfflineControl.tsx',
  ].map(read).join('\n');
  assert.doesNotMatch(pwaSources, /process\.env\./);
});
