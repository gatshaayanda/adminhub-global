"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserLocalPersistence, setPersistence, signInWithCustomToken } from "firebase/auth";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { auth } from "@/utils/firebaseConfig";
import { rememberGoogleEmailPrefill, requestGoogleAccessCredential } from "@/lib/boardsignal/client/googleAccess";

type GoogleAccessButtonProps = {
  expectedPlayerId?: number;
  username?: string;
  mode?: "return" | "identity_help";
  label?: string;
  compact?: boolean;
};

export default function GoogleAccessButton({
  expectedPlayerId,
  username,
  mode = "return",
  label,
  compact = false,
}: GoogleAccessButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function run() {
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
        body: JSON.stringify(mode === "identity_help"
          ? { action: "identityHelp", googleIdToken: credential.googleIdToken, username }
          : { action: "return", googleIdToken: credential.googleIdToken, expectedPlayerId }),
      });
      const body = await response.json() as {
        ok?: boolean;
        result?: { customToken?: string; verifiedEmail?: string };
        message?: string;
        error?: string;
        code?: string;
      };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Google access could not be completed.");

      if (mode === "identity_help") {
        setMessage(body.message ?? "Your access-help request was received. No private account was granted or changed.");
        return;
      }

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

  const text = label ?? (mode === "identity_help" ? "I NEED ACCESS TO MY CHESS.COM PROFILE" : "CONTINUE WITH GOOGLE");
  return <div className={`google-access-action ${compact ? "is-compact" : ""}`}>
    <button type="button" className={mode === "identity_help" ? "button button-quiet" : "button button-outline"} onClick={() => void run()} disabled={busy || (mode === "identity_help" && !username)}>
      {busy ? <><LoaderCircle className="button-spinner" size={15}/> Checking Google</> : <>{text} <ArrowRight size={15}/></>}
    </button>
    {mode === "identity_help" ? <small><ShieldCheck size={13}/> This creates an access-help request only. It never grants, merges or replaces a private BoardSignal.</small> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {message ? <p className="form-success" role="status">{message}</p> : null}
  </div>;
}
