const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const route = fs.readFileSync(path.join(root, "src/app/api/admin/boardsignal/founder-intelligence/route.ts"), "utf8");
const ui = fs.readFileSync(path.join(root, "src/components/FounderSignupIntelligence.tsx"), "utf8");
const profile = fs.readFileSync(path.join(root, "src/components/PlayerProfileNotifications.tsx"), "utf8");

assert.match(route, /collection\("users"\)\.where\("role",\s*"==",\s*"player"\)/, "Founder intelligence must start from canonical BoardSignal player accounts.");
assert.match(route, /const accountRows = accounts\.map/, "All player accounts must become Founder intelligence rows.");
assert.doesNotMatch(route, /const linkedAccounts = aliases\.map/, "Google aliases must not define the player population.");
assert.match(route, /totalPlayers: accountRows\.length/, "Founder funnel must report canonical player count.");
assert.match(route, /googleLinked: accountRows\.filter/, "Google must be an enrichment metric over canonical players.");
assert.match(route, /No later-use signal|Active account/, "Usage labels must avoid pretending account creation proves product engagement.");
assert.match(ui, /BoardSignal player accounts are canonical/, "Founder UI must explain the canonical account model.");
assert.match(ui, /BoardSignal player\/account map/, "Founder UI must show all BoardSignal players, not only Google aliases.");
assert.match(ui, /No Google link recorded/, "Non-Google players must remain visible and clearly labelled.");
assert.match(ui, /Do not infer contact\/marketing consent/, "Google/account email must remain separate from contact consent.");
assert.match(profile, /action:\s*"link"/, "Existing authenticated players must retain the safe Google-link path.");
assert.match(profile, /CONNECT GOOGLE/, "Existing players must be able to attach Google from their private profile.");

console.log("Founder canonical account intelligence regression: PASS");
