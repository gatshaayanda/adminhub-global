import { NextResponse } from "next/server";
import { hasAcceptedCurrentBetaAgreement } from "@/lib/boardsignal/account";
import {
  unavailableActiveWeekGuidance,
  withPreviousReviewGuidance,
  type CurrentEpisodeWithNextGameGuidance,
} from "@/lib/boardsignal/activeWeekGuidance";
import { presentationFromCoachingState } from "@/lib/boardsignal/coaching";
import { buildCurrentEpisodeSummary, currentAlignedPeriod } from "@/lib/boardsignal/processor";
import type { CurrentEpisodeSummary } from "@/lib/boardsignal/memory";
import type { ReviewLifecycle } from "@/lib/boardsignal/historyBackfill";
import { canonicalGenerationRequired } from "@/lib/boardsignal/reviewPeriods";
import { buildReviewProgress, deriveRecurringPatternsFromReviewHistory } from "@/lib/boardsignal/reviewHistory";
import {
  acceptFoundingBetaAgreement,
  accountForToken,
  buildPlayerRoomSnapshot,
  publishPrivateDesk,
  savePendingFactualReview,
  requirePlayerToken,
  updatePlayerPreferences,
} from "@/lib/boardsignal/server/persistence";
import { loadRecentReportPeriodTruth, recordReviewPeriodResult } from "@/lib/boardsignal/server/reviewPeriods";
import { loadReviewJournal } from "@/lib/boardsignal/server/reviewJournal";
import type { BoardSignalDesk, DeskEngineResult } from "@/lib/boardsignal/types";
import { recordGuidePlayerRoomSnapshot } from "@/lib/boardsignal/server/guide";
import { classifyBoardSignalHttpError } from "@/lib/boardsignal/server/firestoreService";
import {
  episodeWithCanonicalCoaching,
  reconcilePlayerCoachingState,
  validStoredCoachingState,
} from "@/lib/boardsignal/server/coaching";
import {
  classifyCurrentCollectionFailure,
  samePeriodCurrentEpisodeFallback,
} from "@/lib/boardsignal/server/currentEpisodeReliability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200, retryAfterSeconds?: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
      ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}),
    },
  });
}

function factualEpisodeCheckpoint(
  episode: Awaited<ReturnType<typeof buildCurrentEpisodeSummary>>,
): CurrentEpisodeSummary {
  const { nextGameGuidance, latestGame, ...factualEpisode } = episode;
  void nextGameGuidance;
  void latestGame;
  return factualEpisode;
}

