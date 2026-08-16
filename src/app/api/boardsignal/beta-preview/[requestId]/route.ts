import { NextResponse } from "next/server";
import { claimBetaPreviewAccess, publicBetaPreviewStatus, registerBetaPreviewNotificationDevice, verifyBetaPreviewStatusCredential } from "@/lib/boardsignal/server/activation";
import {
  rememberFoundingBetaApprovalDevice,
  retryFoundingBetaPreview,
  updateFoundingBetaReturnPreference,
  withFoundingBetaApprovalAlertStatus,
} from "@/lib/boardsignal/server/betaRequests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" } });
}

function requestId(value: string) {
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(value)) throw Object.assign(new Error("Preview request is invalid."), { status: 400 });
  return value;
}

function previewStatus(id: string, request: Record<string, unknown>) {
  return withFoundingBetaApprovalAlertStatus(
    publicBetaPreviewStatus(id, request),
    request as import("@/lib/boardsignal/server/betaRequests").FoundingBetaRequest,
  );
}

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const { requestId: rawRequestId } = await context.params;
    const id = requestId(rawRequestId);
    const body = await request.json() as { action?: unknown; statusToken?: unknown; method?: unknown; contactValue?: unknown; betaContactConsent?: unknown; fcmToken?: unknown; userAgent?: unknown };
    const action = String(body.action ?? "status");
    if (action === "claim") {
      const claim = await claimBetaPreviewAccess(id, body.statusToken);
      return response({ ok: true, customToken: claim.customToken, claimedAt: claim.claimedAt });
    }
    if (action === "registerDevice") {
      await registerBetaPreviewNotificationDevice({ requestId: id, statusToken: body.statusToken, fcmToken: body.fcmToken, userAgent: body.userAgent });
      await rememberFoundingBetaApprovalDevice({ requestId: id, statusToken: body.statusToken });
      const verified = await verifyBetaPreviewStatusCredential(id, body.statusToken);
      const refreshed = await verified.ref.get();
      const data = refreshed.data() as Record<string, unknown>;
      return response({ ok: true, status: previewStatus(id, data) });
    }
    if (action === "updateReturn") {
      await updateFoundingBetaReturnPreference({ requestId: id, statusToken: body.statusToken, method: body.method, contactValue: body.contactValue, betaContactConsent: body.betaContactConsent });
      const verified = await verifyBetaPreviewStatusCredential(id, body.statusToken);
      const refreshed = await verified.ref.get();
      const data = refreshed.data() as Record<string, unknown>;
      return response({ ok: true, status: previewStatus(id, data) });
    }
    const verified = await verifyBetaPreviewStatusCredential(id, body.statusToken);
    if (action === "retryPreview") {
      await retryFoundingBetaPreview(id);
      const refreshed = await verified.ref.get();
      const data = refreshed.data() as Record<string, unknown>;
      return response({ ok: true, status: previewStatus(id, data) });
    }
    if (action !== "status") return response({ ok: false, error: "Unknown preview action." }, 400);
    return response({ ok: true, status: previewStatus(id, verified.request) });
  } catch (error) {
    return response({ ok: false, code: String((error as { code?: string }).code ?? "BETA_PREVIEW_FAILED"), error: error instanceof Error ? error.message : "BoardSignal preview is unavailable." }, Number((error as { status?: number }).status ?? 500));
  }
}
