import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
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
          background: "#f7f7f3",
        }}
      >
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: 38,
            background: "#111318",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 82,
              height: 82,
              borderRadius: 999,
              border: "2px solid #e65f25",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#e65f25",
              top: 20,
              right: 20,
            }}
          />
          <div
            style={{
              color: "#f7f7f3",
              fontFamily: "Arial",
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: -7,
              zIndex: 1,
            }}
          >
            AH
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
