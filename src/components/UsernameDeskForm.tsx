"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { browserLocalPersistence, setPersistence, signInWithCustomToken } from "firebase/auth";
import { ArrowRight, LoaderCircle, Search, ShieldCheck, Smartphone } from "lucide-react";
import { rememberGoogleEmailPrefill, requestGoogleAccessCredential } from "@/lib/boardsignal/client/googleAccess";
import { auth } from "@/utils/firebaseConfig";

type UsernameDeskFormProps = { compact?: boolean };

type ResolvedProfile = {
  playerId: number;
  canonicalUsername: string;
  avatar?: string;
  profileUrl?: string;
  safeConfirmation: string;
};

type BusyState = "google" | "resolve" | "claim" | "conflict" | "";

function GoogleMark() {
  return (
    <svg className="google-signin-mark" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.798 2.716v2.258h2.909c1.703-1.568 2.685-3.879 2.685-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.955-2.18l-2.91-2.258c-.805.54-1.835.859-3.045.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.33A9 9 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.963 10.707A5.42 5.42 0 0 1 3.682 9c0-.592.102-1.168.281-1.707v-2.33H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.037l3.007-2.33Z"/>
      <path fill="#EA4335" d="M9 3.579c1.321 0 2.507.454 3.44 1.345l2.581-2.581C13.464.891 11.427 0 9 0A9 9 0 0 0 .956 4.963l3.007 2.33C4.672 5.164 6.656 3.579 9 3.579Z"/>
    </svg>
  );
}

