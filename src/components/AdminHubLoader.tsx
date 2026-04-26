"use client";

import { useEffect, useState } from "react";

/**
 * AdminHub Global loader
 *
 * Premium dark operations/PWA loading overlay.
 * Preserves the existing loader timing and visibility logic.
 * Uses the locked AdminHub Global system:
 * - near-black command-center background
 * - electric blue / teal accents
 * - custom framework / operating-system feel
 * - subtle motion only
 */
export default function AdminHubLoader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fade = window.setTimeout(() => setFading(true), 1800);
    const hide = window.setTimeout(() => setVisible(false), 2550);

    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Loading AdminHub Global"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-[900ms] ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background: `
          radial-gradient(circle at 18% 10%, rgba(77, 163, 255, 0.18), transparent 32%),
          radial-gradient(circle at 82% 18%, rgba(24, 199, 184, 0.12), transparent 30%),
          radial-gradient(circle at 50% 100%, rgba(47, 125, 255, 0.08), transparent 35%),
          linear-gradient(180deg, #050814 0%, var(--background) 58%, #070b14 100%)
        `,
        isolation: "isolate",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-55 panel-grid" />
        <div className="absolute left-1/2 top-[12%] h-56 w-56 -translate-x-1/2 rounded-full bg-[rgba(77,163,255,0.14)] blur-3xl" />
        <div className="absolute bottom-[14%] left-[16%] h-32 w-32 rounded-full bg-[rgba(24,199,184,0.10)] blur-3xl" />
        <div className="absolute right-[12%] top-[24%] h-36 w-36 rounded-full bg-[rgba(47,125,255,0.14)] blur-3xl" />
      </div>

      <div className="relative mb-6 flex h-34 w-34 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.58)] shadow-[var(--shadow-lg)] backdrop-blur-xl" />
        <div className="absolute inset-[12px] rounded-full border border-[rgba(77,163,255,0.22)] bg-[linear-gradient(180deg,rgba(21,31,50,0.96)_0%,rgba(6,10,18,0.98)_100%)]" />
        <div className="absolute inset-[26px] rounded-full border border-[rgba(24,199,184,0.22)] bg-[rgba(77,163,255,0.08)]" />

        <svg
          viewBox="0 0 96 96"
          width="96"
          height="96"
          className="relative z-10 animate-float"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="hubBlue" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4da3ff" />
              <stop offset="100%" stopColor="#2f7dff" />
            </linearGradient>

            <linearGradient id="hubTeal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#69e3d7" />
              <stop offset="100%" stopColor="#18c7b8" />
            </linearGradient>

            <radialGradient id="hubGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#4da3ff" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#4da3ff" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="48" cy="48" r="36" fill="url(#hubGlow)" />

          <path
            d="M48 17V8"
            stroke="url(#hubBlue)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M48 88V79"
            stroke="url(#hubBlue)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M17 48H8"
            stroke="url(#hubBlue)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M88 48H79"
            stroke="url(#hubBlue)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          <circle
            cx="48"
            cy="48"
            r="27"
            fill="rgba(11,18,32,0.72)"
            stroke="url(#hubBlue)"
            strokeWidth="4"
          />

          <circle
            cx="48"
            cy="48"
            r="13"
            fill="rgba(16,24,39,0.96)"
            stroke="url(#hubTeal)"
            strokeWidth="3.6"
          />

          <circle cx="48" cy="8" r="4.4" fill="#69e3d7" />
          <circle cx="48" cy="88" r="4.4" fill="#69e3d7" />
          <circle cx="8" cy="48" r="4.4" fill="#4da3ff" />
          <circle cx="88" cy="48" r="4.4" fill="#4da3ff" />

          <path
            d="M29 65L42 32H48L61 65"
            fill="none"
            stroke="#f4f7fb"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M35 55H55"
            fill="none"
            stroke="#f4f7fb"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M65 32V65"
            fill="none"
            stroke="#f4f7fb"
            strokeWidth="5.5"
            strokeLinecap="round"
          />

          <g className="sparkle">
            <path
              d="M74 20l1.6 3.8 3.8 1.6-3.8 1.6L74 31l-1.6-4-3.8-1.6 3.8-1.6L74 20Z"
              fill="#69e3d7"
            />
          </g>
        </svg>
      </div>

      <div className="relative z-10 text-center">
        <div className="text-[0.78rem] font-extrabold uppercase tracking-[0.22em] text-[var(--brand-primary)] fade-up">
          AdminHub Global
        </div>

        <div className="mt-2 text-[1.55rem] font-extrabold tracking-[-0.04em] text-[var(--text-primary)] fade-up-delayed">
          Control System
        </div>

        <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] fade-up-delayed-2">
          agents • leads • clients • support
        </div>
      </div>

      <div className="relative z-10 mt-8 w-56">
        <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(148,163,184,0.12)]">
          <span className="loader-bar block h-full w-1/3 rounded-full" />
        </div>
      </div>

      <div className="relative z-10 mt-4 text-xs text-[var(--text-muted)]">
        Initializing your PWA workspace...
      </div>

      <style jsx>{`
        .loader-bar {
          background: linear-gradient(
            90deg,
            var(--brand-primary-strong) 0%,
            var(--brand-primary) 42%,
            var(--brand-secondary) 100%
          );
          box-shadow: 0 0 22px rgba(77, 163, 255, 0.34);
          animation: shimmer 2s cubic-bezier(0.45, 0, 0.25, 1) infinite;
        }

        .sparkle {
          animation: sparklePulse 2.8s ease-in-out infinite;
          transform-origin: center;
        }

        .fade-up {
          opacity: 0;
          animation: fadeUp 0.9s cubic-bezier(0.45, 0, 0.25, 1) 0.05s forwards;
        }

        .fade-up-delayed {
          opacity: 0;
          animation: fadeUp 0.9s cubic-bezier(0.45, 0, 0.25, 1) 0.2s forwards;
        }

        .fade-up-delayed-2 {
          opacity: 0;
          animation: fadeUp 0.9s cubic-bezier(0.45, 0, 0.25, 1) 0.35s forwards;
        }

        .animate-float {
          filter: drop-shadow(0 10px 24px rgba(77, 163, 255, 0.22));
          animation: float 4.2s cubic-bezier(0.45, 0, 0.25, 1) infinite;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-150%);
          }
          55% {
            transform: translateX(40%);
          }
          100% {
            transform: translateX(170%);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes fadeUp {
          0% {
            opacity: 0;
            transform: translateY(10px);
            letter-spacing: 0.28em;
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes sparklePulse {
          0%,
          100% {
            opacity: 0.68;
            transform: scale(0.96);
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}