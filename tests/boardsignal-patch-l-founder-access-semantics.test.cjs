const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const playersPath = 'src/components/FoundingBetaPlayersAdmin.tsx';
const operationsPath = 'src/components/FounderOperationsConsole.tsx';
const routePath = 'src/app/api/admin/boardsignal/operations/route.ts';
const alertsPath = 'src/components/FounderBetaRequestAlerts.tsx';
const players = fs.readFileSync(path.join(ROOT, playersPath), 'utf8');
const operations = fs.readFileSync(path.join(ROOT, operationsPath), 'utf8');
const route = fs.readFileSync(path.join(ROOT, routePath), 'utf8');
const alerts = fs.readFileSync(path.join(ROOT, alertsPath), 'utf8');

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing section marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `missing section end marker: ${endMarker}`);
  return source.slice(start, end);
}

test('1. preview-only activity is explicitly separated from identity review', () => {
  assert.match(players, /const identityReviews = useMemo\([\s\S]*Boolean\(item\.provisionalClaimedAt\)/);
  assert.match(players, /const previewActivity = useMemo\([\s\S]*!item\.provisionalClaimedAt/);
});

test('2. player admin no longer presents a pending access request queue', () => {
  assert.doesNotMatch(players, /NEW \/ PENDING REQUESTS/);
  assert.doesNotMatch(players, /Identity review and access requests/);
  assert.match(players, /PREVIEW ACTIVITY/);
  assert.match(players, /not an access request/i);
});

test('3. preview-only card has no Founder approval or revoke controls', () => {
  const previewCard = section(players, 'function PreviewActivityCard', '  </article>;\n}');
  assert.doesNotMatch(previewCard, /onConfirm|confirmIdentity|onRevoke|revokeIdentity|Confirm public identity|Revoke provisional identity/);
  assert.match(previewCard, /No Founder action required/);
});

test('4. identity-review card exists only for players already inside private access', () => {
  const identityCard = section(players, 'function IdentityReviewCard', 'function PreviewActivityCard');
  assert.match(identityCard, /PRIVATE ACCESS ACTIVE · IDENTITY REVIEW AVAILABLE/);
  assert.match(identityCard, /does not control private access/);
  assert.match(identityCard, /Confirm public identity/);
});

test('5. client refuses identity-review mutation for Preview-only records', () => {
  assert.match(players, /if \(!request\.provisionalClaimedAt\)/);
  assert.match(players, /becomes available only after the player has entered private BoardSignal access/);
});

test('6. recovery remains quiet and explicitly secondary to normal private access', () => {
  assert.match(players, /LEGACY ACCESS & RECOVERY/);
  assert.match(players, /Google\/private access is the normal player path/);
  assert.match(players, /fallback support only/i);
});

test('7. Founder operations API strips legacy request rows and request attention', () => {
  assert.match(route, /startsWith\("request:"\)/);
  assert.match(route, /newRequests: 0/);
  assert.match(route, /Preview activity is useful Founder context, but it is/);
});

test('8. Founder operations no longer treats New requests or normal sign-in as attention work', () => {
  assert.doesNotMatch(operations, /\["New requests"/);
  assert.doesNotMatch(operations, /\["new_requests","NEW REQUESTS"\]/);
  assert.match(operations, /attention:\{followUpsDue:number;unreadReplies:number;exceptions:number;identityConflicts:number\}/);
  assert.match(operations, /Coaching feedback is product-quality intelligence; it never becomes an access, identity or approval queue\./);
});

test('9. Founder browser alerts describe identity-review entry rather than Preview approval', () => {
  assert.match(alerts, /FOUNDER IDENTITY-REVIEW ALERTS/);
  assert.match(alerts, /Preview-only activity is not an approval alert/);
});

test('10. changed TSX files parse cleanly', () => {
  for (const [file, source] of [[playersPath, players], [operationsPath, operations], [alertsPath, alerts]]) {
    const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.deepEqual(parsed.parseDiagnostics, [], `${file} parse diagnostics`);
  }
});

test('11. changed TS route parses cleanly', () => {
  const parsed = ts.createSourceFile(routePath, route, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.deepEqual(parsed.parseDiagnostics, []);
});
