"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import { clearSavedBetaPreviewReturn, loadSavedBetaPreviewReturn, saveBetaPreviewReturn, type BetaPreviewReturnRecord } from "@/lib/boardsignal/previewReturn";
import type { BetaPreviewStatus } from "@/lib/boardsignal/activation";

type UsernameDeskFormProps = { compact?: boolean };

export default function UsernameDeskForm({ compact = false }: UsernameDeskFormProps) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [existingActive, setExistingActive] = useState<{ username: string } | null>(null);
  const [existingRequest, setExistingRequest] = useState<{ username: string; state: "pending" | "approved_unclaimed" } | null>(null);
  const [savedPreview, setSavedPreview] = useState<BetaPreviewReturnRecord>();
  const [savedPreviewReady, setSavedPreviewReady] = useState(false);
  const [shareMomentId, setShareMomentId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") === "boardSignalShare") setShareMomentId(params.get("shareMomentId") ?? "");
    const saved = loadSavedBetaPreviewReturn();
    setSavedPreview(saved);
    if (!saved) return;
    void (async () => {
      try {
        const response = await fetch(`/api/boardsignal/beta-preview/${encodeURIComponent(saved.requestId)}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
          body: JSON.stringify({ action: "status", statusToken: saved.statusCredential }),
        });
        const body = await response.json() as { ok?: boolean; status?: BetaPreviewStatus };
        if (!response.ok || !body.ok || !body.status || ["rejected", "expired", "claimed"].includes(body.status.state)) {
          clearSavedBetaPreviewReturn(saved.requestId);
          setSavedPreview(undefined);
          return;
        }
        setSavedPreviewReady(body.status.state === "approved" && body.status.accessReady);
      } catch { /* a temporary network failure should not erase same-device Preview continuity */ }
    })();
  }, []);

  async function trackShareAttribution(eventType: "beta_request_started" | "beta_request_submitted") {
    if (!shareMomentId) return;
    try {
      await fetch(`/api/boardsignal/share/${encodeURIComponent(shareMomentId)}/track`, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ eventType, source: "boardSignalShare" }) });
    } catch { /* onboarding never depends on attribution */ }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanUsername = username.trim().replace(/^@/, "");
    if (!cleanUsername) { setError("Enter your Chess.com username."); return; }
    setBusy(true); setError(""); setExistingActive(null); setExistingRequest(null);
    if (shareMomentId) void trackShareAttribution("beta_request_started");
    try {
      const response = await fetch("/api/boardsignal/beta-request", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ username: cleanUsername, source: shareMomentId ? "boardSignalShare" : undefined, shareMomentId: shareMomentId || undefined }),
      });
      const body = await response.json() as { ok?: boolean; error?: string; existingState?: "active_account" | "pending" | "approved_unclaimed"; statusToken?: string; request?: { id?: string; canonicalUsername?: string; requestedAt?: string } };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "BoardSignal could not start this Preview.");
      if (shareMomentId) void trackShareAttribution("beta_request_submitted");
      if (body.existingState === "active_account") { setExistingActive({ username: body.request?.canonicalUsername ?? cleanUsername }); return; }
      const requestId = String(body.request?.id ?? "");
      let statusToken = String(body.statusToken ?? "");
      const saved = loadSavedBetaPreviewReturn();
      if (!statusToken && requestId && saved?.requestId === requestId) statusToken = saved.statusCredential;
      if (!statusToken && requestId && (body.existingState === "pending" || body.existingState === "approved_unclaimed")) {
        setExistingRequest({ username: body.request?.canonicalUsername ?? cleanUsername, state: body.existingState });
        return;
      }
      if (!requestId || !statusToken) throw new Error("BoardSignal saved the request but could not open its Preview Room. Try again.");
      saveBetaPreviewReturn({ requestId, canonicalUsername: body.request?.canonicalUsername ?? cleanUsername, statusCredential: statusToken, createdAt: body.request?.requestedAt });
      window.location.assign(`/boardsignal/preview/${encodeURIComponent(requestId)}#status=${encodeURIComponent(statusToken)}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "BoardSignal could not start this Preview."); }
    finally { setBusy(false); }
  }

  const publishGuideContext = (active: boolean) => window.dispatchEvent(new CustomEvent("boardsignal:context", { detail: active ? { activeTab: "beta-request" } : {} }));

  if (existingActive) return <section className="beta-request-success" aria-live="polite"><div><p className="kicker">BOARDSIGNAL ALREADY KNOWS THIS PLAYER</p><h3>{existingActive.username} already has an active BoardSignal identity.</h3><p>Use the existing private access path instead of creating a duplicate request.</p><div className="resolved-player-actions"><Link className="button button-dark" href="/boardsignal/player-room">Open access / sign in</Link><button type="button" className="button button-quiet" onClick={() => setExistingActive(null)}>Use another username</button></div></div></section>;

  if (existingRequest) return <section className="beta-request-success" aria-live="polite"><div><p className="kicker">BOARDSIGNAL ALREADY HAS THIS REQUEST</p><h3>{existingRequest.username} already has a protected BoardSignal Preview.</h3><p>This device does not have the Preview possession credential for that request. BoardSignal will not reveal its status from a username alone. Use the original Preview device, an access link, or ask Ayanda for recovery.</p><div className="resolved-player-actions"><Link className="button button-dark" href="/boardsignal/player-room">Open access / sign in</Link><button type="button" className="button button-quiet" onClick={() => setExistingRequest(null)}>Use another username</button></div></div></section>;

  return <div className={`username-desk-shell ${compact ? "is-compact" : ""}`} onFocusCapture={() => publishGuideContext(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) publishGuideContext(false); }}>
    {savedPreview ? <section className="beta-preview-return-card" aria-live="polite"><div><p className="kicker">{savedPreviewReady ? "YOUR PRIVATE PLAYER ROOM IS READY" : "CONTINUE YOUR BOARDSIGNAL PREVIEW"}</p><h3>{savedPreview.canonicalUsername}</h3><p>{savedPreviewReady ? "BoardSignal verified that this saved Preview is approved on the server." : "This Preview is saved on this device for its activation window. You do not need to type the username again."}</p></div><Link className="button button-dark" href={`/boardsignal/preview/${encodeURIComponent(savedPreview.requestId)}`}>{savedPreviewReady ? "Open My BoardSignal" : "Continue Preview"}<ArrowRight size={16}/></Link></section> : null}
    <form className={`username-desk-form activation-request-form ${compact ? "is-compact" : ""}`} onSubmit={submit}>
      <div className="activation-request-fields activation-request-username-only">
        <label htmlFor={compact ? "username-compact" : "username"}>Chess.com username
          <div className="username-entry-row activation-username-row"><span className="username-prefix" aria-hidden="true"><Search size={19}/></span><input id={compact ? "username-compact" : "username"} name="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your Chess.com username" autoComplete="off" spellCheck={false} disabled={busy}/></div>
        </label>
      </div>
      <div className="beta-universe-disclosure"><strong>SEE YOUR BOARDSIGNAL FIRST</strong><p>BoardSignal resolves the public Chess.com identity, finds a safe seven-day Preview and shows it immediately. You choose how to come back only after you've seen your week.</p></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-lime activation-request-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="button-spinner" size={17}/> Finding your week</> : <>See My BoardSignal <ArrowRight size={17}/></>}</button>
      <p className="username-privacy"><ShieldCheck size={14}/> Public Chess.com username only. Never your Chess.com password. A Preview does not prove ownership or unlock private Player Room data.</p>
    </form>
  </div>;
}
