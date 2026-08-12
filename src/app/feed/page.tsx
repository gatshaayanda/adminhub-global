import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";
import { betaProof, coverageStories, leadStory } from "@/data/boardsignal";
import { founderCoverageStory, foundingUniverseGroups } from "@/data/universeField";
import { UniverseCategoryCards } from "@/components/UniverseRecognition";
import { loadActiveUniverseState } from "@/lib/boardsignal/server/universePulse";

export const metadata = { title: "BoardSignal Universe" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CoverageFeedPage() {
  const stories = [leadStory, founderCoverageStory, ...coverageStories];
  let groups = foundingUniverseGroups;
  let whatsHot: Awaited<ReturnType<typeof loadActiveUniverseState>>["whatsHot"] = [];
  let recentEvents: Awaited<ReturnType<typeof loadActiveUniverseState>>["recentEvents"] = [];
  try {
    const state = await loadActiveUniverseState();
    if (state.groups.some((group) => group.boards.length)) groups = state.groups;
    whatsHot = state.whatsHot;
    recentEvents = state.recentEvents.slice(0, 10);
  } catch {
    // Public Universe retains the approved founding field if live persistence is temporarily unavailable.
  }
  const nowEvents = (whatsHot.length ? whatsHot : recentEvents).slice(0, 8);
  return (
    <div id="main" className="interior-page">
      <header className="interior-hero feed-hero">
        <div className="container">
          <p className="kicker"><Radio size={15} /> BoardSignal Universe</p>
          <h1>The wider game, through its players.</h1>
          <p className="standfirst">A moving sports field built from eligible completed BoardSignal Desks. LIVE performances progressively replace the founding SEED field by category and pool; private Signal Board evidence never enters this public surface.</p>
        </div>
      </header>

      {nowEvents.length ? <section className="container section-pad universe-now-section">
        <div className="universe-intro"><p className="kicker">BOARD SIGNAL — NOW</p><h2>What matters right now.</h2><p>Recent public-safe changes ranked deterministically by recency, magnitude, field impact and novelty.</p></div>
        <div className="universe-now-grid">{nowEvents.map((event) => <article key={event.eventId}><div className="pulse-event-meta"><span>{event.eventType.replaceAll("_", " ")}</span><b>OFFICIAL</b></div><h3>{event.headline}</h3><p>{event.supportingFact}</p><small>{event.canonicalUsername} · {new Date(event.publishedAt).toLocaleDateString()}</small></article>)}</div>
      </section> : null}

      <section className="container section-pad">
        <div className="universe-intro">
          <p className="kicker">Active Board</p>
          <h2>Achievement titles with evidence behind them.</h2>
          <p>Each category/pool remains a Founding Beta field until six comparable active LIVE players exist there. It then becomes the BoardSignal field. Rapid, Blitz and Bullet never mix.</p>
        </div>
        <UniverseCategoryCards groups={groups} />
      </section>
      <section className="container section-pad universe-coverage-section">
        <div className="universe-intro"><p className="kicker">Coverage</p><h2>The positive stories behind the field.</h2></div>
        <div className="coverage-grid">
          {stories.map((story, index) => (
            <article className={`coverage-card tone-${story.tone} ${story.feature || index === 0 ? "coverage-wide" : ""}`} id={`coverage-${story.id}`} key={story.id}>
              <div className="coverage-card-top"><p className="story-kicker">{story.eyebrow}</p><span>{story.period}</span></div>
              <h3>{story.headline}</h3><p>{story.summary}</p><div className="coverage-stat"><strong>{story.stat}</strong><span>{story.detail}</span></div><ArrowRight className="coverage-arrow" size={19} aria-hidden="true" />
            </article>
          ))}
        </div>
        <div className="interior-actions"><Link href="/#get-my-boardsignal" className="button button-lime">Get My BoardSignal <ArrowRight size={17} /></Link></div>
      </section>
    </div>
  );
}
