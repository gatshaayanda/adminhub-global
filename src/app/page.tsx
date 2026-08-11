import Link from "next/link";
import {
  LockKeyhole,
} from "lucide-react";
import UsernameDeskForm from "@/components/UsernameDeskForm";
import { betaProof, coverageStories } from "@/data/boardsignal";

const secondaryStories = coverageStories.slice(0, 3);
const deskPreview = coverageStories[0];

export default function HomePage() {
  return (
    <div id="main" className="personal-home">
      <section className="personal-hero">
        <div className="container personal-hero-grid">
          <div className="personal-hero-copy motion-enter">
            <p className="kicker">Your personal chess sports desk</p>
            <h1>Your chess week, covered.</h1>
            <p className="hero-deck">The story, the signals and the next move—drawn from your own games.</p>
            <div id="find-my-desk" className="hero-username-card">
              <UsernameDeskForm />
            </div>
          </div>

          <aside className="player-preview pipeline-preview motion-enter motion-delay-1" aria-label="Featured BoardSignal coverage">
            <div className="pipeline-preview-top"><span>This week on BoardSignal</span><strong>{deskPreview.headline}</strong></div>
            <p>{deskPreview.summary}</p>
            <div className="coverage-stat"><strong>{deskPreview.stat}</strong><span>{deskPreview.detail}</span></div>
          </aside>
        </div>
      </section>

      <section className="container secondary-coverage">
        <div className="secondary-heading">
          <div>
            <p className="kicker">BoardSignal Universe</p>
            <h2>The wider game, through its players.</h2>
          </div>
          <p>{betaProof.desks} player weeks. {betaProof.games} games covered.</p>
        </div>
        <div className="secondary-story-grid">
          {secondaryStories.map((story) => (
            <article className={`secondary-story tone-${story.tone}`} key={story.id}>
              <p className="story-kicker">{story.eyebrow}</p>
              <h3>{story.headline}</h3>
              <div><strong>{story.stat}</strong><span>{story.detail}</span></div>
            </article>
          ))}
        </div>
        <div className="secondary-footer">
          <p><LockKeyhole size={15} /> Public highlight. Private weakness.</p>
          <Link href="/feed" className="text-link">Enter the Universe</Link>
        </div>
      </section>

    </div>
  );
}

