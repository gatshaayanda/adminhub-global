import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import "./boardsignal-system.css";

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ConnectivityProvider from "@/components/ConnectivityProvider";
import RouteAwarePublicChrome from "@/components/RouteAwarePublicChrome";

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
    default: "BoardSignal — Your personal chess improvement companion",
    template: "%s | BoardSignal",
  },
  description: "BoardSignal is your personal chess improvement companion: understand what's happening in your chess as you play, know what to work on next, and keep completed Reviews as your history.",
  applicationName: "BoardSignal",
  keywords: ["chess improvement", "Chess.com analysis", "personal chess improvement companion", "chess guidance", "chess progress", "BoardSignal"],
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "BoardSignal — Your personal chess improvement companion",
    description: "Understand what's happening in your chess as you play — and know what to work on next.",
    siteName: "BoardSignal",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f0e7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

const boardSignalThemeBootstrap = `(() => {
  const key = "boardsignal:theme";
  let choice = "system";
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === "light" || stored === "dark" || stored === "system") choice = stored;
  } catch {}
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.dataset.bsTheme = dark ? "dark" : "light";
  root.dataset.bsThemeChoice = choice;
  root.style.colorScheme = dark ? "dark" : "light";
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <meta name="trustpilot-one-time-domain-verification-id" content="88f344e5-4f9b-4089-b887-1fb2bdbababb" />
        <script dangerouslySetInnerHTML={{ __html: boardSignalThemeBootstrap }} />
      </head>
      <body suppressHydrationWarning>
        <AnalyticsProvider>
          <ConnectivityProvider>
            <RouteAwarePublicChrome>{children}</RouteAwarePublicChrome>
            <ServiceWorkerRegister />
            <Analytics />
            <SpeedInsights />
          </ConnectivityProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
