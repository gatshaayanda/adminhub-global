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
  const target = Math.max(0, Math.round(value));
  const [display, setDisplay] = useState(0);
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target === 0) {
      setDisplay(target);
      hasAnimated.current = true;
      return;
    }

    const element = spanRef.current;
    if (!element || !("IntersectionObserver" in window)) {
      setDisplay(target);
      return;
    }

    let raf = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || hasAnimated.current) return;
      hasAnimated.current = true;
      element.classList.add("is-visible");
      observer.disconnect();

      let startedAt = 0;
      const duration = Math.min(720, Math.max(360, 320 + target * 4));
      const tick = (now: number) => {
        if (!startedAt) startedAt = now;
        const progress = Math.min(1, (now - startedAt) / duration);
        setDisplay(Math.round(target * easeOutCubic(progress)));
        if (progress < 1) raf = window.requestAnimationFrame(tick);
      };
      raf = window.requestAnimationFrame(tick);
    }, { threshold: 0.35 });

    observer.observe(element);
    return () => {
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [target]);

  return (
    <span ref={spanRef} className="boardsignal-proof-metric" aria-label={`${target} ${label}`}>
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
