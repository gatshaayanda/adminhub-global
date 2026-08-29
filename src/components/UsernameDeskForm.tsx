"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import GoogleAccessButton from "@/components/GoogleAccessButton";
import { clearSavedBetaPreviewReturn, loadSavedBetaPreviewReturn, saveBetaPreviewReturn, type BetaPreviewReturnRecord } from "@/lib/boardsignal/previewReturn";
import type { BetaPreviewStatus } from "@/lib/boardsignal/activation";

type UsernameDeskFormProps = { compact?: boolean };

const BETA_REQUEST_TIMEOUT_MS = 8_000;

function openDirectReview(username: string) {
  try {
    window.sessionStorage.setItem("boardsignal:degraded-review:v1", JSON.stringify({ username, startedAt: new Date().toISOString() }));
  } catch { /* best-effort continuity marker only */ }
  window.location.assign(`/boardsignal/build/${encodeURIComponent(username)}?degraded=1`);
}

export default function UsernameDeskForm({ compact = false }: UsernameDeskFormProps) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [existingActive, setExistingActive] = useState<{ username: string; playerId?: number } | null>(null);
  const [existingRequest, setExistingRequest] = useState<{ username: string; playerId?: number; state: "pending" | "approved_unclaimed" } | null>(null);
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

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), BETA_REQUEST_TIMEOUT_MS);
    let serviceFailure = false;

    try {
      const response = await fetch("/api/boardsignal/beta-request", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal: controller.signal,
        body: JSON.stringify({ username: cleanUsername, source: shareMomentId ? "boardSignalShare" : undefined, shareMomentId: shareMomentId || undefined }),
      });
      window.clearTimeout(timeout);
      const body = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; existingState?: "active_account" | "pending" | "approved_unclaimed"; statusToken?: string; request?: { id?: string; chessPlayerId?: number; canonicalUsername?: string; requestedAt?: string } };
      if (response.status >= 500) {
        serviceFailure = true;
        throw new Error(body.error ?? "BoardSignal's saved access service is temporarily unavailable.");
      }
      if (!response.ok || !body.ok) throw new Error(body.error ?? "BoardSignal could not start this Preview.");
      if (shareMomentId) void trackShareAttribution("beta_request_submitted");
      if (body.existingState === "active_account") {
        setExistingActive({ username: body.request?.canonicalUsername ?? cleanUsername, playerId: body.request?.chessPlayerId });
        return;
      }
      const requestId = String(body.request?.id ?? "");
      let statusToken = String(body.statusToken ?? "");
      const saved = loadSavedBetaPreviewReturn();
      if (!statusToken && requestId && saved?.requestId === requestId) statusToken = saved.statusCredential;
      if (!statusToken && requestId && (body.existingState === "pending" || body.existingState === "approved_unclaimed")) {
        setExistingRequest({ username: body.request?.canonicalUsername ?? cleanUsername, playerId: body.request?.chessPlayerId, state: body.existingState });
        return;
      }
      if (!requestId || !statusToken) throw new Error("BoardSignal saved the request but could not open its Preview Room. Try again.");
      saveBetaPreviewReturn({ requestId, canonicalUsername: body.request?.canonicalUsername ?? cleanUsername, statusCredential: statusToken, createdAt: body.request?.requestedAt });
      window.location.assign(`/boardsignal/preview/${encodeURIComponent(requestId)}#status=${encodeURIComponent(statusToken)}`);
    } catch (reason) {
      window.clearTimeout(timeout);
      const aborted = reason instanceof DOMException && reason.name === "AbortError";
      const transportFailure = reason instanceof TypeError;
      if (navigator.onLine && (serviceFailure || aborted || transportFailure)) {
        setError("Saved Player Room access is temporarily unavailable. Opening your live Review directly from Chess.com instead…");
        window.setTimeout(() => openDirectReview(cleanUsername), 350);
        return;
      }
      setError(reason instanceof Error ? reason.message : "BoardSignal could not start this Preview.");
    } finally { setBusy(false); }
  }

  const publishGuideContext = (active: boolean) => window.dispatchEvent(new CustomEvent("boardsignal:context", { detail: active ? { activeTab: "beta-request" } : {} }));

  if (existingActive) return <section className="beta-request-success" aria-live="polite"><div><p className="kicker">THIS BOARDSIGNAL ALREADY EXISTS</p><h3>{existingActive.username} already has an active BoardSignal identity.</h3><p>Username knowledge alone never opens an established private account. Use an authorised return key or the existing recovery path.</p><div className="resolved-player-actions"><GoogleAccessButton expectedPlayerId={existingActive.playerId} /><Link className="button button-dark" href="/boardsignal/player-room">Open sign-in / recovery</Link><button type="button" className="button button-quiet" onClick={() => setExistingActive(null)}>Use another username</button></div><GoogleAccessButton mode="identity_help" username={existingActive.username} label="I NEED ACCESS TO MY CHESS.COM PROFILE" /></div></section>;

  if (existingRequest) return <section className="beta-request-success" aria-live="polite"><div><p className="kicker">YOUR PREVIEW ALREADY EXISTS</p><h3>{existingRequest.username} already has a protected BoardSignal Preview or account path.</h3><p>BoardSignal cannot reopen private access from a username alone. Continue on the original Preview device, use an authorised Google return key if already connected, or use private recovery.</p><div className="resolved-player-actions"><GoogleAccessButton expectedPlayerId={existingRequest.playerId} /><Link className="button button-dark" href="/boardsignal/player-room">Open sign-in / recovery</Link><button type="button" className="button button-quiet" onClick={() => setExistingRequest(null)}>Use another username</button></div><GoogleAccessButton mode="identity_help" username={existingRequest.username} label="I NEED ACCESS TO MY CHESS.COM PROFILE" /></div></section>;

  return <div className={`username-desk-shell ${compact ? "is-compact" : ""}`} onFocusCapture={() => publishGuideContext(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) publishGuideContext(false); }}>
    {savedPreview ? <section className="beta-preview-return-card" aria-live="polite"><div><p className="kicker">{savedPreviewReady ? "YOUR PRIVATE PLAYER ROOM IS READY" : "CONTINUE YOUR BOARDSIGNAL PREVIEW"}</p><h3>{savedPreview.canonicalUsername}</h3><p>{savedPreviewReady ? "BoardSignal verified that this saved Preview is ready on the server." : "This Preview is saved on this device for its activation window. You do not need to type the username again."}</p></div><Link className="button button-dark" href={`/boardsignal/preview/${encodeURIComponent(savedPreview.requestId)}`}>{savedPreviewReady ? "Open My BoardSignal" : "Continue Preview"}<ArrowRight size={16}/></Link></section> : null}
    <form className={`username-desk-form activation-request-form ${compact ? "is-compact" : ""}`} onSubmit={submit}>
      <div className="activation-request-fields activation-request-username-only">
        <label htmlFor={compact ? "username-compact" : "username"}>Chess.com username
          <div className="username-entry-row activation-username-row"><span className="username-prefix" aria-hidden="true"><Search size={19}/></span><input id={compact ? "username-compact" : "username"} name="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your Chess.com username" autoComplete="off" spellCheck={false} disabled={busy}/></div>
        </label>
      </div>
      <div className="beta-universe-disclosure"><strong>SEE YOUR GAMES TOGETHER</strong><p>BoardSignal finds your recent public Chess.com games and shows you the first useful picture immediately.</p></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-lime activation-request-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="button-spinner" size={17}/> Finding your week</> : <>SHOW ME MY REVIEW <ArrowRight size={17}/></>}</button>
      <p className="username-privacy"><ShieldCheck size={14}/> No password. No uploads. Google is optional and comes after first private value.</p>
    </form>
  </div>;
}
