"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { browserLocalPersistence, setPersistence, signInWithCustomToken } from "firebase/auth";
import { ArrowRight, Check, ChevronRight, LoaderCircle, LockKeyhole, RefreshCcw, ShieldCheck, Sparkles, Swords, TrendingUp } from "lucide-react";
import type { BetaPreviewStatus, BoardSignalBetaPreview } from "@/lib/boardsignal/activation";
import { BETA_PREVIEW_POLL_MS } from "@/lib/boardsignal/activation";
import { auth } from "@/utils/firebaseConfig";

function statusStorageKey(requestId: string) { return `boardsignal-beta-preview-status-v1:${requestId}`; }
function introStorageKey(requestId: string) { return `boardsignal-beta-preview-intro-v1:${requestId}`; }

function formatSync(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Just now" : parsed.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function BetaPreviewRoom({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [statusToken, setStatusToken] = useState("");
  const [status, setStatus] = useState<BetaPreviewStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const [showAskIntro, setShowAskIntro] = useState(false);
  const approvalNotifiedRef = useRef(false);
  const pollInFlightRef = useRef(false);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const fromHash = fragment.get("status") ?? "";
    const fromSession = window.sessionStorage.getItem(statusStorageKey(requestId)) ?? "";
    const token = fromHash || fromSession;
    if (fromHash) {
      window.sessionStorage.setItem(statusStorageKey(requestId), fromHash);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    setStatusToken(token);
    if (!token) { setLoading(false); setError("This preview link is missing its private request credential. Return through Get My BoardSignal or use the original preview tab."); }
  }, [requestId]);

  const loadStatus = useCallback(async (quiet = false) => {
    if (!statusToken || pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    if (!quiet) setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/boardsignal/beta-preview/${encodeURIComponent(requestId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "status", statusToken }),
      });
      const body = await response.json() as { ok?: boolean; status?: BetaPreviewStatus; error?: string };
      if (!response.ok || !body.ok || !body.status) throw new Error(body.error ?? "BoardSignal preview could not be loaded.");
      setStatus(body.status);
      const preview = body.status.preview;
      if (preview && window.localStorage.getItem(introStorageKey(requestId)) !== "seen") {
        window.localStorage.setItem(introStorageKey(requestId), "seen");
        setShowAskIntro(true);
      }
      window.dispatchEvent(new CustomEvent("boardsignal:preview-context", { detail: { requestId, statusToken } }));
      if (body.status.state === "approved" && !approvalNotifiedRef.current) {
        approvalNotifiedRef.current = true;
        window.dispatchEvent(new CustomEvent("boardsignal:preview-approved", { detail: { requestId } }));
      }
    } catch (reason) {
      if (!quiet) setError(reason instanceof Error ? reason.message : "BoardSignal preview could not be loaded.");
    } finally {
      pollInFlightRef.current = false;
      if (!quiet) setLoading(false);
    }
  }, [requestId, statusToken]);

  useEffect(() => { if (statusToken) void loadStatus(); }, [loadStatus, statusToken]);

  useEffect(() => {
    if (!statusToken || status?.state !== "preview_ready") return;
    const tick = () => { if (document.visibilityState === "visible") void loadStatus(true); };
    const timer = window.setInterval(tick, BETA_PREVIEW_POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void loadStatus(true); };
    const onFocus = () => void loadStatus(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onFocus); };
  }, [loadStatus, status?.state, statusToken]);

  async function retryPreview() {
    if (!statusToken) return;
    setRetrying(true);
    setError("");
    try {
      const response = await fetch(`/api/boardsignal/beta-preview/${encodeURIComponent(requestId)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ action: "retryPreview", statusToken }),
      });
      const body = await response.json() as { ok?: boolean; status?: BetaPreviewStatus; error?: string };
      if (!response.ok || !body.ok || !body.status) throw new Error(body.error ?? "The preview could not be refreshed.");
      setStatus(body.status);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The preview could not be refreshed."); }
    finally { setRetrying(false); }
  }

  async function openPlayerRoom() {
    if (!statusToken || claiming) return;
    setClaiming(true);
    setError("");
    try {
      const response = await fetch(`/api/boardsignal/beta-preview/${encodeURIComponent(requestId)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ action: "claim", statusToken }),
      });
      const body = await response.json() as { ok?: boolean; customToken?: string; error?: string };
      if (!response.ok || !body.ok || !body.customToken) throw new Error(body.error ?? "Private Player Room access could not be opened.");
      await setPersistence(auth, browserLocalPersistence);
      await signInWithCustomToken(auth, body.customToken);
      window.sessionStorage.removeItem(statusStorageKey(requestId));
      router.replace("/boardsignal/player-room?source=beta_preview&tab=desk");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Private Player Room access could not be opened."); }
    finally { setClaiming(false); }
  }

  function ask(prompt: string) {
    window.dispatchEvent(new CustomEvent("boardsignal:ask-open", { detail: { message: prompt } }));
  }

  const preview = status?.preview;
  const approved = status?.state === "approved" && status.accessReady;
  const rejected = status?.state === "rejected";
  const expired = status?.state === "expired";

  if (loading) return <main id="main" className="container beta-preview-room"><section className="beta-preview-loading bs-surface-paper"><LoaderCircle className="button-spinner"/><p className="kicker">BOARD SIGNAL PREVIEW</p><h1>Finding your chess week</h1><p>BoardSignal is opening the safe first look attached to this request.</p></section></main>;

  if (!status && error) return <main id="main" className="container beta-preview-room"><section className="beta-preview-loading bs-surface-paper"><p className="kicker">BOARD SIGNAL PREVIEW</p><h1>This preview couldn't open</h1><p>{error}</p><Link href="/#get-my-boardsignal" className="button button-dark">Get My BoardSignal</Link></section></main>;

  return <main id="main" className={`beta-preview-room ${approved ? "is-approved" : ""}`}>
    <section className="container beta-preview-hero bs-surface-dark">
      <div className="beta-preview-identity">
        {status?.avatar ? <Image src={status.avatar} alt="" width={70} height={70} unoptimized /> : <span className="beta-preview-avatar">{(status?.canonicalUsername ?? "BS").slice(0,2).toUpperCase()}</span>}
        <div><p className="kicker">BOARD SIGNAL PREVIEW</p><h1>{approved ? "You're in." : `We found you, ${status?.canonicalUsername}.`}</h1><p>{approved ? "Your private BoardSignal Player Room is ready." : "Your games are here. While your private Player Room is being approved, BoardSignal can already show you a safe first look."}</p></div>
      </div>
      <div className="beta-preview-status"><span>{approved ? "ACCESS READY" : expired ? "ACCESS EXPIRED" : rejected ? "REQUEST CLOSED" : "PREVIEW READY"}</span><strong>{approved ? "PRIVATE PLAYER ROOM UNLOCKED" : expired ? "FRESH LINK REQUIRED" : rejected ? "FOUNDER REVIEW CLOSED" : "PRIVATE ACCESS PENDING"}</strong>{status?.approvedAt ? <small>Approved {formatSync(status.approvedAt)}</small> : preview ? <small>Preview saved {formatSync(preview.generatedAt)}</small> : null}</div>
      {approved ? <button type="button" className="button button-lime beta-preview-primary-cta" onClick={openPlayerRoom} disabled={claiming}>{claiming ? <><LoaderCircle className="button-spinner" size={16}/> Opening</> : <>Open My Player Room <ArrowRight size={17}/></>}</button> : null}
    </section>

    {error ? <div className="container notice notice-error" role="alert">{error}</div> : null}

    {!preview ? <section className="container beta-preview-failure bs-surface-paper"><Sparkles/><div><p className="kicker">REQUEST SAVED</p><h2>Chess.com didn't return the preview yet.</h2><p>Your Founding Beta request is safe. Preview generation never blocks eventual approval.</p></div><button type="button" className="button button-dark" onClick={retryPreview} disabled={retrying}>{retrying ? <><LoaderCircle className="button-spinner" size={15}/> Trying</> : <><RefreshCcw size={15}/> Try preview again</>}</button></section> : <PreviewContent preview={preview} ask={ask} showAskIntro={showAskIntro} />}

    {rejected ? <section className="container beta-preview-next bs-surface-paper"><p className="kicker">REQUEST STATUS</p><h2>This Founding Beta request is closed.</h2><p>The public-safe preview can remain useful, but private Player Room access was not activated.</p></section> : null}

    {expired ? <section className="container beta-preview-next bs-surface-paper"><p className="kicker">ACCESS WINDOW EXPIRED</p><h2>Your BoardSignal account is still here.</h2><p>The one-time access window expired. Ask Ayanda to prepare a fresh link; username + Beta Access recovery also remains available.</p><div className="resolved-player-actions"><Link className="button button-dark" href="/boardsignal/player-room">Use fallback access</Link><Link className="button button-quiet" href="/#get-my-boardsignal">Return to Founding Beta</Link></div></section> : null}

    {approved ? <div className="beta-preview-sticky-access"><button className="button button-lime" type="button" onClick={openPlayerRoom} disabled={claiming}>{claiming ? "Opening…" : "Open My Player Room"}<ArrowRight size={16}/></button></div> : null}
  </main>;
}

