"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ProofHighlight = {
  id: string;
  kind: string;
  period: string;
  quote?: string;
  statement?: string;
  source: string;
  place: string;
};

const highlights: ProofHighlight[] = [
  { id: "commissioncrowd", kind: "REFERENCE", period: "2025", quote: "An adaptable, trustworthy and quietly effective professional.", source: "CommissionCrowd", place: "International" },
  { id: "teresa", kind: "REFERENCE", period: "CANADA", quote: "Excellent interpersonal skills, active listening skills…", source: "Dr Teresa Howell", place: "Canada" },
  { id: "stuart", kind: "REFERENCE", period: "2015", quote: "Purpose and ambition… humility and empathy…", source: "Stuart Entwistle", place: "United Kingdom" },
  { id: "insurance", kind: "REFERENCE", period: "BOTSWANA", quote: "Tenacity, consistency and professionalism.", source: "Insurance Training Institute", place: "Botswana" },
  { id: "other-press", kind: "REFERENCE", period: "CANADA", quote: "Commitment, punctuality and professionalism were indispensable assets.", source: "The Other Press / Douglas College", place: "Canada" },
  { id: "edukick", kind: "REFERENCE", period: "MANCHESTER", quote: "His personality shone through… personality of the year award.", source: "EduKick Manchester", place: "United Kingdom" },
  { id: "mmegi", kind: "ARCHIVE RECORD", period: "26 JAN 2011", statement: "An early published academic record from the Rainbow High School years.", source: "Mmegi · Rainbow High School", place: "Botswana" },
];

export default function HomeProofCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = highlights[index];
  const countLabel = useMemo(() => `${String(index + 1).padStart(2, "0")} / ${String(highlights.length).padStart(2, "0")}`, [index]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (paused || media.matches) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % highlights.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const move = (direction: number) => setIndex((value) => (value + direction + highlights.length) % highlights.length);

  return (
    <div
      className="admin-proof-carousel"
      aria-roledescription="carousel"
      aria-label="Independent evidence highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="admin-proof-carousel-topline">
        <span>{current.kind}</span>
        <span>{current.period}</span>
      </div>

      <div className="admin-proof-carousel-stage" aria-live="polite">
        <p className="admin-proof-carousel-mark">“</p>
        {current.quote ? <blockquote>{current.quote}</blockquote> : <p className="admin-proof-carousel-statement">{current.statement}</p>}
        <div className="admin-proof-carousel-source">
          <strong>— {current.source}</strong>
          <span>{current.place}</span>
        </div>
      </div>

      <div className="admin-proof-carousel-controls">
        <div className="admin-proof-carousel-count" aria-label={`Highlight ${index + 1} of ${highlights.length}`}>{countLabel}</div>
        <div className="admin-proof-carousel-buttons">
          <button type="button" onClick={() => move(-1)} aria-label="Previous proof highlight">←</button>
          <button type="button" onClick={() => move(1)} aria-label="Next proof highlight">→</button>
          <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused} aria-label={paused ? "Resume automatic proof highlights" : "Pause automatic proof highlights"}>{paused ? "Play" : "Pause"}</button>
        </div>
      </div>

      <div className="admin-proof-carousel-footer">
        <p>Independent references from different countries, plus an early published record.</p>
        <Link className="admin-primary-button" href="/ayanda">Meet the founder <span>↗</span></Link>
      </div>
    </div>
  );
}
