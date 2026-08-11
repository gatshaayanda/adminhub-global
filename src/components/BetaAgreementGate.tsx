"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function BetaAgreementGate({ onAccept }: { onAccept: () => Promise<void> }) {
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
        <p className="agreement-deck">Before entering your Player Room, here is the plain-language agreement for this founding beta.</p>
        <ul>
          <li>BoardSignal processes your Chess.com game data to create your BoardSignal experience.</li>
          <li>Your full Desk, weaknesses, Signal Board and position evidence are private.</li>
          <li>Safe positive sports-style coverage may appear in the Universe only according to your privacy settings.</li>
          <li>BoardSignal may store your recent account state and latest four active Desks.</li>
          <li>The beta is currently provided without payment. Features, limits and future commercial terms may evolve before a paid product.</li>
          <li>You may stop participating or request account deletion.</li>
          <li>Communication preferences are controlled separately. This patch sends no email or browser notifications.</li>
        </ul>
        <div className="agreement-links"><Link href="/boardsignal/beta-terms">Read beta terms</Link><Link href="/boardsignal/privacy">Read privacy summary</Link></div>
        <label className="agreement-check"><input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} /><span>I understand and accept the Founding Beta Agreement.</span></label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button button-lime" type="button" disabled={!understood || busy} onClick={accept}>Enter My Player Room <ArrowRight size={17} /></button>
      </section>
    </div>
  );
}
