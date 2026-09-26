import { NextResponse } from "next/server";
import { sanitizeEngineDiagnosticTelemetry } from "@/lib/boardsignal/engineDiagnostics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    const diagnostic = sanitizeEngineDiagnosticTelemetry(await request.json());
    if (!diagnostic) {
      return NextResponse.json({ error: "Invalid engine diagnostic." }, { status: 400, headers: noStore });
    }
    console.warn("[BoardSignal] position-review diagnostic", diagnostic);
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Invalid engine diagnostic." }, { status: 400, headers: noStore });
  }
}
