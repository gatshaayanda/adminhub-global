"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Clipboard, ExternalLink, KeyRound, LoaderCircle, RefreshCcw, ShieldX, UserRoundCheck, X, XCircle } from "lucide-react";
import type { BoardSignalContactMethod, FounderPlayerIdentityRow } from "@/lib/boardsignal/account";
import type { BetaActivationReturnMethod, BoardSignalBetaPreview } from "@/lib/boardsignal/activation";
import FounderBetaRequestAlerts from "@/components/FounderBetaRequestAlerts";

type RequestRow = {
  id: string; chessPlayerId: number; canonicalUsername: string; avatar?: string; profileUrl?: string;
  preferredContactMethod?: BoardSignalContactMethod; preferredContactValue?: string; requestedAt: string;
  activationReturnMethod?: BetaActivationReturnMethod;
  activationDevice?: { registeredAt?: string } | null; activationDeviceDelivery?: "delivered" | "failed" | "not_eligible";
  status: "pending" | "approved" | "rejected"; decidedAt?: string; claimedAt?: string;
  previewSnapshot?: BoardSignalBetaPreview; previewError?: string;
  accessEmailDelivery?: "delivered" | "failed" | "not_eligible" | "not_configured";
  magicAccess?: { expiresAt?: string; consumedAt?: string };
};

type ApiResult = {
  ok: boolean; players?: FounderPlayerIdentityRow[]; requests?: RequestRow[]; player?: { username?: string; playerId: number };
  accessCode?: string; approvalMessage?: string; magicLink?: string; magicAccessExpiresAt?: string;
  accessEmailDelivery?: RequestRow["accessEmailDelivery"]; deviceDelivery?: RequestRow["activationDeviceDelivery"]; error?: string;
};

type ManualCode = { username: string; playerId: number; accessCode: string; action: "created" | "reset" };
type PreparedAccess = { requestId: string; username: string; playerId: number; accessCode?: string; magicLink: string; approvalMessage: string; expiresAt?: string; emailDelivery?: RequestRow["accessEmailDelivery"]; deviceDelivery?: RequestRow["activationDeviceDelivery"] };

