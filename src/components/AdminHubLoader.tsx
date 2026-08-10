"use client";

import { useEffect, useState } from "react";

/**
 * Sparkle Legacy loader
 *
 * Light-first, premium, insurance-appropriate loading overlay.
 * Uses the locked brand system:
 * - ivory / white surface
 * - warm gold accents
 * - strong dark text
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
      aria-label="Loading Sparkle Legacy Insurance Brokers"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-[900ms] ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background: `
          radial-gradient(circle at top, rgba(234, 227, 207, 0.6), transparent 30%),
          linear-gradient(180deg, #fffdf9 0%, var(--background) 100%)
        `,
        isolation: "isolate",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[14%] h-44 w-44 -translate-x-1/2 rounded-full bg-[rgba(136,115,55,0.10)] blur-3xl" />
        <div className="absolute bottom-[16%] left-[18%] h-24 w-24 rounded-full bg-[rgba(164,151,106,0.08)] blur-3xl" />
        <div className="absolute right-[14%] top-[24%] h-28 w-28 rounded-full bg-[rgba(205,191,149,0.12)] blur-3xl" />
      </div>

      <div className="relative mb-6 flex h-32 w-32 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-[var(--border)] bg-white/55 backdrop-blur-sm shadow-[var(--shadow-md)]" />
        <div className="absolute inset-[14px] rounded-full border border-[rgba(136,115,55,0.18)] bg-[linear-gradient(180deg,#fffefb_0%,#f7f1e4_100%)]" />

        <svg
          viewBox="0 0 80 80"
          width="88"
          height="88"
          className="relative z-10 animate-float"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="shieldFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fffdf8" />
              <stop offset="100%" stopColor="#eae3cf" />
            </linearGradient>

            <linearGradient id="shieldStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a4976a" />
              <stop offset="100%" stopColor="#6f5d2b" />
            </linearGradient>

            <linearGradient id="checkStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#887337" />
              <stop offset="100%" stopColor="#6f5d2b" />
            </linearGradient>
          </defs>

          <path
            d="M40 9.5c10.4 0 18.8 8.1 18.8 18.4 0 13.8-15.6 28.5-18.8 31.3-3.2-2.8-18.8-17.5-18.8-31.3C21.2 17.6 29.6 9.5 40 9.5Z"
            fill="url(#shieldFill)"
            stroke="url(#shieldStroke)"
            strokeWidth="1.8"
          />

          <path
            d="M31.8 39.5l6 6.3L49.6 31"
            fill="none"
            stroke="url(#checkStroke)"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M28.8 28.8c3.1-3.7 7-5.7 11.2-5.7 4.3 0 8.1 2 11.2 5.7"
            fill="none"
            stroke="rgba(23,20,17,0.18)"
            strokeWidth="1.25"
            strokeLinecap="round"
          />

          <g className="sparkle">
            <path
              d="M59.5 20.2l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2 1.2-2.8Z"
              fill="#a4976a"
            />
          </g>
        </svg>
      </div>

      <div className="relative z-10 text-center">
        <div className="text-[0.78rem] font-extrabold uppercase tracking-[0.22em] text-[var(--brand-primary-strong)] fade-up">
          Sparkle Legacy
        </div>

        <div className="mt-2 text-[1.55rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)] fade-up-delayed">
          Insurance Brokers
        </div>

        <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)] fade-up-delayed-2">
          quotes • claims • policy support
        </div>
      </div>

      <div className="relative z-10 mt-8 w-52">
        <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(136,115,55,0.10)]">
          <span className="loader-bar block h-full w-1/3 rounded-full" />
        </div>
      </div>

      <div className="relative z-10 mt-4 text-xs text-[var(--text-muted)]">
        Preparing your secure experience...
      </div>

      <style jsx>{`
        .loader-bar {
          background: linear-gradient(
            90deg,
            var(--brand-primary) 0%,
            var(--brand-secondary) 50%,
            var(--brand-primary-strong) 100%
          );
          box-shadow: 0 0 18px rgba(111, 93, 43, 0.22);
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
          filter: drop-shadow(0 8px 18px rgba(111, 93, 43, 0.14));
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
            opacity: 0.7;
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