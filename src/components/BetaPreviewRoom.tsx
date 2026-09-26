"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signInWithCustomToken, signOut } from "firebase/auth";
import { ArrowRight, Check, ChevronRight, LoaderCircle, LockKeyhole, RefreshCcw, ShieldCheck, Sparkles, Swords, TrendingUp } from "lucide-react";
import type { BetaPreviewStatus, BoardSignalBetaPreview } from "@/lib/boardsignal/activation";
import { betaPreviewContainsPrivateFields } from "@/lib/boardsignal/activation";
import { auth } from "@/utils/firebaseConfig";
import { registerBoardSignalBrowserPush } from "@/components/BrowserPushControl";
import { clearSavedBetaPreviewReturn, loadSavedBetaPreviewReturn, saveBetaPreviewReturn } from "@/lib/boardsignal/previewReturn";
import {
  acceptPreviewStatusSnapshot,
  applyPreviewStartupFailure,
  applyPreviewStatusFailure,
  applyPreviewStatusSuccess,
  beginPreviewStatusRequest,
  cancelPreviewStatusRequest,
  createPreviewRuntimeState,
  previewCanContinue,
  previewVisualState,
  restorePreviewContinuity,
} from "@/lib/boardsignal/previewRuntime.mjs";
import { credentialMatchesExpectedUid, decidePreviewEntry, stableFirebaseUidForPlayerId } from "@/lib/boardsignal/playerEntryRecovery.mjs";

// Public-safe Preview continuity only. No private Review, Signal, evidence,
// contact value or status credential is stored here.
const previewContinuity = new Map<string, BoardSignalBetaPreview>();

function statusStorageKey(requestId: string) { return `boardsignal-beta-preview-status-v1:${requestId}`; }
function introStorageKey(requestId: string) { return `boardsignal-beta-preview-intro-v1:${requestId}`; }
function previewStorageKey(requestId: string) { return `boardsignal-beta-preview-public-v1:${requestId}`; }

function readPreviewContinuity(requestId: string) {
  const memory = previewContinuity.get(requestId);
  if (memory) return memory;
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(previewStorageKey(requestId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as BoardSignalBetaPreview;
    if (!parsed || typeof parsed !== "object" || !parsed.canonicalUsername || !Number.isSafeInteger(Number(parsed.playerId)) || betaPreviewContainsPrivateFields(parsed)) return undefined;
    previewContinuity.set(requestId, parsed);
    return parsed;
  } catch {
    return undefined;
  }
}

function rememberPreviewContinuity(requestId: string, preview: BoardSignalBetaPreview) {
  if (betaPreviewContainsPrivateFields(preview)) return;
  previewContinuity.set(requestId, preview);
  try { window.sessionStorage.setItem(previewStorageKey(requestId), JSON.stringify(preview)); } catch { /* best effort */ }
}

function clearPreviewContinuity(requestId: string) {
  previewContinuity.delete(requestId);
  try { window.sessionStorage.removeItem(previewStorageKey(requestId)); } catch { /* best effort */ }
}

function stripStatusFragmentWithoutRouterRestore() {
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  const currentState = window.history.state;
  try { History.prototype.replaceState.call(window.history, currentState, "", cleanUrl); }
  catch { window.history.replaceState(currentState, "", cleanUrl); }
}

function formatSync(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Just now" : parsed.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function restoredFirebaseUser() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise<import("firebase/auth").User | null>((resolve) => {
    let settled = false;
    const finish = (user: import("firebase/auth").User | null) => {
      if (settled) return;
      settled = true;
      unsubscribe?.();
      resolve(user);
    };
    const unsubscribe = onAuthStateChanged(auth, finish, () => finish(auth.currentUser));
  });
}

