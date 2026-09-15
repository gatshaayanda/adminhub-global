import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "AdminHub Business Demo",
    short_name: "Business Demo",
    description: "Interactive small-business website and owner dashboard demo.",
    start_url: "/demo",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#172033",
    icons: [
      { src: "/icons/boardsignal-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/boardsignal-512.png", sizes: "512x512", type: "image/png" },
    ],
  }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
