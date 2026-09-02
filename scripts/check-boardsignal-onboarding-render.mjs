import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const baseUrl = process.env.BOARDSIGNAL_QA_BASE_URL || "http://127.0.0.1:3100";
const artifactDir = resolve(process.env.BOARDSIGNAL_QA_ARTIFACT_DIR || "artifacts/patch-l-onboarding-qa");
const chromeStartupTimeoutMs = 15000;
const chromeLaunchOutputLimit = 16 * 1024;
const chromeProbeTimeoutMs = 750;
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

function chromeVersion(chromePath) {
  const result = spawnSync(chromePath, ["--version"], { encoding: "utf8" });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  return output || `version command exited ${result.status ?? "unknown"}`;
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function allocateLoopbackPort() {
  const allocator = createServer();
  allocator.unref();
  return new Promise((resolvePort, rejectPort) => {
    allocator.once("error", rejectPort);
    allocator.listen({ host: "127.0.0.1", port: 0, exclusive: true }, () => {
      const address = allocator.address();
      if (!address || typeof address === "string") {
        allocator.close();
        rejectPort(new Error("Could not allocate a numeric loopback Chrome debugging port."));
        return;
      }
      const port = address.port;
      allocator.close((error) => {
        if (error) rejectPort(error);
        else resolvePort(port);
      });
    });
  });
}

const chrome = findChrome();
const chromeVersionLabel = chromeVersion(chrome);
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

function captureChromeLaunchOutput(chromeProcess) {
  let output = "";
  const capture = (stream, label) => {
    if (!stream) return;
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      output = `${output}${label}${chunk}`.slice(-chromeLaunchOutputLimit);
    });
  };
  capture(chromeProcess.stdout, "[stdout] ");
  capture(chromeProcess.stderr, "[stderr] ");
  return () => output.trim() || "(no Chrome launch output captured)";
}

function probeDevToolsVersion(debugPort) {
  return new Promise((resolveProbe) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolveProbe(value);
    };
    const req = request({
      host: "127.0.0.1",
      port: debugPort,
      path: "/json/version",
      method: "GET",
      timeout: chromeProbeTimeoutMs,
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode !== 200) {
          finish({ ok: false, detail: `HTTP ${response.statusCode ?? "unknown"}` });
          return;
        }
        try {
          const payload = JSON.parse(body);
          const webSocketDebuggerUrl = payload?.webSocketDebuggerUrl;
          if (typeof webSocketDebuggerUrl === "string" && webSocketDebuggerUrl.startsWith("ws://")) {
            finish({ ok: true, webSocketDebuggerUrl });
            return;
          }
          finish({ ok: false, detail: "HTTP 200 returned no valid webSocketDebuggerUrl" });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          finish({ ok: false, detail: `HTTP 200 returned invalid JSON (${message})` });
        }
      });
    });
    req.on("timeout", () => {
      const timeoutError = new Error("request timed out");
      timeoutError.code = "ETIMEDOUT";
      req.destroy(timeoutError);
    });
    req.on("error", (error) => {
      const code = typeof error?.code === "string" ? error.code : error?.name || "ERROR";
      finish({ ok: false, detail: `${code}: ${error?.message || String(error)}` });
    });
    req.end();
  });
}

function chromeStartupError(message, debugPort, startedAt, chromeProcess, launchOutput, lastProbe) {
  const durationMs = Date.now() - startedAt;
  const exit = chromeProcess.exitCode !== null
    ? `exit code ${chromeProcess.exitCode}`
    : chromeProcess.signalCode
      ? `signal ${chromeProcess.signalCode}`
      : "still running";
  return new Error([
    message,
    `Chrome executable: ${chrome}`,
    `Chrome version: ${chromeVersionLabel}`,
    `Debugging port: ${debugPort}`,
    `Startup duration: ${durationMs}ms`,
    `Chrome process: ${exit}`,
    `Last /json/version probe: ${lastProbe || "not attempted"}`,
    "Chrome launch output:",
    launchOutput(),
  ].join("\n"));
}

async function waitForDevTools(debugPort, chromeProcess, launchOutput, startedAt) {
  const deadline = startedAt + chromeStartupTimeoutMs;
  let lastProbe = "not attempted";
  while (Date.now() < deadline) {
    if (chromeProcess.exitCode !== null || chromeProcess.signalCode) {
      throw chromeStartupError("Chrome exited before DevTools became available.", debugPort, startedAt, chromeProcess, launchOutput, lastProbe);
    }
    const probe = await probeDevToolsVersion(debugPort);
    if (probe.ok) return probe.webSocketDebuggerUrl;
    lastProbe = probe.detail;
    await sleep(50);
  }
  throw chromeStartupError(`Chrome DevTools endpoint did not become available within ${chromeStartupTimeoutMs}ms.`, debugPort, startedAt, chromeProcess, launchOutput, lastProbe);
}

