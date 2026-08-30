const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const admin = read('src/app/admin/page.tsx');
const route = read('src/app/api/admin/boardsignal/founder-engagement/route.ts');
const projection = read('src/lib/boardsignal/server/founderEngagement.ts');
const room = read('src/lib/boardsignal/server/playerRoomEngagement.ts');
const feedback = read('src/lib/boardsignal/server/currentFeedback.ts');
const journal = read('src/lib/boardsignal/server/reviewJournal.ts');
const guide = read('src/app/api/boardsignal/guide/route.ts');
const publicProof = read('src/lib/boardsignal/server/publicProof.ts');
const homeProof = read('src/components/HomeProofRail.tsx');

test('Founder landing no longer mounts the eager signup/account repair dashboard', () => {
  assert.doesNotMatch(admin, /FounderSignupIntelligence/);
  assert.match(admin, /FounderOperationsConsole/);
});

test('Founder engagement GET is read-only and does not invoke repair/bootstrap operations', () => {
  assert.match(route, /founderOperationsState/);
  assert.match(route, /where\("role", "==", "player"\)/);
  assert.doesNotMatch(route, /founderOperationsSnapshot|reconcileFounder|refreshFounder|\.set\(|\.update\(|\.delete\(/);
});

test('M4 uses compact explicit projections rather than raw event documents', () => {
  assert.match(projection, /engagement\.roomVisits/);
  assert.match(projection, /engagement\.foregroundEngagedSeconds/);
  assert.match(projection, /engagement\.helpful/);
  assert.match(projection, /engagement\.notesCreated/);
  assert.match(projection, /engagement\.askQuestions/);
  assert.doesNotMatch(projection, /collection\("events"\)|collection\("sessions"\)|collection\("clicks"\)/);
});

test('M3 visit semantics remain session-deduped while M4 records cumulative foreground time', () => {
  assert.match(room, /lastCountedSessionId === sessionId/);
  assert.match(room, /previousVisitCount: count/);
  assert.match(room, /nextVisitCount: nextCount/);
  assert.match(room, /totalForegroundEngagedSeconds/);
  assert.match(room, /latestSummarySessionId === sessionId/);
});

test('Helpful, note and Ask projections are attached only to explicit actions', () => {
  assert.match(feedback, /recordFounderFeedbackProjection/);
  assert.match(journal, /recordFounderNoteActivityByUid/);
  assert.match(guide, /recordFounderAskUsageByUid/);
  assert.match(guide, /body\.mode !== "beta_preview"/);
});

test('Founder privacy boundary does not read private journal or Ask conversation stores', () => {
  assert.doesNotMatch(route, /reviewJournal|conversations|messages|guideAnalytics/);
  assert.doesNotMatch(route, /\.body\b|question|answer|recentConversation/);
});

test('Homepage no longer calls verified Review production retention Reviews', () => {
  assert.doesNotMatch(publicProof, /retentionReviews/);
  assert.doesNotMatch(homeProof, /retention Reviews from later player cycles/);
});
