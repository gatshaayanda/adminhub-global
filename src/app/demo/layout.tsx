import type { Metadata, Viewport } from "next";
import "./demo.css";

export const metadata: Metadata = {
  title: "Business Website Demo | AdminHub",
  description: "An interactive example of a small-business website and owner dashboard built with AdminHub.",
  applicationName: "AdminHub Business Demo",
  manifest: "/demo/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <section className="demo-shell">{children}</section>;
}
