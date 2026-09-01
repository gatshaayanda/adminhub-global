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
const reliability = read("src/lib/boardsignal/server/currentEpisodeReliability.ts");
const styles = read("src/app/globals.css");

function hasAll(source, markers) {
  for (const marker of markers) assert.ok(source.includes(marker), `missing marker: ${marker}`);
}

test("Founder operational truth preserves the compact player-card surface and foreground engagement", () => {
  for (const marker of ["Chess.com ID", "ACCESS", "USAGE", "foreground engaged", "FEEDBACK", "TRUSTPILOT", "LAST ACTIVE", "MANAGE", "Safe detail"]) {
    assert.ok(component.includes(marker), `missing existing card marker: ${marker}`);
  }
  assert.match(component, /duration\(row\.usage\.totalForegroundEngagedSeconds\).*foreground engaged/);
  assert.match(component, /Latest session engaged/);
  assert.match(route, /totalForegroundEngagedSeconds:\s*count/);
  assert.match(playerRoomEngagement, /totalForegroundEngagedSeconds/);
});

test("Founder Current projection reuses R1 same-period safety and aligned cadence without Chess.com fan-out", () => {
  hasAll(route, ["currentAlignedPeriod", "samePeriodCurrentEpisodeFallback", "currentEpisodeSummary", "currentEpisodeCollection"]);
  assert.match(route, /const currentPeriod = \{ periodStart: isoDay\(aligned\.start\), periodEnd: isoDay\(aligned\.end\) \}/);
  assert.match(route, /samePeriodCurrentEpisodeFallback\(account\.currentEpisodeSummary, currentPeriod\)/);
  assert.match(reliability, /stored\.periodStart !== currentPeriod\.periodStart \|\| stored\.periodEnd !== currentPeriod\.periodEnd/);
  assert.doesNotMatch(route, /buildCurrentEpisodeSummary/);
  assert.doesNotMatch(route, /await fetch\(/);
  assert.doesNotMatch(route, /api\.chess\.com/);
});

test("Founder Current distinguishes fresh, zero games, last-good fallback, temporary unavailable and not checked", () => {
  for (const status of ["fresh", "zero_games", "last_good", "temporarily_unavailable", "not_checked"]) assert.ok(route.includes(`"${status}"`));
  hasAll(component, [
    "CURRENT · FRESH",
    "CURRENT · 0 GAMES",
    "CURRENT · LAST GOOD SHOWN",
    "CURRENT · TEMPORARILY UNAVAILABLE",
    "CURRENT · NOT CHECKED",
    "CHESS.COM · CHECKED SUCCESSFULLY",
    "CHESS.COM · LAST SUCCESSFUL SNAPSHOT",
    "CHESS.COM · REFRESH RETRY REQUIRED",
    "CHESS DATA · NOT CHECKED",
  ]);
  assert.match(route, /collection\?\.status === "retry_required"[\s\S]*currentEpisode[\s\S]*"last_good"[\s\S]*timestampFallsInPeriod\(collection\.checkedAt, currentPeriod\.periodStart, currentPeriod\.periodEnd\)[\s\S]*"temporarily_unavailable"[\s\S]*"not_checked"/);
  assert.match(route, /currentEpisode\.games === 0 \? "zero_games" as const : "fresh" as const/);
});

test("Old-period retry state cannot masquerade as a current-period outage", () => {
  assert.match(route, /function timestampFallsInPeriod/);
  assert.match(route, /timestamp >= start && timestamp < endExclusive/);
  assert.match(route, /timestampFallsInPeriod\(collection\.checkedAt, currentPeriod\.periodStart, currentPeriod\.periodEnd\)/);
  assert.match(route, /\? \{ currentEpisode: undefined, sourceHealth: \{ status: "temporarily_unavailable" as const[\s\S]*: \{ currentEpisode: undefined, sourceHealth: \{ status: "not_checked" as const \} \}/);
});

test("Founder last-good state preserves saved Current facts and separates last success from latest retry", () => {
  assert.match(route, /lastSuccessfulAt: currentEpisode\.checkedAt/);
  assert.match(route, /latestAttemptAt: collection\.checkedAt/);
  assert.match(component, /Last successful check \$\{displayDateTime\(row\.chess\.sourceHealth\.lastSuccessfulAt\)\}/);
  assert.match(component, /Refresh retry \$\{displayDateTime\(row\.chess\.sourceHealth\.latestAttemptAt\)\}/);
  assert.match(component, /current \? `\$\{current\.games\} game/);
  assert.match(component, /periodRange\(current\.periodStart, current\.periodEnd\)/);
});

test("Founder access truth projects agreement, Player Room entry and actual return semantics", () => {
  assert.match(route, /agreementAccepted: hasAcceptedCurrentBetaAgreement\(account\)/);
  assert.match(route, /playerRoomEntered: roomVisitCount > 0/);
  assert.match(route, /returned: roomVisitCount >= 2/);
  hasAll(component, ["Agreement accepted", "AGREEMENT PENDING", "Player Room entered", "PLAYER ROOM NOT ENTERED", "RETURNED", "First visit only"]);
  assert.match(component, /if \(row\.usage\.returned\) return "RETURNED"/);
  assert.match(component, /if \(row\.usage\.roomVisitCount === 1\) return "First visit only"/);
});

test("ImZombie7-style Google onboarding state reads as entered and healthy when zero-game Current succeeded", () => {
  hasAll(component, ["NEW VIA GOOGLE", "Agreement accepted", "Player Room entered", "First visit only", "CURRENT · 0 GAMES", "CHESS.COM · CHECKED SUCCESSFULLY"]);
  assert.match(route, /origin: account\.googleAccessOrigin/);
  assert.match(route, /agreementAccepted: hasAcceptedCurrentBetaAgreement\(account\)/);
  assert.match(route, /playerRoomEntered: roomVisitCount > 0/);
  assert.match(route, /currentEpisode\.games === 0 \? "zero_games"/);
});

test("New-games delta remains period-bound and disappears when Current is unavailable or stale", () => {
  assert.match(engagement, /chessDelta\(previousProjection\?\.lastChessSnapshot,currentChess\)/);
  assert.match(engagement, /previous\.periodStart!==current\.periodStart/);
  assert.match(route, /current && projection\?\.chessSincePreviousVisit\?\.periodStart === current\.periodStart/);
  assert.match(component, /NEW GAMES · \$\{delta\.games\} since previous visit/);
});

test("Founder Review truth keeps existing lifecycle, cadence and qualifying completed count", () => {
  assert.match(route, /summary\?\.row\.reviewCheckRequired/);
  assert.match(route, /summary\?\.row\.readyNotSeen/);
  assert.match(route, /summary\?\.row\.forming/);
  assert.match(route, /latestReportPeriod\?\.outcome === "no_activity"/);
  assert.match(route, /summary\?\.row\.latestReview/);
  assert.match(route, /daysComplete: currentEpisode\?\.daysComplete/);
  assert.match(route, /daysRemaining: currentEpisode\?\.daysRemaining/);
  assert.match(route, /summary\?\.row\.nextDeskDueAt \?\? currentEpisode\?\.nextDeskDueAt \?\? account\.nextDeskDueAt/);
  assert.match(route, /summary\.validation\.verifiedReviews/);
  assert.match(materialized, /verifiedReviews/);
  assert.match(component, /NO COMPLETED REVIEWS/);
  assert.match(component, /days complete/);
});

test("Founder coaching uses stable signal plus presentation truth and removes ladder language", () => {
  hasAll(route, ["validStoredCoachingState", "variant: coaching.level", "automaticVariantCursor", "lastPresentationSource", "byVariant", "variantShown", "presentationSource"]);
  hasAll(component, ["COACHING FEEDBACK", "PRESENTATION", "MANUAL SWITCH", "AUTO PRESENTATION", "ALTERNATE EXPLANATION", "VIEW GAME", "ASK ESCALATIONS", "EVIDENCE"]);
  assert.match(component, /Presentation \$\{variant\}/);
  assert.doesNotMatch(component, /L1|L2|L3|LEVEL 1|LEVEL 2|LEVEL 3|LEVEL \{coaching|LEVEL REACHED|LADDER/i);
  assert.doesNotMatch(route, /l1DownToL2|l2DownToL3|level3Reached|level3Down|byLevel/);
  assert.match(engagement, /coaching\.byVariant/);
  assert.match(engagement, /coaching\.presentationSource/);
  assert.match(engagement, /AUTO_RETURN/);
  assert.match(engagement, /MANUAL_SWITCH/);
});

test("Founder privacy boundary remains metadata-only", () => {
  for (const forbidden of ["reviewJournal", "conversations", "messages", "guideAnalytics"]) assert.doesNotMatch(route, new RegExp(forbidden));
  assert.doesNotMatch(route, /question\s*:/);
  assert.doesNotMatch(route, /answer\s*:/);
  assert.match(component, /Private journal text and Ask conversation contents are not loaded here/);
  assert.match(component, /coaching signal\/presentation\/reaction state only/);
});

test("Founder rows remain active account/materialized reads and the existing mobile reflow is preserved", () => {
  assert.match(route, /collection\("users"\)\.where\("role",\s*"==",\s*"player"\)/);
  assert.match(route, /collection\("founderPlayerSummaries"\)\.where\("active",\s*"==",\s*true\)/);
  assert.match(route, /Promise\.all/);
  assert.match(styles, /\.founder-ops-main-row/);
  assert.match(styles, /@media\s*\(max-width:\s*780px\)/);
  assert.match(styles, /grid-template-columns:\s*1fr 1fr/);
  assert.match(styles, /grid-template-columns:\s*1fr/);
  assert.doesNotMatch(component, /<table/);
});

test("Founder source-health projection does not change R1 persistence semantics", () => {
  assert.match(persistence, /currentEpisodeCollection/);
  assert.match(persistence, /source:\s*"chesscom"[\s\S]*status:\s*"ok"/);
  assert.match(persistence, /progressUnavailable[\s\S]*status:\s*"retry_required"/);
  assert.match(account, /BoardSignalCurrentEpisodeCollection/);
  assert.doesNotMatch(route, /\.set\(|\.update\(|\.delete\(/);
});