export default function BetaPreviewRoom({ requestId }: { requestId: string }) {
  const router = useRouter();
  const constructionPreview = readPreviewContinuity(requestId) ?? null;
  const [statusToken, setStatusToken] = useState("");
  const [runtime, setRuntime] = useState(() => createPreviewRuntimeState(constructionPreview));
  const [claiming, setClaiming] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const [showAskIntro, setShowAskIntro] = useState(false);
  const [entryRecovery, setEntryRecovery] = useState<"cross_account" | "recovery" | "identity_mismatch" | null>(null);

  const runtimeRef = useRef(runtime);
  const statusTokenRef = useRef("");
  const activeRequestRef = useRef<{ sequence: number; controller: AbortController } | null>(null);
  const startupRequestIssuedRef = useRef(false);
  const mountedRef = useRef(true);

  const commitRuntime = useCallback((next: ReturnType<typeof createPreviewRuntimeState>) => {
    runtimeRef.current = next;
    setRuntime(next);
  }, []);

  const applyAcceptedStatus = useCallback((nextStatus: BetaPreviewStatus, token: string, sequence?: number) => {
    const current = runtimeRef.current;
    const next = sequence === undefined ? acceptPreviewStatusSnapshot(current, nextStatus) : applyPreviewStatusSuccess(current, sequence, nextStatus);
    if (next === current) return false;
    const terminal = ["rejected", "expired", "claimed"].includes(nextStatus.state);
    if (nextStatus.preview && !terminal && !betaPreviewContainsPrivateFields(nextStatus.preview)) rememberPreviewContinuity(requestId, nextStatus.preview);
    commitRuntime(next);
    setError("");
    if (terminal) {
      clearSavedBetaPreviewReturn(requestId);
      window.sessionStorage.removeItem(statusStorageKey(requestId));
      clearPreviewContinuity(requestId);
    } else {
      saveBetaPreviewReturn({ requestId, canonicalUsername: nextStatus.canonicalUsername, statusCredential: token, createdAt: nextStatus.requestedAt });
    }
    if (nextStatus.preview && window.localStorage.getItem(introStorageKey(requestId)) !== "seen") {
      window.localStorage.setItem(introStorageKey(requestId), "seen");
      setShowAskIntro(true);
    }
    window.dispatchEvent(new CustomEvent("boardsignal:preview-context", { detail: { requestId, statusToken: token } }));
    return true;
  }, [commitRuntime, requestId]);

  const requestStatus = useCallback(async (source: "initial" | "manual", tokenOverride?: string) => {
    const token = tokenOverride ?? statusTokenRef.current;
    if (!token || activeRequestRef.current) return false;
    const begin = beginPreviewStatusRequest(runtimeRef.current, source === "initial" ? "initial" : "background");
    if (!begin.accepted || begin.sequence === null) return false;
    commitRuntime(begin.state);
    const controller = new AbortController();
    activeRequestRef.current = { sequence: begin.sequence, controller };
    try {
      const response = await fetch(`/api/boardsignal/beta-preview/${encodeURIComponent(requestId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ action: "status", statusToken: token }),
      });
      const body = await response.json() as { ok?: boolean; status?: BetaPreviewStatus; error?: string };
      if (!response.ok || !body.ok || !body.status) throw new Error(body.error ?? "BoardSignal preview could not be loaded.");
      if (!mountedRef.current || controller.signal.aborted) return false;
      return applyAcceptedStatus(body.status, token, begin.sequence);
    } catch (reason) {
      if (controller.signal.aborted || !mountedRef.current) return false;
      const message = reason instanceof Error ? reason.message : "BoardSignal preview could not be loaded.";
      const current = runtimeRef.current;
      const next = applyPreviewStatusFailure(current, begin.sequence, message);
      if (next !== current) commitRuntime(next);
      return false;
    } finally {
      if (activeRequestRef.current?.sequence === begin.sequence) activeRequestRef.current = null;
    }
  }, [applyAcceptedStatus, commitRuntime, requestId]);

  const cancelActiveStatusRequest = useCallback(() => {
    const active = activeRequestRef.current;
    if (!active) return;
    active.controller.abort();
    const next = cancelPreviewStatusRequest(runtimeRef.current, active.sequence);
    runtimeRef.current = next;
    setRuntime(next);
    activeRequestRef.current = null;
  }, []);

  useLayoutEffect(() => {
    mountedRef.current = true;
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const fromHash = fragment.get("status") ?? "";
    const fromSession = window.sessionStorage.getItem(statusStorageKey(requestId)) ?? "";
    const saved = loadSavedBetaPreviewReturn();
    const fromDevice = saved?.requestId === requestId ? saved.statusCredential : "";
    const token = fromHash || fromDevice || fromSession;
    if (fromHash) {
      window.sessionStorage.setItem(statusStorageKey(requestId), fromHash);
      stripStatusFragmentWithoutRouterRestore();
    }
    const savedPreview = token ? readPreviewContinuity(requestId) : undefined;
    if (savedPreview && runtimeRef.current.preview !== savedPreview) commitRuntime(restorePreviewContinuity(runtimeRef.current, savedPreview));
    statusTokenRef.current = token;
    setStatusToken(token);
    if (!token) {
      commitRuntime(applyPreviewStartupFailure(runtimeRef.current, "Your saved Preview isn't available on this device. Use an existing private return/recovery key, return through the original Preview device, or start again with your Chess.com username."));
      return;
    }
    if (!startupRequestIssuedRef.current) {
      startupRequestIssuedRef.current = true;
      void requestStatus("initial", token);
    }
    return () => {
      mountedRef.current = false;
      startupRequestIssuedRef.current = false;
      const active = activeRequestRef.current;
      if (active) {
        active.controller.abort();
        runtimeRef.current = cancelPreviewStatusRequest(runtimeRef.current, active.sequence);
        activeRequestRef.current = null;
      }
    };
  }, [commitRuntime, requestId, requestStatus]);

  async function retryPreview() {
    if (!statusToken || retrying) return;
    cancelActiveStatusRequest();
    setRetrying(true); setError("");
    try {
      const response = await fetch(`/api/boardsignal/beta-preview/${encodeURIComponent(requestId)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ action: "retryPreview", statusToken }),
      });
      const body = await response.json() as { ok?: boolean; status?: BetaPreviewStatus; error?: string };
      if (!response.ok || !body.ok || !body.status) throw new Error(body.error ?? "The preview could not be refreshed.");
      applyAcceptedStatus(body.status, statusToken);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The preview could not be refreshed."); }
    finally { setRetrying(false); }
  }

  const clearPreviewEntryState = useCallback(() => {
    clearSavedBetaPreviewReturn(requestId);
    clearPreviewContinuity(requestId);
    window.sessionStorage.removeItem(statusStorageKey(requestId));
  }, [requestId]);

  const resumeSameUid = useCallback((expectedUid: string) => {
    const token = statusTokenRef.current;
    clearPreviewEntryState();
    if (token) void fetch(`/api/boardsignal/beta-preview/${encodeURIComponent(requestId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ action: "entryResume", statusToken: token }) }).catch(() => undefined);
    router.replace("/boardsignal/player-room?source=beta_preview_resume&tab=desk");
    return expectedUid;
  }, [clearPreviewEntryState, requestId, router]);

  async function openPlayerRoom() {
    if (!statusToken || claiming) return;
    const preview = runtimeRef.current.preview as BoardSignalBetaPreview | null;
    const expectedUid = stableFirebaseUidForPlayerId(preview?.playerId);
    if (!expectedUid) { setEntryRecovery("identity_mismatch"); return; }
    cancelActiveStatusRequest();
    setClaiming(true); setError(""); setEntryRecovery(null);
    try {
      const restored = await restoredFirebaseUser();
      const initialDecision = decidePreviewEntry({ expectedUid, currentUid: restored?.uid });
      if (initialDecision.action === "resume") { resumeSameUid(expectedUid); return; }
      if (initialDecision.action === "cross_account") { setEntryRecovery("cross_account"); return; }
      const response = await fetch(`/api/boardsignal/beta-preview/${encodeURIComponent(requestId)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ action: "claim", statusToken }),
      });
      const body = await response.json() as { ok?: boolean; customToken?: string; code?: string; error?: string };
      if (!response.ok || !body.ok || !body.customToken) {
        const claimDecision = decidePreviewEntry({ expectedUid, currentUid: (await restoredFirebaseUser())?.uid, claimCode: body.code });
        if (claimDecision.action === "resume") { resumeSameUid(expectedUid); return; }
        if (claimDecision.action === "cross_account") { setEntryRecovery("cross_account"); return; }
        if (claimDecision.action === "recovery") { setEntryRecovery("recovery"); return; }
        throw new Error(body.error ?? "My BoardSignal could not be opened.");
      }
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithCustomToken(auth, body.customToken);
      if (!credentialMatchesExpectedUid(expectedUid, credential.user.uid)) {
        await signOut(auth).catch(() => undefined);
        setEntryRecovery("identity_mismatch");
        return;
      }
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const idToken = await credential.user.getIdToken();
        await registerBoardSignalBrowserPush(idToken).catch(() => undefined);
      }
      clearPreviewEntryState();
      router.replace("/boardsignal/player-room?source=beta_preview&tab=desk");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "My BoardSignal could not be opened."); }
    finally { setClaiming(false); }
  }

  async function leaveOtherPlayerForRecovery() {
    await signOut(auth).catch(() => undefined);
    router.replace("/boardsignal/player-room?source=beta_preview_recovery");
  }

  function ask(prompt: string) { window.dispatchEvent(new CustomEvent("boardsignal:ask-open", { detail: { message: prompt } })); }

  const status = runtime.status as BetaPreviewStatus | null;
  const preview = runtime.preview as BoardSignalBetaPreview | null;
  const displayUsername = status?.canonicalUsername ?? preview?.canonicalUsername ?? "BS";
  const displayAvatar = status?.avatar ?? preview?.avatar;
  const approved = status?.state === "approved" && status.accessReady;
  const canContinue = previewCanContinue(status);
  const rejected = status?.state === "rejected";
  const expired = status?.state === "expired";
  const visibleError = error || runtime.error;

  if (previewVisualState(runtime) === "loader") return <main id="main" className="container beta-preview-room"><section className="beta-preview-loading bs-surface-paper"><LoaderCircle className="button-spinner"/><p className="kicker">BOARD SIGNAL PREVIEW</p><h1>Finding your chess week</h1><p>BoardSignal is opening the safe first look attached to this request.</p></section></main>;

  if (previewVisualState(runtime) === "error" && visibleError) return <main id="main" className="container beta-preview-room"><section className="beta-preview-loading bs-surface-paper"><p className="kicker">BOARD SIGNAL PREVIEW</p><h1>This Preview isn't saved on this device</h1><p>{visibleError}</p><div className="resolved-player-actions"><Link href="/#get-my-boardsignal" className="button button-dark">Start with Chess.com username</Link><Link href="/boardsignal/player-room" className="button button-quiet">Use sign-in / recovery</Link></div></section></main>;

  return <main id="main" className={`beta-preview-room ${canContinue ? "is-approved" : ""}`}>
    <section className="container beta-preview-hero bs-surface-dark">
      <div className="beta-preview-identity">
        {displayAvatar ? <Image src={displayAvatar} alt="" width={70} height={70} unoptimized /> : <span className="beta-preview-avatar">{displayUsername.slice(0,2).toUpperCase()}</span>}
        <div><p className="kicker">BOARD SIGNAL PREVIEW</p><h1>{approved ? "You're in." : `We found you, ${displayUsername}.`}</h1><p>{approved ? "Your private BoardSignal is ready." : "Your games are here. Your private BoardSignal is ready to open now. Google is optional and can be connected later as a return key."}</p></div>
      </div>
      <div className="beta-preview-status"><span>{approved ? "PRIVATE ACCESS READY" : expired ? "ACCESS EXPIRED" : rejected ? "ACCESS CLOSED" : "PREVIEW READY"}</span><strong>{approved ? "MY BOARDSIGNAL READY" : expired ? "RECOVERY REQUIRED" : rejected ? "PRIVATE ACCESS UNAVAILABLE" : "FULL PRIVATE REVIEW AVAILABLE"}</strong>{status?.approvedAt ? <small>Identity reviewed {formatSync(status.approvedAt)}</small> : preview ? <small>Preview saved {formatSync(preview.generatedAt)}</small> : null}</div>
      {canContinue ? <button type="button" className="button button-lime beta-preview-primary-cta" onClick={openPlayerRoom} disabled={claiming}>{claiming ? <><LoaderCircle className="button-spinner" size={16}/> Opening</> : <>Continue to My BoardSignal <ArrowRight size={17}/></>}</button> : null}
    </section>

    {entryRecovery ? <section className="container beta-preview-failure bs-surface-paper" role="alert">
      <ShieldCheck/><div><p className="kicker">PRIVATE ACCESS RECOVERY</p><h2>{entryRecovery === "cross_account" ? "Another BoardSignal player is signed in on this browser." : entryRecovery === "identity_mismatch" ? "BoardSignal stopped an identity mismatch." : "This BoardSignal already exists."}</h2><p>{entryRecovery === "cross_account" ? "BoardSignal will not claim this Preview over a different player. Open the signed-in Player Room, or explicitly sign out before using private recovery." : entryRecovery === "identity_mismatch" ? "The returned Firebase identity did not match this Preview's stable Chess.com player ID, so Player Room entry was blocked." : "Your account is safe. Open My BoardSignal if this browser is already signed in, or use an authorised return/recovery key."}</p></div>
      <div className="resolved-player-actions"><Link className="button button-dark" href="/boardsignal/player-room">Open My BoardSignal</Link><button type="button" className="button button-quiet" onClick={() => void leaveOtherPlayerForRecovery()}>Use private access / recovery</button></div>
    </section> : null}

    {runtime.refreshNotice ? <div className="container notice" role="status">{runtime.refreshNotice}</div> : null}
    {visibleError && preview ? <div className="container notice notice-error" role="alert">{visibleError}</div> : null}

    {!preview ? <section className="container beta-preview-failure bs-surface-paper"><Sparkles/><div><p className="kicker">REQUEST SAVED</p><h2>Chess.com didn't return the preview yet.</h2><p>Your private access path is safe. Try the Preview again; normal private use does not wait for Founder approval.</p></div><button type="button" className="button button-dark" onClick={retryPreview} disabled={retrying}>{retrying ? <><LoaderCircle className="button-spinner" size={15}/> Trying</> : <><RefreshCcw size={15}/> Try preview again</>}</button></section> : <PreviewContent preview={preview} ask={ask} showAskIntro={showAskIntro} accessCta={canContinue ? <section className="container beta-preview-access-cta bs-surface-dark"><p className="kicker">READY FOR THE FULL PICTURE?</p><h2>See what happened, what mattered, and what to focus on next.</h2><p>Private access starts immediately. Google is an optional return key you can connect later from My BoardSignal.</p><button type="button" className="button button-lime" onClick={openPlayerRoom} disabled={claiming}>{claiming ? "Opening…" : "Continue to My BoardSignal"}<ArrowRight size={16}/></button></section> : null} />}

    {rejected ? <section className="container beta-preview-next bs-surface-paper"><p className="kicker">ACCESS STATUS</p><h2>This private access path is closed.</h2><p>The public-safe Preview can remain useful, but a revoked or rejected BoardSignal cannot be revived by Google.</p></section> : null}

    {expired ? <section className="container beta-preview-next bs-surface-paper"><p className="kicker">ACCESS WINDOW EXPIRED</p><h2>Your BoardSignal may still be here.</h2><p>Use an existing authorised Google return key, current session, magic access or fallback recovery. Username knowledge alone never opens an established private account.</p><div className="resolved-player-actions"><Link className="button button-dark" href="/boardsignal/player-room">Use private recovery</Link><Link className="button button-quiet" href="/#get-my-boardsignal">Return to BoardSignal</Link></div></section> : null}

    {canContinue ? <div className="beta-preview-sticky-access"><button className="button button-lime" type="button" onClick={openPlayerRoom} disabled={claiming}>{claiming ? "Opening…" : "Continue to My BoardSignal"}<ArrowRight size={16}/></button></div> : null}
  </main>;
}

