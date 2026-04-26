"use client";

import type React from "react";
import { useId } from "react";

type Props = React.SVGProps<SVGSVGElement>;

export default function LogoMkt(props: Props) {
  const id = useId().replace(/:/g, "");
  const blueGradId = `adminhub-blue-grad-${id}`;
  const tealGradId = `adminhub-teal-grad-${id}`;
  const glowId = `adminhub-glow-${id}`;
  const shineId = `adminhub-shine-${id}`;
  const shineMaskId = `adminhub-shine-mask-${id}`;

  return (
    <svg
      viewBox="0 0 360 64"
      role="img"
      aria-label="AdminHub Global Logo"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      className={`logo-fade ${props.className || ""}`}
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
          <stop offset="44%" stopColor="rgba(47,125,255,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>

        <linearGradient id={shineId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.78)">
            <animate
              attributeName="offset"
              values="-1; 2"
              dur="8s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        <mask id={shineMaskId}>
          <rect width="360" height="64" fill={`url(#${shineId})`} />
        </mask>
      </defs>

      <g transform="translate(36,32)" className="float drop-glow">
        <circle cx="0" cy="0" r="28" fill={`url(#${glowId})`} opacity="0.9" />

        <circle
          cx="0"
          cy="0"
          r="22"
          fill="rgba(11,18,32,0.94)"
          stroke={`url(#${blueGradId})`}
          strokeWidth="2.6"
        />

        <circle
          cx="0"
          cy="0"
          r="10"
          fill="rgba(16,24,39,0.96)"
          stroke={`url(#${tealGradId})`}
          strokeWidth="2.2"
        />

        <path
          d="M0 -22V-30"
          stroke={`url(#${blueGradId})`}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M0 30V22"
          stroke={`url(#${blueGradId})`}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M-22 0H-30"
          stroke={`url(#${blueGradId})`}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M30 0H22"
          stroke={`url(#${blueGradId})`}
          strokeWidth="3.4"
          strokeLinecap="round"
        />

        <circle cx="0" cy="-31" r="3.6" fill="#69e3d7" />
        <circle cx="0" cy="31" r="3.6" fill="#69e3d7" />
        <circle cx="-31" cy="0" r="3.6" fill="#4da3ff" />
        <circle cx="31" cy="0" r="3.6" fill="#4da3ff" />

        <path
          d="M-13.5 13.5L-5 -13H1.5L10 13.5"
          fill="none"
          stroke="var(--text-primary)"
          strokeWidth="3.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M-9 5H6"
          fill="none"
          stroke="var(--text-primary)"
          strokeWidth="3.8"
          strokeLinecap="round"
        />

        <path
          d="M15 -13V13.5"
          fill="none"
          stroke="var(--text-primary)"
          strokeWidth="3.8"
          strokeLinecap="round"
        />

        <circle
          cx="0"
          cy="0"
          r="22"
          fill={`url(#${shineId})`}
          mask={`url(#${shineMaskId})`}
          opacity="0.16"
        />
      </g>

      <text
        x="74"
        y="34"
        fill="var(--text-primary)"
        fontFamily="var(--font-sans)"
        fontWeight="900"
        fontSize="22"
        letterSpacing="-0.4"
        className="tracking-text"
      >
        AdminHub Global
      </text>

      <text
        x="74"
        y="52"
        fill="var(--brand-primary)"
        fontFamily="var(--font-sans)"
        fontWeight="800"
        fontSize="10.5"
        letterSpacing="1.75"
        className="subtle"
      >
        CUSTOM PWA OS • 9TH ITERATION
      </text>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        .float {
          animation: float 5.4s cubic-bezier(0.45, 0, 0.25, 1) infinite;
          transform-origin: center;
        }

        .drop-glow {
          filter: drop-shadow(0 8px 18px rgba(77, 163, 255, 0.18))
            drop-shadow(0 14px 26px rgba(24, 199, 184, 0.08));
          transition: filter 0.6s ease;
        }

        .drop-glow:hover {
          filter: drop-shadow(0 10px 22px rgba(77, 163, 255, 0.26))
            drop-shadow(0 18px 34px rgba(24, 199, 184, 0.12));
        }

        @keyframes textReveal {
          0% {
            opacity: 0;
            letter-spacing: 0.05em;
            transform: translateY(5px);
          }
          100% {
            opacity: 1;
            letter-spacing: -0.02em;
            transform: translateY(0);
          }
        }

        .tracking-text {
          animation: textReveal 0.95s cubic-bezier(0.45, 0, 0.25, 1) forwards;
        }

        @keyframes fadeInLogo {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .logo-fade {
          animation: fadeInLogo 0.55s ease-in forwards;
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