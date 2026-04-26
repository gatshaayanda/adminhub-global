"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import jsPDF from "jspdf";

import { firestore } from "@/utils/firebaseConfig";
import {
  BadgeDollarSign,
  Bot,
  BriefcaseBusiness,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Globe2,
  LayoutDashboard,
  MessageCircle,
  Network,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  WifiOff,
  Workflow,
} from "lucide-react";

const PRODUCT_CACHE_KEY = "adminhub_global_service_packages_v1";

type ServiceCategory =
  | "rapid-proof"
  | "business-pwa"
  | "operations-pwa"
  | "partner-led-sales"
  | "client-hub"
  | "managed-support"
  | "proposal-tools"
  | "agent-operations"
  | "custom-framework";

type ServicePackage = {
  id: string;
  name: string;
  category: ServiceCategory;
  summary?: string;
  bullets?: string[];
  whatItCovers?: string[];
  whoItsFor?: string[];
  keyNotes?: string[];
  active?: boolean;
  order?: number;
};

type ProductCachePayload = {
  savedAt: string;
  categories: Partial<Record<ServiceCategory, ServicePackage[]>>;
};

const VALID_CATEGORIES: ServiceCategory[] = [
  "rapid-proof",
  "business-pwa",
  "operations-pwa",
  "partner-led-sales",
  "client-hub",
  "managed-support",
  "proposal-tools",
  "agent-operations",
  "custom-framework",
];

const CATEGORY_META: Record<
  ServiceCategory,
  {
    title: string;
    subtitle: string;
    eyebrow: string;
    icon: ReactNode;
    ctaLabel: string;
    helperTitle: string;
    helperCopy: string;
  }
