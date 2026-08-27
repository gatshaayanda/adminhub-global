from pathlib import Path

path = Path("tests/boardsignal-beta-access.test.ts")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"PATCH_J_CRITICAL_TEST_REPAIR_ANCHOR_MISMATCH count={count} anchor={old[:80]!r}")
    text = text.replace(old, new, 1)


replace_once(
    'import test from "node:test";\n',
    'import test from "node:test";\nimport { pathToFileURL } from "node:url";\n',
)

replace_once(
'''test("public username to LIVE Desk remains available without authentication", () => {
  const buildPage = readFileSync("src/app/boardsignal/build/[handle]/page.tsx", "utf8");
  const usernameForm = readFileSync("src/components/UsernameDeskForm.tsx", "utf8");
  const liveRoute = readFileSync("src/app/api/boardsignal/[username]/route.ts", "utf8");
  assert.match(buildPage, /UniversalPlayerDesk/);
  assert.match(usernameForm, /Get My BoardSignal/);
  assert.doesNotMatch(usernameForm, /Build My Desk/);
  assert.match(liveRoute, /buildLiveDesk/);
  assert.doesNotMatch(liveRoute, /requirePlayerToken/);
});''',
'''test("public username to LIVE Desk remains available without authentication", () => {
  const buildPage = readFileSync("src/app/boardsignal/build/[handle]/page.tsx", "utf8");
  const usernameForm = readFileSync("src/components/UsernameDeskForm.tsx", "utf8");
  const liveRoute = readFileSync("src/app/api/boardsignal/[username]/route.ts", "utf8");
  assert.match(buildPage, /UniversalPlayerDesk/);
  assert.match(usernameForm, /onSubmit=\{submit\}/);
  assert.match(usernameForm, /name="username"/);
  assert.match(usernameForm, /event\.preventDefault\(\)/);
  assert.match(usernameForm, /const cleanUsername = username\.trim\(\)/);
  assert.match(liveRoute, /buildLiveDesk/);
  assert.doesNotMatch(liveRoute, /requirePlayerToken/);
});''',
)

replace_once(
'''test("Founder Beta Access management API remains behind shared Founder session/Basic fallback middleware without double-auth", () => {
  const middleware = readFileSync("middleware.ts", "utf8");
  const api = readFileSync("src/app/api/admin/boardsignal/beta-access/route.ts", "utf8");
  assert.match(middleware, /startsWith\('\\/api\\/admin\\/boardsignal\\/'\)/);
  assert.match(middleware, /'\\/api\\/admin\\/boardsignal\\/:path\\*'/);
  assert.match(middleware, /verifyFounderAuthorization/);
  assert.doesNotMatch(api, /requireFounderBasicAuth/);
  assert.match(api, /listFounderPlayerIdentities\(\)/);
  assert.match(api, /createFoundingBetaAccess\(body\.username\)/);
  assert.match(api, /resetFoundingBetaAccess\(body\.playerId\)/);
  assert.match(api, /revokeFoundingBetaAccess\(body\.playerId\)/);
  assert.match(api, /accessCode: result\.accessCode/);
  assert.match(api, /errorStatus\(error\)/);
});''',
'''test("Founder Beta Access management API remains behind shared Founder session/Basic fallback middleware without double-auth", () => {
  const middleware = readFileSync("middleware.ts", "utf8");
  const api = readFileSync("src/app/api/admin/boardsignal/beta-access/route.ts", "utf8");
  const founderApiRouteMatches = middleware.match(/pathname\.startsWith\(["']\\/api\\/admin\\/boardsignal\\/["']\)/g) ?? [];
  assert.equal(founderApiRouteMatches.length, 2);
  assert.match(middleware, /if \(!isFounderRoute\(pathname\)\) return NextResponse\.next\(\)/);
  assert.match(middleware, /if \(isFounderApi\(pathname\)\)[\s\S]*status:\s*401/);
  assert.match(middleware, /matcher:\s*\[[^\]]*["']\\/api\\/admin\\/boardsignal\\/:path\\*["']/);
  assert.match(middleware, /verifyFounderAuthorization/);
  assert.doesNotMatch(api, /requireFounderBasicAuth/);
  assert.match(api, /export async function GET\(\)/);
  assert.match(api, /return response\(\{ ok: true, players: directory\.players, requests: directory\.requests \}\)/);
  assert.match(api, /export async function POST\(request: Request\)/);
  for (const action of ["create", "reset", "revoke"]) {
    assert.match(api, new RegExp(`body\\.action === "${action}"`));
  }
  assert.match(api, /accessCode:/);
});''',
)

