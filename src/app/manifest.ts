import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/boardsignal",
    name: "BoardSignal — Personal Chess Sports Desk",
    short_name: "BoardSignal",
    description: "A personal sports desk for everyday Chess.com players.",
    start_url: "/boardsignal?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    background_color: "#f4f0e7",
    theme_color: "#101923",
    lang: "en",
    categories: ["sports", "education", "productivity"],
    icons: [
      { src: "/icons/boardsignal-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/boardsignal-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/boardsignal-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Player Room", short_name: "Player Room", url: "/boardsignal/player-room", icons: [{ src: "/icons/boardsignal-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Universe", short_name: "Universe", url: "/boardsignal", icons: [{ src: "/icons/boardsignal-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Inbox", short_name: "Inbox", url: "/boardsignal/player-room?tab=inbox", icons: [{ src: "/icons/boardsignal-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Friends", short_name: "Friends", url: "/boardsignal/player-room?tab=friends", icons: [{ src: "/icons/boardsignal-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
