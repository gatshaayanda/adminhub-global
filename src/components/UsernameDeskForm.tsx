"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import type { BoardSignalContactMethod } from "@/lib/boardsignal/account";

type UsernameDeskFormProps = { compact?: boolean };

export default function UsernameDeskForm({ compact = false }: UsernameDeskFormProps) {
  const [username, setUsername] = useState("");
  const [contactMethod, setContactMethod] = useState<BoardSignalContactMethod>("email");
  const [contactValue, setContactValue] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [existingActive, setExistingActive] = useState<{ username: string } | null>(null);
  const [existingRequest, setExistingRequest] = useState<{ username: string; state: "pending" | "approved_unclaimed" } | null>(null);
  const [shareMomentId, setShareMomentId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") === "boardSignalShare") setShareMomentId(params.get("shareMomentId") ?? "");
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
    const cleanContact = contactValue.trim();
    if (!cleanUsername) { setError("Enter your Chess.com username."); return; }
    if (!cleanContact) { setError("Add one reachable contact for your Founding Beta access."); return; }
    if (!consent) { setError("Confirm the Founding Beta contact consent to continue."); return; }
    setBusy(true); setError(""); setExistingActive(null); setExistingRequest(null);
    if (shareMomentId) void trackShareAttribution("beta_request_started");
    try {
      const response = await fetch("/api/boardsignal/beta-request", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ username: cleanUsername, preferredContactMethod: contactMethod, preferredContactValue: cleanContact, betaContactConsent: true, source: shareMomentId ? "boardSignalShare" : undefined, shareMomentId: shareMomentId || undefined }),
      });
      const body = await response.json() as { ok?: boolean; error?: string; existingState?: "active_account" | "pending" | "approved_unclaimed"; statusToken?: string; request?: { id?: string; canonicalUsername?: string } };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "BoardSignal could not start this Preview.");
      if (shareMomentId) void trackShareAttribution("beta_request_submitted");
      if (body.existingState === "active_account") { setExistingActive({ username: body.request?.canonicalUsername ?? cleanUsername }); return; }
      const requestId = String(body.request?.id ?? "");
      let statusToken = String(body.statusToken ?? "");
      if (!statusToken && requestId && (body.existingState === "pending" || body.existingState === "approved_unclaimed")) {
        statusToken = window.sessionStorage.getItem(`boardsignal-beta-preview-status-v1:${requestId}`) ?? "";
        if (!statusToken) { setExistingRequest({ username: body.request?.canonicalUsername ?? cleanUsername, state: body.existingState }); return; }
      }
      if (!requestId || !statusToken) throw new Error("BoardSignal saved the request but could not open its Preview Room. Try again.");
      window.location.assign(`/boardsignal/preview/${encodeURIComponent(requestId)}#status=${encodeURIComponent(statusToken)}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "BoardSignal could not start this Preview."); }
    finally { setBusy(false); }
  }

  const publishGuideContext = (active: boolean) => window.dispatchEvent(new CustomEvent("boardsignal:context", { detail: active ? { activeTab: "beta-request" } : {} }));

  if (existingActive) return <section className="beta-request-success" aria-live="polite"><div><p className="kicker">BOARDSIGNAL ALREADY KNOWS THIS PLAYER</p><h3>{existingActive.username} already has an active BoardSignal identity.</h3><p>Use the existing private access path instead of creating a duplicate request.</p><div className="resolved-player-actions"><Link className="button button-dark" href="/boardsignal/player-room">Open access / sign in</Link><button type="button" className="button button-quiet" onClick={() => setExistingActive(null)}>Use another username</button></div></div></section>;

  if (existingRequest) return <section className="beta-request-success" aria-live="polite"><div><p className="kicker">BOARDSIGNAL ALREADY HAS THIS REQUEST</p><h3>{existingRequest.username} is already {existingRequest.state === "pending" ? "waiting for Founder approval" : "approved with private access prepared"}.</h3><p>{existingRequest.state === "pending" ? "Use the original Preview tab or link. BoardSignal will reveal access there automatically when approval arrives." : "Use the one-time access link already delivered to the original contact, or ask Ayanda to regenerate it."}</p><div className="resolved-player-actions"><Link className="button button-dark" href="/boardsignal/player-room">Open access / sign in</Link><button type="button" className="button button-quiet" onClick={() => setExistingRequest(null)}>Use another username</button></div></div></section>;

  return <div className={`username-desk-shell ${compact ? "is-compact" : ""}`} onFocusCapture={() => publishGuideContext(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) publishGuideContext(false); }}>
    <form className={`username-desk-form activation-request-form ${compact ? "is-compact" : ""}`} onSubmit={submit}>
      <div className="activation-request-fields">
        <label htmlFor={compact ? "username-compact" : "username"}>Chess.com username
          <div className="username-entry-row activation-username-row"><span className="username-prefix" aria-hidden="true"><Search size={19}/></span><input id={compact ? "username-compact" : "username"} name="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your Chess.com username" autoComplete="off" spellCheck={false} disabled={busy}/></div>
        </label>
        <label>Preferred contact
          <select value={contactMethod} onChange={(event) => setContactMethod(event.target.value as BoardSignalContactMethod)} disabled={busy}><option value="email">Email</option><option value="discord">Discord</option><option value="telegram">Telegram</option></select>
        </label>
        <label>{contactMethod === "email" ? "Email address" : contactMethod === "discord" ? "Discord username" : "Telegram username / contact"}
          <input value={contactValue} onChange={(event) => setContactValue(event.target.value)} type={contactMethod === "email" ? "email" : "text"} autoComplete={contactMethod === "email" ? "email" : "off"} maxLength={160} placeholder={contactMethod === "email" ? "you@example.com" : contactMethod === "discord" ? "your Discord username" : "@username"} disabled={busy}/>
        </label>
      </div>
      <div className="beta-request-defaults"><strong>YOUR STARTING UPDATE DEFAULTS</strong><p>Desk Ready · Episode Progress · Blue Reminder · Universe Achievement · Founder Updates start on in your private Inbox. Browser alerts stay off until you deliberately enable them. With a valid consented email, important email updates start on and remain editable in Profile.</p></div>
      <div className="beta-universe-disclosure"><strong>BOARDSIGNAL UNIVERSE · Included with Founding Beta ✓</strong><p>Approval can add safe sports-style coverage. Red, private Amber, Blue, evidence and private progress stay private.</p></div>
      <label className="agreement-check beta-contact-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy}/><span>I agree BoardSignal may contact me about my Founding Beta account, Desk availability, important product updates and beta feedback. This setup will carry into Profile after access; I won't be asked to type it again.</span></label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-lime activation-request-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="button-spinner" size={17}/> Finding your week</> : <>Get My BoardSignal <ArrowRight size={17}/></>}</button>
      <p className="username-privacy"><ShieldCheck size={14}/> Public Chess.com username only. Never your Chess.com password. Your contact is private beta communication data, not your authentication identity.</p>
    </form>
  </div>;
}
