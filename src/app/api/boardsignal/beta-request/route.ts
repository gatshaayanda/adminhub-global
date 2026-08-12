import { NextResponse } from "next/server";
import { submitFoundingBetaRequest } from "@/lib/boardsignal/server/betaRequests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
      ...(status === 429 ? { "Retry-After": "3600" } : {}),
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      username?: unknown;
      preferredContactMethod?: unknown;
      preferredContactValue?: unknown;
      betaContactConsent?: unknown;
      source?: unknown;
      shareMomentId?: unknown;
    };
    const betaRequest = await submitFoundingBetaRequest({
      request,
      username: body.username,
      preferredContactMethod: body.preferredContactMethod,
      preferredContactValue: body.preferredContactValue,
      betaContactConsent: body.betaContactConsent,
      source: body.source,
      shareMomentId: body.shareMomentId,
    });
    return response({
      ok: true,
      request: {
        id: betaRequest.id,
        chessPlayerId: betaRequest.chessPlayerId,
        canonicalUsername: betaRequest.canonicalUsername,
        requestedAt: betaRequest.requestedAt,
        status: betaRequest.status,
      },
    }, 201);
  } catch (error) {
    const status = Number((error as { status?: number }).status ?? 500);
    return response({ ok: false, error: error instanceof Error ? error.message : "Founding Beta request could not be submitted." }, status);
  }
}
