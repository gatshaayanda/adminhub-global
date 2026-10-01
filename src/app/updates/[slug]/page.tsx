import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedBuildUpdate } from "@/lib/buildUpdates";
import ViewCounter from "./ViewCounter";

export const dynamic = "force-dynamic";

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
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const update = await getPublishedBuildUpdate(slug);

  return {
    title: update?.title || "Build Log",
    description:
      update?.summary ||
      "A dated record of what Admin Hub is building, testing and shipping.",
  };
}

export default async function BuildLogEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const update = await getPublishedBuildUpdate(slug);

  if (!update) notFound();

  return (
    <div className="ah-build-detail">
      <ViewCounter slug={update.slug} />

      <section className="ah-build-detail-shell">
        <div className="ah-build-detail-top">
          <Link href="/updates" className="ah-build-detail-back">
            ← Build Log
          </Link>
          <span>{formatDate(update.publishedAt || update.createdAt)}</span>
        </div>

        <div className="ah-build-detail-meta">
          <span>{statusLabel[update.status] || update.status}</span>
          <span>{categoryLabel[update.category] || update.category}</span>
          <span>Views {update.viewCount}</span>
        </div>

        <h1>{update.title}</h1>
        <p className="ah-build-detail-summary">{update.summary}</p>

        <div className="ah-build-detail-rule" />

        <article className="ah-build-detail-body">
          {update.body.split(/\n\s*\n/).map((paragraph, index) => (
            <p key={`${update.id}-${index}`} className="whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
        </article>

        <div className="ah-build-detail-footer">
          <span>Published {formatDate(update.publishedAt || update.createdAt)}</span>
          <Link href="/updates">View the full build log →</Link>
        </div>
      </section>
    </div>
  );
}
