import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";

export const metadata: Metadata = { title: "BoardSignal Privacy" };

export default function BoardSignalPrivacyPage() {
  return <div id="main" className="container boardsignal-policy-page"><Link href="/boardsignal/player-room" className="desk-back"><ArrowLeft size={16} /> Back to Player Room</Link><header><LockKeyhole /><p className="kicker">PUBLIC HIGHLIGHT · PRIVATE WEAKNESS</p><h1>Your BoardSignal privacy boundary.</h1></header><section><h2>Chess.com identity</h2><p>BoardSignal never requests or stores your Chess.com password. When official Chess.com account sign-in is available, OAuth proves ownership and BoardSignal keeps provider secrets on the server.</p><h2>Private Player Room data</h2><p>Your account profile, completed Desks, Signal Board, evidence, current episode progress and recurrence live in owner-only private collections.</p><h2>Public coverage</h2><p>Public player identity and positive coverage are stored separately. Public documents never contain Red, private Amber, Blue, reviewed position evidence, private recurrence or private progress analytics.</p><h2>Retention</h2><p>BoardSignal retains at most four complete active Desks per player. Small personal-best records may remain after an older heavy Desk is removed.</p><h2>Controls</h2><p>Public player pages and Universe coverage follow your privacy settings. You may stop participating or request deletion of your account data.</p></section></div>;
}
