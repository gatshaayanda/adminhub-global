import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Admin Hub",
    short_name: "Admin Hub",
    description:
      "Apps, games, products, and interactive experiences built for real use.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    background_color: "#f7f7f3",
    theme_color: "#f7f7f3",
    lang: "en",
    categories: ["business", "productivity", "entertainment"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Admin Hub",
        short_name: "Home",
        description: "Open the Admin Hub home.",
        url: "/",
        icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
      },
      {
        name: "Games",
        short_name: "Games",
        description: "Open Admin Hub Games.",
        url: "/games",
        icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
      },
      {
        name: "Apps",
        short_name: "Apps",
        description: "Open Admin Hub Apps.",
        url: "/apps",
        icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
      },
    ],
  };
}