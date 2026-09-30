import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
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
          background: "#f7f7f3",
        }}
      >
        <div
          style={{
            width: 420,
            height: 420,
            borderRadius: 112,
            background: "#111318",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 220,
              height: 220,
              borderRadius: 999,
              border: "3px solid #e65f25",
              opacity: 0.85,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 24,
              height: 24,
              borderRadius: 999,
              background: "#e65f25",
              top: 62,
              right: 62,
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: "#f7f7f3",
              fontFamily: "Arial",
              fontSize: 176,
              fontWeight: 800,
              letterSpacing: -18,
              lineHeight: 1,
              zIndex: 1,
            }}
          >
            AH
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 54,
              fontFamily: "Arial",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 7,
              color: "#f7f7f3",
              opacity: 0.72,
            }}
          >
            ADMIN HUB
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
