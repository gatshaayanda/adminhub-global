import PlayerHeader from "@/components/PlayerHeader";
import PlayerNav from "@/components/PlayerNav";
import { privateWeek } from "@/data/boardsignal";

export const metadata = { title: "Desk Episode" };

const days = [
  { day: "Wed 1", result: "4–8", tone: "negative" },
  { day: "Thu 2", result: "9–3", tone: "positive" },
  { day: "Fri 3", result: "5–4", tone: "positive" },
  { day: "Sat 4", result: "2–5", tone: "negative" },
  { day: "Sun 5", result: "1–4", tone: "negative" },
  { day: "Mon 6", result: "1–2", tone: "negative" },
  { day: "Tue 7", result: "3–3", tone: "" },
];

export default async function DeskEpisodePage({ params }: { params: Promise<{ episode: string }> }) {
  await params;
  return (
    <div id="main" className="container player-shell">
      <PlayerHeader /><PlayerNav />
      <section className="desk-hero"><div><p className="kicker">Desk 001 · {privateWeek.period}</p><h1>{privateWeek.headline}</h1></div><div className="desk-summary"><p>{privateWeek.standfirst}</p></div></section>
      <div className="stats-row">
        <div className="stat-cell"><span>Games</span><strong>{privateWeek.games}</strong></div>
        <div className="stat-cell"><span>Record</span><strong>{privateWeek.wins}–{privateWeek.losses}–{privateWeek.draws}</strong></div>
        <div className="stat-cell"><span>Rating</span><strong>{privateWeek.ratingChange}</strong></div>
        <div className="stat-cell"><span>Peak / low</span><strong>{privateWeek.peak} / {privateWeek.low}</strong></div>
      </div>
      <section className="desk-section"><p className="kicker">The Replay</p><h2>First came the proof. Then came the slide.</h2><p>The opening four losses threatened to define the episode. Instead, an eight-game winning streak turned the week sharply upward and helped produce positive results across the first three days. The second half moved in the opposite direction: results softened from 4 July through 6 July before the final day settled at 3–3.</p><div className="timeline">{days.map((item) => <div className={`day ${item.tone}`} key={item.day}><strong>{item.day}</strong><span>{item.result}</span></div>)}</div></section>
      <section className="desk-section"><p className="kicker">What changed the week</p><h2>The strongest stretch was not an accident.</h2><p>The eight-game run showed that the player could sustain positive decisions across several games. It belongs in the report because it is evidence of a usable quality—not merely a flattering result.</p></section>
      <section className="desk-section"><p className="kicker">The Blue Signal</p><h2>Slow down before the move becomes irreversible.</h2><div className="signal-box"><strong>{privateWeek.blueSignal}</strong><p>Use the scan as a short gate, not a new calculation ritual. The aim is to catch the forcing idea that already exists on the board.</p></div></section>
    </div>
  );
}
