import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
          width="512"
          height="512"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a4976a" />
              <stop offset="45%" stopColor="#887337" />
              <stop offset="100%" stopColor="#6f5d2b" />
            </linearGradient>

            <radialGradient id="halo" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fffdf8" />
              <stop offset="45%" stopColor="#efe7d4" />
              <stop offset="100%" stopColor="#e0d3af" />
            </radialGradient>
          </defs>

          <rect width="512" height="512" rx="120" fill="#fcfbf7" />
          <circle cx="256" cy="256" r="172" fill="url(#halo)" />

          <path
            d="M256 92c73 0 132 59 132 132 0 100-110 204-132 224-22-20-132-124-132-224 0-73 59-132 132-132Z"
            fill="url(#gold)"
            stroke="#fffdf8"
            strokeWidth="12"
          />

          <path
            d="M206 262l34 35 67-78"
            fill="none"
            stroke="#1f1a14"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M355 140l10 22 22 10-22 10-10 22-10-22-22-10 22-10 10-22Z"
            fill="#a4976a"
            opacity="0.95"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}