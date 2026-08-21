import { NextResponse } from "next/server";
import {
  claimHistoricalBackfillWork,
  markHistoricalBackfillRetryable,
  markHistoricalBackfillSlot,
} from "@/lib/boardsignal/server/historyBackfill";
import { accountForToken, requirePlayerToken } from "@/lib/boardsignal/server/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" } });
}

export async function GET(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const account = await accountForToken(token);
    const work = await claimHistoricalBackfillWork(token);
    return response({ ok: true, username: account.chessCom.canonicalUsername, work });
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Recent Review history could not be prepared." }, Number((error as { status?: number }).status ?? 500));
  }
}

export async function POST(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const body = await request.json() as { action?: "noActivity" | "retryable" | "published"; leaseId?: string; periodStart?: string; error?: string };
    if (!body.leaseId || !body.periodStart) return response({ ok: false, error: "Historical Review claim is required." }, 400);
    if (body.action === "noActivity") return response({ ok: true, state: await markHistoricalBackfillSlot(token, { leaseId: body.leaseId, periodStart: body.periodStart, status: "no_activity" }) });
    if (body.action === "published") return response({ ok: true, state: await markHistoricalBackfillSlot(token, { leaseId: body.leaseId, periodStart: body.periodStart, status: "published" }) });
    if (body.action === "retryable") return response({ ok: true, state: await markHistoricalBackfillRetryable(token, { leaseId: body.leaseId, periodStart: body.periodStart, error: body.error }) });
    return response({ ok: false, error: "Unknown historical Review action." }, 400);
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Recent Review history could not be updated." }, Number((error as { status?: number }).status ?? 500));
  }
}
