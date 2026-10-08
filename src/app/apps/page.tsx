import Link from "next/link";
import { ArrowUpRight, Gamepad2 } from "lucide-react";

export const metadata = {
  title: "Apps | Admin Hub",
  description: "Real business and product applications built through the Admin Hub delivery system.",
};

const apps = [
  {
    href: "/apps/learn-forex",
    title: "Learn Forex Trading Botswana Academy",
    label: "CLIENT APPLICATION",
    description:
      "A live client-facing application with its own public experience, customer journey, and supporting workflow.",
  },
  {
    href: "/boardsignal",
    title: "BoardSignal",
    label: "INDEPENDENT PRODUCT",
    description:
      "A chess performance system that turns games into structured Reviews, recurring signals, and practical guidance.",
  },
];

export default function AppsPage() {
  return (
    <main id="main" className="admin-business">
      <div className="admin-business-shell">
        <section className="admin-business-hero">
          <div>
            <p className="admin-kicker">ADMIN HUB / APPS</p>
            <h1>Software built around real workflows.</h1>
            <p className="admin-business-lead">
              Admin Hub is the reusable delivery system behind practical web
              applications. Each product gets its own workflow, interface,
              data model and revision path.
            </p>
            <div className="admin-business-actions">
              <Link className="admin-primary-button" href="/contact">
                Start an enquiry <span>↗</span>
              </Link>
              <Link className="admin-text-link" href="/business">
                How it works
              </Link>
            </div>
          </div>
          <div className="admin-business-note">
            <strong>Real products. Different problems.</strong>
            <span>
              The same delivery foundation can be adapted to ordering, booking,
              customer journeys, operations, learning and other focused
              workflows without forcing every business into the same interface.
            </span>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">01 / PUBLISHED APPS</p>
              <h2>Open the work.</h2>
            </div>
            <div className="admin-business-copy">
              <div className="admin-business-cards">
                {apps.map((app) => (
                  <Link key={app.href} href={app.href} className="admin-business-card">
                    <strong>{app.title}</strong>
                    <p className="admin-kicker" style={{ marginTop: 14 }}>{app.label}</p>
                    <p>{app.description}</p>
                    <span className="admin-text-link" style={{ display: "inline-block", marginTop: 12 }}>
                      Open application <span>↗</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">02 / THE DELIVERY ENGINE</p>
              <h2>Build once. Adapt the workflow.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                Built and refined through its 10th iteration, the Admin Hub
                engine is the practical layer behind setup, configuration,
                revision and deployment of different project types.
              </p>
              <div className="admin-business-list">
                <div>
                  <b>Workflow</b>
                  <span>Start from the real business process instead of a generic template.</span>
                </div>
                <div>
                  <b>Product</b>
                  <span>Give the workflow its own interface, data model and customer experience.</span>
                </div>
                <div>
                  <b>Iteration</b>
                  <span>Use real feedback to improve the product after the first useful version is live.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">03 / NEXT</p>
              <h2>Games use the same discipline.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                The games side is a separate Phaser engine built around the
                same idea: reusable foundations, real working systems and
                iteration through playable builds.
              </p>
              <div className="admin-business-actions">
                <Link className="admin-primary-button" href="/games">
                  Explore Games <Gamepad2 size={18} /> <ArrowUpRight size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
