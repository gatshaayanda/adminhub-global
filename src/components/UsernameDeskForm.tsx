"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserLocalPersistence, setPersistence, signInWithCustomToken } from "firebase/auth";
import { ArrowRight, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import GoogleAccessButton from "@/components/GoogleAccessButton";
import { clearSavedBetaPreviewReturn, loadSavedBetaPreviewReturn, saveBetaPreviewReturn } from "@/lib/boardsignal/previewReturn";
import type { BetaPreviewStatus, BoardSignalBetaPreview } from "@/lib/boardsignal/activation";
import { credentialMatchesExpectedUid, stableFirebaseUidForPlayerId } from "@/lib/boardsignal/playerEntryRecovery.mjs";
import { rememberGoogleEmailPrefill, requestGoogleAccessCredential } from "@/lib/boardsignal/client/googleAccess";
import { auth } from "@/utils/firebaseConfig";

type UsernameDeskFormProps = { compact?: boolean };
type InlineBoardSignalConfirmation = {
  requestId: string;
  statusToken: string;
  canonicalUsername: string;
  playerId: number;
  avatar?: string;
  profileUrl?: string;
  requestedAt?: string;
  preview?: BoardSignalBetaPreview;
};

const BETA_REQUEST_TIMEOUT_MS = 8_000;

function openDirectReview(username: string) {
  try {
    window.sessionStorage.setItem("boardsignal:degraded-review:v1", JSON.stringify({ username, startedAt: new Date().toISOString() }));
  } catch { /* best-effort continuity marker only */ }
  window.location.assign(`/boardsignal/build/${encodeURIComponent(username)}?degraded=1`);
}

export default function UsernameDeskForm({ compact = false }: UsernameDeskFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState<"google" | "without_google" | "">("");
  const [error, setError] = useState("");
  const [existingActive, setExistingActive] = useState<{ username: string; playerId?: number } | null>(null);
  const [existingRequest, setExistingRequest] = useState<{ username: string; playerId?: number } | null>(null);
  const [confirmation, setConfirmation] = useState<InlineBoardSignalConfirmation | null>(null);
  const [showAccessChoices, setShowAccessChoices] = useState(false);
  const [shareMomentId, setShareMomentId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") === "boardSignalShare") setShareMomentId(params.get("shareMomentId") ?? "");
    const saved = loadSavedBetaPreviewReturn();
    if (!saved) return;
    void (async () => {
      try {
        const response = await fetch(`/api/boardsignal/beta-preview/${encodeURIComponent(saved.requestId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ action: "status", statusToken: saved.statusCredential }),
        });
        const body = await response.json() as { ok?: boolean; status?: BetaPreviewStatus };
        if (!response.ok || !body.ok || !body.status || ["rejected", "expired", "claimed"].includes(body.status.state)) {
          clearSavedBetaPreviewReturn(saved.requestId);
          return;
        }
        const preview = body.status.preview;
        if (!preview?.playerId) return;
        setConfirmation({
          requestId: saved.requestId,
          statusToken: saved.statusCredential,
          canonicalUsername: body.status.canonicalUsername || preview.canonicalUsername,
          playerId: preview.playerId,
          avatar: body.status.avatar ?? preview.avatar,
          profileUrl: preview.profileUrl,
          requestedAt: body.status.requestedAt,
          preview,
        });
      } catch { /* temporary network failure must not erase safe same-device continuity */ }
    })();
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
    } catch { /* onboarding never depends on attribution */ }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanUsername = username.trim().replace(/^@/, "");
    if (!cleanUsername) { setError("Enter your Chess.com username."); return; }
    setBusy(true);
    setError("");
    setExistingActive(null);
    setExistingRequest(null);
    setConfirmation(null);
    setShowAccessChoices(false);
    if (shareMomentId) void trackShareAttribution("beta_request_started");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), BETA_REQUEST_TIMEOUT_MS);
    let serviceFailure = false;

    try {
      const response = await fetch("/api/boardsignal/beta-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ username: cleanUsername, source: shareMomentId ? "boardSignalShare" : undefined, shareMomentId: shareMomentId || undefined }),
      });
      window.clearTimeout(timeout);
      const body = await response.json().catch(() => ({})) as {
        ok?: boolean;
        error?: string;
        existingState?: "active_account" | "pending" | "approved_unclaimed";
        statusToken?: string;
        preview?: BoardSignalBetaPreview;
        request?: {
          id?: string;
          chessPlayerId?: number;
          canonicalUsername?: string;
          avatar?: string;
          profileUrl?: string;
          requestedAt?: string;
        };
      };
      if (response.status >= 500) {
        serviceFailure = true;
        throw new Error(body.error ?? "BoardSignal's saved access service is temporarily unavailable.");
      }
      if (!response.ok || !body.ok) throw new Error(body.error ?? "BoardSignal could not find this Chess.com profile.");
      if (shareMomentId) void trackShareAttribution("beta_request_submitted");

      const canonicalUsername = body.request?.canonicalUsername ?? cleanUsername;
      const playerId = Number(body.request?.chessPlayerId);
      if (body.existingState === "active_account") {
        setExistingActive({ username: canonicalUsername, playerId: Number.isSafeInteger(playerId) ? playerId : undefined });
        return;
      }

      const requestId = String(body.request?.id ?? "");
      let statusToken = String(body.statusToken ?? "");
      const saved = loadSavedBetaPreviewReturn();
      if (!statusToken && requestId && saved?.requestId === requestId) statusToken = saved.statusCredential;
      if (!statusToken && requestId && (body.existingState === "pending" || body.existingState === "approved_unclaimed")) {
        setExistingRequest({ username: canonicalUsername, playerId: Number.isSafeInteger(playerId) ? playerId : undefined });
        return;
      }
      if (!requestId || !statusToken || !Number.isSafeInteger(playerId) || playerId <= 0) {
        throw new Error("BoardSignal found the profile but could not prepare safe private access. Try again.");
      }

      saveBetaPreviewReturn({ requestId, canonicalUsername, statusCredential: statusToken, createdAt: body.request?.requestedAt });
      setConfirmation({
        requestId,
        statusToken,
        canonicalUsername,
        playerId,
        avatar: body.request?.avatar ?? body.preview?.avatar,
        profileUrl: body.request?.profileUrl ?? body.preview?.profileUrl,
        requestedAt: body.request?.requestedAt,
        preview: body.preview,
      });
    } catch (reason) {
      window.clearTimeout(timeout);
      const aborted = reason instanceof DOMException && reason.name === "AbortError";
      const transportFailure = reason instanceof TypeError;
      if (navigator.onLine && (serviceFailure || aborted || transportFailure)) {
        setError("Saved private access is temporarily unavailable. Opening your live Review directly from Chess.com instead…");
        window.setTimeout(() => openDirectReview(cleanUsername), 350);
        return;
      }
      setError(reason instanceof Error ? reason.message : "BoardSignal could not find this Chess.com profile.");
    } finally {
      setBusy(false);
    }
  }

  async function openPrivateBoardSignal(withGoogle: boolean) {
    if (!confirmation || opening) return;
    const expectedUid = stableFirebaseUidForPlayerId(confirmation.playerId);
    if (!expectedUid) { setError("BoardSignal stopped an invalid stable player identity."); return; }
    if (auth.currentUser && auth.currentUser.uid !== expectedUid) {
      setError("Another BoardSignal player is signed in on this browser. Sign out of that Player Room before opening a different private BoardSignal.");
      return;
    }

    setOpening(withGoogle ? "google" : "without_google");
    setError("");
    try {
      const googleCredential = withGoogle ? await requestGoogleAccessCredential() : undefined;
      let playerCredential = auth.currentUser;
      if (!playerCredential || playerCredential.uid !== expectedUid) {
        const response = await fetch(`/api/boardsignal/beta-preview/${encodeURIComponent(confirmation.requestId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ action: "claim", statusToken: confirmation.statusToken }),
        });
        const body = await response.json() as { ok?: boolean; customToken?: string; code?: string; error?: string };
        if (!response.ok || !body.ok || !body.customToken) {
          throw new Error(body.error ?? "My BoardSignal could not be opened.");
        }
        await setPersistence(auth, browserLocalPersistence);
        const signed = await signInWithCustomToken(auth, body.customToken);
        if (!credentialMatchesExpectedUid(expectedUid, signed.user.uid)) {
          throw new Error("BoardSignal stopped an identity mismatch before opening private data.");
        }
        playerCredential = signed.user;
      }

      if (withGoogle && googleCredential) {
        const idToken = await playerCredential.getIdToken();
        const response = await fetch("/api/boardsignal/google-access", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ action: "link", googleIdToken: googleCredential.googleIdToken }),
        });
        const body = await response.json() as { ok?: boolean; result?: { verifiedEmail?: string }; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error ?? "Google access could not be connected to this BoardSignal.");
        rememberGoogleEmailPrefill(googleCredential.email ?? body.result?.verifiedEmail);
      }

      clearSavedBetaPreviewReturn(confirmation.requestId);
      router.replace(`/boardsignal/player-room?source=${withGoogle ? "google_onboarding" : "instant_private"}&tab=desk`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "My BoardSignal could not be opened.");
    } finally {
      setOpening("");
    }
  }

  const publishGuideContext = (active: boolean) => window.dispatchEvent(new CustomEvent("boardsignal:context", { detail: active ? { activeTab: "beta-request" } : {} }));

  if (existingActive) return <section className="beta-request-success" aria-live="polite"><div><p className="kicker">THIS BOARDSIGNAL ALREADY EXISTS</p><h3>{existingActive.username} already has an established private BoardSignal.</h3><p>Username knowledge alone never opens an existing private account.</p><div className="resolved-player-actions"><GoogleAccessButton expectedPlayerId={existingActive.playerId} /><Link className="button button-dark" href="/boardsignal/player-room">Use private access / recovery</Link><button type="button" className="button button-quiet" onClick={() => setExistingActive(null)}>Use another username</button></div><GoogleAccessButton mode="identity_help" username={existingActive.username} label="I NEED ACCESS TO THIS CHESS.COM PROFILE" /></div></section>;

  if (existingRequest) return <section className="beta-request-success" aria-live="polite"><div><p className="kicker">THIS BOARDSIGNAL ALREADY EXISTS</p><h3>{existingRequest.username} already has a protected BoardSignal access path.</h3><p>BoardSignal cannot reopen protected private access from a username alone. Use an authorised return key, the original device, or private recovery.</p><div className="resolved-player-actions"><GoogleAccessButton expectedPlayerId={existingRequest.playerId} /><Link className="button button-dark" href="/boardsignal/player-room">Use private access / recovery</Link><button type="button" className="button button-quiet" onClick={() => setExistingRequest(null)}>Use another username</button></div><GoogleAccessButton mode="identity_help" username={existingRequest.username} label="I NEED ACCESS TO THIS CHESS.COM PROFILE" /></div></section>;

  if (confirmation) {
    const preview = confirmation.preview;
    return <section className="beta-request-success boardsignal-inline-confirmation" aria-live="polite">
      <div className="beta-preview-identity">
        {confirmation.avatar ? <Image src={confirmation.avatar} alt="" width={58} height={58} unoptimized /> : <span className="beta-preview-avatar">{confirmation.canonicalUsername.slice(0, 2).toUpperCase()}</span>}
        <div><p className="kicker">WE FOUND YOU</p><h3>{confirmation.canonicalUsername}</h3>{confirmation.profileUrl ? <a className="text-link" href={confirmation.profileUrl} target="_blank" rel="noreferrer">Open public Chess.com profile</a> : null}</div>
      </div>
      <div className="beta-universe-disclosure">
        <strong>{preview?.period?.label ?? "CHESS.COM PROFILE CONFIRMED"}</strong>
        <p>{preview ? `${preview.games} game${preview.games === 1 ? "" : "s"} found${preview.period?.mode === "latest_active" ? " in the latest active completed period" : " in the latest completed period"}.` : "BoardSignal confirmed the canonical public Chess.com identity."}</p>
        <p>{preview?.safeHighlight ?? "Your private BoardSignal can now open on the stable Chess.com player identity BoardSignal resolved."}</p>
      </div>
      {!showAccessChoices ? <button className="button button-lime activation-request-submit" type="button" onClick={() => setShowAccessChoices(true)}>OPEN MY BOARDSIGNAL <ArrowRight size={17}/></button> : <div className="boardsignal-access-choice">
        <div><p className="kicker">RECOMMENDED</p><strong>Save an easy return key to this exact BoardSignal.</strong></div>
        <button className="button button-lime" type="button" onClick={() => void openPrivateBoardSignal(true)} disabled={Boolean(opening)}>{opening === "google" ? <><LoaderCircle className="button-spinner" size={16}/> Connecting Google</> : <>CONTINUE WITH GOOGLE <ArrowRight size={16}/></>}</button>
        <button className="button button-quiet" type="button" onClick={() => void openPrivateBoardSignal(false)} disabled={Boolean(opening)}>{opening === "without_google" ? <><LoaderCircle className="button-spinner" size={16}/> Opening</> : "CONTINUE WITHOUT GOOGLE"}</button>
        <p className="profile-helper">Google is a BoardSignal return key. It does not prove ownership of the Chess.com profile and it does not change your public identity.</p>
      </div>}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <p className="username-privacy"><ShieldCheck size={14}/> Private. Saved. No Chess.com password required.</p>
      <button type="button" className="text-link" onClick={() => { setConfirmation(null); setShowAccessChoices(false); setError(""); }}>Use another Chess.com username</button>
    </section>;
  }

  return <div className={`username-desk-shell ${compact ? "is-compact" : ""}`} onFocusCapture={() => publishGuideContext(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) publishGuideContext(false); }}>
    <form className={`username-desk-form activation-request-form ${compact ? "is-compact" : ""}`} onSubmit={submit}>
      <div className="activation-request-fields activation-request-username-only">
        <label htmlFor={compact ? "username-compact" : "username"}>Chess.com username
          <div className="username-entry-row activation-username-row"><span className="username-prefix" aria-hidden="true"><Search size={19}/></span><input id={compact ? "username-compact" : "username"} name="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your Chess.com username" autoComplete="off" spellCheck={false} disabled={busy}/></div>
        </label>
      </div>
      <div className="beta-universe-disclosure"><strong>SEE YOUR GAMES TOGETHER</strong><p>BoardSignal finds your public Chess.com profile and recent games first. Google comes only after BoardSignal has shown that it found you.</p></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-lime activation-request-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="button-spinner" size={17}/> Finding your week</> : <>SHOW ME MY REVIEW <ArrowRight size={17}/></>}</button>
      <p className="username-privacy"><ShieldCheck size={14}/> No Chess.com password. No uploads. Your BoardSignal stays private.</p>
    </form>
  </div>;
}
