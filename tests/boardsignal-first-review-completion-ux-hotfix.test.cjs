const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const root = join(__dirname, "..");
const room = readFileSync(join(root, "src/components/BoardSignalPlayerRoom.tsx"), "utf8");
const desk = readFileSync(join(root, "src/components/UniversalPlayerDesk.tsx"), "utf8");
const route = readFileSync(join(root, "src/app/api/boardsignal/player-room/route.ts"), "utf8");
const historyWorker = readFileSync(join(root, "src/components/BoardSignalHistoryWorker.tsx"), "utf8");
const reporter = readFileSync(join(root, "src/lib/boardsignal/client/engineDiagnosticReporter.ts"), "utf8");
const diagnosticRoute = readFileSync(join(root, "src/app/api/boardsignal/engine-diagnostic/route.ts"), "utf8");

test("successful publication reconciles through the quiet Player Room refresh", () => {
  assert.match(room, /publishedDeskKeyThisSessionRef\.current = deskKeyFor\(desk\);[\s\S]*?boardsignal:review-published[\s\S]*?if \(user\) await loadRoom\(user, true\);/);
  assert.doesNotMatch(room, /boardsignal:review-published[\s\S]*?if \(user\) await loadRoom\(user\);/);
});

test("quiet reconciliation cannot remount the global RoomLoading state", () => {
  assert.match(room, /async \(activeUser: User, quiet = false\)/);
  assert.match(room, /if \(!quiet\) setLoading\(true\)/);
  assert.match(room, /if \(!quiet\) setLoading\(false\)/);
  assert.match(room, /if \(!authReady \|\| loading\) return <RoomLoading \/>/);
  assert.match(room, /await loadRoom\(user, true\)/);
});

test("pending first factual Review suppresses the provisional Current Episode until cadence exists", () => {
  assert.match(room, /snapshot\.pendingFactualReview && !snapshot\.account\.cadenceAnchor \? null : snapshot\.currentEpisode \?/);
});

test("once cadenceAnchor exists the server continues to build the Current Episode from that anchor", () => {
  assert.match(route, /buildCurrentEpisodeSummary\([\s\S]*anchorStart: account\.cadenceAnchor[\s\S]*\)/);
  assert.match(room, /snapshot\.currentEpisode \? <CurrentEpisodeCard/);
});

test("engine-incomplete state still withholds unsupported position guidance", () => {
  assert.match(desk, /codes=\{\["ENGINE_REVIEW_INCOMPLETE"\]\}/);
  assert.match(desk, /!interpretation\.complete/);
  assert.match(desk, /return <DeskQualityHold/);
  assert.match(desk, /const quality = validateDeskForPublication\(shown, engineResults\)/);
});

test("retryable engine failure still exposes the manual position retry", () => {
  assert.match(desk, /recoveryState === "manual"/);
  assert.match(desk, /onClick=\{onRetry\}>TRY POSITION CHECK AGAIN<\/button>/);
});

test("ENGINE_REVIEW_INCOMPLETE is not rendered as primary player-facing copy", () => {
  const start = desk.indexOf("if (engineUnavailable)");
  const end = desk.indexOf("return (", desk.indexOf("return (", start) + 1);
  const engineHold = desk.slice(start, end > start ? end : start + 7000);
  assert.match(engineHold, /The position check did not finish on this device\. Try the position check again\./);
  assert.doesNotMatch(engineHold, /Position check: \{codes\.join/);
  assert.match(engineHold, /<details className="quality-reference" data-engine-code=\{diagnostic\.code\}>/);
});

test("engine diagnostic reporting is fire-and-forget and server logs only sanitized data", () => {
  assert.match(desk, /void reportEngineDiagnostic\(item\)/);
  assert.match(reporter, /catch \{[\s\S]*Observability is deliberately non-blocking/);
  assert.match(diagnosticRoute, /sanitizeEngineDiagnosticTelemetry\(await request\.json\(\)\)/);
  assert.match(diagnosticRoute, /console\.warn\("\[BoardSignal\] position-review diagnostic", diagnostic\)/);
  assert.doesNotMatch(diagnosticRoute, /console\.(?:log|warn|error)\([^\n]*request/);
});

test("historical onboarding worker remains wired to the bounded history-backfill path", () => {
  assert.match(historyWorker, /\/api\/boardsignal\/history-backfill/);
  assert.match(historyWorker, /for\(let slot=0;slot<4/);
  assert.match(historyWorker, /reviewLifecycle:"historical_backfill"/);
});
