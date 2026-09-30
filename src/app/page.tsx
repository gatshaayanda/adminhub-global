"use client";

import Link from "next/link";

const apps = [
  ["BoardSignal", "Chess performance system", "/apps/boardsignal"],
  ["Translend", "Transport & workflow management", "/apps"],
  ["BOEMO", "Mobile food ordering", "/apps"],
  ["Namane Tyres", "Business application", "/apps"],
  ["PurePress", "Business application", "/apps"],
  ["Meating Place", "Food & business application", "/apps"],
  ["Avram Kids", "Interactive application", "/apps"],
] as const;

const games = [
  ["Shooters Trigger", "Playable paintball experience", "/games"],
  ["President's Shoes", "Interactive story", "/games"],
  ["Hall", "Interactive world", "/games"],
] as const;

function ProjectRow({
  number,
  title,
  type,
  href,
}: {
  number: string;
  title: string;
  type: string;
  href: string;
}) {
  return (
    <Link href={href} className="admin-project-row">
      <span className="admin-project-number">{number}</span>
      <span className="admin-project-name">{title}</span>
      <span className="admin-project-type">{type}</span>
      <span className="admin-project-arrow" aria-hidden="true">↗</span>
    </Link>
  );
}

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

      <section className="admin-proof">
        <div>
          <p className="admin-kicker">WHAT THIS IS</p>
          <h2>I build this stuff.</h2>
        </div>
        <p>
          From business apps and ordering systems to browser games and interactive
          experiences — Admin Hub takes an idea from problem to something people
          can actually use.
        </p>
      </section>

      <section className="admin-work" id="work">
        <div className="admin-section-intro">
          <p className="admin-kicker">01 / APPS</p>
          <h2>Real businesses.<br />Real products.</h2>
        </div>
        <div className="admin-project-list">
          {apps.map(([title, type, href], index) => (
            <ProjectRow
              key={title}
              number={String(index + 1).padStart(2, "0")}
              title={title}
              type={type}
              href={href}
            />
          ))}
        </div>
      </section>

      <section className="admin-work admin-games">
        <div className="admin-section-intro">
          <p className="admin-kicker">02 / GAMES</p>
          <h2>Playable ideas.<br />Built to work.</h2>
        </div>
        <div className="admin-project-list">
          {games.map(([title, type, href], index) => (
            <ProjectRow
              key={title}
              number={String(index + 1).padStart(2, "0")}
              title={title}
              type={type}
              href={href}
            />
          ))}
        </div>
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
        <a className="admin-primary-button admin-primary-button-large" href="mailto:hello@adminhub-global.com">
          Talk to Admin Hub <span>↗</span>
        </a>
      </section>
    </div>
  );
}
