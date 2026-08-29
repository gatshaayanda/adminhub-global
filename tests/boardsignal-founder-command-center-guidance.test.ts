import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("Founder Command Center explains Google-to-Chess.com adoption from persisted mapping truth", () => {
  const route = read("src/app/api/admin/boardsignal/identity-adoption/route.ts");
  const brief = read("src/components/FounderCommandCenterDecisionBrief.tsx");
  assert.match(route, /provider[^\n]+google_access/);
  assert.match(route, /provider[^\n]+google_access_player/);
  assert.match(route, /\.count\(\)\.get\(\)/);
  assert.match(brief, /Google-linked profiles/);
  assert.match(brief, /not Google login attempts/);
  assert.match(brief, /Google mapping health/);
});

test("Founder Command Center turns attention counters into explicit next actions", () => {
  const brief = read("src/components/FounderCommandCenterDecisionBrief.tsx");
  assert.match(brief, /Players needing Review or system check/);
  assert.match(brief, /This count is affected players, not a raw error-event total/);
  assert.match(brief, /Next: \{action\.next\}/);
  assert.match(brief, /Verify the ownership evidence/);
  assert.match(brief, /Mark Contacted or Snooze/);
});

test("Founder guidance reflects the existing full deletion cleanup contract", () => {
  const deletion = read("src/lib/boardsignal/server/accountDeletion.ts");
  const brief = read("src/components/FounderCommandCenterDecisionBrief.tsx");
  assert.match(deletion, /removeFounderPlayerSummary\(playerId\)/);
  assert.match(deletion, /collection\("exceptions"\)\.where\("uid", "==", uid\)/);
  assert.match(brief, /completed BoardSignal account deletion removes that player’s Founder summary, active exception records and identity mappings/);
});

test("Founder Command Center mature layer removes arcade motion and numbered workspace copy", () => {
  const page = read("src/app/admin/page.tsx");
  const css = read("src/components/FounderCommandCenterMature.module.css");
  const nav = read("src/components/AdminNav.tsx");
  assert.match(page, /FounderCommandCenterDecisionBrief/);
  assert.match(page, /matureStyles\.shell/);
  assert.doesNotMatch(page, /06\.2 \/\//);
  assert.doesNotMatch(page, /06\.3 \/\//);
  assert.match(css, /background: #101418 !important/);
  assert.match(css, /animation: none !important/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(nav, /Command Center/);
  assert.match(nav, /System issues/);
});
