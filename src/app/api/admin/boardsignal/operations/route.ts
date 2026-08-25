import { NextResponse } from "next/server";
import { clearFounderFollowUpSnooze, founderOperationsSnapshot, markFounderContacted, snoozeFounderFollowUp } from "@/lib/boardsignal/server/founderOperations";
import { classifyBoardSignalHttpError } from "@/lib/boardsignal/server/firestoreService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const baseHeaders = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };
function response(body: unknown, status = 200, retryAfterSeconds?: number) {
  return NextResponse.json(body, { status, headers: { ...baseHeaders, ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}) } });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    // Amendment G.4.2: normal Founder landing/refresh is aggregate-only O(1).
    // Individual summaries are read only when the cohort/detail view explicitly asks for rows.
    const includeRows = url.searchParams.get("view") === "rows";
    return response({ ok: true, operations: await founderOperationsSnapshot(new Date(), includeRows) });
  } catch (error) {
    const classified = classifyBoardSignalHttpError(error);
    return response({ ok: false, code: classified.code, error: classified.message }, classified.status, classified.retryAfterSeconds);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; uid?: string; method?: string; days?: number };
    if (body.action === "markContacted") return response({ ok: true, founderOps: await markFounderContacted(body.uid, body.method) });
    if (body.action === "snooze") return response({ ok: true, founderOps: await snoozeFounderFollowUp(body.uid, body.days) });
    if (body.action === "clearSnooze") return response({ ok: true, result: await clearFounderFollowUpSnooze(body.uid) });
    return response({ ok: false, error: "Choose Mark Contacted, Snooze, or Clear Snooze." }, 400);
  } catch (error) {
    const classified = classifyBoardSignalHttpError(error);
    return response({ ok: false, code: classified.code, error: classified.message }, classified.status, classified.retryAfterSeconds);
  }
}
