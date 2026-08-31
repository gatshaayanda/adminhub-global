const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const component = read("src/components/FounderOperationsConsole.tsx");
const route = read("src/app/api/admin/boardsignal/founder-engagement/route.ts");
const account = read("src/lib/boardsignal/account.ts");
const persistence = read("src/lib/boardsignal/server/persistence.ts");
const engagement = read("src/lib/boardsignal/server/founderEngagement.ts");
const playerRoomEngagement = read("src/lib/boardsignal/server/playerRoomEngagement.ts");
const materialized = read("src/lib/boardsignal/server/founderMaterialized.ts");
const styles = read("src/app/globals.css");

test("M7.1 preserves the existing Founder player-card surface and foreground engagement", () => {
  for (const marker of ["Chess.com ID", "ACCESS", "USAGE", "foreground engaged", "FEEDBACK", "TRUSTPILOT", "LAST ACTIVE", "MANAGE", "Safe detail"]) {
    assert.ok(component.includes(marker), `missing existing card marker: ${marker}`);
  }
  assert.match(component, /duration\(row\.usage\.totalForegroundEngagedSeconds\).*foreground engaged/);
  assert.match(component, /Latest session engaged/);
  assert.match(route, /totalForegroundEngagedSeconds:count|totalForegroundEngagedSeconds: count/);
  assert.match(playerRoomEngagement, /totalForegroundEngagedSeconds/);
});

test("M7.1 current chess comes from canonical persisted Current BoardSignal state", () => {
  assert.match(route, /founderChessSnapshot\(account\.currentEpisodeSummary\)/);
  assert.match(route, /currentEpisodeCollection/);
  assert.match(persistence, /currentEpisodeCollection/);
  assert.match(persistence, /source:\s*"chesscom"[\s\S]*status:\s*"ok"/);
  assert.match(account, /BoardSignalCurrentEpisodeCollection/);
});

test("M7.1 new-games delta stays tied to legitimate player-room snapshots and period boundaries", () => {
  assert.match(engagement, /chessDelta\(previousProjection\?\.lastChessSnapshot,currentChess\)/);
  assert.match(engagement, /previous\.periodStart!==current\.periodStart/);
  assert.match(engagement, /current\.games-previous\.games/);
  assert.match(engagement, /recordFounderRoomEntryProjection/);
  assert.match(engagement, /founderEngagementProjection\.lastChessSnapshot/);
  assert.doesNotMatch(route, /lastChessSnapshot\s*=/);
  assert.doesNotMatch(component, /lastChessSnapshot/);
  assert.match(component, /NEW GAMES · \$\{delta\.games\} since previous visit/);
});

test("M7.1 shows truthful period dates and existing cadence progress", () => {
  assert.match(component, /periodRange\(current\.periodStart, current\.periodEnd\)/);
  assert.match(route, /daysComplete:\s*current \? account\.currentEpisodeSummary\?\.daysComplete/);
  assert.match(route, /daysRemaining:\s*current \? account\.currentEpisodeSummary\?\.daysRemaining/);
  assert.match(route, /summary\?\.row\.nextDeskDueAt \?\? account\.currentEpisodeSummary\?\.nextDeskDueAt \?\? account\.nextDeskDueAt/);
  assert.match(component, /days complete/);
  assert.match(component, /due \$\{compactDate\(row\.review\.dueAt\)\}/);
});

test("M7.1 Review status reuses existing Founder state rather than creating a new lifecycle", () => {
  assert.match(route, /summary\?\.row\.reviewCheckRequired/);
  assert.match(route, /summary\?\.row\.readyNotSeen/);
  assert.match(route, /summary\?\.row\.forming/);
  assert.match(route, /latestReportPeriod\?\.outcome === "no_activity"/);
  assert.match(route, /summary\?\.row\.latestReview/);
  for (const status of ["CHECK REQUIRED", "READY", "FORMING", "NO ACTIVITY", "COMPLETED"]) assert.ok(route.includes(status));
});

test("M7.1 completed Review count uses qualifying materialized Review truth", () => {
  assert.match(materialized, /verifiedReviews/);
  assert.match(route, /summary\.validation\.verifiedReviews/);
  assert.doesNotMatch(route, /completedCount:[^\n]*totalReviewsProduced/);
  assert.match(route, /const latestReview = summary\?\.row\.latestReview/);
  assert.match(component, /NO COMPLETED REVIEWS/);
});

test("M7.1 distinguishes zero games, not checked, and retrieval failure", () => {
  assert.match(route, /current\.games === 0 \? "zero_games" : "ok"/);
  assert.match(route, /status:\s*"not_checked"/);
  assert.match(route, /status:\s*"retry_required"/);
  assert.match(persistence, /progressUnavailable[\s\S]*status:\s*"retry_required"/);
  assert.ok(component.includes("CHESS.COM · 0 CURRENT-PERIOD GAMES"));
  assert.ok(component.includes("CHESS DATA · NOT CHECKED"));
  assert.ok(component.includes("CHESS COLLECTION · RETRY REQUIRED"));
  assert.doesNotMatch(component, /No cheap chess snapshot/);
});

test("M7.1 Founder rows use persisted state with no per-card Chess.com fan-out", () => {
  assert.match(route, /collection\("users"\)\.where\("role",\s*"==",\s*"player"\)/);
  assert.match(route, /collection\("founderPlayerSummaries"\)\.where\("active",\s*"==",\s*true\)/);
  assert.match(route, /Promise\.all/);
  assert.doesNotMatch(route, /buildCurrentEpisodeSummary/);
  assert.doesNotMatch(route, /await fetch\(/);
  assert.doesNotMatch(route, /api\.chess\.com/);
});

test("M7.1 preserves access, Google, feedback, Notes, Ask, Trustpilot and compact M7 coaching", () => {
  assert.match(component, /NEW VIA GOOGLE/);
  assert.match(component, /EXISTING · GOOGLE LINKED/);
  assert.match(route, /googleAccessConnectedAt/);
  assert.match(route, /helpfulCount/);
  assert.match(route, /noteCount/);
  assert.match(route, /askQuestionCount/);
  assert.match(route, /founderTrustpilotStatus/);
  assert.match(route, /validStoredCoachingState/);
  assert.match(component, /LEVEL \{coaching\.level\} \/ 3/);
});

test("M7.1 keeps the Founder privacy boundary metadata-only", () => {
  for (const forbidden of ["reviewJournal", "conversations", "messages", "guideAnalytics"]) assert.doesNotMatch(route, new RegExp(forbidden));
  assert.doesNotMatch(route, /question\s*:/);
  assert.doesNotMatch(route, /answer\s*:/);
  assert.match(component, /Private journal text and Ask conversation contents are not loaded here/);
});

test("M7.1 keeps the existing mobile card reflow rather than introducing a horizontal table", () => {
  assert.match(styles, /\.founder-ops-main-row/);
  assert.match(styles, /@media\s*\(max-width:\s*780px\)/);
  assert.match(styles, /grid-template-columns:\s*1fr 1fr/);
  assert.match(styles, /grid-template-columns:\s*1fr/);
  assert.doesNotMatch(component, /<table/);
});
