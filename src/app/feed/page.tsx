import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { coverageStories, leadStory } from "@/data/boardsignal";

export const metadata = { title: "Coverage Feed" };

export default function CoverageFeedPage() {
  const stories = [leadStory, ...coverageStories];
  return (
    <div id="main" className="interior-page">
      <header className="interior-hero">
        <div className="container">
          <p className="kicker">The public universe</p>
          <h1>Coverage from players who usually never make the news.</h1>
          <p className="standfirst">Positive, evidence-backed moments from completed Desks. Anonymous by default; named only when a player chooses to share.</p>
        </div>
      </header>
      <section className="container section-pad">
        <div className="coverage-grid">
          {stories.map((story, index) => (
            <article className={`coverage-card tone-${story.tone} ${index === 0 ? "coverage-wide" : ""}`} key={story.id}>
              <p className="story-kicker">{story.eyebrow}</p>
              <h3>{story.headline}</h3>
              <p>{story.summary}</p>
              <div className="coverage-stat"><strong>{story.stat}</strong><span>{story.detail}</span></div>
            </article>
          ))}
        </div>
        <div className="interior-actions">
          <Link href="/join" className="button button-lime">Put my week on the desk <ArrowRight size={17} /></Link>
        </div>
      </section>
    </div>
  );
}
