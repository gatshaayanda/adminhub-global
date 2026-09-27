"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, RefreshCcw, ShieldCheck, ShieldX } from "lucide-react";

type CaseStatus = "open" | "awaiting_player" | "under_review" | "resolved" | "closed" | "rejected";
type CaseRow = {
  caseId: string; status: CaseStatus; createdAt?: string; updatedAt?: string; resolvedAt?: string;
  requestedChessCom?: { canonicalUsername?: string; playerId?: number };
  existingBoardSignalUid?: string;
  requester?: { googleReference?: string; verifiedEmail?: string };
  contact?: { method?: "email" | "discord"; value?: string };
};

function label(status: CaseStatus) {
  if (status === "awaiting_player") return "AWAITING PLAYER";
  if (status === "under_review") return "UNDER REVIEW";
  return status.toUpperCase();
}

export default function FounderIdentityAccessCases() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/boardsignal/identity-access", { cache: "no-store" });
      const body = await response.json() as { ok?: boolean; cases?: CaseRow[]; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Access / identity cases could not be loaded.");
      setCases(Array.isArray(body.cases) ? body.cases : []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Access / identity cases could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function mutate(row: CaseRow, action: "setStatus" | "connectRequesterGoogle", status?: CaseStatus) {
    if (busy) return;
    if (action === "connectRequesterGoogle" && !window.confirm(`Connect this requester Google identity to the EXISTING BoardSignal for ${row.requestedChessCom?.canonicalUsername ?? "this player"}? This keeps the exact UID and does not move Reviews, Notes, messages, contact data or social state.`)) return;
    setBusy(row.caseId); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/boardsignal/identity-access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, caseId: row.caseId, status }) });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "The access / identity case could not be updated.");
      setMessage(action === "connectRequesterGoogle" ? "Requester Google connected to the existing BoardSignal UID. No private account was recreated or migrated." : "Access / identity case updated.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The access / identity case could not be updated."); }
    finally { setBusy(null); }
  }

  const active = cases.filter((row) => !["resolved", "closed", "rejected"].includes(row.status));
  const completed = cases.filter((row) => ["resolved", "closed", "rejected"].includes(row.status));

  return <section className="desk-section pending-beta-requests">
    <div className="founder-directory-heading"><div><p className="kicker">ACCESS / IDENTITY CASES · {active.length}</p><h2>Real account collisions only.</h2><p>Ordinary Google onboarding and returning players never wait here. These cases exist only for a real collision, legacy continuity problem or identity mistake.</p></div><button className="button button-quiet" type="button" onClick={() => void load()} disabled={loading || busy !== null}><RefreshCcw size={15}/> Refresh</button></div>
    {error ? <p className="founder-access-error" role="alert">{error}</p> : null}
    {message ? <p className="form-success" role="status">{message}</p> : null}
    {loading ? <div className="founder-directory-loading"><LoaderCircle className="button-spinner"/> Loading access / identity cases</div> : active.length ? <div className="pending-request-grid">{active.map((row) => <article className="pending-request-card new-request-card" key={row.caseId}>
      <header><div className="universal-avatar"><ShieldCheck size={20}/></div><div><span className="request-new-label">{label(row.status)}</span><h3>{row.requestedChessCom?.canonicalUsername ?? "Chess.com identity"}</h3><code>Chess.com ID {row.requestedChessCom?.playerId ?? "—"}</code></div></header>
      <p>This is an access-resolution case, not a player approval request. The existing private BoardSignal stays closed until continuity is deliberately resolved.</p>
      <dl><div><dt>Existing BoardSignal UID</dt><dd><code>{row.existingBoardSignalUid ?? "Unavailable"}</code></dd></div><div><dt>Requester Google reference</dt><dd>{row.requester?.googleReference ?? "Unavailable"}</dd></div><div><dt>Google email metadata</dt><dd>{row.requester?.verifiedEmail ?? "Not available"} · not identity proof</dd></div><div><dt>Contact route</dt><dd>{row.contact?.method ?? "Not supplied"}{row.contact?.value ? `: ${row.contact.value}` : ""}</dd></div><div><dt>Created</dt><dd>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "Not recorded"}</dd></div></dl>
      <div className="founder-player-actions"><button className="button button-outline" type="button" disabled={busy !== null} onClick={() => void mutate(row, "setStatus", "awaiting_player")}>Mark awaiting player</button><button className="button button-outline" type="button" disabled={busy !== null} onClick={() => void mutate(row, "setStatus", "under_review")}>Mark under review</button><button className="button button-lime" type="button" disabled={busy !== null} onClick={() => void mutate(row, "connectRequesterGoogle")}>{busy === row.caseId ? <LoaderCircle className="button-spinner" size={14}/> : <Check size={14}/>} CONNECT REQUESTER GOOGLE TO EXISTING BOARDSIGNAL</button><button className="button button-quiet" type="button" disabled={busy !== null} onClick={() => void mutate(row, "setStatus", "rejected")}><ShieldX size={14}/> Reject / close invalid claim</button></div>
    </article>)}</div> : <div className="universe-empty"><p>No open access / identity cases. Ordinary player access does not require Founder approval.</p></div>}
    <div className="beta-universe-disclosure"><strong>WRONG CHESS.COM PROFILE CORRECTIONS FAIL CLOSED</strong><p>The guarded Google-connect action only attaches the requester Google identity to this exact existing UID after continuity is established. It never transfers Notes, private messages, contact details, consent settings or other human-created private content to another person. A genuinely wrong Chess.com mapping remains a controlled manual reconciliation unless the data boundary can be proven safe.</p></div>
    {completed.length ? <details className="founder-management-disclosure"><summary><span><strong>RESOLVED / CLOSED CASES</strong><small>{completed.length} historical access cases</small></span><span>OPEN</span></summary><div className="founder-secondary-body"><div className="founder-access-state-list">{completed.map((row) => <article key={row.caseId}><div><strong>{row.requestedChessCom?.canonicalUsername ?? row.caseId}</strong><small>{label(row.status)} · {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "No timestamp"}</small></div></article>)}</div></div></details> : null}
  </section>;
}
