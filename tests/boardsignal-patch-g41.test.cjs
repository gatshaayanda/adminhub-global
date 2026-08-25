const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const periodSrc = read('src/lib/boardsignal/reviewPeriods.ts');
const serverPeriods = read('src/lib/boardsignal/server/reviewPeriods.ts');
const backfill = read('src/lib/boardsignal/server/historyBackfill.ts');
const worker = read('src/components/BoardSignalHistoryWorker.tsx');
const roomRoute = read('src/app/api/boardsignal/player-room/route.ts');
const room = read('src/components/BoardSignalPlayerRoom.tsx');
const guideRoute = read('src/app/api/boardsignal/guide/route.ts');
const weeklyGuide = read('src/lib/boardsignal/server/weeklyGuide.ts');
const founderServer = read('src/lib/boardsignal/server/founderOperations.ts');
const founderUi = read('src/components/FounderOperationsConsole.tsx');
const accountDeletion = read('src/lib/boardsignal/server/accountDeletion.ts');
const reviewHistorySrc = read('src/lib/boardsignal/reviewHistory.ts');
const css = read('src/app/boardsignal-g41-weekly-truth.css');
const layout = read('src/app/layout.tsx');
const g4Universe = read('src/lib/boardsignal/server/universePulse.ts');
const g4Ranking = read('src/lib/boardsignal/universe.ts');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boardsignal-g41-'));
const compiled = ts.transpileModule(periodSrc, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
const js = path.join(tmp, 'reviewPeriods.js');
fs.writeFileSync(js, compiled.outputText);
const periods = require(js);

// 01-28 cadence and rolling-window truth across representative anchors/dates.
const cadenceCases = [
  ['2026-08-01','2026-08-07T12:00:00Z',['2026-07-04','2026-07-11','2026-07-18','2026-07-25']],
  ['2026-08-01','2026-08-08T00:00:00Z',['2026-07-11','2026-07-18','2026-07-25','2026-08-01']],
  ['2026-08-01','2026-08-15T00:00:00Z',['2026-07-18','2026-07-25','2026-08-01','2026-08-08']],
  ['2026-08-01','2026-08-22T00:00:00Z',['2026-07-25','2026-08-01','2026-08-08','2026-08-15']],
  ['2026-08-01','2026-08-29T00:00:00Z',['2026-08-01','2026-08-08','2026-08-15','2026-08-22']],
  ['2026-08-01','2026-09-05T00:00:00Z',['2026-08-08','2026-08-15','2026-08-22','2026-08-29']],
  ['2026-07-03','2026-08-08T00:00:00Z',['2026-07-10','2026-07-17','2026-07-24','2026-07-31']],
];
cadenceCases.forEach(([anchor, now, expected], i) => test(`${String(i+1).padStart(2,'0')} cadence latest-four case ${i+1}`, () => {
  assert.deepEqual(periods.latestCompletedReviewPeriods(anchor, new Date(now)).map(p => p.periodStart), expected);
}));
for (let i=0;i<7;i++) test(`${String(i+8).padStart(2,'0')} each period is exactly seven calendar days case ${i+1}`, () => {
  const rows = periods.latestCompletedReviewPeriods('2026-06-01', new Date(`2026-08-${String(17+i).padStart(2,'0')}T12:00:00Z`));
  for (const row of rows) assert.equal(periods.addPeriodDays(row.periodStart, 6), row.periodEnd);
});
for (let i=0;i<7;i++) test(`${String(i+15).padStart(2,'0')} rolling window never exceeds four case ${i+1}`, () => {
  assert.ok(periods.latestCompletedReviewPeriods('2025-01-01', new Date(`2026-08-${String(10+i).padStart(2,'0')}T00:00:00Z`)).length <= 4);
});
for (let i=0;i<7;i++) test(`${String(i+22).padStart(2,'0')} rolling window is oldest-to-newest case ${i+1}`, () => {
  const rows = periods.latestCompletedReviewPeriods('2026-01-05', new Date(`2026-08-${String(10+i).padStart(2,'0')}T00:00:00Z`));
  assert.deepEqual([...rows].sort((a,b)=>a.periodStart.localeCompare(b.periodStart)), rows);
});

// 29-38 outcome merging/evidence filtering.
test('29 review and no_activity are the only persisted outcomes', () => assert.match(periodSrc, /ReviewPeriodOutcome = "review" \| "no_activity"/));
test('30 no activity copy is explicit and truthful', () => assert.match(periodSrc, /No Chess\.com games found in this completed seven-day period/));
test('31 no-activity rows are excluded from game-bearing starts', () => {
  const base = periods.latestCompletedReviewPeriods('2026-08-01', new Date('2026-08-29T00:00:00Z'));
  const merged = periods.mergeReportPeriodTruth(base,[{...base[0],outcome:'review',evaluatedAt:'x'},{...base[1],outcome:'no_activity',evaluatedAt:'x'}]);
  assert.deepEqual([...periods.gameBearingPeriodStarts(merged)], [base[0].periodStart]);
});
test('32 performanceEvidencePeriods skips no activity', () => {
  const base = periods.latestCompletedReviewPeriods('2026-08-01', new Date('2026-08-29T00:00:00Z'));
  const merged = periods.mergeReportPeriodTruth(base,[{...base[0],outcome:'review',evaluatedAt:'x'},{...base[1],outcome:'no_activity',evaluatedAt:'x'}]);
  assert.deepEqual(periods.performanceEvidencePeriods(merged,[{periodStart:base[0].periodStart,id:1},{periodStart:base[1].periodStart,id:2}]).map(x=>x.id),[1]);
});
test('33 coverage counts evaluated quiet weeks without calling them Reviews', () => {
  const p=[{periodStart:'a',outcome:'review'},{periodStart:'b',outcome:'no_activity'},{periodStart:'c'}];
  assert.deepEqual(periods.reviewHistoryCoverage(p),{evaluatedCount:2,totalCount:3});
});
test('34 oldest missing period is deterministic', () => assert.equal(periods.oldestMissingReportPeriod([{periodStart:'1',outcome:'review'},{periodStart:'2'},{periodStart:'3'}]).periodStart,'2'));
test('35 server ledger path is reviewPeriods/{periodStart}', () => assert.match(serverPeriods, /collection\("reviewPeriods"\)\.doc\(periodStart\)/));
test('36 lazy compatibility reconstructs from retained Reviews', () => assert.match(serverPeriods, /loadCompletedReviewHistory\(account\.uid\)/));
test('37 lazy compatibility reconstructs prior Patch H evaluation state', () => assert.match(serverPeriods, /reviewHistoryBackfill\?\.evaluated/));
test('38 ledger is monotonic against review-to-no_activity downgrade', () => assert.match(serverPeriods, /existing\?\.outcome === "review" && result\.outcome === "no_activity"/));

// 39-52 catch-up/lease/idempotency.
test('39 catch-up derives targets from fixed cadence anchor', () => assert.match(backfill, /latestCompletedReviewPeriods\(account\.cadenceAnchor, now\)/));
test('40 catch-up no longer keys its window to latest Review period', () => assert.doesNotMatch(backfill, /latestPeriodStart/));
test('41 completed state can reopen when rolling targets change', () => assert.match(backfill, /!sameTargets\(state\.targetPeriods, targets\)/));
test('42 expired leases are cleared/reclaimable', () => assert.match(backfill, /!leaseIsActive\(state\.lease, now\)/));
test('43 a live lease blocks duplicate claims', () => assert.match(backfill, /if \(leaseIsActive\(state\.lease, now\)\) return undefined/));
test('44 target list is consumed oldest-first', () => {
  assert.match(backfill, /nextBackfillPeriod\(targets, state\.evaluated, existingStarts\)/);
});
test('45 claim does not perform external Review generation', () => { assert.doesNotMatch(backfill, /buildLiveDeskRequestPath/); assert.doesNotMatch(backfill, /fetch\(/); });
test('46 worker performs external Review generation after claim', () => assert.match(worker, /buildLiveDeskRequestPath/));
test('47 worker settles NO_ACTIVITY without fake Review publication', () => {
  assert.match(worker, /postState\(activeUser,\s*claimed,\s*"noActivity"\)/);
});
test('48 worker coalesces settled quiet slots within one bounded wake', () => {
  assert.match(worker, /for\(let slot=0;slot<4/);
  assert.match(worker, /settledThisWake=true;continue/);
  assert.doesNotMatch(worker, /setTimeout\(\(\)\s*=>\s*void advance\(activeUser\),\s*250\)/);
});
test('49 worker advances after each published historical Review', () => {
  assert.match(worker, /setTimeout\(\(\)\s*=>\s*void advance\(user\),\s*900\)/);
});
test('50 ordinary Review publication explicitly wakes catch-up', () => { assert.match(worker, /addEventListener\("boardsignal:review-published"/); assert.doesNotMatch(worker, /addEventListener\("boardsignal:offline-saved"/); });
test('51 slot settlement announces history-updated', () => assert.match(worker, /boardsignal:history-updated/));
test('52 quiet settlement uses history-updated without location reload', () => { assert.match(room,/addEventListener\("boardsignal:history-updated"/); assert.doesNotMatch(worker,/location\.reload|window\.location/); });

// 53-66 Player Room / evidence semantics.
test('53 Player Room exposes reportPeriods', () => assert.match(roomRoute, /reportPeriods/));
test('54 Player Room exposes historyCoverage', () => assert.match(roomRoute, /historyCoverage/));
test('55 snapshot progress is recomputed from performanceEvidencePeriods', () => assert.match(roomRoute, /performanceEvidencePeriods\(reportTruth\.periods, snapshot\.reviewHistory\)/));
test('56 recurring patterns are recomputed from game-bearing history', () => assert.match(roomRoute, /deriveRecurringPatternsFromReviewHistory\(snapshot\.reviewHistory\)/));
test('57 organic Review publish writes the same period ledger', () => assert.match(roomRoute, /recordReviewPeriodResult\(account\.uid/));
test('58 no fake Review doc is created for no activity', () => assert.doesNotMatch(serverPeriods, /collection\("desks"\).*no_activity/s));
test('59 Progress names latest four completed report periods', () => assert.match(room, /latest four completed report periods/));
test('60 Progress labels NO ACTIVITY visibly', () => assert.match(room, /NO ACTIVITY/));
test('61 NO ACTIVITY explicitly contributes zero performance evidence', () => assert.match(room, /contributes zero chess-performance evidence/));
test('62 trends explicitly say game-bearing Reviews only', () => assert.match(room, /COMPATIBLE TRENDS · GAME-BEARING REVIEWS ONLY/));
test('63 recurring patterns explicitly say game-bearing Reviews only', () => assert.match(room, /RECURRING PATTERNS · GAME-BEARING REVIEWS ONLY/));
test('64 weekly history sequence is chronological oldest-to-newest', () => assert.match(room, /periodStart\.localeCompare\(b\.periodStart\)/));
test('65 unresolved period is labeled SYNCHRONIZING rather than guessed', () => assert.match(room, /SYNCHRONIZING/));
test('66 no-activity weeks are not passed into reviewHistory metrics by UI', () => assert.match(roomRoute, /snapshot\.reviewHistory = performanceEvidencePeriods/));

// 67-75 Ask BoardSignal longitudinal truth.
test('67 Ask route checks weekly truth before generic contextual guide', () => assert.ok(guideRoute.indexOf('weeklyHistoryGuideResponse') < guideRoute.indexOf('contextualGuideResponse({')));
test('68 weekly guide recognizes last few weeks', () => assert.match(weeklyGuide, /last \(\?:few\|several\|four\) weeks/));
test('69 weekly guide distinguishes NO ACTIVITY chronology', () => assert.match(weeklyGuide, /NO ACTIVITY/));
test('70 weekly guide keeps quiet weeks chronology-only with zero performance evidence', () => { assert.match(weeklyGuide, /contribute zero chess-performance evidence/); assert.doesNotMatch(weeklyGuide, /NO ACTIVITY[^\n]*(?:weak|bad|poor) performance/i); });
test('71 weekly guide refuses to invent unsynchronized outcomes', () => assert.match(weeklyGuide, /I won't invent a result/));
test('72 weekly guide compares only game-bearing Reviews', () => assert.match(weeklyGuide, /game-bearing Reviews/));
test('73 weekly guide loads canonical period truth', () => assert.match(weeklyGuide, /loadRecentReportPeriodTruth\(account\)/));
test('74 weekly guide filters longitudinal evidence through canonical period truth', () => assert.match(weeklyGuide, /performanceEvidencePeriods\(periods, history\)/));
test('75 weekly guide makes no blanket decline inference from a quiet week', () => assert.doesNotMatch(weeklyGuide, /no activity.*declin|declin.*no activity/i));

// 76-83 Founder + Universe safety.
test('76 Founder Operations consumes canonical period truth', () => assert.match(founderServer, /loadRecentReportPeriodTruth/));
test('77 Founder bulk view disables compatibility writes', () => assert.match(founderServer, /loadRecentReportPeriodTruth\(account,\s*now,\s*false,\s*completedHistory\)/));
test('78 Founder row exposes latest report period separately', () => assert.match(founderServer, /latestReportPeriod/));
test('79 Founder row exposes official chess state period separately', () => assert.match(founderServer, /officialChessStatePeriod/));
test('80 Founder UI integrates latest report outcome under HISTORY', () => { assert.match(founderUi, /LATEST REPORT/); assert.doesNotMatch(founderUi, /data-label="LATEST PERIOD"/); });
test('81 Founder UI never calls NO ACTIVITY a weak Review', () => assert.doesNotMatch(founderUi, /weak Review|weak review/));
test('82 Universe participant source remains Review-backed and was not replaced by ledger', () => assert.doesNotMatch(g4Universe, /reviewPeriods/));
test('83 G.4 ranking engine remains untouched by G.4.1 period truth', () => assert.doesNotMatch(g4Ranking, /no_activity|reviewPeriods|ReviewPeriodResult/));

// 84-96 dark-mode / responsive / protected layer integrity.
test('84 G.4.1 CSS uses semantic surface tokens', () => assert.match(css, /var\(--bs-surface\)/));
test('85 G.4.1 CSS uses semantic text tokens', () => assert.match(css, /var\(--bs-text-primary\)/));
test('86 G.4.1 CSS contains no hex color literal', () => assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i));
test('87 G.4.1 CSS has explicit dark authenticated Ask treatment using production classes', () => { assert.match(css, /html\[data-bs-theme="dark"\].*ask-bs-panel/s); assert.match(css, /ask-bs-message\.from-player/); assert.match(css, /ask-bs-launcher/); });
test('88 G.4.1 CSS covers 480px', () => assert.match(css, /@media \(max-width: 480px\)/));
test('89 G.4.1 CSS covers 390px', () => assert.match(css, /@media \(max-width: 390px\)/));
test('90 G.4.1 CSS covers 360px', () => assert.match(css, /@media \(max-width: 360px\)/));
test('91 G.4.1 CSS covers 320px', () => assert.match(css, /@media \(max-width: 320px\)/));
test('92 G.4.1 CSS covers desktop/tablet 1024 boundary', () => assert.match(css, /@media \(max-width: 1024px\)/));
test('93 focus-visible remains explicit', () => assert.match(css, /:focus-visible/));
test('94 reduced motion remains explicit', () => assert.match(css, /prefers-reduced-motion: reduce/));
test('95 F.2 remains the final stylesheet import', () => assert.ok(layout.lastIndexOf('boardsignal-f2-readability.css') > layout.lastIndexOf('boardsignal-g41-weekly-truth.css')));
test('96 G.4 remains before G.4.1 and H.1 remains before G.4', () => assert.ok(layout.indexOf('boardsignal-h1-hotfix.css') < layout.indexOf('boardsignal-g4-universe.css') && layout.indexOf('boardsignal-g4-universe.css') < layout.indexOf('boardsignal-g41-weekly-truth.css')));

// 97-100 release-hardening contracts discovered during implementation QA.
test('97 background catch-up never owns the first real Review', () => assert.match(backfill, /if \(!establishedHistory\.length\) return undefined/));
test('98 newest game-bearing completed period yields to ordinary live Review generation', () => { assert.match(worker, /latestCompletedReviewPeriods\(claimed\.requestCadenceAnchor\)\.at\(-1\)/); assert.match(worker, /latestCompleted\?\.periodStart\s*===\s*claimed\.periodStart/); assert.match(worker, /Ordinary live Review generation has priority/); });
test('99 dark integrity targets real Friends Inbox and Profile classes', () => { assert.match(css, /\.friends-surface/); assert.match(css, /\.player-inbox-section/); assert.match(css, /\.profile-settings-card/); });
test('100 Founder dark integrity targets the actual founder console root', () => assert.match(css, /\.founder-ops-console/));


// 101-128 independent-review blocker regressions. Prefer pure behavior where the contract is data-driven.
test('101 cadence anchor is phase only: Aug 1 Review immediately has three aligned predecessors', () => {
  assert.deepEqual(periods.latestCompletedReviewPeriods('2026-08-01', new Date('2026-08-08T12:00:00Z')).map(p => p.periodStart), ['2026-07-11','2026-07-18','2026-07-25','2026-08-01']);
});
test('102 negative cadence offsets still produce exact seven-day periods', () => {
  const rows = periods.latestCompletedReviewPeriods('2026-08-01', new Date('2026-08-08T12:00:00Z'));
  assert.equal(rows[0].periodStart, '2026-07-11');
  assert.equal(rows[0].periodEnd, '2026-07-17');
  assert.equal(rows.length, 4);
});
test('103 settled newest REVIEW suppresses duplicate ordinary generation', () => {
  assert.equal(periods.canonicalGenerationRequired(true,[{periodStart:'a'},{periodStart:'b',outcome:'review'}]), false);
});
test('104 settled newest NO ACTIVITY suppresses duplicate ordinary generation', () => {
  assert.equal(periods.canonicalGenerationRequired(true,[{periodStart:'a'},{periodStart:'b',outcome:'no_activity'}]), false);
});
test('105 unresolved newest period preserves ordinary live generation ownership', () => {
  assert.equal(periods.canonicalGenerationRequired(true,[{periodStart:'a',outcome:'review'},{periodStart:'b'}]), true);
});
test('106 canonical generation helper never invents a generation requirement', () => {
  assert.equal(periods.canonicalGenerationRequired(false,[{periodStart:'b'}]), false);
});
test('107 richer Review ledger wins over poorer Review settlement', () => {
  const existing={periodStart:'2026-08-01',periodEnd:'2026-08-07',periodLabel:'1–7 Aug 2026',outcome:'review',reviewKey:'desk-rich',reviewLifecycle:'organic_live',evaluatedAt:'early',engineProof:'kept'};
  const incoming={periodStart:'2026-08-01',periodEnd:'2026-08-07',periodLabel:'1–7 Aug 2026',outcome:'review',reviewLifecycle:'historical_backfill',evaluatedAt:'late'};
  const merged=periods.mergeReviewPeriodResult(existing,incoming);
  assert.equal(merged.reviewKey,'desk-rich'); assert.equal(merged.reviewLifecycle,'organic_live'); assert.equal(merged.engineProof,'kept'); assert.equal(merged.evaluatedAt,'early');
});
test('108 Review > no_activity is monotonic in pure ledger merge', () => {
  const existing={periodStart:'a',periodEnd:'b',periodLabel:'x',outcome:'review',reviewKey:'desk',reviewLifecycle:'organic_live',evaluatedAt:'one'};
  const incoming={periodStart:'a',periodEnd:'b',periodLabel:'x',outcome:'no_activity',evaluatedAt:'two'};
  const merged=periods.mergeReviewPeriodResult(existing,incoming);
  assert.equal(merged.outcome,'review'); assert.equal(merged.reviewKey,'desk');
});
test('109 no_activity may be upgraded to a real Review', () => {
  const existing={periodStart:'a',periodEnd:'b',periodLabel:'x',outcome:'no_activity',evaluatedAt:'one'};
  const incoming={periodStart:'a',periodEnd:'b',periodLabel:'x',outcome:'review',reviewKey:'desk',reviewLifecycle:'organic_live',evaluatedAt:'two'};
  const merged=periods.mergeReviewPeriodResult(existing,incoming);
  assert.equal(merged.outcome,'review'); assert.equal(merged.reviewKey,'desk');
});
test('110 historical settlement uses monotonic ledger merge', () => assert.match(backfill,/mergeReviewPeriodResult\(existingData, result\)/));
test('111 displayed game-bearing Review count is recomputed after canonical filtering', () => assert.match(roomRoute,/desksCompleted:\s*snapshot\.reviewHistory\.length/));
test('112 Player Room generation state is derived from canonical truth helper', () => assert.match(roomRoute,/canonicalGenerationRequired\(snapshot\.generationRequired, reportTruth\.periods\)/));
test('113 successful ordinary publication emits explicit review-published event', () => assert.match(room,/dispatchEvent\(new CustomEvent\("boardsignal:review-published"/));
test('114 HistoryWorker listens to explicit review-published and not IndexedDB save', () => { assert.match(worker,/addEventListener\("boardsignal:review-published"/); assert.doesNotMatch(worker,/addEventListener\("boardsignal:offline-saved"/); });
test('115 active historical work queues unrelated wake instead of being cleared', () => { assert.match(worker,/busyRef\.current\s*\|\|\s*workRef\.current/); assert.match(worker,/wakeQueuedRef\.current\s*=\s*true/); assert.doesNotMatch(worker,/if \(!body\.work \|\| !body\.username\) \{\s*setWork\(undefined\)/s); });
test('116 quiet history settlement has a dedicated Player Room refresh event', () => { assert.match(worker,/dispatchEvent\(new CustomEvent\("boardsignal:history-updated"/); assert.match(room,/addEventListener\("boardsignal:history-updated"/); });
test('117 history refresh queues a trailing pass while any quiet refresh is active', () => { assert.match(room,/historyRefreshQueuedRef\.current = true/); assert.match(room,/flushQueuedHistoryRefresh/); assert.match(room,/queueMicrotask/); });
test('118 dark mode explicitly covers private universe legacy surface', () => assert.match(css,/private-universe-section/));
test('119 dark mode explicitly covers private standings cards', () => assert.match(css,/private-standing-list article/));
test('120 dark mode explicitly covers Universe cards boards links and empty state', () => { assert.match(css,/universe-category-card/); assert.match(css,/universe-board li/); assert.match(css,/universe-board li > a/); assert.match(css,/universe-empty/); });
test('121 dark mode explicitly covers legacy Pulse and Progress pale surfaces', () => { assert.match(css,/pulse-card-grid > article/); assert.match(css,/pulse-event-grid > article/); assert.match(css,/personal-record-strip/); assert.match(css,/pool-progress article/); assert.match(css,/recurring-patterns article/); });
test('122 actual legacy dark selectors occur after the earlier generic authenticated block', () => assert.ok(css.lastIndexOf('.private-universe-section') > css.indexOf('.player-room-authenticated :where(')));
test('123 Founder operations keeps exactly nine desktop headers', () => {
  const head=(founderUi.match(/founder-ops-table-head[^\n]+/)||[''])[0];
  assert.equal((head.match(/<span>/g)||[]).length,9);
});
test('124 Founder latest report truth is integrated into HISTORY rather than a tenth cell', () => { assert.match(founderUi,/data-label="HISTORY"[^\n]+LATEST REPORT/); assert.doesNotMatch(founderUi,/data-label="LATEST PERIOD"/); });
test('125 account deletion owns reviewPeriods in the audited private subcollection list', () => assert.match(accountDeletion,/PRIVATE_PLAYER_SUBCOLLECTIONS[\s\S]*"reviewPeriods"[\s\S]*\] as const/));
test('126 account deletion recursively deletes every audited private subcollection', () => assert.match(accountDeletion,/for \(const collectionName of PRIVATE_PLAYER_SUBCOLLECTIONS\)[\s\S]*recursiveDelete\(userRef\.collection\(collectionName\)\)/));
test('127 G.4.1 does not change deletion architecture beyond the audited subcollection ownership list', () => { assert.match(accountDeletion,/deletePrivatePlayerTree/); assert.match(accountDeletion,/PRIVATE_PLAYER_SUBCOLLECTIONS/); });
test('128 longitudinal Ask explicitly rejects personality inference and makes no psychological diagnosis', () => { assert.match(weeklyGuide,/not a claim about your personality/); assert.doesNotMatch(weeklyGuide,/you (?:are|seem|appear) (?:anxious|confident|tilted|frustrated|depressed|stressed)|your (?:mindset|mental state|psychology) (?:is|shows|suggests)/i); });

function compileCommonJs(source) {
  const out=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
  assert.equal((out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  return out.outputText;
}
function evaluateCommonJs(source, stubs) {
  const module={exports:{}};
  const localRequire=(id)=>{ if (id in stubs) return stubs[id]; throw new Error(`unexpected require ${id}`); };
  new Function('require','module','exports',compileCommonJs(source))(localRequire,module,module.exports);
  return module.exports;
}
const reviewHistoryRuntime=evaluateCommonJs(reviewHistorySrc,{});
const guideTruth={periods:[
  {periodStart:'2026-07-18',periodEnd:'2026-07-24',periodLabel:'18–24 Jul 2026',outcome:'review'},
  {periodStart:'2026-07-25',periodEnd:'2026-07-31',periodLabel:'25–31 Jul 2026',outcome:'no_activity'},
  {periodStart:'2026-08-01',periodEnd:'2026-08-07',periodLabel:'1–7 Aug 2026',outcome:'review'},
  {periodStart:'2026-08-08',periodEnd:'2026-08-14',periodLabel:'8–14 Aug 2026'},
],coverage:{evaluatedCount:3,totalCount:4}};
const guideHistory=[
  {reviewKey:'r1',periodStart:'2026-07-18',periodEnd:'2026-07-24',periodLabel:'18–24 Jul 2026',source:'live',sourceRichness:'LIVE_DESK',provenanceLabel:'live',games:10,wins:4,draws:2,losses:4,scorePct:50,headline:'old',pools:[{pool:'rapid',games:10,scorePct:50,ratingEnd:800}],longestWinRun:2,signalFamilies:{blueFamily:'queen_safety'},blue:{title:'Keep the queen safe',copy:'Check forcing replies first.'}},
  {reviewKey:'quiet-should-not-enter',periodStart:'2026-07-25',periodEnd:'2026-07-31',periodLabel:'25–31 Jul 2026',source:'live',sourceRichness:'LIVE_DESK',provenanceLabel:'bad',games:0,wins:0,draws:0,losses:0,scorePct:0,headline:'should not count',pools:[],signalFamilies:{blueFamily:'loss_run'}},
  {reviewKey:'r2',periodStart:'2026-08-01',periodEnd:'2026-08-07',periodLabel:'1–7 Aug 2026',source:'live',sourceRichness:'LIVE_DESK',provenanceLabel:'live',games:12,wins:7,draws:1,losses:4,scorePct:62.5,headline:'new',pools:[{pool:'rapid',games:12,scorePct:62.5,ratingEnd:825}],longestWinRun:3,signalFamilies:{blueFamily:'queen_safety'},blue:{title:'Keep the queen safe',copy:'Check forcing replies first.'}},
];
const weeklyRuntime=evaluateCommonJs(weeklyGuide,{
  'server-only':{},
  '../reviewPeriods':{NO_ACTIVITY_COPY:periods.NO_ACTIVITY_COPY,performanceEvidencePeriods:periods.performanceEvidencePeriods},
  '../reviewHistory':reviewHistoryRuntime,
  './persistence':{accountForToken:async()=>({uid:'u'}),loadCompletedReviewHistory:async()=>guideHistory},
  './reviewPeriods':{loadRecentReportPeriodTruth:async()=>guideTruth},
});

for (const [n,question,expect] of [
  [129,'Am I improving?',/game-bearing Reviews|real recent movements/i],
  [130,'What changed across my Reviews?',/rapid:/i],
  [131,'What keeps repeating?',/queen safety.*2 of the 2 game-bearing Reviews/i],
  [132,'What am I getting better at?',/measurable recent positives|getting better/i],
  [133,'What should I focus on?',/FOCUS NEXT.*Keep the queen safe/i],
  [134,'How have I been doing over my last few weeks?',/NO ACTIVITY.*zero chess-performance evidence/i],
]) test(`${n} longitudinal Ask handles “${question}” from bounded game-bearing truth`, async () => {
  const answer=await weeklyRuntime.weeklyHistoryGuideResponse({},question);
  assert.ok(answer); assert.match(answer.reply,expect); assert.doesNotMatch(answer.reply,/quiet-should-not-enter|should not count/);
});

test('135 dark standing badge preserves semantic lime/on-lime foreground pair', () => {
  assert.match(css,/\.private-standing-list article > b\s*\{[^}]*background:\s*var\(--bs-lime\);[^}]*color:\s*var\(--bs-on-lime\);/s);
});
test('136 dark Pulse metadata badges replace legacy light surface with semantic readable pair', () => {
  assert.match(css,/:where\(\.pulse-event-meta b, \.pulse-card-label b\)\s*\{[^}]*background:\s*var\(--bs-bg-subtle\);[^}]*color:\s*var\(--bs-text-secondary\);/s);
});
test('137 dark Pulse lists explicitly override legacy ink with semantic text', () => {
  assert.match(css,/:where\(\.pulse-card ul, \.pulse-card li\)\s*\{[^}]*color:\s*var\(--bs-text-secondary\);/s);
});
test('138 Universe rank circle uses semantic inverse/on-inverse pair in final dark cascade', () => {
  assert.match(css,/\.universe-board li > span\s*\{[^}]*background:\s*var\(--bs-surface-inverse\);[^}]*color:\s*var\(--bs-text-on-inverse\);/s);
  assert.ok(css.lastIndexOf('.universe-board li > span') > css.lastIndexOf(') :where(h2, h3, strong, b, span)'));
});
test('139 historical-only verified Review can establish official chess state while qualifying Review count stays zero', () => {
  const historical=[{periodStart:'2026-08-01',periodEnd:'2026-08-07',periodLabel:'1–7 Aug 2026',source:'historical'}];
  assert.equal(periods.latestOfficialChessStatePeriod(historical).periodStart,'2026-08-01');
  assert.equal(historical.filter(item=>item.source!=='historical').length,0);
  assert.match(founderServer,/const nonHistorical = periods\.filter\(\(period\) => period\.source !== "historical"\)/);
  assert.match(founderServer,/const officialChessState = latestOfficialChessStatePeriod\(periods\)/);
});
test('140 newer NO ACTIVITY advances latest report without replacing official chess state and qualifying count remains unchanged', () => {
  const reviews=[
    {periodStart:'2026-08-01',periodEnd:'2026-08-07',periodLabel:'1–7 Aug 2026',source:'historical'},
    {periodStart:'2026-07-25',periodEnd:'2026-07-31',periodLabel:'25–31 Jul 2026',source:'live'},
  ];
  const official=periods.latestOfficialChessStatePeriod(reviews);
  const reportTruth=[
    {periodStart:'2026-08-01',periodEnd:'2026-08-07',periodLabel:'1–7 Aug 2026',outcome:'review'},
    {periodStart:'2026-08-08',periodEnd:'2026-08-14',periodLabel:'8–14 Aug 2026',outcome:'no_activity'},
  ];
  assert.equal(reportTruth.at(-1).periodStart,'2026-08-08');
  assert.equal(official.periodStart,'2026-08-01');
  assert.equal(reviews.filter(item=>item.source!=='historical').length,1);
  assert.match(founderServer,/latestReportPeriod:\s*reportTruth\.periods\.at\(-1\)/);
  assert.match(founderServer,/officialChessStatePeriod:\s*officialChessState\s*\?/);
  assert.doesNotMatch(founderServer,/officialChessStatePeriod:\s*snapshot\.latestReview/);
});
