import { spawnSync } from 'node:child_process';

const baseUrl = process.env.BOARDSIGNAL_QA_BASE_URL || 'http://127.0.0.1:3100';
const requiredCopy = [
  'BoardSignal V1 is live.',
  'The desk keeps moving.',
  'Live checks, with a clearer way back',
  'Lichess joins the same BoardSignal',
  'Older weeks can become real Progress',
];
const forbiddenCopy = /Firebase|Firestore|50,000 reads|200-player|General Availability/;

function chrome() {
  for (const name of ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser']) {
    const result = spawnSync('sh', ['-lc', `command -v ${name}`], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('Chrome/Chromium was not found.');
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function textFromMarkup(markup) {
  return decodeHtml(markup
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
  return match ? decodeHtml(match[1]) : '';
}

function publicSurface(html) {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '';
  const title = textFromMarkup(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const metadata = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = attribute(tag, 'name') || attribute(tag, 'property');
    if (!['description', 'og:title', 'og:description', 'twitter:title', 'twitter:description'].includes(key.toLowerCase())) continue;
    metadata.push(attribute(tag, 'content'));
  }
  return [textFromMarkup(body), title, ...metadata].filter(Boolean).join('\n');
}

const bin = chrome();
for (const testCase of [{ width: 320 }, { width: 390 }, { width: 430 }, { width: 1365 }, { width: 390, reduced: true }]) {
  const { width, reduced = false } = testCase;
  const flags = ['--headless=new', '--no-sandbox', '--disable-gpu', `--window-size=${width},900`];
  if (reduced) flags.push('--force-prefers-reduced-motion');
  flags.push('--dump-dom', `${baseUrl}/pipeline`);
  const result = spawnSync(bin, flags, { encoding: 'utf8', timeout: 30000 });
  if (result.status !== 0) throw new Error(`Pipeline Chrome ${width}px${reduced ? ' reduced-motion' : ''} failed: ${result.stderr}`);

  const surface = publicSurface(result.stdout);
  for (const text of requiredCopy) {
    if (!surface.includes(text)) throw new Error(`Pipeline ${width}px${reduced ? ' reduced-motion' : ''} missing ${text}`);
  }
  const forbidden = surface.match(forbiddenCopy);
  if (forbidden) throw new Error(`Pipeline ${width}px${reduced ? ' reduced-motion' : ''} exposed forbidden public implementation copy: ${forbidden[0]}`);
}

console.log('BoardSignal P0 Pipeline Chrome checks passed.');
