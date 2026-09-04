import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  ChessComIdentityResolutionError,
  normalizeChessComIdentityInput,
  resolveChessComIdentityInput,
} from "../src/lib/boardsignal/chessComIdentityResolution";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

async function withMockFetch<T>(
  mock: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  run: () => Promise<T>,
) {
  const original = globalThis.fetch;
  globalThis.fetch = mock as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

function expectResolutionError(code: string, message: RegExp) {
  return (error: unknown) => {
    assert.ok(error instanceof ChessComIdentityResolutionError);
    assert.equal(error.code, code);
    assert.match(error.message, message);
    assert.doesNotMatch(error.message, /Chess\.com player not found\./i);
    return true;
  };
}

test("1-7 Chess.com identity input normalization accepts usernames/member links and rejects unsafe formats", () => {
  assert.equal(normalizeChessComIdentityInput("Untapped_Potential"), "Untapped_Potential");
  assert.equal(normalizeChessComIdentityInput("@Untapped_Potential"), "Untapped_Potential");
  assert.equal(normalizeChessComIdentityInput("https://www.chess.com/member/Untapped_Potential"), "Untapped_Potential");
  assert.equal(normalizeChessComIdentityInput("https://www.chess.com/member/Untapped_Potential/"), "Untapped_Potential");
  assert.equal(normalizeChessComIdentityInput("  www.chess.com/member/Untapped_Potential  "), "Untapped_Potential");
  assert.throws(
    () => normalizeChessComIdentityInput("https://example.com/member/Untapped_Potential"),
    expectResolutionError("CHESS_COM_INVALID_INPUT", /valid Chess\.com username or Chess\.com member profile link/i),
  );
  assert.throws(
    () => normalizeChessComIdentityInput("https://www.chess.com/member/"),
    expectResolutionError("CHESS_COM_INVALID_INPUT", /valid Chess\.com username or Chess\.com member profile link/i),
  );
});

test("8 incident regression: mocked PubAPI 404 is neutral for typo and historical username", async () => {
  await withMockFetch(async () => new Response("{}", { status: 404 }), async () => {
    for (const input of ["DarkGiftMagician", "DarkGiftedMagician"]) {
      await assert.rejects(
        resolveChessComIdentityInput(input),
        expectResolutionError("CHESS_COM_UNRESOLVED", /couldn't resolve that username.*current username.*profile link/i),
      );
    }
  });
});

test("9 mocked PubAPI 429 is classified as rate limited", async () => {
  await withMockFetch(async () => new Response("{}", { status: 429 }), async () => {
    await assert.rejects(
      resolveChessComIdentityInput("Untapped_Potential"),
      expectResolutionError("CHESS_COM_RATE_LIMITED", /limiting requests.*Try again shortly/i),
    );
  });
});

test("10 mocked PubAPI 5xx is classified as temporary upstream unavailability", async () => {
  await withMockFetch(async () => new Response("{}", { status: 503 }), async () => {
    await assert.rejects(
      resolveChessComIdentityInput("Untapped_Potential"),
      expectResolutionError("CHESS_COM_UNAVAILABLE", /temporarily unavailable.*BoardSignal account is fine.*try again shortly/i),
    );
  });
});

test("11 timeout and network failures remain separately observable and retryable", async () => {
  await withMockFetch(async () => {
    const error = new Error("timed out");
    error.name = "TimeoutError";
    throw error;
  }, async () => {
    await assert.rejects(
      resolveChessComIdentityInput("Untapped_Potential"),
      expectResolutionError("CHESS_COM_TIMEOUT", /temporarily unavailable.*try again shortly/i),
    );
  });

  await withMockFetch(async () => { throw new TypeError("socket closed"); }, async () => {
    await assert.rejects(
      resolveChessComIdentityInput("Untapped_Potential"),
      expectResolutionError("CHESS_COM_NETWORK", /temporarily unavailable.*try again shortly/i),
    );
  });
});

test("12 success returns Chess.com canonical username, numeric player_id, avatar and profile for username or link", async () => {
  const requested: string[] = [];
  await withMockFetch(async (input) => {
    requested.push(String(input));
    return new Response(JSON.stringify({
      player_id: 987654321,
      username: "Untapped_Potential",
      avatar: "https://images.chesscomfiles.com/uploads/v1/user/avatar.png",
      url: "https://www.chess.com/member/Untapped_Potential",
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }, async () => {
    const plain = await resolveChessComIdentityInput("Untapped_Potential");
    const linked = await resolveChessComIdentityInput("https://www.chess.com/member/Untapped_Potential");
    for (const result of [plain, linked]) {
      assert.equal(result.username, "Untapped_Potential");
      assert.equal(result.playerId, 987654321);
      assert.equal(result.avatar, "https://images.chesscomfiles.com/uploads/v1/user/avatar.png");
      assert.equal(result.profileUrl, "https://www.chess.com/member/Untapped_Potential");
    }
  });
  assert.deepEqual(requested, [
    "https://api.chess.com/pub/player/Untapped_Potential",
    "https://api.chess.com/pub/player/Untapped_Potential",
  ]);
});

test("13 failed resolution remains editable/retryable without restarting Google onboarding", () => {
  const ui = read("src/components/UsernameDeskForm.tsx");
  const start = ui.indexOf("async function resolveProfile");
  const end = ui.indexOf("async function claimProfile", start);
  const block = ui.slice(start, end);
  assert.ok(block.includes("const identityInput = username.trim()"));
  assert.ok(block.includes("googleIdToken, username: identityInput"));
  assert.ok(block.includes("setError(reason instanceof Error ? reason.message"));
  assert.ok(block.includes("setBusy(\"\")"));
  assert.ok(!block.includes("setGoogleIdToken(\"\")"));
  assert.ok(ui.includes("value={username} onChange={(event) => setUsername(event.target.value)}"));
});

test("14 claimProfile still re-resolves the canonical Chess.com identity before any claim transaction", () => {
  const onboarding = read("src/lib/boardsignal/server/googleOnboarding.ts");
  const start = onboarding.indexOf("export async function claimGoogleOnboardingProfile");
  const block = onboarding.slice(start);
  assert.ok(block.includes("resolvedIdentity(await resolveChessComIdentityInput(usernameInput))"));
  assert.ok(block.indexOf("resolvedIdentity(await resolveChessComIdentityInput(usernameInput))") < block.indexOf("db.runTransaction"));
});

test("15 durable BoardSignal UID/player mapping remains numeric Chess.com player_id based", () => {
  const onboarding = read("src/lib/boardsignal/server/googleOnboarding.ts");
  assert.ok(onboarding.includes("const uid = firebaseUidForChessPlayer(identity.playerId)"));
  assert.ok(onboarding.includes('db.collection("chessPlayerAccounts").doc(String(identity.playerId))'));
  assert.ok(onboarding.includes("playerId: identity.playerId"));
  assert.ok(!onboarding.includes("firebaseUidForChessPlayer(identity.canonicalUsername"));
});

test("16 existing-profile collision protection and alias mappings remain fail-closed", () => {
  const onboarding = read("src/lib/boardsignal/server/googleOnboarding.ts");
  for (const required of [
    "CHESS_PROFILE_ALREADY_HAS_BOARDSIGNAL",
    "GOOGLE_ACCESS_MAPPING_MISMATCH",
    "GOOGLE_ACCESS_IN_USE",
    'db.collection("playerIdentityAliases").doc(googlePlayerAliasId(identity.playerId))',
    'db.collection("playerIdentityAliases").doc(identity.canonicalUsername.toLowerCase())',
  ]) assert.ok(onboarding.includes(required), `Missing collision protection: ${required}`);
});

test("17 Google return flow, canonical confirmation, retry UX and neutral onboarding copy remain intact", () => {
  const route = read("src/app/api/boardsignal/google-access/route.ts");
  const ui = read("src/components/UsernameDeskForm.tsx");
  const onboarding = read("src/lib/boardsignal/server/googleOnboarding.ts");
  assert.ok(route.includes('if (action === "return")'));
  assert.ok(route.includes("returnWithGoogle(body.googleIdToken, body.expectedPlayerId)"));
  assert.ok(ui.includes("Chess.com username or profile link"));
  assert.ok(ui.includes("Username or Chess.com profile link"));
  assert.ok(ui.includes("Use the current username shown on your Chess.com profile, or paste the Chess.com member profile link."));
  assert.ok(ui.includes("IS THIS YOUR CHESS.COM PROFILE?"));
  assert.ok(ui.includes("profile.canonicalUsername"));
  assert.ok(ui.includes("profile.avatar"));
  assert.ok(ui.includes("profile.profileUrl"));
  assert.ok(ui.includes('role="alert"'));
  assert.ok(ui.includes("onSubmit={resolveProfile}"));
  assert.ok(onboarding.includes("safeConfirmation"));
  assert.ok(!ui.includes("Chess.com player not found."));
  assert.ok(!onboarding.includes("Chess.com player not found."));
});
