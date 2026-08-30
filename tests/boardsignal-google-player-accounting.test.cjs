const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const googleRoute = read("src/app/api/boardsignal/google-access/route.ts");
const accountingRoute = read("src/app/api/admin/boardsignal/google-accounting/route.ts");
const founderUi = read("src/components/FounderSignupIntelligence.tsx");

assert.match(googleRoute, /existing_player_linked_google/, "existing-player Google links must be persisted as links, not new players");
assert.match(googleRoute, /new_player_via_google/, "new Google onboarding must persist that it created the player");
assert.match(googleRoute, /refreshFounderPlayerSummaryByUid\(result\.uid\)/, "new Google players must refresh Founder/public player truth");
assert.match(accountingRoute, /one stable Chess\.com player ID/i, "Founder accounting must be canonical-player based");
assert.match(accountingRoute, /preferencesConfirmedAt === linkedAt && account\.contactConfirmedAt === linkedAt/, "pre-provenance Google onboarding records must be repairable from the locked Patch K signature");
assert.match(accountingRoute, /summaryByUid\.has\(uid\)/, "missing Founder summaries must be detected without reactivating intentionally inactive summaries");
assert.match(founderUi, /ACTIVE BOARDSIGNAL PLAYERS/, "Founder UI must lead with the canonical active player population");
assert.match(founderUi, /NEW VIA GOOGLE/, "Founder UI must show Google-created players separately");
assert.match(founderUi, /EXISTING \+ GOOGLE/, "Founder UI must show existing players who later linked Google separately");
assert.match(founderUi, /GOOGLE RETURNS/, "Founder UI must show actual Google return use separately");
assert.doesNotMatch(founderUi, /\["GOOGLE LINKED"/, "Founder top metrics must not present Google as a separate player population");

console.log("BoardSignal Google/player accounting regression checks passed.");
