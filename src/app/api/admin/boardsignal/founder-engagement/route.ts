import { NextResponse } from "next/server";
import {
  hasAcceptedCurrentBetaAgreement,
  type BoardSignalAccount,
  type BoardSignalPlayerRoomEngagement,
} from "@/lib/boardsignal/account";
import type { ReviewHistoryBackfillState } from "@/lib/boardsignal/historyBackfill";
import { summarizeFounderHistoryVisibility } from "@/lib/boardsignal/founderOperationsLogic";
import { currentAlignedPeriod } from "@/lib/boardsignal/processor";
import { founderChessSnapshot, founderTrustpilotStatus, type FounderAccessOrigin, type FounderAccountEngagementProjection } from "@/lib/boardsignal/server/founderEngagement";
import type { FounderPlayerSummary } from "@/lib/boardsignal/server/founderMaterialized";
import { validStoredCoachingState } from "@/lib/boardsignal/server/coaching";
import { samePeriodCurrentEpisodeFallback } from "@/lib/boardsignal/server/currentEpisodeReliability";
import { classifyBoardSignalHttpError } from "@/lib/boardsignal/server/firestoreService";
import { getAdminDb } from "@/utils/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const baseHeaders = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
const DAY_MS = 86_400_000;
type EngagementWithTotal = BoardSignalPlayerRoomEngagement & { totalForegroundEngagedSeconds?: number };
type FounderSafeAccount = BoardSignalAccount & { googleAccessOrigin?: FounderAccessOrigin; founderEngagementProjection?: FounderAccountEngagementProjection; reviewHistoryBackfill?: ReviewHistoryBackfillState };
type ReviewStatus = "FORMING" | "READY" | "COMPLETED" | "NO ACTIVITY" | "CHECK REQUIRED";
function response(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: baseHeaders }); }
function count(value: unknown) { const number = Number(value); return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0; }
function record(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function isoDay(value: Date) { return value.toISOString().slice(0, 10); }
function timestampFallsInPeriod(value: string | undefined, periodStart: string, periodEnd: string) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  const start = Date.parse(`${periodStart}T00:00:00.000Z`);
  const endExclusive = Date.parse(`${periodEnd}T00:00:00.000Z`) + DAY_MS;
  return Number.isFinite(timestamp) && Number.isFinite(start) && Number.isFinite(endExclusive) && timestamp >= start && timestamp < endExclusive;
}
function currentTruthForFounder(account: FounderSafeAccount, now = new Date()) {
  const aligned = currentAlignedPeriod(account.cadenceAnchor, now);
  const currentPeriod = { periodStart: isoDay(aligned.start), periodEnd: isoDay(aligned.end) };
  const currentEpisode = samePeriodCurrentEpisodeFallback(account.currentEpisodeSummary, currentPeriod);
  const collection = account.currentEpisodeCollection;

  if (collection?.status === "retry_required") {
    if (currentEpisode) {
      return { currentEpisode, sourceHealth: { status: "last_good" as const, lastSuccessfulAt: currentEpisode.checkedAt, latestAttemptAt: collection.checkedAt } };
    }
    return timestampFallsInPeriod(collection.checkedAt, currentPeriod.periodStart, currentPeriod.periodEnd)
      ? { currentEpisode: undefined, sourceHealth: { status: "temporarily_unavailable" as const, latestAttemptAt: collection.checkedAt } }
      : { currentEpisode: undefined, sourceHealth: { status: "not_checked" as const } };
  }

  if (collection?.status === "ok") {
    const collectionMatchesCurrent = collection.periodStart === currentPeriod.periodStart && collection.periodEnd === currentPeriod.periodEnd;
    if (!collectionMatchesCurrent || !currentEpisode) {
      return { currentEpisode: undefined, sourceHealth: { status: "not_checked" as const } };
    }
    return {
      currentEpisode,
      sourceHealth: {
        status: currentEpisode.games === 0 ? "zero_games" as const : "fresh" as const,
        lastSuccessfulAt: currentEpisode.checkedAt,
        latestAttemptAt: collection.checkedAt,
      },
    };
  }

  if (currentEpisode) {
    return {
      currentEpisode,
      sourceHealth: {
        status: currentEpisode.games === 0 ? "zero_games" as const : "fresh" as const,
        lastSuccessfulAt: currentEpisode.checkedAt,
        latestAttemptAt: currentEpisode.checkedAt,
      },
    };
  }

  return { currentEpisode: undefined, sourceHealth: { status: "not_checked" as const } };
}
function reviewStatus(account: FounderSafeAccount, summary?: FounderPlayerSummary): ReviewStatus | undefined { if (summary?.row.reviewCheckRequired) return "CHECK REQUIRED"; if (summary?.row.readyNotSeen) return "READY"; if (account.currentEpisodeSummary?.status === "forming" || summary?.row.forming) return "FORMING"; if (summary?.row.latestReportPeriod?.outcome === "no_activity") return "NO ACTIVITY"; if (summary?.row.latestReview) return "COMPLETED"; return undefined; }

