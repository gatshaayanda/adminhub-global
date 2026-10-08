import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const metadata = {
  title: "Games | Admin Hub",
  description: "Playable systems built through the Admin Hub games engine.",
};

export default function GamesPage() {
  return (
    <main id="main" className="admin-business">
      <div className="admin-business-shell">
        <section className="admin-business-hero">
          <div>
            <p className="admin-kicker">ADMIN HUB / GAMES</p>
            <h1>Playable systems. Built to evolve.</h1>
            <p className="admin-business-lead">
              The games side of Admin Hub is a separate Phaser engine where
              reusable mechanics, launchers and individual games can grow from
              the same foundation.
            </p>
            <div className="admin-business-actions">
              <a
                className="admin-primary-button"
                href="https://admin-hub-games.vercel.app/"
                target="_blank"
                rel="noreferrer"
              >
                Play Admin Hub Games <span>↗</span>
              </a>
              <Link className="admin-text-link" href="/apps">
                View Apps
              </Link>
            </div>
          </div>
          <div className="admin-business-note">
            <strong>The 11th iteration.</strong>
            <span>
              The current engine turns the same build-and-revision discipline
              used for business software into playable browser experiences.
            </span>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">01 / LIVE CATALOGUE</p>
              <h2>Admin Hub Games.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                The playable catalogue and shared Phaser foundation for games
                being developed under Admin Hub.
              </p>
              <div className="admin-business-price">
                <strong>Play the current build</strong>
                <span>
                  Open the live game environment and experience the systems
                  being developed from the current foundation.
                </span>
                <a
                  className="admin-primary-button"
                  href="https://admin-hub-games.vercel.app/"
                  target="_blank"
                  rel="noreferrer"
                  style={{ marginTop: 24, display: "inline-flex" }}
                >
                  Open Admin Hub Games <ArrowUpRight size={17} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">02 / THE BUILD</p>
              <h2>From reusable engine to playable systems.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                Shooters Trigger is the current spine: a working playthrough
                used to develop reusable systems for future mechanics,
                progression, narrative and specialisation.
              </p>
              <div className="admin-business-list">
                <div>
                  <b>Engine</b>
                  <span>Reusable Phaser gameplay foundations and shared launch infrastructure.</span>
                </div>
                <div>
                  <b>Experiment</b>
                  <span>Mechanics and interactions are tested as working playable systems.</span>
                </div>
                <div>
                  <b>Iteration</b>
                  <span>New games can grow from the same technical foundation without starting from zero.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">03 / ADMIN HUB</p>
              <h2>Apps and games share the discipline.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                Different products, same principle: build something real,
                test it in use, then improve the system rather than polishing
                an idea that has never shipped.
              </p>
              <div className="admin-business-actions">
                <Link className="admin-primary-button" href="/apps">
                  Explore Apps <ArrowUpRight size={17} />
                </Link>
                <Link className="admin-text-link" href="/business">
                  Commercial model
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
