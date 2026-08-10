import Link from "next/link";
import PlayerHeader from "@/components/PlayerHeader";
import PlayerNav from "@/components/PlayerNav";

export const metadata = { title: "Desk Archive" };

export default function ArchivePage() {
  return <div id="main" className="container player-shell"><PlayerHeader /><PlayerNav /><section className="desk-section"><p className="kicker">Desk archive</p><h2>Your chess life, one episode at a time.</h2><p>The base experience keeps the latest completed Desk clear and accessible. Archive depth and long-term continuity remain deliberate product choices, not accidental storage.</p><div className="archive-list"><div className="archive-row"><strong>Four opening losses. Eight straight wins. Then the week turned.</strong><span>1–7 Jul 2026</span><span>55 games</span><Link href="/app/desk/week-001" className="button button-outline">Open</Link></div><div className="archive-row"><strong>Next episode</strong><span>Awaiting a complete period</span><span>—</span><span className="state-pill processing">Scheduled</span></div></div></section></div>;
}
