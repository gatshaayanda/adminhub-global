import { spawnSync } from 'node:child_process';
const baseUrl = process.env.BOARDSIGNAL_QA_BASE_URL || 'http://127.0.0.1:3100';
function chrome(){for(const name of ['google-chrome-stable','google-chrome','chromium','chromium-browser']){const r=spawnSync('sh',['-lc',`command -v ${name}`],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chrome/Chromium was not found.');}
const bin=chrome();
for(const testCase of [{width:320},{width:390},{width:430},{width:1365},{width:390,reduced:true}]){
  const {width,reduced=false}=testCase;
  const flags=['--headless=new','--no-sandbox','--disable-gpu',`--window-size=${width},900`];
  if(reduced) flags.push('--force-prefers-reduced-motion');
  flags.push('--dump-dom',`${baseUrl}/pipeline`);
  const result=spawnSync(bin,flags,{encoding:'utf8',timeout:30000});
  if(result.status!==0) throw new Error(`Pipeline Chrome ${width}px${reduced ? " reduced-motion" : ""} failed: ${result.stderr}`);
  const html=result.stdout;
  for(const text of ['BoardSignal V1 is live.','The desk keeps moving.','Live checks, with a clearer way back','Lichess joins the same BoardSignal','Older weeks can become real Progress']) if(!html.includes(text)) throw new Error(`Pipeline ${width}px${reduced ? " reduced-motion" : ""} missing ${text}`);
  if(/Firebase|Firestore|50,000 reads|200-player|General Availability/.test(html)) throw new Error(`Pipeline ${width}px exposed forbidden public implementation copy.`);
}
console.log('BoardSignal P0 Pipeline Chrome checks passed.');
