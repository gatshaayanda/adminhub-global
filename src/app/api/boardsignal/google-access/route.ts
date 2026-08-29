import { NextResponse } from "next/server";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import {
  linkGoogleAccess,
  returnWithGoogle,
} from "@/lib/boardsignal/server/googleAccess";
import {
  claimGoogleOnboardingProfile,
  requestGoogleIdentityHelp,
  resolveGoogleOnboardingProfile,
} from "@/lib/boardsignal/server/googleOnboarding";

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
      contactMethod?: unknown;
      contactValue?: unknown;
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
    if (action === "resolveProfile") {
      const result = await resolveGoogleOnboardingProfile(body.googleIdToken, body.username);
      return response({ ok: true, result });
    }
    if (action === "claimProfile") {
      const result = await claimGoogleOnboardingProfile(body.googleIdToken, body.username);
      return response({ ok: true, result }, result.created ? 201 : 200);
    }
    if (action === "identityHelp") {
      await requestGoogleIdentityHelp(body.googleIdToken, body.username, body.contactMethod, body.contactValue);
      // Deliberately generic: do not reveal additional private account state.
      return response({
        ok: true,
        status: "received",
        message: "Your ownership-review request was received. This did not grant, replace, merge or expose a private BoardSignal account.",
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
