"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Clipboard, ExternalLink, KeyRound, LoaderCircle, RefreshCcw, ShieldX, UserRoundCheck, X } from "lucide-react";
import type { BoardSignalContactMethod, FounderPlayerIdentityRow } from "@/lib/boardsignal/account";
import type { BetaActivationReturnMethod, BoardSignalBetaPreview } from "@/lib/boardsignal/activation";
import FounderBetaRequestAlerts from "@/components/FounderBetaRequestAlerts";

type RequestRow = {
  id: string;
  chessPlayerId: number;
  canonicalUsername: string;
  avatar?: string;
  profileUrl?: string;
  preferredContactMethod?: BoardSignalContactMethod;
  preferredContactValue?: string;
  requestedAt: string;
  activationReturnMethod?: BetaActivationReturnMethod;
  activationDevice?: { registeredAt?: string } | null;
  activationDeviceDelivery?: "delivered" | "failed" | "not_eligible";
  status: "pending" | "approved" | "rejected";
  decidedAt?: string;
  claimedAt?: string;
  provisionalClaimedAt?: string;
  identityReviewStatus?: "pending" | "confirmed" | "rejected";
  founderAlertRequest?: { status: "delivered" | "failed" | "not_eligible"; attemptedAt: string };
  founderAlertProvisionalClaim?: { status: "delivered" | "failed" | "not_eligible"; attemptedAt: string };
  previewSnapshot?: BoardSignalBetaPreview;
  previewError?: string;
  accessEmailDelivery?: "delivered" | "failed" | "not_eligible" | "not_configured";
  magicAccess?: { expiresAt?: string; consumedAt?: string };
};

type ApiResult = {
  ok: boolean;
  players?: FounderPlayerIdentityRow[];
  requests?: RequestRow[];
  player?: { username?: string; playerId: number };
  accessCode?: string;
  approvalMessage?: string;
  magicLink?: string;
  magicAccessExpiresAt?: string;
  accessEmailDelivery?: RequestRow["accessEmailDelivery"];
  deviceDelivery?: RequestRow["activationDeviceDelivery"];
  playerAlreadyInside?: boolean;
  publicHighlights?: { status?: string; repairAvailable?: boolean; error?: string };
  error?: string;
};

type ManualCode = { username: string; playerId: number; accessCode: string; action: "created" | "reset" };
type PreparedAccess = {
  requestId: string;
  username: string;
  playerId: number;
  accessCode?: string;
  magicLink: string;
  approvalMessage: string;
  expiresAt?: string;
  emailDelivery?: RequestRow["accessEmailDelivery"];
  deviceDelivery?: RequestRow["activationDeviceDelivery"];
};

const FOUNDER_DIRECTORY_CLIENT_CACHE_MS = 2_500;
let founderDirectoryInFlight: Promise<ApiResult> | null = null;
let founderDirectoryClientCache: { at: number; value: ApiResult } | null = null;

function invalidateFounderDirectoryClientCache() {
  founderDirectoryClientCache = null;
}

async function fetchFounderDirectory(): Promise<ApiResult> {
  const now = Date.now();
  if (founderDirectoryClientCache && now - founderDirectoryClientCache.at < FOUNDER_DIRECTORY_CLIENT_CACHE_MS) return founderDirectoryClientCache.value;
  if (founderDirectoryInFlight) return founderDirectoryInFlight;
  founderDirectoryInFlight = fetch("/api/admin/boardsignal/beta-access", { cache: "no-store" })
    .then(async (response) => {
      const body = await response.json() as ApiResult;
      if (!response.ok || !body.ok || !body.players || !body.requests) throw new Error(body.error ?? "BoardSignal player identities could not be loaded.");
      founderDirectoryClientCache = { at: Date.now(), value: body };
      return body;
    })
    .finally(() => { founderDirectoryInFlight = null; });
  return founderDirectoryInFlight;
}

function privateAccessLabel(status: FounderPlayerIdentityRow["accountStatus"]) {
  return status === "active" ? "Active" : status === "paused" ? "Paused" : "Deleted";
}

