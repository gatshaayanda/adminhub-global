import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const baseUrl = process.env.BOARDSIGNAL_QA_BASE_URL || "http://127.0.0.1:3100";
const artifactDir = resolve(process.env.BOARDSIGNAL_QA_ARTIFACT_DIR || "artifacts/patch-l-onboarding-qa");
mkdirSync(artifactDir, { recursive: true });

function findChrome() {
  const explicit = process.env.CHROME_BIN;
  if (explicit && existsSync(explicit)) return explicit;
  for (const command of ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser"]) {
    const found = spawnSync("sh", ["-lc", `command -v ${command}`], { encoding: "utf8" });
    const path = found.status === 0 ? found.stdout.trim() : "";
    if (path) return path;
  }
  throw new Error("Chrome/Chromium was not found on the QA runner.");
}

const chrome = findChrome();

const desktopStates = ["google", "username", "profile", "collision"];
const mobileWidths = [320, 360, 375, 390, 412, 430];
const cases = [];

for (const theme of ["light", "dark"]) {
  for (const state of desktopStates) cases.push({ state, theme, width: 1365, height: 900 });
}
for (const width of mobileWidths) {
  for (const state of ["profile", "collision"]) cases.push({ state, theme: "light", width, height: 900 });
}
for (const width of [320, 390, 430]) {
  for (const state of ["google", "username", "profile", "collision"]) cases.push({ state, theme: "dark", width, height: 900 });
}
for (const state of ["google", "username"]) {
  cases.push({ state, theme: "light", width: 320, height: 900 });
  cases.push({ state, theme: "light", width: 390, height: 900 });
}

function runChrome(testCase, attempt) {
  const { state, theme, width, height } = testCase;
  const slug = `${state}-${theme}-${width}x${height}`;
  const screenshot = join(artifactDir, `${slug}.png`);
  const profileDir = mkdtempSync(join(tmpdir(), `boardsignal-chrome-${slug}-`));
  const url = `${baseUrl}/boardsignal/qa/onboarding?state=${encodeURIComponent(state)}&theme=${encodeURIComponent(theme)}`;
  const args = [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${width},${height}`,
    `--user-data-dir=${profileDir}`,
    "--virtual-time-budget=2500",
    `--screenshot=${screenshot}`,
    "--dump-dom",
    url,
  ];
  const result = spawnSync(chrome, args, { encoding: "utf8", maxBuffer: 24 * 1024 * 1024, timeout: 45000 });
  rmSync(profileDir, { recursive: true, force: true });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${slug}: Chrome exited ${result.status}. ${String(result.stderr || "").slice(-1400)}`);
  }

  const dom = result.stdout || "";
  const passed = /data-result="pass"/.test(dom) && dom.includes("BOARD_SIGNAL_ONBOARDING_RENDER_PASS");
  const widthMatch = dom.match(/data-viewport-width="(\d+)"/);
  const measuredWidth = widthMatch ? Number(widthMatch[1]) : undefined;

  if (!passed || measuredWidth !== width) {
    if (attempt < 2) return runChrome(testCase, attempt + 1);
    const failure = dom.match(/BOARD_SIGNAL_ONBOARDING_RENDER_FAIL:[^<]*/)?.[0] || "render probe did not report PASS";
    throw new Error(`${slug}: ${failure}; requested viewport ${width}, measured ${measuredWidth ?? "unknown"}. Screenshot: ${screenshot}`);
  }

  if (!existsSync(screenshot)) throw new Error(`${slug}: Chrome did not create ${screenshot}`);
  return slug;
}

console.log(`BoardSignal rendered onboarding QA using ${chrome}`);
console.log(`Base URL: ${baseUrl}`);
console.log(`Cases: ${cases.length}`);

const failures = [];
for (const testCase of cases) {
  try {
    const slug = runChrome(testCase, 1);
    console.log(`PASS ${slug}`);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
    console.error(`FAIL ${failures.at(-1)}`);
  }
}

if (failures.length) {
  console.error(`\nBoardSignal rendered onboarding QA failed ${failures.length}/${cases.length} cases:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`\nBoardSignal rendered onboarding QA passed ${cases.length}/${cases.length} cases.`);
