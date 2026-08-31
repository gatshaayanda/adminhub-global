const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const journal = read('src/components/PlayerReviewJournal.tsx');
const ask = read('src/components/AskBoardSignal.tsx');
const route = read('src/app/api/boardsignal/guide/route.ts');
const deepDive = read('src/lib/boardsignal/server/currentAskDeepDive.ts');

test('Current BoardSignal keeps private note action and adds a local Ask continuation', () => {
  assert.match(journal, /ADD A NOTE/);
  assert.match(journal, /ASK BOARDSIGNAL/);
  assert.match(journal, /new CustomEvent\("boardsignal:ask-open"\)/);
  assert.match(journal, /disabled=!online|disabled=\{!online\}/);
});

test('M5 does not send arbitrary current chess copy through the browser event', () => {
  assert.match(journal, /window\.dispatchEvent\(new CustomEvent\("boardsignal:ask-open"\)\)/);
  assert.doesNotMatch(journal, /boardsignal:ask-open[\s\S]{0,120}(headline|evidence|guidance|periodStart|itemKey)/);
});

test('closed Ask still performs zero authenticated ambient context reads', () => {
  assert.match(route, /body\.mode\s*!==\s*"beta_preview"\s*&&\s*body\.panelOpen\s*!==\s*true/);
  assert.match(ask, /if\s*\(playerRoomMode\s*&&\s*!open\)\s*return/);
});

test('explicit Ask open prefers the current-item deep dive before broader context loading', () => {
  assert.match(route, /currentBoardSignalDeepDiveObservation/);
  assert.match(route, /if\s*\(currentObservation\)\s*return\s*response\(\{\s*ok:\s*true,\s*observation:\s*currentObservation\s*\}\)/);
  assert.match(route, /currentBoardSignalDeepDiveResponse/);
  assert.ok(route.indexOf('currentBoardSignalDeepDiveResponse') < route.indexOf('weeklyHistoryGuideResponse'));
});

test('current-item context is rebuilt from the server-written guide session and M2 presentation rules', () => {
  assert.match(deepDive, /collection\("guide"\)\.doc\("session"\)\.get\(\)/);
  assert.match(deepDive, /buildCurrentBoardSignalMoment/);
  assert.match(deepDive, /since-away:\$\{episode\.periodStart\}:\$\{episode\.checkedAt\}/);
  assert.match(deepDive, /SINCE YOU WERE AWAY/);
  assert.match(deepDive, /current-item:\$\{moment\.itemKey\}/);
  assert.doesNotMatch(deepDive, /reviewJournal|note\.body|conversation.*collection|collection\("messages"\)/);
});

test('one-tap questions are context-dependent and examples only appear with evidence', () => {
  assert.match(deepDive, /WHY IS THIS HAPPENING\?/);
  assert.match(deepDive, /WHAT CHANGED SINCE LAST TIME\?/);
  assert.match(deepDive, /SHOW ME AN EXAMPLE/);
  assert.match(deepDive, /guidance\.supportingFacts\.length/);
  assert.match(deepDive, /WHAT SHOULD I DO NEXT\?/);
  assert.match(deepDive, /HOW DOES THIS COMPARE WITH MY LAST REVIEW\?/);
  assert.match(deepDive, /guidance\.source === "previous_review" \|\| guidance\.source === "current_week_reinforces_previous_review"/);
});

test('M4 Ask usage and existing clarity follow-up remain separate and intact', () => {
  assert.match(route, /recordFounderAskUsageByUid/);
  assert.match(route, /body\.mode\s*!==\s*"beta_preview"/);
  assert.match(ask, /Explain that more simply\./);
  assert.match(ask, /Was that clear\?/);
  assert.match(ask, /% 3 === 0/);
  assert.doesNotMatch(deepDive, /Trustpilot|trustpilot|recordFounderAskUsageByUid|founderEngagement/);
});
