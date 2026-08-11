import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Founding Beta Terms" };

export default function BetaTermsPage() {
  return <div id="main" className="container boardsignal-policy-page"><Link href="/boardsignal/player-room" className="desk-back"><ArrowLeft size={16} /> Back to Player Room</Link><header><ShieldCheck /><p className="kicker">BOARD SIGNAL FOUNDING BETA</p><h1>Plain-language beta terms.</h1><p>Version: founding-beta-2026-08-11</p></header><section><h2>What BoardSignal does</h2><p>BoardSignal uses available Chess.com game data to create your private weekly sports Desk, including factual performance summaries and selected position review.</p><h2>Your private and public experience</h2><p>Your full Desk, weaknesses, Signal Board, guidance, reviewed positions, recurring patterns and four-Desk progress are private. Safe positive coverage may appear publicly only according to your privacy settings.</p><h2>Recent state</h2><p>BoardSignal may store your account state and latest four active Desks. When a fifth Desk publishes, the oldest full Desk and its heavy evidence are removed after small personal records are updated.</p><h2>Founding beta access</h2><p>The beta is currently provided without payment. Features, limits and future commercial terms may change before a paid version. Founding beta access does not promise permanent free access.</p><h2>Your choice</h2><p>You may stop participating or request account deletion. Notification preferences are separate; this version prepares event hooks but sends no email or browser push.</p></section></div>;
}
