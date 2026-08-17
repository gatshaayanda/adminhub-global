const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));

const files = {
  layout: "src/app/layout.tsx",
  page: "src/app/ayanda/page.tsx",
  css: "src/app/ayanda/AyandaPortfolio.module.css",
  og: "src/app/ayanda/opengraph-image.tsx",
  client: "src/components/ayanda/AyandaPortfolioClient.tsx",
  chrome: "src/components/RouteAwarePublicChrome.tsx",
  data: "src/data/ayandaPortfolio.ts",
  helper: "src/lib/standalonePublicRoutes.ts",
};

const allPortfolioSource = () => [files.page, files.css, files.og, files.client, files.data, files.helper, files.chrome].map(read).join("\n");
const dataSource = () => read(files.data);

const approvedDriveIds = new Set([
  "1WDlMlzdXPAmwH3ajtnBFKhvpx8puDQac",
  "1sFsrmiBoNg8Q9jqTpWJEvuLZCjJiNavqBnVPmLfERBE",
  "15VS0xBd_YLetSi-rkG2l4ICgRyCrEg_7KPJ1_bf85Bc",
  "1CRuRioSGVC0YrHgJwAO-7FdAe6horplw",
  "1FoUVs3dmHBPFkG_j1G-w9OIdsVc6EjdELABESvZ0LEY",
]);

function extractGoogleFileIds(source) {
  const ids = new Set();
  for (const match of source.matchAll(/https:\/\/(?:drive|docs)\.google\.com\/(?:file\/d|document\/d)\/([A-Za-z0-9_-]+)/g)) ids.add(match[1]);
  return ids;
}

