import type { ReviewLifecycle } from "./historyBackfill";

export const RECENT_REPORT_PERIOD_LIMIT = 4 as const;
export const NO_ACTIVITY_COPY = "No Chess.com games found in this completed seven-day period.";

export type ReviewPeriodOutcome = "review" | "no_activity";
export type ReviewPeriodResult = {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  outcome: ReviewPeriodOutcome;
  reviewKey?: string;
  reviewLifecycle?: ReviewLifecycle;
  evaluatedAt: string;
};

export type ReviewHistoryCoverage = { evaluatedCount: number; totalCount: number };
export type CanonicalReportPeriod = {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  outcome?: ReviewPeriodOutcome;
  reviewKey?: string;
  reviewLifecycle?: ReviewLifecycle;
  evaluatedAt?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
function day(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) throw new Error(`Invalid BoardSignal period date: ${value}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
function isoDay(ms: number) { return new Date(ms).toISOString().slice(0, 10); }
export function addPeriodDays(value: string, days: number) { return isoDay(day(value) + days * DAY_MS); }
export function reportPeriodLabel(start: string, end = addPeriodDays(start, 6)) {
  const a = new Date(`${start}T00:00:00.000Z`);
  const b = new Date(`${end}T00:00:00.000Z`);
  const fmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt.format(a)}–${fmt.format(b)} ${b.getUTCFullYear()}`;
}

/** Latest four cadence-aligned completed seven-day periods, oldest -> newest.
 * cadenceAnchor is a phase/alignment anchor, not the earliest permissible report period.
 * Negative seven-day offsets intentionally preserve Patch H chronology before the anchor.
 */
export function latestCompletedReviewPeriods(cadenceAnchor: string, now = new Date()): CanonicalReportPeriod[] {
  const anchor = day(cadenceAnchor);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // A seven-day period is [start, start+6]. The aligned period containing today is
  // still forming, so the immediately preceding aligned period is the newest completed one.
  const currentIndex = Math.floor((today - anchor) / (7 * DAY_MS));
  const currentStart = anchor + currentIndex * 7 * DAY_MS;
  const latestIndex = today > currentStart + 6 * DAY_MS ? currentIndex : currentIndex - 1;
  const firstIndex = latestIndex - (RECENT_REPORT_PERIOD_LIMIT - 1);
  const rows: CanonicalReportPeriod[] = [];
  for (let index = firstIndex; index <= latestIndex; index += 1) {
    const periodStart = isoDay(anchor + index * 7 * DAY_MS);
    const periodEnd = addPeriodDays(periodStart, 6);
    rows.push({ periodStart, periodEnd, periodLabel: reportPeriodLabel(periodStart, periodEnd) });
  }
  return rows;
}

export function mergeReportPeriodTruth(
  targets: CanonicalReportPeriod[],
  results: Iterable<ReviewPeriodResult>,
): CanonicalReportPeriod[] {
  const map = new Map(Array.from(results, item => [item.periodStart, item]));
  return targets.map(target => {
    const result = map.get(target.periodStart);
    return result ? { ...target, ...result, periodEnd: target.periodEnd, periodLabel: target.periodLabel } : target;
  });
}

export function reviewHistoryCoverage(periods: CanonicalReportPeriod[]): ReviewHistoryCoverage {
  return { evaluatedCount: periods.filter(period => Boolean(period.outcome)).length, totalCount: periods.length };
}

export function oldestMissingReportPeriod(periods: CanonicalReportPeriod[]) {
  return periods.find(period => !period.outcome);
}

export function gameBearingPeriodStarts(periods: CanonicalReportPeriod[]) {
  return new Set(periods.filter(period => period.outcome === "review").map(period => period.periodStart));
}

export function noActivityPeriodStarts(periods: CanonicalReportPeriod[]) {
  return new Set(periods.filter(period => period.outcome === "no_activity").map(period => period.periodStart));
}

export function performanceEvidencePeriods<T extends { periodStart: string }>(periods: CanonicalReportPeriod[], reviews: T[]) {
  const allowed = gameBearingPeriodStarts(periods);
  return reviews.filter(review => allowed.has(review.periodStart));
}

/** Newest eligible game-bearing Review period for official chess state.
 * This intentionally does not filter by lifecycle: a verified historical_backfill
 * Review is valid official chess evidence even though it remains excluded from
 * qualifying/retention Review counts elsewhere.
 */
export function latestOfficialChessStatePeriod<T extends { periodStart: string; periodEnd: string; periodLabel?: string }>(reviews: T[]) {
  return [...reviews].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
}

export function canonicalGenerationRequired(baseGenerationRequired: boolean, periods: CanonicalReportPeriod[]) {
  const newest = periods.at(-1);
  return newest?.outcome === "review" || newest?.outcome === "no_activity" ? false : baseGenerationRequired;
}

export function mergeReviewPeriodResult(
  existing: (Partial<ReviewPeriodResult> & Record<string, unknown>) | undefined,
  incoming: ReviewPeriodResult,
): ReviewPeriodResult & Record<string, unknown> {
  if (existing?.outcome !== "review") return { ...incoming };
  if (incoming.outcome === "no_activity") {
    return { ...incoming, ...Object.fromEntries(Object.entries(existing).filter(([, value]) => value !== undefined)), outcome: "review" } as ReviewPeriodResult & Record<string, unknown>;
  }
  const preserved = Object.fromEntries(Object.entries(existing).filter(([, value]) => value !== undefined));
  return {
    ...incoming,
    ...preserved,
    // Canonical window boundaries remain authoritative while richer Review metadata survives.
    periodStart: incoming.periodStart,
    periodEnd: incoming.periodEnd,
    periodLabel: incoming.periodLabel,
    outcome: "review",
    reviewKey: existing.reviewKey ?? incoming.reviewKey,
    reviewLifecycle: existing.reviewLifecycle ?? incoming.reviewLifecycle,
    evaluatedAt: existing.evaluatedAt || incoming.evaluatedAt,
  } as ReviewPeriodResult & Record<string, unknown>;
}
