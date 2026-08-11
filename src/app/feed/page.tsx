import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";
import { betaProof, coverageStories, leadStory } from "@/data/boardsignal";
import { founderCoverageStory, foundingUniverseGroups } from "@/data/universeField";
import { UniverseCategoryCards } from "@/components/UniverseRecognition";

export const metadata = { title: "BoardSignal Universe" };

export default function CoverageFeedPage() {
  const stories = [leadStory, founderCoverageStory, ...coverageStories];
  return (
    <div id="main" className="interior-page">
      <header className="interior-hero feed-hero">
        <div className="container">
          <p className="kicker"><Radio size={15} /> BoardSignal Universe</p>
          <h1>The wider game, through its players.</h1>
          <p className="standfirst">Coverage drawn from {betaProof.games} real beta games makes the wider BoardSignal world feel alive. Recognition is limited to positive, approved facts; private Signal Board evidence never enters this feed.</p>
        </div>
      </header>
      <section className="container section-pad">
        <div className="universe-intro">
          <p className="kicker">Founding beta field</p>
          <h2>Achievement titles with evidence behind them.</h2>
          <p>These are pool-safe comparisons based on the approved BoardSignal Desks currently represented. They are not a real-time global leaderboard, and no bottom rankings are published.</p>
        </div>
        <UniverseCategoryCards groups={foundingUniverseGroups} />
      </section>
      <section className="container section-pad universe-coverage-section">
        <div className="universe-intro">
          <p className="kicker">Coverage</p>
          <h2>The positive stories behind the field.</h2>
        </div>
        <div className="coverage-grid">
          {stories.map((story, index) => (
            <article className={`coverage-card tone-${story.tone} ${story.feature || index === 0 ? "coverage-wide" : ""}`} id={`coverage-${story.id}`} key={story.id}>
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
