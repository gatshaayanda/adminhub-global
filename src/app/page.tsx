import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  LockKeyhole,
  Radio,
  Sparkles,
} from "lucide-react";
import { betaProof, coverageStories, leadStory } from "@/data/boardsignal";

const frontPageStories = coverageStories.slice(0, 6);

export default function UniversePage() {
  return (
    <div id="main" className="universe-page">
      <section className="universe-hero">
        <div className="container universe-hero-grid">
          <article className="universe-lead motion-enter">
            <div className="live-pill"><Radio size={14} /> Beta season · 14 real Desks</div>
            <p className="story-kicker">{leadStory.eyebrow} · {leadStory.period}</p>
            <h1>{leadStory.headline}</h1>
            <p className="hero-deck">{leadStory.summary}</p>
            <div className="lead-actions">
              <Link href="/player/player-001" className="button button-lime">
                Explore the lead story <ArrowRight size={17} />
              </Link>
              <Link href="/join" className="text-link">What would my week say?</Link>
            </div>
          </article>

          <aside className="hero-story-rail motion-enter motion-delay-1" aria-label="This week in BoardSignal">
            <div className="hero-score-card">
              <span>Lead number</span>
              <strong>{leadStory.stat}</strong>
              <p>{leadStory.detail}</p>
            </div>
            {frontPageStories.slice(0, 2).map((story) => (
              <Link href="/feed" className="rail-story" key={story.id}>
                <span>{story.eyebrow}</span>
                <strong>{story.headline}</strong>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            ))}
            <p className="privacy-note"><LockKeyhole size={15} /> Real evidence. Public stories stay anonymous unless the player approves their identity.</p>
          </aside>
        </div>
      </section>

      <section className="signal-strip" aria-label="BoardSignal beta proof">
        <div className="container signal-strip-inner">
          <div><strong>{betaProof.desks}</strong><span>real beta Desks</span></div>
          <div><strong>{betaProof.games}</strong><span>games represented</span></div>
          <div><strong>{betaProof.smallestWeek}–{betaProof.largestWeek}</strong><span>games in one episode</span></div>
          <div><strong>7 days</strong><span>one fixed chapter</span></div>
        </div>
      </section>

      <section className="container section-pad coverage-section">
        <div className="section-heading split-heading">
          <div>
            <p className="kicker">Across the beta universe</p>
            <h2>Fourteen weeks. Fourteen different stories.</h2>
            <p>The same product has to make sense of a four-game sample, a 285-game sprint, three rating pools, an inactive account and everything between.</p>
          </div>
          <Link href="/feed" className="button button-outline">See all 14 stories <ArrowRight size={17} /></Link>
        </div>

        <div className="coverage-grid">
          {frontPageStories.map((story, index) => (
            <Link
              href="/feed"
              className={`coverage-card tone-${story.tone} ${story.feature || index === 0 ? "coverage-wide" : ""}`}
              key={story.id}
              style={{ "--story-index": index } as CSSProperties}
            >
              <div className="coverage-card-top">
                <p className="story-kicker">{story.eyebrow}</p>
                <span>{story.period}</span>
              </div>
              <h3>{story.headline}</h3>
              <p>{story.summary}</p>
              <div className="coverage-stat"><strong>{story.stat}</strong><span>{story.detail}</span></div>
              <ArrowRight className="coverage-arrow" size={19} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="experience-band">
        <div className="container experience-grid">
          <div className="experience-copy">
            <p className="kicker">From games to a living Desk</p>
            <h2>This is web-app coverage—not a PDF pasted onto a screen.</h2>
            <p>A player lands on the week’s story, moves through the Replay, opens the exact game moments and carries one useful signal back to the board. The experience reveals detail when it is needed instead of presenting eight report pages at once.</p>
            <Link href="/app" className="button button-lime">Enter the seeded Player Room <ArrowRight size={17} /></Link>
          </div>
          <div className="experience-flow" aria-label="BoardSignal experience flow">
            <article><span>01</span><CalendarDays /><div><strong>Your week</strong><p>One fixed, completed seven-day episode.</p></div></article>
            <article><span>02</span><BarChart3 /><div><strong>The Replay</strong><p>The shape, score, sessions and turning points.</p></div></article>
            <article><span>03</span><Sparkles /><div><strong>The Signal</strong><p>What to preserve, monitor and fix first.</p></div></article>
          </div>
        </div>
      </section>

      <section className="container section-pad privacy-callout">
        <div>
          <p className="kicker"><LockKeyhole size={15} /> Public highlight. Private weakness.</p>
          <h2>The Universe attracts attention. The Player Room earns trust.</h2>
        </div>
        <p>Positive coverage can travel. Red weaknesses, Amber concerns, Blue guidance and personal reflections stay inside the player’s Desk unless the player deliberately chooses otherwise.</p>
      </section>

      <section className="container final-cta">
        <div>
          <p className="kicker">First Desk free</p>
          <h2>Your games already contain the story.</h2>
          <p>One Chess.com username. No routine PGN upload.</p>
        </div>
        <Link href="/join" className="button button-lime">Get my first Desk <ArrowRight size={18} /></Link>
      </section>
    </div>
  );
}
