import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

import InstallPrompt from "@/components/InstallPrompt";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/AdminHubLoader";
import ChatWidget from "@/components/ChatWidget";
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
        <Loader />

        <AnalyticsProvider>
          <div className="flex min-h-screen flex-col bg-[var(--background)]">
            <div className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(6,10,18,0.82)] shadow-[0_10px_35px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <Header />
            </div>

            <main className="flex-1">{children}</main>

            <Footer />
          </div>

          <ServiceWorkerRegister />
          <InstallPrompt />
          <ChatWidget />
          <Analytics />
          <SpeedInsights />
        </AnalyticsProvider>
      </body>
    </html>
  );
}