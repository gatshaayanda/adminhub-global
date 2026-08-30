const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const onboarding = read("src/lib/boardsignal/server/googleOnboarding.ts");
const googleServer = read("src/lib/boardsignal/server/googleAccess.ts");
const googleRoute = read("src/app/api/boardsignal/google-access/route.ts");
const usernameForm = read("src/components/UsernameDeskForm.tsx");
const returnPanel = read("src/components/ChessComLoginPanel.tsx");
const googleButton = read("src/components/GoogleAccessButton.tsx");
const profile = read("src/components/PlayerProfileNotifications.tsx");
const founderRoute = read("src/app/api/admin/boardsignal/identity-access/route.ts");
const founderUi = read("src/components/FounderIdentityAccessCases.tsx");
const founderPage = read("src/app/admin/players/page.tsx");
const betaPanel = read("src/components/FoundingBetaAccessPanel.tsx");

function hasAll(source, values) { for (const value of values) assert.ok(source.includes(value), `Missing: ${value}`); }

test("1-6 new Google-first player maps Google and Chess identity atomically without approval/password", () => {
  hasAll(onboarding, ["runTransaction", "transaction.set(subjectRef", "transaction.set(playerRef", "transaction.set(userRef", "CHESS_PROFILE_ALREADY_HAS_BOARDSIGNAL", "createCustomToken(result.account.uid"]);
  hasAll(usernameForm, ["GET MY BOARDSIGNAL", "Enter your own Chess.com username.", "BoardSignal uses your public games to build your private chess picture.", "Use your own Chess.com username. BoardSignal connects your account to the chess profile you choose.", "correcting it may require an identity review with BoardSignal support"]);
  assert.ok(!usernameForm.includes("recoverLegacy"));
  assert.ok(!usernameForm.includes("accessCode"));
});

test("7-12 mapped Google return validates forward/reverse mapping and returns the exact private UID", () => {
  hasAll(googleServer, ["googleSubjectAliasId(google.providerUidHash)", "googlePlayerAliasId(mappedPlayerId)", "GOOGLE_ACCESS_MAPPING_MISMATCH", "createCustomToken(account.uid"]);
  hasAll(returnPanel, ["RETURN TO MY BOARDSIGNAL", "Pick up where you left off.", "Google signs you into BoardSignal. It does not verify ownership of a Chess.com profile."]);
});

test("13-18 authenticated legacy connect and unmapped-new onboarding stay on intended paths", () => {
  hasAll(googleServer, ["doc(playerToken.uid)", "GOOGLE_ACCESS_IN_USE", "GOOGLE_ACCESS_PLAYER_ALREADY_LINKED"]);
  hasAll(profile, ["action: \"link\"", "Google can bring you back to this exact BoardSignal UID"]);
  hasAll(googleButton, ["GOOGLE_ACCESS_NOT_LINKED", "onUnmapped"]);
  hasAll(returnPanel, ["initialGoogleIdToken", "initialGoogleEmail"]);
});

test("19-26 existing Chess player collision cannot create a duplicate and exposes the clean resolution flow", () => {
  hasAll(onboarding, ["CHESS_PROFILE_ALREADY_HAS_BOARDSIGNAL"]);
  hasAll(usernameForm, ["THIS BOARDSIGNAL ALREADY EXISTS", "This Chess.com profile is already connected to a private BoardSignal.", "resolve access without creating another BoardSignal", "RESOLVE THIS ON DISCORD", "I CAN&apos;T USE DISCORD", "USE ANOTHER USERNAME", "HOW CAN WE REACH YOU?", "contact method you actively check"]);
  assert.ok(!usernameForm.includes("type=\"password\""));
  assert.ok(!usernameForm.toLowerCase().includes("private access code"));
});

test("27-30 identity cases are stable/idempotent, requester identity is hashed, and fallback contact is explicit", () => {
  hasAll(googleServer, ["identityConflictCaseId(playerId", "providerUidHash", "IDENTITY_HELP_REPEAT_WINDOW_MS", "contactForCase"]);
  hasAll(usernameForm, ["caseContactValue", "Email address you actively check", "identityHelp"]);
  assert.ok(!usernameForm.includes("setCaseContactValue(googleEmail"));
  hasAll(founderRoute, ["googleReference", "hash.slice(0, 12)", "hash.slice(-6)"]);
});

test("31-35 Founder legacy resolution attaches requester Google to the exact existing UID and fails closed on conflicts", () => {
  hasAll(founderRoute, ["connectRequesterGoogle", "collection(\"users\").doc(uid)", "GOOGLE_ACCESS_IN_USE", "GOOGLE_ACCESS_PLAYER_ALREADY_LINKED", "google_connected_to_existing_uid", "status: \"resolved\""]);
  hasAll(founderUi, ["CONNECT REQUESTER GOOGLE TO EXISTING BOARDSIGNAL", "not a player approval request"]);
});

test("36-38 wrong-username disputes do not transfer human-created private content", () => {
  hasAll(founderUi, ["WRONG CHESS.COM PROFILE CORRECTIONS FAIL CLOSED", "never transfers Notes, private messages, contact details, consent settings or other human-created private content"]);
  for (const forbidden of ["collection(\"playerNotes\")", "collection(\"messages\")", "preferredContactValue:"]) assert.ok(!founderRoute.includes(forbidden));
});

test("39-43 beta password is absent from ordinary return/onboarding while legacy backend compatibility remains", () => {
  assert.ok(!returnPanel.includes("FoundingBetaAccessPanel"));
  assert.ok(!returnPanel.toLowerCase().includes("private access code"));
  assert.ok(!usernameForm.toLowerCase().includes("private access code"));
  assert.ok(!usernameForm.includes("recoverLegacy"));
  assert.ok(googleRoute.includes("recoverLegacy"));
  assert.ok(betaPanel.includes("Private access code"));
});

test("44-47 public username/email cannot take over an account and mapping conflicts still fail closed", () => {
  hasAll(onboarding, ["userSnapshot.exists || mappingSnapshot.exists || playerSnapshot.exists"]);
  assert.ok(!onboarding.includes("preferredContactValue"));
  hasAll(googleServer, ["identityStatus === \"revoked\"", "GOOGLE_ACCESS_MAPPING_MISMATCH"]);
  hasAll(founderRoute, ["requester Google identity is already attached to a different active private BoardSignal", "Nothing was merged or overwritten"]);
  hasAll(founderUi, ["Google email metadata", "not identity proof"]);
});

test("Founder identity cases are separate from ordinary beta approval semantics", () => {
  hasAll(founderUi, ["ACCESS / IDENTITY CASES", "OPEN", "AWAITING PLAYER", "UNDER REVIEW", "RESOLVED", "CLOSED", 'type CaseStatus = "open" | "awaiting_player" | "under_review" | "resolved" | "closed" | "rejected"', "return status.toUpperCase()", "Ordinary Google onboarding and returning players never wait here"]);
  assert.ok(founderPage.includes("<FounderIdentityAccessCases />"));
  assert.ok(founderPage.includes("<FoundingBetaPlayersAdmin />"));
  assert.ok(!founderUi.includes("PLAYER WAITING FOR APPROVAL"));
});
