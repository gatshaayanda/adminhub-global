import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, LockKeyhole, Radio, Sparkles } from "lucide-react";
import { coverageStories, leadStory } from "@/data/boardsignal";

export default function UniversePage() {
  return (
    <div id="main" className="universe-page">
      <section className="edition-strip">
        <div className="container edition-inner">
          <span>Monday, 10 August 2026</span>
          <strong>BOARD SIGNAL UNIVERSE</strong>
          <span>Edition 001 · Beta season</span>
        </div>
      </section>

      <section className="container lead-grid section-pad">
        <article className="lead-story">
          <div className="story-meta">
            <span className="story-kicker"><Radio size={14} /> {leadStory.eyebrow}</span>
            <span>7-day coverage</span>
          </div>
          <h1>{leadStory.headline}</h1>
          <p className="standfirst">{leadStory.summary}</p>
          <div className="lead-actions">
            <Link href="/player/player-001" className="button button-lime">
              Read the coverage <ArrowRight size={17} />
            </Link>
            <Link href="/join" className="text-link">What would my games say?</Link>
          </div>
        </article>

        <aside className="scoreboard-card lime-card">
          <span className="scoreboard-label">Moment of the week</span>
          <strong className="scoreboard-stat">{leadStory.stat}</strong>
          <span className="scoreboard-detail">{leadStory.detail}</span>
          <div className="mini-board" aria-hidden="true">
            {Array.from({ length: 16 }).map((_, index) => <span key={index} />)}
          </div>
          <p>Positive moments may appear anonymously. Names and game links only appear with player approval.</p>
        </aside>
      </section>

      <section className="ink-band">
        <div className="container proof-grid">
          <div><strong>13</strong><span>completed beta Desks</span></div>
          <div><strong>7 days</strong><span>one fixed episode</span></div>
          <div><strong>1 username</strong><span>no routine PGN upload</span></div>
          <div><strong>Private</strong><span>weaknesses stay in your Room</span></div>
        </div>
      </section>

      <section className="container section-pad">
        <div className="section-heading split-heading">
          <div>
            <p className="kicker">Latest moments</p>
            <h2>Ordinary games. Real coverage.</h2>
          </div>
          <Link href="/feed" className="button button-outline">Open the coverage feed <ArrowRight size={17} /></Link>
        </div>

        <div className="coverage-grid">
          {coverageStories.map((story, index) => (
            <article className={`coverage-card tone-${story.tone} ${index === 0 ? "coverage-wide" : ""}`} key={story.id}>
              <p className="story-kicker">{story.eyebrow}</p>
              <h3>{story.headline}</h3>
              <p>{story.summary}</p>
              <div className="coverage-stat"><strong>{story.stat}</strong><span>{story.detail}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section className="paper-band">
        <div className="container section-pad">
          <div className="section-heading centered-heading">
            <p className="kicker">From username to newsroom</p>
            <h2>A sports desk built around your actual week.</h2>
            <p>BoardSignal retrieves the public games, closes one exact seven-day period and turns the evidence into an episode you can understand.</p>
          </div>

          <div className="steps-grid">
            <article><span>01</span><CalendarDays /><h3>Connect your username</h3><p>Confirm the right Chess.com account and your timezone. No login to Chess.com required.</p></article>
            <article><span>02</span><BarChart3 /><h3>We build the Desk</h3><p>Deterministic statistics, legal reconstruction and chess review shape the factual episode.</p></article>
            <article><span>03</span><Sparkles /><h3>You get the signal</h3><p>See the story of the week, the strength to preserve and the first thing worth fixing.</p></article>
          </div>
        </div>
      </section>

      <section className="container section-pad privacy-callout">
        <div>
          <p className="kicker"><LockKeyhole size={15} /> Public highlight. Private weakness.</p>
          <h2>Your Player Room is the product. The Universe is the proof.</h2>
        </div>
        <p>Your full Desk belongs to you. BoardSignal can surface one anonymous positive moment; you decide whether your identity or game link becomes public.</p>
      </section>

      <section className="container final-cta">
        <div>
          <p className="kicker">First Desk free</p>
          <h2>See your last seven days as a story—not a game list.</h2>
        </div>
        <Link href="/join" className="button button-lime">Get my first Desk <ArrowRight size={18} /></Link>
      </section>
    </div>
  );
}
