"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { browserLocalPersistence, setPersistence, signInWithCustomToken } from "firebase/auth";
import { ArrowRight, LoaderCircle, Search, ShieldCheck } from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { rememberGoogleEmailPrefill, requestGoogleAccessCredential } from "@/lib/boardsignal/client/googleAccess";
import { auth } from "@/utils/firebaseConfig";
import styles from "./UsernameDeskForm.module.css";

export type OnboardingQaState = "google" | "username" | "profile" | "collision";
type UsernameDeskFormProps = { compact?: boolean; qaState?: OnboardingQaState };

type ResolvedProfile = {
  playerId: number;
  canonicalUsername: string;
  avatar?: string;
  profileUrl?: string;
  safeConfirmation: string;
};

type BusyState = "google" | "resolve" | "claim" | "recover" | "conflict" | "";

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
  return (
    <div className={styles.steps} aria-label={`BoardSignal setup step ${current} of 3`}>
      {labels.map((label, index) => {
        const number = index + 1;
        const stateClass = number < current ? styles.stepDone : number === current ? styles.stepCurrent : "";
        return <div className={`${styles.step} ${stateClass}`} key={label}><span aria-hidden="true">{number < current ? "✓" : number}</span>{label}</div>;
      })}
    </div>
  );
}

export default function UsernameDeskForm({ compact = false, qaState }: UsernameDeskFormProps) {
  const router = useRouter();
  const qaEnabled = process.env.NODE_ENV !== "production" && Boolean(qaState);
  const [googleIdToken, setGoogleIdToken] = useState(() => qaEnabled && qaState !== "google" ? "boardsignal-local-render-qa" : "");
  const [googleEmail, setGoogleEmail] = useState<string>();
  const [username, setUsername] = useState(() => qaEnabled && qaState !== "google" ? QA_PROFILE.canonicalUsername : "");
  const [profile, setProfile] = useState<ResolvedProfile | null>(() => qaEnabled && (qaState === "profile" || qaState === "collision") ? QA_PROFILE : null);
  const [busy, setBusy] = useState<BusyState>("");
  const [error, setError] = useState("");
  const [collision, setCollision] = useState(() => qaEnabled && qaState === "collision");
  const [legacyAccessCode, setLegacyAccessCode] = useState("");
  const [caseContactMethod, setCaseContactMethod] = useState<"email" | "discord">("email");
  const [caseContactValue, setCaseContactValue] = useState("");
  const [caseSubmitted, setCaseSubmitted] = useState(false);

  async function startGoogle() {
    if (busy) return;
    setBusy("google");
    setError("");
    setCollision(false);
    setLegacyAccessCode("");
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
    setLegacyAccessCode("");
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

  async function recoverExistingBoardSignal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!googleIdToken || !profile || busy) return;
    if (!legacyAccessCode.trim()) { setError("Enter your existing BoardSignal private access code."); return; }
    setBusy("recover");
    setError("");
    try {
      const response = await fetch("/api/boardsignal/google-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "recoverLegacy",
          googleIdToken,
          username: profile.canonicalUsername,
          expectedPlayerId: profile.playerId,
          accessCode: legacyAccessCode.trim(),
        }),
      });
      const body = await response.json() as {
        ok?: boolean;
        result?: { customToken?: string; uid?: string; canonicalUsername?: string };
        error?: string;
      };
      if (!response.ok || !body.ok || !body.result?.customToken) {
        throw new Error(body.error ?? "BoardSignal could not verify your existing access.");
      }
      await setPersistence(auth, browserLocalPersistence);
      const credential = await signInWithCustomToken(auth, body.result.customToken);
      if (body.result.uid && credential.user.uid !== body.result.uid) {
        throw new Error("BoardSignal stopped an identity mismatch before opening private data.");
      }
      if (googleEmail) rememberGoogleEmailPrefill(googleEmail);
      setLegacyAccessCode("");
      router.replace("/boardsignal/player-room?source=google_recovery&tab=desk");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "BoardSignal could not verify your existing access.");
    } finally {
      setBusy("");
    }
  }

  async function requestOwnershipReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!googleIdToken || !profile || busy) return;
    if (!caseContactValue.trim()) { setError("Enter an email or Discord contact so we can follow up about this account."); return; }
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
      if (!response.ok || !body.ok) throw new Error(body.error ?? "We could not save your recovery request.");
      setCaseSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not save your recovery request.");
    } finally {
      setBusy("");
    }
  }

  function useAnotherUsername() {
    setProfile(null);
    setCollision(false);
    setLegacyAccessCode("");
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
        <div className={styles.heading}>
          <p className="kicker">GET MY BOARDSIGNAL</p>
          <h3>One secure sign-in. BoardSignal takes it from there.</h3>
          <p>Use Google to identify yourself to BoardSignal. We never receive your Google password.</p>
        </div>
        <div className={styles.googleWrap}><GoogleSignInButton onClick={() => void startGoogle()} busy={busy === "google"} /></div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.pathHint} aria-label="What happens after Google sign-in">
          <p><strong>New here?</strong> We&apos;ll ask for your Chess.com username next, then show the profile before anything private is created.</p>
          <p><strong>Already have BoardSignal?</strong> If Google is already connected, you&apos;ll go straight back. If it is not, BoardSignal will help you verify your existing access before connecting Google to the same Player Room.</p>
        </div>
        <p className={styles.privacy}><ShieldCheck size={15}/> Google identifies you to BoardSignal. Your Chess.com password is never requested.</p>
      </div>
    </section>;
  }

  if (collision && profile) {
    return <section className={shellClass} data-boardsignal-onboarding-state="collision" aria-live="polite">
      <div className={`${styles.card} ${styles.collisionCard}`} data-boardsignal-onboarding-card>
        <OnboardingSteps current={3} />
        <div className={styles.collisionHeading}>
          <p className="kicker">WE FOUND YOUR EXISTING BOARDSIGNAL</p>
          <h3>{profile.canonicalUsername}</h3>
          <p>Your chess history is still here. Verify your existing access so we can connect Google to this same BoardSignal.</p>
        </div>
        <p className={styles.collisionNote}>Nothing has been replaced or restarted. Your existing Player Room stays on its current private account and UID.</p>
        <form className={styles.form} onSubmit={recoverExistingBoardSignal}>
          <label className={styles.label} htmlFor={compact ? "legacy-access-code-compact" : "legacy-access-code"}>Existing private access code
            <div className={styles.inputRow}><span className={styles.inputIcon} aria-hidden="true"><ShieldCheck size={18}/></span><input id={compact ? "legacy-access-code-compact" : "legacy-access-code"} value={legacyAccessCode} onChange={(event) => setLegacyAccessCode(event.target.value)} type="password" autoComplete="current-password" maxLength={80} disabled={busy === "recover"} required /></div>
          </label>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button className={`button button-lime ${styles.primaryAction}`} type="submit" disabled={busy === "recover" || !legacyAccessCode.trim()}>{busy === "recover" ? <><LoaderCircle className="button-spinner" size={17}/> Verifying existing access</> : <>CONNECT GOOGLE TO THIS BOARDSIGNAL <ArrowRight size={17}/></>}</button>
        </form>
        <p className={styles.privacy}><ShieldCheck size={15}/> This verifies your existing BoardSignal access only. Reviews, Progress, Journal, Notes, social state, cadence and Current BoardSignal stay on this same private account.</p>
        <button type="button" className={`button button-quiet ${styles.secondaryAction}`} onClick={useAnotherUsername}>USE ANOTHER USERNAME</button>
        <details className={styles.helpDetails}>
          <summary>I still need help recovering this account</summary>
          {caseSubmitted ? <div className={styles.success} role="status"><strong>RECOVERY REQUEST SAVED</strong><p>We&apos;ve saved this identity-conflict case without changing the existing private account.</p></div> : <form className={styles.helpForm} onSubmit={requestOwnershipReview}>
            <p className={styles.helpCopy}>If your existing private access code does not work, leave one contact method so the account can be reviewed safely as an exception.</p>
            <label>How should we contact you?
              <select value={caseContactMethod} onChange={(event) => setCaseContactMethod(event.target.value as "email" | "discord")}>
                <option value="email">Email</option>
                <option value="discord">Discord</option>
              </select>
            </label>
            <label>{caseContactMethod === "email" ? "Email address" : "Discord username"}
              <input value={caseContactValue} onChange={(event) => setCaseContactValue(event.target.value)} type={caseContactMethod === "email" ? "email" : "text"} maxLength={160} required />
            </label>
            <button className={`button button-dark ${styles.primaryAction}`} type="submit" disabled={busy === "conflict"}>{busy === "conflict" ? <><LoaderCircle className="button-spinner" size={15}/> Saving request</> : "REQUEST ACCOUNT HELP"}</button>
            <small className={styles.helpFinePrint}>This contact is used only for this account-recovery case. It is not authentication proof, marketing, notification or Trustpilot consent.</small>
          </form>}
        </details>
      </div>
    </section>;
  }

  if (profile) {
    return <section className={shellClass} data-boardsignal-onboarding-state="profile" aria-live="polite">
      <div className={styles.card} data-boardsignal-onboarding-card>
        <OnboardingSteps current={3} />
        <div className={styles.profileIdentity}>
          {profile.avatar ? <Image src={profile.avatar} alt="" width={58} height={58} unoptimized /> : <span className={styles.avatarFallback}>{profile.canonicalUsername.slice(0, 2).toUpperCase()}</span>}
          <div className={styles.profileCopy}>
            <p className="kicker">BOARDSIGNAL FOUND THIS PROFILE</p>
            <h3>{profile.canonicalUsername}</h3>
            {profile.profileUrl ? <a className={styles.profileLink} href={profile.profileUrl} target="_blank" rel="noreferrer">View this public Chess.com profile</a> : null}
          </div>
        </div>
        <div className={styles.confirmationPrompt}><strong>IS THIS YOUR CHESS.COM PROFILE?</strong><p>{profile.safeConfirmation}</p></div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.actions}>
          <button className={`button button-lime ${styles.primaryAction}`} type="button" onClick={() => void claimProfile()} disabled={busy === "claim"}>{busy === "claim" ? <><LoaderCircle className="button-spinner" size={17}/> Opening My BoardSignal</> : <>YES — THIS IS MINE <ArrowRight size={17}/></>}</button>
          <button className={`button button-quiet ${styles.secondaryAction}`} type="button" onClick={useAnotherUsername}>USE ANOTHER USERNAME</button>
        </div>
        <p className={styles.privacy}><ShieldCheck size={15}/> Your private Player Room is created or opened only after you confirm this profile.</p>
      </div>
    </section>;
  }

  return <section className={shellClass} data-boardsignal-onboarding-state="username" onFocusCapture={() => publishGuideContext(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) publishGuideContext(false); }}>
    <div className={styles.card} data-boardsignal-onboarding-card>
      <OnboardingSteps current={2} />
      <div className={styles.heading}>
        <p className="kicker">GOOGLE SIGN-IN COMPLETE</p>
        <h3>Now choose your Chess.com profile.</h3>
        <p>Enter your Chess.com username. BoardSignal will show the public profile first. If it already has a private BoardSignal, you&apos;ll recover that same account instead of creating another one.</p>
      </div>
      <form className={styles.form} onSubmit={resolveProfile}>
        <label className={styles.label} htmlFor={compact ? "username-compact" : "username"}>Chess.com username
          <div className={styles.inputRow}><span className={styles.inputIcon} aria-hidden="true"><Search size={19}/></span><input id={compact ? "username-compact" : "username"} name="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your Chess.com username" autoComplete="off" spellCheck={false} disabled={busy === "resolve"}/></div>
        </label>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button className={`button button-lime ${styles.primaryAction}`} type="submit" disabled={busy === "resolve"}>{busy === "resolve" ? <><LoaderCircle className="button-spinner" size={17}/> Finding your profile</> : <>FIND MY CHESS.COM PROFILE <ArrowRight size={17}/></>}</button>
      </form>
      <p className={styles.privacy}><ShieldCheck size={15}/> No Chess.com password. You can still explore the public Universe without signing in.</p>
    </div>
  </section>;
}
