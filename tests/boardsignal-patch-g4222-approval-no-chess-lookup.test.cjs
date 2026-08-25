const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const access = fs.readFileSync(path.join(root, "src/lib/boardsignal/server/betaAccess.ts"), "utf8");
const requests = fs.readFileSync(path.join(root, "src/lib/boardsignal/server/betaRequests.ts"), "utf8");

test("Founder approval creates access from the already-verified stable identity", () => {
  assert.match(requests, /createFoundingBetaAccessForIdentity\(identity\)/);
  assert.doesNotMatch(requests, /createFoundingBetaAccess\(request\.canonicalUsername\)/);
});

test("stable-identity access creation performs no Chess.com lookup", () => {
  const start = access.indexOf("export async function createFoundingBetaAccessForIdentity");
  const end = access.indexOf("export async function createFoundingBetaAccess(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const block = access.slice(start, end);
  assert.doesNotMatch(block, /resolveChessComPlayer/);
  assert.match(block, /validatePlayerId\(identityInput\.playerId\)/);
  assert.match(block, /ensureStablePlayerAccount\(identity\)/);
});

test("username-based legacy access creation still resolves Chess.com normally", () => {
  const start = access.indexOf("export async function createFoundingBetaAccess(usernameInput");
  const block = access.slice(start, access.indexOf("export async function loadExistingFoundingBetaAccess", start));
  assert.match(block, /resolveChessComPlayer/);
  assert.match(block, /createFoundingBetaAccessForIdentity\(identity\)/);
});
