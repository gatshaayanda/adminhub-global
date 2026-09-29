import Link from "next/link";

const apps = [
  { title: "BoardSignal", type: "Chess performance system", href: "/apps/boardsignal", note: "A system for turning chess games into useful performance evidence." },
  { title: "Translend", type: "Transport & workflow management", href: "/apps", note: "A working transport workflow carried from delivery through invoicing and payment." },
  { title: "BOEMO", type: "Mobile food ordering", href: "/apps", note: "A mobile-first ordering experience built around a real local food operation." },
  { title: "Namane Tyres", type: "Business application", href: "/apps", note: "A customer-facing digital experience for a real Botswana business." },
  { title: "PurePress", type: "Business application", href: "/apps", note: "A digital product built around a real service and its day-to-day needs." },
  { title: "Meating Place", type: "Food & business application", href: "/apps", note: "A practical application built around a real-world customer experience." },
  { title: "Avram Kids", type: "Interactive application", href: "/apps", note: "An early product exploring interactive experiences for children." },
];

const games = [
  { title: "Shooters Trigger", type: "Playable paintball experience", href: "/games", note: "A complete playable paintball experience, developed from field movement through combat and arena play." },
  { title: "President's Shoes", type: "Interactive story", href: "/games", note: "A fictional branching story set in Botswana, built around choices and consequences." },
  { title: "Hall", type: "Interactive world", href: "/games", note: "The original Admin Hub Games world: an interactive space to explore, read and leave something behind." },
];

function WorkCard({ item }: { item: (typeof apps)[number] }) {
  return <Link href={item.href} className="portfolio-card">
    <div className="portfolio-card-meta"><span>{item.type}</span><span>↗</span></div>
    <h3>{item.title}</h3>
    <p>{item.note}</p>
    <span className="portfolio-card-link">View project</span>
  </Link>;
}

export default function HomePage() {
  return <div className="admin-home">
    <section className="admin-hero">
      <p className="admin-eyebrow">ADMIN HUB</p>
      <h1>Apps · Games</h1>
      <p className="admin-hero-lead">Software and interactive experiences built for real use.</p>
      <p className="admin-hero-copy">Admin Hub develops applications and games from real problems, ideas and opportunities — taking them from concept through development to something people can actually use or play.</p>
    </section>

    <section className="admin-section" id="apps">
      <div className="admin-section-heading"><p className="admin-eyebrow">01 / APPS</p><h2>Applications built around real-world problems.</h2></div>
      <div className="portfolio-grid">{apps.map((item) => <WorkCard key={item.title} item={item} />)}</div>
    </section>

    <section className="admin-section" id="games">
      <div className="admin-section-heading"><p className="admin-eyebrow">02 / GAMES</p><h2>Playable experiences built with the same development approach.</h2></div>
      <div className="portfolio-grid">{games.map((item) => <WorkCard key={item.title} item={item} />)}</div>
    </section>

    <section className="admin-lineage">
      <div className="admin-section-heading"><p className="admin-eyebrow">03 / THE BUILD</p><h2>Built by iteration.</h2></div>
      <div>
        <p className="admin-lineage-lead">Admin Hub has evolved through successive generations of its application framework.</p>
        <div className="admin-iteration"><strong>10</strong><span>iterations of application development.</span></div>
        <div className="admin-iteration"><strong>11th</strong><span>iteration — Phaser integrated into the framework.</span></div>
      </div>
    </section>

    <section className="admin-process">
      <p className="admin-eyebrow">04 / FROM PROBLEM → PRODUCT</p>
      <div className="admin-process-grid"><span>A business problem.</span><span>An idea.</span><span>An application or game.</span><span>Something people can actually use.</span></div>
    </section>

    <section className="admin-closing"><p className="admin-eyebrow">ADMIN HUB</p><h2>The work is the story.</h2></section>
  </div>;
}
