import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedBuildUpdates } from "@/lib/buildUpdates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Build Log",
  description: "A dated record of what Admin Hub is building, testing and shipping.",
};

const statusLabel: Record<string, string> = {
  exploring: "Exploring",
  building: "Building",
  testing: "Testing",
  live: "Live",
  paused: "Paused",
  archived: "Archived",
};

const categoryLabel: Record<string, string> = {
  build: "Build",
  release: "Release",
  research: "Research",
  client: "Client",
  platform: "Platform",
};

function formatDate(value: string | null) {
  if (!value) return "Undated";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatViews(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}

export default async function BuildLogPage() {
  const updates = await getPublishedBuildUpdates();
  const totalViews = updates.reduce((sum, update) => sum + update.viewCount, 0);

  return (
    <main className="ah-build-log">
      <section className="ah-build-log-hero">
        <div className="ah-build-log-hero-inner">
          <div className="ah-build-log-heading">
            <p className="ah-build-log-kicker">ADMIN HUB / BUILD LOG</p>
            <h1>What&apos;s happening.</h1>
            <p className="ah-build-log-lead">
              A dated public record of the applications, games and platform work
              being explored, built, tested and shipped.
            </p>
          </div>

          <div className="ah-build-log-nav">
            <Link className="ah-build-log-back" href="/">
              ← Back to Admin Hub
            </Link>
            <span className="ah-build-log-nav-note">Public project record</span>
          </div>
        </div>
      </section>

      <section className="ah-build-log-summary" aria-label="Build Log summary">
        <div>
          <span>Public updates</span>
          <strong>{updates.length}</strong>
        </div>
        <div>
          <span>Recorded views</span>
          <strong>{formatViews(totalViews)}</strong>
        </div>
        <div>
          <span>Latest entry</span>
          <strong>{updates[0] ? formatDate(updates[0].publishedAt || updates[0].createdAt) : "—"}</strong>
        </div>
      </section>

      <section className="ah-build-log-list" aria-label="Build updates">
        {updates.length === 0 ? (
          <div className="ah-build-log-empty">
            <p className="ah-build-log-kicker">NO PUBLIC UPDATES YET</p>
            <h2>The build log is ready.</h2>
            <p>
              Public updates will appear here once they are created and
              published from the Admin Hub control area.
            </p>
          </div>
        ) : (
          updates.map((update, index) => (
            <article
              key={update.id}
              className={`ah-build-entry ${index === 0 ? "is-latest" : ""}`}
            >
              <div className="ah-build-entry-date">
                <span>{formatDate(update.publishedAt || update.createdAt)}</span>
                {index === 0 ? <b>Latest</b> : null}
              </div>

              <div className="ah-build-entry-line" aria-hidden="true">
                <span />
              </div>

              <div className="ah-build-entry-card">
                <div className="ah-build-entry-meta">
                  <span className="ah-build-entry-status">
                    {statusLabel[update.status] || update.status}
                  </span>
                  <span>{categoryLabel[update.category] || update.category}</span>
                  <span>{formatViews(update.viewCount)} views</span>
                </div>

                <h2>{update.title}</h2>
                <p>{update.summary}</p>

                <div className="ah-build-entry-footer">
                  <span>Public build record</span>
                  <Link href={`/updates/${update.slug}`} className="ah-build-entry-link">
                    Read update <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="ah-build-log-footer">
        <div>
          <p className="ah-build-log-kicker">THE WORK, IN PUBLIC</p>
          <h2>Idea → build → test → improve.</h2>
        </div>
        <Link className="admin-primary-button" href="/">
          Back to Admin Hub <span>↗</span>
        </Link>
      </section>
    </main>
  );
}