export default function FoundingBetaPlayersAdmin() {
  const [players, setPlayers] = useState<FounderPlayerIdentityRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyPlayer, setBusyPlayer] = useState<number | string | "create" | null>(null);
  const [error, setError] = useState("");
  const [manualCode, setManualCode] = useState<ManualCode | null>(null);
  const [preparedAccess, setPreparedAccess] = useState<PreparedAccess | null>(null);
  const [showFallbackCode, setShowFallbackCode] = useState(false);
  const [copied, setCopied] = useState<"code" | "message" | "link" | null>(null);

  const pending = useMemo(() => requests.filter((item) => item.status === "pending"), [requests]);
  const playerById = useMemo(() => new Map(players.map((player) => [player.playerId, player])), [players]);
  const approved = useMemo(() => requests.filter((item) => item.status === "approved").slice(0, 24), [requests]);
  const claimed = useMemo(() => approved.filter((item) => Boolean(item.claimedAt || item.magicAccess?.consumedAt)), [approved]);
  const accessReady = useMemo(() => approved.filter((item) => !item.claimedAt && !item.magicAccess?.consumedAt && Boolean(item.magicAccess)), [approved]);
  const legacyExisting = useMemo(() => approved.filter((item) => !item.claimedAt && !item.magicAccess && playerById.get(item.chessPlayerId)?.betaAccessStatus === "active"), [approved, playerById]);
  const approvedNeedsReview = useMemo(() => approved.filter((item) => !claimed.includes(item) && !accessReady.includes(item) && !legacyExisting.includes(item)), [accessReady, approved, claimed, legacyExisting]);

  const loadPlayers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/boardsignal/beta-access", { cache: "no-store" });
      const body = await response.json() as ApiResult;
      if (!response.ok || !body.ok || !body.players || !body.requests) throw new Error(body.error ?? "Founding Beta identities could not be loaded.");
      setPlayers(body.players); setRequests(body.requests);
      const requestId = new URLSearchParams(window.location.search).get("request");
      if (requestId) window.setTimeout(() => document.getElementById(`request-${CSS.escape(requestId)}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Founding Beta identities could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadPlayers(); }, [loadPlayers]);

  async function mutate(action: "create" | "reset" | "revoke", playerId?: number) {
    if (action === "create" && !username.trim()) { setError("Enter the approved player's Chess.com username."); return; }
    if (action === "reset" && !window.confirm("Reset this player's fallback Beta Access code?")) return;
    if (action === "revoke" && !window.confirm("Revoke this player's Founding Beta Access?")) return;
    setBusyPlayer(action === "create" ? "create" : playerId ?? null); setError(""); setManualCode(null); setPreparedAccess(null); setCopied(null);
    try {
      const response = await fetch("/api/admin/boardsignal/beta-access", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(action === "create" ? { action, username: username.trim() } : { action, playerId }) });
      const body = await response.json() as ApiResult;
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Founding Beta Access could not be updated.");
      if ((action === "create" || action === "reset") && body.accessCode && body.player) setManualCode({ username: body.player.username ?? players.find((player) => player.playerId === body.player!.playerId)?.username ?? "Player", playerId: body.player.playerId, accessCode: body.accessCode, action: action === "create" ? "created" : "reset" });
      if (action === "create") setUsername("");
      await loadPlayers();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Founding Beta Access could not be updated."); }
    finally { setBusyPlayer(null); }
  }

  async function decideRequest(request: RequestRow, action: "approveRequest" | "rejectRequest") {
    if (action === "rejectRequest" && !window.confirm("Decline this Founding Beta request?")) return;
    setBusyPlayer(request.id); setError(""); setPreparedAccess(null); setManualCode(null); setCopied(null); setShowFallbackCode(false);
    try {
      const response = await fetch("/api/admin/boardsignal/beta-access", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ action, requestId: request.id }) });
      const body = await response.json() as ApiResult;
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Founding Beta request could not be updated.");
      if (action === "approveRequest" && body.player && body.magicLink && body.approvalMessage) setPreparedAccess({ requestId: request.id, username: body.player.username ?? request.canonicalUsername, playerId: body.player.playerId, accessCode: body.accessCode, magicLink: body.magicLink, approvalMessage: body.approvalMessage, expiresAt: body.magicAccessExpiresAt, emailDelivery: body.accessEmailDelivery, deviceDelivery: body.deviceDelivery });
      await loadPlayers();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Founding Beta request could not be updated."); }
    finally { setBusyPlayer(null); }
  }

  async function regenerate(request: RequestRow) {
    const hasMagic = Boolean(request.magicAccess);
    if (!window.confirm(hasMagic
      ? `Generate a fresh one-time access link for ${request.canonicalUsername}? The prior magic link will stop working. Their fallback Beta code and Firebase session stay unchanged.`
      : `Create an optional one-time magic access link for ${request.canonicalUsername}? Their existing fallback Beta code and Firebase session stay unchanged.`)) return;
    setBusyPlayer(request.id); setError(""); setCopied(null);
    try {
      const response = await fetch("/api/admin/boardsignal/beta-access", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ action: "regenerateMagic", requestId: request.id }) });
      const body = await response.json() as ApiResult;
      if (!response.ok || !body.ok || !body.magicLink || !body.approvalMessage) throw new Error(body.error ?? "A fresh access link could not be prepared.");
      setPreparedAccess({ requestId: request.id, username: request.canonicalUsername, playerId: request.chessPlayerId, magicLink: body.magicLink, approvalMessage: body.approvalMessage, expiresAt: body.magicAccessExpiresAt, emailDelivery: request.accessEmailDelivery });
      await loadPlayers();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "A fresh access link could not be prepared."); }
    finally { setBusyPlayer(null); }
  }

  async function copyPrepared(kind: "code" | "message" | "link") {
    if (!preparedAccess) return;
    const value = kind === "code" ? preparedAccess.accessCode : kind === "message" ? preparedAccess.approvalMessage : preparedAccess.magicLink;
    if (!value) return;
    await navigator.clipboard.writeText(value); setCopied(kind);
  }

  return <>
    <FounderBetaRequestAlerts />

    <section className="desk-section pending-beta-requests">
      <div className="founder-directory-heading"><div><p className="kicker">NEW BETA REQUESTS · {pending.length}</p><h2>Preview is already live. You only approve access.</h2><p>One action establishes/reuses stable identity and fallback Beta Access without rotating an existing credential, publishes New To The Board, creates one-time magic access and hydrates any valid external contact or completed return decision into Profile without forcing duplicate setup.</p></div><button className="button button-quiet" type="button" onClick={loadPlayers} disabled={loading}><RefreshCcw size={15}/> Refresh</button></div>
      {loading ? <div className="founder-directory-loading"><LoaderCircle className="button-spinner"/> Loading requests</div> : pending.length ? <div className="pending-request-grid">{pending.map((request) => <RequestCard key={request.id} request={request} busy={busyPlayer === request.id} onApprove={() => decideRequest(request, "approveRequest")} onDecline={() => decideRequest(request, "rejectRequest")} />)}</div> : <div className="universe-empty"><p>No new Founding Beta requests.</p></div>}
    </section>

    {preparedAccess ? <section className="one-time-access-code activation-access-ready" aria-live="polite"><button type="button" className="one-time-code-close" aria-label="Hide prepared access" onClick={() => setPreparedAccess(null)}><X size={18}/></button><UserRoundCheck size={24}/><div><p className="kicker">ACCESS READY</p><h3>{preparedAccess.username}</h3><p>{preparedAccess.deviceDelivery === "delivered" ? "The player's saved Preview can unlock itself and the device alert was sent." : preparedAccess.deviceDelivery === "failed" ? "Preview access is ready. The device alert failed, but approval is still complete and the saved Preview will show access when the player returns." : "The player's saved Preview will show access when they return."} {preparedAccess.emailDelivery === "delivered" ? "A backup email was also delivered." : preparedAccess.emailDelivery === "failed" ? "No backup email was delivered." : "Magic access remains available as recovery."}</p><div className="one-time-code-actions"><button className="button button-dark" type="button" onClick={() => copyPrepared("message")}><Clipboard size={15}/> {copied === "message" ? "Message copied" : "Copy access message"}</button><button className="button button-outline" type="button" onClick={() => copyPrepared("link")}><Clipboard size={15}/> {copied === "link" ? "Link copied" : "Copy magic link"}</button>{preparedAccess.accessCode ? <button className="button button-quiet" type="button" onClick={() => setShowFallbackCode((value) => !value)}><KeyRound size={15}/> {showFallbackCode ? "Hide fallback code" : "Show fallback Beta code"}</button> : null}</div>{showFallbackCode && preparedAccess.accessCode ? <div className="activation-fallback-code"><code>{preparedAccess.accessCode}</code><button className="text-link social-text-button" type="button" onClick={() => copyPrepared("code")}>{copied === "code" ? "Copied" : "Copy code"}</button></div> : null}<pre className="approval-message-preview">{preparedAccess.approvalMessage}</pre>{preparedAccess.expiresAt ? <small>Magic access expires {new Date(preparedAccess.expiresAt).toLocaleString()}.</small> : null}</div></section> : null}

    {legacyExisting.length ? <section className="desk-section approved-beta-requests"><p className="kicker">LEGACY / EXISTING ACTIVE</p><p>These players already had active Founding Beta credentials before the Activation Bridge. Loading this page does not rotate their fallback code or touch their Firebase session.</p><div className="pending-request-grid">{legacyExisting.map((request) => <article className="pending-request-card access-ready-card" id={`request-${request.id}`} key={request.id}><header>{request.avatar ? <Image src={request.avatar} alt="" width={46} height={46} unoptimized/> : <div className="universal-avatar">{request.canonicalUsername.slice(0,2).toUpperCase()}</div>}<div><h3>{request.canonicalUsername}</h3><code>Chess.com ID {request.chessPlayerId}</code></div><span className="state-pill ready">LEGACY / EXISTING ACTIVE</span></header><dl><div><dt>Fallback access</dt><dd>Existing Beta Access remains active</dd></div><div><dt>Approved</dt><dd>{request.decidedAt ? new Date(request.decidedAt).toLocaleString() : "Historical"}</dd></div></dl><div className="founder-player-actions"><button className="button button-outline" type="button" disabled={busyPlayer !== null} onClick={() => regenerate(request)}><KeyRound size={14}/> Create magic access link</button><Link className="button button-quiet" href={`/player/${encodeURIComponent(request.canonicalUsername)}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open public player</Link></div></article>)}</div></section> : null}

    {accessReady.length ? <section className="desk-section approved-beta-requests"><p className="kicker">ACCESS READY</p><div className="pending-request-grid">{accessReady.map((request) => <article className="pending-request-card access-ready-card" id={`request-${request.id}`} key={request.id}><header>{request.avatar ? <Image src={request.avatar} alt="" width={46} height={46} unoptimized/> : <div className="universal-avatar">{request.canonicalUsername.slice(0,2).toUpperCase()}</div>}<div><h3>{request.canonicalUsername}</h3><code>Chess.com ID {request.chessPlayerId}</code></div><span className="state-pill processing">ACCESS READY</span></header><dl><div><dt>Return</dt><dd>{request.activationReturnMethod === "device" ? "Device alerts" : request.activationReturnMethod === "return_here" ? "Saved on device" : request.preferredContactMethod && request.preferredContactValue ? `${request.preferredContactMethod}: ${request.preferredContactValue}` : "Preview return only"}</dd></div><div><dt>Email</dt><dd>{request.accessEmailDelivery ?? "not eligible"}</dd></div><div><dt>Approved</dt><dd>{request.decidedAt ? new Date(request.decidedAt).toLocaleString() : "—"}</dd></div></dl><div className="founder-player-actions"><button className="button button-outline" type="button" disabled={busyPlayer !== null} onClick={() => regenerate(request)}><RefreshCcw size={14}/> Regenerate magic link</button><Link className="button button-quiet" href={`/player/${encodeURIComponent(request.canonicalUsername)}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open public player</Link></div></article>)}</div></section> : null}

    {claimed.length ? <section className="desk-section approved-beta-requests"><p className="kicker">CLAIMED</p><div className="pending-request-grid">{claimed.map((request) => <article className="pending-request-card access-ready-card" id={`request-${request.id}`} key={request.id}><header>{request.avatar ? <Image src={request.avatar} alt="" width={46} height={46} unoptimized/> : <div className="universal-avatar">{request.canonicalUsername.slice(0,2).toUpperCase()}</div>}<div><h3>{request.canonicalUsername}</h3><code>Chess.com ID {request.chessPlayerId}</code></div><span className="state-pill ready">CLAIMED</span></header><dl><div><dt>Claimed</dt><dd>{request.claimedAt ? new Date(request.claimedAt).toLocaleString() : "Magic access consumed"}</dd></div><div><dt>Fallback access</dt><dd>{playerById.get(request.chessPlayerId)?.betaAccessStatus === "active" ? "Beta Access active" : "See identity card below"}</dd></div></dl><div className="founder-player-actions"><Link className="button button-quiet" href={`/player/${encodeURIComponent(request.canonicalUsername)}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open public player</Link></div></article>)}</div></section> : null}

    {approvedNeedsReview.length ? <section className="desk-section approved-beta-requests"><p className="kicker">APPROVED · ACCESS CHECK</p><div className="pending-request-grid">{approvedNeedsReview.map((request) => <article className="pending-request-card access-ready-card" id={`request-${request.id}`} key={request.id}><header><div><h3>{request.canonicalUsername}</h3><code>Chess.com ID {request.chessPlayerId}</code></div><span className="state-pill processing">ACCESS CHECK</span></header><p>This historical approval has no active fallback credential or Activation Bridge claim state. Review the player identity below before taking a recovery action.</p></article>)}</div></section> : null}

    <section className="founder-access-create"><div><p className="kicker">RECOVERY ACCESS</p><h2>Username + Beta code remains the fallback.</h2><p>Normal new-player activation now uses Preview → magic access. Keep this manual path for recovery.</p></div><div className="founder-access-form"><label htmlFor="founder-beta-username">Approved Chess.com username</label><input id="founder-beta-username" value={username} onChange={(event) => setUsername(event.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={50}/><button className="button button-lime" type="button" onClick={() => mutate("create")} disabled={busyPlayer !== null}>{busyPlayer === "create" ? <><LoaderCircle className="button-spinner" size={15}/> Creating</> : <><KeyRound size={15}/> Create Beta Access</>}</button></div></section>

    {manualCode ? <section className="one-time-access-code" aria-live="polite"><button type="button" className="one-time-code-close" aria-label="Hide access code" onClick={() => setManualCode(null)}><X size={18}/></button><UserRoundCheck size={24}/><div><p className="kicker">FALLBACK ACCESS {manualCode.action.toUpperCase()}</p><h3>{manualCode.username}</h3><p>Copy this recovery code now. Raw Beta Access codes are not stored for later retrieval.</p><code>{manualCode.accessCode}</code><div className="one-time-code-actions"><button className="button button-dark" type="button" onClick={async () => { await navigator.clipboard.writeText(manualCode.accessCode); setCopied("code"); }}><Clipboard size={15}/> {copied === "code" ? "Code copied" : "Copy code"}</button></div></div></section> : null}

    {error ? <p className="founder-access-error" role="alert">{error}</p> : null}

    <section className="desk-section founder-player-directory"><div className="founder-directory-heading"><div><p className="kicker">IDENTITY AND MEMBERSHIP</p><h2>Founding Beta players</h2><p>Stable identity, account state, retained Desks, hydrated private contact and provider status.</p></div></div>{loading ? <div className="founder-directory-loading"><LoaderCircle className="button-spinner"/> Loading player identities</div> : players.length ? <div className="founder-player-grid">{players.map((player) => <article className="founder-player-card" key={player.playerId}><header>{player.avatar ? <Image src={player.avatar} alt="" width={44} height={44} unoptimized/> : <div className="universal-avatar">{player.username.slice(0,2).toUpperCase()}</div>}<div><h3>{player.username}</h3><code>Chess.com ID {player.playerId}</code></div><span className={`state-pill ${player.accountStatus === "active" ? "ready" : "processing"}`}>{player.accountStatus}</span></header><dl><div><dt>Founding Beta</dt><dd>{player.betaAccessStatus === "active" ? "Beta Access active" : player.betaAccessStatus === "revoked" ? "Beta Access revoked" : "Access not created"}</dd></div><div><dt>Contact</dt><dd>{player.preferredContactMethod && player.preferredContactValue ? `${player.preferredContactMethod}: ${player.preferredContactValue}` : "Not confirmed"}</dd></div><div><dt>Desks stored</dt><dd>{player.desksStored} of 4</dd></div><div><dt>Latest Desk</dt><dd>{player.latestDesk?.periodLabel ?? "No stored Desk"}</dd></div><div><dt>Last seen</dt><dd>{player.lastSeen ? new Date(player.lastSeen).toLocaleString() : "Not recorded"}</dd></div><div><dt>Chess.com OAuth</dt><dd>{player.oauthLinked ? "OAuth linked" : "Awaiting OAuth"}</dd></div></dl><div className="founder-player-actions">{player.betaAccessStatus === "not_created" ? <button className="button button-outline" type="button" onClick={() => { setUsername(player.username); window.scrollTo({ top: 0, behavior: "smooth" }); }}><KeyRound size={14}/> Create fallback access</button> : <button className="button button-outline" type="button" onClick={() => mutate("reset", player.playerId)} disabled={busyPlayer !== null}><RefreshCcw size={14}/> Reset fallback code</button>}{player.betaAccessStatus === "active" ? <button className="button button-quiet" type="button" onClick={() => mutate("revoke", player.playerId)} disabled={busyPlayer !== null}><ShieldX size={14}/> Revoke Access</button> : null}<Link className="button button-quiet" href={`/player/${encodeURIComponent(player.username)}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open Public Coverage</Link></div></article>)}</div> : <div className="universe-empty"><p>No persistent BoardSignal player accounts exist yet.</p></div>}</section>
  </>;
}

function RequestCard({ request, busy, onApprove, onDecline }: { request: RequestRow; busy: boolean; onApprove: () => void; onDecline: () => void }) {
  const preview = request.previewSnapshot;
  const returnLabel = request.activationReturnMethod === "device" && request.activationDevice?.registeredAt
    ? "DEVICE ALERTS ENABLED"
    : request.activationReturnMethod === "return_here"
      ? "SAVED ON DEVICE"
      : request.preferredContactMethod && request.preferredContactValue
        ? `${request.preferredContactMethod.toUpperCase()} · ${request.preferredContactValue}`
        : "PREVIEW ONLY · RETURN METHOD NOT CHOSEN";
  return <article className="pending-request-card new-request-card" id={`request-${request.id}`}><header>{request.avatar ? <Image src={request.avatar} alt="" width={46} height={46} unoptimized/> : <div className="universal-avatar">{request.canonicalUsername.slice(0,2).toUpperCase()}</div>}<div><span className="request-new-label">NEW REQUEST</span><h3>{request.canonicalUsername}</h3><code>Chess.com ID {request.chessPlayerId}</code></div></header><dl><div><dt>Return</dt><dd>{returnLabel}</dd></div><div><dt>Requested</dt><dd>{new Date(request.requestedAt).toLocaleString()}</dd></div></dl>{preview ? <div className="request-preview-summary"><span>PREVIEW READY</span><strong>{preview.games} games found</strong><p>{preview.wins}W · {preview.draws}D · {preview.losses}L{preview.primaryPool ? ` · ${preview.primaryPool}` : ""}</p></div> : <div className="request-preview-summary is-error"><span>REQUEST SAVED</span><p>{request.previewError ?? "Preview is not ready yet. Approval can still continue."}</p></div>}<div className="founder-player-actions"><button className="button button-lime" type="button" disabled={busy} onClick={onApprove}>{busy ? <LoaderCircle className="button-spinner" size={14}/> : <Check size={14}/>} Approve + Prepare Access</button><button className="button button-quiet" type="button" disabled={busy} onClick={onDecline}><XCircle size={14}/> Decline</button>{request.profileUrl ? <a className="button button-outline" href={request.profileUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open public Chess.com profile</a> : null}</div></article>;
}
