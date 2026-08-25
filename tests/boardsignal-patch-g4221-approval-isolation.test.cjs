const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/lib/boardsignal/server/betaRequests.ts"), "utf8");

test("Founder approval cannot be blocked by derived Universe event publication", () => {
  const directWrites = source.match(/await writePublicUniverseEvent\(newPlayerUniverseEvent\(request, decidedAt\)\);/g) ?? [];
  assert.equal(directWrites.length, 0, "approval still awaits an unguarded Universe event write");

  const guardedWrites = source.match(/await writePublicUniverseEvent\(newPlayerUniverseEvent\(request, decidedAt\)\)\.catch\(\(\) => undefined\);/g) ?? [];
  assert.equal(guardedWrites.length, 2, "both approval paths must isolate Universe event publication");
});

test("approval remains authoritative before secondary notification delivery", () => {
  assert.match(source, /status:\s*"approved"/);
  assert.match(source, /identityReviewStatus:\s*"confirmed"/);
  assert.match(source, /Public Universe publication is derived\/secondary/);
});
