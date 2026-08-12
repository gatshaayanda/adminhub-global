import { NextResponse } from "next/server";
import { hasAcceptedCurrentBetaAgreement } from "@/lib/boardsignal/account";
import { buildCurrentEpisodeSummary } from "@/lib/boardsignal/processor";
import {
  acceptFoundingBetaAgreement,
  accountForToken,
  buildPlayerRoomSnapshot,
  publishPrivateDesk,
  requirePlayerToken,
  updatePlayerPreferences,
} from "@/lib/boardsignal/server/persistence";
import type { BoardSignalDesk, DeskEngineResult } from "@/lib/boardsignal/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" } });
}

export async function GET(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const account = await accountForToken(token);
    if (!hasAcceptedCurrentBetaAgreement(account)) {
      return response({
        ok: true,
        snapshot: {
          account,
          desks: [],
          progress: [],
          recurringPatterns: [],
          personalRecords: {
            desksCompleted: 0,
            personalBestWinRun: 0,
            largestPoolSpecificRatingClimb: {},
          },
          generationRequired: false,
        },
      });
    }
    let currentEpisode;
    let progressUnavailable;
    try {
      currentEpisode = await buildCurrentEpisodeSummary(account.chessCom.canonicalUsername, { anchorStart: account.cadenceAnchor });
    } catch (error) {
      progressUnavailable = error instanceof Error ? error.message : "Current episode progress is temporarily unavailable.";
    }
    return response({ ok: true, snapshot: await buildPlayerRoomSnapshot(token, currentEpisode, progressUnavailable) });
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Player Room could not be loaded." }, Number((error as { status?: number }).status ?? 500));
  }
}

export async function POST(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const body = await request.json() as {
      action?: "acceptAgreement" | "publishDesk" | "updatePreferences";
      desk?: BoardSignalDesk;
      engineResults?: Record<string, DeskEngineResult>;
      privacy?: import("@/lib/boardsignal/account").BoardSignalPrivacySettings;
      notificationPreferences?: import("@/lib/boardsignal/account").BoardSignalNotificationPreferences;
      contact?: {
        preferredContactMethod: import("@/lib/boardsignal/account").BoardSignalContactMethod;
        preferredContactValue: string;
        betaContactConsent: boolean;
      };
    };
    if (body.action === "acceptAgreement") {
      return response({ ok: true, account: await acceptFoundingBetaAgreement(token) });
    }
    if (body.action === "publishDesk" && body.desk && body.engineResults) {
      return response({ ok: true, publication: await publishPrivateDesk(token, body.desk, body.engineResults) });
    }
    if (body.action === "updatePreferences" && body.privacy && body.notificationPreferences) {
      return response({ ok: true, preferences: await updatePlayerPreferences(token, body.privacy, body.notificationPreferences, body.contact) });
    }
    return response({ ok: false, error: "Unknown Player Room action." }, 400);
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Player Room update failed." }, Number((error as { status?: number }).status ?? 500));
  }
}
