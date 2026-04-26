"use client";

import type React from "react";
import { useId } from "react";

type Props = React.SVGProps<SVGSVGElement>;

export default function LogoMktMark(props: Props) {
  const id = useId().replace(/:/g, "");
  const blueGradId = `adminhub-mark-blue-${id}`;
  const tealGradId = `adminhub-mark-teal-${id}`;
  const glowId = `adminhub-mark-glow-${id}`;
  const sweepId = `adminhub-mark-sweep-${id}`;
  const sweepMaskId = `adminhub-mark-sweep-mask-${id}`;

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="AdminHub Global Mark"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      className={`mark-pulse ${props.className || ""}`}
    >
      <defs>
        <linearGradient id={blueGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4da3ff" />
          <stop offset="100%" stopColor="#2f7dff" />
        </linearGradient>

        <linearGradient id={tealGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#69e3d7" />
          <stop offset="100%" stopColor="#18c7b8" />
        </linearGradient>

        <radialGradient id={glowId} cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="rgba(77,163,255,0.42)" />
          <stop offset="45%" stopColor="rgba(47,125,255,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>

        <linearGradient id={sweepId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.72)">
            <animate
              attributeName="offset"
              values="-1; 2"
              dur="8s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        <mask id={sweepMaskId}>
          <rect width="64" height="64" fill={`url(#${sweepId})`} />
        </mask>
      </defs>

      <circle cx="32" cy="32" r="29" fill={`url(#${glowId})`} opacity="0.9" />

      <circle
        cx="32"
        cy="32"
        r="24"
        fill="rgba(11,18,32,0.96)"
        stroke={`url(#${blueGradId})`}
        strokeWidth="2.8"
      />

      <circle
        cx="32"
        cy="32"
        r="11"
        fill="rgba(16,24,39,0.98)"
        stroke={`url(#${tealGradId})`}
        strokeWidth="2.4"
      />

      <path
        d="M32 8V2.8"
        stroke={`url(#${blueGradId})`}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M32 61.2V56"
        stroke={`url(#${blueGradId})`}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M8 32H2.8"
        stroke={`url(#${blueGradId})`}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M61.2 32H56"
        stroke={`url(#${blueGradId})`}
        strokeWidth="3.4"
        strokeLinecap="round"
      />

      <circle cx="32" cy="2.8" r="3.2" fill="#69e3d7" />
      <circle cx="32" cy="61.2" r="3.2" fill="#69e3d7" />
      <circle cx="2.8" cy="32" r="3.2" fill="#4da3ff" />
      <circle cx="61.2" cy="32" r="3.2" fill="#4da3ff" />

      <path
        d="M19.4 44.5L27.8 19.5H34L42.6 44.5"
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth="3.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M23.5 36.4H38.7"
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth="3.9"
        strokeLinecap="round"
      />

      <path
        d="M47 19.5V44.5"
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth="3.9"
        strokeLinecap="round"
      />

      <circle
        cx="32"
        cy="32"
        r="24"
        fill={`url(#${sweepId})`}
        mask={`url(#${sweepMaskId})`}
        opacity="0.16"
      />

      <circle
        cx="32"
        cy="32"
        r="24"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />

      <style jsx>{`
        @keyframes pulseSoft {
          0%,
          100% {
            transform: scale(1);
            filter: drop-shadow(0 8px 14px rgba(77, 163, 255, 0.16))
              drop-shadow(0 12px 20px rgba(24, 199, 184, 0.08));
          }
          50% {
            transform: scale(1.035);
            filter: drop-shadow(0 10px 18px rgba(77, 163, 255, 0.24))
              drop-shadow(0 14px 26px rgba(24, 199, 184, 0.12));
          }
        }

        .mark-pulse {
          animation: pulseSoft 5.2s cubic-bezier(0.45, 0, 0.25, 1) infinite;
          transform-origin: center;
          transition: filter 0.6s ease;
        }

        .mark-pulse:hover {
          filter: drop-shadow(0 10px 20px rgba(77, 163, 255, 0.3))
            drop-shadow(0 14px 28px rgba(24, 199, 184, 0.16));
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </svg>
  );
}