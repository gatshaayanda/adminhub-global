import { NextResponse } from "next/server";
import type { CommunicationCampaignDraft } from "@/lib/boardsignal/communications";
import {
  founderConversation,
  founderReply,
  listFounderCommunications,
  previewFounderCampaign,
  sendFounderCampaign,
} from "@/lib/boardsignal/server/communications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" } });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const uid = url.searchParams.get("uid");
    const threadId = url.searchParams.get("threadId");
    if (uid && threadId) return response({ ok: true, conversation: await founderConversation(uid, threadId) });
    return response({ ok: true, ...(await listFounderCommunications()) });
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Founder Communications could not be loaded." }, Number((error as { status?: number }).status ?? 500));
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      action?: "preview" | "send" | "reply";
      draft?: CommunicationCampaignDraft;
      uid?: unknown;
      threadId?: unknown;
      body?: unknown;
    };
    if (body.action === "preview" && body.draft) return response({ ok: true, preview: await previewFounderCampaign(body.draft) });
    if (body.action === "send" && body.draft) return response({ ok: true, campaign: await sendFounderCampaign(body.draft) });
    if (body.action === "reply") return response({ ok: true, result: await founderReply(body.uid, body.threadId, body.body) });
    return response({ ok: false, error: "Choose Preview, Send, or Reply." }, 400);
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Founder Communications update failed." }, Number((error as { status?: number }).status ?? 500));
  }
}
