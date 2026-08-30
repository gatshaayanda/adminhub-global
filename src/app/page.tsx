import Link from "next/link";
import { ArrowRight, ExternalLink, LockKeyhole, ShieldCheck, Target, UsersRound } from "lucide-react";
import UsernameDeskForm from "@/components/UsernameDeskForm";
import { coverageStories } from "@/data/boardsignal";
import { BOARDSIGNAL_SUPPORT_DISCORD_URL } from "@/lib/boardsignal/client/firestoreQuota";
import { loadPublicBoardSignalProof } from "@/lib/boardsignal/server/publicProof";

const secondaryStories = coverageStories.slice(0, 3);
const TRUSTPILOT_PROFILE_URL = "https://www.trustpilot.com/review/adminhub-global.com";
const RETURNING_PLAYER_PROOF_THRESHOLD = 20;

function usageProofCopy(players: number, reviews: number) {
  if (players > 0 && reviews > 0) {
    return `${reviews} ${reviews === 1 ? "Review" : "Reviews"} completed across ${players} ${players === 1 ? "player" : "players"}.`;
  }
  if (players > 0) return `${players} ${players === 1 ? "player has" : "players have"} used BoardSignal to understand their games.`;
  return `${reviews} ${reviews === 1 ? "BoardSignal Review has" : "BoardSignal Reviews have"} been completed.`;
}

function returningPlayersCopy(count: number) {
  return `${count} ${count === 1 ? "player has" : "players have"} come back for another Review.`;
}

export default async function HomePage() {
  const liveProof = await loadPublicBoardSignalProof();
  const playersServed = liveProof?.playersServed ?? 0;
  const reviewsProduced = liveProof?.reviewsProduced ?? 0;
  const returningPlayers = liveProof?.returningPlayers ?? 0;
  const showReturningProof = returningPlayers >= RETURNING_PLAYER_PROOF_THRESHOLD;

  return (
    <div id="main" className="personal-home">
      <section className="personal-hero">
        <div className="container personal-hero-grid">
          <div className="personal-hero-copy motion-enter">
            <p className="kicker">Personal chess performance review</p>
            <h1>See what your games are actually telling you.</h1>
            <p className="hero-deck">BoardSignal reviews your recent Chess.com games together to show what changed, what&apos;s costing you games, and what to focus on next.</p>
            <div id="get-my-boardsignal" className="hero-username-card">
              <UsernameDeskForm />
            </div>
            {liveProof && (playersServed > 0 || reviewsProduced > 0) ? <div className="boardsignal-social-proof motion-enter motion-delay-1" aria-label="BoardSignal usage by real players">
              <div className="boardsignal-social-proof-mark" aria-hidden="true"><UsersRound size={21} /></div>
              <div className="boardsignal-social-proof-copy">
                <p className="boardsignal-social-proof-primary">{usageProofCopy(playersServed, reviewsProduced)}</p>
                {showReturningProof ? <p className="boardsignal-social-proof-secondary">{returningPlayersCopy(returningPlayers)}</p> : null}
                <a className="boardsignal-social-proof-trust" href={TRUSTPILOT_PROFILE_URL} target="_blank" rel="noreferrer noopener">Read independent reviews on Trustpilot <ExternalLink size={13} /></a>
              </div>
            </div> : null}
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

          <aside className="player-preview pipeline-preview motion-enter motion-delay-1" aria-label="Example BoardSignal review">
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
