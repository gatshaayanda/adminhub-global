import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";
import { coverageStories, leadStory } from "@/data/boardsignal";
import { founderCoverageStory } from "@/data/universeField";
import { UniverseCategoryCards } from "@/components/UniverseRecognition";
import { loadActiveUniverseState } from "@/lib/boardsignal/server/universePulse";
import { boardSignalPresentationLabel } from "@/lib/boardsignal/presentationLanguage";
import type { PublicUniverseEvent } from "@/lib/boardsignal/pulse";
import type { UniverseCategoryGroup } from "@/lib/boardsignal/universe";

export const metadata = { title: "BoardSignal Universe" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CoverageFeedPage() {
  const archiveStories = [leadStory, founderCoverageStory, ...coverageStories];
  let groups: UniverseCategoryGroup[] = [];
  let whatsHot: PublicUniverseEvent[] = [];
  let recentEvents: PublicUniverseEvent[] = [];
  let officialPlayerCount = 0;
  let fieldUnavailable = false;
  try {
    const state = await loadActiveUniverseState();
    groups = state.groups;
    whatsHot = state.whatsHot;
    recentEvents = state.recentEvents.slice(0, 10);
    officialPlayerCount = state.officialPlayerCount;
  } catch {
    fieldUnavailable = true;
  }

  const justIn = recentEvents.slice(0, 6);
  const justInIds = new Set(justIn.map((event) => event.eventId));
  const hot = whatsHot.filter((event) => !justInIds.has(event.eventId)).slice(0, 6);
  const hasBoards = groups.some((group) => group.boards.length);

  return (
    <div id="main" className="interior-page g4-public-universe">
      <header className="interior-hero feed-hero g4-public-field-hero">
        <div className="container">
          <p className="kicker"><Radio size={15} /> BoardSignal Universe</p>
          <h1>LIVE FIELD</h1>
          <p className="standfirst">Official standings use each player&apos;s latest eligible completed Review. Current-week comparisons stay private and provisional until a Review closes.</p>
          {!fieldUnavailable ? <p className="g4-field-scale">{officialPlayerCount} player{officialPlayerCount === 1 ? "" : "s"} represented in the current official field.</p> : null}
        </div>
      </header>

      {fieldUnavailable ? <section className="container section-pad g4-universe-unavailable" role="status"><p className="kicker">LIVE FIELD</p><h2>CURRENT FIELD TEMPORARILY UNAVAILABLE</h2><p>BoardSignal is not substituting the founding archive as if it were current standings. Historical coverage remains available below.</p></section> : null}

      {!fieldUnavailable && justIn.length ? <section className="container section-pad universe-now-section g4-just-in">
        <div className="universe-intro"><p className="kicker">JUST IN</p><h2>Recent official field activity.</h2><p>Only genuine public-safe recent activity appears here. Historical imports never enter this stream.</p></div>
        <div className="universe-now-grid g4-event-grid">{justIn.map((event) => <article key={event.eventId}><div className="pulse-event-meta"><span>{boardSignalPresentationLabel(event.eventType)}</span><b>OFFICIAL</b></div><h3>{event.headline}</h3><p>{event.supportingFact}</p><small>{event.canonicalUsername} · {new Date(event.publishedAt).toLocaleDateString()}</small></article>)}</div>
      </section> : null}

      {!fieldUnavailable ? <section className="container section-pad g4-public-official-boards">
        <div className="universe-intro">
          <p className="kicker">FROM THE FIELD · OFFICIAL BOARDS</p>
          <h2>Strong completed Reviews, compared like for like.</h2>
          <p>Rapid, Blitz and Bullet remain separate. Historical Reviews can establish official position without becoming fake fresh activity.</p>
        </div>
        {hasBoards ? <UniverseCategoryCards groups={groups} /> : <div className="universe-empty"><Radio size={18}/><p>The current official boards are still forming.</p></div>}
      </section> : null}

      {!fieldUnavailable && hot.length ? <section className="container section-pad g4-whats-hot">
        <div className="universe-intro"><p className="kicker">WHAT&apos;S HOT</p><h2>Recent public-safe moments with the strongest field signal.</h2></div>
        <div className="universe-now-grid g4-event-grid">{hot.map((event) => <article key={event.eventId}><div className="pulse-event-meta"><span>{boardSignalPresentationLabel(event.eventType)}</span><b>OFFICIAL</b></div><h3>{event.headline}</h3><p>{event.supportingFact}</p><small>{event.canonicalUsername} · {new Date(event.publishedAt).toLocaleDateString()}</small></article>)}</div>
      </section> : null}

      <section className="container section-pad universe-coverage-section g4-universe-archive" id="archive">
        <div className="universe-intro"><p className="kicker">ARCHIVE · FOUNDING COVERAGE</p><h2>Earlier BoardSignal stories.</h2><p>These are preserved historical stories. They are not substituted for today&apos;s official field.</p></div>
        <div className="coverage-grid">
          {archiveStories.map((story, index) => (
            <article className={`coverage-card tone-${story.tone} ${story.feature || index === 0 ? "coverage-wide" : ""}`} id={`coverage-${story.id}`} key={story.id}>
              <div className="coverage-card-top"><p className="story-kicker">{story.eyebrow}</p><span>{story.period}</span></div>
              <h3>{story.headline}</h3><p>{story.summary}</p><div className="coverage-stat"><strong>{story.stat}</strong><span>{story.detail}</span></div><ArrowRight className="coverage-arrow" size={19} aria-hidden="true" />
            </article>
          ))}
        </div>
        <div className="interior-actions"><Link href="/#get-my-boardsignal" className="button button-lime">Show me my review <ArrowRight size={17} /></Link></div>
      </section>
    </div>
  );
}
