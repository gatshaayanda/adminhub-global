import type {Metadata,Viewport} from "next";
import {Inter,Montserrat} from "next/font/google";
import "./globals.css";
import "./home.css";
import "./connected-home.css";
import AdminHubShell from "@/components/AdminHubShell";
import {AnalyticsProvider} from "@/components/AnalyticsProvider";
import {Analytics} from "@vercel/analytics/next";
import {SpeedInsights} from "@vercel/speed-insights/next";

const inter=Inter({variable:"--font-sans",subsets:["latin"],weight:["400","500","600","700","800"],display:"swap"});
const montserrat=Montserrat({variable:"--font-display",subsets:["latin"],weight:["500","600","700","800"],display:"swap"});

export const metadata:Metadata={
  icons:{icon:"/favicon.svg?v=4",apple:"/apple-icon?v=4"},
  metadataBase:new URL("https://www.adminhub-global.com"),
  title:{default:"Admin Hub Global | Interactive Operating Systems",template:"%s | Admin Hub Global"},
  description:"Explore two interactive operating systems from Admin Hub Global: B.O.S. for business and BACKPACK OS for everyday life. Try the live experiences, then make them yours.",
  applicationName:"Admin Hub Global",
  other:{"facebook-domain-verification":"q9f1ywe4owluxtxbz2yze0fzqyohw1"},
  keywords:["Admin Hub Global","BACKPACK OS","B.O.S.","Business Operating System","Personal Operating System","interactive operating systems","business operations","personal organisation","Botswana"],
  manifest:"/manifest.webmanifest",
  appleWebApp:{capable:true,title:"Admin Hub",statusBarStyle:"black-translucent"},
  openGraph:{
    title:"Admin Hub Global — Interactive Operating Systems",
    description:"Explore B.O.S. for business and BACKPACK OS for everyday life. Try the live experiences, then make them yours.",
    siteName:"Admin Hub Global",type:"website",url:"https://www.adminhub-global.com/"
  },
  twitter:{
    card:"summary_large_image",
    title:"Admin Hub Global — Interactive Operating Systems",
    description:"Explore B.O.S. for business and BACKPACK OS for everyday life."
  }
};

export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#ffffff"};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en" data-theme="light" className={inter.variable+" "+montserrat.variable} suppressHydrationWarning><body suppressHydrationWarning className="min-h-screen bg-white text-black font-sans antialiased"><AnalyticsProvider><AdminHubShell>{children}</AdminHubShell><Analytics/><SpeedInsights/></AnalyticsProvider></body></html>;
}
