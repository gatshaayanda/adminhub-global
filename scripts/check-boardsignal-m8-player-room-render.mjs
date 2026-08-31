import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const baseUrl = process.env.BOARDSIGNAL_QA_BASE_URL || "http://127.0.0.1:3100";
const artifactDir = resolve(process.env.BOARDSIGNAL_QA_ARTIFACT_DIR || "artifacts/m8-player-room-render-qa");
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

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const chrome = findChrome();
const widths = [320, 360, 390, 1365];
const cases = [];
for (const theme of ["light", "dark"]) {
  for (const level of [1, 2, 3]) {
    for (const width of widths) cases.push({ theme, level, width, height: 900 });
  }
}

async function waitForDevTools(profileDir, chromeProcess) {
  const portFile = join(profileDir, "DevToolsActivePort");
  for (let attempt = 0; attempt < 600; attempt += 1) {
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
  if (typeof WebSocket !== "function") throw new Error("Node WebSocket support is unavailable. Run with --experimental-websocket on Node 20.");
  const socket = new WebSocket(webSocketUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    const timer = setTimeout(() => rejectOpen(new Error("Timed out connecting to Chrome DevTools.")), 10000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolveOpen(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); rejectOpen(new Error("Could not connect to Chrome DevTools.")); }, { once: true });
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
    return new Promise((resolveCommand, rejectCommand) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); rejectCommand(new Error(`Chrome DevTools command timed out: ${method}`)); }, 15000);
      pending.set(id, { resolve: resolveCommand, reject: rejectCommand, timer });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  return {
    command,
    close() {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
    },
  };
}

function waitForProcessExit(process, timeoutMs) {
  if (process.exitCode !== null) return Promise.resolve(true);
  return new Promise((resolveExit) => {
    const onExit = () => {
      clearTimeout(timer);
      resolveExit(true);
    };
    const timer = setTimeout(() => {
      process.off("exit", onExit);
      resolveExit(false);
    }, timeoutMs);
    process.once("exit", onExit);
  });
}

async function shutdownChrome(cdp, chromeProcess) {
  if (chromeProcess.exitCode === null && cdp) {
    await cdp.command("Browser.close").catch(() => undefined);
  }
  if (await waitForProcessExit(chromeProcess, 5000)) return;
  if (chromeProcess.exitCode === null) chromeProcess.kill("SIGTERM");
  if (await waitForProcessExit(chromeProcess, 5000)) return;
  if (chromeProcess.exitCode === null) chromeProcess.kill("SIGKILL");
  if (!await waitForProcessExit(chromeProcess, 5000)) throw new Error("Chrome did not exit after Browser.close, SIGTERM and SIGKILL.");
}

async function removeProfileDir(profileDir) {
  let lastError;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      rmSync(profileDir, { recursive: true, force: true, maxRetries: 4, retryDelay: 125 });
      return;
    } catch (error) {
      lastError = error;
      await sleep(250);
    }
  }
  throw lastError;
}