> = {
  "rapid-proof": {
    title: "48-Hour Live Proof",
    subtitle:
      "A rapid proof process that turns a short intake or company profile into a live preliminary PWA direction before moving into full implementation.",
    eyebrow: "Rapid proof-to-deposit model",
    icon: <Clock3 size={18} />,
    ctaLabel: "Submit Proof Sprint Inquiry",
    helperTitle: "Why this matters",
    helperCopy:
      "Prospects do not need to imagine the solution. They can see a working direction quickly, making it easier to understand the value before moving into a full build and managed support.",
  },
  "business-pwa": {
    title: "Business PWA Systems",
    subtitle:
      "Custom PWA builds for service businesses that need more than a brochure website, including dashboards, portals, messaging, uploads, and managed workflows.",
    eyebrow: "For structured service businesses",
    icon: <LayoutDashboard size={18} />,
    ctaLabel: "Submit Business PWA Inquiry",
    helperTitle: "Best use case",
    helperCopy:
      "This is best for SMEs that need a public website plus practical business infrastructure: admin tools, client portals, project visibility, files, messaging, and support continuity.",
  },
  "operations-pwa": {
    title: "Operations PWA Builds",
    subtitle:
      "Workflow-heavy custom systems for businesses that manage cases, onboarding, files, requests, clients, approvals, project stages, or recurring support.",
    eyebrow: "Built for business operations",
    icon: <Workflow size={18} />,
    ctaLabel: "Submit Operations PWA Inquiry",
    helperTitle: "When this is the right fit",
    helperCopy:
      "This tier is for businesses that have outgrown basic pages and need digital infrastructure around how work actually moves through the business.",
  },
  "partner-led-sales": {
    title: "Partner-Led Sales",
    subtitle:
      "A sales partner model built around a clearer B2B offer, visible proof, lead attribution, project conversion, and recurring managed support potential.",
    eyebrow: "For agents and sales partners",
    icon: <Users size={18} />,
    ctaLabel: "Submit Partner Inquiry",
    helperTitle: "Agent advantage",
    helperCopy:
      "Agents are not selling a vague web design promise. They can position a visible 48-hour proof stage, then help move qualified prospects toward implementation and managed support.",
  },
  "client-hub": {
    title: "Client Hub",
    subtitle:
      "The client-facing workspace for project updates, onboarding requests, messages, uploaded files, support visibility, and post-launch continuity.",
    eyebrow: "Client-facing project workspace",
    icon: <BriefcaseBusiness size={18} />,
    ctaLabel: "Request Client Hub Access",
    helperTitle: "Client experience",
    helperCopy:
      "The Client Hub helps clients stay connected to the project after the sale, reducing scattered communication and giving them a clearer place for updates, files, messages, and support.",
  },
  "managed-support": {
    title: "Managed Support",
    subtitle:
      "Recurring monthly support for launched projects, including updates, fixes, content/system changes, portal continuity, and ongoing framework-backed improvement.",
    eyebrow: "After launch continuity",
    icon: <ShieldCheck size={18} />,
    ctaLabel: "Submit Support Inquiry",
    helperTitle: "Recurring value",
    helperCopy:
      "AdminHub Global should not be treated as a one-off website sale. Managed support keeps the system useful after launch and creates a stronger long-term client relationship.",
  },
  "proposal-tools": {
    title: "Proposal & PDF Tools",
    subtitle:
      "Reusable proposal, scope, catalog, onboarding summary, and project document tools that support both sales and delivery workflows.",
    eyebrow: "Sales and delivery documents",
    icon: <FileText size={18} />,
    ctaLabel: "Submit Proposal Tool Inquiry",
    helperTitle: "Why PDFs matter",
    helperCopy:
      "PDF outputs help turn platform activity into professional documents: proof summaries, scope notes, proposal sheets, onboarding summaries, and client-safe project reports.",
  },
  "agent-operations": {
    title: "Agent Operations",
    subtitle:
      "Operational tooling for managing agents, submitted leads, lead status, attribution, commissions, payouts, notes, and partner activity.",
    eyebrow: "Partner operations layer",
    icon: <BadgeDollarSign size={18} />,
    ctaLabel: "Submit Agent Operations Inquiry",
    helperTitle: "Partner management",
    helperCopy:
      "AdminHub Global should help track who brought a lead, what stage it is in, whether it converted, and what commission or payout status applies.",
  },
  "custom-framework": {
    title: "Custom Framework",
    subtitle:
      "A custom 9th-iteration Next.js, TailwindCSS, Firebase, UploadThing, and PWA delivery framework built for dashboards, portals, workflows, files, PDFs, and support.",
    eyebrow: "Not boxed into a page builder",
    icon: <Network size={18} />,
    ctaLabel: "Submit Framework Inquiry",
    helperTitle: "Custom versus DIY builder",
    helperCopy:
      "DIY builders help people assemble websites. AdminHub’s custom framework supports deeper business workflows, portals, dashboards, messaging, uploads, PDFs, and automation beyond standard brochure-site tooling.",
  },
};

const LOGO_PATH = "/logo.png";

const BRAND = {
  blue: [77, 163, 255] as [number, number, number],
  blueDeep: [47, 125, 255] as [number, number, number],
  teal: [24, 199, 184] as [number, number, number],
  navy: [6, 10, 18] as [number, number, number],
  surface: [15, 23, 42] as [number, number, number],
  softSurface: [21, 31, 50] as [number, number, number],
  text: [244, 247, 251] as [number, number, number],
  darkText: [24, 24, 27] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  lightMuted: [203, 213, 225] as [number, number, number],
};

function readProductCache(): ProductCachePayload | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(PRODUCT_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ProductCachePayload;

    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.categories || typeof parsed.categories !== "object") return null;

    return parsed;
  } catch {
    return null;
  }
}

function getCachedProducts(category: ServiceCategory) {
  const cached = readProductCache();
  const products = cached?.categories?.[category];

  return {
    products: Array.isArray(products) ? products : [],
    savedAt: cached?.savedAt || "",
  };
}

function saveProductsToCache(
  category: ServiceCategory,
  products: ServicePackage[]
) {
  if (typeof window === "undefined") return;

  try {
    const existing = readProductCache();

    const payload: ProductCachePayload = {
      savedAt: new Date().toISOString(),
      categories: {
        ...(existing?.categories || {}),
        [category]: products,
      },
    };

    localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Could not save service packages for offline use:", error);
  }
}

