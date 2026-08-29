import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appDir = path.join(root, 'src/app');
const layoutPath = path.join(appDir, 'layout.tsx');
const entryPath = path.join(appDir, 'boardsignal-system.css');
const layout = fs.readFileSync(layoutPath, 'utf8');
const failures = [];
const reports = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function cssImports(file, seen = new Set()) {
  const absolute = path.resolve(file);
  if (seen.has(absolute)) return [];
  seen.add(absolute);
  const source = fs.readFileSync(absolute, 'utf8');
  const items = [{ file: absolute, source }];
  for (const match of source.matchAll(/@import\s+["'](.+?\.css)["']\s*;/g)) {
    const imported = path.resolve(path.dirname(absolute), match[1]);
    if (!fs.existsSync(imported)) {
      failures.push(`missing imported stylesheet ${path.relative(root, imported)}`);
      continue;
    }
    items.push(...cssImports(imported, seen));
  }
  return items;
}

function luminance(hex) {
  const value = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
    .map((c) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + .05) / (lo + .05);
}

function declarations(block) {
  const values = new Map();
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)\s*;/g)) values.set(match[1], match[2].trim());
  return values;
}

function blocksFor(selector, source) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...source.matchAll(new RegExp(`${escaped}\\s*\\{([^{}]*)\\}`, 'g'))].map((match) => match[1]);
}

function merge(target, source) {
  for (const [key, value] of source) target.set(key, value);
}

function resolve(theme, token, seen = new Set()) {
  if (seen.has(token)) return undefined;
  const value = theme.get(token);
  if (!value) return undefined;
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  if (alias) return resolve(theme, alias[1], new Set([...seen, token]));
  return undefined;
}

function requirePair(themeName, theme, label, foreground, background, minimum) {
  const fg = resolve(theme, foreground);
  const bg = resolve(theme, background);
  if (!fg || !bg) {
    failures.push(`${themeName}:${label} cannot resolve ${foreground} / ${background}`);
    return;
  }
  const ratio = contrast(fg, bg);
  reports.push(`${themeName}:${label} ${ratio.toFixed(2)}:1`);
  if (ratio < minimum) failures.push(`${themeName}:${label} ${ratio.toFixed(3)}:1 < ${minimum}:1`);
}

if (!fs.existsSync(entryPath)) failures.push('BoardSignal visual-system entrypoint is missing');

