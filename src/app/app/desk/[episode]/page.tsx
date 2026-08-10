import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Flag, ShieldCheck, Target } from "lucide-react";
import PlayerHeader from "@/components/PlayerHeader";
import PlayerNav from "@/components/PlayerNav";
import { privateWeek } from "@/data/boardsignal";

export const metadata = { title: "Desk 001 · 1–7 July" };

const days = [
  { day: "Wed 1", result: "4–8", tone: "negative" },
  { day: "Thu 2", result: "9–3", tone: "positive" },
  { day: "Fri 3", result: "5–4", tone: "positive" },
  { day: "Sat 4", result: "2–5", tone: "negative" },
  { day: "Sun 5", result: "1–4", tone: "negative" },
  { day: "Mon 6", result: "1–2", tone: "negative" },
  { day: "Tue 7", result: "3–3", tone: "neutral" },
];

export default async function DeskEpisodePage({ params }: { params: Promise<{ episode: string }> }) {
  await params;
  return (
    <div id="main" className="container player-shell desk-reader">
      <PlayerHeader />
      <PlayerNav />

      <Link href="/app" className="desk-back"><ArrowLeft size={16} /> Back to My Room</Link>

      <header className="desk-cover">
        <div className="desk-cover-copy">
          <span className="live-pill">Desk 001 · Complete</span>
          <p className="kicker">{privateWeek.period} · Chess.com Rapid</p>
          <h1>{privateWeek.headline}</h1>
          <p>{privateWeek.standfirst}</p>
        </div>
        <div className="desk-cover-score">
          <span>Weekly record</span>
          <strong>{privateWeek.wins}–{privateWeek.losses}–{privateWeek.draws}</strong>
          <p>{privateWeek.games} games · {privateWeek.score} score</p>
        </div>
      </header>

      <nav className="desk-chapter-nav" aria-label="Desk chapters">
        <a href="#replay">Replay</a>
        <a href="#turning-point">Turning point</a>
        <a href="#signals">Signal Board</a>
        <a href="#positions">Positions</a>
        <a href="#pocket-card">Pocket card</a>
      </nav>

      <section className="stats-row" aria-label="Desk statistics">
        <div className="stat-cell"><span>Games</span><strong>{privateWeek.games}</strong></div>
        <div className="stat-cell"><span>Rating</span><strong>{privateWeek.ratingChange}</strong><small>{privateWeek.ratingStart} → {privateWeek.ratingEnd}</small></div>
        <div className="stat-cell"><span>Peak</span><strong>{privateWeek.peak}</strong></div>
        <div className="stat-cell"><span>Low</span><strong>{privateWeek.low}</strong></div>
      </section>

      <section className="desk-story" id="replay">
        <div className="chapter-label"><span>01</span><p>The Replay</p></div>
        <div className="chapter-content">
          <p className="kicker">What kind of week was it?</p>
          <h2>First came the proof. Then came the slide.</h2>
          <p className="chapter-deck">The opening four losses threatened to define the episode. Instead, an eight-game winning streak turned the week sharply upward and helped produce positive results across the first three days. From 4–6 July, the direction changed again before the final day settled at 3–3.</p>
          <div className="timeline">
            {days.map((item) => <div className={`day ${item.tone}`} key={item.day}><strong>{item.day}</strong><span>{item.result}</span></div>)}
          </div>
        </div>
      </section>

      <section className="desk-story" id="turning-point">
        <div className="chapter-label"><span>02</span><p>Turning point</p></div>
        <div className="chapter-content">
          <p className="kicker">The moment that changed the episode</p>
          <h2>The eight-game run proved the opening was not the whole story.</h2>
          <p className="chapter-deck">G07–G14 changed the shape of the week. It belongs here because it is evidence of a usable quality: positive decisions were sustained across several games, not produced by one isolated result.</p>
          <div className="turning-stat"><strong>8</strong><div><span>straight wins</span><p>G07–G14 · the longest run of the episode</p></div></div>
        </div>
      </section>

      <section className="desk-story" id="signals">
        <div className="chapter-label"><span>03</span><p>Signal Board</p></div>
        <div className="chapter-content">
          <p className="kicker">What to preserve, monitor and fix</p>
          <h2>The report gets smaller at the point of action.</h2>
          <div className="signal-grid">
            <article className="signal-card signal-green"><CheckCircle2 /><span>Green · Preserve</span><h3>Sustained positive play.</h3><p>The eight-game run showed you can hold a good decision rhythm across multiple games.</p></article>
            <article className="signal-card signal-amber"><Eye /><span>Amber · Monitor</span><h3>The second-half direction.</h3><p>The results softened from 4–6 July. Future weeks can show whether that pattern repeats.</p></article>
            <article className="signal-card signal-red"><Flag /><span>Red · Fix first</span><h3>Committed moves before the forcing scan.</h3><p>The useful correction is a short tactical gate before the move becomes irreversible.</p></article>
          </div>
        </div>
      </section>

      <section className="desk-story" id="positions">
        <div className="chapter-label"><span>04</span><p>Your positions</p></div>
        <div className="chapter-content">
          <p className="kicker">Return to the evidence</p>
          <h2>The advice should always lead back to your own games.</h2>
          <div className="position-list">
            <article><span>Winning run</span><h3>G08 · Pause before the committed move</h3><p>Replay the moment with one question: what checks, captures or forcing threats exist before I choose?</p><button className="button button-outline" type="button" disabled>Game link in connected Desk</button></article>
            <article><span>Second-half slide</span><h3>Selected decision point</h3><p>The final product opens the exact Chess.com game and board position without asking the player to upload a PGN.</p><button className="button button-outline" type="button" disabled>Position viewer in next layer</button></article>
          </div>
        </div>
      </section>

      <section className="pocket-card" id="pocket-card">
        <div className="signal-orb"><Target size={30} /></div>
        <div>
          <p className="kicker">Blue · Carry with you</p>
          <h2>{privateWeek.blueSignal}</h2>
          <p>Short enough to use while playing. Specific enough to come from this episode.</p>
        </div>
        <div className="pocket-actions">
          <span><ShieldCheck size={16} /> Private guidance</span>
          <Link href="/app" className="button button-lime">Finish Desk <ArrowRight size={17} /></Link>
        </div>
      </section>
    </div>
  );
}
