"use client";

import { useEffect, useRef, useState } from "react";

type LiveProof = {
  playersServed: number;
  reviewsProduced: number;
  returningPlayers: number;
  reviewsForming: number;
};

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function AnimatedMetric({ value, label }: { value: number; label: string }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  const spanRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const target = Math.max(0, Math.round(value));
    const startValue = Math.max(0, Math.round(previous.current));
    previous.current = target;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || startValue === target) {
      setDisplay(target);
      return;
    }

    let raf = 0;
    let startedAt = 0;
    const duration = 520;
    const start = Math.min(startValue, target);

    const tick = (now: number) => {
      if (!startedAt) startedAt = now;
      const progress = Math.min(1, (now - startedAt) / duration);
      const next = Math.round(start + (target - start) * easeOutCubic(progress));
      setDisplay(next);
      if (progress < 1) raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [value]);

  useEffect(() => {
    const element = spanRef.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      element.classList.add("is-visible");
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={spanRef} className="boardsignal-proof-metric" aria-label={`${value} ${label}`}>
      <strong aria-hidden="true">{display}</strong>
      <span>{label}</span>
    </span>
  );
}

export default function BoardSignalLiveProof({ proof }: { proof: LiveProof }) {
  return (
    <div className="boardsignal-live-proof" aria-label="BoardSignal product activity">
      <div className="boardsignal-live-proof-heading">
        <p className="kicker">LIVE PRODUCT ACTIVITY</p>
        <span>Updated from BoardSignal itself</span>
      </div>
      <div className="boardsignal-live-proof-grid">
        <AnimatedMetric value={proof.playersServed} label="Players served" />
        <AnimatedMetric value={proof.reviewsProduced} label="Reviews produced" />
        <AnimatedMetric value={proof.returningPlayers} label="Returning players" />
        <AnimatedMetric value={proof.reviewsForming} label="Reviews forming" />
      </div>
      <small>Real BoardSignal activity only — not visitors, page views or traffic counts.</small>
    </div>
  );
}
