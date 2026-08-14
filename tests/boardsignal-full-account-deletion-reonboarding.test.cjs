const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const service = read('src/lib/boardsignal/server/accountDeletion.ts');
const adminRoute = read('src/app/api/admin/boardsignal/beta-access/route.ts');
const founderDeleteUi = read('src/components/FounderAccountDeletionAdmin.tsx');
const founderPage = read('src/app/admin/players/page.tsx');
const accessibility = read('src/app/boardsignal-accessibility.css');

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `missing ${start}`);
  const to = end ? source.indexOf(end, from + start.length) : source.length;
  return source.slice(from, to < 0 ? source.length : to);
}

const revokeRoute = section(adminRoute, 'if (body.action === "revoke")', 'return response({ ok: false');
const deleteRoute = section(adminRoute, 'if (body.action === "deleteAccount")', 'if (body.action === "confirmIdentity"');

test('Founder delete is a distinct stable-player action with typed canonical confirmation', () => {
  assert.match(adminRoute, /body\.action === "deleteAccount"/);
  assert.match(deleteRoute, /deleteBoardSignalAccount\(\{ playerId: body\.playerId, confirmationUsername: body\.confirmationUsername \}\)/);
  assert.match(service, /function stablePlayerId/);
  assert.match(service, /ACCOUNT_DELETION_PLAYER_ID_REQUIRED/);
  assert.match(service, /ACCOUNT_DELETION_CONFIRMATION_MISMATCH/);
  assert.match(service, /account\.role !== "player"/);
  assert.match(founderDeleteUi, /Type <strong>\{target\.username\}<\/strong> to confirm/);
  assert.match(founderDeleteUi, /confirmationMatches/);
  assert.match(founderDeleteUi, /DELETE ACCOUNT PERMANENTLY/);
  assert.match(founderDeleteUi, /confirmationUsername: confirmation\.trim\(\)/);
});

test('revoke remains preserved and separate from destructive account deletion', () => {
  assert.match(revokeRoute, /revokeFoundingBetaAccess\(body\.playerId\)/);
  assert.doesNotMatch(revokeRoute, /deleteBoardSignalAccount|deleteUser|recursiveDelete/);
  assert.match(founderDeleteUi, /Revoke Access<\/strong> preserves the player account and history/);
  assert.match(founderPage, /FoundingBetaPlayersAdmin/);
  assert.match(founderPage, /FounderAccountDeletionAdmin/);
});

test('deletion fail-closes access, revokes sessions, deletes Firebase Auth and is idempotent for missing Auth', () => {
  assert.match(service, /accessStatus: "deleted"/);
  assert.match(service, /identityStatus: "revoked"/);
  assert.match(service, /auth\.updateUser\(uid, \{ disabled: true \}\)/);
  assert.match(service, /auth\.revokeRefreshTokens\(uid\)/);
  assert.match(service, /auth\.deleteUser\(uid\)/);
  assert.match(service, /auth\/user-not-found/);
  assert.match(service, /alreadyDeleted: true/);
  assert.match(service, /ACCOUNT_DELETION_IDENTITY_CONFLICT/);
  assert.match(service, /authUser\.customClaims\?\.chessPlayerId/);
  assert.match(service, /claimedRole !== "player"/);
});

test('all audited private trees including Desks evidence and A.1 factual reviews are removed recursively', () => {
  for (const name of ['desks', 'factualReviews', 'social', 'inbox', 'conversations', 'pushTokens', 'pulse', 'automationEvents', 'guide', 'guideFeedback']) {
    assert.match(service, new RegExp(`"${name}"`));
  }
  assert.match(service, /db\.recursiveDelete\(userRef\.collection\(collectionName\)\)/);
  assert.match(service, /desk\.ref\.collection\("evidence"\)/);
  assert.match(service, /DELETE_CHUNK_SIZE = 200/);
  assert.match(service, /accountNow[\s\S]*await userRef\.delete\(\)/);
});

test('Beta Preview magic recovery mappings temporary tickets and onboarding blockers are removed before account root', () => {
  assert.match(service, /collection\("betaAccess"\)\.doc\(stablePlayerKey\)/);
  assert.match(service, /collection\("betaRequests"\)\.doc\(stablePlayerKey\)/);
  assert.match(service, /collection\("authCompletionTickets"\)\.where\("uid", "==", uid\)/);
  assert.match(service, /collection\("playerIdentityAliases"\)\.where\("uid", "==", uid\)/);
  assert.match(service, /collection\("playerIdentityAliases"\)\.where\("playerId", "==", playerId\)/);
  assert.match(service, /collection\("chessPlayerAccounts"\)\.doc\(stablePlayerKey\)/);
  assert.match(service, /await betaAccessRef\.delete\(\)/);
  assert.match(service, /await betaRequestRef\.delete\(\)/);
  assert.match(service, /assertResetComplete/);
  assert.match(service, /const resetIncomplete = user\.exists/);
  assert.match(service, /\|\| mapping\.exists[\s\S]*\|\| betaAccess\.exists[\s\S]*\|\| betaRequest\.exists/);
});

