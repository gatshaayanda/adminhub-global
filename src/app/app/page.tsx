import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import PlayerHeader from "@/components/PlayerHeader";
import PlayerNav from "@/components/PlayerNav";
import { privateWeek } from "@/data/boardsignal";

export const metadata = { title: "My Player Room" };

export default function PlayerRoomPage() {
  return (
    <div id="main" className="container player-shell">
      <PlayerHeader /><PlayerNav />
      <div className="dashboard-grid">
        <section className="desk-hero">
          <div><p className="kicker">Latest Desk · {privateWeek.period}</p><h1>{privateWeek.headline}</h1></div>
          <div className="desk-summary"><p>{privateWeek.standfirst}</p><Link href="/app/desk/week-001" className="button button-lime">Open my Desk <ArrowRight size={17} /></Link></div>
        </section>
        <aside className="side-stack">
          <div className="metric-card lime"><span>Week at a glance</span><strong>{privateWeek.games}</strong><p>{privateWeek.wins}W · {privateWeek.losses}L · {privateWeek.draws}D · {privateWeek.score} score</p></div>
          <div className="metric-card"><span>Rating movement</span><strong>{privateWeek.ratingChange}</strong><p>{privateWeek.ratingStart} → {privateWeek.ratingEnd} · peak {privateWeek.peak}</p></div>
          <div className="metric-card blue"><span><Clock3 size={14} style={{ display: "inline", marginRight: 6 }} />Next Desk window</span><strong>3 days</strong><p>Your fixed episode does not slide daily.</p></div>
        </aside>
      </div>
      <div className="desk-section">
        <p className="kicker">Your Blue Signal</p><h2>One thing to carry into the next game.</h2>
        <div className="signal-box"><strong>{privateWeek.blueSignal}</strong><p>The week repeatedly showed committed decisions arriving while forcing options were still available to inspect.</p></div>
      </div>
    </div>
  );
}