function transpile(relative) {
  const source = read(relative);
  const output = ts.transpileModule(source, {
    fileName: relative,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      isolatedModules: true,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${relative}: ${errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join(" | ")}`);
}

test("1 immutable baseline is frozen in package manifest", () => {
  const manifest = read("PATCH_MANIFEST.md");
  assert.match(manifest, /50dbcf20434d0583304d6bf9c75a64a8068b7b90/);
  assert.match(manifest, /Fix universe participant fallback typing/);
});

test("2-15 route, identity, contact and evidence URLs are exact", () => {
  assert.ok(exists(files.page));
  const client = read(files.client);
  const data = dataSource();
  assert.equal((client.match(/<h1\b/g) || []).length, 1);
  assert.match(client, /<span>AYANDA<\/span>\{" "\}<span>KOPANO<\/span>\{" "\}<span>GATSHA<\/span>/);
  assert.match(data, /Technical Support Specialist/);
  assert.match(data, /SaaS Customer Support & Customer Success/);
  assert.match(data, /Gaborone, Botswana/);
  assert.match(data, /gatshaayanda@gmail\.com/);
  assert.match(data, /\+267 78098928/);
  assert.match(data, /https:\/\/www\.linkedin\.com\/in\/ayandagatsha/);
  assert.match(data, /https:\/\/github\.com\/gatshaayanda/);
  for (const id of approvedDriveIds) assert.ok(data.includes(id), `missing approved evidence ${id}`);
  assert.match(data, /AYANDA K GATSHA 082026/);
  assert.doesNotMatch(data, /1KY3iqIML-gVlRaAgNgf5_GrcO5tLerBlw_3X4aF6rp0/);
  assert.match(data, /135,900\+ follow-up messages for 316 clients\./);
  assert.doesNotMatch(data, /135,900\+ follow-up messages for 316 clients during one (?:12|15)-month period/i);
  assert.match(data, /Sales professionals in CommissionCrowd outreach and database workflows/);
  assert.doesNotMatch(data, /Sales professionals reached\/supported through CommissionCrowd operational systems/);
  assert.match(data, /context: "January 2016–Present"/);
  assert.match(data, /period: "January 2016–Present"/);
  assert.doesNotMatch(data, /Part-time since November 2024|Part-time from November 2024/i);
});

test("16-20 Drive privacy allowlist is narrow and static", () => {
  const source = allPortfolioSource();
  assert.doesNotMatch(source, /drive\.google\.com\/drive\/folders\//i);
  assert.doesNotMatch(source, /OMANG/i);
  assert.doesNotMatch(source, /drive\.googleapis\.com|googleapis\.com\/drive|Google_Drive|files\.list\(|files\.get\(/);
  const found = extractGoogleFileIds(source);
  assert.deepEqual([...found].sort(), [...approvedDriveIds].sort());
  assert.doesNotMatch(dataSource(), /BS-BETA-|beta[-_ ]tester[^\n]*\.pdf/i);
  assert.doesNotMatch(dataSource(), /private weakness|player private data|Firebase IDs|beta access links/i);
});

test("21-28 standalone route shell suppresses BoardSignal chrome only for Ayanda", () => {
  const helper = read(files.helper);
  const chrome = read(files.chrome);
  assert.match(helper, /pathname === "\/ayanda"/);
  assert.match(helper, /pathname\?\.startsWith\("\/ayanda\/"\)/);
  assert.doesNotMatch(helper, /"\/feed"|"\/admin"|"\/boardsignal\/player-room"/);
  assert.match(chrome, /if \(standalone\) return <>\{children\}<\/>;/);
  for (const component of ["Header", "Footer", "AskBoardSignal", "InstallPrompt", "PwaLaunchRedirect", "BoardSignalSituationalMotion", "Loader"]) {
    assert.ok(chrome.includes(`<${component}`), `${component} must remain in normal BoardSignal shell`);
  }
  assert.match(read(files.layout), /<RouteAwarePublicChrome>\{children\}<\/RouteAwarePublicChrome>/);
  assert.doesNotMatch(read(files.client), /SignalMark|AskBoardSignal|Get My BoardSignal|Install BoardSignal/);
});

test("29-35 metadata, canonical, robots, JSON-LD and OG image are present", () => {
  const page = read(files.page);
  const og = read(files.og);
  assert.match(page, /Ayanda Kopano Gatsha — Technical Support, SaaS Customer Success & Product Operations/);
  assert.match(page, /https:\/\/www\.adminhub-global\.com\/ayanda/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.match(page, /manifest: null/);
  assert.match(page, /applicationName: "Ayanda Kopano Gatsha"/);
  assert.match(page, /"@type": "ProfilePage"/);
  assert.match(page, /name: ayandaPortfolio\.profile\.name/);
  assert.match(page, /sameAs: \[ayandaPortfolio\.contact\.linkedin, ayandaPortfolio\.contact\.github\]/);
  assert.ok(exists(files.og));
  assert.match(og, /1200/);
  assert.match(og, /630/);
  assert.doesNotMatch(og, /BoardSignal|chess/i);
});

test("36-45 external-link safety, semantics, motion, mobile and print requirements", () => {
  const client = read(files.client);
  const css = read(files.css);
  assert.match(client, /target="_blank" rel=\{externalRel\}/);
  assert.match(client, /const externalRel = "noopener noreferrer"/);
  assert.match(client, /<main id="main">/);
  assert.match(client, /<header className=/);
  assert.match(client, /<nav className=/);
  assert.match(client, /<section className=/);
  assert.match(client, /<article className=/);
  assert.match(client, /<footer className=/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /animation[^;]*infinite|animation-iteration-count\s*:\s*infinite/i);
  assert.doesNotMatch(client, /<video|autoPlay/i);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /@media print/);
  assert.match(client, /window\.print\(\)/);
});

test("46-49 protected project files are not part of the patch payload", () => {
  for (const protectedPath of ["package.json", "package-lock.json", "firestore.rules"]) {
    assert.equal(exists(protectedPath), false, `${protectedPath} must not be shipped as a changed patch file`);
  }
  const payload = Object.values(files).join("\n");
  assert.doesNotMatch(payload, /OriginalBetaHistoryAdmin|legacyBetaReconciliation|reviewHistory\.ts/);
});

test("50-51 all P.1 TS/TSX files pass isolated TypeScript transpilation", () => {
  for (const relative of Object.values(files).filter((name) => /\.(ts|tsx)$/.test(name))) transpile(relative);
});

test("52 source has no whitespace-error markers", () => {
  for (const relative of [...Object.values(files), "tests/ayanda-professional-portfolio.test.cjs"]) {
    const source = read(relative);
    const lines = source.split("\n");
    assert.equal(lines.some((line) => /[ \t]+$/.test(line)), false, `${relative} contains trailing whitespace`);
  }
});
