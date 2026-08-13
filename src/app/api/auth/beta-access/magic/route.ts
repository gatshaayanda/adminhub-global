import { NextResponse } from "next/server";
import { consumeBetaMagicTicket } from "@/lib/boardsignal/server/activation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { ticket?: unknown };
    const result = await consumeBetaMagicTicket(body.ticket);
    return response({ ok: true, customToken: result.customToken, canonicalUsername: result.canonicalUsername });
  } catch (error) {
    return response({ ok: false, code: String((error as { code?: string }).code ?? "MAGIC_ACCESS_FAILED"), error: error instanceof Error ? error.message : "BoardSignal access could not be completed." }, Number((error as { status?: number }).status ?? 500));
  }
}