function identityLabel(player: FounderPlayerIdentityRow) {
  if (player.identityStatus === "provisional") return "Founder review available";
  if (player.identityStatus === "founder_reviewed") return "Founder reviewed";
  if (player.identityStatus === "oauth_verified") return "OAuth verified";
  if (player.identityStatus === "revoked") return "Revoked";
  if (player.oauthLinked) return "OAuth verified";
  return "Legacy / status not recorded";
}

function publicHighlightsLabel(status: FounderPlayerIdentityRow["publicHighlights"]["status"]) {
  if (status === "live") return "Live";
  if (status === "waiting_identity_review") return "Waiting for optional identity review";
  if (status === "no_completed_review") return "No completed Review yet";
  if (status === "no_safe_highlight") return "No safe public highlight yet";
  if (status === "repair_needed") return "Repair needed";
  return "Unavailable";
}

function fallbackAccessLabel(status: FounderPlayerIdentityRow["betaAccessStatus"]) {
  return status === "active" ? "Active" : status === "revoked" ? "Revoked" : "Not configured";
}

function returnLabel(request: RequestRow) {
  if (request.activationReturnMethod === "device" && request.activationDevice?.registeredAt) return "DEVICE ALERTS ENABLED";
  if (request.activationReturnMethod === "return_here") return "SAVED ON DEVICE";
  if (request.preferredContactMethod && request.preferredContactValue) return `${request.preferredContactMethod.toUpperCase()} · ${request.preferredContactValue}`;
  return "PREVIEW SAVED";
}

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
  const [search, setSearch] = useState("");

  const identityReviews = useMemo(
    () => requests.filter((item) => item.status === "pending" && Boolean(item.provisionalClaimedAt) && item.identityReviewStatus !== "rejected"),
    [requests],
  );
  const previewActivity = useMemo(
    () => requests.filter((item) => item.status === "pending" && !item.provisionalClaimedAt),
    [requests],
  );
  const playerById = useMemo(() => new Map(players.map((player) => [player.playerId, player])), [players]);
  const approved = useMemo(() => requests.filter((item) => item.status === "approved").slice(0, 24), [requests]);
  const claimed = useMemo(() => approved.filter((item) => Boolean(item.claimedAt || item.magicAccess?.consumedAt)), [approved]);
  const accessReady = useMemo(() => approved.filter((item) => !item.claimedAt && !item.magicAccess?.consumedAt && Boolean(item.magicAccess)), [approved]);
  const legacyExisting = useMemo(() => approved.filter((item) => !item.claimedAt && !item.magicAccess && playerById.get(item.chessPlayerId)?.betaAccessStatus === "active"), [approved, playerById]);
  const identityConfirmed = useMemo(() => approved.filter((item) => Boolean(item.provisionalClaimedAt) && item.identityReviewStatus === "confirmed"), [approved]);
  const approvedNeedsReview = useMemo(
    () => approved.filter((item) => !claimed.includes(item) && !accessReady.includes(item) && !legacyExisting.includes(item) && !identityConfirmed.includes(item)),
    [accessReady, approved, claimed, identityConfirmed, legacyExisting],
  );
  const visiblePlayers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? players.filter((player) => `${player.username} ${player.preferredContactValue ?? ""}`.toLowerCase().includes(needle)) : players;
  }, [players, search]);

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const body = await fetchFounderDirectory();
      setPlayers(body.players!);
      setRequests(body.requests!);
      const params = new URLSearchParams(window.location.search);
      const requestId = params.get("request");
      const playerId = params.get("player");
      if (requestId) window.setTimeout(() => document.getElementById(`request-${CSS.escape(requestId)}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
      if (playerId) window.setTimeout(() => document.getElementById(`player-${CSS.escape(playerId)}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "BoardSignal player identities could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPlayers(); }, [loadPlayers]);

  async function mutate(action: "create" | "reset" | "revoke", playerId?: number) {
    if (action === "create" && !username.trim()) { setError("Enter the player's Chess.com username."); return; }
    if (action === "reset" && !window.confirm("Reset this player's fallback code and sign out existing fallback sessions?")) return;
    if (action === "revoke" && !window.confirm("Revoke this player's fallback access and sign out existing fallback sessions?")) return;
    setBusyPlayer(action === "create" ? "create" : playerId ?? null);
    setError("");
    setManualCode(null);
    setPreparedAccess(null);
    setCopied(null);
    try {
      const response = await fetch("/api/admin/boardsignal/beta-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(action === "create" ? { action, username: username.trim() } : { action, playerId }),
      });
      const body = await response.json() as ApiResult;
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Fallback access could not be updated.");
      if ((action === "create" || action === "reset") && body.accessCode && body.player) {
        setManualCode({
          username: body.player.username ?? players.find((player) => player.playerId === body.player!.playerId)?.username ?? "Player",
          playerId: body.player.playerId,
          accessCode: body.accessCode,
          action: action === "create" ? "created" : "reset",
        });
      }
      if (action === "create") setUsername("");
      invalidateFounderDirectoryClientCache();
      await loadPlayers();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fallback access could not be updated.");
    } finally {
      setBusyPlayer(null);
    }
  }

  async function repairPublicHighlights(player: FounderPlayerIdentityRow) {
    setBusyPlayer(player.playerId);
    setError("");
    setManualCode(null);
    setPreparedAccess(null);
    try {
      const response = await fetch("/api/admin/boardsignal/beta-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "repairPublicHighlights", playerId: player.playerId }),
      });
      const body = await response.json() as ApiResult;
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Public highlights could not be repaired.");
      invalidateFounderDirectoryClientCache();
      await loadPlayers();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Public highlights could not be repaired.");
    } finally {
      setBusyPlayer(null);
    }
  }

  async function decideIdentity(request: RequestRow, action: "confirmIdentity" | "revokeIdentity") {
    if (!request.provisionalClaimedAt) {
      setError("Founder identity review becomes available only after the player has entered private BoardSignal access.");
      return;
    }
    if (action === "revokeIdentity" && !window.confirm("Pause this provisional private account and revoke its current sessions? Stored BoardSignal data remains available for Founder recovery.")) return;
    setBusyPlayer(request.id);
    setError("");
    setPreparedAccess(null);
    setManualCode(null);
    setCopied(null);
    setShowFallbackCode(false);
    try {
      const response = await fetch("/api/admin/boardsignal/beta-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action, requestId: request.id }),
      });
      const body = await response.json() as ApiResult;
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Identity review could not be updated.");
      if (action === "confirmIdentity" && body.player && body.magicLink && body.approvalMessage) {
        setPreparedAccess({
          requestId: request.id,
          username: body.player.username ?? request.canonicalUsername,
          playerId: body.player.playerId,
          accessCode: body.accessCode,
          magicLink: body.magicLink,
          approvalMessage: body.approvalMessage,
          expiresAt: body.magicAccessExpiresAt,
          emailDelivery: body.accessEmailDelivery,
          deviceDelivery: body.deviceDelivery,
        });
      }
      invalidateFounderDirectoryClientCache();
      await loadPlayers();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Identity review could not be updated.");
    } finally {
      setBusyPlayer(null);
    }
  }

  async function regenerate(request: RequestRow) {
    const hasMagic = Boolean(request.magicAccess);
    if (!window.confirm(hasMagic
      ? `Generate a fresh one-time recovery link for ${request.canonicalUsername}? The prior magic link will stop working. Their normal private account stays unchanged.`
      : `Create an optional one-time recovery link for ${request.canonicalUsername}? This does not gate normal Google/private access.`)) return;
    setBusyPlayer(request.id);
    setError("");
    setCopied(null);
    try {
      const response = await fetch("/api/admin/boardsignal/beta-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "regenerateMagic", requestId: request.id }),
      });
      const body = await response.json() as ApiResult;
      if (!response.ok || !body.ok || !body.magicLink || !body.approvalMessage) throw new Error(body.error ?? "A fresh recovery link could not be prepared.");
      setPreparedAccess({
        requestId: request.id,
        username: request.canonicalUsername,
        playerId: request.chessPlayerId,
        magicLink: body.magicLink,
        approvalMessage: body.approvalMessage,
        expiresAt: body.magicAccessExpiresAt,
        emailDelivery: request.accessEmailDelivery,
      });
      invalidateFounderDirectoryClientCache();
      await loadPlayers();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A fresh recovery link could not be prepared.");
    } finally {
      setBusyPlayer(null);
    }
  }

  async function copyPrepared(kind: "code" | "message" | "link") {
    if (!preparedAccess) return;
    const value = kind === "code" ? preparedAccess.accessCode : kind === "message" ? preparedAccess.approvalMessage : preparedAccess.magicLink;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(kind);
  }

  return <>
    <FounderBetaRequestAlerts />

    <section className="desk-section pending-beta-requests">
      <div className="founder-directory-heading">
        <div>
          <p className="kicker">IDENTITY REVIEWS · {identityReviews.length}</p>
          <h2>Optional public identity review.</h2>
          <p>Players already have private BoardSignal access. Confirming identity is for verified public participation in the Universe; it does not unlock or approve their private account.</p>
        </div>
        <button className="button button-quiet" type="button" onClick={() => { invalidateFounderDirectoryClientCache(); void loadPlayers(); }} disabled={loading}><RefreshCcw size={15}/> Refresh</button>
      </div>
      {loading ? <div className="founder-directory-loading"><LoaderCircle className="button-spinner"/> Loading identity reviews</div> : identityReviews.length ? <div className="pending-request-grid">{identityReviews.map((request) => <IdentityReviewCard key={request.id} request={request} busy={busyPlayer === request.id} onConfirm={() => decideIdentity(request, "confirmIdentity")} onRevoke={() => decideIdentity(request, "revokeIdentity")} onRecovery={() => regenerate(request)} />)}</div> : <div className="universe-empty"><p>No player identities currently need Founder review.</p></div>}
    </section>

    <section className="desk-section pending-beta-requests">
      <div className="founder-directory-heading">
        <div>
          <p className="kicker">PREVIEW ACTIVITY · {previewActivity.length}</p>
          <h2>People exploring BoardSignal.</h2>
          <p>Preview activity is informational only. These people have not asked you for access, require no approval, and may continue into private BoardSignal without Founder action.</p>
        </div>
      </div>
      {loading ? <div className="founder-directory-loading"><LoaderCircle className="button-spinner"/> Loading Preview activity</div> : previewActivity.length ? <div className="pending-request-grid">{previewActivity.map((request) => <PreviewActivityCard key={request.id} request={request} />)}</div> : <div className="universe-empty"><p>No current Preview-only activity.</p></div>}
    </section>

    {preparedAccess ? <section className="one-time-access-code activation-access-ready" aria-live="polite"><button type="button" className="one-time-code-close" aria-label="Hide prepared recovery access" onClick={() => setPreparedAccess(null)}><X size={18}/></button><UserRoundCheck size={24}/><div><p className="kicker">RECOVERY READY</p><h3>{preparedAccess.username}</h3><p>A one-time recovery route is ready. This is fallback support only and does not gate the player's normal private BoardSignal access.</p><div className="one-time-code-actions"><button className="button button-dark" type="button" onClick={() => copyPrepared("message")}><Clipboard size={15}/> {copied === "message" ? "Message copied" : "Copy recovery message"}</button><button className="button button-outline" type="button" onClick={() => copyPrepared("link")}><Clipboard size={15}/> {copied === "link" ? "Link copied" : "Copy recovery link"}</button>{preparedAccess.accessCode ? <button className="button button-quiet" type="button" onClick={() => setShowFallbackCode((value) => !value)}><KeyRound size={15}/> {showFallbackCode ? "Hide fallback code" : "Show fallback access code"}</button> : null}</div>{showFallbackCode && preparedAccess.accessCode ? <div className="activation-fallback-code"><code>{preparedAccess.accessCode}</code><button className="text-link social-text-button" type="button" onClick={() => copyPrepared("code")}>{copied === "code" ? "Copied" : "Copy code"}</button></div> : null}<pre className="approval-message-preview">{preparedAccess.approvalMessage}</pre>{preparedAccess.expiresAt ? <small>Recovery link expires {new Date(preparedAccess.expiresAt).toLocaleString()}.</small> : null}</div></section> : null}
    {error ? <p className="founder-access-error" role="alert">{error}</p> : null}

    <section className="desk-section founder-player-directory compact-founder-player-directory">
      <div className="founder-directory-heading"><div><p className="kicker">PLAYER DIRECTORY</p><h2>Private players and public identity state.</h2><p>Private access, optional identity review, public highlights and recovery state stay separate.</p></div><label className="founder-player-search"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Username or contact" /></label></div>
      {loading ? <div className="founder-directory-loading"><LoaderCircle className="button-spinner"/> Loading player identities</div> : visiblePlayers.length ? <div className="founder-player-compact-list">{visiblePlayers.map((player) => <article className="founder-player-compact-card" id={`player-${player.playerId}`} key={player.playerId}>
        <header>{player.avatar ? <Image src={player.avatar} alt="" width={42} height={42} unoptimized/> : <div className="universal-avatar">{player.username.slice(0,2).toUpperCase()}</div>}<div><h3>{player.username}</h3><span>Chess.com ID {player.playerId} · {player.desksStored} / 4 Reviews · {identityLabel(player)}</span></div><span className={`state-pill ${player.accountStatus === "active" ? "ready" : "processing"}`}>{privateAccessLabel(player.accountStatus)}</span></header>
        <details><summary>Manage player</summary><dl><div><dt>PRIVATE ACCESS</dt><dd>{privateAccessLabel(player.accountStatus)}</dd></div><div><dt>IDENTITY</dt><dd>{identityLabel(player)}</dd></div><div><dt>PUBLIC HIGHLIGHTS</dt><dd>{publicHighlightsLabel(player.publicHighlights.status)}{player.publicHighlights.expectedCoverage ? ` · ${player.publicHighlights.liveCoverage} of ${player.publicHighlights.expectedCoverage}` : ""}</dd></div><div><dt>FALLBACK ACCESS</dt><dd>{fallbackAccessLabel(player.betaAccessStatus)}</dd></div><div><dt>CONTACT</dt><dd>{player.preferredContactMethod && player.preferredContactValue ? `${player.preferredContactMethod}: ${player.preferredContactValue}` : "Not confirmed"}</dd></div><div><dt>LATEST REVIEW</dt><dd>{player.latestDesk?.periodLabel ?? "No stored Review"}</dd></div><div><dt>LAST SEEN</dt><dd>{player.lastSeen ? new Date(player.lastSeen).toLocaleString() : "Not recorded"}</dd></div></dl><div className="founder-player-actions">{player.publicHighlights.repairAvailable ? <button className="button button-outline" type="button" onClick={() => repairPublicHighlights(player)} disabled={busyPlayer !== null}>{busyPlayer === player.playerId ? <LoaderCircle className="button-spinner" size={14}/> : <RefreshCcw size={14}/>} Repair public highlights</button> : null}{player.betaAccessStatus === "not_created" ? <button className="button button-outline" type="button" onClick={() => { setUsername(player.username); document.getElementById("founder-recovery-access")?.scrollIntoView({ behavior: "smooth" }); }}><KeyRound size={14}/> Prepare fallback access</button> : <button className="button button-outline" type="button" onClick={() => mutate("reset", player.playerId)} disabled={busyPlayer !== null}><RefreshCcw size={14}/> Reset fallback code</button>}{player.betaAccessStatus === "active" ? <button className="button button-quiet" type="button" onClick={() => mutate("revoke", player.playerId)} disabled={busyPlayer !== null}><ShieldX size={14}/> Revoke fallback access</button> : null}<Link className="button button-quiet" href={`/player/${encodeURIComponent(player.username)}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open Public Coverage</Link></div></details>
      </article>)}</div> : <div className="universe-empty"><p>No persistent BoardSignal player accounts match this search.</p></div>}
    </section>

    <details className="founder-management-disclosure" id="founder-recovery-access"><summary><span><strong>LEGACY ACCESS & RECOVERY</strong><small>Fallback codes and one-time recovery links only</small></span><span>OPEN</span></summary><div className="founder-secondary-body">
      <section className="founder-access-create"><div><p className="kicker">RECOVERY ACCESS</p><h2>Keep fallback access quiet.</h2><p>Google/private access is the normal player path. Username + access code and magic links remain available only for recovery and historical compatibility.</p></div><div className="founder-access-form"><label htmlFor="founder-beta-username">Chess.com username</label><input id="founder-beta-username" value={username} onChange={(event) => setUsername(event.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={50}/><button className="button button-lime" type="button" onClick={() => mutate("create")} disabled={busyPlayer !== null}>{busyPlayer === "create" ? <><LoaderCircle className="button-spinner" size={15}/> Creating</> : <><KeyRound size={15}/> Create recovery access</>}</button></div></section>
      {manualCode ? <section className="one-time-access-code" aria-live="polite"><button type="button" className="one-time-code-close" aria-label="Hide access code" onClick={() => setManualCode(null)}><X size={18}/></button><UserRoundCheck size={24}/><div><p className="kicker">FALLBACK ACCESS {manualCode.action.toUpperCase()}</p><h3>{manualCode.username}</h3><p>Copy this recovery code now. Raw access codes are not stored for later retrieval.</p><code>{manualCode.accessCode}</code><div className="one-time-code-actions"><button className="button button-dark" type="button" onClick={async () => { await navigator.clipboard.writeText(manualCode.accessCode); setCopied("code"); }}><Clipboard size={15}/> {copied === "code" ? "Code copied" : "Copy code"}</button></div></div></section> : null}
      <AccessStateGroup title="LEGACY / EXISTING ACTIVE" requests={legacyExisting} busy={busyPlayer} onRecovery={regenerate}/><AccessStateGroup title="RECOVERY LINK READY" requests={accessReady} busy={busyPlayer} onRecovery={regenerate}/><AccessStateGroup title="RECOVERY CLAIMED" requests={claimed} busy={busyPlayer} onRecovery={regenerate}/><AccessStateGroup title="IDENTITY CONFIRMED" requests={identityConfirmed} busy={busyPlayer} onRecovery={regenerate}/><AccessStateGroup title="HISTORICAL REVIEW STATE" requests={approvedNeedsReview} busy={busyPlayer} onRecovery={regenerate}/>
    </div></details>
  </>;
}

function AccessStateGroup({ title, requests, busy, onRecovery }: { title: string; requests: RequestRow[]; busy: number | string | "create" | null; onRecovery: (request: RequestRow) => void }) {
  if (!requests.length) return null;
  return <section className="founder-secondary-card approved-beta-requests"><p className="kicker">{title}</p><div className="founder-access-state-list">{requests.map((request) => <article id={`request-${request.id}`} key={request.id}><div><strong>{request.canonicalUsername}</strong><small>Chess.com ID {request.chessPlayerId} · {request.decidedAt ? new Date(request.decidedAt).toLocaleString() : request.requestedAt ? new Date(request.requestedAt).toLocaleString() : "Historical"}</small></div><div className="founder-player-actions"><button className="button button-outline" type="button" disabled={busy !== null} onClick={() => onRecovery(request)}><KeyRound size={14}/> Recovery options</button>{request.profileUrl ? <a className="button button-quiet" href={request.profileUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Chess.com profile</a> : <Link className="button button-quiet" href={`/player/${encodeURIComponent(request.canonicalUsername)}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Public coverage</Link>}</div></article>)}</div></section>;
}

function IdentityReviewCard({ request, busy, onConfirm, onRevoke, onRecovery }: { request: RequestRow; busy: boolean; onConfirm: () => void; onRevoke: () => void; onRecovery: () => void }) {
  const preview = request.previewSnapshot;
  const alertState = request.founderAlertProvisionalClaim?.status;
  return <article className="pending-request-card new-request-card" id={`request-${request.id}`}>
    <header>{request.avatar ? <Image src={request.avatar} alt="" width={46} height={46} unoptimized/> : <div className="universal-avatar">{request.canonicalUsername.slice(0,2).toUpperCase()}</div>}<div><span className="request-new-label">PRIVATE ACCESS ACTIVE · IDENTITY REVIEW AVAILABLE</span><h3>{request.canonicalUsername}</h3><code>Chess.com ID {request.chessPlayerId}</code></div></header>
    <p>This player is already inside their private BoardSignal account. Founder review is optional verification for official public participation; it does not control private access.</p>
    <dl><div><dt>Private access</dt><dd>Active</dd></div><div><dt>Return</dt><dd>{returnLabel(request)}</dd></div><div><dt>Identity alert</dt><dd>{alertState === "delivered" ? "Delivered" : alertState ? "Not delivered" : "Not recorded"}</dd></div><div><dt>Preview started</dt><dd>{new Date(request.requestedAt).toLocaleString()}</dd></div></dl>
    {preview ? <div className="request-preview-summary"><span>PREVIEW SNAPSHOT</span><strong>{preview.games} games found</strong><p>{preview.wins}W · {preview.draws}D · {preview.losses}L{preview.primaryPool ? ` · ${preview.primaryPool}` : ""}</p></div> : null}
    <div className="founder-player-actions"><button className="button button-lime" type="button" disabled={busy} onClick={onConfirm}>{busy ? <LoaderCircle className="button-spinner" size={14}/> : <Check size={14}/>} Confirm public identity</button><button className="button button-quiet" type="button" disabled={busy} onClick={onRevoke}><ShieldX size={14}/> Revoke provisional identity</button><button className="button button-outline" type="button" disabled={busy} onClick={onRecovery}><KeyRound size={14}/> Recovery options</button>{request.profileUrl ? <a className="button button-outline" href={request.profileUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open Chess.com profile</a> : null}</div>
  </article>;
}

function PreviewActivityCard({ request }: { request: RequestRow }) {
  const preview = request.previewSnapshot;
  return <article className="pending-request-card new-request-card" id={`request-${request.id}`}>
    <header>{request.avatar ? <Image src={request.avatar} alt="" width={46} height={46} unoptimized/> : <div className="universal-avatar">{request.canonicalUsername.slice(0,2).toUpperCase()}</div>}<div><span className="request-new-label">PREVIEW ACTIVE · PRIVATE ACCESS NOT STARTED</span><h3>{request.canonicalUsername}</h3><code>Chess.com ID {request.chessPlayerId}</code></div></header>
    <p>No Founder action required. This is Preview activity, not an access request. The player can continue into private BoardSignal without approval.</p>
    <dl><div><dt>Return</dt><dd>{returnLabel(request)}</dd></div><div><dt>Private access</dt><dd>Not started</dd></div><div><dt>Preview started</dt><dd>{new Date(request.requestedAt).toLocaleString()}</dd></div></dl>
    {preview ? <div className="request-preview-summary"><span>PREVIEW READY</span><strong>{preview.games} games found</strong><p>{preview.wins}W · {preview.draws}D · {preview.losses}L{preview.primaryPool ? ` · ${preview.primaryPool}` : ""}</p></div> : <div className="request-preview-summary is-error"><span>PREVIEW STATUS</span><p>{request.previewError ?? "Preview is not ready yet. Private access still does not depend on Founder action."}</p></div>}
    <div className="founder-player-actions">{request.profileUrl ? <a className="button button-outline" href={request.profileUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open Chess.com profile</a> : null}</div>
  </article>;
}
