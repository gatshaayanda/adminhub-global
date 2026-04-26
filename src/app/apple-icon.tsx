import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#060a12",
        }}
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="bgGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b1220" />
              <stop offset="100%" stopColor="#151f32" />
            </linearGradient>

            <linearGradient id="primaryStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4da3ff" />
              <stop offset="100%" stopColor="#2f7dff" />
            </linearGradient>

            <linearGradient id="accentStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#69e3d7" />
              <stop offset="100%" stopColor="#18c7b8" />
            </linearGradient>

            <radialGradient id="centerGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(77,163,255,0.32)" />
              <stop offset="100%" stopColor="rgba(77,163,255,0)" />
            </radialGradient>
          </defs>

          <rect width="180" height="180" rx="42" fill="#060a12" />
          <rect x="10" y="10" width="160" height="160" rx="36" fill="url(#bgGlow)" />
          <rect
            x="10"
            y="10"
            width="160"
            height="160"
            rx="36"
            fill="none"
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="2"
          />

          <circle cx="90" cy="90" r="52" fill="url(#centerGlow)" />

          <path
            d="M42 58H138"
            stroke="rgba(148,163,184,0.10)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M42 90H138"
            stroke="rgba(148,163,184,0.10)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M42 122H138"
            stroke="rgba(148,163,184,0.10)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M58 42V138"
            stroke="rgba(148,163,184,0.08)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M90 42V138"
            stroke="rgba(148,163,184,0.08)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M122 42V138"
            stroke="rgba(148,163,184,0.08)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          <circle cx="90" cy="90" r="34" fill="none" stroke="url(#primaryStroke)" strokeWidth="6" />
          <circle
            cx="90"
            cy="90"
            r="16"
            fill="#0b1220"
            stroke="url(#accentStroke)"
            strokeWidth="5"
          />

          <path
            d="M90 56V40"
            stroke="url(#primaryStroke)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M90 140V124"
            stroke="url(#primaryStroke)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M56 90H40"
            stroke="url(#primaryStroke)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M140 90H124"
            stroke="url(#primaryStroke)"
            strokeWidth="6"
            strokeLinecap="round"
          />

          <circle cx="90" cy="34" r="6" fill="#69e3d7" />
          <circle cx="90" cy="146" r="6" fill="#69e3d7" />
          <circle cx="34" cy="90" r="6" fill="#4da3ff" />
          <circle cx="146" cy="90" r="6" fill="#4da3ff" />

          <path
            d="M68 114L86 66H94L112 114"
            fill="none"
            stroke="#f4f7fb"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M75 98H105"
            fill="none"
            stroke="#f4f7fb"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M114 66V114"
            fill="none"
            stroke="#f4f7fb"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}