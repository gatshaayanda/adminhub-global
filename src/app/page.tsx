import Link from "next/link";

const apps = [
  ["BoardSignal", "Chess performance system", "/boardsignal", false],
  ["Translend", "Transport & workflow management", "https://translend-tms.vercel.app/pipeline", true],
  ["BOEMO", "Mobile kitchen ordering", "https://boemo-joos-food-deals.vercel.app/", true],
  ["Namane Tyres", "Customer booking & work progress", "http://namane-tyres.vercel.app/", true],
  ["PurePress", "Business application", "https://purepress-omega.vercel.app/", true],
  ["Meating Place", "Food & business application", "https://meating-place.vercel.app/", true],
  ["Avram Kids", "Interactive application", "/apps", false],
] as const;

const games = [
  ["Shooters Trigger", "Playable paintball experience", "https://admin-hub-games.vercel.app/", true],
  ["President's Shoes", "Interactive story", "https://admin-hub-games.vercel.app/", true],
  ["Hall", "Interactive world", "https://admin-hub-games.vercel.app/", true],
] as const;

function ProjectRow({
  number,
  title,
  type,
  href,
  external,
}: {
  number: string;
  title: string;
  type: string;
  href: string;
  external: boolean;
}) {
  const className = "admin-project-row";

  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        <span className="admin-project-number">{number}</span>
        <span className="admin-project-name">{title}</span>
        <span className="admin-project-type">{type}</span>
        <span className="admin-project-arrow" aria-hidden="true">↗</span>
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
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
        <div className="admin-project-list">
          {apps.map(([title, type, href, external], index) => (
            <ProjectRow
              key={title}
              number={String(index + 1).padStart(2, "0")}
              title={title}
              type={type}
              href={href}
              external={external}
            />
          ))}
        </div>
      </section>

      <section className="admin-note">
        <div>
          <p className="admin-kicker">A NOTE FROM AYANDA K. GATSHA</p>
          <h2>I built Admin Hub around things that needed to work.</h2>
        </div>
        <div className="admin-note-copy">
          <p>
            I’m Ayanda K. Gatsha. Admin Hub is the company and product home I built
            to turn real problems, ideas and experiments into software people can use.
            The work here comes from building, testing, listening to people using it,
            and improving what actually needs improving.
          </p>
          <p>
            BoardSignal started as an app I built to help me improve at chess. I shared
            it with other chess players, marketed it, and more than 100 players have
            engaged with the system I built around it. Other projects started from
            businesses asking for something specific — ordering, workflow, bookings,
            customer progress or a better way to run part of the business.
          </p>
        </div>
      </section>

      <section className="admin-work admin-games">
        <div className="admin-section-intro">
          <p className="admin-kicker">02 / GAMES</p>
          <h2>Playable ideas.<br />Built to work.</h2>
        </div>
        <div className="admin-project-list">
          {games.map(([title, type, href, external], index) => (
            <ProjectRow
              key={title}
              number={String(index + 1).padStart(2, "0")}
              title={title}
              type={type}
              href={href}
              external={external}
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
        <a className="admin-primary-button admin-primary-button-large" href="mailto:gatshaayanda@gmail.com">
          Talk to Admin Hub <span>↗</span>
        </a>
      </section>
    </div>
  );
}
