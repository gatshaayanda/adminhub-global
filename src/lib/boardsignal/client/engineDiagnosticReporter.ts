import { toEngineDiagnosticTelemetry } from "../engineDiagnostics";
import type { EngineDiagnostic } from "../types";

export type EngineDiagnosticSender = (url: string, init: RequestInit) => Promise<unknown>;

const defaultSender: EngineDiagnosticSender = (url, init) => fetch(url, init);

export async function reportEngineDiagnostic(
  diagnostic: EngineDiagnostic,
  send: EngineDiagnosticSender = defaultSender,
): Promise<void> {
  try {
    await send("/api/boardsignal/engine-diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      keepalive: true,
      body: JSON.stringify(toEngineDiagnosticTelemetry(diagnostic)),
    });
  } catch {
    // Observability is deliberately non-blocking for Review generation and publication.
  }
}
