import { NextResponse } from "next/server";
import {
  listPlayerConversation,
  listPlayerInbox,
  markInboxMessageRead,
  registerPlayerPushToken,
  replyToFounder,
  unregisterPlayerPushToken,
} from "@/lib/boardsignal/server/communications";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" } });
}

export async function GET(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const url = new URL(request.url);
    const threadId = url.searchParams.get("threadId");
    if (threadId) return response({ ok: true, conversation: await listPlayerConversation(token, threadId) });
    return response({ ok: true, inbox: await listPlayerInbox(token) });
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Inbox could not be loaded." }, Number((error as { status?: number }).status ?? 500));
  }
}

export async function POST(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const body = await request.json() as {
      action?: "markRead" | "reply" | "registerPush" | "unregisterPush";
      messageId?: unknown;
      threadId?: unknown;
      body?: unknown;
      fcmToken?: unknown;
      userAgent?: unknown;
    };
    if (body.action === "markRead") return response({ ok: true, result: await markInboxMessageRead(token, body.messageId) });
    if (body.action === "reply") return response({ ok: true, message: await replyToFounder(token, body.threadId, body.body) });
    if (body.action === "registerPush") return response({ ok: true, result: await registerPlayerPushToken(token, body.fcmToken, body.userAgent) });
    if (body.action === "unregisterPush") return response({ ok: true, result: await unregisterPlayerPushToken(token, body.fcmToken) });
    return response({ ok: false, error: "Unknown Inbox action." }, 400);
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Inbox update failed." }, Number((error as { status?: number }).status ?? 500));
  }
}
