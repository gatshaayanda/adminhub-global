const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const rootLayout = read('src/app/layout.tsx');
const playerRoomLayout = read('src/app/boardsignal/player-room/layout.tsx');
const playerRoomPage = read('src/app/boardsignal/player-room/page.tsx');
const engagementBridge = read('src/components/PlayerRoomEngagementBridge.tsx');
const bridge = read('src/components/TrustpilotInvitationBridge.tsx');
const engagementServer = read('src/lib/boardsignal/server/playerRoomEngagement.ts');
const invitationRoute = read('src/app/api/boardsignal/trustpilot-invitation/route.ts');
const homeProof = read('src/components/HomeProofRail.tsx');

test('Trustpilot invitation resources are not mounted by the global app layout', () => {
  assert.doesNotMatch(rootLayout, /TrustpilotInvitationBridge/);
  assert.doesNotMatch(rootLayout, /invitejs\.trustpilot\.com\/tp\.min\.js/);
  assert.doesNotMatch(rootLayout, /tp\('register'/);
  assert.match(rootLayout, /trustpilot-one-time-domain-verification-id/);
});

test('Trustpilot invitation resources mount only on the online Player Room segment', () => {
  assert.match(playerRoomLayout, /TrustpilotInvitationBridge/);
  assert.match(playerRoomLayout, /https:\/\/invitejs\.trustpilot\.com\/tp\.min\.js/);
  assert.match(playerRoomLayout, /tp\('register','oiloKbZhU5G7rp2L'\)/);
  assert.doesNotMatch(playerRoomLayout, /offline\/player-room/);
});

test('Player Room engagement uses the exact 3 then 6 visit rhythm with durable session dedupe', () => {
  assert.match(playerRoomPage, /BoardSignalPlayerRoom \/><PlayerRoomEngagementBridge/);
  assert.match(engagementBridge, /boardsignal:offline-saved/);
  assert.match(engagementBridge, /\.player-room-authenticated/);
  assert.match(engagementBridge, /visibilitychange/);
  assert.match(engagementBridge, /pagehide/);
  assert.match(engagementBridge, /keepalive: true/);
  assert.doesNotMatch(engagementBridge, /setInterval/);
  assert.match(engagementServer, /lastCountedSessionId === sessionId/);
  assert.match(engagementServer, /if \(count === 3\) return "first"/);
  assert.match(engagementServer, /if \(count === 6\) return "final"/);
  assert.match(engagementServer, /latestSessionForegroundEngagedSeconds/);
  assert.match(engagementServer, /automaticCycleCompletedAt/);
});

test('Trustpilot creation is explicit interaction only and server verified by M3 visit state', () => {
  assert.match(bridge, /boardsignal:trustpilot-request/);
  assert.doesNotMatch(bridge, /boardsignal:offline-saved/);
  assert.doesNotMatch(bridge, /saved\?\.desks/);
  assert.match(bridge, /\/api\/boardsignal\/trustpilot-invitation/);
  assert.match(invitationRoute, /account\.accessStatus !== "active"/);
  assert.match(invitationRoute, /count === 3/);
  assert.match(invitationRoute, /count === 6/);
  assert.doesNotMatch(invitationRoute, /reviewProduction/);
  assert.match(invitationRoute, /already_queued/);
  assert.match(invitationRoute, /already_reserved/);
  assert.match(invitationRoute, /monthly_limit/);
  assert.match(invitationRoute, /player-room-engagement-v1/);
});

test('public Trustpilot proof copy no longer claims Review completion is the invitation gate', () => {
  assert.doesNotMatch(homeProof, /invited after a genuine BoardSignal Review/);
  assert.match(homeProof, /Player Room visit rhythm/);
  assert.match(homeProof, /not filtered by rating, sentiment or chess results/);
});
