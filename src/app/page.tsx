import Link from "next/link";
import BuildNow from "@/components/BuildNow";
import GameShowcase from "@/components/GameShowcase";
import IndustryProjectShowcase from "@/components/IndustryProjectShowcase";
import AdminHubSignal from "@/components/AdminHubSignal";

export default function HomePage() {
  return (
    <div className="admin-home">
      <section className="admin-hero">
        <div className="admin-hero-copy-block">
          <AdminHubSignal />
          <p className="admin-kicker mt-5">ADMIN HUB</p>
          <h1>Apps · Games</h1>
          <p className="admin-hero-lead">Software and interactive experiences built for real use.</p>
          <div className="admin-hero-actions">
            <a className="admin-primary-button" href="#work">See the work <span>↓</span></a>
            <a className="admin-text-link" href="#start">Get something built ↗</a>
          </div>
        </div>
        <div className="admin-hero-video">
          <video src="/video/admin-ad.mp4" autoPlay muted loop playsInline preload="metadata" aria-label="Admin Hub apps and games showcase" />
          <div className="admin-video-label"><span>ADMIN HUB / SHOWREEL</span><span>APPS + GAMES</span></div>
        </div>
      </section>

      <BuildNow />

      <section className="admin-proof">
        <div><p className="admin-kicker">WHAT THIS IS</p><h2>Built by Admin Hub.</h2></div>
        <p>From business apps and ordering systems to browser games and interactive experiences — Admin Hub takes an idea from a real problem to something people can actually use.</p>
      </section>

      <section className="admin-work" id="work">
        <div className="admin-section-intro">
          <p className="admin-kicker">01 / APPS</p>
          <h2>Published products.<br />Built for real use.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5c5f64]">Explore working products by industry. If you run a business like one of these, start with the work that is closest to your world.</p>
        </div>
        <IndustryProjectShowcase />
      </section>

      <section className="admin-work admin-games">
        <div className="admin-section-intro">
          <p className="admin-kicker">02 / GAMES</p>
          <h2>Playable ideas.<br />Built to work.</h2>
        </div>
        <GameShowcase />
      </section>

      <section className="admin-build">
        <div><p className="admin-kicker">03 / THE BUILD</p><h2>Idea → build → test → improve.</h2></div>
        <div className="admin-build-stats">
          <div><strong>10+</strong><span>iterations of the app framework</span></div>
          <div><strong>Phaser</strong><span>integrated for game development</span></div>
          <div><strong>Real use</strong><span>the test that matters</span></div>
        </div>
      </section>

      <section className="admin-start" id="start">
        <p className="admin-kicker">04 / START SOMETHING</p>
        <h2>Have an idea?<br />Let&apos;s build it.</h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[#5c5f64]">Tell Ask Admin Hub what you are trying to build. It can point you to relevant work and collect the details you want Admin Hub to review.</p>
        <Link className="admin-primary-button admin-primary-button-large" href="#start">Ask Admin Hub <span>↗</span></Link>
      </section>
    </div>
  );
}