function playerRow(account: FounderSafeAccount, summary?: FounderPlayerSummary) {
  const engagement = account.playerRoomEngagement as EngagementWithTotal | undefined;
  const projection = account.founderEngagementProjection;
  const coaching = validStoredCoachingState(account.coachingState);
  const roomVisitCount = count(engagement?.roomVisitCount);
  const currentTruth = currentTruthForFounder(account);
  const currentEpisode = currentTruth.currentEpisode;
  const current = founderChessSnapshot(currentEpisode);
  const sincePreviousVisit = current && projection?.chessSincePreviousVisit?.periodStart === current.periodStart
    ? projection.chessSincePreviousVisit
    : undefined;
  const latestReview = summary?.row.latestReview;
  const liveHistory = account.reviewHistoryBackfill;
  const materializedHistory = summary?.row.history;
  const historySummary = materializedHistory
    ? { ...materializedHistory, status: liveHistory?.status ?? materializedHistory.status }
    : summarizeFounderHistoryVisibility(liveHistory);
  const activeHistoryTarget = liveHistory?.lease
    ? liveHistory.targetPeriods.find((period) => period.start === liveHistory.lease?.periodStart)
    : undefined;
  return {
    uid: account.uid,
    playerId: account.chessCom.playerId,
    username: account.chessCom.canonicalUsername,
    profileUrl: account.chessCom.profileUrl || `https://www.chess.com/member/${encodeURIComponent(account.chessCom.canonicalUsername)}`,
    accountStatus: account.accessStatus,
    identityStatus: account.identityStatus,
    access: {
      origin: account.googleAccessOrigin,
      googleLinkedAt: account.googleAccessConnectedAt,
      latestMethod: projection?.latestAccessMethod,
      latestAccessAt: projection?.latestAccessAt,
      agreementAccepted: hasAcceptedCurrentBetaAgreement(account),
      playerRoomEntered: roomVisitCount > 0,
    },
    usage: {
      roomVisitCount,
      returned: roomVisitCount >= 2,
      firstRoomVisitAt: engagement?.firstRoomVisitAt,
      latestRoomVisitAt: engagement?.latestRoomVisitAt,
      lastActiveAt: engagement?.lastActiveAt ?? account.lastSeenAt,
      totalForegroundEngagedSeconds: count(engagement?.totalForegroundEngagedSeconds),
      latestSessionForegroundEngagedSeconds: count(engagement?.latestSessionForegroundEngagedSeconds),
    },
    currentBoardSignal: {
      helpfulCount: count(projection?.helpfulCount), notHelpfulCount: count(projection?.notHelpfulCount), latestFeedbackAt: projection?.latestFeedbackAt,
      noteCount: count(projection?.noteCount), notesCreated: count(projection?.notesCreated), latestNoteAt: projection?.latestNoteAt,
      askQuestionCount: count(projection?.askQuestionCount), latestAskAt: projection?.latestAskAt,
      latestCoachingVariant: projection?.latestCoachingVariant, latestCoachingPresentationSource: projection?.latestCoachingPresentationSource, latestCoachingPresentationAt: projection?.latestCoachingPresentationAt,
      coaching: coaching ? { family: coaching.family, source: coaching.source, provenance: coaching.provenance, variant: coaching.level, automaticVariantCursor: coaching.automaticVariantCursor, lastPresentationSource: coaching.lastPresentationSource, evidenceCount: coaching.evidenceCount, gamesConsidered: coaching.gamesConsidered, reactions: { 1: coaching.reactions?.[1]?.reaction, 2: coaching.reactions?.[2]?.reaction, 3: coaching.reactions?.[3]?.reaction } } : undefined,
    },
    chess: { current, sincePreviousVisit, sourceHealth: currentTruth.sourceHealth },
    review: { status: reviewStatus(account, summary), daysComplete: currentEpisode?.daysComplete, daysRemaining: currentEpisode?.daysRemaining, dueAt: summary?.row.nextDeskDueAt ?? currentEpisode?.nextDeskDueAt ?? account.nextDeskDueAt, completedCount: summary ? count(summary.validation.verifiedReviews) : undefined, latest: latestReview ? { periodStart: latestReview.periodStart, periodEnd: latestReview.periodEnd, periodLabel: latestReview.periodLabel } : undefined },
    history: {
      status: historySummary.status,
      evaluatedSlots: historySummary.evaluatedSlots,
      totalSlots: historySummary.totalSlots,
      reviewSlots: historySummary.reviewSlots,
      noActivitySlots: historySummary.noActivitySlots,
      currentPeriod: activeHistoryTarget ? { periodStart: activeHistoryTarget.start, periodEnd: activeHistoryTarget.end } : undefined,
      lastAttemptAt: liveHistory?.lastAttemptAt,
      lastError: liveHistory?.lastError,
      completedAt: liveHistory?.completedAt,
    },
    trustpilot: { status: founderTrustpilotStatus(account.trustpilotReviewInvitation), firstAskShownAt: account.trustpilotReviewInvitation?.firstAskShownAt, finalAskShownAt: account.trustpilotReviewInvitation?.finalAskShownAt, resolvedAt: account.trustpilotReviewInvitation?.resolvedAt },
  };
}

