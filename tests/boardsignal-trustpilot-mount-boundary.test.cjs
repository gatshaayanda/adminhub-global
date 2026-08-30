const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const rootLayout = read('src/app/layout.tsx');
const playerRoomLayout = read('src/app/boardsignal/player-room/layout.tsx');
const bridge = read('src/components/TrustpilotInvitationBridge.tsx');
const invitationRoute = read('src/app/api/boardsignal/trustpilot-invitation/route.ts');

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

test('existing invitation eligibility remains Review-gated and server verified', () => {
  assert.match(bridge, /if \(!saved\?\.desks\?\.length\) return/);
  assert.match(bridge, /\/api\/boardsignal\/trustpilot-invitation/);
  assert.match(invitationRoute, /account\.accessStatus !== "active"/);
  assert.match(invitationRoute, /\(account\.reviewProduction\?\.totalReviews \?\? 0\) < 1/);
  assert.match(invitationRoute, /already_queued/);
  assert.match(invitationRoute, /already_reserved/);
  assert.match(invitationRoute, /monthly_limit/);
});