function isoDay(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const account = await accountForToken(token);
    if (!hasAcceptedCurrentBetaAgreement(account)) {
      return response({
        ok: true,
        snapshot: {
          account,
          desks: [],
          reviewHistory: [],
          reportPeriods: [],
          historyCoverage: { evaluatedCount: 0, totalCount: 0 },
          originalBetaReturn: Boolean((account as typeof account & { originalBetaPlayer?: boolean }).originalBetaPlayer),
          progress: [],
          recurringPatterns: [],
          personalRecords: { desksCompleted: 0, personalBestWinRun: 0, largestPoolSpecificRatingClimb: {} },
          generationRequired: false,
          reviewJournal: { version: 1, notes: [] },
        },
      });
    }

    const refreshReference = new Date();
    const alignedPeriod = currentAlignedPeriod(account.cadenceAnchor, refreshReference);
    const currentPeriod = { periodStart: isoDay(alignedPeriod.start), periodEnd: isoDay(alignedPeriod.end) };
    let currentEpisode: CurrentEpisodeWithNextGameGuidance | undefined;
    let fallbackCurrentEpisode: CurrentEpisodeWithNextGameGuidance | undefined;
    let progressUnavailable: string | undefined;
    let usingLastKnownGood = false;

    try {
      currentEpisode = await buildCurrentEpisodeSummary(account.chessCom.canonicalUsername, {
        anchorStart: account.cadenceAnchor,
        playerKey: account.uid,
        referenceDate: refreshReference,
      });
    } catch (error) {
      progressUnavailable = "Current episode progress is temporarily unavailable.";
      const stored = samePeriodCurrentEpisodeFallback(account.currentEpisodeSummary, currentPeriod);
      if (stored) {
        fallbackCurrentEpisode = {
          ...stored,
          nextGameGuidance: unavailableActiveWeekGuidance(stored.games),
        };
        currentEpisode = fallbackCurrentEpisode;
        usingLastKnownGood = true;
      }
      const failure = classifyCurrentCollectionFailure(error);
      console.warn("[boardsignal] current Chess.com collection unavailable", {
        source: "chesscom",
        failure: failure.kind,
        status: failure.status,
        samePeriodFallbackUsed: usingLastKnownGood,
        lastSuccessfulCurrentCollectionAt: account.latestProgressCheckedAt ?? account.currentEpisodeSummary?.checkedAt,
      });
    }

    // Only a genuinely fresh collection may be persisted as a successful current checkpoint.
    // On a failed refresh, buildPlayerRoomSnapshot records retry_required while Firestore merge
    // preserves the prior currentEpisodeSummary/latestProgressCheckedAt because undefined fields
    // are removed by the existing clean() boundary.
    const factualCurrentEpisode = currentEpisode && !usingLastKnownGood
      ? factualEpisodeCheckpoint(currentEpisode)
      : undefined;
    const snapshot = await buildPlayerRoomSnapshot(token, factualCurrentEpisode, progressUnavailable, account);

    if (usingLastKnownGood && fallbackCurrentEpisode) {
      snapshot.currentEpisode = fallbackCurrentEpisode;
      snapshot.account = {
        ...snapshot.account,
        currentEpisodeSummary: account.currentEpisodeSummary,
        latestProgressCheckedAt: account.latestProgressCheckedAt,
        nextDeskDueAt: account.nextDeskDueAt,
      };
    }

    const reportTruth = await loadRecentReportPeriodTruth(snapshot.account, new Date(), true, snapshot.reviewHistory);
    snapshot.progress = buildReviewProgress(snapshot.reviewHistory);
    snapshot.recurringPatterns = deriveRecurringPatternsFromReviewHistory(snapshot.reviewHistory);
    snapshot.personalRecords = { ...snapshot.personalRecords, desksCompleted: snapshot.reviewHistory.length };
    snapshot.generationRequired = canonicalGenerationRequired(snapshot.generationRequired, reportTruth.periods);
    const retainedStarts = new Set(snapshot.reviewHistory.map((review) => review.periodStart));
    const retainedReviewPeriods = snapshot.reviewHistory.map((review) => ({
      periodStart: review.periodStart,
      periodEnd: review.periodEnd,
      periodLabel: review.periodLabel,
      outcome: "review" as const,
      reviewKey: review.reviewKey,
      reviewLifecycle: review.reviewLifecycle,
    }));
    const recentCadenceContext = reportTruth.periods.filter((period) => period.outcome !== "review" && !retainedStarts.has(period.periodStart));
    const reportPeriods = [...retainedReviewPeriods, ...recentCadenceContext].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
    const historyCoverage = {
      evaluatedCount: reportPeriods.filter((period) => Boolean(period.outcome)).length,
      totalCount: reportPeriods.length,
    };
    const reviewJournal = await loadReviewJournal(account.uid);
    Object.assign(snapshot, { reportPeriods, historyCoverage, reviewJournal });

    let coaching;
    if (snapshot.currentEpisode && currentEpisode) {
      const previous = snapshot.reviewHistory[0];
      currentEpisode = {
        ...currentEpisode,
        nextGameGuidance: withPreviousReviewGuidance(
          currentEpisode.nextGameGuidance,
          previous?.blue ? {
            title: previous.blue.title,
            copy: previous.blue.copy,
            family: previous.signalFamilies.blueFamily,
            sourcePeriod: previous.periodLabel,
          } : undefined,
        ),
      };

      if (usingLastKnownGood) {
        const storedCoaching = validStoredCoachingState(account.coachingState);
        coaching = storedCoaching
          && storedCoaching.periodStart === currentEpisode.periodStart
          && storedCoaching.periodEnd === currentEpisode.periodEnd
          ? presentationFromCoachingState(storedCoaching)
          : undefined;
      } else {
        coaching = await reconcilePlayerCoachingState(account.uid, currentEpisode);
      }

      currentEpisode = episodeWithCanonicalCoaching(currentEpisode, coaching);
      snapshot.currentEpisode = currentEpisode;
      Object.assign(snapshot, { coaching });
    }

    await recordGuidePlayerRoomSnapshot(account, {
      currentEpisode: usingLastKnownGood ? undefined : currentEpisode,
      latestDesk: snapshot.desks[0]?.desk,
      recentDeskLabels: snapshot.reviewHistory.map((item) => item.periodLabel),
      pulse: snapshot.pulse,
      shareMoments: snapshot.shareMoments,
    }).catch(() => undefined);
    return response({ ok: true, snapshot });
  } catch (error) {
    const classified = classifyBoardSignalHttpError(error);
    return response({ ok: false, code: classified.code, error: classified.message }, classified.status, classified.retryAfterSeconds);
  }
}

