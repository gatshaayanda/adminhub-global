import { NextResponse } from "next/server";
import { submitFoundingBetaRequest } from "@/lib/boardsignal/server/betaRequests";
import {
  founderPendingSummaryFromInput,
  upsertFounderPendingRequestSummary,
} from "@/lib/boardsignal/server/founderMaterialized";
import { logReadBudget, serviceHttpError } from "@/lib/boardsignal/server/firestoreService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200, retryAfter?: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
      ...(status === 429 ? { "Retry-After": "3600" } : retryAfter ? { "Retry-After": String(retryAfter) } : {}),
    },
  });
}

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const body = await request.json() as {
      username?: unknown;
      preferredContactMethod?: unknown;
      preferredContactValue?: unknown;
      betaContactConsent?: unknown;
      source?: unknown;
      shareMomentId?: unknown;
    };
    const result = await submitFoundingBetaRequest({
      request,
      username: body.username,
      preferredContactMethod: body.preferredContactMethod,
      preferredContactValue: body.preferredContactValue,
      betaContactConsent: body.betaContactConsent,
      source: body.source,
      shareMomentId: body.shareMomentId,
    });

    // Derived Founder state is best-effort and idempotent. It can never turn a
    // successfully persisted core betaRequest into an API failure.
    if (result.request.status === "pending") {
      await upsertFounderPendingRequestSummary(founderPendingSummaryFromInput(result.request)).catch(() => undefined);
    }
    logReadBudget({ operation: "beta_request", durationMs: Date.now() - started });
    return response({
      ok: true,
      existingState: result.existingState,
      statusToken: result.statusToken,
      preview: result.preview,
      previewError: result.previewError,
      request: {
        id: result.request.id,
        chessPlayerId: result.request.chessPlayerId,
        canonicalUsername: result.request.canonicalUsername,
        avatar: result.request.avatar,
        profileUrl: result.request.profileUrl,
        requestedAt: result.request.requestedAt,
        status: result.request.status,
      },
    }, result.existingState ? 200 : 201);
  } catch (error) {
    const service = serviceHttpError(error);
    if (service) return response({ ok: false, code: String((service as { code?: string }).code), error: service.message }, 503, Number((service as { retryAfterSeconds?: number }).retryAfterSeconds ?? 15));
    const status = Number((error as { status?: number }).status ?? 500);
    return response({ ok: false, code: String((error as { code?: string }).code ?? "BETA_REQUEST_FAILED"), error: error instanceof Error ? error.message : "Founding Access request could not be submitted." }, status);
  }
}
