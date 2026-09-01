import { NextResponse } from "next/server";
import type { BoardSignalAccount, BoardSignalPlayerRoomEngagement } from "@/lib/boardsignal/account";
import { founderChessSnapshot, founderTrustpilotStatus, type FounderAccessOrigin, type FounderAccountEngagementProjection, type FounderChessSnapshot } from "@/lib/boardsignal/server/founderEngagement";
import type { FounderPlayerSummary } from "@/lib/boardsignal/server/founderMaterialized";
import { validStoredCoachingState } from "@/lib/boardsignal/server/coaching";
import { classifyBoardSignalHttpError } from "@/lib/boardsignal/server/firestoreService";
import { getAdminDb } from "@/utils/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const baseHeaders = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
type EngagementWithTotal = BoardSignalPlayerRoomEngagement & { totalForegroundEngagedSeconds?: number };
type FounderSafeAccount = BoardSignalAccount & { googleAccessOrigin?: FounderAccessOrigin; founderEngagementProjection?: FounderAccountEngagementProjection };
type ReviewStatus = "FORMING" | "READY" | "COMPLETED" | "NO ACTIVITY" | "CHECK REQUIRED";
type ChessSourceHealth = "ok" | "zero_games" | "not_checked" | "retry_required";
function response(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: baseHeaders }); }
function count(value: unknown) { const number = Number(value); return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0; }
function record(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function currentChessForFounder(account: FounderSafeAccount) { const current = founderChessSnapshot(account.currentEpisodeSummary); const collection = account.currentEpisodeCollection; if (collection?.status === "retry_required") return undefined; if (collection?.status === "ok" && collection.periodStart && current?.periodStart !== collection.periodStart) return undefined; return current; }
function chessSourceHealth(account: FounderSafeAccount, current?: FounderChessSnapshot): { status: ChessSourceHealth; checkedAt?: string } { const collection = account.currentEpisodeCollection; if (collection?.status === "retry_required") return { status: "retry_required", checkedAt: collection.checkedAt }; if (!current) return { status: "not_checked", checkedAt: collection?.checkedAt }; return { status: current.games === 0 ? "zero_games" : "ok", checkedAt: collection?.checkedAt ?? current.checkedAt }; }
function reviewStatus(account: FounderSafeAccount, summary?: FounderPlayerSummary): ReviewStatus | undefined { if (summary?.row.reviewCheckRequired) return "CHECK REQUIRED"; if (summary?.row.readyNotSeen) return "READY"; if (account.currentEpisodeSummary?.status === "forming" || summary?.row.forming) return "FORMING"; if (summary?.row.latestReportPeriod?.outcome === "no_activity") return "NO ACTIVITY"; if (summary?.row.latestReview) return "COMPLETED"; return undefined; }

function playerRow(account: FounderSafeAccount, summary?: FounderPlayerSummary) {
  const engagement = account.playerRoomEngagement as EngagementWithTotal | undefined;
  const projection = account.founderEngagementProjection;
  const coaching = validStoredCoachingState(account.coachingState);
  const current = currentChessForFounder(account);
  const sourceHealth = chessSourceHealth(account, current);
  const latestReview = summary?.row.latestReview;
  return {
    uid: account.uid,
    playerId: account.chessCom.playerId,
    username: account.chessCom.canonicalUsername,
    profileUrl: account.chessCom.profileUrl || `https://www.chess.com/member/${encodeURIComponent(account.chessCom.canonicalUsername)}`,
    accountStatus: account.accessStatus,
    identityStatus: account.identityStatus,
    access: { origin: account.googleAccessOrigin, googleLinkedAt: account.googleAccessConnectedAt, latestMethod: projection?.latestAccessMethod, latestAccessAt: projection?.latestAccessAt },
    usage: { roomVisitCount: count(engagement?.roomVisitCount), firstRoomVisitAt: engagement?.firstRoomVisitAt, latestRoomVisitAt: engagement?.latestRoomVisitAt, lastActiveAt: engagement?.lastActiveAt ?? account.lastSeenAt, totalForegroundEngagedSeconds: count(engagement?.totalForegroundEngagedSeconds), latestSessionForegroundEngagedSeconds: count(engagement?.latestSessionForegroundEngagedSeconds) },
    currentBoardSignal: {
      helpfulCount: count(projection?.helpfulCount), notHelpfulCount: count(projection?.notHelpfulCount), latestFeedbackAt: projection?.latestFeedbackAt,
      noteCount: count(projection?.noteCount), notesCreated: count(projection?.notesCreated), latestNoteAt: projection?.latestNoteAt,
      askQuestionCount: count(projection?.askQuestionCount), latestAskAt: projection?.latestAskAt,
      latestCoachingVariant: projection?.latestCoachingVariant, latestCoachingPresentationSource: projection?.latestCoachingPresentationSource, latestCoachingPresentationAt: projection?.latestCoachingPresentationAt,
      coaching: coaching ? { family: coaching.family, source: coaching.source, provenance: coaching.provenance, level: coaching.level, variant: coaching.level, automaticVariantCursor: coaching.automaticVariantCursor, lastPresentationSource: coaching.lastPresentationSource, evidenceCount: coaching.evidenceCount, gamesConsidered: coaching.gamesConsidered, reactions: { 1: coaching.reactions?.[1]?.reaction, 2: coaching.reactions?.[2]?.reaction, 3: coaching.reactions?.[3]?.reaction } } : undefined,
    },
    chess: { current, sincePreviousVisit: projection?.chessSincePreviousVisit, sourceHealth },
    review: { status: reviewStatus(account, summary), daysComplete: current ? account.currentEpisodeSummary?.daysComplete : undefined, daysRemaining: current ? account.currentEpisodeSummary?.daysRemaining : undefined, dueAt: summary?.row.nextDeskDueAt ?? account.currentEpisodeSummary?.nextDeskDueAt ?? account.nextDeskDueAt, completedCount: summary ? count(summary.validation.verifiedReviews) : undefined, latest: latestReview ? { periodStart: latestReview.periodStart, periodEnd: latestReview.periodEnd, periodLabel: latestReview.periodLabel } : undefined },
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
      coaching: { totalReactions: count(coaching.totalReactions), helpful: count(coaching.helpful), notHelpful: count(coaching.notHelpful), l1DownToL2: count(coaching.l1DownToL2), l2DownToL3: count(coaching.l2DownToL3), level3Reached: count(coaching.level3Reached), level3Down: count(coaching.level3Down), viewGame: count(coaching.viewGame), exampleCycles: count(coaching.exampleCycles), askEscalations: count(coaching.askEscalations), byFamily: record(coaching.byFamily), byLevel: record(coaching.byLevel), byVariant: record(coaching.byVariant), variantShown: record(coaching.variantShown), presentationSource: record(coaching.presentationSource) },
      validation: { playersServed: count(validation.playersServed), originalReviews: count(validation.originalReviews), liveReviews: count(validation.liveReviews), historicalPeriods: count(validation.historicalPeriods), totalReviewsProduced: count(validation.totalReviewsProduced), originalToLive: count(validation.originalToLive) }, rows,
    } });
  } catch (error) { const classified = classifyBoardSignalHttpError(error); return response({ ok: false, code: classified.code, error: classified.message }, classified.status); }
}
