import { NextResponse } from "next/server";
import { accountForToken, requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import { classifyBoardSignalHttpError } from "@/lib/boardsignal/server/firestoreService";
import { getAdminDb } from "@/utils/firebaseAdmin";

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

type ReviewEngagement = {
  latestOpenedReviewKey?: string;
  latestOpenedAt?: string;
  latestOpenedPeriodLabel?: string;
};

type AccountWithReviewEngagement = Awaited<ReturnType<typeof accountForToken>> & {
  reviewEngagement?: ReviewEngagement;
};

type StoredDesk = {
  deskKey?: string;
  publishedAt?: string;
  summary?: { deskKey?: string; periodLabel?: string };
};

export async function POST(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const account = await accountForToken(token) as AccountWithReviewEngagement;
    const db = getAdminDb();
    const latest = await db.collection("users").doc(account.uid).collection("desks").orderBy("periodEnd", "desc").limit(1).get();
    if (latest.empty) return response({ ok: true, recorded: false, reviewKey: null, reason: "no_published_review" });

    const document = latest.docs[0];
    const data = document.data() as StoredDesk;
    const reviewKey = String(data.deskKey ?? data.summary?.deskKey ?? document.id);
    if (!reviewKey) return response({ ok: true, recorded: false, reviewKey: null, reason: "review_key_unavailable" });

    if (account.reviewEngagement?.latestOpenedReviewKey === reviewKey) {
      return response({ ok: true, recorded: false, reviewKey, firstOpenedAt: account.reviewEngagement.latestOpenedAt, reason: "already_recorded" });
    }

    const openedAt = new Date().toISOString();
    const reviewEngagement: ReviewEngagement = {
      latestOpenedReviewKey: reviewKey,
      latestOpenedAt: openedAt,
      ...(data.summary?.periodLabel ? { latestOpenedPeriodLabel: data.summary.periodLabel } : {}),
    };
    await db.collection("users").doc(account.uid).set({ reviewEngagement }, { merge: true });
    return response({ ok: true, recorded: true, reviewKey, firstOpenedAt: openedAt });
  } catch (error) {
    const classified = classifyBoardSignalHttpError(error);
    return response({ ok: false, code: classified.code, error: classified.message }, classified.status, classified.retryAfterSeconds);
  }
}
