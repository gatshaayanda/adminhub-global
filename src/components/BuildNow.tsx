"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LatestUpdate = {
  slug: string;
  title: string;
  summary: string;
  status: string;
  category: string;
  publishedAt: string | null;
  viewCount: number;
};

const statusLabel: Record<string, string> = {
  exploring: "Exploring",
  building: "Building",
  testing: "Testing",
  live: "Live",
  paused: "Paused",
  archived: "Archived",
};

function formatDate(value: string | null) {
  if (!value) return "No public update yet";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatViews(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}

export default function BuildNow() {
  const [update, setUpdate] = useState<LatestUpdate | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/updates/latest", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (active) setUpdate(data?.update || null);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  if (!update) return null;

  return (
    <section className="ah-building-now" aria-labelledby="building-now-title">
      <div className="ah-building-now-copy">
        <p className="admin-kicker">BUILDING NOW</p>
        <div className="ah-building-now-date">
          {formatDate(update.publishedAt)} · {statusLabel[update.status] || update.status}
        </div>
        <h2 id="building-now-title">{update.title}</h2>
        <p>{update.summary}</p>
      </div>

      <div className="ah-building-now-action">
        <Link className="admin-primary-button" href="/updates">
          View build log <span>↗</span>
        </Link>
        <span>{formatViews(update.viewCount)} recorded views</span>
      </div>
    </section>
  );
}
