import type { CurrentEpisodeSummary } from "../memory";

export type CurrentCollectionFailureKind =
  | "chesscom_429"
  | "chesscom_not_found"
  | "chesscom_4xx"
  | "chesscom_5xx"
  | "timeout"
  | "network_fetch"
  | "unexpected_current_collection";

export type CurrentCollectionFailureClassification = {
  kind: CurrentCollectionFailureKind;
  status?: number;
};

type CurrentPeriodIdentity = {
  periodStart: string;
  periodEnd: string;
};

function numericStatus(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const value = Number((error as { status?: unknown }).status);
  return Number.isInteger(value) && value >= 100 && value <= 599 ? value : undefined;
}

export function samePeriodCurrentEpisodeFallback(
  stored: CurrentEpisodeSummary | undefined,
  currentPeriod: CurrentPeriodIdentity,
): CurrentEpisodeSummary | undefined {
  if (!stored || stored.status !== "forming") return undefined;
  if (stored.periodStart !== currentPeriod.periodStart || stored.periodEnd !== currentPeriod.periodEnd) return undefined;
  if (!stored.checkedAt || !Number.isFinite(stored.games) || stored.games < 0) return undefined;
  return stored;
}

export function classifyCurrentCollectionFailure(error: unknown): CurrentCollectionFailureClassification {
  const status = numericStatus(error);
  if (status === 429) return { kind: "chesscom_429", status };
  if (status === 404) return { kind: "chesscom_not_found", status };
  if (status && status >= 400 && status < 500) return { kind: "chesscom_4xx", status };
  if (status && status >= 500) return { kind: "chesscom_5xx", status };

  const name = error && typeof error === "object" && typeof (error as { name?: unknown }).name === "string"
    ? (error as { name: string }).name
    : "";
  if (name === "TimeoutError" || name === "AbortError") return { kind: "timeout" };
  if (name === "TypeError" || error instanceof TypeError) return { kind: "network_fetch" };
  return { kind: "unexpected_current_collection" };
}
