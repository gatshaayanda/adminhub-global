import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck, Target } from "lucide-react";
import HomeProofRail from "@/components/HomeProofRail";
import UsernameDeskForm from "@/components/UsernameDeskForm";
import { coverageStories } from "@/data/boardsignal";
import { BOARDSIGNAL_SUPPORT_DISCORD_URL } from "@/lib/boardsignal/client/firestoreQuota";
import { loadPublicBoardSignalProof } from "@/lib/boardsignal/server/publicProof";
import { loadPublicBoardSignalTrafficProof } from "@/lib/boardsignal/server/publicTrafficProof";
import styles from "./page.module.css";

const secondaryStories = coverageStories.slice(0, 3);

export default async function HomePage() {
  const [liveProof, trafficProof] = await Promise.all([
    loadPublicBoardSignalProof(),
    loadPublicBoardSignalTrafficProof(),
  ]);

  return (
    <div id="main" className="personal-home">
      <section className="personal-hero">
        <div className={`container personal-hero-grid ${styles.heroGrid}`}>
          <div className={`personal-hero-copy motion-enter ${styles.heroCopy}`}>
            <p className="kicker">BOARD SIGNAL</p>
            <h1>Your personal chess improvement companion.</h1>
            <p className="hero-deck">Understand what&apos;s happening in your chess as you play — and know what to work on next. BoardSignal keeps your current picture, guidance and completed Review history together as your chess develops.</p>
            <div id="get-my-boardsignal" className="hero-username-card">
              <UsernameDeskForm />
            </div>

            {(liveProof || trafficProof) ? <HomeProofRail proof={liveProof} traffic={trafficProof} /> : null}

            <div className="homepage-universe-entry">
              <Link href="/feed" className="home-universe-link">Explore the Universe <ArrowRight size={15} /></Link>
              <span>Public positive highlights. No sign-in required.</span>
            </div>
            <div className="first-value-preview">
              <p className="kicker">WHAT BOARDSIGNAL GIVES YOU</p>
              <div>
                <span><ShieldCheck size={16} /> Know what happened.</span>
                <span><Target size={16} /> See what keeps repeating.</span>
                <span><Target size={16} /> Know what to work on next.</span>
              </div>
              <p>The simple answer comes first. The games, positions and evidence are there when you want to see why.</p>
            </div>
          </div>

          <aside className={`player-preview pipeline-preview motion-enter motion-delay-1 ${styles.preview}`} aria-label="Example completed BoardSignal Review">
            <div className="pipeline-preview-top"><span>Example completed Review</span><strong>34 games · 23W · 10L · 1D</strong></div>
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
            <h2>See public highlights, performances moving the field, and the people around the chess already being played.</h2>
          </div>
          <p>Public positive highlights only. Private guidance and weaknesses stay private.</p>
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
