import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cssPath = path.join(root, 'src/app/globals.css');
const css = fs.readFileSync(cssPath, 'utf8');
const failures = [];

function luminance(hex) {
  const rgb = [1,3,5].map((i) => parseInt(hex.slice(i,i+2),16)/255).map((c) => c <= .03928 ? c/12.92 : ((c+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
function contrast(a,b) {
  const [hi,lo] = [luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (hi+.05)/(lo+.05);
}
const pairs = [
  ['text-primary/paper','#101923','#fffdf8',4.5],
  ['text-secondary/paper','#263342','#fffdf8',4.5],
  ['text-muted/paper','#68717a','#fffdf8',4.5],
  ['text-link/paper','#1733b8','#fffdf8',4.5],
  ['accent-readable/paper','#5e7f10','#fffdf8',4.5],
  ['text-on-dark/dark','#fffdf8','#101923',4.5],
  ['lime-accent/dark','#c9f65d','#101923',4.5],
  ['text-primary/lime','#101923','#c9f65d',4.5],
];
for (const [name,fg,bg,min] of pairs) {
  const ratio = contrast(fg,bg);
  if (ratio < min) failures.push(`${name} ${ratio.toFixed(2)}:1 < ${min}:1`);
}
if (!css.includes('--bs-surface-paper:') || !css.includes('--bs-accent-readable:') || !css.includes('.bs-surface-dark')) failures.push('semantic BoardSignal surface/text tokens are incomplete');
if (!css.includes('.player-universe-panel .universe-learning-grid > article') || !css.includes('color: var(--bs-text-primary)')) failures.push('Player Room Top Performances lacks explicit light-surface readable copy');

// Catch known unsafe same-rule foreground/background combinations.
const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
for (const match of css.matchAll(rulePattern)) {
  const selector = match[1].trim();
  const body = match[2];
  const lightBackground = /background(?:-color)?:\s*(?:var\(--(?:white|surface|paper|signal-paper|bs-surface-paper|bs-surface-soft|bs-surface-light)\)|#(?:fff(?:fff)?|fffdf8|f4f0e7|f7f8fb|edf1f6))/i.test(body);
  const unsafeForeground = /color:\s*(?:white|#fff(?:fff)?|var\(--signal-lime\)|var\(--bs-accent\))/i.test(body);
  if (lightBackground && unsafeForeground && !/bs-surface-accent/.test(selector)) failures.push(`unsafe light-surface foreground in ${selector}`);
}

// Catch future component-level semantic contradictions.
const sourceRoot = path.join(root, 'src');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
for (const file of walk(sourceRoot).filter((file) => /\.(tsx|ts)$/.test(file))) {
  const source = fs.readFileSync(file,'utf8');
  if (/className=["'`][^"'`]*(?:bs-surface-paper|bs-surface-soft|bs-surface-light)[^"'`]*(?:text-white|text-lime|bs-accent-on-dark)/.test(source)) failures.push(`forbidden light-surface class combination in ${path.relative(root,file)}`);
}

if (failures.length) {
  console.error('BoardSignal contrast invariant FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('BoardSignal contrast invariant PASS');
pairs.forEach(([name,fg,bg]) => console.log(`${name}: ${contrast(fg,bg).toFixed(2)}:1`));
