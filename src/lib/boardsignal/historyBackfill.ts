const DAY_MS = 86_400_000;

export const REVIEW_HISTORY_BACKFILL_VERSION = 1 as const;
export const REVIEW_HISTORY_BACKFILL_LIMIT = 4 as const;
export const REVIEW_HISTORY_LEASE_MS = 20 * 60 * 1000;

export type ReviewLifecycle = "organic_live" | "historical_backfill" | "original_beta";

export type HistoricalReviewPeriod = { start: string; end: string };
export type HistoricalReviewEvaluation = {
  status: "existing" | "published" | "no_activity";
  evaluatedAt: string;
};
export type HistoricalBackfillLease = {
  periodStart: string;
  leaseId: string;
  claimedAt: string;
  leaseUntil: string;
};
export type ReviewHistoryBackfillState = {
  version: typeof REVIEW_HISTORY_BACKFILL_VERSION;
  status: "pending" | "retryable" | "complete";
  targetPeriods: HistoricalReviewPeriod[];
  evaluated?: Record<string, HistoricalReviewEvaluation>;
  lease?: HistoricalBackfillLease;
  activationBaseline?: boolean;
  establishedAt: string;
  completedAt?: string;
  lastAttemptAt?: string;
  lastError?: string;
};
export type HistoricalBackfillWork = {
  periodStart: string;
  periodEnd: string;
  requestCadenceAnchor: string;
  leaseId: string;
  completedSlots: number;
  totalSlots: number;
};

function parseIsoDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid BoardSignal Review date.");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== value) throw new Error("Invalid BoardSignal Review date.");
  return date;
}
function isoDay(date: Date) { return date.toISOString().slice(0, 10); }

export function addReviewDays(value: string, days: number) {
  return isoDay(new Date(parseIsoDay(value).getTime() + days * DAY_MS));
}
export function reviewPeriodFromStart(start: string): HistoricalReviewPeriod {
  return { start, end: addReviewDays(start, 6) };
}
export function fourPeriodWindow(latestStart: string, count = REVIEW_HISTORY_BACKFILL_LIMIT) {
  const bounded = Math.max(0, Math.min(REVIEW_HISTORY_BACKFILL_LIMIT, count));
  return Array.from({ length: bounded }, (_, index) => reviewPeriodFromStart(addReviewDays(latestStart, -7 * index)));
}
export function latestActivityPeriodStart(gameEndedAtSeconds: number) {
  const gameDay = isoDay(new Date(gameEndedAtSeconds * 1000));
  return addReviewDays(gameDay, -6);
}
export function historicalRequestAnchor(cadenceAnchor: string, periodStart: string) {
  parseIsoDay(cadenceAnchor);
  parseIsoDay(periodStart);
  return `${cadenceAnchor}~history~${periodStart}`;
}
export function parseHistoricalRequestAnchor(value?: string) {
  if (!value) return { cadenceAnchor: undefined, periodStart: undefined, historical: false };
  const parts = value.split("~history~");
  if (parts.length !== 2) return { cadenceAnchor: value, periodStart: undefined, historical: false };
  parseIsoDay(parts[0]);
  parseIsoDay(parts[1]);
  return { cadenceAnchor: parts[0], periodStart: parts[1], historical: true };
}
export function storedReviewLifecycle(data: { reviewLifecycle?: ReviewLifecycle; originalBeta?: unknown; desk?: { source?: string; provenance?: { verified?: boolean } } }) : ReviewLifecycle | undefined {
  if (data.originalBeta) return "original_beta";
  if (data.reviewLifecycle === "historical_backfill") return "historical_backfill";
  if (data.reviewLifecycle === "organic_live") return "organic_live";
  if (data.desk?.source === "live" && data.desk?.provenance?.verified === true) return "organic_live";
  return undefined;
}
export function reviewCountsTowardRetention(data: { reviewLifecycle?: ReviewLifecycle; countsTowardRetention?: boolean; originalBeta?: unknown; desk?: { source?: string; provenance?: { verified?: boolean } } }) {
  const lifecycle = storedReviewLifecycle(data);
  if (lifecycle === "historical_backfill") return false;
  if (typeof data.countsTowardRetention === "boolean") return data.countsTowardRetention;
  return lifecycle === "organic_live" || lifecycle === "original_beta";
}
export function nextBackfillPeriod(targetPeriods: HistoricalReviewPeriod[], evaluated: Record<string, HistoricalReviewEvaluation> = {}, existingStarts: Iterable<string> = []) {
  const existing = new Set(existingStarts);
  return targetPeriods.find((period) => !existing.has(period.start) && !evaluated[period.start]);
}
export function evaluatedBackfillSlots(targetPeriods: HistoricalReviewPeriod[], evaluated: Record<string, HistoricalReviewEvaluation> = {}, existingStarts: Iterable<string> = []) {
  const existing = new Set(existingStarts);
  return targetPeriods.filter((period) => existing.has(period.start) || Boolean(evaluated[period.start])).length;
}
export function backfillComplete(targetPeriods: HistoricalReviewPeriod[], evaluated: Record<string, HistoricalReviewEvaluation> = {}, existingStarts: Iterable<string> = []) {
  return targetPeriods.length > 0 && evaluatedBackfillSlots(targetPeriods, evaluated, existingStarts) === targetPeriods.length;
}
export function leaseIsActive(lease: HistoricalBackfillLease | undefined, now = new Date()) {
  return Boolean(lease && Date.parse(lease.leaseUntil) > now.getTime());
}
export function uniqueArchiveMonthKeys(periods: HistoricalReviewPeriod[]) {
  const keys = new Set<string>();
  for (const period of periods) { keys.add(period.start.slice(0, 7)); keys.add(period.end.slice(0, 7)); }
  return [...keys].sort();
}
