import Link from "next/link";
import { AppWindow, LockKeyhole, ShieldCheck, Target } from "lucide-react";
import BoardSignalLiveProof from "@/components/BoardSignalLiveProof";
import UsernameDeskForm from "@/components/UsernameDeskForm";
import { coverageStories } from "@/data/boardsignal";
import { BOARDSIGNAL_SUPPORT_DISCORD_URL } from "@/lib/boardsignal/client/firestoreQuota";
import { loadPublicBoardSignalProof } from "@/lib/boardsignal/server/publicProof";

const secondaryStories = coverageStories.slice(0, 3);

export default async function HomePage() {
  const liveProof = await loadPublicBoardSignalProof();
  return (
    <div id="main" className="personal-home">
      <section className="personal-hero">
        <div className="container personal-hero-grid">
          <div className="personal-hero-copy motion-enter">
            <p className="kicker">THE CHESS APP THAT REVIEWS YOUR WEEK</p>
            <h1>See what your games are actually telling you.</h1>
            <p className="hero-deck">BoardSignal turns your recent Chess.com games into a private Review: what happened, what keeps repeating, and what to focus on next.</p>
            <div className="boardsignal-app-positioning" role="note">
              <AppWindow size={18} aria-hidden="true" />
              <p><strong>It is an app.</strong> Sign in with Google, connect your Chess.com profile once, then use BoardSignal in your browser or install it on your phone or computer when offered.</p>
            </div>
            <div id="get-my-boardsignal" className="hero-username-card">
              <UsernameDeskForm />
            </div>
            {liveProof ? <BoardSignalLiveProof proof={liveProof} /> : null}
            <div className="first-value-preview">
              <p className="kicker">WHAT YOU GET</p>
              <div>
                <span><ShieldCheck size={16} /> Know what happened.</span>
                <span><Target size={16} /> See what keeps repeating.</span>
                <span><Target size={16} /> Know what to work on next.</span>
              </div>
              <p>The answer comes first. Your games, positions and evidence are there when you want to see why.</p>
            </div>
          </div>

          <aside className="player-preview pipeline-preview motion-enter motion-delay-1" aria-label="Example BoardSignal review">
            <div className="pipeline-preview-top"><span>Example Review</span><strong>34 games · 23W · 10L · 1D</strong></div>
            <div className="coverage-stat"><strong>+92</strong><span>rating</span></div>
            <p><strong>WHAT STOOD OUT</strong><br />Seven straight wins changed the week.</p>
            <p><strong>BIGGEST OPPORTUNITY</strong><br />Several losses came after good positions had already been reached.</p>
            <p><strong>FOCUS NEXT</strong><br />When you&apos;re ahead, check your opponent&apos;s forcing reply before committing.</p>
          </aside>
        </div>
      </section>

      <section className="container secondary-coverage">
        <div className="secondary-heading">
          <div>
            <p className="kicker">THE BOARDSIGNAL UNIVERSE</p>
            <h2>Your private Review is only one part of the product.</h2>
          </div>
          <p>See public-safe highlights from the wider BoardSignal field. Improvement guidance and weaknesses stay private.</p>
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
          <p><LockKeyhole size={15} /> Public highlights. Private improvement guidance.</p>
          <Link href="/feed" className="button button-outline">EXPLORE THE UNIVERSE</Link>
        </div>
        <div className="boardsignal-community-entry">
          <div><p className="kicker">BOARDSIGNAL COMMUNITY</p><strong>Want to compare notes with other players or talk to the founder?</strong><p>Discord is optional and never required for access or identity.</p></div>
          <a className="button button-outline" href={BOARDSIGNAL_SUPPORT_DISCORD_URL} target="_blank" rel="noreferrer noopener">JOIN THE BOARDSIGNAL DISCORD</a>
        </div>
      </section>
    </div>
  );
}
