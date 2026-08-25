import "server-only";

type FirestoreServiceCode = "FIRESTORE_QUOTA_EXHAUSTED" | "BOARDSIGNAL_DATA_TEMPORARILY_UNAVAILABLE";

export type FirestoreServiceClassification = {
  serviceUnavailable: true;
  status: 503;
  code: FirestoreServiceCode;
  retryAfterSeconds: number;
  kind: "quota" | "unavailable";
};

const CIRCUIT_COOLDOWN_MS = 30_000;
let circuitUntil = 0;
let circuitKind: FirestoreServiceClassification["kind"] | undefined;

function scalarCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const value = (error as { code?: unknown }).code;
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function normalizedErrorText(error: unknown) {
  if (error instanceof Error) return `${error.name} ${error.message}`.toLowerCase();
  if (typeof error === "string") return error.toLowerCase();
  try { return JSON.stringify(error).toLowerCase(); }
  catch { return ""; }
}

export function classifyFirestoreServiceError(error: unknown): FirestoreServiceClassification | undefined {
  const code = scalarCode(error);
  const text = normalizedErrorText(error);
  const codeText = String(code ?? "").toLowerCase();
  const quota = code === 8
    || codeText === "8"
    || codeText.includes("resource-exhausted")
    || codeText.includes("resource_exhausted")
    || text.includes("resource_exhausted")
    || text.includes("resource-exhausted")
    || text.includes("quota exhausted")
    || text.includes("quota exceeded")
    || text.includes("exhausted the daily quota");
  if (quota) {
    return { serviceUnavailable: true, status: 503, code: "FIRESTORE_QUOTA_EXHAUSTED", retryAfterSeconds: 60, kind: "quota" };
  }

  const unavailable = code === 14
    || codeText === "14"
    || codeText === "unavailable"
    || codeText.endsWith("/unavailable")
    || text.includes("firestore unavailable")
    || text.includes("service unavailable");
  if (unavailable) {
    return { serviceUnavailable: true, status: 503, code: "BOARDSIGNAL_DATA_TEMPORARILY_UNAVAILABLE", retryAfterSeconds: 15, kind: "unavailable" };
  }
  return undefined;
}

export function noteFirestoreServiceFailure(error: unknown, now = Date.now()) {
  const classification = classifyFirestoreServiceError(error);
  if (!classification) return classification;
  circuitUntil = Math.max(circuitUntil, now + CIRCUIT_COOLDOWN_MS);
  circuitKind = classification.kind;
  return classification;
}

export function firestoreCircuitState(now = Date.now()) {
  if (circuitUntil <= now) {
    circuitUntil = 0;
    circuitKind = undefined;
    return undefined;
  }
  return { kind: circuitKind ?? "unavailable", until: circuitUntil };
}

export function assertFirestoreReconstructionCircuitClosed(now = Date.now()) {
  const circuit = firestoreCircuitState(now);
  if (!circuit) return;
  const retryAfterSeconds = Math.max(1, Math.ceil((circuit.until - now) / 1000));
  throw Object.assign(new Error("BoardSignal live data is temporarily unavailable."), {
    status: 503,
    code: circuit.kind === "quota" ? "FIRESTORE_QUOTA_EXHAUSTED" : "BOARDSIGNAL_DATA_TEMPORARILY_UNAVAILABLE",
    retryAfterSeconds,
  });
}

export function serviceHttpError(error: unknown) {
  const existingStatus = Number((error as { status?: unknown } | undefined)?.status);
  if (Number.isInteger(existingStatus) && [400, 401, 403, 404, 409, 422, 429].includes(existingStatus)) {
    return undefined;
  }
  const classification = noteFirestoreServiceFailure(error);
  if (!classification) return undefined;
  return Object.assign(new Error("BoardSignal live data is temporarily unavailable."), classification);
}

type ReadBudgetLog = {
  operation: string;
  durationMs: number;
  materialized?: "hit" | "miss" | "rebuild";
  querySizes?: Record<string, number>;
  approximateReads?: number;
  serviceError?: FirestoreServiceClassification["kind"];
};

export function logReadBudget(entry: ReadBudgetLog) {
  // Intentionally server log only. Never write quota observability back into Firestore.
  console.info("[boardsignal-read-budget]", JSON.stringify(entry));
}

export async function observeReadBudget<T>(
  operation: string,
  work: () => Promise<T>,
  details: Omit<ReadBudgetLog, "operation" | "durationMs" | "serviceError"> = {},
): Promise<T> {
  const started = Date.now();
  try {
    const result = await work();
    logReadBudget({ operation, durationMs: Date.now() - started, ...details });
    return result;
  } catch (error) {
    const serviceError = noteFirestoreServiceFailure(error)?.kind;
    logReadBudget({ operation, durationMs: Date.now() - started, ...details, serviceError });
    throw error;
  }
}

export function assertFirestoreCircuitClosed(_operation?: string, now = Date.now()) {
  return assertFirestoreReconstructionCircuitClosed(now);
}

export function classifyBoardSignalHttpError(error: unknown) {
  const existingStatus = Number((error as { status?: unknown } | undefined)?.status);
  const existingCode = typeof (error as { code?: unknown } | undefined)?.code === "string"
    ? String((error as { code?: string }).code)
    : undefined;
  const retryAfterSeconds = Number((error as { retryAfterSeconds?: unknown } | undefined)?.retryAfterSeconds);
  if (Number.isInteger(existingStatus) && existingStatus >= 400 && existingStatus <= 599) {
    return {
      status: existingStatus,
      code: existingCode,
      retryAfterSeconds: Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : undefined,
      message: error instanceof Error ? error.message : "BoardSignal request failed.",
    };
  }
  const service = serviceHttpError(error);
  if (service) return {
    status: 503,
    code: String((service as { code?: string }).code ?? "BOARDSIGNAL_DATA_TEMPORARILY_UNAVAILABLE"),
    retryAfterSeconds: Number((service as { retryAfterSeconds?: number }).retryAfterSeconds ?? 15),
    message: service.message,
  };
  return { status: 500, code: existingCode, message: error instanceof Error ? error.message : "BoardSignal request failed." };
}

export function logFirestoreReadBudget(entry: {
  operation: string;
  durationMs: number;
  materialized?: "hit" | "miss" | "rebuild";
  resultSize?: number;
  approxDocumentReads?: number;
  querySizes?: Record<string, number>;
  failure?: FirestoreServiceClassification["kind"];
}) {
  logReadBudget({
    operation: entry.operation,
    durationMs: entry.durationMs,
    materialized: entry.materialized,
    querySizes: entry.querySizes,
    approximateReads: entry.approxDocumentReads,
    serviceError: entry.failure,
  });
}