function PreviewContent({ preview, ask, showAskIntro, accessCta }: { preview: BoardSignalBetaPreview; ask: (prompt: string) => void; showAskIntro: boolean; accessCta?: ReactNode }) {
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
      <div className="beta-preview-section-heading"><div><p className="kicker">AROUND BOARDSIGNAL · PREVIEW</p><h2>Where this week would sit right now.</h2><p>This comparison is provisional. Google return access does not turn it into verified Chess.com ownership or public identity.</p></div><span className="state-pill processing">PROVISIONAL</span></div>
      {preview.universePreview.length ? <div className="beta-preview-universe-grid">{preview.universePreview.slice(0,4).map((item) => <article key={`${item.categoryId}:${item.scopeLabel ?? "all"}`}><span>{item.categoryTitle}{item.scopeLabel ? ` · ${item.scopeLabel}` : ""}</span><strong>#{item.rank} of {item.denominator}</strong><p>{item.valueLabel}</p>{item.nearestAbove ? <small>In reach: {item.nearestAbove.player} · {item.nearestAbove.valueLabel}</small> : null}<b>IF THE FIELD HELD</b></article>)}</div> : <div className="beta-preview-empty"><p>No compatible provisional category is available from this preview week yet. BoardSignal will not manufacture a rank.</p></div>}
      {preview.recentUniverseActivity.length ? <div className="beta-preview-activity"><p className="kicker">WHAT'S HAPPENING AROUND BOARDSIGNAL</p>{preview.recentUniverseActivity.slice(0,3).map((item) => <article key={item.eventId}><span>{item.canonicalUsername}</span><strong>{item.headline}</strong><p>{item.supportingFact}</p></article>)}</div> : null}
    </section>

    {showAskIntro ? <section className="container beta-preview-ask bs-surface-dark"><Sparkles size={22}/><div><p className="kicker">ASK BOARDSIGNAL</p><h2>I found your games. Want me to show you what stands out?</h2><p>I can explain what the Preview found, what the comparison means, and what you can explore inside My BoardSignal.</p><div className="beta-preview-ask-actions"><button type="button" onClick={() => ask("Show me my week")}>Show me my week</button><button type="button" onClick={() => ask("Explain Around BoardSignal")}>Explain Around BoardSignal</button><button type="button" onClick={() => ask("What unlocks next?")}>What unlocks next?</button></div></div></section> : null}

    <section className="container beta-preview-progress bs-surface-paper"><div><p className="kicker">PROGRESS</p><h2>Progress starts with your second review.</h2><p>Your first completed review becomes the baseline. The next completed week can show what moved, repeated and changed.</p></div><div className="beta-preview-progress-track"><article><span>REVIEW 1</span><strong>Building your baseline</strong><Check size={17}/></article><ChevronRight/><article><span>REVIEW 2</span><strong>Next comparison</strong><span className="progress-future-dot"/></article></div></section>

    <section className="container beta-preview-players bs-surface-paper"><div className="beta-preview-section-heading"><div><p className="kicker">PLAYERS AROUND BOARDSIGNAL</p><h2>Your week is part of a wider field.</h2><p>Only positive public highlights appear here. Continue to My BoardSignal for your private review.</p></div><LockKeyhole size={19}/></div>{preview.publicPlayers.length ? <div className="beta-preview-player-grid">{preview.publicPlayers.slice(0,6).map((player) => <article key={player.canonicalUsername}><div><span>BOARDSIGNAL PLAYER</span><h3>{player.canonicalUsername}</h3></div><strong>{player.placement ?? "Active in the field"}</strong><p>{player.safeHighlight ?? "Public BoardSignal highlight"}</p>{player.href ? <Link href={player.href} className="text-link">View highlight</Link> : null}</article>)}</div> : <p className="beta-preview-empty">More players are joining. Friends, Head-to-Head and Rival Watch are available inside My BoardSignal.</p>}<div className="beta-preview-social-lock"><Swords size={17}/><p><strong>Friends are inside My BoardSignal.</strong> Continue above to use Add Friend, Head-to-Head and Rival Watch.</p></div></section>

    <section className="container beta-preview-next bs-surface-paper"><p className="kicker">WHAT UNLOCKS NEXT</p><h2>Your full review stays private.</h2><p>Continue now, accept the compact Founding Access agreement if needed, and land directly on <strong>My BoardSignal → Review</strong>. Google return access can be connected later. Existing magic access, fallback access and current sessions remain valid.</p></section>
  </>;
}
