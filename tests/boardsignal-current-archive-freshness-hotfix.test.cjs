const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

const routeSource = readFileSync("src/app/api/boardsignal/player-room/route.ts", "utf8");
const processorSource = readFileSync("src/lib/boardsignal/processor.ts", "utf8");

test("Current BoardSignal does not keep a successful Chess.com archive snapshot for twelve hours", () => {
  assert.match(processorSource, /const ARCHIVE_CACHE_TTL_MS = 12 \* 60 \* 60 \* 1000/);
  assert.match(processorSource, /export function clearChessComArchiveCacheForTests\(\)/);
  assert.match(routeSource, /clearChessComArchiveCacheForTests as clearChessComArchiveCache/);
  assert.match(routeSource, /const CURRENT_ARCHIVE_REFRESH_MS = 60_000/);
  assert.match(routeSource, /refreshCurrentArchiveCacheIfNeeded\(refreshReference\.getTime\(\)\)/);

  const refreshIndex = routeSource.indexOf("refreshCurrentArchiveCacheIfNeeded(refreshReference.getTime());");
  const collectionIndex = routeSource.indexOf("currentEpisode = await buildCurrentEpisodeSummary");
  assert.ok(refreshIndex >= 0, "current archive freshness guard must be present");
  assert.ok(collectionIndex > refreshIndex, "archive cache must be refreshed before current Chess.com collection");
});

test("Current archive freshness guard is bounded instead of clearing on every Player Room request", () => {
  assert.match(routeSource, /if \(referenceMs - currentArchiveCacheLastClearedAt < CURRENT_ARCHIVE_REFRESH_MS\) return;/);
  assert.match(routeSource, /clearChessComArchiveCache\(\);\s*currentArchiveCacheLastClearedAt = referenceMs;/);
});
