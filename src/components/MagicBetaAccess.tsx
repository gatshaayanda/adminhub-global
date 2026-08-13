"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { browserLocalPersistence, setPersistence, signInWithCustomToken } from "firebase/auth";
import { KeyRound, LoaderCircle } from "lucide-react";
import { auth } from "@/utils/firebaseConfig";

export default function MagicBetaAccess() {
  const router = useRouter();
  const attempted = useRef(false);
  const [state, setState] = useState<"opening" | "expired" | "error">("opening");
  const [message, setMessage] = useState("Opening your private BoardSignal Player Room…");

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const ticket = params.get("ticket") ?? "";
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    if (!ticket) { setState("error"); setMessage("This BoardSignal access link is incomplete."); return; }
    void (async () => {
      try {
        const response = await fetch("/api/auth/beta-access/magic", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ ticket }) });
        const body = await response.json() as { ok?: boolean; customToken?: string; code?: string; error?: string };
        if (!response.ok || !body.ok || !body.customToken) {
          if (body.code === "MAGIC_ACCESS_EXPIRED") setState("expired"); else setState("error");
          setMessage(body.error ?? "This BoardSignal access link could not be opened.");
          return;
        }
        await setPersistence(auth, browserLocalPersistence);
        await signInWithCustomToken(auth, body.customToken);
        router.replace("/boardsignal/player-room?source=beta_magic&tab=desk");
        router.refresh();
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "This BoardSignal access link could not be opened.");
      }
    })();
  }, [router]);

  return <main id="main" className="container beta-magic-access-page">
    <section className="beta-agreement-card bs-surface-paper">
      <div className="agreement-mark"><KeyRound /></div>
      <p className="kicker">PRIVATE BOARDSIGNAL ACCESS</p>
      <h1>{state === "opening" ? "Opening your Player Room" : state === "expired" ? "This access link expired" : "This access link couldn't open"}</h1>
      <p className="agreement-deck">{message}</p>
      {state === "opening" ? <div className="founder-directory-loading"><LoaderCircle className="button-spinner" /> Verifying one-time access</div> : <div className="resolved-player-actions"><Link className="button button-dark" href="/boardsignal/player-room">Use fallback Founding Beta access</Link><Link className="button button-quiet" href="/#get-my-boardsignal">{state === "expired" ? "Request a fresh access link" : "Return to Founding Beta access"}</Link></div>}
      {state === "expired" ? <p className="helper-copy">Your BoardSignal account can still exist. Ask Ayanda for a fresh private access link or use your username + Beta Access recovery path.</p> : null}
    </section>
  </main>;
}
