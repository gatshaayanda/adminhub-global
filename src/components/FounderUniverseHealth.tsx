"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCcw } from "lucide-react";
import type { UniverseV2Health } from "@/lib/boardsignal/server/universePulse";

type ActivationProof = {
  available: boolean;
  phase: string;
  readAuthority: string;
  playerId?: string;
  periodEnd?: string;
  privacySafe?: boolean;
};
type HealthResponse = { ok?: boolean; health?: UniverseV2Health; proof?: ActivationProof; error?: string };
type Action = "migratePage" | "repairPage" | "certify" | "cutover" | "rollback";

function phaseLabel(value?: string) { return (value ?? "v1").toUpperCase(); }

export default function FounderUniverseHealth() {
  const [health, setHealth] = useState<UniverseV2Health>();
  const [proof, setProof] = useState<ActivationProof>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/boardsignal/universe-health", { cache: "no-store" });
      const body = await response.json() as HealthResponse;
      if (!response.ok || !body.ok || !body.health) throw new Error(body.error ?? "Universe health unavailable.");
      setHealth(body.health); setProof(body.proof); setError(undefined);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Universe health unavailable."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const run = useCallback(async (action: Action) => {
    const destructive = action === "cutover" || action === "rollback";
    if (destructive && !window.confirm(`Confirm BoardSignal Universe ${action}.`)) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/boardsignal/universe-health", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? `Universe ${action} failed.`);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : `Universe ${action} failed.`); setLoading(false); }
  }, [refresh]);

  return <details className="founder-secondary-group" open>
    <summary><span><strong>UNIVERSE SCALE</strong><small>Incremental v2 materialization health and explicit cutover authority</small></span><span>{phaseLabel(health?.phase)}</span></summary>
    <div className="founder-secondary-body">
      <div className="founder-ops-heading"><div><p className="kicker">P2 · GROWING UNIVERSE</p><h2>Universe materialization.</h2><p>Founder-only compact health. Page load reads materialized state only; migration and cutover run only from explicit actions.</p></div><button className="button button-quiet" type="button" onClick={() => void refresh()} disabled={loading}>{loading ? <LoaderCircle className="button-spinner" size={15}/> : <RefreshCcw size={15}/>} Refresh</button></div>
      {error ? <p role="alert">{error}</p> : null}
      <div className="founder-traffic-metrics">
        <article><span>AUTHORITY</span><strong>{health?.readAuthority?.toUpperCase() ?? "V1"}</strong></article>
        <article><span>OFFICIAL PLAYERS</span><strong>{health?.officialPlayerCount ?? health?.v1OfficialPlayerCount ?? "—"}</strong></article>
        <article><span>INDEXED V2</span><strong>{health?.indexedPlayerCount ?? 0}</strong></article>
        <article><span>REPAIR REQUIRED</span><strong>{health?.repairRequiredCount ?? 0}</strong></article>
      </div>
      <p className="founder-data-completeness">Phase {health?.phase ?? "v1"} · source {health?.sourceExhausted ? "exhausted" : "not exhausted"} · stale boards {health?.staleBoardCount ?? 0} · cursor {health?.migrationCursor ?? "—"} · updated {health?.updatedAt ? new Date(health.updatedAt).toLocaleString() : "—"}.</p>
      {proof?.available ? <p className="founder-data-completeness">Activation proof · player {proof.playerId} · period {proof.periodEnd ?? "—"} · privacy {proof.privacySafe ? "SAFE" : "CHECK"}.</p> : null}
      <div className="founder-traffic-controls" role="group" aria-label="Universe v2 operations">
        <button type="button" onClick={() => void run("migratePage")} disabled={loading || health?.phase === "v2-active"}>MIGRATE PAGE</button>
        <button type="button" onClick={() => void run("repairPage")} disabled={loading || health?.phase === "v2-active"}>REPAIR PAGE</button>
        <button type="button" onClick={() => void run("certify")} disabled={loading || health?.phase !== "migrating"}>CERTIFY</button>
        <button type="button" onClick={() => void run("cutover")} disabled={loading || health?.phase !== "v2-ready"}>CUT OVER</button>
        <button type="button" onClick={() => void run("rollback")} disabled={loading || health?.phase === "v2-active"}>ROLL BACK</button>
      </div>
    </div>
  </details>;
}
