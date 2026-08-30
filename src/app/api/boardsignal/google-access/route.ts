import { NextResponse } from "next/server";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import {
  linkGoogleAccess,
  requestGoogleIdentityHelp,
  returnWithGoogle,
} from "@/lib/boardsignal/server/googleAccess";
import {
  claimGoogleOnboardingProfile,
  resolveGoogleOnboardingProfile,
} from "@/lib/boardsignal/server/googleOnboarding";
import { refreshFounderPlayerSummaryByUid } from "@/lib/boardsignal/server/founderOperations";
import { getAdminDb } from "@/utils/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoogleAccessOrigin = "new_player_via_google" | "existing_player_linked_google";

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

async function recordGoogleAccessOrigin(uid: string, origin: GoogleAccessOrigin, overwrite = false) {
  const ref = getAdminDb().collection("users").doc(uid);
  await getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return;
    const current = String(snapshot.data()?.googleAccessOrigin ?? "");
    if (!overwrite && current) return;
    transaction.set(ref, { googleAccessOrigin: origin }, { merge: true });
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
      // Google is only a return key here. It must never create/increment a player.
      await recordGoogleAccessOrigin(playerToken.uid, "existing_player_linked_google").catch(() => undefined);
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
      if (result.created) {
        // This is the only Google path allowed to add a BoardSignal player.
        await recordGoogleAccessOrigin(result.uid, "new_player_via_google", true).catch(() => undefined);
        // Founder/public player truth must move with the canonical player creation.
        // Telemetry failure must never block the player from entering BoardSignal.
        await refreshFounderPlayerSummaryByUid(result.uid).catch(() => undefined);
      }
      return response({ ok: true, result }, result.created ? 201 : 200);
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
        message: "Your ownership-review request was received. This did not grant, replace, merge, transfer or expose a private BoardSignal account.",
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