replace_once(
'''test("Founder middleware rejects unauthenticated Beta Access requests and permits valid Founder auth", async () => {
  process.env.ADMIN_PASSWORD = "focused-founder-test-secret";
  try {
    const { middleware } = await import("../middleware");
    const request = (authorization?: string) => ({
      nextUrl: { pathname: "/api/admin/boardsignal/beta-access" },
      headers: new Headers(authorization ? { authorization } : undefined),
      cookies: { get: () => undefined },
    }) as Parameters<typeof middleware>[0];

    const unauthenticated = await middleware(request());
    assert.equal(unauthenticated.status, 401);

    const rejected = await middleware(request(`Basic ${Buffer.from("founder:wrong-secret").toString("base64")}`));
    assert.equal(rejected.status, 401);

    const authenticated = await middleware(request(`Basic ${Buffer.from("founder:focused-founder-test-secret").toString("base64")}`));
    assert.equal(authenticated.status, 200);
    assert.equal(authenticated.headers.get("x-middleware-next"), "1");
  } finally {
    delete process.env.ADMIN_PASSWORD;
  }
});''',
'''test("Founder authorization accepts native session and Basic auth while rejecting missing or invalid credentials", async () => {
  type FounderSessionModule = {
    createFounderSession: (adminPassword: string, options?: { nowMs?: number; nonce?: string }) => Promise<{ value: string }>;
    verifyFounderAuthorization: (input: { sessionValue?: string; authorization?: string; adminPassword?: string; nowMs?: number }) => Promise<{ authorized: boolean; method: string; reason?: string }>;
  };
  const nativeImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<FounderSessionModule>;
  const founderSessionUrl = pathToFileURL(`${process.cwd()}/src/lib/boardsignal/founderSession.mjs`).href;
  const { createFounderSession, verifyFounderAuthorization } = await nativeImport(founderSessionUrl);
  const secret = "focused-founder-test-secret";
  const nowMs = Date.parse("2026-08-11T12:00:00.000Z");

  const notConfigured = await verifyFounderAuthorization({ adminPassword: undefined, nowMs });
  assert.equal(notConfigured.authorized, false);
  assert.equal(notConfigured.reason, "not_configured");

  const unauthenticated = await verifyFounderAuthorization({ adminPassword: secret, nowMs });
  assert.equal(unauthenticated.authorized, false);
  assert.equal(unauthenticated.reason, "invalid");

  const rejected = await verifyFounderAuthorization({
    authorization: `Basic ${Buffer.from("founder:wrong-secret").toString("base64")}`,
    adminPassword: secret,
    nowMs,
  });
  assert.equal(rejected.authorized, false);

  const basic = await verifyFounderAuthorization({
    authorization: `Basic ${Buffer.from(`founder:${secret}`).toString("base64")}`,
    adminPassword: secret,
    nowMs,
  });
  assert.equal(basic.authorized, true);
  assert.equal(basic.method, "basic");

  const session = await createFounderSession(secret, { nowMs, nonce: "focused-founder-session" });
  const sessionAuthorization = await verifyFounderAuthorization({ sessionValue: session.value, adminPassword: secret, nowMs });
  assert.equal(sessionAuthorization.authorized, true);
  assert.equal(sessionAuthorization.method, "session");
});''',
)

path.write_text(text, encoding="utf-8")
print("PATCH_J_CRITICAL_TESTS_REPAIRED")
