import type { Metadata, Viewport } from "next";
import { Montserrat, Inter } from "next/font/google";
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

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sparkle Legacy Insurance Brokers",
    template: "%s | Sparkle Legacy Insurance Brokers",
  },
  description:
    "Sparkle Legacy Insurance Brokers offers clear, modern insurance support in Botswana with quote guidance, claims help, and trusted policy assistance.",
  applicationName: "Sparkle Legacy Insurance Brokers",
  keywords: [
    "Sparkle Legacy Insurance Brokers",
    "Botswana insurance",
    "insurance brokers Botswana",
    "insurance quotes Botswana",
    "claims support Botswana",
    "short term insurance",
    "long term insurance",
    "SME insurance Botswana",
  ],
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Sparkle Legacy Insurance Brokers",
    description:
      "A modern digital insurance platform for Botswana focused on trust, clarity, quotes, and claims support.",
    siteName: "Sparkle Legacy Insurance Brokers",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fcfbf7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${montserrat.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased"
      >
        <Loader />

        <AnalyticsProvider>
          <div className="flex min-h-screen flex-col">
            <div className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(255,253,249,0.88)] backdrop-blur-md">
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