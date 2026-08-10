import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Eye, ShieldCheck, Target } from "lucide-react";
import PlayerHeader from "@/components/PlayerHeader";
import PlayerNav from "@/components/PlayerNav";
import { privateWeek } from "@/data/boardsignal";

export const metadata = { title: "My Player Room" };

export default function PlayerRoomPage() {
  return (
    <div id="main" className="container player-shell">
      <PlayerHeader />
      <PlayerNav />

      <section className="room-welcome">
        <div>
          <span className="live-pill">Desk 001 ready</span>
          <p className="kicker">{privateWeek.period} · 55 Rapid games</p>
          <h1>{privateWeek.headline}</h1>
          <p>{privateWeek.standfirst}</p>
          <div className="lead-actions">
            <Link href="/app/desk/week-001" className="button button-lime">Start this Desk <ArrowRight size={17} /></Link>
            <span className="read-time"><Clock3 size={15} /> About 6 minutes</span>
          </div>
        </div>
        <div className="room-score" aria-label="Weekly result">
          <span>Week at a glance</span>
          <strong>{privateWeek.wins}–{privateWeek.losses}–{privateWeek.draws}</strong>
          <p>{privateWeek.score} score · {privateWeek.ratingStart} → {privateWeek.ratingEnd}</p>
        </div>
      </section>

      <section className="room-grid" aria-label="Your latest Desk sections">
        <Link href="/app/desk/week-001#replay" className="room-card room-card-feature">
          <BookOpen />
          <div><span>01 · Replay</span><h2>See how the week actually unfolded.</h2><p>The streak, the slide and the days that changed the direction.</p></div>
          <ArrowRight className="room-card-arrow" />
        </Link>
        <Link href="/app/desk/week-001#signal" className="room-card room-card-blue">
          <Target />
          <div><span>02 · Signal Board</span><h3>One strength. One watch. One fix.</h3></div>
          <ArrowRight className="room-card-arrow" />
        </Link>
        <Link href="/app/desk/week-001#positions" className="room-card">
          <Eye />
          <div><span>03 · Your positions</span><h3>Return to the exact moments.</h3></div>
          <ArrowRight className="room-card-arrow" />
        </Link>
      </section>

      <section className="room-signal" id="signal-preview">
        <div className="signal-orb"><Target size={28} /></div>
        <div>
          <p className="kicker">Your Blue Signal</p>
          <h2>{privateWeek.blueSignal}</h2>
          <p>A short decision cue from this episode—not homework that the next Desk will grade.</p>
        </div>
        <div className="privacy-chip"><ShieldCheck size={16} /> Private to your Room</div>
      </section>
    </div>
  );
}
