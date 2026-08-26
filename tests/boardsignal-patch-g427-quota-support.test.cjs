const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");
const ts=require("typescript");
const root=path.resolve(__dirname,"..");
const read=(f)=>fs.readFileSync(path.join(root,f),"utf8");
const quota=read("src/lib/boardsignal/client/firestoreQuota.ts");
const room=read("src/components/BoardSignalPlayerRoom.tsx");
const unavailable=read("src/components/LiveDataUnavailablePlayerRoom.tsx");
const worker=read("src/components/BoardSignalHistoryWorker.tsx");
const gate=read("src/lib/boardsignal/client/playerRoomRefreshGate.ts");
const service=read("src/lib/boardsignal/server/firestoreService.ts");
const universe=read("src/lib/boardsignal/server/universePulse.ts");
const founder=read("src/lib/boardsignal/server/founderMaterialized.ts");
const contract=read("BOARD_SIGNAL_PRODUCT_CONTRACT.md");

function compile(source){
 const out=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 const errors=(out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,"\\n")).join("\\n"));
 return out.outputText;
}

test("1. quota helper computes the next Pacific midnight rather than a fixed UTC hour",()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"g427-"));
 const js=path.join(tmp,"quota.js");
 fs.writeFileSync(js,compile(quota));
 const runtime=require(js);
 const reset=runtime.nextFirestoreFreeQuotaResetAt(Date.parse("2026-08-26T00:00:00Z"));
 assert.ok(Math.abs(reset-Date.parse("2026-08-26T07:00:00Z"))<120000);
});
test("2. quota block persists through reloads and uses the official quota code",()=>{
 assert.match(quota,/FIRESTORE_QUOTA_EXHAUSTED/);
 assert.match(quota,/localStorage\.setItem/);
 assert.match(quota,/nextFirestoreFreeQuotaResetAt/);
 assert.match(quota,/America\/Los_Angeles/);
});
test("3. Player Room does not issue another live load while today's quota block is active",()=>{
 assert.match(room,/if \(firestoreQuotaBlocked\(\)\)/);
 assert.match(room,/loadPlayerRoomOfflineSnapshot/);
 assert.match(room,/setLiveDataUnavailableCode\(FIRESTORE_QUOTA_EXHAUSTED_CODE\)/);
});
test("4. Player Room preserves the server reason code instead of calling quota an internet outage",()=>{
 assert.match(room,/setLiveDataUnavailableCode\(body\.code\)/);
 assert.match(room,/reasonCode=\{liveDataUnavailableCode\}/);
 assert.match(gate,/FIRESTORE_QUOTA_EXHAUSTED/);
});
test("5. quota recovery screen explains free allowance and the next reset",()=>{
 assert.match(unavailable,/DAILY LIVE-DATA LIMIT REACHED/);
 assert.match(unavailable,/free live-data allowance/);
 assert.match(unavailable,/midnight Pacific/);
 assert.match(unavailable,/check again automatically/i);
});
test("6. permanent Discord support is available in both normal Profile and quota recovery",()=>{
 assert.match(quota,/https:\/\/discord\.gg\/CrWy3qJQtg/);
 assert.match(room,/Talk to the founder/);
 assert.match(unavailable,/Talk to the founder on Discord/);
});
test("7. background historical catch-up stops during the quota window",()=>{
 assert.match(worker,/firestoreQuotaBlocked\(\)/);
 assert.match(worker,/noteFirestoreQuotaResponse/);
});
test("8. backend still classifies resource exhaustion distinctly",()=>{
 assert.match(service,/FIRESTORE_QUOTA_EXHAUSTED/);
 assert.match(service,/resource-exhausted/);
});
test("9. ordinary Universe remains one materialized state read",()=>{
 const start=universe.indexOf("export async function loadActiveUniverseState");
 const end=universe.indexOf("export async function rebuildMaterializedUniverseState",start);
 const normal=universe.slice(start,end);
 assert.match(normal,/stateRef\(\)\.get\(\)/);
 assert.doesNotMatch(normal,/collection\("users"\)|collection\("desks"\)/);
});
test("10. ordinary Founder aggregate remains one materialized read after reconciliation",()=>{
 const start=founder.indexOf("export async function loadFounderOperationsAggregate");
 const end=founder.indexOf("export async function loadFounderOperationRows",start);
 const normal=founder.slice(start,end);
 assert.match(normal,/approxDocumentReads: 1/);
});
test("11. contract forbids fake offline and retry loops during quota exhaustion",()=>{
 assert.match(contract,/not an internet-offline state/);
 assert.match(contract,/must not loop retries against an exhausted quota/);
});
