import { NextResponse } from "next/server";
import { hasAcceptedCurrentBetaAgreement } from "@/lib/boardsignal/account";
import { withPreviousReviewGuidance } from "@/lib/boardsignal/activeWeekGuidance";
import { buildCurrentEpisodeSummary } from "@/lib/boardsignal/processor";
import type { CurrentEpisodeSummary } from "@/lib/boardsignal/memory";
import type { ReviewLifecycle } from "@/lib/boardsignal/historyBackfill";
import { canonicalGenerationRequired, performanceEvidencePeriods } from "@/lib/boardsignal/reviewPeriods";
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
import type { BoardSignalDesk, DeskEngineResult } from "@/lib/boardsignal/types";
import { recordGuidePlayerRoomSnapshot } from "@/lib/boardsignal/server/guide";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" } });
}

function factualEpisodeCheckpoint(episode: Awaited<ReturnType<typeof buildCurrentEpisodeSummary>>): CurrentEpisodeSummary {
  const { nextGameGuidance, latestGame, ...factualEpisode } = episode;
  void nextGameGuidance;
  void latestGame;
  return factualEpisode;
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
          personalRecords: {
            desksCompleted: 0,
            personalBestWinRun: 0,
            largestPoolSpecificRatingClimb: {},
          },
          generationRequired: false,
        },
      });
    }
    let currentEpisode: Awaited<ReturnType<typeof buildCurrentEpisodeSummary>> | undefined;
    let progressUnavailable;
    try {
      currentEpisode = await buildCurrentEpisodeSummary(account.chessCom.canonicalUsername, {
        anchorStart: account.cadenceAnchor,
        playerKey: account.uid,
      });
    } catch (error) {
      progressUnavailable = error instanceof Error ? error.message : "Current episode progress is temporarily unavailable.";
    }
    const factualCurrentEpisode = currentEpisode ? factualEpisodeCheckpoint(currentEpisode) : undefined;
    const [snapshot, reportTruth] = await Promise.all([
      buildPlayerRoomSnapshot(token, factualCurrentEpisode, progressUnavailable),
      loadRecentReportPeriodTruth(account),
    ]);
    // Progress/advice evidence comes only from real game-bearing Reviews inside the same
    // canonical four-period timeline. A quiet week stays visible but contributes zero evidence.
    snapshot.reviewHistory = performanceEvidencePeriods(reportTruth.periods, snapshot.reviewHistory);
    snapshot.progress = buildReviewProgress(snapshot.reviewHistory);
    snapshot.recurringPatterns = deriveRecurringPatternsFromReviewHistory(snapshot.reviewHistory);
    snapshot.personalRecords = {
      ...snapshot.personalRecords,
      desksCompleted: snapshot.reviewHistory.length,
    };
    // Canonical weekly truth owns generation state. A settled newest period suppresses
    // duplicate ordinary generation; an unresolved newest period preserves the live path.
    snapshot.generationRequired = canonicalGenerationRequired(snapshot.generationRequired, reportTruth.periods);
    Object.assign(snapshot, { reportPeriods: reportTruth.periods, historyCoverage: reportTruth.coverage });

    if (snapshot.currentEpisode && currentEpisode) {
      const previous = snapshot.reviewHistory[0];
      currentEpisode = {
        ...currentEpisode,
        nextGameGuidance: withPreviousReviewGuidance(currentEpisode.nextGameGuidance, previous?.blue ? {
          title: previous.blue.title,
          copy: previous.blue.copy,
          family: previous.signalFamilies.blueFamily,
          sourcePeriod: previous.periodLabel,
        } : undefined),
      };
      snapshot.currentEpisode = currentEpisode;
    }
    await recordGuidePlayerRoomSnapshot(account, {
      currentEpisode,
      latestDesk: snapshot.desks[0]?.desk,
      recentDeskLabels: snapshot.reviewHistory.map((item) => item.periodLabel),
      pulse: snapshot.pulse,
      shareMoments: snapshot.shareMoments,
    }).catch(() => undefined);
    return response({ ok: true, snapshot });
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Player Room could not be loaded." }, Number((error as { status?: number }).status ?? 500));
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
    if (body.action === "acceptAgreement") {
      return response({ ok: true, account: await acceptFoundingBetaAgreement(token) });
    }
    if (body.action === "saveFactualReview" && body.desk) {
      return response({ ok: true, factualReview: await savePendingFactualReview(token, body.desk, { reviewLifecycle: body.reviewLifecycle, historyLeaseId: body.historyLeaseId }) });
    }
    if (body.action === "publishDesk" && body.desk && body.engineResults) {
      const publication = await publishPrivateDesk(token, body.desk, body.engineResults, { reviewLifecycle: body.reviewLifecycle, historyLeaseId: body.historyLeaseId });
      const account = await accountForToken(token);
      await recordReviewPeriodResult(account.uid, {
        periodStart: body.desk.period.start,
        periodEnd: body.desk.period.end,
        periodLabel: body.desk.period.label,
        outcome: "review",
        reviewKey: body.desk.episodeKey,
        reviewLifecycle: body.reviewLifecycle ?? "organic_live",
        evaluatedAt: new Date().toISOString(),
      });
      return response({ ok: true, publication });
    }
    if (body.action === "updatePreferences" && body.privacy && body.notificationPreferences) {
      return response({ ok: true, preferences: await updatePlayerPreferences(token, body.privacy, body.notificationPreferences, body.contact) });
    }
    return response({ ok: false, error: "Unknown Player Room action." }, 400);
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Player Room update failed." }, Number((error as { status?: number }).status ?? 500));
  }
}
