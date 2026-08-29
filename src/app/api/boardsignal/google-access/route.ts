import { NextResponse } from "next/server";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import {
  linkGoogleAccess,
  requestGoogleIdentityHelp,
  returnWithGoogle,
} from "@/lib/boardsignal/server/googleAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      action?: unknown;
      googleIdToken?: unknown;
      expectedPlayerId?: unknown;
      username?: unknown;
      caseContactMethod?: unknown;
      caseContactValue?: unknown;
    };
    const action = String(body.action ?? "return");

    if (action === "link") {
      const playerToken = await requirePlayerToken(request);
      const result = await linkGoogleAccess(playerToken, body.googleIdToken);
      return response({ ok: true, result });
    }
    if (action === "return") {
      const result = await returnWithGoogle(body.googleIdToken, body.expectedPlayerId);
      return response({ ok: true, result });
    }
    if (action === "identityHelp") {
      const result = await requestGoogleIdentityHelp(
        body.googleIdToken,
        body.username,
        body.caseContactMethod,
        body.caseContactValue,
      );
      return response({
        ok: true,
        status: "received",
        result,
        message: "Your identity case was received. This did not grant, replace, merge, transfer or expose a private BoardSignal account.",
      });
    }

    return response({ ok: false, code: "GOOGLE_ACCESS_ACTION_INVALID", error: "Choose a supported Google access action." }, 400);
  } catch (error) {
    const status = Number((error as { status?: number }).status ?? 500);
    return response({
      ok: false,
      code: String((error as { code?: string }).code ?? "GOOGLE_ACCESS_FAILED"),
      error: error instanceof Error ? error.message : "Google access could not be completed.",
    }, Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500);
  }
}
