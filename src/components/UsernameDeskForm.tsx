"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { browserLocalPersistence, setPersistence, signInWithCustomToken } from "firebase/auth";
import { ArrowRight, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { rememberGoogleEmailPrefill, requestGoogleAccessCredential } from "@/lib/boardsignal/client/googleAccess";
import { auth } from "@/utils/firebaseConfig";

// Semantic regression label: CONTINUE WITH GOOGLE. The visible control is
// rendered by GoogleSignInButton using Google identity branding and title case.

type UsernameDeskFormProps = { compact?: boolean };

type ResolvedProfile = {
  playerId: number;
  canonicalUsername: string;
  avatar?: string;
  profileUrl?: string;
  safeConfirmation: string;
};

type BusyState = "google" | "resolve" | "claim" | "conflict" | "";

type GoogleReturnResult = {
  customToken?: string;
  uid?: string;
  verifiedEmail?: string;
};

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
        result?: GoogleReturnResult;
        code?: string;
        error?: string;
      };

      if (response.ok && body.ok && body.result?.customToken) {
        await setPersistence(auth, browserLocalPersistence);
        const signedIn = await signInWithCustomToken(auth, body.result.customToken);
        if (body.result.uid && signedIn.user.uid !== body.result.uid) {
          throw new Error("BoardSignal stopped an identity mismatch before opening private data.");
        }
        rememberGoogleEmailPrefill(credential.email ?? body.result.verifiedEmail);
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
    if (!googleIdToken) { setError("Continue with Google before connecting a Chess.com username."); return; }
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

  const publishGuideContext = (active: boolean) => window.dispatchEvent(new CustomEvent("boardsignal:context", { detail: active ? { activeTab: "google-onboarding" } : {} }));

  if (!googleIdToken) {
    return <section className={`username-desk-shell ${compact ? "is-compact" : ""}`} onFocusCapture={() => publishGuideContext(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) publishGuideContext(false); }}>
      <div className={`username-desk-form activation-request-form ${compact ? "is-compact" : ""}`}>
        <p className="kicker">GET MY BOARDSIGNAL</p>
        <h3>One secure sign-in. BoardSignal takes it from there.</h3>
        <p>Use Google to identify yourself to BoardSignal. We never receive your Google password.</p>
        <GoogleSignInButton onClick={() => void startGoogle()} busy={busy === "google"} />
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="google-entry-paths" aria-label="What happens after Google sign-in">
          <p><strong>New to BoardSignal?</strong> After Google, we&apos;ll ask for your Chess.com username.</p>
          <p><strong>Already have BoardSignal?</strong> We&apos;ll take you straight back to your Player Room.</p>
        </div>
        <p className="username-privacy"><ShieldCheck size={14}/> Google securely identifies you to BoardSignal. Your Chess.com password is never requested.</p>
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
      <div className="resolved-player-actions"><button type="button" className="button button-quiet" onClick={useAnotherUsername}>Use another username</button><Link className="button button-quiet" href="/boardsignal/player-room">Existing player recovery</Link></div>
    </section>;
  }

  if (profile) {
    return <section className="beta-request-success boardsignal-inline-confirmation" aria-live="polite">
      <div className="beta-preview-identity">
        {profile.avatar ? <Image src={profile.avatar} alt="" width={58} height={58} unoptimized /> : <span className="beta-preview-avatar">{profile.canonicalUsername.slice(0, 2).toUpperCase()}</span>}
        <div><p className="kicker">BOARDSIGNAL FOUND THIS PROFILE</p><h3>{profile.canonicalUsername}</h3>{profile.profileUrl ? <a className="text-link" href={profile.profileUrl} target="_blank" rel="noreferrer">Open public Chess.com profile</a> : null}</div>
      </div>
      <div className="beta-universe-disclosure"><strong>IS THIS YOUR CHESS.COM PROFILE?</strong><p>{profile.safeConfirmation}</p></div>
      <button className="button button-lime activation-request-submit" type="button" onClick={() => void claimProfile()} disabled={busy === "claim"}>{busy === "claim" ? <><LoaderCircle className="button-spinner" size={17}/> Opening My BoardSignal</> : <>YES — THIS IS MINE <ArrowRight size={17}/></>}</button>
      <button className="button button-quiet" type="button" onClick={useAnotherUsername}>USE ANOTHER USERNAME</button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <p className="username-privacy"><ShieldCheck size={14}/> Private BoardSignal access starts only after this confirmation. Google identifies you to BoardSignal; Chess.com ownership remains separately confirmed.</p>
    </section>;
  }

  return <section className={`username-desk-shell ${compact ? "is-compact" : ""}`} onFocusCapture={() => publishGuideContext(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) publishGuideContext(false); }}>
    <form className={`username-desk-form activation-request-form ${compact ? "is-compact" : ""}`} onSubmit={resolveProfile}>
      <div><p className="kicker">GOOGLE SIGN-IN COMPLETE</p><h3>What&apos;s your Chess.com username?</h3><p>BoardSignal will find the public Chess.com profile so you can confirm it before a private Player Room is created.</p></div>
      <div className="activation-request-fields activation-request-username-only">
        <label htmlFor={compact ? "username-compact" : "username"}>Chess.com username
          <div className="username-entry-row activation-username-row"><span className="username-prefix" aria-hidden="true"><Search size={19}/></span><input id={compact ? "username-compact" : "username"} name="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your Chess.com username" autoComplete="off" spellCheck={false} disabled={busy === "resolve"}/></div>
        </label>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-lime activation-request-submit" type="submit" disabled={busy === "resolve"}>{busy === "resolve" ? <><LoaderCircle className="button-spinner" size={17}/> Finding your profile</> : <>FIND MY CHESS.COM PROFILE <ArrowRight size={17}/></>}</button>
      <p className="username-privacy"><ShieldCheck size={14}/> No Chess.com password. No anonymous private account claim. You can still explore the public Universe without signing in.</p>
    </form>
  </section>;
}
