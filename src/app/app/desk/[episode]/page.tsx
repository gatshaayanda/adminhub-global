import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Eye,
  Flag,
  ShieldCheck,
  Target,
} from "lucide-react";
import PlayerHeader from "@/components/PlayerHeader";
import PlayerNav from "@/components/PlayerNav";
import { ayandaPositionMoments, privateWeek } from "@/data/boardsignal";

export const metadata = { title: "Ayandakopano · Desk 001" };

const days = [
  { day: "Wed 1", result: "5W · 5L", tone: "neutral" },
  { day: "Thu 2", result: "5W · 4L", tone: "positive" },
  { day: "Fri 3", result: "4W · 1D · 3L", tone: "positive" },
  { day: "Sat 4", result: "1W · 3L", tone: "negative" },
  { day: "Sun 5", result: "3W · 5L", tone: "negative" },
  { day: "Mon 6", result: "4W · 6L", tone: "negative" },
  { day: "Tue 7", result: "3W · 3L", tone: "neutral" },
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
          <span className="live-pill">Ayandakopano · Desk 001</span>
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
        <a href="#replay">My week</a>
        <a href="#turning-point">Turning point</a>
        <a href="#strength">Strength</a>
        <a href="#weakness">Weakness</a>
        <a href="#guidance">Guidance</a>
        <a href="#positions">Evidence</a>
      </nav>

      <section className="stats-row" aria-label="Desk statistics">
        <div className="stat-cell"><span>Games</span><strong>{privateWeek.games}</strong></div>
        <div className="stat-cell"><span>Rating</span><strong>{privateWeek.ratingChange}</strong><small>{privateWeek.ratingStart} → {privateWeek.ratingEnd}</small></div>
        <div className="stat-cell"><span>Peak</span><strong>{privateWeek.peak}</strong></div>
        <div className="stat-cell"><span>Low</span><strong>{privateWeek.low}</strong></div>
      </section>

      <section className="desk-story" id="replay">
        <div className="chapter-label"><span>01</span><p>My week</p></div>
        <div className="chapter-content">
          <p className="kicker">What kind of week was it?</p>
          <h2>A recovery, a peak, then a difficult second half.</h2>
          <p className="chapter-deck">Four losses opened the episode. G07–G14 then produced eight straight wins and helped lift the rating to 878. The direction weakened across 4–6 July before the final day ended evenly at 3–3.</p>
          <div className="timeline">
            {days.map((item) => <div className={`day ${item.tone}`} key={item.day}><strong>{item.day}</strong><span>{item.result}</span></div>)}
          </div>
        </div>
      </section>

      <section className="desk-story" id="turning-point">
        <div className="chapter-label"><span>02</span><p>Turning point</p></div>
        <div className="chapter-content">
          <p className="kicker">The run that changed the episode</p>
          <h2>Eight straight wins refused to let the opening losses define the week.</h2>
          <p className="chapter-deck">G07–G14 were sustained evidence. The useful quality was not one lucky finish; it was a positive decision rhythm held across eight consecutive games.</p>
          <div className="turning-stat"><strong>8</strong><div><span>straight wins</span><p>G07–G14 · longest run of the episode</p></div></div>
        </div>
      </section>

      <section className="desk-story signal-story signal-story-green" id="strength">
        <div className="chapter-label"><span>03</span><p>Strength</p></div>
        <div className="chapter-content">
          <p className="kicker">Green · Preserve</p>
          <h2>{privateWeek.greenSignal}</h2>
          <p className="chapter-deck">The goal is not to recreate a streak on command. It is to remember that the week contained a sustained sequence of successful decisions even after a difficult start.</p>
        </div>
      </section>

      <section className="desk-story signal-story signal-story-red" id="weakness">
        <div className="chapter-label"><span>04</span><p>Weakness</p></div>
        <div className="chapter-content">
          <p className="kicker">Red · Fix first</p>
          <h2>Three games ended before the position did.</h2>
          <p className="chapter-deck">G30, G42 and G43 were resignation losses, but the reviewed positions were still playable at roughly −0.85, −1.06 and −0.99. Together they represented about 25 observed rating points. The first correction is therefore not a new opening—it is staying in the game.</p>
          <div className="weakness-summary">
            <div><Flag /><span>Pattern</span><strong>Playable resignation</strong></div>
            <div><BarChartValue value="3" label="evidence games" /></div>
            <div><BarChartValue value="≈25" label="rating points observed" /></div>
          </div>
        </div>
      </section>

      <section className="desk-story signal-story signal-story-blue" id="guidance">
        <div className="chapter-label"><span>05</span><p>Guidance</p></div>
        <div className="chapter-content">
          <p className="kicker">Blue · Carry with you</p>
          <h2>{privateWeek.action}</h2>
          <div className="guidance-sequence" aria-label="Decision sequence before resigning">
            <span>Legal reply?</span><ArrowRight /><span>Check</span><ArrowRight /><span>Capture</span><ArrowRight /><span>Forcing threat</span><ArrowRight /><strong>Play on</strong>
          </div>
          <p className="chapter-deck">This is advice from this episode, not a mission BoardSignal must track or grade next week.</p>
        </div>
      </section>

      <section className="desk-story" id="positions">
        <div className="chapter-label"><span>06</span><p>Evidence</p></div>
        <div className="chapter-content">
          <p className="kicker">Open the exact games</p>
          <h2>The weakness is linked back to your own chess.</h2>
          <p className="chapter-deck">These are the three resignation games supporting the Red Signal. Evaluations are approximate at the point the game ended.</p>
          <div className="evidence-game-list">
            {ayandaPositionMoments.map((moment) => (
              <article key={moment.game}>
                <div className="evidence-game-id"><span>{moment.game}</span><strong>{moment.evaluation}</strong></div>
                <div><p>{moment.date} · {moment.color}</p><h3>vs {moment.opponent}</h3><p>Resigned in a position still assessed as playable.</p></div>
                <a href={moment.link} target="_blank" rel="noreferrer" className="button button-outline">Open on Chess.com <ExternalLink size={15} /></a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pocket-card">
        <div className="signal-orb"><Target size={30} /></div>
        <div><p className="kicker">Your pocket card</p><h2>{privateWeek.blueSignal}</h2><p>Specific to this episode. Short enough to use while playing.</p></div>
        <div className="pocket-actions"><span><ShieldCheck size={16} /> Private guidance</span><Link href="/app" className="button button-lime">Finish Desk <ArrowRight size={17} /></Link></div>
      </section>
    </div>
  );
}

function BarChartValue({ value, label }: { value: string; label: string }) {
  return <><Eye /><span>{label}</span><strong>{value}</strong></>;
}

