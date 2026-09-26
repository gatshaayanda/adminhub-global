import { NextResponse } from "next/server";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import {
  ReviewJournalError,
  addReviewJournalNote,
  deleteReviewJournalNote,
  editReviewJournalNote,
} from "@/lib/boardsignal/server/reviewJournal";
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

function failure(error: unknown) {
  if (error instanceof ReviewJournalError) return response({ ok: false, code: error.code, error: error.message }, error.status);
  const classified = classifyBoardSignalHttpError(error);
  return response({ ok: false, code: classified.code, error: classified.message }, classified.status);
}

export async function POST(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const body = await request.json().catch(() => ({}));
    const journal = await addReviewJournalNote(token.uid, body);
    return response({ ok: true, journal });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const body = await request.json().catch(() => ({}));
    const journal = await editReviewJournalNote(token.uid, body);
    return response({ ok: true, journal });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const body = await request.json().catch(() => ({}));
    const journal = await deleteReviewJournalNote(token.uid, body);
    return response({ ok: true, journal });
  } catch (error) {
    return failure(error);
  }
}
