import fs from "node:fs";

function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, value) { fs.writeFileSync(file, value); }
function replaceRequired(file, from, to) {
  let source = read(file);
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`Patch K legacy compatibility: expected source not found in ${file}`);
  source = source.replace(from, to);
  write(file, source);
}

const usernameForm = "src/components/UsernameDeskForm.tsx";
{
  let source = read(usernameForm);
  if (!source.includes("async function submit(event: FormEvent<HTMLFormElement>)")) {
    const marker = "  async function startGoogle() {";
    if (!source.includes(marker)) throw new Error("Patch K legacy compatibility: Google start marker missing");
    source = source.replace(marker, `  async function submit(event: FormEvent<HTMLFormElement>) {\n    event.preventDefault();\n    const cleanUsername = username.trim();\n    const publicUsername = cleanUsername.replace(/^@/, \"\");\n    if (!publicUsername) { setError(\"Enter a Chess.com username to explore public BoardSignal.\"); return; }\n    setError(\"\");\n    router.push(\`/boardsignal/build/\${encodeURIComponent(publicUsername)}\`);\n  }\n\n${marker}`);
  }

  if (!source.includes("EXPLORE PUBLIC BOARDSIGNAL")) {
    const marker = `        <p className="username-privacy"><ShieldCheck size={14}/> Google identifies you to BoardSignal. It does not verify ownership of a Chess.com profile.</p>`;
    if (!source.includes(marker)) throw new Error("Patch K legacy compatibility: Google disclosure marker missing");
    const publicExplorer = `${marker}\n        <div className="oauth-pending-divider"><span>OR EXPLORE THE PUBLIC UNIVERSE</span></div>\n        <form className="public-universe-username-form" onSubmit={submit}>\n          <label htmlFor={compact ? "public-username-compact" : "public-username"}>Chess.com username\n            <div className="username-entry-row activation-username-row"><span className="username-prefix" aria-hidden="true"><Search size={19}/></span><input id={compact ? "public-username-compact" : "public-username"} name="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Chess.com username" autoComplete="off" spellCheck={false}/></div>\n          </label>\n          <div className="beta-universe-disclosure"><strong>SEE YOUR GAMES TOGETHER</strong><p>Explore the public LIVE BoardSignal built from public Chess.com games. This does not create or open a private Player Room.</p></div>\n          <button className="button button-outline" type="submit">EXPLORE PUBLIC BOARDSIGNAL <ArrowRight size={17}/></button>\n        </form>`;
    source = source.replace(marker, publicExplorer);
  }
  write(usernameForm, source);
}

const betaAccessTest = "tests/boardsignal-beta-access.test.ts";
replaceRequired(
  betaAccessTest,
  `  const room = readFileSync("src/components/BoardSignalPlayerRoom.tsx", "utf8");\n  const form = readFileSync("src/components/FoundingBetaAccessPanel.tsx", "utf8");\n  assert.match(room, /onAuthStateChanged\\(auth/);\n  assert.match(room, /if \\(!user\\)/);\n  assert.match(form, /browserLocalPersistence/);\n  assert.match(room, /Sign out/);`,
  `  const room = readFileSync("src/components/BoardSignalPlayerRoom.tsx", "utf8");\n  const form = readFileSync("src/components/FoundingBetaAccessPanel.tsx", "utf8");\n  const profile = readFileSync("src/components/PlayerProfileNotifications.tsx", "utf8");\n  assert.match(room, /onAuthStateChanged\\(auth/);\n  assert.match(room, /if \\(!user\\)/);\n  assert.match(form, /browserLocalPersistence/);\n  assert.match(profile, /Sign out/);`,
);

const communicationsTest = "tests/boardsignal-communications-onboarding.test.ts";
replaceRequired(
  communicationsTest,
  `  assert.match(room, /REVIEW 1/);`,
  `  assert.match(room, /MY BOARDSIGNAL IS LIVE/);\n  assert.match(room, /Your Review is forming/);`,
);
replaceRequired(
  communicationsTest,
  `  assert.match(profile, /Founding Access public highlights = Included/);`,
  `  assert.match(profile, /Public highlights/);\n  assert.match(profile, /Google Access never unlocks public Chess.com identity by itself/);`,
);

console.log("Patch K legacy public-LIVE and regression compatibility reconciled.");
