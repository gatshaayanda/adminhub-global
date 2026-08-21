import { NextResponse } from "next/server";
import { addReviewDays, parseHistoricalRequestAnchor } from "@/lib/boardsignal/historyBackfill";
import { buildLiveDesk } from "@/lib/boardsignal/processor";
import type { DeskApiResponse } from "@/lib/boardsignal/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  try {
    const requestedAnchor = new URL(request.url).searchParams.get("anchorStart") ?? undefined;
    const historical = parseHistoricalRequestAnchor(requestedAnchor);
    const referenceDate = historical.periodStart
      ? new Date(`${addReviewDays(historical.periodStart, 7)}T00:00:00.000Z`)
      : undefined;
    const desk = await buildLiveDesk(decodeURIComponent(username), {
      anchorStart: historical.cadenceAnchor,
      referenceDate,
    });
    return NextResponse.json<DeskApiResponse>({ ok: true, desk }, {
      headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "BoardSignal could not build this Review.";
    const errorCode = (error as { code?: string }).code;
    const status = (error as { status?: number }).status === 404 ? 404 : 422;
    return NextResponse.json<DeskApiResponse>({ ok: false, error: message, code: status === 404 ? "PLAYER_NOT_FOUND" : errorCode ?? "PROCESSING_FAILED" }, {
      status,
      headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" },
    });
  }
}
