const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const social = require(path.join(root, '.test-dist-friends-rivals/src/lib/boardsignal/social.js'));
const serverSource = fs.readFileSync(path.join(root, 'src/lib/boardsignal/server/social.ts'), 'utf8');
const friendChatSource = fs.readFileSync(path.join(root, 'src/lib/boardsignal/server/friendChat.ts'), 'utf8');
const routeSource = fs.readFileSync(path.join(root, 'src/app/api/boardsignal/social/route.ts'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const roomSource = fs.readFileSync(path.join(root, 'src/components/BoardSignalPlayerRoom.tsx'), 'utf8');
const friendsSource = fs.readFileSync(path.join(root, 'src/components/PlayerFriends.tsx'), 'utf8');
const commsSource = fs.readFileSync(path.join(root, 'src/lib/boardsignal/server/communications.ts'), 'utf8');
const accountDeletionSource = fs.readFileSync(path.join(root, 'src/lib/boardsignal/server/accountDeletion.ts'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
const betaRoute = fs.readFileSync(path.join(root, 'src/app/api/auth/beta-access/sign-in/route.ts'), 'utf8');

function summary(key, end, pools, extra = {}) {
  return {
    deskKey: key,
    periodStart: '2026-08-01',
    periodEnd: end,
    periodLabel: `Desk ${key}`,
    games: 10,
    wins: 6,
    draws: 1,
    losses: 3,
    scorePct: 65,
    pools,
    longestWinRun: 4,
    longestLossRun: 2,
    signalFamilies: {},
    ...extra,
  };
}
function player(id, name) { return { playerId: id, canonicalUsername: name }; }
function socialAccount(id, name, extra = {}) {
  return {
    role: 'player',
    accessStatus: 'active',
    identityStatus: 'founder_reviewed',
    preferencesConfirmedAt: '2026-08-12T00:00:00.000Z',
    contactConfirmedAt: '2026-08-12T00:00:00.000Z',
    chessCom: { playerId: id, canonicalUsername: name },
    ...extra,
  };
}
function oldActiveSocialMember(account) {
  return Boolean(account
    && account.role === 'player'
    && account.accessStatus === 'active'
    && account.accessTier === 'founding_beta'
    && account.betaAgreementVersion === 'founding-beta-2026-08-12'
    && account.betaAgreementAcceptedAt
    && account.universeParticipationDisclosedAt);
}
function contrast(hexA, hexB) {
  const lum = (hex) => {
    const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(c => c <= .03928 ? c/12.92 : ((c+.055)/1.055)**2.4);
    return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  };
  const [a,b] = [lum(hexA),lum(hexB)].sort((x,y)=>y-x);
  return (a+.05)/(b+.05);
}

test('1 player cannot friend themselves', () => {
  assert.deepEqual(social.resolveFriendRequestTransition({ actorPlayerId: 7, targetPlayerId: 7 }), { allowed:false, reason:'self' });
  assert.throws(() => social.canonicalSocialRelationshipId(7,7));
});

test('2 duplicate request is prevented', () => {
  assert.deepEqual(social.resolveFriendRequestTransition({ actorPlayerId: 7, targetPlayerId: 8, existing:{status:'pending',requestedByPlayerId:7} }), { allowed:false, reason:'duplicate' });
  assert.match(serverSource, /socialRequestRateLimits/);
  assert.match(serverSource, /status:\s*429/);
});

test('3 cross-pending request resolves safely', () => {
  assert.deepEqual(social.resolveFriendRequestTransition({ actorPlayerId: 7, targetPlayerId: 8, existing:{status:'pending',requestedByPlayerId:8} }), { allowed:true, action:'accept_mutual' });
  assert.match(serverSource, /accept_mutual/);
});

test('4 unauthorized social request is rejected', () => {
  assert.match(routeSource, /requirePlayerToken\(request\)/);
  assert.doesNotMatch(routeSource, /request\.json\(\)[\s\S]*getAdminDb\(\)/);
});

test('5 Firebase token is required for both GET and POST', () => {
  assert.equal((routeSource.match(/requirePlayerToken\(request\)/g) || []).length, 2);
});

test('6 acceptance creates one canonical friendship', () => {
  assert.equal(social.canonicalSocialRelationshipId(99, 12), '12_99');
  assert.equal(social.canonicalSocialRelationshipId(12, 99), '12_99');
  assert.match(serverSource, /status: "friends"/);
});

test('7 decline does not create a friendship', () => {
  const section = serverSource.slice(serverSource.indexOf('export async function declineFriendRequest'), serverSource.indexOf('export async function cancelFriendRequest'));
  assert.match(section, /transaction\.delete\(db\.collection\("socialRelationships"\)/);
  assert.doesNotMatch(section, /status: "friends"/);
});

test('8 cancel removes pending outgoing request', () => {
  const section = serverSource.slice(serverSource.indexOf('export async function cancelFriendRequest'), serverSource.indexOf('export async function unfriend'));
  assert.match(section, /requestedByPlayerId !== actor\.chessCom\.playerId/);
  assert.match(section, /transaction\.delete/);
});

test('9 unfriend removes canonical relationship and both projections', () => {
  const section = serverSource.slice(serverSource.indexOf('export async function unfriend'), serverSource.indexOf('export async function blockPlayer'));
  assert.ok((section.match(/transaction\.delete/g) || []).length >= 3);
});

test('10 block removes friendship and pending projections', () => {
  const section = serverSource.slice(serverSource.indexOf('export async function blockPlayer'), serverSource.indexOf('export async function setRivalPin'));
  assert.match(section, /socialBlocks/);
  assert.match(section, /socialRelationships/);
  assert.ok((section.match(/transaction\.delete/g) || []).length >= 3);
});

test('11 blocked player cannot send a new request', () => {
  const section = serverSource.slice(serverSource.indexOf('export async function sendFriendRequest'), serverSource.indexOf('async function pendingRelationshipFor'));
  assert.match(section, /blocksEitherDirection/);
  assert.match(section, /social connection is unavailable/);
});

test('12 block status does not leak to the blocked player', () => {
  const section = serverSource.slice(serverSource.indexOf('export async function blockPlayer'), serverSource.indexOf('export async function setRivalPin'));
  assert.match(section, /transaction\.delete\(db\.collection\("users"\)\.doc\(otherUid\)\.collection\("social"\)\.doc\(String\(actor\.chessCom\.playerId\)\)\)/);
  assert.match(section, /status: "blocked"/);
  const blockedProjectionWrites = (section.match(/status: "blocked"/g) || []).length;
  assert.equal(blockedProjectionWrites, 1);
});

test('13 Player A cannot write Player B social documents directly', () => {
  assert.match(rules, /match \/social\/\{otherPlayerId\}[\s\S]*allow read: if isOwner\(userId\);[\s\S]*allow write: if false;/);
  assert.match(rules, /match \/socialRelationships\/\{relationshipId\}[\s\S]*allow read, write: if false;/);
  assert.match(rules, /match \/socialBlocks\/\{blockId\}[\s\S]*allow read, write: if false;/);
});

test('14 Head-to-Head requires accepted friendship context', () => {
  const section = serverSource.slice(serverSource.indexOf('export async function headToHead'));
  assert.match(section, /status !== "friends"/);
  assert.match(section, /Head-to-Head is available after both players accept/);
});

test('15 private Signal fields never enter comparison payload', () => {
  assert.equal(social.socialPayloadHasPrivateFields({ red: { title:'x' } }), true);
  const payload = social.buildHeadToHeadPayload({ left:player(1,'A'), right:player(2,'B'), leftDesks:[], rightDesks:[] });
  assert.equal(social.socialPayloadHasPrivateFields(payload), false);
  assert.equal(payload.privateFieldsExcluded, true);
});

test('16 contact details never enter comparison payload', () => {
  assert.equal(social.socialPayloadHasPrivateFields({ preferredContactValue:'secret' }), true);
  assert.equal(social.socialPayloadHasPrivateFields({ telegram:'@private' }), true);
});

test('17 rating pools remain separate', () => {
  const payload = social.buildHeadToHeadPayload({
    left:player(1,'A'), right:player(2,'B'),
    leftDesks:[summary('L','2026-08-10',[{pool:'rapid',games:10,ratingDelta:20}])],
    rightDesks:[summary('R','2026-08-10',[{pool:'blitz',games:10,ratingDelta:30}])],
  });
  assert.deepEqual(payload.comparablePools, []);
  assert.equal(payload.metrics.some(m => m.key.startsWith('rating:')), false);
});

test('18 latest-four memory remains exact inside comparison', () => {
  const desks = [1,2,3,4,5].map((n) => summary(`D${n}`, `2026-08-${String(14-n).padStart(2,'0')}`, [{pool:'rapid',games:10,ratingDelta:n}]));
  const payload = social.buildHeadToHeadPayload({ left:player(1,'A'), right:player(2,'B'), leftDesks:desks, rightDesks:desks });
  assert.equal(payload.left.desksAvailable, 4);
  assert.equal(payload.right.desksAvailable, 4);
});

test('19 expired fifth Desk no longer affects current comparison', () => {
  const current = [summary('D1','2026-08-12',[{pool:'rapid',games:10,ratingDelta:1}]), summary('D2','2026-08-11',[{pool:'rapid',games:10,ratingDelta:1}]), summary('D3','2026-08-10',[{pool:'rapid',games:10,ratingDelta:1}]), summary('D4','2026-08-09',[{pool:'rapid',games:10,ratingDelta:1}]), summary('OLD','2026-08-01',[{pool:'rapid',games:10,ratingDelta:999}])];
  const payload = social.buildHeadToHeadPayload({ left:player(1,'A'), right:player(2,'B'), leftDesks:current, rightDesks:current });
  const rating = payload.metrics.find(m => m.key === 'rating:rapid');
  assert.equal(rating.leftValue, '+4');
});

test('20 game links respect existing sharing controls', () => {
  const payload = social.buildHeadToHeadPayload({ left:player(1,'A'), right:player(2,'B'), leftDesks:[], rightDesks:[], leftPublicGameLinks:true, rightPublicGameLinks:false });
  assert.deepEqual(payload.gameLinksEnabled, { left:true, right:false });
});

test('21 Universe Pulse remains functional and reused', () => {
  assert.match(serverSource, /loadActiveUniverseState/);
  assert.match(roomSource, /pulse={snapshot\.pulse}/);
  assert.doesNotMatch(serverSource, /collection\("socialPulse"\)/);
});

test('22 friend social events remain private to intended player', () => {
  assert.match(routeSource, /requirePlayerToken/);
  assert.match(serverSource, /socialOverview\(actor/);
  assert.doesNotMatch(rules, /match \/socialRelationships[\s\S]*allow read: if true/);
});

test('23 existing Inbox architecture is reused for friend notifications', () => {
  assert.match(commsSource, /sendRelationshipNotification/);
  assert.match(commsSource, /collection\("inbox"\)/);
  assert.match(serverSource, /sendRelationshipNotification/);
});

test('24 Beta Access remains intact', () => {
  assert.match(betaRoute, /authenticateFoundingBetaAccess/);
  assert.doesNotMatch(serverSource, /betaAccess.*set|betaAccess.*delete/);
  assert.match(roomSource, /ChessComLoginPanel/);
});

test('25 semantic contrast tokens and forbidden light-surface failures are gated', () => {
  assert.match(css, /--bs-text-primary: var\(--ink\)/);
  assert.match(css, /--bs-text-secondary: var\(--ink-soft\)/);
  assert.match(css, /--bs-text-on-dark: var\(--white\)/);
  assert.match(css, /\.bs-surface-light \{ background: var\(--bs-surface-light\); color: var\(--bs-text-primary\); \}/);
  assert.match(css, /\.friends-surface[\s\S]*background: var\(--bs-surface-light\); color: var\(--bs-text-primary\)/);
  assert.ok(contrast('#101923','#fffdf8') >= 4.5);
  assert.ok(contrast('#263342','#fffdf8') >= 4.5);
  assert.ok(contrast('#68717a','#fffdf8') >= 4.5);
  assert.ok(contrast('#fffdf8','#101923') >= 4.5);
  assert.ok(contrast('#c9f65d','#101923') >= 4.5);
  assert.ok(contrast('#c9f65d','#fffdf8') < 4.5, 'lime on pale is intentionally recognized as forbidden body-copy contrast');
  assert.ok(contrast('#5e7f10','#fffdf8') >= 4.5, 'darkened lime semantic text accent is AA-safe on pale');
  assert.match(css, /\.tone-coral \{ --card-accent: var\(--danger\); \}/);
  assert.match(friendsSource, /HEAD TO HEAD/);
});

test('26 paid and Universe-opted-out players remain valid social recipients', () => {
  const account = socialAccount(101, 'PaidPlayer', {
    accessTier: 'paid',
    privacy: { universeCoverage: false },
    universeParticipationDisclosedAt: undefined,
  });
  assert.equal(social.canReceiveSocialConnection(account), true);
  assert.equal(social.canInitiateSocialConnection(account), true);
});

test('27 provisional, revoked, inactive and deleted identities fail closed', () => {
  assert.equal(social.canReceiveSocialConnection(socialAccount(1, 'P', { identityStatus:'provisional' })), false);
  assert.equal(social.canReceiveSocialConnection(socialAccount(2, 'R', { identityStatus:'revoked' })), false);
  assert.equal(social.canReceiveSocialConnection(socialAccount(3, 'I', { accessStatus:'paused' })), false);
  assert.equal(social.canExposeStoredSocialIdentity(socialAccount(4, 'D', { accessStatus:'deleted' })), false);
});

test('28 initiating social action requires current Player Room readiness, not beta-era fields', () => {
  const ready = socialAccount(7, 'Ready', { accessTier:'paid' });
  const notReady = { ...ready, contactConfirmedAt: undefined };
  assert.equal(social.canInitiateSocialConnection(ready), true);
  assert.equal(social.canInitiateSocialConnection(notReady), false);
  assert.equal(social.canInteractSocialConnection(notReady), false);
  assert.equal(Object.hasOwn(ready, 'universeParticipationDisclosedAt'), false);
});

test('28.1 current interaction availability is stricter than receive/discovery eligibility', () => {
  const receiveOnly = socialAccount(8, 'ReceiveOnly', { contactConfirmedAt: undefined });
  assert.equal(social.canReceiveSocialConnection(receiveOnly), true);
  assert.equal(social.canInteractSocialConnection(receiveOnly), false);
});

test('29 reported old eligibility contradiction is deterministically reproduced and removed', () => {
  const requester = socialAccount(11, 'Requester', { accessTier:'paid' });
  const recipient = socialAccount(22, 'Recipient', {
    accessTier:'founding_beta',
    betaAgreementVersion:'founding-beta-2026-08-12',
    betaAgreementAcceptedAt:'2026-08-12T00:00:00.000Z',
    universeParticipationDisclosedAt:'2026-08-12T00:00:00.000Z',
  });
  assert.equal(oldActiveSocialMember(requester), false, 'old read/search predicate hid requester');
  assert.equal(oldActiveSocialMember(recipient), true, 'old send path could resolve recipient');
  assert.equal(social.canInitiateSocialConnection(requester), true, 'new actor contract accepts legitimate requester');
  assert.equal(social.canReceiveSocialConnection(requester), true, 'new overview/search contract resolves same requester');
  assert.deepEqual(social.resolveFriendRequestTransition({ actorPlayerId:11, targetPlayerId:22 }), { allowed:true, action:'create_pending' });
  const send = serverSource.slice(serverSource.indexOf('export async function sendFriendRequest'), serverSource.indexOf('async function pendingRelationshipFor'));
  assert.ok(send.indexOf('assertCanInitiateSocial(actor)') < send.indexOf('receivableAccountByPlayerId(targetPlayerId)'));
  assert.ok(send.indexOf('assertCanInitiateSocial(actor)') < send.indexOf('socialRequestRateLimits'));
});

test('30 valid pending relationship projection remains representable when counterpart becomes unavailable', () => {
  const relationship = { id:'11_22', playerAId:11, playerAUid:'uid11', playerBId:22, playerBUid:'uid22', status:'pending', requestedByPlayerId:22, requestedAt:'x', updatedAt:'x' };
  const projection = { relationshipId:'11_22', otherPlayerId:22, canonicalUsername:'Requester', status:'incoming', updatedAt:'x' };
  assert.equal(social.relationshipProjectionMatches(11, 'uid11', projection, relationship), true);
  const card = social.unavailableRelationshipCard(projection, true);
  assert.equal(card.availability, 'unavailable');
  assert.equal(card.relationshipStatus, 'incoming');
  assert.equal(card.canonicalUsername, 'Requester');
});

test('31 orphan or mismatched projection is never upgraded into a relationship', () => {
  const relationship = { id:'11_33', playerAId:11, playerAUid:'uid11', playerBId:33, playerBUid:'uid33', status:'pending', requestedByPlayerId:33, requestedAt:'x', updatedAt:'x' };
  const projection = { relationshipId:'11_22', otherPlayerId:22, canonicalUsername:'Ghost', status:'incoming', updatedAt:'x' };
  assert.equal(social.relationshipProjectionMatches(11, 'uid11', projection, relationship), false);
  assert.match(serverSource, /if \(!relationshipSnapshot\.exists\) return undefined/);
  assert.match(serverSource, /relationshipProjectionMatches/);
});

test('32 revoked/deleted fallback is an opaque private-safe tombstone', () => {
  const projection = { relationshipId:'11_22', otherPlayerId:22, canonicalUsername:'SecretName', avatar:'https://example.test/a.png', status:'friends', updatedAt:'x', rivalPinned:true };
  const card = social.unavailableRelationshipCard(projection, false);
  assert.deepEqual(card, {
    playerId:22,
    canonicalUsername:'BoardSignal player',
    relationshipStatus:'friends',
    availability:'unavailable',
    identityHidden:true,
  });
  assert.equal(social.socialPayloadHasPrivateFields(card), false);
});

test('33 safe unavailable relationship keeps only minimal stored identity', () => {
  const projection = { relationshipId:'11_22', otherPlayerId:22, canonicalUsername:'KnownFriend', avatar:'https://example.test/a.png', status:'friends', updatedAt:'x', rivalPinned:true };
  const card = social.unavailableRelationshipCard(projection, true);
  assert.equal(card.canonicalUsername, 'KnownFriend');
  assert.equal(card.avatar, undefined);
  assert.equal(card.profileUrl, undefined);
  assert.equal(card.rivalPinned, undefined);
  assert.equal(card.safeHighlight, undefined);
  assert.equal(card.universePlacement, undefined);
});

test('34 overview uses canonical fallback only after normal resolution fails', () => {
  const section = serverSource.slice(serverSource.indexOf('export async function socialOverview'), serverSource.indexOf('export async function headToHead'));
  assert.match(section, /interactableAccountByPlayerId\(item\.otherPlayerId\)\.catch/);
  assert.match(section, /return unavailableCardForProjection\(actor, item\)/);
  const fallback = serverSource.slice(serverSource.indexOf('async function unavailableCardForProjection'), serverSource.indexOf('export async function socialOverview'));
  assert.match(fallback, /collection\("socialRelationships"\)\.doc\(id\)\.get\(\)/);
  assert.match(fallback, /relationshipProjectionMatches/);
});

test('35 unavailable pending request stays visible with Decline but no Accept action', () => {
  assert.match(friendsSource, /player\.availability === "unavailable"[\s\S]*Currently unavailable[\s\S]*socialAction\("decline"/);
  assert.doesNotMatch(friendsSource, /player\.availability === "unavailable"[\s\S]{0,180}socialAction\("accept"/);
});

test('36 unavailable accepted friend disables interaction but preserves cleanup controls', () => {
  const unavailableBranch = friendsSource.slice(friendsSource.indexOf('player.availability === "unavailable" ? <>'), friendsSource.indexOf('</> : <>'));
  assert.match(unavailableBranch, /Compare unavailable/);
  assert.match(unavailableBranch, /Message unavailable/);
  assert.match(unavailableBranch, /Rival Watch unavailable/);
  assert.match(unavailableBranch, /socialAction\("unfriend"/);
  assert.match(unavailableBranch, /socialAction\("block"/);
});

test('37 existing unavailable counterpart can still be blocked without discovery eligibility', () => {
  const section = serverSource.slice(serverSource.indexOf('export async function blockPlayer'), serverSource.indexOf('export async function setRivalPin'));
  assert.ok(section.indexOf('relationshipRef.get()') < section.indexOf('receivableAccountByPlayerId(otherPlayerId)'));
  assert.match(section, /relationshipOtherUid/);
  assert.match(section, /rawAccountByPlayerId/);
  assert.match(section, /else \{[\s\S]*assertCanInitiateSocial\(actor\)[\s\S]*receivableAccountByPlayerId/);
  assert.match(section, /transaction\.delete\(db\.collection\("users"\)\.doc\(otherUid\)/);
});

test('38 Head-to-Head requires both accepted relationship and current social interaction availability', () => {
  const section = serverSource.slice(serverSource.indexOf('export async function headToHead'), serverSource.indexOf('export async function suggestedSocialPlayers'));
  assert.match(section, /assertCanInitiateSocial\(actor\)/);
  assert.match(section, /status !== "friends"/);
  assert.match(section, /interactableAccountByPlayerId\(otherPlayerId\)/);
});

test('39 friend messaging enforces the same actor and target social availability contract', () => {
  assert.match(friendChatSource, /canInitiateSocialConnection/);
  assert.match(friendChatSource, /canInteractSocialConnection/);
  assert.ok((friendChatSource.match(/assertCanInitiateSocial\(account\)/g) || []).length >= 2);
  assert.match(friendChatSource, /account\.chessCom\.playerId !== targetPlayerId \|\| !canInteractSocialConnection\(account\)/);
});

test('40 discovery no longer depends on Founding Beta, Universe disclosure or Universe coverage', () => {
  assert.doesNotMatch(serverSource, /activeSocialMember/);
  assert.doesNotMatch(serverSource, /accessTier === "founding_beta"/);
  assert.doesNotMatch(serverSource, /universeParticipationDisclosedAt/);
  const search = serverSource.slice(serverSource.indexOf('export async function searchSocialPlayers'), serverSource.indexOf('function socialEventKey'));
  assert.match(search, /\.filter\(canReceiveSocialConnection\)/);
});

test('41 accepted private friendship survives Universe opt-out semantics', () => {
  const optedOut = socialAccount(55, 'PrivateUniverse', { privacy:{ universeCoverage:false } });
  assert.equal(social.canReceiveSocialConnection(optedOut), true);
  assert.match(serverSource, /publicUniverseAllowed = account\.privacy\?\.universeCoverage !== false/);
});

test('42 completed account deletion still removes canonical social state', () => {
  assert.match(accountDeletionSource, /collection\("socialRelationships"\)/);
  assert.match(accountDeletionSource, /deleteDirectSocialProjection/);
  assert.match(accountDeletionSource, /deleteRelationshipInboxArtifacts/);
  assert.match(accountDeletionSource, /deleteOrphanSocialProjections/);
});

test('43 eligible accepted friend remains searchable with projection-derived relationship status', () => {
  const search = serverSource.slice(serverSource.indexOf('export async function searchSocialPlayers'), serverSource.indexOf('function socialEventKey'));
  assert.match(search, /projectionMap/);
  assert.match(search, /safePlayerCard\(account, projectionMap\.get\(account\.chessCom\.playerId\), state\)/);
});

test('44 Universe-visible and social-eligible player is discoverable without coupling the privacy models', () => {
  const account = socialAccount(66, 'UniversePlayer', { privacy:{ universeCoverage:true } });
  assert.equal(social.canReceiveSocialConnection(account), true);
  assert.doesNotMatch(serverSource, /canReceiveSocialConnection[\s\S]{0,120}universeCoverage/);
});

test('45 mutual cross-request still resolves into one canonical friendship transition', () => {
  const existing = { status:'pending', requestedByPlayerId:22 };
  assert.deepEqual(social.resolveFriendRequestTransition({ actorPlayerId:11, targetPlayerId:22, existing }), { allowed:true, action:'accept_mutual' });
  assert.equal(social.canonicalSocialRelationshipId(11,22), '11_22');
  assert.equal(social.canonicalSocialRelationshipId(22,11), '11_22');
  const send = serverSource.slice(serverSource.indexOf('export async function sendFriendRequest'), serverSource.indexOf('async function pendingRelationshipFor'));
  assert.match(send, /accept_mutual[\s\S]*canInteractSocialConnection\(target\)/);
});

test('46 duplicate and retry paths cannot create duplicate relationship or request notification state', () => {
  assert.deepEqual(social.resolveFriendRequestTransition({ actorPlayerId:11, targetPlayerId:22, existing:{status:'pending',requestedByPlayerId:11} }), { allowed:false, reason:'duplicate' });
  const send = serverSource.slice(serverSource.indexOf('export async function sendFriendRequest'), serverSource.indexOf('async function pendingRelationshipFor'));
  assert.match(send, /if \(latest\.exists\) throw Object\.assign\(new Error\("A social relationship already exists/);
  assert.equal((send.match(/id: `friend_request_\$\{relationship\.id\}`/g) || []).length, 1);
});

test('47 fallback payload never exposes private account or enrichment fields', () => {
  const projection = { relationshipId:'11_22', otherPlayerId:22, canonicalUsername:'SafeName', avatar:'secret-avatar', status:'incoming', updatedAt:'x' };
  const card = social.unavailableRelationshipCard(projection, true);
  assert.equal(social.socialPayloadHasPrivateFields(card), false);
  for (const key of ['avatar','profileUrl','latestDeskPeriod','primaryPool','safeHighlight','universePlacement','rivalPinned']) {
    assert.equal(card[key], undefined, `${key} must not enter unavailable fallback`);
  }
});