async function openCdp(webSocketUrl) {
  if (typeof WebSocket !== "function") {
    throw new Error("Node WebSocket support is unavailable. Run this script with --experimental-websocket on Node 20.");
  }

  const socket = new WebSocket(webSocketUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    const timer = setTimeout(() => rejectOpen(new Error("Timed out connecting to Chrome DevTools.")), 10000);
    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolveOpen();
    }, { once: true });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      rejectOpen(new Error("Could not connect to Chrome DevTools."));
    }, { once: true });
  });

  let nextId = 0;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(`${message.error.code}: ${message.error.message}`));
    else request.resolve(message.result ?? {});
  });

  socket.addEventListener("close", () => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error("Chrome DevTools connection closed unexpectedly."));
    }
    pending.clear();
  });

  function command(method, params = {}, sessionId) {
    return new Promise((resolveCommand, rejectCommand) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        pending.delete(id);
        rejectCommand(new Error(`Chrome DevTools command timed out: ${method}`));
      }, 15000);
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

async function inspectCase(cdp, testCase) {
  const { state, theme, width, height } = testCase;
  const slug = `${state}-${theme}-${width}x${height}`;
  const screenshot = join(artifactDir, `${slug}.png`);
  const url = `${baseUrl}/boardsignal/qa/onboarding?state=${encodeURIComponent(state)}&theme=${encodeURIComponent(theme)}`;
  const { targetId } = await cdp.command("Target.createTarget", { url: "about:blank" });

  try {
    const { sessionId } = await cdp.command("Target.attachToTarget", { targetId, flatten: true });
    await cdp.command("Page.enable", {}, sessionId);
    await cdp.command("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 500,
      screenWidth: width,
      screenHeight: height,
      positionX: 0,
      positionY: 0,
      dontSetVisibleSize: false,
    }, sessionId);
    await cdp.command("Page.navigate", { url }, sessionId);

    const deadline = Date.now() + 12000;
    let probe;
    while (Date.now() < deadline) {
      try {
        const evaluated = await cdp.command("Runtime.evaluate", {
          expression: `(() => {
            const result = document.getElementById("boardsignal-onboarding-qa-result");
            return {
              state: result?.dataset.result ?? null,
              width: window.innerWidth,
              height: window.innerHeight,
              text: result?.textContent ?? "",
            };
          })()`,
          returnByValue: true,
        }, sessionId);
        probe = evaluated?.result?.value;
        if (probe?.state === "pass" || probe?.state === "fail") break;
      } catch {
        // Navigation can replace the execution context between polls. Retry until the probe settles.
      }
      await sleep(100);
    }

    const captured = await cdp.command("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    }, sessionId);
    if (captured?.data) writeFileSync(screenshot, Buffer.from(captured.data, "base64"));

    if (!probe || (probe.state !== "pass" && probe.state !== "fail")) {
      throw new Error(`${slug}: render probe did not settle. Screenshot: ${screenshot}`);
    }
    if (probe.width !== width) {
      throw new Error(`${slug}: requested viewport ${width}, measured ${probe.width ?? "unknown"}. Screenshot: ${screenshot}`);
    }
    if (probe.state !== "pass") {
      throw new Error(`${slug}: ${probe.text || "render probe reported failure"}. Screenshot: ${screenshot}`);
    }
    if (!existsSync(screenshot)) throw new Error(`${slug}: Chrome did not create ${screenshot}`);
    return slug;
  } finally {
    await cdp.command("Target.closeTarget", { targetId }).catch(() => undefined);
  }
}

async function runCase(cdp, testCase) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await inspectCase(cdp, testCase);
    } catch (error) {
      lastError = error;
      if (attempt < 2) await sleep(200);
    }
  }
  throw lastError;
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

const profileDir = mkdtempSync(join(tmpdir(), "boardsignal-chrome-cdp-"));
const debugPort = await allocateLoopbackPort();
const chromeStartedAt = Date.now();
const chromeProcess = spawn(chrome, [
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDir}`,
  "about:blank",
], { stdio: ["ignore", "pipe", "pipe"] });
const chromeLaunchOutput = captureChromeLaunchOutput(chromeProcess);

let cdp;
try {
  const webSocketUrl = await waitForDevTools(debugPort, chromeProcess, chromeLaunchOutput, chromeStartedAt);
  cdp = await openCdp(webSocketUrl);

  console.log(`BoardSignal rendered onboarding QA using ${chrome}`);
  console.log(`Chrome version: ${chromeVersionLabel}`);
  console.log(`Chrome debugging port: ${debugPort}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Cases: ${cases.length}`);

  const failures = [];
  for (const testCase of cases) {
    try {
      const slug = await runCase(cdp, testCase);
      console.log(`PASS ${slug}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(message);
      console.error(`FAIL ${message}`);
    }
  }

  if (failures.length) {
    console.error(`\nBoardSignal rendered onboarding QA failed ${failures.length}/${cases.length} cases:`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`\nBoardSignal rendered onboarding QA passed ${cases.length}/${cases.length} cases.`);
    console.log("BOARD_SIGNAL_ONBOARDING_RENDER_PASS");
  }
} finally {
  await shutdownChrome(cdp, chromeProcess);
  cdp?.close();
  await removeProfileDir(profileDir);
}