test('public identity share attribution and both sides of social state are cleaned only by stable IDs', () => {
  for (const collection of ['publicPlayers', 'publicCoverage', 'publicUniverseEvents', 'publicShareMoments', 'shareAttribution']) {
    assert.match(service, new RegExp(`collection\\("${collection}"\\)`));
  }
  assert.match(service, /collectionGroup\("social"\)\.where\("otherPlayerId", "==", playerId\)/);
  assert.match(service, /socialRelationships/);
  assert.match(service, /socialBlocks/);
  assert.match(service, /socialRequestRateLimits/);
  assert.match(service, /friend_request_\$\{relationshipId\}/);
  assert.match(service, /friend_accepted_\$\{relationshipId\}/);
  assert.doesNotMatch(service, /where\("canonicalUsername"|where\("username"/);
  assert.doesNotMatch(service, /collection\("users"\)\.get\(\)/);
});

test('fresh re-onboarding is enabled by deleting every old stable lifecycle anchor without touching engine or rules', () => {
  assert.match(service, /firebaseUidForChessPlayer\(playerId\)/);
  assert.match(service, /await mappingRef\.delete\(\)/);
  assert.match(service, /await userRef\.delete\(\)/);
  assert.match(service, /betaAccessDeleted/);
  assert.match(service, /betaRequestDeleted/);
  assert.match(founderDeleteUi, /If they return later, they will begin onboarding again as a new player\./);
  assert.match(founderDeleteUi, /ACCOUNT DELETED/);
  assert.match(founderDeleteUi, /window\.location\.reload\(\)/);
  assert.doesNotMatch(service, /quality|processor|Stockfish|cron|seven-day|latest-four/i);
  assert.doesNotMatch(adminRoute, /firestore\.rules|quality|processor|Stockfish/);
});

test('Founder danger UX uses C.1 semantic danger roles and is not color-only', () => {
  assert.match(accessibility, /\.founder-delete-account-button/);
  assert.match(accessibility, /var\(--bs-danger-text\)/);
  assert.match(accessibility, /var\(--bs-danger-surface\)/);
  assert.match(founderDeleteUi, /AlertTriangle/);
  assert.match(founderDeleteUi, /PERMANENT DELETION/);
  assert.match(founderDeleteUi, /DELETE BOARDSIGNAL ACCOUNT/);
});


test('historical username aliases for the same stable player are valid history, not canonical conflicts', () => {
  const resolution = section(service, 'for (const alias of [...aliasesByUid.docs, ...aliasesByPlayer.docs])', 'const hasKnownLifecycle');
  const canonicalResolution = section(service, 'const authoritativeCanonicalCandidates = [', 'const hasKnownLifecycle');
  const aliasDeletion = section(service, 'async function deleteIdentityAliases', 'async function assertResetComplete');

  // oldusername -> chesscom_123 / 123 and newusername -> chesscom_123 / 123 are both valid aliases.
  // Alias document IDs must never participate in deciding the current canonical username.
  assert.match(service, /Historical alias document IDs are intentionally NOT canonical authority/);
  assert.match(canonicalResolution, /account\?\.chessCom\?\.canonicalUsername/);
  assert.match(canonicalResolution, /mapping\.data\(\)\?\.canonicalUsername/);
  assert.match(canonicalResolution, /betaAccess\.data\(\)\?\.canonicalUsername/);
  assert.match(canonicalResolution, /betaRequest\.data\(\)\?\.canonicalUsername/);
  assert.match(canonicalResolution, /publicPlayer\.data\(\)\?\.username/);
  assert.match(canonicalResolution, /authUser\?\.customClaims\?\.chessUsername/);
  assert.doesNotMatch(canonicalResolution, /aliasesByUid\.docs\.map\(\(alias\) => alias\.id\)/);
  assert.doesNotMatch(canonicalResolution, /aliasesByPlayer\.docs\.map\(\(alias\) => alias\.id\)/);

  // Typed confirmation is checked only against the resolved current authoritative canonical username.
  assert.match(service, /!canonicalUsername \|\| !sameUsername\(confirmationUsername, canonicalUsername\)/);
  assert.doesNotMatch(service, /sameUsername\(confirmationUsername, alias\.id\)/);

  // Every historical alias is still a strict stable-identity guard.
  assert.match(resolution, /aliasUid !== undefined && String\(aliasUid\) !== uid/);
  assert.match(resolution, /Number\.isSafeInteger\(aliasPlayerId\) && aliasPlayerId !== playerId/);
  assert.match(resolution, /ACCOUNT_DELETION_IDENTITY_CONFLICT|identityConflict/);

  // Both uid and playerId alias indexes are swept, so all aliases for the same player are removed.
  assert.match(aliasDeletion, /where\("uid", "==", uid\)/);
  assert.match(aliasDeletion, /where\("playerId", "==", playerId\)/);
  assert.match(aliasDeletion, /aliasPlayerId !== playerId/);
  assert.match(aliasDeletion, /String\(aliasUid\) !== uid/);
});