const directCssImports = [...layout.matchAll(/import\s+["']\.\/(.+?\.css)["'];/g)].map((match) => match[1]);
if (directCssImports.join('|') !== 'globals.css|boardsignal-system.css') {
  failures.push(`layout must import only globals.css + boardsignal-system.css; found ${directCssImports.join(', ')}`);
}

const imported = cssImports(entryPath);
const relativeImports = imported.map(({ file }) => path.relative(root, file).replaceAll('\\', '/'));
const expectedModules = [
  'src/app/boardsignal-system.css',
  'src/app/boardsignal-foundation.css',
  'src/app/boardsignal-accessibility.css',
  'src/app/boardsignal-motion.css',
  'src/app/boardsignal-player-room-g3.css',
  'src/app/boardsignal-g4-universe.css',
  'src/app/boardsignal-g41-weekly-truth.css',
];
for (const file of expectedModules) if (!relativeImports.includes(file)) failures.push(`visual-system responsibility module missing: ${file}`);
for (const retired of ['boardsignal-h1-hotfix.css', 'boardsignal-f2-readability.css']) {
  if (relativeImports.some((file) => file.endsWith(retired))) failures.push(`retired stylesheet remains in active cascade: ${retired}`);
  if (layout.includes(retired)) failures.push(`retired stylesheet remains directly imported: ${retired}`);
}

const globals = read('src/app/globals.css');
const activeSources = [{ file: path.join(appDir, 'globals.css'), source: globals }, ...imported];
const activeCss = activeSources.map(({ source }) => source).join('\n');
const foundation = read('src/app/boardsignal-foundation.css');

const light = new Map();
for (const block of blocksFor(':root', `${globals}\n${foundation}\n${read('src/app/boardsignal-system.css')}`)) merge(light, declarations(block));
const dark = new Map(light);
for (const block of blocksFor('html[data-bs-theme="dark"]', `${globals}\n${foundation}\n${read('src/app/boardsignal-system.css')}`)) merge(dark, declarations(block));

const textPairs = [
  ['normal text', '--bs-text-primary', '--bs-surface', 4.5],
  ['muted text', '--bs-text-muted', '--bs-surface', 4.5],
  ['secondary text', '--bs-text-secondary', '--bs-surface', 4.5],
  ['input text', '--bs-text-primary', '--bs-surface-elevated', 4.5],
  ['placeholder', '--bs-text-muted', '--bs-surface-elevated', 4.5],
  ['selected text', '--bs-selection-text', '--bs-selection-bg', 4.5],
  ['success', '--bs-positive', '--bs-positive-surface', 4.5],
  ['warning', '--bs-warning', '--bs-warning-surface', 4.5],
  ['error', '--bs-danger', '--bs-danger-surface', 4.5],
  ['inverse normal', '--bs-text-on-inverse', '--bs-surface-inverse', 4.5],
  ['inverse muted', '--bs-text-on-inverse-muted', '--bs-surface-inverse', 4.5],
  ['disabled', '--bs-disabled-text', '--bs-disabled-surface', 4.5],
];
const nonTextPairs = [
  ['focus', '--bs-focus', '--bs-surface', 3],
  ['focus elevated', '--bs-focus', '--bs-surface-elevated', 3],
  ['input border', '--bs-ui-border', '--bs-surface-elevated', 3],
  ['border', '--bs-ui-border', '--bs-surface', 3],
  ['unread/action', '--bs-brand-primary', '--bs-surface', 3],
];
for (const [themeName, theme] of [['light', light], ['dark', dark], ['system-dark', dark]]) {
  for (const pair of textPairs) requirePair(themeName, theme, ...pair);
  for (const pair of nonTextPairs) requirePair(themeName, theme, ...pair);
}

const requiredStateEvidence = [
  ['focus-visible', /:focus-visible/],
  ['reduced motion', /@media\s*\(prefers-reduced-motion:\s*reduce\)/],
  ['forced colours', /@media\s*\(forced-colors:\s*active\)/],
  ['disabled state', /:disabled|\[disabled\]/],
  ['selected state', /is-selected|aria-selected|\.active/],
  ['unread state', /unread/i],
  ['offline state', /offline/i],
  ['saved offline state', /offline-ready|saved/i],
  ['Review forming state', /forming|current-week/i],
  ['loading state', /loading|spinner|processing/i],
  ['success state', /is-success|form-success|positive/i],
  ['warning state', /is-warning|warning/i],
  ['error state', /is-error|form-error|danger/i],
  ['badge state', /badge/i],
  ['input state', /input/],
  ['placeholder state', /::placeholder/],
];
for (const [label, pattern] of requiredStateEvidence) if (!pattern.test(activeCss)) failures.push(`active cascade missing ${label} treatment`);

if (/forced-color-adjust\s*:\s*none/i.test(activeCss)) failures.push('forced-colors compatibility is disabled in the active cascade');
if (/(?:^|[}\s])(?:\*|html|body)\s*\{[^}]*user-select\s*:\s*none/ims.test(activeCss)) failures.push('global user-select:none is forbidden');

// Surface remaining historical literal-colour debt without making literal use
// itself equivalent to a contrast failure. Contrast/state contracts above stay
// hard failures; these reports guide later consolidation inside retained modules.
for (const { file, source } of activeSources) {
  if (file.endsWith('globals.css')) continue;
  const withoutTokenBlocks = source.replace(/:root\s*\{[\s\S]*?\}/g, '').replace(/html\[data-bs-theme="dark"\]\s*\{[\s\S]*?\}/g, '');
  const literals = [...withoutTokenBlocks.matchAll(/color\s*:\s*(#[0-9a-f]{3,8}|rgb\([^;]+\)|rgba\([^;]+\))/gi)];
  if (literals.length) reports.push(`${path.relative(root, file)}: ${literals.length} hard-coded component foreground declaration(s) remain for consolidation`);
}

// Ensure actionable badges remain tied to real unread/request semantics rather
// than neutral population/discovery totals.
const room = read('src/components/BoardSignalPlayerRoom.tsx');
const navStart = room.indexOf('function RoomNav');
const navEnd = room.indexOf('function FirstRoomDiscovery');
const nav = room.slice(navStart, navEnd > navStart ? navEnd : undefined);
if (!/unreadCount > 0/.test(nav) || !/friendRequestCount > 0/.test(nav)) failures.push('Room navigation lost real actionable badge conditions');
if (/suggestedPlayerCount|officialPlayerCount|reviewsProduced|playersServed/.test(nav)) failures.push('neutral counts are being used as navigation alert badges');

if (failures.length) {
  console.error('BoardSignal active-cascade validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`BoardSignal active cascade validated across ${relativeImports.length + 1} CSS files.`);
for (const report of reports) console.log(`- ${report}`);