export default function UsernameDeskForm({ compact = false }: UsernameDeskFormProps) {
  const router = useRouter();
  const [googleIdToken, setGoogleIdToken] = useState("");
  const [googleEmail, setGoogleEmail] = useState<string>();
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState<ResolvedProfile | null>(null);
  const [busy, setBusy] = useState<BusyState>("");
  const [error, setError] = useState("");
  const [collision, setCollision] = useState(false);
  const [caseContactMethod, setCaseContactMethod] = useState<"email" | "discord">("email");
  const [caseContactValue, setCaseContactValue] = useState("");
  const [caseSubmitted, setCaseSubmitted] = useState(false);

  async function startGoogle() {
    if (busy) return;
    setBusy("google");
    setError("");
    setCollision(false);
    setCaseSubmitted(false);
    try {
      const credential = await requestGoogleAccessCredential();
      if (credential.email) rememberGoogleEmailPrefill(credential.email);

      const response = await fetch("/api/boardsignal/google-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "return", googleIdToken: credential.googleIdToken }),
      });
      const body = await response.json() as {
        ok?: boolean;
        code?: string;
        result?: { customToken?: string; uid?: string };
        error?: string;
      };

      if (response.ok && body.ok && body.result?.customToken) {
        await setPersistence(auth, browserLocalPersistence);
        const signedIn = await signInWithCustomToken(auth, body.result.customToken);
        if (body.result.uid && signedIn.user.uid !== body.result.uid) {
          throw new Error("BoardSignal stopped an identity mismatch before opening private data.");
        }
        router.replace("/boardsignal/player-room?source=google&tab=desk");
        router.refresh();
        return;
      }

      if (response.status === 404 && body.code === "GOOGLE_ACCESS_NOT_LINKED") {
        setGoogleIdToken(credential.googleIdToken);
        setGoogleEmail(credential.email);
        return;
      }

      throw new Error(body.error ?? "Google sign-in could not open BoardSignal.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Google sign-in could not be completed.");
    } finally {
      setBusy("");
    }
  }

  async function resolveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanUsername = username.trim().replace(/^@/, "");
    if (!googleIdToken) { setError("Continue with Google before connecting your Chess.com profile."); return; }
    if (!cleanUsername) { setError("Enter your Chess.com username."); return; }
    setBusy("resolve");
    setError("");
    setCollision(false);
    setCaseSubmitted(false);
    try {
      const response = await fetch("/api/boardsignal/google-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "resolveProfile", googleIdToken, username: cleanUsername }),
      });
      const body = await response.json() as { ok?: boolean; result?: ResolvedProfile; error?: string };
      if (!response.ok || !body.ok || !body.result) throw new Error(body.error ?? "BoardSignal could not find this Chess.com profile.");
      setProfile(body.result);
      setUsername(body.result.canonicalUsername);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "BoardSignal could not find this Chess.com profile.");
    } finally {
      setBusy("");
    }
  }

  async function claimProfile() {
    if (!googleIdToken || !profile || busy) return;
    setBusy("claim");
    setError("");
    setCollision(false);
    try {
      const response = await fetch("/api/boardsignal/google-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "claimProfile", googleIdToken, username: profile.canonicalUsername }),
      });
      const body = await response.json() as {
        ok?: boolean;
        result?: { customToken?: string; uid?: string; canonicalUsername?: string };
        code?: string;
        error?: string;
      };
      if (!response.ok || !body.ok || !body.result?.customToken) {
        if (body.code === "CHESS_PROFILE_ALREADY_HAS_BOARDSIGNAL") {
          setCollision(true);
          return;
        }
        throw new Error(body.error ?? "My BoardSignal could not be opened.");
      }
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithCustomToken(auth, body.result.customToken);
      if (body.result.uid && credential.user.uid !== body.result.uid) {
        throw new Error("BoardSignal stopped an identity mismatch before opening private data.");
      }
      if (googleEmail) rememberGoogleEmailPrefill(googleEmail);
      router.replace("/boardsignal/player-room?source=google_onboarding&tab=desk");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "My BoardSignal could not be opened.");
    } finally {
      setBusy("");
    }
  }

  async function requestOwnershipReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!googleIdToken || !profile || busy) return;
    if (!caseContactValue.trim()) { setError("Enter an Email or Discord contact for this ownership-review case."); return; }
    setBusy("conflict");
    setError("");
    try {
      const response = await fetch("/api/boardsignal/google-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "identityHelp",
          googleIdToken,
          username: profile.canonicalUsername,
          caseContactMethod,
          caseContactValue: caseContactValue.trim(),
        }),
      });
      const body = await response.json() as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "The ownership-review request could not be saved.");
      setCaseSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The ownership-review request could not be saved.");
    } finally {
      setBusy("");
    }
  }

  function useAnotherUsername() {
    setProfile(null);
    setCollision(false);
    setCaseSubmitted(false);
    setCaseContactValue("");
    setUsername("");
    setError("");
  }

  function restartGoogle() {
    setGoogleIdToken("");
    setGoogleEmail(undefined);
    useAnotherUsername();
  }

  const publishGuideContext = (active: boolean) => window.dispatchEvent(new CustomEvent("boardsignal:context", { detail: active ? { activeTab: "google-onboarding" } : {} }));

  if (!googleIdToken) {
    return <section className={`username-desk-shell ${compact ? "is-compact" : ""}`} onFocusCapture={() => publishGuideContext(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) publishGuideContext(false); }}>
      <div className={`username-desk-form activation-request-form google-entry-card ${compact ? "is-compact" : ""}`}>
        <p className="kicker">OPEN THE BOARDSIGNAL APP</p>
        <h3>Start or return with Google.</h3>
        <p className="google-entry-lede">One button handles both. Returning players go straight back to My BoardSignal. New players connect their Chess.com profile after Google.</p>
        <button className="google-primary-button" type="button" onClick={() => void startGoogle()} disabled={busy === "google"}>
          <span className="google-mark-shell"><GoogleMark /></span>
          <span>{busy === "google" ? "Opening Google…" : "Continue with Google"}</span>
          {busy === "google" ? <LoaderCircle className="button-spinner google-button-trailing" size={17}/> : <ArrowRight className="google-button-trailing" size={17}/>} 
        </button>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <p className="google-signin-explainer"><ShieldCheck size={15}/> Google opens its own secure sign-in window. You never type your Gmail password into BoardSignal.</p>
        <div className="boardsignal-app-explainer"><Smartphone size={18}/><div><strong>BoardSignal is an installable app.</strong><p>Use it in your browser now. When your device supports installation, BoardSignal will offer a clear Install BoardSignal action.</p></div></div>
      </div>
    </section>;
  }

  if (collision && profile) {
    return <section className="beta-request-success boardsignal-inline-confirmation" aria-live="polite">
      <div><p className="kicker">THIS CHESS.COM PROFILE ALREADY HAS A BOARDSIGNAL</p><h3>{profile.canonicalUsername}</h3><p>BoardSignal did not open, transfer or expose the existing private account.</p></div>
      {caseSubmitted ? <div className="form-success" role="status"><strong>OWNERSHIP REVIEW REQUESTED</strong><p>The Founder can now handle this as an identity-conflict exception. No private mapping changed.</p></div> : <form className="activation-request-form" onSubmit={requestOwnershipReview}>
        <p><strong>If this is your Chess.com account, request ownership review.</strong></p>
        <label>Contact for this case
          <select value={caseContactMethod} onChange={(event) => setCaseContactMethod(event.target.value as "email" | "discord")}>
            <option value="email">Email</option>
            <option value="discord">Discord</option>
          </select>
        </label>
        <label>{caseContactMethod === "email" ? "Email address" : "Discord username"}
          <input value={caseContactValue} onChange={(event) => setCaseContactValue(event.target.value)} type={caseContactMethod === "email" ? "email" : "text"} maxLength={160} required />
        </label>
        <button className="button button-dark" type="submit" disabled={busy === "conflict"}>{busy === "conflict" ? <><LoaderCircle className="button-spinner" size={15}/> Saving case</> : "REQUEST OWNERSHIP REVIEW"}</button>
        <small>This contact is for this identity case only. It is not marketing, notification or Trustpilot consent.</small>
      </form>}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="resolved-player-actions"><button type="button" className="button button-quiet" onClick={useAnotherUsername}>Use another username</button><button type="button" className="button button-quiet" onClick={restartGoogle}>Use another Google account</button></div>
    </section>;
  }

  if (profile) {
    return <section className="beta-request-success boardsignal-inline-confirmation" aria-live="polite">
      <div className="beta-preview-identity">
        {profile.avatar ? <Image src={profile.avatar} alt="" width={58} height={58} unoptimized /> : <span className="beta-preview-avatar">{profile.canonicalUsername.slice(0, 2).toUpperCase()}</span>}
        <div><p className="kicker">BOARDSIGNAL FOUND YOUR CHESS.COM PROFILE</p><h3>{profile.canonicalUsername}</h3>{profile.profileUrl ? <a className="text-link" href={profile.profileUrl} target="_blank" rel="noreferrer">Open public Chess.com profile</a> : null}</div>
      </div>
      <div className="beta-universe-disclosure"><strong>IS THIS YOUR CHESS.COM PROFILE?</strong><p>{profile.safeConfirmation}</p></div>
      <button className="button button-lime activation-request-submit" type="button" onClick={() => void claimProfile()} disabled={busy === "claim"}>{busy === "claim" ? <><LoaderCircle className="button-spinner" size={17}/> Opening My BoardSignal</> : <>YES — OPEN MY BOARDSIGNAL <ArrowRight size={17}/></>}</button>
      <button className="button button-quiet" type="button" onClick={useAnotherUsername}>USE ANOTHER USERNAME</button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <p className="username-privacy"><ShieldCheck size={14}/> Google is your BoardSignal sign-in. This confirmation connects the right public Chess.com profile; BoardSignal never asks for your Chess.com password.</p>
    </section>;
  }

  return <section className={`username-desk-shell ${compact ? "is-compact" : ""}`} onFocusCapture={() => publishGuideContext(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) publishGuideContext(false); }}>
    <form className={`username-desk-form activation-request-form ${compact ? "is-compact" : ""}`} onSubmit={resolveProfile}>
      <div><p className="kicker">GOOGLE SIGN-IN COMPLETE</p><h3>Now connect your Chess.com profile.</h3><p>Enter your Chess.com username once so BoardSignal can find your public games and attach the right chess profile to this Google sign-in.</p></div>
      <div className="activation-request-fields activation-request-username-only">
        <label htmlFor={compact ? "username-compact" : "username"}>Chess.com username
          <div className="username-entry-row activation-username-row"><span className="username-prefix" aria-hidden="true"><Search size={19}/></span><input id={compact ? "username-compact" : "username"} name="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your Chess.com username" autoComplete="off" spellCheck={false} disabled={busy === "resolve"}/></div>
        </label>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-lime activation-request-submit" type="submit" disabled={busy === "resolve"}>{busy === "resolve" ? <><LoaderCircle className="button-spinner" size={17}/> Finding your profile</> : <>FIND MY CHESS.COM PROFILE <ArrowRight size={17}/></>}</button>
      <button className="button button-quiet" type="button" onClick={restartGoogle}>USE A DIFFERENT GOOGLE ACCOUNT</button>
      <p className="username-privacy"><ShieldCheck size={14}/> This is profile connection, not Chess.com login. No Chess.com password is requested or stored.</p>
    </form>
  </section>;
}
