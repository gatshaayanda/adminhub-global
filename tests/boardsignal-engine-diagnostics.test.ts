import assert from "node:assert/strict";
import test from "node:test";
import { reportEngineDiagnostic } from "../src/lib/boardsignal/client/engineDiagnosticReporter";
import {
  sanitizeEngineDiagnosticTelemetry,
  toEngineDiagnosticTelemetry,
  type EngineDiagnosticTelemetry,
} from "../src/lib/boardsignal/engineDiagnostics";
import type { EngineDiagnostic } from "../src/lib/boardsignal/types";

const diagnostic: EngineDiagnostic = {
  code: "ENGINE_POSITION_TIMEOUT",
  stage: "position",
  consumerMessage: "Position analysis timed out.",
  detail: "Private implementation detail that must not leave the browser.",
  assetUrl: "/stockfish/private-example",
  eventMessage: "worker detail",
  filename: "worker.js",
  lineno: 42,
  workerSupported: true,
  webAssemblySupported: true,
  crossOriginIsolated: false,
  userAgentCategory: "android",
  attempt: 2,
  timestamp: "2026-08-29T11:22:00.000Z",
};

const expected: EngineDiagnosticTelemetry = {
  code: "ENGINE_POSITION_TIMEOUT",
  stage: "position",
  userAgentCategory: "android",
  attempt: 2,
  workerSupported: true,
  webAssemblySupported: true,
  crossOriginIsolated: false,
  timestamp: "2026-08-29T11:22:00.000Z",
};

test("engine telemetry serializer returns only the privacy-safe allowlist", () => {
  const contaminated = {
    ...diagnostic,
    pgn: "1. e4 e5",
    fen: "private-fen",
    engineLine: "private-pv",
    privateReview: "private review text",
    red: "private red guidance",
    blue: "private blue guidance",
    journalContent: "private journal",
    gameUrl: "https://www.chess.com/game/live/1",
    contactInformation: "private@example.com",
  } as EngineDiagnostic;
  const payload = toEngineDiagnosticTelemetry(contaminated);
  assert.deepEqual(payload, expected);
  assert.deepEqual(Object.keys(payload).sort(), Object.keys(expected).sort());
});

test("server sanitizer drops chess evidence and private content even when submitted", () => {
  const payload = sanitizeEngineDiagnosticTelemetry({
    ...expected,
    pgn: "1. e4 e5",
    fen: "private-fen",
    pv: ["e2e4"],
    privateReview: "private review text",
    journalContent: "private journal",
    gameUrl: "https://www.chess.com/game/live/1",
    contactInformation: "private@example.com",
  });
  assert.deepEqual(payload, expected);
});

test("server sanitizer rejects malformed diagnostics", () => {
  assert.equal(sanitizeEngineDiagnosticTelemetry({ ...expected, code: "ENGINE_REVIEW_INCOMPLETE" }), null);
  assert.equal(sanitizeEngineDiagnosticTelemetry({ ...expected, attempt: 0 }), null);
  assert.equal(sanitizeEngineDiagnosticTelemetry({ ...expected, timestamp: "not-a-date" }), null);
});

test("client reporter sends exactly the sanitized diagnostic envelope", async () => {
  let sentUrl = "";
  let sentBody = "";
  await reportEngineDiagnostic(diagnostic, async (url, init) => {
    sentUrl = url;
    sentBody = String(init.body ?? "");
    return { ok: true };
  });
  assert.equal(sentUrl, "/api/boardsignal/engine-diagnostic");
  assert.deepEqual(JSON.parse(sentBody), expected);
});

test("diagnostic reporting failure cannot block Review completion", async () => {
  await assert.doesNotReject(() => reportEngineDiagnostic(diagnostic, async () => {
    throw new Error("telemetry unavailable");
  }));
});
