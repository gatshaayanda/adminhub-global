import { NextResponse } from "next/server";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import {
  CurrentBoardSignalFeedbackError,
  recordCurrentBoardSignalFeedback,
} from "@/lib/boardsignal/server/currentFeedback";
import { classifyBoardSignalHttpError } from "@/lib/boardsignal/server/firestoreService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Pragma": "no-cache",
      "Vary": "Authorization",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function POST(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const body = await request.json().catch(() => ({}));
    const feedback = await recordCurrentBoardSignalFeedback(token.uid, body);
    return response({ ok: true, feedback });
  } catch (error) {
    if (error instanceof CurrentBoardSignalFeedbackError) {
      return response({ ok: false, code: error.code, error: error.message }, error.status);
    }
    const classified = classifyBoardSignalHttpError(error);
    return response({ ok: false, code: classified.code, error: classified.message }, classified.status);
  }
}
