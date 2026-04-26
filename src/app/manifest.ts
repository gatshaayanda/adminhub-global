import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AdminHub Global",
    short_name: "AH Global",
    description:
      "A custom PWA operating system for managing agents, leads, client onboarding, project delivery, proposals, messaging, and recurring managed support.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    background_color: "#060a12",
    theme_color: "#060a12",
    lang: "en",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
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
      },
    ],
    shortcuts: [
      {
        name: "AdminHub Global Control",
        short_name: "Control",
        description: "Open the AdminHub Global command dashboard.",
        url: "/admin/dashboard",
        icons: [
          {
            src: "/icon",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      {
        name: "Partner Portal",
        short_name: "Partners",
        description: "Open the partner and agent workspace.",
        url: "/partners",
        icons: [
          {
            src: "/icon",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      {
        name: "Client Hub",
        short_name: "Client Hub",
        description: "Open the client project portal.",
        url: "/client/dashboard",
        icons: [
          {
            src: "/icon",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    ],
  };
}