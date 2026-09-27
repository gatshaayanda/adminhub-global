import type { EngineDiagnostic, EngineDiagnosticCode } from "./types";

export type EngineDiagnosticTelemetry = Pick<
  EngineDiagnostic,
  | "code"
  | "stage"
  | "userAgentCategory"
  | "attempt"
  | "workerSupported"
  | "webAssemblySupported"
  | "crossOriginIsolated"
  | "timestamp"
>;

const CODES = new Set<EngineDiagnosticCode>([
  "ENGINE_UNSUPPORTED",
  "ENGINE_ASSET_404",
  "ENGINE_WORKER_START_FAILED",
  "ENGINE_WASM_LOAD_FAILED",
  "ENGINE_UCI_TIMEOUT",
  "ENGINE_POSITION_TIMEOUT",
  "ENGINE_RUNTIME_ERROR",
]);
const STAGES = new Set<EngineDiagnostic["stage"]>([
  "capability",
  "asset",
  "worker",
  "uci",
  "ready",
  "position",
  "runtime",
]);
const USER_AGENT_CATEGORIES = new Set<EngineDiagnostic["userAgentCategory"]>([
  "android",
  "ios",
  "mobile",
  "desktop",
  "unknown",
]);

export function toEngineDiagnosticTelemetry(item: EngineDiagnostic): EngineDiagnosticTelemetry {
  return {
    code: item.code,
    stage: item.stage,
    userAgentCategory: item.userAgentCategory,
    attempt: item.attempt,
    workerSupported: item.workerSupported,
    webAssemblySupported: item.webAssemblySupported,
    crossOriginIsolated: item.crossOriginIsolated,
    timestamp: item.timestamp,
  };
}

export function sanitizeEngineDiagnosticTelemetry(input: unknown): EngineDiagnosticTelemetry | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (typeof value.code !== "string" || !CODES.has(value.code as EngineDiagnosticCode)) return null;
  if (typeof value.stage !== "string" || !STAGES.has(value.stage as EngineDiagnostic["stage"])) return null;
  if (
    typeof value.userAgentCategory !== "string" ||
    !USER_AGENT_CATEGORIES.has(value.userAgentCategory as EngineDiagnostic["userAgentCategory"])
  ) return null;
  if (typeof value.attempt !== "number" || !Number.isInteger(value.attempt) || value.attempt < 1 || value.attempt > 20) return null;
  if (typeof value.workerSupported !== "boolean") return null;
  if (typeof value.webAssemblySupported !== "boolean") return null;
  if (typeof value.crossOriginIsolated !== "boolean") return null;
  if (
    typeof value.timestamp !== "string" ||
    value.timestamp.length > 64 ||
    Number.isNaN(Date.parse(value.timestamp))
  ) return null;

  return {
    code: value.code as EngineDiagnosticCode,
    stage: value.stage as EngineDiagnostic["stage"],
    userAgentCategory: value.userAgentCategory as EngineDiagnostic["userAgentCategory"],
    attempt: value.attempt,
    workerSupported: value.workerSupported,
    webAssemblySupported: value.webAssemblySupported,
    crossOriginIsolated: value.crossOriginIsolated,
    timestamp: value.timestamp,
  };
}
