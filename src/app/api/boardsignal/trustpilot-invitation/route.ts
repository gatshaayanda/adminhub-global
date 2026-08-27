import { NextResponse } from "next/server";
import type { BoardSignalAccount } from "@/lib/boardsignal/account";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import { classifyBoardSignalHttpError } from "@/lib/boardsignal/server/firestoreService";
import { getAdminDb } from "@/utils/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVITATION_SOURCE = "InvitationScript" as const;
const ROLLING_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;
const RESERVATION_RETRY_MS = 24 * 60 * 60 * 1000;
// Trustpilot Free currently includes 50 automated invitations/month. BoardSignal
// deliberately stops at 45 in any rolling 31-day window so manual/test invitations
// still have headroom and a calendar-boundary burst cannot unexpectedly hit the plan cap.
const BOARD_SIGNAL_ROLLING_INVITATION_LIMIT = 45;
const FOUNDER_USERNAME = (process.env.BOARDSIGNAL_FOUNDER_CHESS_USERNAME ?? "ayandakopano").trim().toLowerCase();

type TrustpilotInvitationState = {
  referenceId: string;
  reservedAt: string;
  confirmedAt?: string;
  source: typeof INVITATION_SOURCE;
};

type TrustpilotUser = BoardSignalAccount & {
  trustpilotReviewInvitation?: TrustpilotInvitationState;
};

type InvitationLedger = {
  recentInvitationTimestamps?: string[];
};

type TrustpilotPayload = {
  recipientEmail: string;
  recipientName: string;
  referenceId: string;
  source: typeof INVITATION_SOURCE;
};

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function validEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function invitationPayload(account: TrustpilotUser, email: string, referenceId: string): TrustpilotPayload {
  return {
    recipientEmail: email.trim(),
    recipientName: account.chessCom.canonicalUsername,
    referenceId,
    source: INVITATION_SOURCE,
  };
}

export async function POST(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const body = await request.json().catch(() => ({})) as { action?: "prepare" | "confirm" };
    const action = body.action ?? "prepare";
    const db = getAdminDb();
    const userRef = db.collection("users").doc(token.uid);

    if (action === "confirm") {
      const now = new Date().toISOString();
      const snapshot = await userRef.get();
      const invitation = snapshot.data()?.trustpilotReviewInvitation as TrustpilotInvitationState | undefined;
      if (!snapshot.exists || !invitation?.referenceId) return response({ ok: false, status: "not_reserved" }, 409);
      await userRef.update({ "trustpilotReviewInvitation.confirmedAt": now });
      return response({ ok: true, status: "confirmed" });
    }

    if (action !== "prepare") return response({ ok: false, status: "unknown_action" }, 400);
    if (!validEmail(token.email)) return response({ ok: true, status: "no_email" });

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const ledgerRef = db.collection("integrations").doc("trustpilot-review-invitations");

    const prepared = await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists) return { status: "not_eligible" as const };
      const account = userSnapshot.data() as TrustpilotUser;
      if (account.accessStatus !== "active") return { status: "not_eligible" as const };
      if (account.chessCom?.canonicalUsername?.trim().toLowerCase() === FOUNDER_USERNAME) {
        return { status: "excluded" as const };
      }
      if ((account.reviewProduction?.totalReviews ?? 0) < 1) return { status: "not_eligible" as const };

      const existing = account.trustpilotReviewInvitation;
      if (existing?.confirmedAt) return { status: "already_queued" as const };
      if (existing?.referenceId && existing.reservedAt) {
        const reservedAtMs = Date.parse(existing.reservedAt);
        if (Number.isFinite(reservedAtMs) && nowMs - reservedAtMs < RESERVATION_RETRY_MS) {
          return {
            status: "already_reserved" as const,
            retryAfter: new Date(reservedAtMs + RESERVATION_RETRY_MS).toISOString(),
          };
        }
        transaction.set(userRef, {
          trustpilotReviewInvitation: { ...existing, reservedAt: nowIso },
        }, { merge: true });
        return {
          status: "ready" as const,
          payload: invitationPayload(account, token.email!, existing.referenceId),
        };
      }

      const ledgerSnapshot = await transaction.get(ledgerRef);
      const ledger = ledgerSnapshot.exists ? ledgerSnapshot.data() as InvitationLedger : {};
      const activeTimestamps = (ledger.recentInvitationTimestamps ?? [])
        .filter((value) => typeof value === "string")
        .filter((value) => {
          const parsed = Date.parse(value);
          return Number.isFinite(parsed) && nowMs - parsed < ROLLING_WINDOW_MS;
        })
        .sort();

      if (activeTimestamps.length >= BOARD_SIGNAL_ROLLING_INVITATION_LIMIT) {
        const oldest = Date.parse(activeTimestamps[0]);
        return {
          status: "monthly_limit" as const,
          retryAfter: new Date(oldest + ROLLING_WINDOW_MS).toISOString(),
        };
      }

      const referenceId = `boardsignal-${account.chessCom.playerId}-first-review`;
      const invitation: TrustpilotInvitationState = {
        referenceId,
        reservedAt: nowIso,
        source: INVITATION_SOURCE,
      };
      transaction.set(userRef, { trustpilotReviewInvitation: invitation }, { merge: true });
      transaction.set(ledgerRef, {
        recentInvitationTimestamps: [...activeTimestamps, nowIso],
        rollingWindowDays: 31,
        boardSignalSafetyLimit: BOARD_SIGNAL_ROLLING_INVITATION_LIMIT,
        updatedAt: nowIso,
      }, { merge: true });

      return {
        status: "ready" as const,
        payload: invitationPayload(account, token.email!, referenceId),
      };
    });

    return response({ ok: true, ...prepared });
  } catch (error) {
    const classified = classifyBoardSignalHttpError(error);
    return response({ ok: false, code: classified.code, error: classified.message }, classified.status);
  }
}