function PreviewContent({ preview, ask, showAskIntro }: { preview: BoardSignalBetaPreview; ask: (prompt: string) => void; showAskIntro: boolean }) {
  const leadPool = useMemo(() => [...preview.pools].sort((a,b) => b.games - a.games)[0], [preview.pools]);
  return <>
    <section className="container beta-preview-week bs-surface-paper">
      <div className="beta-preview-section-heading"><div><p className="kicker">YOUR WEEK</p><h2>{preview.playableWeek ? preview.safeHeadline : "BoardSignal found the profile. The first playable week comes next."}</h2>{preview.period ? <p>{preview.period.label}{preview.period.disclosure ? ` · ${preview.period.disclosure}` : ""}</p> : <p>There isn't a completed playable week to show yet.</p>}</div>{preview.profileUrl ? <a href={preview.profileUrl} target="_blank" rel="noreferrer" className="text-link">Open public Chess.com profile</a> : null}</div>
      {preview.playableWeek ? <div className="beta-preview-stat-grid"><article><span>Games</span><strong>{preview.games}</strong><p>{preview.wins}W · {preview.draws}D · {preview.losses}L</p></article><article><span>Score</span><strong>{preview.score}%</strong><p>{preview.activeDays ?? 0} active day{preview.activeDays === 1 ? "" : "s"}</p></article><article><span>{leadPool?.pool?.toUpperCase() ?? "PRIMARY POOL"}</span><strong>{leadPool?.ratingDelta !== undefined ? `${leadPool.ratingDelta >= 0 ? "+" : ""}${leadPool.ratingDelta}` : "—"}</strong><p>{leadPool?.games ?? 0} games in this pool</p></article><article><span>Strongest run</span><strong>{preview.strongestWinRun ?? 0}</strong><p>consecutive win{preview.strongestWinRun === 1 ? "" : "s"}</p></article></div> : null}
      <div className="beta-preview-highlight"><TrendingUp size={18}/><div><strong>SAFE FIRST LOOK</strong><p>{preview.safeHighlight}</p></div></div>
      <p className="beta-preview-private-rule"><ShieldCheck size={15}/> Private Red, Amber, Blue, evidence, recurrence and coaching interpretation do not appear in Preview.</p>
    </section>

    <section className="container beta-preview-universe bs-surface-paper">
      <div className="beta-preview-section-heading"><div><p className="kicker">YOUR UNIVERSE PREVIEW</p><h2>If you entered the field today…</h2><p>Preview is provisional. You do not become an official Universe participant until Founder approval.</p></div><span className="state-pill processing">PROVISIONAL</span></div>
      {preview.universePreview.length ? <div className="beta-preview-universe-grid">{preview.universePreview.slice(0,4).map((item) => <article key={`${item.categoryId}:${item.scopeLabel ?? "all"}`}><span>{item.categoryTitle}{item.scopeLabel ? ` · ${item.scopeLabel}` : ""}</span><strong>#{item.rank} of {item.denominator}</strong><p>{item.valueLabel}</p>{item.nearestAbove ? <small>In reach: {item.nearestAbove.player} · {item.nearestAbove.valueLabel}</small> : null}<b>IF THE FIELD HELD</b></article>)}</div> : <div className="beta-preview-empty"><p>No compatible provisional category is available from this preview week yet. BoardSignal will not manufacture a rank.</p></div>}
      {preview.recentUniverseActivity.length ? <div className="beta-preview-activity"><p className="kicker">THE FIELD IS MOVING</p>{preview.recentUniverseActivity.slice(0,3).map((item) => <article key={item.eventId}><span>{item.canonicalUsername}</span><strong>{item.headline}</strong><p>{item.supportingFact}</p></article>)}</div> : null}
    </section>

    {showAskIntro ? <section className="container beta-preview-ask bs-surface-dark"><Sparkles size={22}/><div><p className="kicker">ASK BOARDSIGNAL</p><h2>I found your games. Want me to show you what stands out?</h2><p>I can explain this public-safe preview and what unlocks next. I won't invent private Signals before access.</p><div className="beta-preview-ask-actions"><button type="button" onClick={() => ask("Show me my week")}>Show me my week</button><button type="button" onClick={() => ask("Explain my Universe preview")}>Explain the Universe</button><button type="button" onClick={() => ask("What unlocks next?")}>What unlocks next?</button></div></div></section> : null}

    <section className="container beta-preview-progress bs-surface-paper"><div><p className="kicker">PROGRESS</p><h2>Progress starts with Desk Two.</h2><p>Your first private Desk becomes the baseline. When the next seven-day episode closes, BoardSignal can show what moved, repeated and changed.</p></div><div className="beta-preview-progress-track"><article><span>DESK 1</span><strong>Building your baseline</strong><Check size={17}/></article><ChevronRight/><article><span>DESK 2</span><strong>Next comparison</strong><span className="progress-future-dot"/></article></div></section>

    <section className="container beta-preview-players bs-surface-paper"><div className="beta-preview-section-heading"><div><p className="kicker">PLAYERS IN THE FIELD</p><h2>BoardSignal already has a world around your week.</h2><p>Public-safe coverage only. Connect after your private Player Room unlocks.</p></div><LockKeyhole size={19}/></div>{preview.publicPlayers.length ? <div className="beta-preview-player-grid">{preview.publicPlayers.slice(0,6).map((player) => <article key={player.canonicalUsername}><div><span>BOARDSIGNAL PLAYER</span><h3>{player.canonicalUsername}</h3></div><strong>{player.placement ?? "Active in the field"}</strong><p>{player.safeHighlight ?? "Public BoardSignal coverage"}</p>{player.href ? <Link href={player.href} className="text-link">View public coverage</Link> : null}</article>)}</div> : <p className="beta-preview-empty">The public field is still forming. Friends, Head-to-Head and Rival Watch unlock inside your Player Room.</p>}<div className="beta-preview-social-lock"><Swords size={17}/><p><strong>Friends unlock with private access.</strong> Add Friend, Head-to-Head and Rival Watch stay unavailable during Preview.</p></div></section>

    <section className="container beta-preview-next bs-surface-paper"><p className="kicker">WHAT UNLOCKS NEXT</p><h2>Your full Desk stays private.</h2><p>Founder approval creates your Founding Beta account. One-time access then opens the compact agreement and lands directly on <strong>My Player Room → Desk</strong>. Your request contact and valid notification defaults carry forward automatically—you will not be asked to type the same setup again.</p></section>
  </>;
}
