"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clipboard, ExternalLink, KeyRound, LoaderCircle, RefreshCcw, ShieldX, UserRoundCheck, X } from "lucide-react";
import type { FounderPlayerIdentityRow } from "@/lib/boardsignal/account";

type ApiResult = {
  ok: boolean;
  players?: FounderPlayerIdentityRow[];
  player?: { username?: string; playerId: number };
  accessCode?: string;
  error?: string;
};

type OneTimeCode = { username: string; playerId: number; accessCode: string; action: "created" | "reset" };

export default function FoundingBetaPlayersAdmin() {
  const [players, setPlayers] = useState<FounderPlayerIdentityRow[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyPlayer, setBusyPlayer] = useState<number | "create" | null>(null);
  const [error, setError] = useState("");
  const [oneTimeCode, setOneTimeCode] = useState<OneTimeCode | null>(null);
  const [copied, setCopied] = useState(false);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/boardsignal/beta-access", { cache: "no-store" });
      const body = await response.json() as ApiResult;
      if (!response.ok || !body.ok || !body.players) throw new Error(body.error ?? "Founding Beta identities could not be loaded.");
      setPlayers(body.players);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Founding Beta identities could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPlayers(); }, [loadPlayers]);

  async function mutate(action: "create" | "reset" | "revoke", playerId?: number) {
    if (action === "create" && !username.trim()) {
      setError("Enter the approved player’s Chess.com username.");
      return;
    }
    if (action === "reset" && !window.confirm("Reset this player’s access? Their previous code will stop working immediately.")) return;
    if (action === "revoke" && !window.confirm("Revoke this player’s Founding Beta Access? Their existing Firebase session is unaffected until they sign out or expire.")) return;
    setBusyPlayer(action === "create" ? "create" : playerId ?? null);
    setError("");
    setOneTimeCode(null);
    setCopied(false);
    try {
      const response = await fetch("/api/admin/boardsignal/beta-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(action === "create" ? { action, username: username.trim() } : { action, playerId }),
      });
      const body = await response.json() as ApiResult;
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Founding Beta Access could not be updated.");
      if ((action === "create" || action === "reset") && body.accessCode && body.player) {
        setOneTimeCode({
          username: body.player.username ?? players.find((player) => player.playerId === body.player!.playerId)?.username ?? "Player",
          playerId: body.player.playerId,
          accessCode: body.accessCode,
          action: action === "create" ? "created" : "reset",
        });
      }
      if (action === "create") setUsername("");
      await loadPlayers();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Founding Beta Access could not be updated.");
    } finally {
      setBusyPlayer(null);
    }
  }

  async function copyAccessCode() {
    if (!oneTimeCode) return;
    await navigator.clipboard.writeText(oneTimeCode.accessCode);
    setCopied(true);
  }

  return (
    <>
      <section className="founder-access-create">
        <div><p className="kicker">FOUNDING BETA ACCESS</p><h2>Issue private Player Room access.</h2><p>BoardSignal resolves the canonical Chess.com identity and attaches access to its stable player ID.</p></div>
        <div className="founder-access-form">
          <label htmlFor="founder-beta-username">Approved Chess.com username</label>
          <input id="founder-beta-username" value={username} onChange={(event) => setUsername(event.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={50} />
          <button className="button button-lime" type="button" onClick={() => mutate("create")} disabled={busyPlayer !== null}>
            {busyPlayer === "create" ? <><LoaderCircle className="button-spinner" size={15} /> Creating</> : <><KeyRound size={15} /> Create Beta Access</>}
          </button>
        </div>
      </section>

      {oneTimeCode ? <section className="one-time-access-code" aria-live="polite">
        <button type="button" className="one-time-code-close" aria-label="Hide access code" onClick={() => setOneTimeCode(null)}><X size={18} /></button>
        <UserRoundCheck size={24} /><div><p className="kicker">ACCESS {oneTimeCode.action.toUpperCase()}</p><h3>{oneTimeCode.username}</h3><p>Copy this code now. It cannot be recovered after this screen is left or refreshed.</p><code>{oneTimeCode.accessCode}</code><button className="button button-dark" type="button" onClick={copyAccessCode}><Clipboard size={15} /> {copied ? "Copied" : "Copy access code"}</button></div>
      </section> : null}

      {error ? <p className="founder-access-error" role="alert">{error}</p> : null}

      <section className="desk-section founder-player-directory">
        <div className="founder-directory-heading"><div><p className="kicker">IDENTITY AND MEMBERSHIP</p><h2>Founding Beta players</h2><p>Stable identity, account state, retained Desks and provider status.</p></div><button className="button button-quiet" type="button" onClick={loadPlayers} disabled={loading}><RefreshCcw size={15} /> Refresh</button></div>
        {loading ? <div className="founder-directory-loading"><LoaderCircle className="button-spinner" /> Loading player identities</div> : players.length ? <div className="founder-player-grid">{players.map((player) => (
          <article className="founder-player-card" key={player.playerId}>
            <header><div className="universal-avatar">{player.username.slice(0, 2).toUpperCase()}</div><div><h3>{player.username}</h3><code>Chess.com ID {player.playerId}</code></div><span className={`state-pill ${player.accountStatus === "active" ? "ready" : "processing"}`}>{player.accountStatus}</span></header>
            <dl>
              <div><dt>Founding Beta</dt><dd>{player.betaAccessStatus === "active" ? "Beta Access active" : player.betaAccessStatus === "revoked" ? "Beta Access revoked" : "Access not created"}</dd></div>
              <div><dt>Desks stored</dt><dd>{player.desksStored} of 4</dd></div>
              <div><dt>Latest Desk</dt><dd>{player.latestDesk?.periodLabel ?? "No stored Desk"}</dd></div>
              <div><dt>Last seen</dt><dd>{player.lastSeen ? new Date(player.lastSeen).toLocaleString() : "Not recorded"}</dd></div>
              <div><dt>Chess.com OAuth</dt><dd>{player.oauthLinked ? "OAuth linked" : "Awaiting OAuth"}</dd></div>
            </dl>
            <div className="founder-player-actions">
              {player.betaAccessStatus === "not_created" ? <button className="button button-outline" type="button" onClick={() => { setUsername(player.username); window.scrollTo({ top: 0, behavior: "smooth" }); }}><KeyRound size={14} /> Create Beta Access</button> : <button className="button button-outline" type="button" onClick={() => mutate("reset", player.playerId)} disabled={busyPlayer !== null}><RefreshCcw size={14} /> Reset Access</button>}
              {player.betaAccessStatus === "active" ? <button className="button button-quiet" type="button" onClick={() => mutate("revoke", player.playerId)} disabled={busyPlayer !== null}><ShieldX size={14} /> Revoke Access</button> : null}
              <Link className="button button-quiet" href={`/player/${encodeURIComponent(player.username)}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open Public Coverage</Link>
            </div>
          </article>
        ))}</div> : <div className="universe-empty"><p>No persistent BoardSignal player accounts exist yet. Create Beta Access for an approved Chess.com username to attach the first stable account.</p></div>}
      </section>
    </>
  );
}