export async function GET(request: Request) {
  try {
    const db = getAdminDb();
    const url = new URL(request.url);
    const includeRows = url.searchParams.get("view") === "rows";
    const aggregateSnapshot = await db.collection("founderOperationsState").doc("current").get();
    if (!aggregateSnapshot.exists) return response({ ok: false, code: "FOUNDER_ENGAGEMENT_NOT_READY", error: "Founder product intelligence is not materialized yet." }, 503);
    const aggregate = aggregateSnapshot.data() as Record<string, unknown>;
    const metrics = record(aggregate.metrics), attention = record(aggregate.attention), validation = record(aggregate.validation), engagement = record(aggregate.engagement), coaching = record(aggregate.coaching);
    let rows: ReturnType<typeof playerRow>[] = [];
    if (includeRows) {
      const [players, summaries] = await Promise.all([db.collection("users").where("role", "==", "player").get(), db.collection("founderPlayerSummaries").where("active", "==", true).get()]);
      const summaryByUid = new Map(summaries.docs.map((document) => { const summary = document.data() as FounderPlayerSummary; return [summary.uid, summary] as const; }));
      rows = players.docs.map((document) => document.data() as FounderSafeAccount).filter((account) => account.accessStatus === "active" && Number(account.chessCom?.playerId) > 0).map((account) => playerRow(account, summaryByUid.get(account.uid))).sort((left, right) => String(right.usage.lastActiveAt ?? "").localeCompare(String(left.usage.lastActiveAt ?? "")));
    }
    return response({ ok: true, intelligence: {
      generatedAt: typeof aggregate.generatedAt === "string" ? aggregate.generatedAt : undefined,
      metrics: { activePlayers: count(metrics.activePlayers), reviewsForming: count(metrics.reviewsForming), reviewsReady: count(metrics.reviewsReady), followUpsDue: count(metrics.followUpsDue), notSeenRecently: count(metrics.notSeenRecently), unreadReplies: count(metrics.unreadReplies) },
      attention: { followUpsDue: count(attention.followUpsDue), unreadReplies: count(attention.unreadReplies), exceptions: count(attention.exceptions), identityConflicts: count(attention.identityConflicts) },
      engagement: { roomVisits: count(engagement.roomVisits), playersReturning: count(engagement.playersReturning), foregroundEngagedSeconds: count(engagement.foregroundEngagedSeconds), helpful: count(engagement.helpful), notHelpful: count(engagement.notHelpful), notesCreated: count(engagement.notesCreated), askQuestions: count(engagement.askQuestions), updatedAt: typeof engagement.updatedAt === "string" ? engagement.updatedAt : undefined },
      coaching: { totalReactions: count(coaching.totalReactions), helpful: count(coaching.helpful), notHelpful: count(coaching.notHelpful), viewGame: count(coaching.viewGame), exampleCycles: count(coaching.exampleCycles), askEscalations: count(coaching.askEscalations), byFamily: record(coaching.byFamily), byVariant: record(coaching.byVariant), variantShown: record(coaching.variantShown), presentationSource: record(coaching.presentationSource) },
      validation: { playersServed: count(validation.playersServed), originalReviews: count(validation.originalReviews), liveReviews: count(validation.liveReviews), historicalPeriods: count(validation.historicalPeriods), totalReviewsProduced: count(validation.totalReviewsProduced), originalToLive: count(validation.originalToLive) }, rows,
    } });
  } catch (error) { const classified = classifyBoardSignalHttpError(error); return response({ ok: false, code: classified.code, error: classified.message }, classified.status); }
}
