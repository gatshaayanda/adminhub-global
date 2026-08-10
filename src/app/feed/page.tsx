import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";
import { betaProof, coverageStories, leadStory } from "@/data/boardsignal";

export const metadata = { title: "BoardSignal Universe" };

export default function CoverageFeedPage() {
  const stories = [leadStory, ...coverageStories];
  return (
    <div id="main" className="interior-page">
      <header className="interior-hero feed-hero">
        <div className="container">
          <p className="kicker"><Radio size={15} /> BoardSignal Universe</p>
          <h1>The wider game, through its players.</h1>
          <p className="standfirst">Coverage drawn from {betaProof.games} real games makes the wider BoardSignal world feel alive. Positive moments appear anonymously unless a player chooses to attach their identity; private weaknesses never enter this feed.</p>
        </div>
      </header>
      <section className="container section-pad">
        <div className="coverage-grid">
          {stories.map((story, index) => (
            <article className={`coverage-card tone-${story.tone} ${story.feature || index === 0 ? "coverage-wide" : ""}`} key={story.id}>
              <div className="coverage-card-top"><p className="story-kicker">{story.eyebrow}</p><span>{story.period}</span></div>
              <h3>{story.headline}</h3>
              <p>{story.summary}</p>
              <div className="coverage-stat"><strong>{story.stat}</strong><span>{story.detail}</span></div>
              <ArrowRight className="coverage-arrow" size={19} aria-hidden="true" />
            </article>
          ))}
        </div>
        <div className="interior-actions">
          <Link href="/#find-my-desk" className="button button-lime">Find my Desk <ArrowRight size={17} /></Link>
        </div>
      </section>
    </div>
  );
}
