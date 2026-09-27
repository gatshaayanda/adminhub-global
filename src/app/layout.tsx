import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

import AdminHubShell from "@/components/AdminHubShell";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AdminHub Global",
    template: "%s | AdminHub Global",
  },
  description:
    "AdminHub Global is a custom PWA operating system for managing agents, leads, client onboarding, project delivery, proposals, messaging, and recurring managed support.",
  applicationName: "AdminHub Global",
  other: {
    "facebook-domain-verification": "q9f1ywe4owluxtxbz2yze0fzqyohw1",
  },
  keywords: [
    "AdminHub Global",
    "AdminHub",
    "AdminHub Pty Ltd",
    "custom PWA framework",
    "business operations platform",
    "agent management",
    "client portal",
    "admin dashboard",
    "lead pipeline",
    "project delivery system",
    "48-hour live prototype",
    "managed support platform",
    "Next.js Firebase PWA",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "AdminHub Global",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "AdminHub Global",
    description:
      "A custom 9th-iteration PWA framework and operating platform for agent-led SME digital delivery, client portals, project workflows, and managed support.",
    siteName: "AdminHub Global",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AdminHub Global",
    description:
      "A custom PWA operating system for agents, leads, clients, projects, proposals, and recurring support.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#060a12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${montserrat.variable}`}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased"
      >
        <AnalyticsProvider>
          <AdminHubShell>{children}</AdminHubShell>
          <Analytics />
          <SpeedInsights />
        </AnalyticsProvider>
      </body>
    </html>
  );
}