async function inspectCase(cdp, testCase) {
  const { theme, level, width, height } = testCase;
  const slug = `level-${level}-${theme}-${width}x${height}`;
  const screenshot = join(artifactDir, `${slug}.png`);
  const url = `${baseUrl}/boardsignal/qa/player-room-coaching?theme=${theme}&level=${level}`;
  const { targetId } = await cdp.command("Target.createTarget", { url: "about:blank" });
  try {
    const { sessionId } = await cdp.command("Target.attachToTarget", { targetId, flatten: true });
    await cdp.command("Page.enable", {}, sessionId);
    await cdp.command("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor: 1, mobile: width < 500,
      screenWidth: width, screenHeight: height, positionX: 0, positionY: 0, dontSetVisibleSize: false,
    }, sessionId);
    await cdp.command("Page.navigate", { url }, sessionId);

    const deadline = Date.now() + 15000;
    let probe;
    while (Date.now() < deadline) {
      try {
        const evaluated = await cdp.command("Runtime.evaluate", {
          expression: `(() => {
            const result = document.getElementById("boardsignal-m8-player-room-qa-result");
            return {
              state: result?.dataset.result ?? null,
              text: result?.textContent ?? "",
              width: window.innerWidth,
              level2Contrast: result?.dataset.level2Contrast ?? null,
              level3Contrast: result?.dataset.level3Contrast ?? null,
              progressiveCount: document.querySelectorAll('[aria-label="Progressive coaching explanation"]').length,
              level1Count: [...document.querySelectorAll('[aria-label="Progressive coaching explanation"] span')].filter((node) => node.textContent?.startsWith('LEVEL 1 ·')).length,
              level2Count: document.querySelectorAll('[aria-label="Coaching level 2"]').length,
              level3Count: document.querySelectorAll('[aria-label="Coaching level 3"]').length,
            };
          })()`,
          returnByValue: true,
        }, sessionId);
        probe = evaluated?.result?.value;
        if (probe?.state === "fail") break;
        if (
          probe?.state === "pass"
          && probe.progressiveCount === 1
          && probe.level1Count === 1
          && probe.level2Count === (level >= 2 ? 1 : 0)
          && probe.level3Count === (level >= 3 ? 1 : 0)
        ) break;
      } catch {
        // Navigation can replace the execution context while the QA route hydrates.
      }
      await sleep(100);
    }

    const captured = await cdp.command("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false }, sessionId);
    if (captured?.data) writeFileSync(screenshot, Buffer.from(captured.data, "base64"));

    if (!probe || probe.state === "checking" || probe.state === null) throw new Error(`${slug}: render probe did not settle. Screenshot: ${screenshot}`);
    if (probe.width !== width) throw new Error(`${slug}: requested viewport ${width}, measured ${probe.width ?? "unknown"}. Screenshot: ${screenshot}`);
    if (probe.progressiveCount !== 1) throw new Error(`${slug}: progressive coaching instances ${probe.progressiveCount}. Screenshot: ${screenshot}`);
    if (probe.level1Count !== 1) throw new Error(`${slug}: Level 1 count ${probe.level1Count}. Screenshot: ${screenshot}`);
    if (probe.level2Count !== (level >= 2 ? 1 : 0)) throw new Error(`${slug}: Level 2 count ${probe.level2Count}. Screenshot: ${screenshot}`);
    if (probe.level3Count !== (level >= 3 ? 1 : 0)) throw new Error(`${slug}: Level 3 count ${probe.level3Count}. Screenshot: ${screenshot}`);
    if (probe.state !== "pass") throw new Error(`${slug}: ${probe.text || "render probe reported failure"}. Screenshot: ${screenshot}`);
    if (level >= 2 && Number(probe.level2Contrast) < 4.5) throw new Error(`${slug}: Level 2 contrast ${probe.level2Contrast}. Screenshot: ${screenshot}`);
    if (level >= 3 && Number(probe.level3Contrast) < 4.5) throw new Error(`${slug}: Level 3 contrast ${probe.level3Contrast}. Screenshot: ${screenshot}`);
    if (!existsSync(screenshot)) throw new Error(`${slug}: Chrome did not create ${screenshot}`);
    return `${slug}${probe.level2Contrast ? ` L2=${probe.level2Contrast}` : ""}${probe.level3Contrast ? ` L3=${probe.level3Contrast}` : ""}`;
  } finally {
    await cdp.command("Target.closeTarget", { targetId }).catch(() => undefined);
  }
}

const profileDir = mkdtempSync(join(tmpdir(), "boardsignal-m8-chrome-"));
const chromeProcess = spawn(chrome, [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--hide-scrollbars",
  "--no-first-run", "--no-default-browser-check", "--disable-background-networking",
  "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0", `--user-data-dir=${profileDir}`, "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });

let cdp;
try {
  cdp = await openCdp(await waitForDevTools(profileDir, chromeProcess));
  console.log(`BoardSignal M8 Player Room rendered QA using ${chrome}`);
  console.log(`Cases: ${cases.length}`);
  const failures = [];
  for (const testCase of cases) {
    try { console.log(`PASS ${await inspectCase(cdp, testCase)}`); }
    catch (error) { const message = error instanceof Error ? error.message : String(error); failures.push(message); console.error(`FAIL ${message}`); }
  }
  if (failures.length) {
    console.error(`\nBoardSignal M8 Player Room rendered QA failed ${failures.length}/${cases.length} cases:`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`\nBoardSignal M8 Player Room rendered QA passed ${cases.length}/${cases.length} cases.`);
    console.log("BOARD_SIGNAL_M8_PLAYER_ROOM_RENDER_PASS");
  }
} finally {
  await shutdownChrome(cdp, chromeProcess);
  cdp?.close();
  await removeProfileDir(profileDir);
}
