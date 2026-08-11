"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ExternalLink, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import type { ResolvedPlayer } from "@/lib/boardsignal/types";

type UsernameDeskFormProps = {
  compact?: boolean;
};

type ResolveResponse =
  | { ok: true; player: ResolvedPlayer }
  | { ok: false; error: string; code: string };

export default function UsernameDeskForm({ compact = false }: UsernameDeskFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedPlayer | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = username.trim().replace(/^@/, "");
    if (!clean) {
      setError("Enter a Chess.com username first.");
      return;
    }

    setError("");
    setResolved(null);
    setResolving(true);
    try {
      const response = await fetch(`/api/boardsignal/resolve/${encodeURIComponent(clean)}`, { cache: "no-store" });
      const body = await response.json() as ResolveResponse;
      if (!response.ok || !body.ok) throw new Error(body.ok ? "Chess.com player could not be confirmed." : body.error);
      setResolved(body.player);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chess.com player could not be confirmed.");
    } finally {
      setResolving(false);
    }
  }

  function confirmPlayer() {
    if (!resolved) return;
    router.push(`/player/${encodeURIComponent(resolved.username)}`);
  }

  function resetPlayer() {
    setResolved(null);
    setError("");
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
            onChange={(event) => { setUsername(event.target.value); setResolved(null); }}
            placeholder="Your Chess.com username"
            autoComplete="off"
            spellCheck={false}
            disabled={resolving}
            aria-describedby={error ? "username-error" : undefined}
          />
          <button className="button button-lime" type="submit" disabled={resolving}>
            {resolving ? <><LoaderCircle className="button-spinner" size={17} /> Confirming</> : <>Build My Desk <ArrowRight size={17} /></>}
          </button>
        </div>
        {error ? <p className="form-error" id="username-error">{error}</p> : null}
        <p className="username-privacy"><ShieldCheck size={14} /> Public username only. Never your Chess.com password.</p>
      </form>

      {resolved ? <section className="resolved-player-card" aria-live="polite">
        <p className="kicker">Is this you?</p>
        <div className="resolved-player-identity">
          {resolved.avatar ? <img src={resolved.avatar} alt="" /> : <span aria-hidden="true">{resolved.username.slice(0, 2).toUpperCase()}</span>}
          <div><strong>{resolved.username}</strong><small>Canonical Chess.com account</small></div>
          {resolved.profileUrl ? <a href={resolved.profileUrl} target="_blank" rel="noreferrer" aria-label={`Open ${resolved.username} on Chess.com`}><ExternalLink size={17} /></a> : null}
        </div>
        <div className="resolved-player-actions">
          <button type="button" className="button button-lime" onClick={confirmPlayer}>Yes, build my Desk <ArrowRight size={17} /></button>
          <button type="button" className="button button-quiet" onClick={resetPlayer}>That&apos;s not me</button>
        </div>
      </section> : null}
    </div>
  );
}

