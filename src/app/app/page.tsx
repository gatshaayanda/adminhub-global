import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, Eye, ShieldCheck, Target } from "lucide-react";
import PlayerHeader from "@/components/PlayerHeader";
import PlayerNav from "@/components/PlayerNav";
import { privateWeek } from "@/data/boardsignal";

export const metadata = { title: "Ayandakopano · Player Room" };

export default function PlayerRoomPage() {
  return (
    <div id="main" className="container player-shell">
      <PlayerHeader />
      <PlayerNav />

      <section className="room-welcome">
        <div>
          <span className="live-pill">Your latest Desk is ready</span>
          <p className="kicker">Desk 001 · {privateWeek.period}</p>
          <h1>{privateWeek.headline}</h1>
          <p>{privateWeek.standfirst}</p>
          <div className="lead-actions">
            <Link href="/app/desk/week-001#replay" className="button button-lime">Open my week <ArrowRight size={17} /></Link>
            <Link href="/app/desk/week-001#weakness" className="button button-glass">Go straight to my weakness</Link>
          </div>
        </div>
        <div className="room-score" aria-label="Weekly result">
          <span>Week at a glance</span>
          <strong>{privateWeek.wins}–{privateWeek.losses}–{privateWeek.draws}</strong>
          <p>{privateWeek.games} Rapid games · {privateWeek.score} score</p>
          <div className="room-rating"><span>Rating</span><b>{privateWeek.ratingStart} → {privateWeek.ratingEnd}</b></div>
        </div>
      </section>

      <section className="room-direction" aria-labelledby="choose-direction">
        <div className="room-direction-heading">
          <p className="kicker">Choose what you need</p>
          <h2 id="choose-direction">This Room gives you direction.</h2>
          <p>You do not need to read everything in order. Start with the story or jump to the answer you came for.</p>
        </div>
        <div className="room-direction-grid">
          <Link href="/app/desk/week-001#replay" className="direction-card">
            <CalendarDays /><span>My week</span><h3>What happened?</h3><p>Replay the streak, the slide and the final day.</p><ArrowRight className="room-card-arrow" />
          </Link>
          <Link href="/app/desk/week-001#weakness" className="direction-card direction-red">
            <BarChart3 /><span>My weakness</span><h3>What cost me first?</h3><p>Three games ended before the position did.</p><ArrowRight className="room-card-arrow" />
          </Link>
          <Link href="/app/desk/week-001#guidance" className="direction-card direction-blue">
            <Target /><span>My guidance</span><h3>What do I carry?</h3><p>One short decision before resigning.</p><ArrowRight className="room-card-arrow" />
          </Link>
          <Link href="/app/desk/week-001#positions" className="direction-card">
            <Eye /><span>My evidence</span><h3>Which games prove it?</h3><p>Open G30, G42 and G43.</p><ArrowRight className="room-card-arrow" />
          </Link>
        </div>
      </section>

      <section className="room-signal" id="signal-preview">
        <div className="signal-orb"><Target size={28} /></div>
        <div>
          <p className="kicker">Blue · Your action</p>
          <h2>{privateWeek.action}</h2>
          <p>{privateWeek.blueSignal}</p>
        </div>
        <div className="privacy-chip"><ShieldCheck size={16} /> Private to your Room</div>
      </section>
    </div>
  );
}

