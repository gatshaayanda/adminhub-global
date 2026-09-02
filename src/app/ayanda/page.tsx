import type { Metadata, Viewport } from "next";
import AyandaPortfolioClient from "@/components/ayanda/AyandaPortfolioClient";
import { ayandaPortfolio } from "@/data/ayandaPortfolio";

const title = "Ayanda Kopano Gatsha — Technical Operations & Product Systems Specialist";
const description =
  "Technical operations, product systems and business operations professional with 10+ years of international experience across SaaS operations, customer support and success, product development, automation and technical troubleshooting.";
const canonical = "https://www.adminhub-global.com/ayanda";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  applicationName: "Ayanda Kopano Gatsha",
  manifest: null,
  alternates: { canonical },
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description: "Technical Operations · Product Systems · Customer Success · Founder & Product Operator.",
    url: canonical,
    siteName: "Ayanda Kopano Gatsha",
    type: "profile",
    images: [{ url: "/ayanda/opengraph-image", width: 1200, height: 630, alt: "Ayanda Kopano Gatsha — Technical Operations and Product Systems" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: "Technical Operations · Product Systems · Customer Success.",
    images: ["/ayanda/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f2ea",
  colorScheme: "light",
};

const profilePageJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  url: canonical,
  name: title,
  description,
  mainEntity: {
    "@type": "Person",
    name: ayandaPortfolio.profile.name,
    jobTitle: "Technical Operations & Product Systems Specialist",
    description: "Technical operations, product systems, customer success and SaaS operations professional; Founder and Product Operator of BoardSignal V1.",
    knowsAbout: [
      "Technical Operations",
      "Product Operations",
      "SaaS Operations",
      "Customer Support",
      "Customer Success",
      "Product Systems",
      "Next.js",
      "TypeScript",
      "Firebase",
    ],
    sameAs: [ayandaPortfolio.contact.linkedin, ayandaPortfolio.contact.github],
  },
};

export default function AyandaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profilePageJsonLd).replace(/</g, "\\u003c") }}
      />
      <AyandaPortfolioClient />
    </>
  );
}
