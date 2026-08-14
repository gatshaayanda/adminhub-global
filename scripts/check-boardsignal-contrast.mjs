import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const globalsPath = path.join(root, 'src/app/globals.css');
const hardeningPath = path.join(root, 'src/app/boardsignal-accessibility.css');
const globals = fs.readFileSync(globalsPath, 'utf8');
const hardening = fs.readFileSync(hardeningPath, 'utf8');
const css = `${globals}\n${hardening}`;
const failures = [];

function luminance(hex) {
  const value = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
    .map((c) => c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + .05) / (lo + .05);
}
function literalTokens(block) {
  const values = new Map();
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) values.set(match[1], match[2]);
  return values;
}
function mergeTokens(target, source) {
  for (const [name, value] of source) target.set(name, value);
}
function blocksFor(selector, source) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...source.matchAll(new RegExp(`${escaped}\\s*\\{([^{}]*)\\}`, 'g'))].map((match) => match[1]);
}

const light = new Map();
for (const source of [globals, hardening]) {
  for (const block of blocksFor(':root', source)) mergeTokens(light, literalTokens(block));
}
const dark = new Map(light);
for (const source of [globals, hardening]) {
  for (const block of blocksFor('html[data-bs-theme="dark"]', source)) mergeTokens(dark, literalTokens(block));
}

function token(theme, name) {
  const value = theme.get(name);
  if (!value) failures.push(`missing literal semantic token ${name}`);
  return value ?? '#000000';
}
function checkPair(themeName, theme, pairName, foreground, background, minimum) {
  const fg = token(theme, foreground);
  const bg = token(theme, background);
  const ratio = contrast(fg, bg);
  if (ratio < minimum) failures.push(`${themeName}:${pairName} ${ratio.toFixed(3)}:1 < ${minimum}:1`);
  return `${themeName}:${pairName} ${ratio.toFixed(2)}:1`;
}

const reports = [];
const textPairs = [
  ['primary/bg', '--bs-text', '--bs-bg', 4.5],
  ['primary/surface', '--bs-text', '--bs-surface', 4.5],
  ['secondary/bg', '--bs-text-secondary', '--bs-bg', 4.5],
  ['secondary/surface', '--bs-text-secondary', '--bs-surface', 4.5],
  ['muted/bg', '--bs-text-muted', '--bs-bg', 4.5],
  ['muted/surface', '--bs-text-muted', '--bs-surface', 4.5],
  ['link/surface', '--bs-blue-readable', '--bs-surface', 4.5],
  ['positive/surface', '--bs-positive-text', '--bs-surface', 4.5],
  ['warning/surface', '--bs-warning-text', '--bs-surface', 4.5],
  ['danger/surface', '--bs-danger-text', '--bs-surface', 4.5],
  ['positive/status', '--bs-positive-text', '--bs-positive-surface', 4.5],
  ['warning/status', '--bs-warning-text', '--bs-warning-surface', 4.5],
  ['danger/status', '--bs-danger-text', '--bs-danger-surface', 4.5],
  ['selection', '--bs-selection-text', '--bs-selection-bg', 4.5],
];
for (const [themeName, theme] of [['light', light], ['dark', dark]]) {
  for (const [name, fg, bg, min] of textPairs) reports.push(checkPair(themeName, theme, name, fg, bg, min));
  reports.push(checkPair(themeName, theme, 'ui-border/surface', '--bs-ui-border', '--bs-surface', 3));
  reports.push(checkPair(themeName, theme, 'ui-border/bg', '--bs-ui-border', '--bs-bg', 3));
  reports.push(checkPair(themeName, theme, 'focus/surface', '--bs-focus-ring', '--bs-surface', 3));
  reports.push(checkPair(themeName, theme, 'focus/bg', '--bs-focus-ring', '--bs-bg', 3));
}
reports.push(checkPair('shared', light, 'text-on-dark/dark', '--bs-text-on-dark', '--bs-surface-dark', 4.5));
reports.push(checkPair('shared', light, 'secondary-on-dark/dark', '--bs-text-on-dark-secondary', '--bs-surface-dark', 4.5));
reports.push(checkPair('shared', light, 'muted-on-dark/dark', '--bs-text-on-dark-muted', '--bs-surface-dark', 4.5));
reports.push(checkPair('shared', light, 'text-on-lime/lime', '--bs-on-lime', '--bs-lime', 4.5));

