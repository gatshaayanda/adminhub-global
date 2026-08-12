"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import type { BoardSignalContactMethod } from "@/lib/boardsignal/account";
import type { ResolvedPlayer } from "@/lib/boardsignal/types";

type UsernameDeskFormProps = {
  compact?: boolean;
};

type ResolveResponse =
  | { ok: true; player: ResolvedPlayer }
  | { ok: false; error: string; code: string };

export default function UsernameDeskForm({ compact = false }: UsernameDeskFormProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [resolved, setResolved] = useState<ResolvedPlayer | null>(null);
  const [contactMethod, setContactMethod] = useState<BoardSignalContactMethod>("email");
  const [contactValue, setContactValue] = useState("");
  const [consent, setConsent] = useState(false);
  const [requested, setRequested] = useState(false);
  const [shareMomentId, setShareMomentId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") === "boardSignalShare") setShareMomentId(params.get("shareMomentId") ?? "");
  }, []);

  async function trackShareAttribution(eventType: "beta_request_started" | "beta_request_submitted") {
    if (!shareMomentId) return;
    try {
      await fetch(`/api/boardsignal/share/${encodeURIComponent(shareMomentId)}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ eventType, source: "boardSignalShare" }),
      });
    } catch {
      // Beta onboarding must not depend on attribution storage.
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = username.trim().replace(/^@/, "");
    if (!clean) {
      setError("Enter a Chess.com username first.");
      return;
    }

    setError("");
    setResolved(null);
    setRequested(false);
    setResolving(true);
    try {
      const response = await fetch(`/api/boardsignal/resolve/${encodeURIComponent(clean)}`, { cache: "no-store" });
      const body = await response.json() as ResolveResponse;
      if (!response.ok || !body.ok) throw new Error(body.ok ? "Chess.com player could not be confirmed." : body.error);
      setResolved(body.player);
      if (shareMomentId) void trackShareAttribution("beta_request_started");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chess.com player could not be confirmed.");
    } finally {
      setResolving(false);
    }
  }

  async function requestAccess() {
    if (!resolved) return;
    if (!contactValue.trim()) {
      setError("Add one reachable contact so BoardSignal can send your beta access.");
      return;
    }
    if (!consent) {
      setError("Please confirm the Founding Beta contact consent.");
      return;
    }
    setRequesting(true);
    setError("");
    try {
      const response = await fetch("/api/boardsignal/beta-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          username: resolved.username,
          preferredContactMethod: contactMethod,
          preferredContactValue: contactValue.trim(),
          betaContactConsent: true,
          source: shareMomentId ? "boardSignalShare" : undefined,
          shareMomentId: shareMomentId || undefined,
        }),
      });
      const body = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Founding Beta request could not be submitted.");
      setRequested(true);
      if (shareMomentId) void trackShareAttribution("beta_request_submitted");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Founding Beta request could not be submitted.");
    } finally {
      setRequesting(false);
    }
  }

  function resetPlayer() {
    setResolved(null);
    setRequested(false);
    setContactValue("");
    setConsent(false);
    setError("");
  }

  if (requested && resolved) {
    const discordInvite = process.env.NEXT_PUBLIC_BOARDSIGNAL_DISCORD_INVITE_URL?.trim();
    return (
      <section className="beta-request-success" aria-live="polite">
        <span className="beta-request-success-mark"><Check size={20} /></span>
        <div>
          <p className="kicker">REQUEST RECEIVED</p>
          <h3>{resolved.username}, your Founding Beta request is in.</h3>
          <p>BoardSignal will use your chosen contact only for your beta account, Desk availability, important product updates and beta feedback.</p>
          <div className="resolved-player-actions">
            <Link className="button button-dark" href="/boardsignal/player-room">Already approved? Open My Player Room</Link>
            {discordInvite ? <a className="button button-quiet" href={discordInvite} target="_blank" rel="noreferrer">Join the Founding Beta Discord</a> : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className={`username-desk-shell ${compact ? "is-compact" : ""}`}>
      <form className={`username-desk-form ${compact ? "is-compact" : ""}`} onSubmit={submit}>
        <label htmlFor={compact ? "username-compact" : "username"}>Chess.com username</label>
        <div className="username-entry-row">
          <span className="username-prefix" aria-hidden="true"><Search size={19} /></span>
          <input
            id={compact ? "username-compact" : "username"}
            name="username"
            value={username}
            onChange={(event) => { setUsername(event.target.value); setResolved(null); setRequested(false); }}
            placeholder="Your Chess.com username"
            autoComplete="off"
            spellCheck={false}
            disabled={resolving}
            aria-describedby={error ? "username-error" : undefined}
          />
          <button className="button button-lime" type="submit" disabled={resolving}>
            {resolving ? <><LoaderCircle className="button-spinner" size={17} /> Confirming</> : <>Get My BoardSignal <ArrowRight size={17} /></>}
          </button>
        </div>
        {error && !resolved ? <p className="form-error" id="username-error" role="alert">{error}</p> : null}
        <p className="username-privacy"><ShieldCheck size={14} /> Public username only. Never your Chess.com password.</p>
      </form>

      {resolved ? <section className="resolved-player-card beta-request-card" aria-live="polite">
        <p className="kicker">IS THIS YOU?</p>
        <div className="resolved-player-identity">
          {resolved.avatar ? <Image src={resolved.avatar} alt="" width={52} height={52} unoptimized /> : <span aria-hidden="true">{resolved.username.slice(0, 2).toUpperCase()}</span>}
          <div><strong>{resolved.username}</strong><small>Canonical Chess.com account · stable ID {resolved.playerId ?? "confirmed"}</small></div>
          {resolved.profileUrl ? <a href={resolved.profileUrl} target="_blank" rel="noreferrer" aria-label={`Open ${resolved.username} on Chess.com`}><ExternalLink size={17} /></a> : null}
        </div>

        <div className="beta-value-card">
          <p className="kicker">YOUR WEEK IN ONE PLACE</p>
          <ul>
            <li><Check size={15} /> Your seven-day sports Desk</li>
            <li><Check size={15} /> Your latest four episodes</li>
            <li><Check size={15} /> Week-to-week progress</li>
            <li><Check size={15} /> Private improvement signals</li>
            <li><Check size={15} /> Your place in the BoardSignal Universe</li>
            <li><Check size={15} /> One thing to carry into the next episode</li>
          </ul>
        </div>

        <div className="beta-contact-grid">
          <label>Preferred contact
            <select value={contactMethod} onChange={(event) => setContactMethod(event.target.value as BoardSignalContactMethod)}>
              <option value="email">Email</option>
              <option value="discord">Discord</option>
              <option value="telegram">Telegram</option>
            </select>
          </label>
          <label>{contactMethod === "email" ? "Email address" : contactMethod === "discord" ? "Discord username" : "Telegram username / contact"}
            <input
              value={contactValue}
              onChange={(event) => setContactValue(event.target.value)}
              type={contactMethod === "email" ? "email" : "text"}
              autoComplete={contactMethod === "email" ? "email" : "off"}
              maxLength={160}
              placeholder={contactMethod === "email" ? "you@example.com" : contactMethod === "discord" ? "your Discord username" : "@username"}
            />
          </label>
        </div>

        <div className="beta-universe-disclosure">
          <strong>BOARDSIGNAL UNIVERSE · Included with Founding Beta ✓</strong>
          <p>Each completed Desk can contribute safe sports-style coverage. Your weaknesses, Signals, evidence and private progress stay private.</p>
        </div>

        <label className="agreement-check beta-contact-consent">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>I agree BoardSignal may contact me about my Founding Beta account, Desk availability, important product updates and beta feedback.</span>
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="resolved-player-actions">
          <button type="button" className="button button-lime" onClick={requestAccess} disabled={requesting}>
            {requesting ? <><LoaderCircle className="button-spinner" size={16} /> Sending request</> : <>Request Founding Beta Access <ArrowRight size={17} /></>}
          </button>
          <button type="button" className="button button-quiet" onClick={resetPlayer}>That&apos;s not me</button>
        </div>
        <p className="helper-copy">This contact is not your authentication identity and is not converted into unrelated marketing consent.</p>
      </section> : null}
    </div>
  );
}
