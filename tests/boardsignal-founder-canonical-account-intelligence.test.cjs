const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const route = fs.readFileSync(path.join(root, "src/app/api/admin/boardsignal/founder-intelligence/route.ts"), "utf8");
const ui = fs.readFileSync(path.join(root, "src/components/FounderSignupIntelligence.tsx"), "utf8");
const profile = fs.readFileSync(path.join(root, "src/components/PlayerProfileNotifications.tsx"), "utf8");

assert.match(route, /collection\("users"\)\.where\("role",\s*"==",\s*"player"\)/, "Founder intelligence may inspect player account records for enrichment.");
assert.match(route, /const rawAccountRows = accounts\.map/, "Raw account records must be treated only as source records.");
assert.match(route, /canonicalByPlayerId = new Map/, "Founder population must deduplicate by stable Chess.com player ID.");
assert.match(route, /One stable Chess\.com player ID is one BoardSignal player/, "Canonical population rule must be explicit in the server implementation.");
assert.match(route, /duplicateAccountRecords/, "Founder intelligence must expose how many duplicate access records were folded.");
assert.match(route, /totalPlayers: accountRows\.length/, "Founder funnel must report the deduplicated canonical player count.");
assert.match(route, /googleLinked: accountRows\.filter/, "Google must be enrichment over canonical players, never population inflation.");
assert.doesNotMatch(route, /totalPlayers:\s*rawAccountRows\.length/, "Raw auth/account documents must never define BoardSignal player count.");
assert.match(ui, /One stable Chess\.com player ID equals one BoardSignal player/, "Founder UI must state the simple canonical person rule.");
assert.match(ui, /duplicate access record/, "Founder UI must make account-record folding auditable.");
assert.match(ui, /Rows are deduplicated by stable Chess\.com player ID first/, "Founder table must explain its unique-player basis.");
assert.match(ui, /No Google link recorded/, "Non-Google players must remain visible and clearly labelled.");
assert.match(ui, /Do not infer contact\/marketing consent/, "Google/account email must remain separate from contact consent.");
assert.match(profile, /action:\s*"link"/, "Existing authenticated players must retain the safe Google-link path.");
assert.match(profile, /CONNECT GOOGLE/, "Existing players must be able to attach Google from their private profile.");

console.log("Founder canonical account intelligence regression: PASS");