function formatCacheTime(value?: string) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("en-BW", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

async function loadImageAsDataUrl(src: string) {
  try {
    const response = await fetch(src);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Could not load PDF logo:", error);
    return "";
  }
}

function cleanPdfText(value: unknown) {
  const text =
    value && value.toString().trim().length > 0
      ? value.toString().trim()
      : "-";

  return text
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[•]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function pdfFileName(value: string) {
  const safeName = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

  return `adminhub-global-${safeName || "solution-guide"}.pdf`;
}

async function generateServicePdf({
  title,
  subtitle,
  helperTitle,
  helperCopy,
  products,
  singleProduct,
}: {
  title: string;
  subtitle: string;
  helperTitle: string;
  helperCopy: string;
  products: ServicePackage[];
  singleProduct?: ServicePackage;
}) {
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const marginX = 16;
  const maxWidth = pageWidth - marginX * 2;
  let y = 14;

  const logoDataUrl = await loadImageAsDataUrl(LOGO_PATH);

  const addPageIfNeeded = (needed = 18) => {
    if (y + needed > pageHeight - 24) {
      pdf.addPage();
      y = 18;
    }
  };

  const addFooter = () => {
    const pageCount = pdf.getNumberOfPages();

    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);

      pdf.setDrawColor(...BRAND.blue);
      pdf.setLineWidth(0.3);
      pdf.line(marginX, pageHeight - 18, pageWidth - marginX, pageHeight - 18);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...BRAND.muted);

      pdf.text(
        "AdminHub Global | Custom 9th-iteration PWA framework | Structured inquiry required for private follow-up",
        marginX,
        pageHeight - 12
      );

      pdf.text(
        "No direct personal phone or email details are published in this document.",
        marginX,
        pageHeight - 8
      );

      pdf.text(
        `Page ${page} of ${pageCount}`,
        pageWidth - marginX - 22,
        pageHeight - 8
      );
    }
  };

  const addSectionTitle = (sectionTitle: string) => {
    addPageIfNeeded(18);

    y += 3;

    pdf.setFillColor(...BRAND.blueDeep);
    pdf.roundedRect(marginX, y, maxWidth, 9, 2, 2, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(sectionTitle.toUpperCase(), marginX + 4, y + 6.2);

    y += 14;
  };

  const addField = (label: string, value: unknown) => {
    const cleanValue = cleanPdfText(value);
    const lines = pdf.splitTextToSize(cleanValue, maxWidth - 8);
    const neededHeight = 12 + lines.length * 5;

    addPageIfNeeded(neededHeight);

    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(marginX, y, maxWidth, neededHeight, 2, 2, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...BRAND.blueDeep);
    pdf.text(label.toUpperCase(), marginX + 4, y + 5.5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...BRAND.darkText);
    pdf.text(lines, marginX + 4, y + 11);

    y += neededHeight + 3;
  };

  const addList = (listTitle: string, items?: string[]) => {
    if (!items?.length) return;

    addPageIfNeeded(16);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...BRAND.blueDeep);
    pdf.text(listTitle.toUpperCase(), marginX, y);

    y += 5;

    items.forEach((item) => {
      const cleanItem = `- ${cleanPdfText(item)}`;
      const lines = pdf.splitTextToSize(cleanItem, maxWidth);

      addPageIfNeeded(lines.length * 5 + 4);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(...BRAND.darkText);
      pdf.text(lines, marginX, y);

      y += lines.length * 5 + 2;
    });

    y += 2;
  };

  pdf.setFillColor(...BRAND.navy);
  pdf.rect(0, 0, pageWidth, 62, "F");

  pdf.setFillColor(...BRAND.surface);
  pdf.roundedRect(marginX, 10, maxWidth, 42, 4, 4, "F");

  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, "PNG", 55, 13, 100, 30);
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(...BRAND.text);
    pdf.text("ADMINHUB GLOBAL", pageWidth / 2, 25, { align: "center" });

    pdf.setFontSize(8.5);
    pdf.setTextColor(...BRAND.blue);
    pdf.text("CUSTOM PWA OS - 9TH ITERATION", pageWidth / 2, 32, {
      align: "center",
    });
  }

  y = 66;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(...BRAND.darkText);
  pdf.text(
    singleProduct ? "Solution Information Sheet" : "AdminHub Global Solution Guide",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(
    "Generated from the AdminHub Global platform. Use the structured inquiry flow before private follow-up.",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 7;

  pdf.setDrawColor(...BRAND.blue);
  pdf.setLineWidth(0.7);
  pdf.line(marginX, y, pageWidth - marginX, y);

  y += 8;

  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(marginX, y, maxWidth, 30, 3, 3, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...BRAND.darkText);
  pdf.text(cleanPdfText(singleProduct?.name || title), marginX + 5, y + 8);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...BRAND.muted);

  const subtitleLines = pdf.splitTextToSize(
    cleanPdfText(singleProduct?.summary || subtitle),
    maxWidth - 10
  );
  pdf.text(subtitleLines.slice(0, 3), marginX + 5, y + 15);

  y += 40;

  addSectionTitle("Inquiry & Follow-Up");
  addField("Public Contact Policy", "Direct personal phone and email details are intentionally not displayed publicly.");
  addField(
    "Next Step",
    "Submit a structured inquiry with your name, business or organisation, region, role, and project context. AdminHub can then review the request and follow up privately."
  );

  addSectionTitle(singleProduct ? "Solution Overview" : "Category Overview");
  addField("Title", singleProduct?.name || title);
  addField("Summary", singleProduct?.summary || subtitle);
  addField(helperTitle, helperCopy);

  const productList = singleProduct ? [singleProduct] : products;

  addSectionTitle(singleProduct ? "Solution Details" : "Available Packages");

  if (productList.length === 0) {
    addField(
      "No Packages Listed Yet",
      "This solution area has not been fully populated yet. Submit a structured inquiry with your project context so AdminHub can review the best next step."
    );
  }

  productList.forEach((product, index) => {
    addPageIfNeeded(30);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...BRAND.darkText);
    pdf.text(`${index + 1}. ${cleanPdfText(product.name)}`, marginX, y);

    y += 6;

    if (product.summary) {
      const summaryLines = pdf.splitTextToSize(
        cleanPdfText(product.summary),
        maxWidth
      );
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(...BRAND.muted);
      pdf.text(summaryLines, marginX, y);
      y += summaryLines.length * 5 + 4;
    }

    addList("Key points", product.bullets);
    addList("What it includes", product.whatItCovers);
    addList("Who it is for", product.whoItsFor);
    addList("Important notes", product.keyNotes);

    y += 4;
  });

  addSectionTitle("Important Note");
  addField(
    "Disclaimer",
    "This document is for general AdminHub Global service guidance only. Final scope, pricing, timelines, support terms, implementation depth, and technical decisions depend on the submitted inquiry, project requirements, available assets, and approved implementation agreement."
  );

  addFooter();

  pdf.save(pdfFileName(singleProduct?.name || title));
}

