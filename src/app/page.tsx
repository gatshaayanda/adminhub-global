import Link from "next/link";
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
            <a className="admin-primary-button" href="#problems">See the work <span>↓</span></a>
            <a className="admin-text-link" href="#start">Start something ↗</a>
          </div>
        </div>
        <div className="admin-hero-video">
          <video src="/video/admin-ad.mp4" autoPlay muted loop playsInline preload="metadata" aria-label="Admin Hub apps and games showcase" />
          <div className="admin-video-label"><span>ADMIN HUB / SHOWREEL</span><span>APPS + GAMES</span></div>
        </div>
      </section>

      <section className="admin-work admin-problems" id="problems">
        <div className="admin-section-intro">
          <p className="admin-kicker">01 / THE PROBLEMS</p>
          <h2>Different businesses.<br />Different problems.</h2>
          <p className="admin-section-lead">The work starts with what a business is actually trying to make easier: orders, bookings, customer requests, workshop work, operations and other real workflows.</p>
        </div>
        <IndustryProjectShowcase />
      </section>

      <section className="admin-work admin-games" id="games">
        <div className="admin-section-intro">
          <p className="admin-kicker">02 / GAMES</p>
          <h2>Playable ideas.<br />Built to work.</h2>
          <p className="admin-section-lead">Games are part of the wider Admin Hub build space — a place to test interaction, movement, story, systems and reusable mechanics.</p>
        </div>
        <GameShowcase />
      </section>


    </div>
  );
}
