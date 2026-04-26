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
          background: "#060a12",
        }}
      >
        <svg
          width="512"
          height="512"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="appBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b1220" />
              <stop offset="52%" stopColor="#101827" />
              <stop offset="100%" stopColor="#151f32" />
            </linearGradient>

            <linearGradient id="blueStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4da3ff" />
              <stop offset="100%" stopColor="#2f7dff" />
            </linearGradient>

            <linearGradient id="tealStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#69e3d7" />
              <stop offset="100%" stopColor="#18c7b8" />
            </linearGradient>

            <radialGradient id="softGlow" cx="50%" cy="46%" r="62%">
              <stop offset="0%" stopColor="#4da3ff" stopOpacity="0.34" />
              <stop offset="55%" stopColor="#2f7dff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#060a12" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="tealGlow" cx="72%" cy="22%" r="44%">
              <stop offset="0%" stopColor="#18c7b8" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#060a12" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="512" height="512" rx="118" fill="#060a12" />
          <rect x="28" y="28" width="456" height="456" rx="98" fill="url(#appBg)" />
          <rect x="28" y="28" width="456" height="456" rx="98" fill="url(#softGlow)" />
          <rect x="28" y="28" width="456" height="456" rx="98" fill="url(#tealGlow)" />

          <rect
            x="28"
            y="28"
            width="456"
            height="456"
            rx="98"
            fill="none"
            stroke="#94a3b8"
            strokeOpacity="0.18"
            strokeWidth="4"
          />

          <path
            d="M104 160H408"
            stroke="#94a3b8"
            strokeOpacity="0.1"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M104 256H408"
            stroke="#94a3b8"
            strokeOpacity="0.1"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M104 352H408"
            stroke="#94a3b8"
            strokeOpacity="0.1"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M160 104V408"
            stroke="#94a3b8"
            strokeOpacity="0.08"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M256 104V408"
            stroke="#94a3b8"
            strokeOpacity="0.08"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M352 104V408"
            stroke="#94a3b8"
            strokeOpacity="0.08"
            strokeWidth="5"
            strokeLinecap="round"
          />

          <circle
            cx="256"
            cy="256"
            r="118"
            fill="#0b1220"
            fillOpacity="0.58"
            stroke="url(#blueStroke)"
            strokeWidth="16"
          />
          <circle
            cx="256"
            cy="256"
            r="62"
            fill="#101827"
            stroke="url(#tealStroke)"
            strokeWidth="12"
          />

          <path
            d="M256 138V82"
            stroke="url(#blueStroke)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M256 430V374"
            stroke="url(#blueStroke)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M138 256H82"
            stroke="url(#blueStroke)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M430 256H374"
            stroke="url(#blueStroke)"
            strokeWidth="16"
            strokeLinecap="round"
          />

          <circle cx="256" cy="74" r="18" fill="#69e3d7" />
          <circle cx="256" cy="438" r="18" fill="#69e3d7" />
          <circle cx="74" cy="256" r="18" fill="#4da3ff" />
          <circle cx="438" cy="256" r="18" fill="#4da3ff" />

          <path
            d="M168 330L230 184H256L318 330"
            fill="none"
            stroke="#f4f7fb"
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M196 286H290"
            fill="none"
            stroke="#f4f7fb"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <path
            d="M338 184V330"
            fill="none"
            stroke="#f4f7fb"
            strokeWidth="24"
            strokeLinecap="round"
          />

          <path
            d="M388 108L400 134L426 146L400 158L388 184L376 158L350 146L376 134L388 108Z"
            fill="#69e3d7"
            opacity="0.94"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}