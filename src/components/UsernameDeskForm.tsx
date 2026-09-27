"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { browserLocalPersistence, setPersistence, signInWithCustomToken } from "firebase/auth";
import { ArrowRight, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { rememberGoogleEmailPrefill, requestGoogleAccessCredential } from "@/lib/boardsignal/client/googleAccess";
import { BOARDSIGNAL_SUPPORT_DISCORD_URL } from "@/lib/boardsignal/client/firestoreQuota";
import { auth } from "@/utils/firebaseConfig";
import styles from "./UsernameDeskForm.module.css";

export type OnboardingQaState = "google" | "username" | "profile" | "collision";
type UsernameDeskFormProps = {
  compact?: boolean;
  qaState?: OnboardingQaState;
  initialGoogleIdToken?: string;
  initialGoogleEmail?: string;
};

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

const QA_PROFILE: ResolvedProfile = {
  playerId: 424242,
  canonicalUsername: "sample_player",
  safeConfirmation: "BoardSignal found this public Chess.com profile. Confirm it only if this is the account whose games you want in your private Player Room.",
};

function OnboardingSteps({ current }: { current: 1 | 2 | 3 }) {
  const labels = ["Google", "Chess.com profile", "Player Room"];
  return <div className={styles.steps} aria-label={`BoardSignal setup step ${current} of 3`}>
    {labels.map((label, index) => {
      const number = index + 1;
      const stateClass = number < current ? styles.stepDone : number === current ? styles.stepCurrent : "";
      return <div className={`${styles.step} ${stateClass}`} key={label}><span aria-hidden="true">{number < current ? "✓" : number}</span>{label}</div>;
    })}
  </div>;
}

export default function UsernameDeskForm({ compact = false, qaState, initialGoogleIdToken, initialGoogleEmail }: UsernameDeskFormProps) {
  const router = useRouter();
  const qaEnabled = process.env.NODE_ENV !== "production" && Boolean(qaState);
  const [googleIdToken, setGoogleIdToken] = useState(() => initialGoogleIdToken ?? (qaEnabled && qaState !== "google" ? "boardsignal-local-render-qa" : ""));
  const [googleEmail, setGoogleEmail] = useState<string | undefined>(initialGoogleEmail);
  const [username, setUsername] = useState(() => qaEnabled && qaState !== "google" ? QA_PROFILE.canonicalUsername : "");
  const [profile, setProfile] = useState<ResolvedProfile | null>(() => qaEnabled && (qaState === "profile" || qaState === "collision") ? QA_PROFILE : null);
  const [busy, setBusy] = useState<BusyState>("");
  const [error, setError] = useState("");
  const [collision, setCollision] = useState(() => qaEnabled && qaState === "collision");
  const [showContactFallback, setShowContactFallback] = useState(false);
  const [caseContactValue, setCaseContactValue] = useState("");
  const [caseSubmitted, setCaseSubmitted] = useState(false);

  async function startGoogle() {
    if (busy) return;
    setBusy("google");
    setError("");
    setCollision(false);
    setShowContactFallback(false);
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
      const body = await response.json() as { ok?: boolean; result?: GoogleReturnResult; code?: string; error?: string };
      if (response.ok && body.ok && body.result?.customToken) {
        await setPersistence(auth, browserLocalPersistence);
        const signedIn = await signInWithCustomToken(auth, body.result.customToken);
        if (body.result.uid && signedIn.user.uid !== body.result.uid) throw new Error("BoardSignal stopped an identity mismatch before opening private data.");
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
    const identityInput = username.trim();
    if (!googleIdToken) { setError("Continue with Google before connecting a Chess.com profile."); return; }
    if (!identityInput) { setError("Enter a valid Chess.com username or Chess.com member profile link."); return; }
    setBusy("resolve");
    setError("");
    setCollision(false);
    setShowContactFallback(false);
    setCaseSubmitted(false);
    try {
      const response = await fetch("/api/boardsignal/google-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "resolveProfile", googleIdToken, username: identityInput }),
      });
      const body = await response.json() as { ok?: boolean; result?: ResolvedProfile; error?: string };
      if (!response.ok || !body.ok || !body.result) throw new Error(body.error ?? "BoardSignal could not resolve this Chess.com profile.");
      setProfile(body.result);
      setUsername(body.result.canonicalUsername);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "BoardSignal could not resolve this Chess.com profile.");
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
      const body = await response.json() as { ok?: boolean; result?: { customToken?: string; uid?: string; canonicalUsername?: string }; code?: string; error?: string };
      if (!response.ok || !body.ok || !body.result?.customToken) {
        if (body.code === "CHESS_PROFILE_ALREADY_HAS_BOARDSIGNAL") { setCollision(true); return; }
        throw new Error(body.error ?? "My BoardSignal could not be opened.");
      }
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithCustomToken(auth, body.result.customToken);
      if (body.result.uid && credential.user.uid !== body.result.uid) throw new Error("BoardSignal stopped an identity mismatch before opening private data.");
      if (googleEmail) rememberGoogleEmailPrefill(googleEmail);
      router.replace("/boardsignal/player-room?source=google_onboarding&tab=desk");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "My BoardSignal could not be opened.");
    } finally {
      setBusy("");
    }
  }

  async function saveIdentityCase(caseContactMethod: "email" | "discord", caseContactValue: string) {
    if (!googleIdToken || !profile || busy) return false;
    setBusy("conflict");
    setError("");
    try {
      const response = await fetch("/api/boardsignal/google-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "identityHelp", googleIdToken, username: profile.canonicalUsername, caseContactMethod, caseContactValue }),
      });
      const body = await response.json() as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "We could not save your access / identity case.");
      setCaseSubmitted(true);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not save your access / identity case.");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function requestNonDiscordResolution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contactValue = caseContactValue.trim();
    if (!contactValue) { setError("Give us an email address you actively check so we can reach you about this BoardSignal."); return; }
    await saveIdentityCase("email", contactValue);
  }

  function useAnotherUsername() {
    setProfile(null);
    setCollision(false);
    setShowContactFallback(false);
    setCaseSubmitted(false);
    setCaseContactValue("");
    setUsername("");
    setError("");
  }

  const publishGuideContext = (active: boolean) => window.dispatchEvent(new CustomEvent("boardsignal:context", { detail: active ? { activeTab: "google-onboarding" } : {} }));
  const shellClass = `${styles.shell} ${compact ? styles.compact : ""}`.trim();

  if (!googleIdToken) {
    return <section className={shellClass} data-boardsignal-onboarding-state="google" onFocusCapture={() => publishGuideContext(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) publishGuideContext(false); }}>
      <div className={styles.card} data-boardsignal-onboarding-card>
        <OnboardingSteps current={1} />
        <div className={styles.heading}><p className="kicker">GET MY BOARDSIGNAL</p><h3>One secure sign-in. BoardSignal takes it from there.</h3><p>Use Google to identify yourself to BoardSignal. We never receive your Google password.</p></div>
        <div className={styles.googleWrap}><GoogleSignInButton onClick={() => void startGoogle()} busy={busy === "google"} /></div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.pathHint} aria-label="What happens after Google sign-in"><p><strong>New here?</strong> We&apos;ll ask for your own Chess.com username next, then show the public profile before anything private is created.</p><p><strong>Already have BoardSignal?</strong> If Google is already connected, you&apos;ll go straight back. If it is not, BoardSignal will ask for your Chess.com profile and safely resolve any existing-account collision without creating a duplicate.</p></div>
        <p className={styles.privacy}><ShieldCheck size={15}/> Google signs you into BoardSignal. It does not verify ownership of a Chess.com profile.</p>
      </div>
    </section>;
  }

  if (collision && profile) {
    return <section className={shellClass} data-boardsignal-onboarding-state="collision" aria-live="polite">
      <div className={`${styles.card} ${styles.collisionCard}`} data-boardsignal-onboarding-card>
        <OnboardingSteps current={3} />
        <div className={styles.collisionHeading}><p className="kicker">THIS BOARDSIGNAL ALREADY EXISTS</p><h3>{profile.canonicalUsername}</h3><p>This Chess.com profile is already connected to a private BoardSignal.</p></div>
        <p className={styles.collisionNote}>If this is your account, we can help you resolve access without creating another BoardSignal.</p>
        <p className={styles.helpCopy}>Discord is the fastest way to sort this out.</p>
        <div className={styles.actions}>
          <a className={`button button-lime ${styles.primaryAction}`} href={BOARDSIGNAL_SUPPORT_DISCORD_URL} target="_blank" rel="noreferrer noopener" onClick={() => { void saveIdentityCase("discord", "BoardSignal Discord"); }}>RESOLVE THIS ON DISCORD <ArrowRight size={17}/></a>
          <button type="button" className={`button button-outline ${styles.secondaryAction}`} onClick={() => { setShowContactFallback((value) => !value); setError(""); }}>I CAN&apos;T USE DISCORD</button>
          <button type="button" className={`button button-quiet ${styles.secondaryAction}`} onClick={useAnotherUsername}>USE ANOTHER USERNAME</button>
        </div>
        {showContactFallback ? <form className={styles.helpForm} onSubmit={requestNonDiscordResolution}>
          <div><p className="kicker">HOW CAN WE REACH YOU?</p><p className={styles.helpCopy}>Give us a contact method you actively check. We&apos;ll use it only to resolve access to this BoardSignal.</p></div>
          <label>Email address you actively check<input value={caseContactValue} onChange={(event) => setCaseContactValue(event.target.value)} type="email" autoComplete="email" maxLength={160} required /></label>
          <button className={`button button-dark ${styles.primaryAction}`} type="submit" disabled={busy === "conflict" || !caseContactValue.trim()}>{busy === "conflict" ? <><LoaderCircle className="button-spinner" size={15}/> Saving case</> : "SEND ACCESS / IDENTITY CASE"}</button>
          <small className={styles.helpFinePrint}>This contact is used only for this access case. It is not authentication proof and does not opt you into marketing, notifications or Trustpilot invitations.</small>
        </form> : null}
        {caseSubmitted ? <div className={styles.success} role="status"><strong>ACCESS / IDENTITY CASE SAVED</strong><p>The existing private BoardSignal has not been opened, merged, replaced or copied. BoardSignal support can now resolve the conflict safely.</p></div> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <p className={styles.privacy}><ShieldCheck size={15}/> Knowing a public Chess.com username or matching an email address does not grant access to an existing private BoardSignal.</p>
      </div>
    </section>;
  }

  if (profile) {
    return <section className={shellClass} data-boardsignal-onboarding-state="profile" aria-live="polite">
      <div className={styles.card} data-boardsignal-onboarding-card>
        <OnboardingSteps current={3} />
        <div className={styles.profileIdentity}>{profile.avatar ? <Image src={profile.avatar} alt="" width={58} height={58} unoptimized /> : <span className={styles.avatarFallback}>{profile.canonicalUsername.slice(0, 2).toUpperCase()}</span>}<div className={styles.profileCopy}><p className="kicker">BOARDSIGNAL FOUND THIS PROFILE</p><h3>{profile.canonicalUsername}</h3>{profile.profileUrl ? <a className={styles.profileLink} href={profile.profileUrl} target="_blank" rel="noreferrer">View this public Chess.com profile</a> : null}</div></div>
        <div className={styles.confirmationPrompt}><strong>IS THIS YOUR CHESS.COM PROFILE?</strong><p>{profile.safeConfirmation}</p><p>Use your own Chess.com username. BoardSignal connects your account to the chess profile you choose.</p><p>If you connect the wrong Chess.com profile, correcting it may require an identity review with BoardSignal support.</p></div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.actions}><button className={`button button-lime ${styles.primaryAction}`} type="button" onClick={() => void claimProfile()} disabled={busy === "claim"}>{busy === "claim" ? <><LoaderCircle className="button-spinner" size={17}/> Opening My BoardSignal</> : <>YES — THIS IS MINE <ArrowRight size={17}/></>}</button><button className={`button button-quiet ${styles.secondaryAction}`} type="button" onClick={useAnotherUsername}>USE ANOTHER USERNAME</button></div>
        <p className={styles.privacy}><ShieldCheck size={15}/> Your private Player Room is created only after you confirm this profile. An existing playerId can never create a second private BoardSignal.</p>
      </div>
    </section>;
  }

  return <section className={shellClass} data-boardsignal-onboarding-state="username" onFocusCapture={() => publishGuideContext(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) publishGuideContext(false); }}>
    <div className={styles.card} data-boardsignal-onboarding-card>
      <OnboardingSteps current={2} />
      <div className={styles.heading}><p className="kicker">YOUR CHESS.COM PROFILE</p><h3>Enter your own Chess.com username.</h3><p>BoardSignal uses your public games to build your private chess picture.</p><p>Use your own Chess.com username. BoardSignal connects your account to the chess profile you choose.</p><p>If you connect the wrong Chess.com profile, correcting it may require an identity review with BoardSignal support.</p></div>
      <form className={styles.form} onSubmit={resolveProfile}><label className={styles.label} htmlFor={compact ? "username-compact" : "username"}>Chess.com username or profile link<div className={styles.inputRow}><span className={styles.inputIcon} aria-hidden="true"><Search size={19}/></span><input id={compact ? "username-compact" : "username"} name="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username or Chess.com profile link" autoComplete="off" spellCheck={false} disabled={busy === "resolve"}/></div><small className={styles.helpCopy}>Use the current username shown on your Chess.com profile, or paste the Chess.com member profile link.</small></label>{error ? <p className={styles.error} role="alert">{error}</p> : null}<button className={`button button-lime ${styles.primaryAction}`} type="submit" disabled={busy === "resolve"}>{busy === "resolve" ? <><LoaderCircle className="button-spinner" size={17}/> Finding your profile</> : <>FIND MY CHESS.COM PROFILE <ArrowRight size={17}/></>}</button></form>
      <p className={styles.privacy}><ShieldCheck size={15}/> No Chess.com password. Google identifies you to BoardSignal; it does not prove Chess.com-profile ownership.</p>
    </div>
  </section>;
}
