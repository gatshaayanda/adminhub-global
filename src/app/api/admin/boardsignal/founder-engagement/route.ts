import { NextResponse } from "next/server";
import type { BoardSignalAccount, BoardSignalPlayerRoomEngagement } from "@/lib/boardsignal/account";
import {
  founderChessSnapshot,
  founderTrustpilotStatus,
  type FounderAccessOrigin,
  type FounderAccountEngagementProjection,
} from "@/lib/boardsignal/server/founderEngagement";
import { classifyBoardSignalHttpError } from "@/lib/boardsignal/server/firestoreService";
import { getAdminDb } from "@/utils/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const baseHeaders = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: baseHeaders });
}

function count(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

type EngagementWithTotal = BoardSignalPlayerRoomEngagement & {
  totalForegroundEngagedSeconds?: number;
};

type FounderSafeAccount = BoardSignalAccount & {
  googleAccessOrigin?: FounderAccessOrigin;
  founderEngagementProjection?: FounderAccountEngagementProjection;
};

function playerRow(account: FounderSafeAccount) {
  const engagement = account.playerRoomEngagement as EngagementWithTotal | undefined;
  const projection = account.founderEngagementProjection;
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
    },
    usage: {
      roomVisitCount: count(engagement?.roomVisitCount),
      firstRoomVisitAt: engagement?.firstRoomVisitAt,
      latestRoomVisitAt: engagement?.latestRoomVisitAt,
      lastActiveAt: engagement?.lastActiveAt ?? account.lastSeenAt,
      totalForegroundEngagedSeconds: count(engagement?.totalForegroundEngagedSeconds),
      latestSessionForegroundEngagedSeconds: count(engagement?.latestSessionForegroundEngagedSeconds),
    },
    currentBoardSignal: {
      helpfulCount: count(projection?.helpfulCount),
      notHelpfulCount: count(projection?.notHelpfulCount),
      latestFeedbackAt: projection?.latestFeedbackAt,
      noteCount: count(projection?.noteCount),
      notesCreated: count(projection?.notesCreated),
      latestNoteAt: projection?.latestNoteAt,
      askQuestionCount: count(projection?.askQuestionCount),
      latestAskAt: projection?.latestAskAt,
    },
    chess: {
      current: founderChessSnapshot(account.currentEpisodeSummary),
      sincePreviousVisit: projection?.chessSincePreviousVisit,
    },
    trustpilot: {
      status: founderTrustpilotStatus(account.trustpilotReviewInvitation),
      firstAskShownAt: account.trustpilotReviewInvitation?.firstAskShownAt,
      finalAskShownAt: account.trustpilotReviewInvitation?.finalAskShownAt,
      resolvedAt: account.trustpilotReviewInvitation?.resolvedAt,
    },
  };
}

export async function GET(request: Request) {
  try {
    const db = getAdminDb();
    const url = new URL(request.url);
    const includeRows = url.searchParams.get("view") === "rows";
    const aggregateSnapshot = await db.collection("founderOperationsState").doc("current").get();
    if (!aggregateSnapshot.exists) {
      return response({ ok: false, code: "FOUNDER_ENGAGEMENT_NOT_READY", error: "Founder product intelligence is not materialized yet." }, 503);
    }

    const aggregate = aggregateSnapshot.data() as Record<string, unknown>;
    const metrics = (aggregate.metrics ?? {}) as Record<string, unknown>;
    const attention = (aggregate.attention ?? {}) as Record<string, unknown>;
    const validation = (aggregate.validation ?? {}) as Record<string, unknown>;
    const engagement = (aggregate.engagement ?? {}) as Record<string, unknown>;

    let rows: ReturnType<typeof playerRow>[] = [];
    if (includeRows) {
      const players = await db.collection("users").where("role", "==", "player").get();
      rows = players.docs
        .map((document) => document.data() as FounderSafeAccount)
        .filter((account) => account.accessStatus === "active" && Number(account.chessCom?.playerId) > 0)
        .map(playerRow)
        .sort((left, right) => String(right.usage.lastActiveAt ?? "").localeCompare(String(left.usage.lastActiveAt ?? "")));
    }

    return response({
      ok: true,
      intelligence: {
        generatedAt: typeof aggregate.generatedAt === "string" ? aggregate.generatedAt : undefined,
        metrics: {
          activePlayers: count(metrics.activePlayers),
          reviewsForming: count(metrics.reviewsForming),
          reviewsReady: count(metrics.reviewsReady),
          followUpsDue: count(metrics.followUpsDue),
          notSeenRecently: count(metrics.notSeenRecently),
          unreadReplies: count(metrics.unreadReplies),
        },
        attention: {
          followUpsDue: count(attention.followUpsDue),
          unreadReplies: count(attention.unreadReplies),
          exceptions: count(attention.exceptions),
          identityConflicts: count(attention.identityConflicts),
        },
        engagement: {
          roomVisits: count(engagement.roomVisits),
          playersReturning: count(engagement.playersReturning),
          foregroundEngagedSeconds: count(engagement.foregroundEngagedSeconds),
          helpful: count(engagement.helpful),
          notHelpful: count(engagement.notHelpful),
          notesCreated: count(engagement.notesCreated),
          askQuestions: count(engagement.askQuestions),
          updatedAt: typeof engagement.updatedAt === "string" ? engagement.updatedAt : undefined,
        },
        validation: {
          playersServed: count(validation.playersServed),
          originalReviews: count(validation.originalReviews),
          liveReviews: count(validation.liveReviews),
          historicalPeriods: count(validation.historicalPeriods),
          totalReviewsProduced: count(validation.totalReviewsProduced),
          originalToLive: count(validation.originalToLive),
        },
        rows,
      },
    });
  } catch (error) {
    const classified = classifyBoardSignalHttpError(error);
    return response({ ok: false, code: classified.code, error: classified.message }, classified.status);
  }
}
