"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { browserLocalPersistence, setPersistence, signInWithCustomToken } from "firebase/auth";
import { ArrowRight, Bell, Check, ChevronRight, LoaderCircle, LockKeyhole, Mail, MessageCircle, RefreshCcw, ShieldCheck, Sparkles, Swords, TrendingUp } from "lucide-react";
import type { BetaActivationReturnMethod, BetaPreviewStatus, BoardSignalBetaPreview } from "@/lib/boardsignal/activation";
import { BETA_PREVIEW_POLL_MS } from "@/lib/boardsignal/activation";
import { auth } from "@/utils/firebaseConfig";
import { getBoardSignalBrowserPushToken, registerBoardSignalBrowserPush } from "@/components/BrowserPushControl";
import { clearSavedBetaPreviewReturn, loadSavedBetaPreviewReturn, saveBetaPreviewReturn } from "@/lib/boardsignal/previewReturn";

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
    const saved = loadSavedBetaPreviewReturn();
    const fromDevice = saved?.requestId === requestId ? saved.statusCredential : "";
    const token = fromHash || fromDevice || fromSession;
    if (fromHash) {
      window.sessionStorage.setItem(statusStorageKey(requestId), fromHash);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    setStatusToken(token);
    if (!token) {
      setLoading(false);
      setError("Your saved Preview isn't available on this device. Use an access link if you have one, return through your original Preview device, or start again with your Chess.com username.");
    }
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
      if (["rejected", "expired", "claimed"].includes(body.status.state)) {
        clearSavedBetaPreviewReturn(requestId);
        window.sessionStorage.removeItem(statusStorageKey(requestId));
      } else {
        saveBetaPreviewReturn({ requestId, canonicalUsername: body.status.canonicalUsername, statusCredential: statusToken, createdAt: body.status.requestedAt });
      }
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
    setRetrying(true); setError("");
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
    setClaiming(true); setError("");
    try {
      const response = await fetch(`/api/boardsignal/beta-preview/${encodeURIComponent(requestId)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ action: "claim", statusToken }),
      });
      const body = await response.json() as { ok?: boolean; customToken?: string; error?: string };
      if (!response.ok || !body.ok || !body.customToken) throw new Error(body.error ?? "My BoardSignal could not be opened.");
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithCustomToken(auth, body.customToken);
      // If this browser already granted Preview device alerts, attach the same
      // registration to the now-authenticated stable account without asking permission again.
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const idToken = await credential.user.getIdToken();
        await registerBoardSignalBrowserPush(idToken).catch(() => undefined);
      }
      clearSavedBetaPreviewReturn(requestId);
      window.sessionStorage.removeItem(statusStorageKey(requestId));
      router.replace("/boardsignal/player-room?source=beta_preview&tab=desk");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "My BoardSignal could not be opened."); }
    finally { setClaiming(false); }
  }

  function ask(prompt: string) {
    window.dispatchEvent(new CustomEvent("boardsignal:ask-open", { detail: { message: prompt } }));
  }

  const preview = status?.preview;
  const approved = status?.state === "approved" && status.accessReady;
  const provisionalReady = status?.state === "preview_ready" && status.provisionalAccessReady === true;
  const canContinue = approved || provisionalReady;
  const rejected = status?.state === "rejected";
  const expired = status?.state === "expired";

  if (loading) return <main id="main" className="container beta-preview-room"><section className="beta-preview-loading bs-surface-paper"><LoaderCircle className="button-spinner"/><p className="kicker">BOARD SIGNAL PREVIEW</p><h1>Finding your chess week</h1><p>BoardSignal is opening the safe first look attached to this request.</p></section></main>;

  if (!status && error) return <main id="main" className="container beta-preview-room"><section className="beta-preview-loading bs-surface-paper"><p className="kicker">BOARD SIGNAL PREVIEW</p><h1>This Preview isn't saved on this device</h1><p>{error}</p><div className="resolved-player-actions"><Link href="/#get-my-boardsignal" className="button button-dark">Start with Chess.com username</Link><Link href="/boardsignal/player-room" className="button button-quiet">Use sign-in / recovery</Link></div></section></main>;

  return <main id="main" className={`beta-preview-room ${canContinue ? "is-approved" : ""}`}>
    <section className="container beta-preview-hero bs-surface-dark">
      <div className="beta-preview-identity">
        {status?.avatar ? <Image src={status.avatar} alt="" width={70} height={70} unoptimized /> : <span className="beta-preview-avatar">{(status?.canonicalUsername ?? "BS").slice(0,2).toUpperCase()}</span>}
        <div><p className="kicker">BOARD SIGNAL PREVIEW</p><h1>{approved ? "You're in." : `We found you, ${status?.canonicalUsername}.`}</h1><p>{approved ? "Your private BoardSignal is ready." : "Your games are here. Your full private review is ready to open now while Founding Beta identity checks happen quietly in the background."}</p></div>
      </div>
      <div className="beta-preview-status"><span>{approved ? "IDENTITY CONFIRMED" : expired ? "ACCESS EXPIRED" : rejected ? "REQUEST CLOSED" : "PREVIEW READY"}</span><strong>{approved ? "MY BOARDSIGNAL READY" : expired ? "FRESH LINK REQUIRED" : rejected ? "FOUNDER REVIEW CLOSED" : "FULL PRIVATE REVIEW AVAILABLE"}</strong>{status?.approvedAt ? <small>Founder reviewed {formatSync(status.approvedAt)}</small> : preview ? <small>Preview saved {formatSync(preview.generatedAt)}</small> : null}</div>
      {canContinue ? <button type="button" className="button button-lime beta-preview-primary-cta" onClick={openPlayerRoom} disabled={claiming}>{claiming ? <><LoaderCircle className="button-spinner" size={16}/> Opening</> : <>Continue to My BoardSignal <ArrowRight size={17}/></>}</button> : null}
    </section>

    {error ? <div className="container notice notice-error" role="alert">{error}</div> : null}

    {!preview ? <section className="container beta-preview-failure bs-surface-paper"><Sparkles/><div><p className="kicker">REQUEST SAVED</p><h2>Chess.com didn't return the preview yet.</h2><p>Your Founding Beta request is safe. Try the Preview again; identity review is not the gate to private access.</p></div><button type="button" className="button button-dark" onClick={retryPreview} disabled={retrying}>{retrying ? <><LoaderCircle className="button-spinner" size={15}/> Trying</> : <><RefreshCcw size={15}/> Try preview again</>}</button></section> : <PreviewContent preview={preview} ask={ask} showAskIntro={showAskIntro} accessCta={canContinue ? <section className="container beta-preview-next bs-surface-dark"><p className="kicker">READY FOR THE FULL PICTURE?</p><h2>See what happened, what mattered, and what to focus on next.</h2><p>Founding Beta access starts immediately. Identity checks happen quietly in the background.</p><button type="button" className="button button-lime" onClick={openPlayerRoom} disabled={claiming}>{claiming ? "Opening…" : "Continue to My BoardSignal"}<ArrowRight size={16}/></button></section> : null} returnChoice={status?.state === "preview_ready" ? <PreviewReturnChoice requestId={requestId} statusToken={statusToken} status={status} onStatus={setStatus} onError={setError} /> : null} />}

    {rejected ? <section className="container beta-preview-next bs-surface-paper"><p className="kicker">REQUEST STATUS</p><h2>This Founding Beta request is closed.</h2><p>The public-safe preview can remain useful, but private BoardSignal access was not activated.</p></section> : null}

    {expired ? <section className="container beta-preview-next bs-surface-paper"><p className="kicker">ACCESS WINDOW EXPIRED</p><h2>Your BoardSignal account is still here.</h2><p>The one-time access window expired. Ask Ayanda to prepare a fresh link; username + Beta Access recovery also remains available.</p><div className="resolved-player-actions"><Link className="button button-dark" href="/boardsignal/player-room">Use fallback access</Link><Link className="button button-quiet" href="/#get-my-boardsignal">Return to Founding Beta</Link></div></section> : null}

    {canContinue ? <div className="beta-preview-sticky-access"><button className="button button-lime" type="button" onClick={openPlayerRoom} disabled={claiming}>{claiming ? "Opening…" : "Continue to My BoardSignal"}<ArrowRight size={16}/></button></div> : null}
  </main>;
}

function PreviewReturnChoice({ requestId, statusToken, status, onStatus, onError }: { requestId: string; statusToken: string; status: BetaPreviewStatus; onStatus: (value: BetaPreviewStatus) => void; onError: (value: string) => void }) {
  const [selected, setSelected] = useState<BetaActivationReturnMethod | "">(status.activationReturnMethod ?? "");
  const [contactValue, setContactValue] = useState(status.preferredContactValue ?? "");
  const [consent, setConsent] = useState(status.betaContactConsent === true);
  const [busy, setBusy] = useState(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim());

  useEffect(() => {
    setSelected(status.activationReturnMethod ?? "");
    setContactValue(status.preferredContactValue ?? "");
    setConsent(status.betaContactConsent === true);
  }, [status.activationReturnMethod, status.betaContactConsent, status.preferredContactValue]);

  async function update(actionBody: Record<string, unknown>) {
    setBusy(true); onError("");
    try {
      const response = await fetch(`/api/boardsignal/beta-preview/${encodeURIComponent(requestId)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ statusToken, ...actionBody }),
      });
      const body = await response.json() as { ok?: boolean; status?: BetaPreviewStatus; error?: string };
      if (!response.ok || !body.ok || !body.status) throw new Error(body.error ?? "BoardSignal could not save this return method.");
      onStatus(body.status);
      setSelected(body.status.activationReturnMethod ?? "");
    } catch (reason) { onError(reason instanceof Error ? reason.message : "BoardSignal could not save this return method."); }
    finally { setBusy(false); }
  }

  async function enableDevice() {
    if (!configured) { onError("Device alerts aren't configured yet. Your Preview is still saved on this device, so you can choose I'll come back here or add a backup contact."); return; }
    if (!("Notification" in window) || !("serviceWorker" in navigator)) { onError("This browser doesn't support BoardSignal device alerts. Your saved Preview still works."); return; }
    setBusy(true); onError("");
    try {
      // Permission is requested only because the player deliberately clicked Notify this device.
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") { setSelected(""); return; }
      const fcmToken = await getBoardSignalBrowserPushToken();
      const response = await fetch(`/api/boardsignal/beta-preview/${encodeURIComponent(requestId)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ action: "registerDevice", statusToken, fcmToken, userAgent: navigator.userAgent }),
      });
      const body = await response.json() as { ok?: boolean; status?: BetaPreviewStatus; error?: string };
      if (!response.ok || !body.ok || !body.status) throw new Error(body.error ?? "This device could not be attached to the Preview.");
      onStatus(body.status); setSelected("device");
    } catch (reason) { onError(reason instanceof Error ? reason.message : "This device could not be attached to the Preview."); }
    finally { setBusy(false); }
  }

  async function choose(method: BetaActivationReturnMethod) {
    setSelected(method); onError("");
    if (method === "device") { await enableDevice(); return; }
    if (method === "return_here") await update({ action: "updateReturn", method: "return_here" });
  }

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(selected === "email" || selected === "discord" || selected === "telegram")) return;
    await update({ action: "updateReturn", method: selected, contactValue: contactValue.trim(), betaContactConsent: consent });
  }

  const savedLabel = status.activationReturnMethod === "device" && status.deviceAlertsEnabled ? "DEVICE ALERTS ENABLED" : status.activationReturnMethod === "return_here" ? "SAVED ON THIS DEVICE" : status.activationReturnMethod && status.preferredContactValue ? `${status.activationReturnMethod.toUpperCase()} · ${status.preferredContactValue}` : undefined;

  return <section className="container beta-preview-return bs-surface-paper">
    <div className="beta-preview-section-heading"><div><p className="kicker">KEEP MY BOARDSIGNAL READY</p><h2>Optional: how should BoardSignal help you return later?</h2><p>Your private review is already available above. Device alerts and external contact are optional ways to return later.</p></div>{savedLabel ? <span className="state-pill ready">{savedLabel}</span> : null}</div>
    <div className="beta-return-options">
      <button type="button" className={`beta-return-option recommended ${selected === "device" ? "is-selected" : ""}`} onClick={() => void choose("device")} disabled={busy}><Bell size={19}/><span><strong>Notify this device</strong><small>Recommended · alert this browser about important BoardSignal updates.</small></span></button>
      <button type="button" className={selected === "email" ? "is-selected" : ""} onClick={() => setSelected("email")} disabled={busy}><Mail size={18}/> Email</button>
      <button type="button" className={selected === "discord" ? "is-selected" : ""} onClick={() => setSelected("discord")} disabled={busy}><MessageCircle size={18}/> Discord</button>
      <button type="button" className={selected === "telegram" ? "is-selected" : ""} onClick={() => setSelected("telegram")} disabled={busy}><MessageCircle size={18}/> Telegram</button>
      <button type="button" className={selected === "return_here" ? "is-selected" : ""} onClick={() => void choose("return_here")} disabled={busy}>I'll come back here</button>
    </div>
    {selected === "device" ? <p className="helper-copy">{configured ? status.deviceAlertsEnabled ? "This browser is ready for BoardSignal alerts. Your private review does not depend on Founder approval or email." : "Your browser will ask for notification permission only because you clicked Notify this device." : "Device alerts aren't configured yet. Your saved Preview still works, and private access is available without alerts."}</p> : null}
    {selected === "return_here" ? <p className="helper-copy">Your Preview is saved on this device for the activation window. Come back to BoardSignal and choose Continue Preview.</p> : null}
    {(selected === "email" || selected === "discord" || selected === "telegram") ? <form className="beta-return-contact" onSubmit={saveContact}><label>{selected === "email" ? "Email address" : selected === "discord" ? "Discord username" : "Telegram username / contact"}<input value={contactValue} onChange={(event) => setContactValue(event.target.value)} type={selected === "email" ? "email" : "text"} autoComplete={selected === "email" ? "email" : "off"} maxLength={160} placeholder={selected === "email" ? "you@example.com" : "@username"}/></label><label className="agreement-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)}/><span>BoardSignal may use this contact for Founding Beta access, review availability, important product updates and beta feedback.</span></label><button className="button button-dark" type="submit" disabled={busy || !contactValue.trim() || !consent}>{busy ? <><LoaderCircle className="button-spinner" size={14}/> Saving</> : `Save ${selected}`}</button><p className="helper-copy">You can correct this while the Preview is pending. Your Preview still works here even if this backup channel is unavailable.</p></form> : null}
  </section>;
}

function PreviewContent({ preview, ask, showAskIntro, accessCta, returnChoice }: { preview: BoardSignalBetaPreview; ask: (prompt: string) => void; showAskIntro: boolean; accessCta?: ReactNode; returnChoice?: ReactNode }) {
  const leadPool = useMemo(() => [...preview.pools].sort((a,b) => b.games - a.games)[0], [preview.pools]);
  return <>
    <section className="container beta-preview-week bs-surface-paper">
      <div className="beta-preview-section-heading"><div><p className="kicker">WE FOUND YOUR GAMES</p><h2>{preview.playableWeek ? preview.safeHeadline : "BoardSignal found the profile. The first playable week comes next."}</h2>{preview.period ? <p>{preview.period.label}{preview.period.disclosure ? ` · ${preview.period.disclosure}` : ""}</p> : <p>There isn't a completed playable week to show yet.</p>}</div>{preview.profileUrl ? <a href={preview.profileUrl} target="_blank" rel="noreferrer" className="text-link">Open public Chess.com profile</a> : null}</div>
      {preview.playableWeek ? <div className="beta-preview-stat-grid"><article><span>Games</span><strong>{preview.games}</strong><p>{preview.wins}W · {preview.draws}D · {preview.losses}L</p></article><article><span>Score</span><strong>{preview.score}%</strong><p>{preview.activeDays ?? 0} active day{preview.activeDays === 1 ? "" : "s"}</p></article><article><span>{leadPool?.pool?.toUpperCase() ?? "PRIMARY POOL"}</span><strong>{leadPool?.ratingDelta !== undefined ? `${leadPool.ratingDelta >= 0 ? "+" : ""}${leadPool.ratingDelta}` : "—"}</strong><p>{leadPool?.games ?? 0} games in this pool</p></article><article><span>Strongest run</span><strong>{preview.strongestWinRun ?? 0}</strong><p>consecutive win{preview.strongestWinRun === 1 ? "" : "s"}</p></article></div> : null}
      <div className="beta-preview-highlight"><TrendingUp size={18}/><div><strong>WHAT STOOD OUT</strong><p>{preview.safeHighlight}</p></div></div>
      <p className="beta-preview-private-rule"><ShieldCheck size={15}/> Private improvement guidance and reviewed position evidence stay inside My BoardSignal.</p>
    </section>

    {accessCta}

    <section className="container beta-preview-universe bs-surface-paper">
      <div className="beta-preview-section-heading"><div><p className="kicker">AROUND BOARDSIGNAL · PREVIEW</p><h2>Where this week would sit right now.</h2><p>This comparison is provisional. Official public participation waits for identity review.</p></div><span className="state-pill processing">PROVISIONAL</span></div>
      {preview.universePreview.length ? <div className="beta-preview-universe-grid">{preview.universePreview.slice(0,4).map((item) => <article key={`${item.categoryId}:${item.scopeLabel ?? "all"}`}><span>{item.categoryTitle}{item.scopeLabel ? ` · ${item.scopeLabel}` : ""}</span><strong>#{item.rank} of {item.denominator}</strong><p>{item.valueLabel}</p>{item.nearestAbove ? <small>In reach: {item.nearestAbove.player} · {item.nearestAbove.valueLabel}</small> : null}<b>IF THE FIELD HELD</b></article>)}</div> : <div className="beta-preview-empty"><p>No compatible provisional category is available from this preview week yet. BoardSignal will not manufacture a rank.</p></div>}
      {preview.recentUniverseActivity.length ? <div className="beta-preview-activity"><p className="kicker">WHAT'S HAPPENING AROUND BOARDSIGNAL</p>{preview.recentUniverseActivity.slice(0,3).map((item) => <article key={item.eventId}><span>{item.canonicalUsername}</span><strong>{item.headline}</strong><p>{item.supportingFact}</p></article>)}</div> : null}
    </section>

    {returnChoice}

    {showAskIntro ? <section className="container beta-preview-ask bs-surface-dark"><Sparkles size={22}/><div><p className="kicker">ASK BOARDSIGNAL</p><h2>I found your games. Want me to show you what stands out?</h2><p>I can explain what the Preview found, what the comparison means, and what you can explore inside My BoardSignal.</p><div className="beta-preview-ask-actions"><button type="button" onClick={() => ask("Show me my week")}>Show me my week</button><button type="button" onClick={() => ask("Explain Around BoardSignal")}>Explain Around BoardSignal</button><button type="button" onClick={() => ask("What unlocks next?")}>What unlocks next?</button></div></div></section> : null}

    <section className="container beta-preview-progress bs-surface-paper"><div><p className="kicker">PROGRESS</p><h2>Progress starts with your second review.</h2><p>Your first completed review becomes the baseline. The next completed week can show what moved, repeated and changed.</p></div><div className="beta-preview-progress-track"><article><span>REVIEW 1</span><strong>Building your baseline</strong><Check size={17}/></article><ChevronRight/><article><span>REVIEW 2</span><strong>Next comparison</strong><span className="progress-future-dot"/></article></div></section>

    <section className="container beta-preview-players bs-surface-paper"><div className="beta-preview-section-heading"><div><p className="kicker">PLAYERS AROUND BOARDSIGNAL</p><h2>Your week is part of a wider field.</h2><p>Only positive public highlights appear here. Continue to My BoardSignal for your private review.</p></div><LockKeyhole size={19}/></div>{preview.publicPlayers.length ? <div className="beta-preview-player-grid">{preview.publicPlayers.slice(0,6).map((player) => <article key={player.canonicalUsername}><div><span>BOARDSIGNAL PLAYER</span><h3>{player.canonicalUsername}</h3></div><strong>{player.placement ?? "Active in the field"}</strong><p>{player.safeHighlight ?? "Public BoardSignal highlight"}</p>{player.href ? <Link href={player.href} className="text-link">View highlight</Link> : null}</article>)}</div> : <p className="beta-preview-empty">More players are joining. Friends, Head-to-Head and Rival Watch are available inside My BoardSignal.</p>}<div className="beta-preview-social-lock"><Swords size={17}/><p><strong>Friends are inside My BoardSignal.</strong> Continue above to use Add Friend, Head-to-Head and Rival Watch.</p></div></section>

    <section className="container beta-preview-next bs-surface-paper"><p className="kicker">WHAT UNLOCKS NEXT</p><h2>Your full review stays private.</h2><p>Continue now, accept the compact Founding Beta agreement if needed, and land directly on <strong>My BoardSignal → Review</strong>. Founder review happens in the background. Magic access and username + Beta code remain recovery paths.</p></section>
  </>;
}
