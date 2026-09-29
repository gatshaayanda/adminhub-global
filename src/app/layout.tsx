import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import "./home.css";
import AdminHubShell from "@/components/AdminHubShell";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter=Inter({variable:"--font-sans",subsets:["latin"],weight:["400","500","600","700","800"],display:"swap"});
const montserrat=Montserrat({variable:"--font-display",subsets:["latin"],weight:["500","600","700","800"],display:"swap"});

export const metadata:Metadata={
  title:{default:"AdminHub Global",template:"%s | AdminHub Global"},
  description:"Admin Hub builds custom business apps, browser games and interactive digital products for real users.",
  applicationName:"AdminHub Global",
  other:{"facebook-domain-verification":"q9f1ywe4owluxtxbz2yze0fzqyohw1"},
  keywords:["Admin Hub","custom business apps","business apps Botswana","browser games Botswana","mobile games","interactive experiences","custom software"],
  manifest:"/manifest.webmanifest",
  appleWebApp:{capable:true,title:"AdminHub Global",statusBarStyle:"black-translucent"},
  openGraph:{title:"Admin Hub — Apps + Games",description:"Get your own business app or interactive game built. Botswana · Remote / International.",siteName:"AdminHub Global",type:"website"},
  twitter:{card:"summary_large_image",title:"Admin Hub — Apps + Games",description:"Custom business apps, browser games and interactive experiences."}
};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#05070b"};

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="en" data-theme="dark" className={inter.variable+" "+montserrat.variable} suppressHydrationWarning><body suppressHydrationWarning className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased"><AnalyticsProvider><AdminHubShell>{children}</AdminHubShell><Analytics/><SpeedInsights/></AnalyticsProvider></body></html>;
}
