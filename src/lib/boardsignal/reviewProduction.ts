import type { ReviewLifecycle } from "./historyBackfill";

export const REVIEW_PRODUCTION_VERSION = "boardsignal-review-production-v1" as const;

export type ReviewProductionStats = {
  version: typeof REVIEW_PRODUCTION_VERSION;
  baselineComplete: boolean;
  totalReviews: number;
  originalBetaReviews: number;
  organicLiveReviews: number;
  historicalBackfillReviews: number;
  updatedAt: string;
};

export type ReviewProductionFact = {
  periodStart: string;
  reviewLifecycle: ReviewLifecycle;
};

const LIFECYCLE_PRIORITY: Record<ReviewLifecycle, number> = {
  historical_backfill: 1,
  organic_live: 2,
  original_beta: 3,
};

function nonnegative(value: number) {
  return Math.max(0, Math.round(Number(value) || 0));
}

export function emptyReviewProductionStats(now = new Date(), baselineComplete = false): ReviewProductionStats {
  return {
    version: REVIEW_PRODUCTION_VERSION,
    baselineComplete,
    totalReviews: 0,
    originalBetaReviews: 0,
    organicLiveReviews: 0,
    historicalBackfillReviews: 0,
    updatedAt: now.toISOString(),
  };
}

export function validReviewProductionStats(value: unknown): ReviewProductionStats | undefined {
  const data = value as Partial<ReviewProductionStats> | undefined;
  if (!data || data.version !== REVIEW_PRODUCTION_VERSION) return undefined;
  return {
    version: REVIEW_PRODUCTION_VERSION,
    baselineComplete: data.baselineComplete === true,
    totalReviews: nonnegative(data.totalReviews ?? 0),
    originalBetaReviews: nonnegative(data.originalBetaReviews ?? 0),
    organicLiveReviews: nonnegative(data.organicLiveReviews ?? 0),
    historicalBackfillReviews: nonnegative(data.historicalBackfillReviews ?? 0),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date(0).toISOString(),
  };
}

export function addReviewProductionFact(
  current: ReviewProductionStats | undefined,
  fact: ReviewProductionFact,
  now = new Date(),
): ReviewProductionStats {
  const base = current ?? emptyReviewProductionStats(now, false);
  const next: ReviewProductionStats = {
    ...base,
    totalReviews: base.totalReviews + 1,
    updatedAt: now.toISOString(),
  };
  if (fact.reviewLifecycle === "original_beta") next.originalBetaReviews += 1;
  if (fact.reviewLifecycle === "organic_live") next.organicLiveReviews += 1;
  if (fact.reviewLifecycle === "historical_backfill") next.historicalBackfillReviews += 1;
  return next;
}

export function reviewProductionFromFacts(
  facts: Iterable<ReviewProductionFact>,
  now = new Date(),
  baselineComplete = true,
): ReviewProductionStats {
  const unique = new Map<string, ReviewProductionFact>();

  for (const fact of facts) {
    if (!fact.periodStart) continue;
    const existing = unique.get(fact.periodStart);
    if (!existing || LIFECYCLE_PRIORITY[fact.reviewLifecycle] > LIFECYCLE_PRIORITY[existing.reviewLifecycle]) {
      unique.set(fact.periodStart, fact);
    }
  }

  const stats = emptyReviewProductionStats(now, baselineComplete);
  for (const fact of unique.values()) {
    stats.totalReviews += 1;
    if (fact.reviewLifecycle === "original_beta") stats.originalBetaReviews += 1;
    if (fact.reviewLifecycle === "organic_live") stats.organicLiveReviews += 1;
    if (fact.reviewLifecycle === "historical_backfill") stats.historicalBackfillReviews += 1;
  }
  return stats;
}
