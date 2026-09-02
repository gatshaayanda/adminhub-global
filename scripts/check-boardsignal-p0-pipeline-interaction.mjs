import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.BOARDSIGNAL_QA_BASE_URL || "http://127.0.0.1:3100";
const widths = [390, 1365];
const displayName = "Ayanda";
const sentence = "BoardSignal Pipeline feedback stays open while I type a complete sentence.";

function findChrome() {
  for (const name of ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser"]) {
    const found = spawnSync("sh", ["-lc", `command -v ${name}`], { encoding: "utf8" });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  throw new Error("Chrome/Chromium was not found.");
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function waitForDevTools(profileDir, chromeProcess) {
  const portFile = join(profileDir, "DevToolsActivePort");
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (chromeProcess.exitCode !== null) throw new Error(`Chrome exited before DevTools became available (${chromeProcess.exitCode}).`);
    if (existsSync(portFile)) {
      const [portText, browserPath] = readFileSync(portFile, "utf8").trim().split(/\r?\n/);
      const port = Number(portText);
      if (Number.isFinite(port) && browserPath) return `ws://127.0.0.1:${port}${browserPath}`;
    }
    await sleep(50);
  }
  throw new Error("Chrome DevTools endpoint did not become available.");
}

async function openCdp(webSocketUrl) {
  if (typeof WebSocket !== "function") throw new Error("Run with --experimental-websocket on Node 20.");
  const socket = new WebSocket(webSocketUrl);
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
    const request = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(`${message.error.code}: ${message.error.message}`));
    else request.resolve(message.result ?? {});
  });

  function command(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome DevTools command timed out: ${method}`)); }, 15000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  return { command, close: () => socket.close() };
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (result?.exceptionDetails) throw new Error(result.exceptionDetails.text || "Pipeline browser evaluation failed.");
  return result?.result?.value;
}

async function waitForHydratedForm(cdp, sessionId) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const hydrated = await evaluate(cdp, sessionId, `(() => {
      const details = document.querySelector('.pipeline-comment-form');
      const displayInput = details?.querySelector('input:not(.pipeline-honeypot)');
      if (!details || !displayInput) return false;
      const reactKey = Object.keys(displayInput).find((key) => key.startsWith('__reactProps$'));
      return Boolean(reactKey && typeof displayInput[reactKey]?.onChange === 'function');
    })()`).catch(() => false);
    if (hydrated) return;
    await sleep(100);
  }
  throw new Error("Pipeline form did not reach hydrated React interaction state.");
}

async function probeForm(cdp, sessionId) {
  return evaluate(cdp, sessionId, `(() => {
    const details = document.querySelector('.pipeline-comment-form');
    const displayInput = details?.querySelector('input:not(.pipeline-honeypot)');
    const textarea = details?.querySelector('textarea');
    return {
      open: Boolean(details?.open),
      displayValue: displayInput?.value ?? '',
      commentValue: textarea?.value ?? '',
      displayFocused: document.activeElement === displayInput,
      textareaFocused: document.activeElement === textarea,
    };
  })()`);
}

async function typeAndAssert(cdp, sessionId, text, target, width) {
  let expected = "";
  for (const char of text) {
    expected += char;
    await cdp.command("Input.insertText", { text: char }, sessionId);
    await sleep(25);
    const probe = await probeForm(cdp, sessionId);
    if (!probe.open) throw new Error(`Pipeline ${width}px collapsed while typing ${target}.`);
    if (target === "display" && (probe.displayValue !== expected || !probe.displayFocused)) throw new Error(`Pipeline ${width}px lost Display name value/focus at ${expected}.`);
    if (target === "comment" && (probe.commentValue !== expected || !probe.textareaFocused)) throw new Error(`Pipeline ${width}px lost comment value/focus at ${expected}.`);
  }
}

async function runInteraction(cdp, width) {
  const { targetId } = await cdp.command("Target.createTarget", { url: "about:blank" });
  try {
    const { sessionId } = await cdp.command("Target.attachToTarget", { targetId, flatten: true });
    await cdp.command("Page.enable", {}, sessionId);
    await cdp.command("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 500,
      screenWidth: width,
      screenHeight: 900,
      positionX: 0,
      positionY: 0,
      dontSetVisibleSize: false,
    }, sessionId);
    await cdp.command("Page.navigate", { url: `${baseUrl}/pipeline` }, sessionId);
    await waitForHydratedForm(cdp, sessionId);

    const opened = await evaluate(cdp, sessionId, `(() => {
      const details = document.querySelector('.pipeline-comment-form');
      const summary = details?.querySelector('summary');
      if (!details || !summary) return false;
      summary.click();
      return details.open;
    })()`);
    if (!opened) throw new Error(`Pipeline ${width}px could not open Add a short note.`);

    await evaluate(cdp, sessionId, `document.querySelector('.pipeline-comment-form input:not(.pipeline-honeypot)')?.focus()`);
    await typeAndAssert(cdp, sessionId, displayName, "display", width);
    let probe = await probeForm(cdp, sessionId);
    if (probe.displayValue !== displayName) throw new Error(`Pipeline ${width}px did not retain Ayanda.`);

    await evaluate(cdp, sessionId, `document.querySelector('.pipeline-comment-form textarea')?.focus()`);
    await typeAndAssert(cdp, sessionId, sentence, "comment", width);
    probe = await probeForm(cdp, sessionId);
    if (!probe.open || probe.displayValue !== displayName || probe.commentValue !== sentence) throw new Error(`Pipeline ${width}px lost full form text after typing.`);

    const toggled = await evaluate(cdp, sessionId, `(() => {
      const details = document.querySelector('.pipeline-comment-form');
      const card = details?.closest('.pipeline-card');
      const otherInterest = Array.from(document.querySelectorAll('.pipeline-interest')).find((button) => !card?.contains(button));
      if (!otherInterest) return false;
      otherInterest.click();
      return true;
    })()`);
    if (!toggled) throw new Error(`Pipeline ${width}px could not find a second interest control.`);
    await sleep(100);
    probe = await probeForm(cdp, sessionId);
    if (!probe.open || probe.displayValue !== displayName || probe.commentValue !== sentence) throw new Error(`Pipeline ${width}px collapsed or lost text after sibling interest state changed.`);

    const saving = await evaluate(cdp, sessionId, `(() => {
      const details = document.querySelector('.pipeline-comment-form');
      const sendButton = details?.querySelector('button.button-dark');
      if (!sendButton || sendButton.disabled) return false;
      sendButton.click();
      return true;
    })()`);
    if (!saving) throw new Error(`Pipeline ${width}px could not enter save state.`);
    await sleep(50);
    probe = await probeForm(cdp, sessionId);
    if (!probe.open || probe.displayValue !== displayName || probe.commentValue !== sentence) throw new Error(`Pipeline ${width}px lost unsaved text during save state.`);

    console.log(`PASS pipeline-input-stability-${width}x900`);
  } finally {
    await cdp.command("Target.closeTarget", { targetId }).catch(() => undefined);
  }
}

const chrome = findChrome();
const profileDir = mkdtempSync(join(tmpdir(), "boardsignal-pipeline-cdp-"));
const chromeProcess = spawn(chrome, [
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--remote-debugging-address=127.0.0.1",
  "--remote-debugging-port=0",
  `--user-data-dir=${profileDir}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });

let cdp;
try {
  cdp = await openCdp(await waitForDevTools(profileDir, chromeProcess));
  for (const width of widths) await runInteraction(cdp, width);
  console.log("BoardSignal P0 Pipeline typing/open-state interaction checks passed.");
} finally {
  if (cdp) await cdp.command("Browser.close").catch(() => undefined);
  await sleep(250);
  if (chromeProcess.exitCode === null) chromeProcess.kill("SIGTERM");
  cdp?.close();
  rmSync(profileDir, { recursive: true, force: true, maxRetries: 4, retryDelay: 125 });
}
