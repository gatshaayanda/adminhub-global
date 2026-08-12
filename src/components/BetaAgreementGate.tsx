"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function BetaAgreementGate({ onAccept }: { onAccept: () => Promise<void> }) {
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("boardsignal:context", { detail: { activeTab: "agreement" } }));
    return () => { window.dispatchEvent(new CustomEvent("boardsignal:context", { detail: { activeTab: "desk" } })); };
  }, []);

  async function accept() {
    setBusy(true);
    setError("");
    try {
      await onAccept();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The agreement could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="main" className="container beta-agreement-page">
      <section className="beta-agreement-card">
        <div className="agreement-mark"><ShieldCheck size={28} /></div>
        <p className="kicker">FOUNDING BETA AGREEMENT</p>
        <h1>Your private Desk stays private.</h1>
        <p className="agreement-deck">Before entering your Player Room, here is the plain-language agreement for this Founding Beta.</p>
        <ul>
          <li>BoardSignal processes your Chess.com game data to create your BoardSignal experience.</li>
          <li>Your full Desk, weaknesses, Signal Board, evidence, recurrence and private progress are private.</li>
          <li><strong>Each completed Founding Beta Desk may contribute at least one safe sports-style public coverage item to the BoardSignal Universe.</strong></li>
          <li>Public coverage uses positive or neutral supported facts only. BoardSignal never automatically publishes Red, private Amber, Blue, evidence or negative diagnostic language.</li>
          <li>BoardSignal may store your recent account state and latest four active Desks.</li>
          <li>The beta is currently provided without payment. Features, limits and future commercial terms may evolve before a paid product.</li>
          <li>You may stop participating or request account deletion.</li>
          <li>Communication preferences are separate. Browser alerts require a separate explicit permission action.</li>
        </ul>
        <div className="agreement-universe-required">
          <span>BOARDSIGNAL UNIVERSE</span>
          <strong>Included with Founding Beta ✓</strong>
          <p>Public coverage. Private weakness.</p>
        </div>
        <div className="agreement-links"><Link href="/boardsignal/beta-terms">Read beta terms</Link><Link href="/boardsignal/privacy">Read privacy summary</Link></div>
        <label className="agreement-check"><input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} /><span>I understand and accept the Founding Beta Agreement, including safe Universe participation.</span></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="button button-lime" type="button" disabled={!understood || busy} onClick={accept}>Continue <ArrowRight size={17} /></button>
      </section>
    </div>
  );
}
