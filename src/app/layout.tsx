import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

import InstallPrompt from "@/components/InstallPrompt";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Loader from "@/components/AdminHubLoader";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import AskBoardSignal from "@/components/AskBoardSignal";
import ConnectivityProvider from "@/components/ConnectivityProvider";
import PwaLaunchRedirect from "@/components/PwaLaunchRedirect";

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
    default: "BoardSignal — Your personal chess sports desk",
    template: "%s | BoardSignal",
  },
  description: "BoardSignal turns a fixed seven days of your Chess.com games into a factual sports story, a clear signal and a plan you can use.",
  applicationName: "BoardSignal",
  keywords: ["chess improvement", "Chess.com analysis", "weekly chess report", "chess insights", "BoardSignal"],
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "BoardSignal — Your games, covered like sport",
    description: "A personal sports desk for everyday chess players.",
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
        <script dangerouslySetInnerHTML={{ __html: boardSignalThemeBootstrap }} />
      </head>
      <body suppressHydrationWarning>
        <Loader />
        <AnalyticsProvider>
          <ConnectivityProvider>
          <div className="site-frame">
            <Header />
            <main className="site-main">{children}</main>
            <Footer />
          </div>
          <ServiceWorkerRegister />
          <InstallPrompt />
          <PwaLaunchRedirect />
          <AskBoardSignal />
          <Analytics />
          <SpeedInsights />
          </ConnectivityProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}

