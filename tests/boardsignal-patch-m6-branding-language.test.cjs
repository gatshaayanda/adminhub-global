const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const layout = read('src/app/layout.tsx');
const manifest = read('src/app/manifest.ts');
const home = read('src/app/page.tsx');
const username = read('src/components/UsernameDeskForm.tsx');
const room = read('src/components/BoardSignalPlayerRoom.tsx');
const quickRead = read('src/components/PlayerRoomQuickRead.tsx');
const journal = read('src/components/PlayerReviewJournal.tsx');
const returnPrompt = read('src/components/DeskReturnChannelPrompt.tsx');
const currentEngagement = read('src/components/CurrentBoardSignalEngagement.tsx');
const ask = read('src/components/AskBoardSignal.tsx');
const feed = read('src/app/feed/page.tsx');
const sw = read('public/sw.js');
const offlineRoom = read('src/components/OfflinePlayerRoom.tsx');
const trustpilotRoute = read('src/app/api/boardsignal/trustpilot-invitation/route.ts');
const playerRoomEngagement = read('src/lib/boardsignal/server/playerRoomEngagement.ts');
const founderFeedback = read('src/lib/boardsignal/server/currentFeedback.ts');
const founderJournal = read('src/lib/boardsignal/server/reviewJournal.ts');
const guideRoute = read('src/app/api/boardsignal/guide/route.ts');

const majorBrandSurfaces = [layout, manifest, home, returnPrompt, feed].join('\n');

test('1. primary BoardSignal companion positioning is explicit', () => {
  assert.match(layout, /Your personal chess improvement companion/);
  assert.match(home, /Your personal chess improvement companion\./);
  assert.match(home, /Understand what&apos;s happening in your chess as you play — and know what to work on next\./);
  assert.match(manifest, /Chess Improvement Companion/);
});

test('2. Current BoardSignal remains the live experience and Guidance points to upcoming games', () => {
  assert.match(room, /label: "Current"/);
  assert.match(room, /CURRENT BOARDSIGNAL/);
  assert.match(room, /LIVE PLAYER VIEW/);
  assert.match(room, /BEFORE YOUR NEXT GAME/);
  assert.match(room, /WHAT BOARDSIGNAL IS WATCHING/);
  assert.match(currentEngagement, /CURRENT PERIOD · PROVISIONAL/);
  assert.match(currentEngagement, /LEVEL 1 · QUICK CUE/);
});

test('3. completed historical objects remain Reviews rather than being renamed', () => {
  assert.match(room, /LAST COMPLETED REVIEW/);
  assert.match(room, /This Review is complete and immutable/);
  assert.match(quickRead, /COMPLETED REVIEW/);
  assert.match(quickRead, /Five things to know before you open the deeper Review\./);
  assert.match(feed, /latest eligible completed Review/);
});

test('4. stale report-factory identity framing is absent from major surfaces', () => {
  for (const pattern of [
    /Personal chess performance review/i,
    /BoardSignal — Weekly Chess Review/i,
    /Your weekly chess Review/i,
    /weekly chess report/i,
    /NEVER MISS YOUR NEXT REVIEW/i,
    /Your next seven-day Review will land here automatically/i,
    /Show me my review/i,
  ]) assert.doesNotMatch(majorBrandSurfaces, pattern);
});

test('5. Player Room hierarchy from M1 remains Current then historical Review memory', () => {
  const current = room.indexOf('CURRENT BOARDSIGNAL');
  const historical = room.indexOf('LAST COMPLETED REVIEW');
  assert.ok(current >= 0 && historical > current);
  assert.match(room, /Completed Reviews stay behind the current picture\./);
  assert.match(room, /ProgressSection/);
  assert.match(room, /UniverseRoomPanel/);
});

test('6. M3 visit deduplication remains intact', () => {
  assert.match(playerRoomEngagement, /lastCountedSessionId\s*===\s*sessionId/);
  assert.match(playerRoomEngagement, /previousVisitCount:\s*count/);
  assert.match(playerRoomEngagement, /nextVisitCount:\s*nextCount/);
});

test('7. M4 explicit-action engagement behavior remains intact', () => {
  assert.match(founderFeedback, /recordFounderFeedbackProjection/);
  assert.match(founderJournal, /recordFounderNoteActivityByUid/);
  assert.match(guideRoute, /recordFounderAskUsageByUid/);
  assert.match(guideRoute, /body\.mode\s*!==\s*"beta_preview"/);
});

test('8. private Note and Ask content protections remain intact', () => {
  assert.match(journal, /Your note stays private/);
  assert.match(journal, /No private notes for your current BoardSignal yet\./);
  assert.match(journal, /ADD A NOTE/);
  assert.match(journal, /ASK BOARDSIGNAL/);
  assert.doesNotMatch(founderJournal, /public.*note\.body/i);
  assert.match(ask, /recentConversationForServer/);
});

test('9. Google-first access semantics remain intact and Founder approval is not reintroduced', () => {
  assert.match(username, /GoogleSignInButton/);
  assert.match(username, /action: "return"/);
  assert.match(username, /GOOGLE_ACCESS_NOT_LINKED/);
  assert.match(username, /router\.replace\("\/boardsignal\/player-room\?source=google&tab=desk"\)/);
  assert.doesNotMatch(username, /Founder approval|wait for Founder|approve access/i);
});

test('10. M3 Trustpilot visit rhythm and neutral invitation boundary remain intact', () => {
  assert.match(trustpilotRoute, /account\.accessStatus !== "active"/);
  assert.match(trustpilotRoute, /count === 3/);
  assert.match(trustpilotRoute, /count === 6/);
  assert.doesNotMatch(trustpilotRoute, /reviewProduction/);
  assert.doesNotMatch(trustpilotRoute, /starRating|trustScore|positiveExperience|negativeExperience|sentiment|feedbackScore/i);
  assert.match(playerRoomEngagement, /if\s*\(count\s*===\s*3\)\s*return\s*"first"/);
  assert.match(playerRoomEngagement, /if\s*\(count\s*===\s*6\)\s*return\s*"final"/);
});

test('11. PWA/offline architecture stays intact while its identity copy follows M6', () => {
  assert.match(manifest, /start_url:\s*"\/boardsignal\?source=pwa"/);
  assert.match(manifest, /display:\s*"standalone"/);
  assert.match(sw, /\/boardsignal\/player-room/);
  assert.match(sw, /\/offline\/player-room/);
  assert.match(offlineRoom, /You're offline\. Showing your saved BoardSignal from/);
  assert.match(offlineRoom, /Latest four saved Reviews/);
});

test("12. Universe stays secondary to the player's own BoardSignal", () => {
  assert.ok(home.indexOf('Your personal chess improvement companion.') < home.indexOf('homepage-universe-entry'));
  assert.match(home, /Explore the Universe/);
  assert.match(feed, /The wider BoardSignal world around your improvement\./);
  assert.doesNotMatch(currentEngagement, /AROUND THE UNIVERSE|THE BOARDSIGNAL UNIVERSE/);
});
