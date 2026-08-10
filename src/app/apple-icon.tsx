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
          background: "#fcfbf7",
        }}
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="goldApple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a4976a" />
              <stop offset="45%" stopColor="#887337" />
              <stop offset="100%" stopColor="#6f5d2b" />
            </linearGradient>

            <radialGradient id="haloApple" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fffdf8" />
              <stop offset="45%" stopColor="#efe7d4" />
              <stop offset="100%" stopColor="#e0d3af" />
            </radialGradient>
          </defs>

          <rect width="180" height="180" rx="42" fill="#fcfbf7" />
          <circle cx="90" cy="90" r="58" fill="url(#haloApple)" />

          <path
            d="M90 34c25 0 46 20 46 46 0 35-39 72-46 79-7-7-46-44-46-79 0-26 21-46 46-46Z"
            fill="url(#goldApple)"
            stroke="#fffdf8"
            strokeWidth="5"
          />

          <path
            d="M73 92l12 12 24-28"
            fill="none"
            stroke="#1f1a14"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}