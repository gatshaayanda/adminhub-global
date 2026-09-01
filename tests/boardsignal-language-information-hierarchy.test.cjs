const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const layout = read('src/app/layout.tsx');
const manifest = read('src/app/manifest.ts');
const home = read('src/app/page.tsx');
const username = read('src/components/UsernameDeskForm.tsx');
const room = read('src/components/BoardSignalPlayerRoom.tsx');
const review = read('src/components/UniversalPlayerDesk.tsx');
const journal = read('src/components/PlayerReviewJournal.tsx');
const ask = read('src/components/AskBoardSignal.tsx');
const currentEngagement = read('src/components/CurrentBoardSignalEngagement.tsx');
const preview = read('src/components/BetaPreviewRoom.tsx');
const publicPlayer = read('src/app/player/[handle]/page.tsx');
const feed = read('src/app/feed/page.tsx');
const header = read('src/components/Header.tsx');
const types = read('src/lib/boardsignal/types.ts');

function sourceOrder(source, fragments) {
  let previous = -1;
  for (const fragment of fragments) {
    const index = source.indexOf(fragment);
    assert.notEqual(index, -1, `missing ${fragment}`);
    assert.ok(index > previous, `${fragment} is out of required order`);
    previous = index;
  }
}

test('BoardSignal presents the companion identity before mechanics or community', () => {
  assert.match(layout, /BoardSignal — Your personal chess improvement companion/);
  assert.match(manifest, /BoardSignal — Chess Improvement Companion/);
  assert.match(home, /Your personal chess improvement companion\./);
  assert.match(home, /Understand what&apos;s happening in your chess as you play — and know what to work on next\./);
  sourceOrder(home, ['personal-hero', 'hero-username-card', '<HomeProofRail', 'homepage-universe-entry', 'THE BOARDSIGNAL UNIVERSE']);
  assert.doesNotMatch(home, /Personal chess performance review|BoardSignal reviews your recent Chess\.com games together/);
});

test('Google-first onboarding starts or resumes the player BoardSignal rather than requesting reports', () => {
  assert.match(username, /GET MY BOARDSIGNAL/);
  assert.match(username, /GoogleSignInButton/);
  assert.match(username, /action: "return"/);
  assert.match(username, /Already have BoardSignal\?/);
  assert.match(username, /New here\?/);
  assert.doesNotMatch(username, /weekly reports?|four reports per month|Founder approval/i);
});

test('Current BoardSignal is the live Player Room lead and completed Reviews sit behind it', () => {
  assert.match(header, /label: "My BoardSignal", href: "\/boardsignal\/player-room"/);
  assert.match(room, /MY BOARDSIGNAL/);
  assert.match(room, /label: "Current"/);
  assert.match(room, /CURRENT BOARDSIGNAL/);
  assert.match(room, /BEFORE YOUR NEXT GAME/);
  assert.match(room, /LAST COMPLETED REVIEW/);
  assert.match(room, /This Review is complete and immutable; it now sits behind your Current BoardSignal\./);
  assert.match(room, /A game-bearing completed Review then moves behind Current BoardSignal\./);
  assert.ok(room.indexOf('CURRENT BOARDSIGNAL') < room.indexOf('LAST COMPLETED REVIEW'));
  assert.match(types, /export type BoardSignalDesk =/);
});

test('completed private Reviews remain Reviews and preserve their deeper Review language', () => {
  assert.match(review, /WHAT HAPPENED/);
  assert.match(review, /WHAT MATTERED/);
  assert.match(review, /FOCUS NEXT/);
  assert.match(review, /HOW IT UNFOLDED/);
  assert.match(review, /WHY BOARDSIGNAL THINKS THIS/);
  assert.match(review, /Your factual week is ready/);
  assert.match(review, /Your week is ready\. Position review is finishing\./);
});

test('Notes and Ask BoardSignal stay part of the personal current context without exposing private content', () => {
  assert.match(journal, /YOUR TAKE/);
  assert.match(journal, /No private notes for your current BoardSignal yet\./);
  assert.match(journal, /ADD A NOTE/);
  assert.match(journal, /ASK BOARDSIGNAL/);
  assert.match(journal, /Your note stays private/);
  assert.match(ask, /Ask BoardSignal/);
  assert.match(ask, /verified BoardSignal context/i);
  assert.match(currentEngagement, /TRY ANOTHER EXPLANATION/);
  assert.match(currentEngagement, /boardsignal:ask-open/);
  assert.doesNotMatch(currentEngagement, /LEVEL 1|LEVEL 2|LEVEL 3|automatic explanation ladder|no Level 4/);
});

test('Preview leads toward My BoardSignal while keeping private guidance private', () => {
  assert.match(preview, /WE FOUND YOUR GAMES/);
  assert.match(preview, /WHAT STOOD OUT/);
  assert.match(preview, /READY FOR THE FULL PICTURE\?/);
  assert.match(preview, /Continue to My BoardSignal/);
  assert.match(preview, /Private improvement guidance and reviewed position evidence stay inside My BoardSignal\./);
});

test('Universe stays the wider public world rather than the core product identity', () => {
  assert.match(header, /label: "Universe", href: "\/feed"/);
  assert.match(feed, /The wider BoardSignal world around your improvement\./);
  assert.match(feed, /Strong completed Reviews, compared like for like\./);
  assert.match(feed, /Start my BoardSignal/);
  assert.match(publicPlayer, /BOARD SIGNAL HIGHLIGHTS/);
  for (const source of [publicPlayer, feed]) assert.doesNotMatch(source, /Signal Board|Blue Signal|Red Signal|Amber Signal/);
});
