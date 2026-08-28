const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const shared = read('src/lib/boardsignal/reviewJournal.ts');
const server = read('src/lib/boardsignal/server/reviewJournal.ts');
const route = read('src/app/api/boardsignal/review-journal/route.ts');
const roomRoute = read('src/app/api/boardsignal/player-room/route.ts');
const room = read('src/components/BoardSignalPlayerRoom.tsx');
const journalUi = read('src/components/PlayerReviewJournal.tsx');
const offlineRoom = read('src/components/OfflinePlayerRoom.tsx');
const offlineTypes = read('src/lib/boardsignal/offline/types.ts');
const offlineSnapshots = read('src/lib/boardsignal/offline/snapshots.ts');
const deletion = read('src/lib/boardsignal/server/accountDeletion.ts');
const privacy = read('src/app/boardsignal/privacy/page.tsx');
const contract = read('BOARD_SIGNAL_PRODUCT_CONTRACT.md');
const css = read('src/app/boardsignal-player-room-g3.css');
const trustpilot = read('src/app/api/boardsignal/trustpilot-invitation/route.ts');
const publicProfile = read('src/lib/boardsignal/server/publicProfile.ts');
const universe = read('src/lib/boardsignal/server/universePulse.ts');
const guide = read('src/lib/boardsignal/server/guide.ts');

test('Patch J defines all three plainly labelled private note types and bounded input', () => {
  assert.match(shared, /noticed:[\s\S]*label: "WHAT I NOTICED"/);
  assert.match(shared, /try_next:[\s\S]*label: "WHAT I'LL TRY"/);
  assert.match(shared, /follow_up:[\s\S]*label: "FOLLOW-UP"/);
  assert.match(shared, /REVIEW_JOURNAL_MAX_NOTE_LENGTH = 1000/);
  assert.match(shared, /REVIEW_JOURNAL_MAX_NOTES = 260/);
  assert.match(server, /REVIEW_JOURNAL_EMPTY_NOTE/);
  assert.match(server, /REVIEW_JOURNAL_NOTE_TOO_LONG/);
  assert.match(journalUi, /maxLength=\{REVIEW_JOURNAL_MAX_NOTE_LENGTH\}/);
});

test('mutations are authenticated, UID-derived, validated, private and transaction safe', () => {
  assert.equal((route.match(/requirePlayerToken\(request\)/g) || []).length, 3);
  assert.equal((route.match(/token\.uid/g) || []).length, 3);
  assert.doesNotMatch(route, /body\.uid|uid:\s*body/);
  assert.match(route, /private, no-store/);
  assert.match(route, /"Vary": "Authorization"/);
  assert.match(server, /collection\("users"\)\.doc\(uid\)\.collection\("private"\)\.doc\("reviewJournal"\)/);
  assert.equal((server.match(/runTransaction/g) || []).length, 3);
  assert.match(server, /const next = \{ \.\.\.notes, \[noteId\]: note \}/);
  assert.match(server, /const next = \{ \.\.\.notes, \[noteId\]: \{ \.\.\.existing, type, body, updatedAt: now \} \}/);
  assert.match(server, /createdAt: now, updatedAt: now/);
  assert.match(server, /delete next\[noteId\]/);
});

test('completed Review truth is never mutated by journal persistence', () => {
  assert.doesNotMatch(server, /collection\("desks"\)|engineResults|signals|reviewLifecycle|rank/i);
  assert.match(contract, /never mutate, score, reinterpret or become part of BoardSignal's immutable completed Review truth/);
  assert.match(journalUi, /do not change BoardSignal's Review/);
  assert.match(journalUi, /This removes only this private note\. Your BoardSignal Review stays unchanged/);
});

test('journal loading is one bounded document read and never O(number of Reviews)', () => {
  const loader = server.slice(server.indexOf('export async function loadReviewJournal'), server.indexOf('export async function addReviewJournalNote'));
  assert.equal((loader.match(/\.get\(\)/g) || []).length, 1);
  assert.doesNotMatch(loader, /for\s*\(|\.map\([\s\S]*\.get\(/);
  assert.equal((roomRoute.match(/loadReviewJournal\(account\.uid\)/g) || []).length, 1);
  assert.match(contract, /at most one bounded document read/);
});

test('durable journal survives heavy Review rotation without retaining evidence payloads', () => {
  assert.match(server, /collection\("private"\)\.doc\("reviewJournal"\)/);
  assert.doesNotMatch(server, /engineResults|evidence|reviewed.position|stockfish/i);
  assert.match(shared, /reviewKey: string;[\s\S]*periodStart: string;[\s\S]*periodEnd: string;[\s\S]*periodLabel: string;/);
  assert.match(shared, /type: ReviewJournalNoteType;[\s\S]*body: string;[\s\S]*createdAt: string;[\s\S]*updatedAt: string;/);
  assert.match(contract, /Expired engine payloads, reviewed positions and evidence are not retained/);
});

test('account deletion and public/privacy isolation are explicit', () => {
  assert.match(deletion, /PRIVATE_PLAYER_SUBCOLLECTIONS[\s\S]*"private"/);
  assert.match(privacy, /player-authored Review notes/);
  assert.match(privacy, /account deletion removes the journal/);
  for (const publicSource of [trustpilot, publicProfile, universe]) {
    assert.doesNotMatch(publicSource, /reviewJournal|ReviewJournalNote|WHAT I NOTICED|WHAT I'LL TRY|FOLLOW-UP/);
  }
  assert.doesNotMatch(guide, /reviewJournal|ReviewJournalNote/);
  assert.doesNotMatch(roomRoute, /recordGuidePlayerRoomSnapshot\([^;]*reviewJournal/);
  assert.match(contract, /do not enter Universe, public player pages, public highlights, Share Moments, Founder public coverage, Trustpilot payloads/);
});

test('PWA keeps synced notes readable and disables offline mutation', () => {
  assert.match(offlineTypes, /reviewJournal\?: ReviewJournal/);
  assert.match(offlineSnapshots, /reviewJournal: input\.reviewJournal \?\? \{ version: 1, notes: \[\] \}/);
  assert.match(room, /savePlayerRoomOfflineSnapshot\(user\.uid, next\)/);
  assert.match(offlineRoom, /PlayerReviewJournal[\s\S]*online=\{false\}/);
  assert.match(offlineRoom, /PlayerReviewNotesTimeline[\s\S]*online=\{false\}/);
  assert.match(journalUi, /Reconnect to update your notes/);
  assert.match(journalUi, /disabled=\{!online \|\| busy\}/);
});

test('UI uses progressive disclosure, explicit actions and mobile-accessible controls', () => {
  assert.match(journalUi, /\+ ADD A NOTE/);
  assert.match(journalUi, /Save note/);
  assert.match(journalUi, /Save changes/);
  assert.match(journalUi, />Cancel</);
  assert.match(journalUi, /Delete note/);
  assert.match(journalUi, /Confirm note deletion/);
  assert.match(journalUi, /<legend>Choose a note type<\/legend>/);
  assert.match(journalUi, /htmlFor=\{`\$\{fieldId\}-body`\}/);
  assert.match(journalUi, /<details className="review-journal-progress">/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /var\(--bs-text-primary\)/);
  assert.match(css, /var\(--bs-text-secondary\)/);
});
