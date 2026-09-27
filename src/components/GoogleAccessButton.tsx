"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { browserLocalPersistence, setPersistence, signInWithCustomToken } from "firebase/auth";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { auth } from "@/utils/firebaseConfig";
import { rememberGoogleEmailPrefill, requestGoogleAccessCredential } from "@/lib/boardsignal/client/googleAccess";

type IdentityConflictResult = {
  recorded?: boolean;
  caseId?: string;
  manualProof?: { challenge?: string; founderChessComUsername?: string; fallback?: "public_profile" };
};

type GoogleAccessButtonProps = {
  expectedPlayerId?: number;
  username?: string;
  mode?: "return" | "identity_help";
  label?: string;
  compact?: boolean;
  onUnmapped?: (credential: { googleIdToken: string; email?: string }) => void;
};

export default function GoogleAccessButton({ expectedPlayerId, username, mode = "return", label, compact = false, onUnmapped }: GoogleAccessButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [caseContactMethod, setCaseContactMethod] = useState<"email" | "discord">("email");
  const [caseContactValue, setCaseContactValue] = useState("");
  const [manualProof, setManualProof] = useState<IdentityConflictResult["manualProof"]>();

  async function runReturn() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const credential = await requestGoogleAccessCredential();
      const response = await fetch("/api/boardsignal/google-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "return", googleIdToken: credential.googleIdToken, expectedPlayerId }),
      });
      const body = await response.json() as {
        ok?: boolean;
        code?: string;
        result?: { customToken?: string; verifiedEmail?: string };
        error?: string;
      };
      if (response.status === 404 && body.code === "GOOGLE_ACCESS_NOT_LINKED" && onUnmapped) {
        rememberGoogleEmailPrefill(credential.email);
        onUnmapped({ googleIdToken: credential.googleIdToken, email: credential.email });
        return;
      }
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Google access could not be completed.");
      const customToken = body.result?.customToken;
      if (!customToken) throw new Error("Google was verified, but BoardSignal did not return a private access token.");
      rememberGoogleEmailPrefill(credential.email ?? body.result?.verifiedEmail);
      await setPersistence(auth, browserLocalPersistence);
      await signInWithCustomToken(auth, customToken);
      router.replace("/boardsignal/player-room?source=google&tab=desk");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Google access could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitIdentityCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !username) return;
    const contactValue = caseContactValue.trim();
    if (!contactValue) {
      setError(`Enter the ${caseContactMethod === "email" ? "email address" : "Discord contact"} BoardSignal should use for this identity case.`);
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    setManualProof(undefined);
    try {
      const credential = await requestGoogleAccessCredential();
      const response = await fetch("/api/boardsignal/google-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "identityHelp", googleIdToken: credential.googleIdToken, username, caseContactMethod, caseContactValue: contactValue }),
      });
      const body = await response.json() as { ok?: boolean; result?: IdentityConflictResult; message?: string; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "BoardSignal could not open this identity case.");
      setMessage(body.message ?? "Your identity case was received. No private account was granted or changed.");
      setManualProof(body.result?.manualProof);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "BoardSignal could not open this identity case.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "identity_help") {
    if (!showCaseForm) {
      return <div className={`google-access-action ${compact ? "is-compact" : ""}`}>
        <button type="button" className="button button-quiet" onClick={() => setShowCaseForm(true)} disabled={!username}>{label ?? "I NEED ACCESS TO THIS CHESS.COM PROFILE"} <ArrowRight size={15}/></button>
        <small><ShieldCheck size={13}/> This starts an identity case only. It never grants, merges, transfers or exposes a private BoardSignal.</small>
      </div>;
    }
    return <form className={`google-access-action identity-conflict-form ${compact ? "is-compact" : ""}`} onSubmit={submitIdentityCase}>
      <div><strong>ACCESS / IDENTITY CASE</strong><p>Authenticate with Google so BoardSignal has a stable requester identity, then choose how we can reach you about this case.</p></div>
      <label>Contact for this case<select value={caseContactMethod} onChange={(event) => setCaseContactMethod(event.target.value as "email" | "discord")} disabled={busy}><option value="email">Email</option><option value="discord">Discord</option></select></label>
      <label>{caseContactMethod === "email" ? "Email address" : "Discord username / handle"}<input value={caseContactValue} onChange={(event) => setCaseContactValue(event.target.value)} type={caseContactMethod === "email" ? "email" : "text"} maxLength={160} autoComplete={caseContactMethod === "email" ? "email" : "off"} disabled={busy} required /></label>
      <p className="profile-helper">This contact is for this identity case only. It is not authentication proof and does not opt you into marketing, product notifications, Trustpilot invitations or ongoing BoardSignal contact.</p>
      <div className="resolved-player-actions"><button type="submit" className="button button-dark" disabled={busy || !username || !caseContactValue.trim()}>{busy ? <><LoaderCircle className="button-spinner" size={15}/> Verifying Google</> : <>SUBMIT IDENTITY CASE <ArrowRight size={15}/></>}</button><button type="button" className="button button-quiet" onClick={() => { setShowCaseForm(false); setError(""); setMessage(""); setManualProof(undefined); }} disabled={busy}>Cancel</button></div>
      {manualProof?.challenge ? <div className="beta-universe-disclosure" role="status"><strong>CASE REFERENCE READY</strong><p>Your case is saved. BoardSignal support may use a separate Chess.com ownership check only if it is actually needed to resolve the conflict safely.</p></div> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-success" role="status">{message}</p> : null}
    </form>;
  }

  const primaryLabel = !label || label.toUpperCase() === "CONTINUE WITH GOOGLE" ? "Continue with Google" : label;
  return <div className={`google-access-action ${compact ? "is-compact" : ""}`}><GoogleSignInButton onClick={() => void runReturn()} busy={busy} busyLabel="Checking Google" label={primaryLabel} />{error ? <p className="form-error" role="alert">{error}</p> : null}{message ? <p className="form-success" role="status">{message}</p> : null}</div>;
}