function DetailList({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items?.length) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
        {title}
      </p>
      <ul className="mt-2 space-y-2">
        {items.slice(0, 5).map((item, idx) => (
          <li
            key={`${title}-${idx}`}
            className="flex gap-2 text-sm leading-7 text-[var(--text-secondary)]"
          >
            <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-primary)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CategoryPage() {
  const params = useParams<{ category: string }>();
  const raw = (params?.category || "").toLowerCase();

  const category = (
    VALID_CATEGORIES.includes(raw as ServiceCategory)
      ? (raw as ServiceCategory)
      : "rapid-proof"
  ) as ServiceCategory;

  const meta = useMemo(() => CATEGORY_META[category], [category]);

  const [items, setItems] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [cacheSavedAt, setCacheSavedAt] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadProducts() {
      const cached = getCachedProducts(category);

      if (cached.products.length > 0) {
        setItems(cached.products);
        setUsingCachedData(true);
        setCacheSavedAt(cached.savedAt);
        setLoading(false);
      } else {
        setItems([]);
        setUsingCachedData(false);
        setCacheSavedAt("");
        setLoading(true);
      }

      try {
        const qRef = query(
          collection(firestore, "service_packages"),
          where("category", "==", category)
        );

        const snap = await getDocs(qRef);

        if (!alive) return;

        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Record<string, unknown>),
        })) as ServicePackage[];

        const cleaned = data
          .filter((p) => p.active !== false)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

        setItems(cleaned);
        setUsingCachedData(false);
        setCacheSavedAt(new Date().toISOString());
        saveProductsToCache(category, cleaned);
      } catch (error) {
        console.error("Load AdminHub Global service packages failed:", error);

        if (!alive) return;

        const fallback = getCachedProducts(category);

        if (fallback.products.length > 0) {
          setItems(fallback.products);
          setUsingCachedData(true);
          setCacheSavedAt(fallback.savedAt);
        } else {
          setItems([]);
          setUsingCachedData(false);
          setCacheSavedAt("");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadProducts();

    return () => {
      alive = false;
    };
  }, [category]);

  const handleDownloadCategoryPdf = async () => {
    setDownloadingPdf(true);

    try {
      await generateServicePdf({
        title: meta.title,
        subtitle: meta.subtitle,
        helperTitle: meta.helperTitle,
        helperCopy: meta.helperCopy,
        products: items,
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadProductPdf = async (product: ServicePackage) => {
    setDownloadingPdf(true);

    try {
      await generateServicePdf({
        title: meta.title,
        subtitle: meta.subtitle,
        helperTitle: meta.helperTitle,
        helperCopy: meta.helperCopy,
        products: items,
        singleProduct: product,
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <main id="main" className="bg-[var(--background)] text-[var(--foreground)]">
      <section className="section-shell relative border-b border-[var(--border)]">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />

        <div className="container relative">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <div className="eyebrow">
                {meta.icon}
                {meta.eyebrow}
              </div>

              {usingCachedData ? (
                <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.78)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <WifiOff
                    size={14}
                    className="shrink-0 text-[var(--brand-primary)]"
                  />
                  <span>
                    Showing saved offline service packages
                    {cacheSavedAt
                      ? ` • Updated ${formatCacheTime(cacheSavedAt)}`
                      : ""}
                  </span>
                </div>
              ) : null}

              <h1 className="max-w-[13ch]">{meta.title}</h1>

              <p className="mt-4 max-w-[62ch] text-base leading-8 text-[var(--text-secondary)]">
                {meta.subtitle}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/c/rapid-proof"
                  prefetch={false}
                  className={`menu-link ${
                    category === "rapid-proof" ? "active" : ""
                  }`}
                >
                  Rapid Proof
                </Link>

                <Link
                  href="/c/business-pwa"
                  prefetch={false}
                  className={`menu-link ${
                    category === "business-pwa" ? "active" : ""
                  }`}
                >
                  Business PWA
                </Link>

                <Link
                  href="/c/operations-pwa"
                  prefetch={false}
                  className={`menu-link ${
                    category === "operations-pwa" ? "active" : ""
                  }`}
                >
                  Operations PWA
                </Link>

                <Link
                  href="/partners"
                  prefetch={false}
                  className="menu-link"
                >
                  Partner Portal
                </Link>

                <Link
                  href="/contact"
                  prefetch={false}
                  className="menu-link"
                >
                  Submit Inquiry
                </Link>
              </div>
            </div>

            <div className="card-elevated p-5 md:p-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                Controlled inquiry flow
              </p>

              <h2 className="mt-2 text-2xl">Start with project context.</h2>

              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                AdminHub Global does not expose direct personal contact details
                publicly. Submit your identity, business, region, role, and
                project need first so the request can be reviewed properly.
              </p>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link href="/contact" prefetch={false} className="btn btn-primary">
                  <ClipboardIcon />
                  {meta.ctaLabel}
                </Link>

                <button
                  type="button"
                  onClick={handleDownloadCategoryPdf}
                  disabled={downloadingPdf}
                  className="btn btn-outline"
                >
                  <Download size={18} />
                  {downloadingPdf ? "Preparing..." : "Download Guide"}
                </button>

                <Link href="/partners" prefetch={false} className="btn btn-ghost">
                  <Users size={18} />
                  Partner Access
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 frame-gold p-5 md:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[var(--brand-primary)]">
                <ShieldCheck size={18} />
              </span>
              <div>
                <p className="text-sm font-extrabold text-[var(--text-primary)]">
                  {meta.helperTitle}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  {meta.helperCopy}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="container">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="card overflow-hidden">
                  <div className="card-inner">
                    <div className="h-5 w-2/3 rounded loading-shimmer" />
                    <div className="mt-3 h-4 w-full rounded loading-shimmer" />
                    <div className="mt-2 h-4 w-5/6 rounded loading-shimmer" />
                    <div className="mt-5 h-10 w-full rounded-full loading-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="frame-gold p-8 text-center">
              <h2 className="text-2xl">No service packages listed here yet</h2>
              <p className="mx-auto mt-3 max-w-[58ch] text-sm leading-7 text-[var(--text-secondary)]">
                This solution area has not been fully populated from Firestore
                yet. You can still submit a structured inquiry with your project
                context, and AdminHub can review the best next step privately.
              </p>

              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row sm:flex-wrap">
                <Link href="/contact" prefetch={false} className="btn btn-primary">
                  <FileText size={18} />
                  Submit Inquiry
                </Link>

                <button
                  type="button"
                  onClick={handleDownloadCategoryPdf}
                  disabled={downloadingPdf}
                  className="btn btn-outline"
                >
                  <Download size={18} />
                  {downloadingPdf ? "Preparing..." : "Download Guide"}
                </button>

                <Link href="/c/rapid-proof" prefetch={false} className="btn btn-outline">
                  <Clock3 size={18} />
                  View Proof Process
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="eyebrow">Available guidance</div>
                <h2 className="section-title">
                  Explore packages in this solution area.
                </h2>
                <p className="section-copy mt-2">
                  Each card can explain what is included, who it suits, what the
                  workflow covers, and practical notes to help prospects or
                  partners understand the next step.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((product) => (
                  <article key={product.id} className="card h-full overflow-hidden">
                    <div className="card-inner flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl">{product.name}</h3>
                          {product.summary ? (
                            <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                              {product.summary}
                            </p>
                          ) : null}
                        </div>

                        <span className="mt-1 shrink-0 text-[var(--brand-primary)]">
                          <ChevronRight size={18} />
                        </span>
                      </div>

                      <DetailList title="Key points" items={product.bullets} />
                      <DetailList
                        title="What it includes"
                        items={product.whatItCovers}
                      />
                      <DetailList title="Who it is for" items={product.whoItsFor} />
                      <DetailList
                        title="Important notes"
                        items={product.keyNotes}
                      />

                      <div className="mt-auto pt-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <Link
                            href="/contact"
                            prefetch={false}
                            className="btn btn-primary flex-1 justify-center"
                          >
                            <MessageCircle size={18} />
                            Submit Inquiry
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDownloadProductPdf(product)}
                            disabled={downloadingPdf}
                            className="btn btn-outline"
                          >
                            <Download size={18} />
                            PDF
                          </button>

                          <Link
                            href="/partners"
                            prefetch={false}
                            className="btn btn-outline"
                          >
                            Partners
                          </Link>
                        </div>

                        <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">
                          Tip: include your business type, country or region,
                          current workflow pain, whether you need a client
                          portal, and whether this is a proof sprint, full PWA,
                          or managed support inquiry.
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function ClipboardIcon() {
  return <FileText size={18} />;
}