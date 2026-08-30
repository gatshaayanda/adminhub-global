import Link from "next/link";
import { Activity, ArrowRight, BadgeCheck, ExternalLink, LockKeyhole, ShieldCheck, Target } from "lucide-react";
import UsernameDeskForm from "@/components/UsernameDeskForm";
import { coverageStories } from "@/data/boardsignal";
import { BOARDSIGNAL_SUPPORT_DISCORD_URL } from "@/lib/boardsignal/client/firestoreQuota";
import { loadPublicBoardSignalProof } from "@/lib/boardsignal/server/publicProof";
import { loadPublicBoardSignalTrafficProof } from "@/lib/boardsignal/server/publicTrafficProof";
import styles from "./page.module.css";

const secondaryStories = coverageStories.slice(0, 3);
const TRUSTPILOT_PROFILE_URL = "https://www.trustpilot.com/review/adminhub-global.com";
const PUBLIC_PROOF_THRESHOLD = 20;

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

export default async function HomePage() {
  const [liveProof, trafficProof] = await Promise.all([
    loadPublicBoardSignalProof(),
    loadPublicBoardSignalTrafficProof(),
  ]);

  const activePlayers = liveProof?.activePlayers ?? 0;
  const playersServed = liveProof?.playersServed ?? 0;
  const reviewsProduced = liveProof?.reviewsProduced ?? 0;
  const showActivePlayers = activePlayers >= PUBLIC_PROOF_THRESHOLD;
  const showCompletedReviews = reviewsProduced >= PUBLIC_PROOF_THRESHOLD && playersServed >= PUBLIC_PROOF_THRESHOLD;
  const showAudienceProof = Boolean(
    trafficProof
    && trafficProof.visitors30d >= PUBLIC_PROOF_THRESHOLD
    && trafficProof.pageviews30d >= PUBLIC_PROOF_THRESHOLD,
  );

  return (
    <div id="main" className="personal-home">
      <section className="personal-hero">
        <div className={`container personal-hero-grid ${styles.heroGrid}`}>
          <div className={`personal-hero-copy motion-enter ${styles.heroCopy}`}>
            <p className="kicker">Personal chess performance review</p>
            <h1>See what your games are actually telling you.</h1>
            <p className="hero-deck">BoardSignal reviews your recent Chess.com games together to show what changed, what&apos;s costing you games, and what to focus on next.</p>
            <div id="get-my-boardsignal" className="hero-username-card">
              <UsernameDeskForm />
            </div>

            <section className={`boardsignal-social-proof motion-enter motion-delay-1 ${styles.credibilityPanel}`} aria-label="Real BoardSignal activity and independent reputation">
              <div className={`boardsignal-social-proof-mark ${styles.credibilityMark}`} aria-hidden="true"><Activity size={21} /></div>
              <div className={`boardsignal-social-proof-copy ${styles.credibilityBody}`}>
                <div className={styles.credibilityIntro}>
                  <span>REAL BOARDSIGNAL ACTIVITY</span>
                  <p>Real usage and audience evidence, followed by a public place to check our reputation for yourself.</p>
                </div>

                {(showActivePlayers || showCompletedReviews || showAudienceProof) ? <div className={styles.proofRows}>
                  {showActivePlayers ? <div className={`${styles.proofRow} ${styles.proofRowOne}`}>
                    <strong className={styles.proofNumber}>{formatCount(activePlayers)}</strong>
                    <p><b>active player accounts</b><small>currently in BoardSignal&apos;s live player lifecycle</small></p>
                  </div> : null}
                  {showCompletedReviews ? <div className={`${styles.proofRow} ${styles.proofRowTwo}`}>
                    <strong className={styles.proofNumber}>{formatCount(reviewsProduced)}</strong>
                    <p><b>completed Reviews across {formatCount(playersServed)} players</b><small>durable BoardSignal product records, not signup counts</small></p>
                  </div> : null}
                  {showAudienceProof && trafficProof ? <div className={`${styles.proofRow} ${styles.proofRowThree}`}>
                    <strong className={styles.proofNumber}>{formatCount(trafficProof.visitors30d)}</strong>
                    <p><b>site visitors in the last 30 days</b><small>{formatCount(trafficProof.pageviews30d)} page views · anonymous aggregate Vercel Web Analytics</small></p>
                  </div> : null}
                </div> : <p className={styles.proofFallback}>BoardSignal publishes real product activity as soon as the current aggregate evidence is available.</p>}

                <div className={styles.trustPanel}>
                  <BadgeCheck size={20} aria-hidden="true" />
                  <div>
                    <span>INDEPENDENT REVIEWS</span>
                    <strong>BoardSignal is on Trustpilot through Admin Hub.</strong>
                    <p>Read the public customer reviews and make up your own mind.</p>
                  </div>
                  <a className={styles.trustLink} href={TRUSTPILOT_PROFILE_URL} target="_blank" rel="noreferrer noopener">SEE BOARDSIGNAL ON TRUSTPILOT <ExternalLink size={13} /></a>
                </div>
              </div>
            </section>

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

          <aside className={`player-preview pipeline-preview motion-enter motion-delay-1 ${styles.preview}`} aria-label="Example BoardSignal review">
            <div className="pipeline-preview-top"><span>Example review</span><strong>34 games · 23W · 10L · 1D</strong></div>
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
            <h2>See the weeks players are having, the performances moving the field, and the people around the chess already being played.</h2>
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
