export const FOUNDER_COMMAND_CENTER_STORAGE_KEY = "boardsignal:founder-command-center:v1";
export const FOUNDER_COMMAND_CENTER_HISTORY_LIMIT = 30;

export const FOUNDER_COUNTER_KEYS = [
  "activePlayers",
  "reviewsForming",
  "reviewsReady",
  "notSeenRecently",
  "playersServed",
  "totalReviewsProduced",
  "liveReviews",
  "r2Plus",
  "r3Plus",
  "r4",
  "newRequests",
  "followUpsDue",
  "unreadReplies",
  "exceptions",
  "identityConflicts",
] as const;

export type FounderCounterKey = (typeof FOUNDER_COUNTER_KEYS)[number];
export type FounderCounterSnapshot = Record<FounderCounterKey, number>;

export type FounderLocalSnapshot = {
  capturedAt: string;
  generatedAt: string;
  revision?: number;
  counters: FounderCounterSnapshot;
};

export type FounderAggregateForSnapshot = {
  generatedAt: string;
  revision?: number;
  attention: {
    newRequests: number;
    followUpsDue: number;
    unreadReplies: number;
    exceptions: number;
    identityConflicts: number;
  };
  metrics: {
    activePlayers: number;
    reviewsForming: number;
    reviewsReady: number;
    notSeenRecently: number;
  };
  validation: {
    playersServed: number;
    totalReviewsProduced: number;
    liveReviews: number;
    r2Plus: number;
    r3Plus: number;
    r4: number;
  };
};

export type FounderCounterDeltas = Record<FounderCounterKey, number>;

export type FounderActionKey =
  | "newRequests"
  | "followUpsDue"
  | "unreadReplies"
  | "exceptions"
  | "identityConflicts";

export type FounderActionFilter =
  | "new_requests"
  | "follow_up_due"
  | "unread_replies"
  | "exceptions"
  | "identity";

export const FOUNDER_ACTION_FILTERS: Record<FounderActionKey, FounderActionFilter> = {
  newRequests: "new_requests",
  followUpsDue: "follow_up_due",
  unreadReplies: "unread_replies",
  exceptions: "exceptions",
  identityConflicts: "identity",
};

function safeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function createFounderLocalSnapshot(
  aggregate: FounderAggregateForSnapshot,
  capturedAt = new Date().toISOString(),
): FounderLocalSnapshot {
  return {
    capturedAt,
    generatedAt: aggregate.generatedAt,
    ...(typeof aggregate.revision === "number" && Number.isFinite(aggregate.revision)
      ? { revision: aggregate.revision }
      : {}),
    counters: {
      activePlayers: safeCount(aggregate.metrics.activePlayers),
      reviewsForming: safeCount(aggregate.metrics.reviewsForming),
      reviewsReady: safeCount(aggregate.metrics.reviewsReady),
      notSeenRecently: safeCount(aggregate.metrics.notSeenRecently),
      playersServed: safeCount(aggregate.validation.playersServed),
      totalReviewsProduced: safeCount(aggregate.validation.totalReviewsProduced),
      liveReviews: safeCount(aggregate.validation.liveReviews),
      r2Plus: safeCount(aggregate.validation.r2Plus),
      r3Plus: safeCount(aggregate.validation.r3Plus),
      r4: safeCount(aggregate.validation.r4),
      newRequests: safeCount(aggregate.attention.newRequests),
      followUpsDue: safeCount(aggregate.attention.followUpsDue),
      unreadReplies: safeCount(aggregate.attention.unreadReplies),
      exceptions: safeCount(aggregate.attention.exceptions),
      identityConflicts: safeCount(aggregate.attention.identityConflicts),
    },
  };
}

export function sanitizeFounderLocalSnapshot(value: unknown): FounderLocalSnapshot | null {
  if (!isRecord(value) || !isRecord(value.counters)) return null;
  if (typeof value.capturedAt !== "string" || typeof value.generatedAt !== "string") return null;

  const counters = {} as FounderCounterSnapshot;
  for (const key of FOUNDER_COUNTER_KEYS) counters[key] = safeCount(value.counters[key]);

  return {
    capturedAt: value.capturedAt,
    generatedAt: value.generatedAt,
    ...(typeof value.revision === "number" && Number.isFinite(value.revision)
      ? { revision: value.revision }
      : {}),
    counters,
  };
}

export function parseFounderSnapshotHistory(raw: string | null): FounderLocalSnapshot[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeFounderLocalSnapshot)
      .filter((snapshot): snapshot is FounderLocalSnapshot => Boolean(snapshot))
      .slice(-FOUNDER_COMMAND_CENTER_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function appendFounderSnapshot(
  history: FounderLocalSnapshot[],
  snapshot: FounderLocalSnapshot,
): FounderLocalSnapshot[] {
  const clean = history
    .map(sanitizeFounderLocalSnapshot)
    .filter((entry): entry is FounderLocalSnapshot => Boolean(entry));
  return [...clean, snapshot].slice(-FOUNDER_COMMAND_CENTER_HISTORY_LIMIT);
}

export function calculateFounderDeltas(
  current: FounderLocalSnapshot,
  previous?: FounderLocalSnapshot,
): FounderCounterDeltas | null {
  if (!previous) return null;
  const deltas = {} as FounderCounterDeltas;
  for (const key of FOUNDER_COUNTER_KEYS) deltas[key] = current.counters[key] - previous.counters[key];
  return deltas;
}

export function founderTrendValues(
  history: FounderLocalSnapshot[],
  key: FounderCounterKey,
): number[] {
  return history.map((snapshot) => snapshot.counters[key]);
}

export function founderSystemState(snapshot: FounderLocalSnapshot): "normal" | "attention" | "critical" {
  const { counters } = snapshot;
  if (counters.exceptions > 0 || counters.identityConflicts > 0) return "critical";
  if (counters.newRequests > 0 || counters.followUpsDue > 0 || counters.unreadReplies > 0) return "attention";
  return "normal";
}

export function retentionConversion(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return Math.max(0, Math.min(100, (numerator / denominator) * 100));
}
