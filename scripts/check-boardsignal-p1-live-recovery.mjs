import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.BOARDSIGNAL_QA_BASE_URL || "http://127.0.0.1:3100";
const widths = [390, 1365];
const permissions = ["default", "granted", "denied"];
const states = ["saved", "empty"];
const quotaStorageKey = "boardsignal:firestore-quota-until";

function chromePath() {
  for (const name of ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser"]) {
    const found = spawnSync("sh", ["-lc", `command -v ${name}`], { encoding: "utf8" });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  throw new Error("Chrome/Chromium was not found.");
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function stopChrome(process) {
  if (process.exitCode !== null) return;
  const exited = new Promise((resolve) => process.once("exit", resolve));
  process.kill("SIGTERM");
  const graceful = await Promise.race([exited.then(() => true), sleep(5000).then(() => false)]);
  if (graceful || process.exitCode !== null) return;
  process.kill("SIGKILL");
  await exited;
}

async function waitForDevTools(profileDir, process) {
  const portFile = join(profileDir, "DevToolsActivePort");
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (process.exitCode !== null) throw new Error(`Chrome exited before DevTools became available (${process.exitCode}).`);
    if (existsSync(portFile)) {
      const [port, browserPath] = readFileSync(portFile, "utf8").trim().split(/\r?\n/);
      if (port && browserPath) return `ws://127.0.0.1:${port}${browserPath}`;
    }
    await sleep(50);
  }
  throw new Error("Chrome DevTools endpoint did not become available.");
}

async function cdpClient(url) {
  if (typeof WebSocket !== "function") throw new Error("Run with --experimental-websocket on Node 20.");
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out connecting to Chrome DevTools.")), 10000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Could not connect to Chrome DevTools.")); }, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const item = pending.get(message.id); pending.delete(message.id); clearTimeout(item.timer);
    if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result ?? {});
  });
  function command(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 15000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  return { command, close: () => socket.close() };
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "P1 browser evaluation failed.");
  return result.result?.value;
}

async function waitFor(cdp, sessionId, expression) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, sessionId, expression).catch(() => false)) return;
    await sleep(100);
  }
  throw new Error(`P1 browser condition timed out: ${expression}`);
}

async function runCase(cdp, width, state, permission) {
  const { targetId } = await cdp.command("Target.createTarget", { url: "about:blank" });
  try {
    const { sessionId } = await cdp.command("Target.attachToTarget", { targetId, flatten: true });
    await cdp.command("Page.enable", {}, sessionId);
    await cdp.command("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 }, sessionId);
    await cdp.command("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
      localStorage.setItem(${JSON.stringify(quotaStorageKey)}, String(Date.now() + 60 * 60 * 1000));
      globalThis.__bsPromptCount = 0;
      globalThis.__bsPromptResult = ${JSON.stringify(permission === "default" ? "denied" : permission)};
      class BoardSignalQaNotification {}
      Object.defineProperty(BoardSignalQaNotification, 'permission', { configurable: true, get: () => ${JSON.stringify(permission)} });
      BoardSignalQaNotification.requestPermission = async () => { globalThis.__bsPromptCount += 1; return globalThis.__bsPromptResult; };
      Object.defineProperty(globalThis, 'Notification', { configurable: true, value: BoardSignalQaNotification });
    })();` }, sessionId);
    await cdp.command("Page.navigate", { url: `${baseUrl}/boardsignal/qa/live-recovery?state=${state}` }, sessionId);
    await waitFor(cdp, sessionId, `document.body?.innerText.includes("LIVE CHECKS PAUSED") || document.body?.innerText.includes("LIVE CHECKS PAUSED · SAVED WORK SAFE")`);

    const initial = await evaluate(cdp, sessionId, `(() => ({
      text: document.body.innerText,
      hasCta: Boolean(document.querySelector('.live-recovery-reminder button')),
      promptCount: globalThis.__bsPromptCount,
      swSupported: 'serviceWorker' in navigator,
      quotaUntil: Number(localStorage.getItem(${JSON.stringify(quotaStorageKey)})),
    }))()`);
    if (!Number.isFinite(initial.quotaUntil) || initial.quotaUntil <= Date.now()) throw new Error(`${width}/${state}/${permission}: real quota storage key was not active.`);
    if (!initial.text.includes("Live checks reopen around")) throw new Error(`${width}/${state}/${permission}: reset copy missing.`);
    if (state === "saved" && !initial.text.includes("CapacityTester")) throw new Error(`${width}/${state}/${permission}: saved Player Room missing.`);
    if (state === "empty" && !initial.text.includes("No saved My BoardSignal copy is available on this device yet")) throw new Error(`${width}/${state}/${permission}: empty saved-state truth missing.`);
    if (!initial.swSupported) throw new Error(`${width}/${state}/${permission}: service worker API unavailable.`);
    if (initial.promptCount !== 0) throw new Error(`${width}/${state}/${permission}: notification permission prompted before click.`);

    if (permission === "denied") {
      if (initial.hasCta) throw new Error(`${width}/${state}/denied: broken CTA remained visible.`);
      if (!initial.text.includes("BoardSignal respects that choice and will not ask again")) throw new Error(`${width}/${state}/denied: denial copy missing.`);
    } else {
      if (!initial.hasCta) throw new Error(`${width}/${state}/${permission}: recovery CTA missing.`);
      await waitFor(cdp, sessionId, `(() => {
        const button = document.querySelector('.live-recovery-reminder button');
        if (!button) return false;
        const reactKey = Object.keys(button).find((key) => key.startsWith('__reactProps$'));
        return Boolean(reactKey && typeof button[reactKey]?.onClick === 'function');
      })()`);
      await evaluate(cdp, sessionId, `document.querySelector('.live-recovery-reminder button')?.click()`);
      await sleep(150);
      const after = await evaluate(cdp, sessionId, `({ text: document.body.innerText, promptCount: globalThis.__bsPromptCount })`);
      if (permission === "default" && after.promptCount !== 1) throw new Error(`${width}/${state}/default: explicit click did not request permission exactly once.`);
      if (permission === "granted" && after.promptCount !== 0) throw new Error(`${width}/${state}/granted: already-granted permission was re-prompted.`);
    }

    const swSource = await evaluate(cdp, sessionId, `fetch('/sw.js').then((response) => response.text())`);
    if (!swSource.includes('notificationclick') || !swSource.includes('/boardsignal/player-room')) throw new Error(`${width}/${state}/${permission}: recovery deep-link service-worker path missing.`);
    console.log(`PASS p1-live-recovery-${width}x900-${state}-${permission}`);
  } finally {
    await cdp.command("Target.closeTarget", { targetId }).catch(() => undefined);
  }
}

const profileDir = mkdtempSync(join(tmpdir(), "boardsignal-p1-chrome-"));
const chrome = spawn(chromePath(), ["--headless=new", "--no-sandbox", "--disable-gpu", `--user-data-dir=${profileDir}`, "--remote-debugging-port=0", "about:blank"], { stdio: "ignore" });
try {
  const cdp = await cdpClient(await waitForDevTools(profileDir, chrome));
  try {
    for (const width of widths) for (const state of states) for (const permission of permissions) await runCase(cdp, width, state, permission);
  } finally { cdp.close(); }
  console.log("BoardSignal P1 live-recovery real Chrome checks passed.");
} finally {
  await stopChrome(chrome);
  rmSync(profileDir, { recursive: true, force: true });
}
