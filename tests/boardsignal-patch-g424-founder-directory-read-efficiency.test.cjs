const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const access = read("src/lib/boardsignal/server/betaAccess.ts");
const route = read("src/app/api/admin/boardsignal/beta-access/route.ts");
const client = read("src/components/FoundingBetaPlayersAdmin.tsx");

function block(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `missing ${startNeedle}`);
  const end = endNeedle ? source.indexOf(endNeedle, start + startNeedle.length) : source.length;
  return source.slice(start, end === -1 ? source.length : end);
}

test("1. normal Founder Players GET reads one materialized directory state", () => {
  const get = block(route, "export async function GET()", "export async function POST");
  assert.match(get, /loadFounderPlayerDirectoryState\(\)/);
  assert.doesNotMatch(get, /listFoundingBetaRequests|listFounderPlayerIdentities|Promise\.all/);
  const load = block(access, "export async function loadFounderPlayerDirectoryState", "export async function refreshFounderDirectoryPlayer");
  assert.match(load, /founderDirectoryRef\(\)\.get\(\)/);
  assert.match(load, /operation:\s*"founder_beta_directory"[\s\S]*approximateReads:\s*1/);
});

test("2. expensive population reads are isolated to bounded cache rebuild only", () => {
  const rebuild = block(access, "async function rebuildFounderPlayerDirectoryState", "export async function loadFounderPlayerDirectoryState");
  assert.match(rebuild, /founderPlayerSummaries/);
  assert.match(rebuild, /betaAccess/);
  assert.match(rebuild, /betaRequests/);
  assert.match(rebuild, /FOUNDER_DIRECTORY_LIMIT \+ 1/);
  const normal = block(access, "export async function loadFounderPlayerDirectoryState", "export async function refreshFounderDirectoryPlayer");
  assert.doesNotMatch(normal, /collection\("founderPlayerSummaries"\)|collection\("betaAccess"\)|collection\("betaRequests"\)/);
});

test("3. directory cache never duplicates beta request credentials or device tokens", () => {
  const mapper = block(access, "function founderDirectoryRequest", "async function acquireFounderDirectoryLease");
  assert.doesNotMatch(mapper, /statusTokenHash|ticketHash|\.token/);
  assert.match(mapper, /registeredAt/);
  assert.match(mapper, /request\.status === "pending"/);
});

test("4. admin mutations refresh only the affected materialized player/request entries", () => {
  const post = block(route, "export async function POST", "");
  assert.match(post, /refreshFounderDirectoryPlayer/);
  assert.match(post, /refreshFounderDirectoryRequest/);
  const player = block(access, "export async function refreshFounderDirectoryPlayer", "export async function refreshFounderDirectoryRequest");
  assert.match(player, /founderPlayerSummaries/);
  assert.match(player, /betaAccess/);
  assert.doesNotMatch(player, /\.get\(\)\s*[,;]/);
  const request = block(access, "export async function refreshFounderDirectoryRequest", "export async function listFounderPlayerIdentities");
  assert.match(request, /betaRequests/);
});

test("5. duplicate Founder Players client loads are coalesced", () => {
  assert.match(client, /founderDirectoryInFlight/);
  assert.match(client, /FOUNDER_DIRECTORY_CLIENT_CACHE_MS = 2_500/);
  assert.match(client, /fetchFounderDirectory\(\)/);
  assert.match(client, /invalidateFounderDirectoryClientCache/);
});