const c1Required = [
  '--bs-ui-border:', '--bs-positive-text:', '--bs-warning-text:', '--bs-danger-text:',
  '--bs-text-on-dark-secondary:', '--bs-disabled-text:', '--bs-selection-bg:',
  '@media (prefers-contrast: more)', '@media (forced-colors: active)',
  'scroll-padding-bottom:', 'scroll-margin-bottom:', '::selection', ':focus-visible',
];
for (const invariant of c1Required) if (!hardening.includes(invariant)) failures.push(`C.1 invariant missing: ${invariant}`);
if (/forced-color-adjust\s*:\s*none/i.test(css)) failures.push('forced-colors is globally or locally disabled');
if (/(?:^|[}\s])(?:\*|html|body)\s*\{[^}]*user-select\s*:\s*none/ims.test(css)) failures.push('global user-select:none is forbidden');
if (/!important/.test(hardening)) failures.push('C.1 semantic hardening must not rely on !important overrides');

// Scan only Patch C onward plus C.1 to avoid flagging historical legacy CSS that Patch C deliberately supersedes.
const patchCStart = globals.indexOf('Patch C — BoardSignal visual system + dark mode');
const boardSignalCss = `${patchCStart >= 0 ? globals.slice(patchCStart) : globals}\n${hardening}`;
const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
const knownDark = /bs-surface-dark|first-value-preview|pipeline-preview|universal-cover-copy|engine-section|feed-hero|beta-preview-sticky-access|return-loop-next|site-footer|ask-bs-header|ask-bs-launcher/;
for (const match of boardSignalCss.matchAll(rulePattern)) {
  const selector = match[1].trim();
  const body = match[2];
  const lightSurface = /background(?:-color)?\s*:\s*(?:var\(--(?:bs-surface|bs-surface-raised|bs-bg|bs-bg-subtle|bs-surface-paper|bs-surface-soft|bs-surface-light)\)|#[fF][0-9a-fA-F]{5}|#fff(?:fff)?)/.test(body);
  const unsafeLightText = /color\s*:\s*(?:var\(--(?:bs-lime|bs-accent)\)|#c9f65d|white|#fff(?:fff)?)/i.test(body);
  if (lightSurface && unsafeLightText && !/bs-surface-accent|button-lime|universal-score-card/.test(selector)) failures.push(`unsafe light-surface foreground in ${selector}`);
  const darkSurface = /background(?:-color)?\s*:[^;]*(?:bs-surface-dark|#101923|#08111e|#17365f|#172e50)/i.test(body) || knownDark.test(selector);
  const unsafeDarkText = /color\s*:\s*var\(--(?:bs-text-muted|bs-text-secondary|bs-text|text-muted|ink-soft)\)/i.test(body);
  if (darkSurface && unsafeDarkText && !/html\[data-bs-theme="dark"\]/.test(selector)) failures.push(`unsafe dark-surface foreground role in ${selector}`);
}

// Catch component-level semantic contradictions without brittle whitespace hashing.
const sourceRoot = path.join(root, 'src');
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
for (const file of walk(sourceRoot).filter((file) => /\.(tsx|ts)$/.test(file))) {
  const source = fs.readFileSync(file, 'utf8');
  if (/className=["'`][^"'`]*(?:bs-surface-paper|bs-surface-soft|bs-surface-light)[^"'`]*(?:text-white|text-lime|bs-accent-on-dark)/.test(source)) failures.push(`forbidden light-surface class combination in ${path.relative(root, file)}`);
}

if (failures.length) {
  console.error('BoardSignal complete contrast/state invariant FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('BoardSignal complete contrast/state invariant PASS');
reports.forEach((report) => console.log(report));
