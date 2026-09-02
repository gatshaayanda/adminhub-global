const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('P0 public page has locked positioning, metadata and social destinations', () => {
  const page = read('src/app/pipeline/page.tsx');
  assert.match(page, /BoardSignal V1 is live/);
  assert.match(page, /The desk keeps moving/);
  assert.match(page, /Founding Release · Limited Availability/);
  assert.match(page, /BoardSignal Pipeline — What We're Building Next/);
  assert.match(page, /robots:\s*\{ index: true, follow: true \}/);
  assert.match(page, /instagram\.com\/boardsignal\?igsi=cW12eXFtMng3bHd6/);
  assert.match(page, /discord\.gg\/GecXt64PEf/);
  assert.match(page, /youtube\.com\/@boardsignal-n1z\?si=1glv1AQmcfy4ues7/);
  assert.doesNotMatch(page, /Beta|General Availability/);
});

test('P0 seeds exactly the locked planned and released product stories without internal capacity copy', () => {
  const model = read('src/lib/boardsignal/featurePipeline.ts');
  for (const id of ['BS-P1-LIVE-RECOVERY','BS-P2-UNIVERSE-SCALE','BS-P3-LICHESS','BS-R-HISTORY-RECOVERY','BS-R-CURRENT-RELIABILITY','BS-R-COACHING-PRESENTATIONS']) assert.match(model, new RegExp(id));
  assert.match(model, /status: "planned"/);
  assert.match(model, /status: "released"/);
  assert.doesNotMatch(model, /50,000 reads|50K|200-player|200 player|Firebase|Firestore|free tier/);
});

test('P0 public read path is materialized and feedback is bounded/moderated', () => {
  const server = read('src/lib/boardsignal/server/featurePipeline.ts');
  assert.match(server, /publicFeaturePipelineState/);
  assert.match(server, /stateRef\(\)\.get\(\)/);
  assert.doesNotMatch(server, /collection\("users"\)/);
  assert.doesNotMatch(server, /collection\("Reviews"\)/i);
  assert.match(server, /MAX_PUBLIC_COMMENTS = 20/);
  assert.match(server, /moderationStatus/);
  assert.match(server, /"pending" as const/);
  assert.match(server, /moderationStatus === "approved"/);
  assert.match(server, /MUTATION_COOLDOWN_MS/);
});

test('guest identity is opaque and cookie-secured; player identity remains private', () => {
  const route = read('src/app/api/boardsignal/pipeline/feedback/route.ts');
  assert.match(route, /httpOnly: true/);
  assert.match(route, /secure: true/);
  assert.match(route, /sameSite: "lax"/);
  assert.match(route, /hashPipelineIdentity/);
  assert.doesNotMatch(route, /email/i);
  const server = read('src/lib/boardsignal/server/featurePipeline.ts');
  assert.match(server, /playerUid/);
  assert.match(server, /feedback: \{[\s\S]*interested: Boolean\(result\.feedback\?\.interested\)[\s\S]*moderationStatus:/);
  assert.doesNotMatch(read('src/app/pipeline/page.tsx'), /playerUid|identityKeyHash|email/i);
});

test('Founder admin, status control, nav and deletion cleanup are wired', () => {
  assert.match(read('src/components/AdminNav.tsx'), /Feature Pipeline/);
  const admin = read('src/components/FounderFeaturePipeline.tsx');
  for (const status of ['planned','building','released','exploring']) assert.match(admin, new RegExp(`value="${status}"`));
  for (const action of ['approve','hide','delete']) assert.match(admin, new RegExp(`action:"${action}"`));
  const deletionRoute = read('src/app/api/admin/boardsignal/beta-access/route.ts');
  assert.match(deletionRoute, /removePlayerFeaturePipelineFeedback/);
});

test('navigation, mobile and reduced-motion protections are present', () => {
  assert.match(read('src/components/Header.tsx'), /\{ label: "Pipeline", href: "\/pipeline" \}/);
  const css = read('src/app/pipeline/pipeline.css');
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /\.pipeline-card\{grid-column:span 6/);
  assert.match(css, /\.pipeline-card\{grid-column:1\/-1/);
});
