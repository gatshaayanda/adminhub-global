import Link from "next/link";
import BuildNow from "@/components/BuildNow";
import ProjectShowcase from "@/components/ProjectShowcase";
import GameShowcase from "@/components/GameShowcase";

export default function HomePage() {
  return (
    <div className="admin-home">
      <section className="admin-hero">
        <div className="admin-hero-copy-block">
          <p className="admin-kicker">ADMIN HUB</p>
          <h1>Apps · Games</h1>
          <p className="admin-hero-lead">
            Software and interactive experiences built for real use.
          </p>
          <div className="admin-hero-actions">
            <a className="admin-primary-button" href="#work">See the work <span>↓</span></a>
            <a className="admin-text-link" href="#start">Get something built ↗</a>
          </div>
        </div>

        <div className="admin-hero-video">
          <video
            src="/video/admin-ad.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Admin Hub apps and games showcase"
          />
          <div className="admin-video-label">
            <span>ADMIN HUB / SHOWREEL</span>
            <span>APPS + GAMES</span>
          </div>
        </div>
      </section>

      <BuildNow />

      <section className="admin-proof">
        <div>
          <p className="admin-kicker">WHAT THIS IS</p>
          <h2>Built by Admin Hub.</h2>
        </div>
        <p>
          From business apps and ordering systems to browser games and interactive
          experiences — Admin Hub takes an idea from a real problem to something
          people can actually use.
        </p>
      </section>

      <section className="admin-work" id="work">
        <div className="admin-section-intro">
          <p className="admin-kicker">01 / APPS</p>
          <h2>Real businesses.<br />Real products.</h2>
        </div>
        <ProjectShowcase />     </section>

      <section className="admin-work admin-games">
        <div className="admin-section-intro">
          <p className="admin-kicker">02 / GAMES</p>
          <h2>Playable ideas.<br />Built to work.</h2>
        </div>
        <GameShowcase />
      </section>

      <section className="admin-build">
        <div>
          <p className="admin-kicker">03 / THE BUILD</p>
          <h2>Idea → build → test → improve.</h2>
        </div>
        <div className="admin-build-stats">
          <div><strong>10+</strong><span>iterations of the app framework</span></div>
          <div><strong>Phaser</strong><span>integrated for game development</span></div>
          <div><strong>Real use</strong><span>the test that matters</span></div>
        </div>
      </section>

      <section className="admin-start" id="start">
        <p className="admin-kicker">04 / START SOMETHING</p>
        <h2>Have an idea?<br />Let&apos;s build it.</h2>
        <a className="admin-primary-button admin-primary-button-large" href="mailto:adminhubglobal@gmail.com?subject=Admin%20Hub%20Inquiry&body=Name%3A%20%0ACompany%2FProject%3A%20%0AWhat%20I%27d%20like%20to%20discuss%3A%20%0ABest%20way%20to%20contact%20me%3A%20%0APreferred%20contact%20details%3A%20%0AReference%20request%20(if%20applicable)%3A%20%0A">
          Talk to Admin Hub <span>↗</span>
        </a>
      </section>
    </div>
  );
}
