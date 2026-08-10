import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleCheckBig,
  LockKeyhole,
  Target,
  UserRoundSearch,
} from "lucide-react";
import UsernameDeskForm from "@/components/UsernameDeskForm";
import { betaProof, coverageStories } from "@/data/boardsignal";

const secondaryStories = coverageStories.slice(0, 3);

export default function HomePage() {
  return (
    <div id="main" className="personal-home">
      <section className="personal-hero">
        <div className="container personal-hero-grid">
          <div className="personal-hero-copy motion-enter">
            <p className="kicker">Your personal chess sports desk</p>
            <h1>Enter your username. BoardSignal builds the week around you.</h1>
            <p className="hero-deck">For a completed beta player, the approved seeded Desk opens immediately. For anyone else, BoardSignal confirms the real Chess.com account, retrieves the public games and builds the latest fixed seven-day chapter.</p>
            <div id="find-my-desk" className="hero-username-card">
              <UsernameDeskForm />
              <Link href="/player/Ayandakopano" className="demo-link">
                Or open one finished beta example <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <aside className="player-preview pipeline-preview motion-enter motion-delay-1" aria-label="BoardSignal processing flow">
            <div className="pipeline-preview-top"><span>What happens next</span><strong>One username becomes one Desk</strong></div>
            <div className="pipeline-preview-list">
              <div><span>01</span><div><strong>Confirm the player</strong><p>Canonical Chess.com identity and public profile.</p></div><CircleCheckBig /></div>
              <div><span>02</span><div><strong>Close the week</strong><p>Latest completed Monday–Sunday block; last-active fallback when needed.</p></div><CalendarDays /></div>
              <div><span>03</span><div><strong>Build the evidence</strong><p>Record, pools, days, sessions, streaks, openings and legal positions.</p></div><BarChart3 /></div>
              <div><span>04</span><div><strong>Review with Stockfish</strong><p>Selected legal positions sharpen the signal without inventing a story.</p></div><Target /></div>
            </div>
            <Link href="/player/Ayandakopano" className="preview-open">See a completed output <ChevronRight size={19} /></Link>
          </aside>
        </div>
      </section>

      <section className="container personal-flow-section">
        <div className="section-heading">
          <p className="kicker">The first journey</p>
          <h2>You are the story—not the audience for everybody else.</h2>
          <p>BoardSignal starts with your identity, then moves through your week in a clear order.</p>
        </div>
        <div className="personal-flow-grid">
          <article><span>01</span><UserRoundSearch /><h3>Find your player page</h3><p>One public username confirms whose games and Desk you want.</p></article>
          <article><span>02</span><CalendarDays /><h3>Understand your week</h3><p>See the record, rating movement, streak and the point where the direction changed.</p></article>
          <article><span>03</span><Target /><h3>Reach the useful action</h3><p>Go straight to the weakness, guidance and exact game moments behind it.</p></article>
        </div>
      </section>

      <section className="ayanda-proof-band">
        <div className="container ayanda-proof-grid">
          <div>
            <p className="kicker">Finished beta example · Ayandakopano</p>
            <h2>See a complete player-first Desk before entering your own.</h2>
            <p>This real 55-game week opens with the story, then lets the player choose: replay the week, go directly to the weakness, carry the guidance or inspect the three evidence games.</p>
            <div className="lead-actions">
              <Link href="/player/Ayandakopano" className="button button-lime">Open the player page <ArrowRight size={17} /></Link>
              <Link href="/app/desk/week-001#weakness" className="button button-outline">See the weakness</Link>
            </div>
          </div>
          <div className="ayanda-proof-stats">
            <div><span>Games</span><strong>55</strong></div>
            <div><span>Longest run</span><strong>8 wins</strong></div>
            <div><span>Rating</span><strong>−35</strong></div>
            <div><span>Evidence games</span><strong>3</strong></div>
          </div>
        </div>
      </section>

      <section className="container secondary-coverage">
        <div className="secondary-heading">
          <div>
            <p className="kicker">Around BoardSignal · Secondary coverage</p>
            <h2>Other players make the world feel alive. They do not replace your Desk.</h2>
          </div>
          <p>{betaProof.desks} real beta Desks and {betaProof.games} games sit behind the product. Only safe positive coverage appears here.</p>
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
          <Link href="/feed" className="text-link">See the wider coverage index</Link>
        </div>
      </section>

      <section className="container shell-boundary">
        <CircleCheckBig size={22} />
        <div><strong>This shell asks for no account, payment or Chess.com login.</strong><p>It proves the player journey first. Private links, claiming a Room and automated processing come later.</p></div>
      </section>
    </div>
  );
}
