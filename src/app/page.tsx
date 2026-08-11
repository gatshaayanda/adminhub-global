import Link from "next/link";
import {
  BookOpen,
  ChartNoAxesCombined,
  LockKeyhole,
  ShieldCheck,
  Target,
} from "lucide-react";
import ChessComLoginPanel from "@/components/ChessComLoginPanel";
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
            <div className="first-value-preview">
              <p className="kicker">YOUR WEEK IN ONE PLACE</p>
              <div>
                <span><BookOpen size={16} /> The story of your seven days</span>
                <span><ChartNoAxesCombined size={16} /> Rating and performance trends</span>
                <span><ShieldCheck size={16} /> Key games and reviewed positions</span>
                <span><Target size={16} /> What to preserve, watch or fix</span>
              </div>
              <p>One useful thing to carry forward—and where your week stands in BoardSignal. A signal appears only when its evidence exists.</p>
            </div>
          </div>

          <aside className="player-preview pipeline-preview motion-enter motion-delay-1" aria-label="Featured BoardSignal coverage">
            <div className="pipeline-preview-top"><span>This week on BoardSignal</span><strong>{deskPreview.headline}</strong></div>
            <p>{deskPreview.summary}</p>
            <div className="coverage-stat"><strong>{deskPreview.stat}</strong><span>{deskPreview.detail}</span></div>
          </aside>
        </div>
      </section>

      <section className="container home-player-room-entry">
        <ChessComLoginPanel compact />
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