export async function POST(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const body = await request.json() as {
      action?: "acceptAgreement" | "saveFactualReview" | "publishDesk" | "updatePreferences";
      desk?: BoardSignalDesk;
      engineResults?: Record<string, DeskEngineResult>;
      reviewLifecycle?: ReviewLifecycle;
      historyLeaseId?: string;
      privacy?: import("@/lib/boardsignal/account").BoardSignalPrivacySettings;
      notificationPreferences?: import("@/lib/boardsignal/account").BoardSignalNotificationPreferences;
      contact?: {
        preferredContactMethod: import("@/lib/boardsignal/account").BoardSignalContactMethod;
        preferredContactValue: string;
        betaContactConsent: boolean;
      };
    };
    if (body.action === "acceptAgreement") return response({ ok: true, account: await acceptFoundingBetaAgreement(token) });
    if (body.action === "saveFactualReview" && body.desk) {
      return response({ ok: true, factualReview: await savePendingFactualReview(token, body.desk, { reviewLifecycle: body.reviewLifecycle, historyLeaseId: body.historyLeaseId }) });
    }
    if (body.action === "publishDesk" && body.desk && body.engineResults) {
      const publication = await publishPrivateDesk(token, body.desk, body.engineResults, { reviewLifecycle: body.reviewLifecycle, historyLeaseId: body.historyLeaseId });
      const account = await accountForToken(token);
      const reviewLifecycle = "reviewLifecycle" in publication ? publication.reviewLifecycle : body.reviewLifecycle ?? "organic_live";
      const reviewProduction = await recordReviewPeriodResult(account.uid, {
        periodStart: body.desk.period.start,
        periodEnd: body.desk.period.end,
        periodLabel: body.desk.period.label,
        outcome: "review",
        reviewKey: body.desk.episodeKey,
        reviewLifecycle,
        evaluatedAt: new Date().toISOString(),
      });
      const accountWithReviewProduction = reviewProduction ? { ...account, reviewProduction } : account;
      await import("@/lib/boardsignal/server/founderOperations")
        .then(({ refreshFounderPlayerSummary }) => refreshFounderPlayerSummary(accountWithReviewProduction))
        .catch(() => undefined);
      return response({ ok: true, publication });
    }
    if (body.action === "updatePreferences" && body.privacy && body.notificationPreferences) {
      return response({ ok: true, preferences: await updatePlayerPreferences(token, body.privacy, body.notificationPreferences, body.contact) });
    }
    return response({ ok: false, error: "Unknown Player Room action." }, 400);
  } catch (error) {
    const classified = classifyBoardSignalHttpError(error);
    return response({ ok: false, code: classified.code, error: classified.message }, classified.status, classified.retryAfterSeconds);
  }
}
