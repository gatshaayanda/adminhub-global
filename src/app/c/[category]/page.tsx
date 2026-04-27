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
  BriefcaseBusiness,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Network,
  ShieldCheck,
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
  priceRange?: string;
  source?: "default" | "admin";
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
      "Reusable proposal, scope, catalogue, onboarding summary, and project document tools that support both sales and delivery workflows.",
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

const DEFAULT_SERVICE_PACKAGES: Record<ServiceCategory, ServicePackage[]> = {
  "rapid-proof": [
    {
      id: "default-rapid-launch-preview",
      category: "rapid-proof",
      name: "Rapid Launch Preview Model",
      order: 10,
      source: "default",
      summary:
        "A proof-first process where a client submits a minimum intake or company profile, then receives a live preliminary version quickly before full implementation.",
      bullets: [
        "Minimum intake form or company profile/PDF starts the process.",
        "A live preliminary version is created on a .vercel.app domain.",
        "Public-facing preview can be shown within 24 hours.",
        "Basic backend or admin logic can be added within another 24 hours where relevant.",
        "The client sees a working proof before moving into revisions and production setup.",
      ],
      whatItCovers: [
        "Intake review",
        "Live preview direction",
        "Initial layout and content structure",
        "Early backend/admin direction where relevant",
        "Revision and implementation pathway",
      ],
      whoItsFor: [
        "Prospects who need to see something real before committing.",
        "Sales partners who need a stronger proof-backed offer.",
        "SMEs comparing AdminHub against ordinary web design promises.",
      ],
      keyNotes: [
        "This is not the final full build.",
        "The proof stage is designed to improve trust, speed up decision-making, and support deposit conversion.",
      ],
    },
    {
      id: "default-proof-to-managed-build",
      category: "rapid-proof",
      name: "Proof-to-Implementation Path",
      order: 20,
      source: "default",
      summary:
        "After the preview is approved, the project moves into revisions, production setup, deployment, and managed support.",
      bullets: [
        "Live proof creates belief first.",
        "Client feedback shapes revisions and scope direction.",
        "Production setup follows once the build path is approved.",
        "Managed support keeps the platform useful after launch.",
      ],
      whatItCovers: [
        "Revisions",
        "Production configuration",
        "Deployment",
        "Client onboarding",
        "Post-launch support direction",
      ],
      whoItsFor: [
        "Clients who want a real working direction before committing to a larger build.",
        "Businesses that need a practical path from idea to system.",
      ],
      keyNotes: [
        "Final scope, pricing, and timeline depend on the approved implementation requirements.",
      ],
    },
  ],

  "business-pwa": [
    {
      id: "default-launch-website",
      category: "business-pwa",
      name: "Launch Website",
      order: 10,
      source: "default",
      priceRange: "P3,500-P6,800",
      summary:
        "A professional online presence for small businesses that need a clean, credible public website.",
      bullets: [
        "Home page",
        "About section/page structure where relevant",
        "Services page",
        "Contact flow",
        "Responsive design",
        "Basic SEO",
        "Deployment",
      ],
      whatItCovers: [
        "Public website structure",
        "Brand styling",
        "Mobile-friendly layout",
        "WhatsApp or structured inquiry actions",
      ],
      whoItsFor: [
        "Small businesses that need to look professional online.",
        "Founders who need a credible starting point before adding deeper systems.",
      ],
      keyNotes: [
        "This is the simpler website-first package, not the full portal or operations system.",
      ],
    },
    {
      id: "default-business-website-cms",
      category: "business-pwa",
      name: "Business Website + CMS",
      order: 20,
      source: "default",
      priceRange: "P10,000-P15,000",
      summary:
        "A business website with admin-managed content, blog/insights publishing, homepage highlights, image support, and editable service/product content.",
      bullets: [
        "Everything in Launch Website",
        "Admin-managed blog/insights",
        "Dynamic homepage highlights",
        "Editable service/product content",
        "Image upload support",
        "Structured content layout",
        "Basic admin dashboard",
      ],
      whatItCovers: [
        "Public website",
        "Admin content management",
        "Blog/insights publishing",
        "Dynamic content sections",
      ],
      whoItsFor: [
        "Businesses that need credibility plus ongoing content updates.",
        "Professional service businesses that publish insights or service updates.",
      ],
      keyNotes: [
        "Useful when the business needs more than a static website but does not yet need a full client portal.",
      ],
    },
    {
      id: "default-conversion-website",
      category: "business-pwa",
      name: "Conversion Website",
      order: 30,
      source: "default",
      priceRange: "P15,000-P25,000",
      summary:
        "A conversion-focused business website with CMS, WhatsApp automation, smart chatbot guidance, shareable articles, and structured lead actions.",
      bullets: [
        "Business website",
        "CMS",
        "WhatsApp automation",
        "Smart chatbot",
        "Quote/contact flows",
        "Shareable articles",
        "Structured landing sections",
        "Mobile conversion improvements",
      ],
      whatItCovers: [
        "Lead capture",
        "Guided user actions",
        "Article sharing",
        "Chat-based assistance",
        "Structured inquiry flows",
      ],
      whoItsFor: [
        "Businesses that want leads and guided action, not just information pages.",
        "Service businesses that rely on WhatsApp-first conversion.",
      ],
      keyNotes: [
        "This package is stronger when the business has clear services and a follow-up process.",
      ],
    },
  ],

  "operations-pwa": [
    {
      id: "default-client-portal-platform",
      category: "operations-pwa",
      name: "Client Portal Platform",
      order: 10,
      source: "default",
      priceRange: "P25,000-P45,000",
      summary:
        "A platform for businesses that manage clients, cases, applications, bookings, or support records.",
      bullets: [
        "Public website",
        "Client login",
        "Client dashboard",
        "Admin dashboard",
        "Case/project records",
        "Progress updates",
        "Required documents",
        "Messaging",
        "File links/uploads",
        "PDF case summaries",
        "Status tracking",
      ],
      whatItCovers: [
        "Client-facing access",
        "Admin-side case management",
        "Status and progress tracking",
        "Document handling",
        "Client-safe summaries",
      ],
      whoItsFor: [
        "Businesses with recurring client communication.",
        "Service firms managing cases, requests, applications, or support workflows.",
      ],
      keyNotes: [
        "This is where AdminHub starts becoming a real operating system, not only a public website.",
      ],
    },
    {
      id: "default-custom-operations-pwa",
      category: "operations-pwa",
      name: "Custom Operations PWA",
      order: 20,
      source: "default",
      priceRange: "P45,000-P85,000+",
      summary:
        "A serious internal and client-facing system with public PWA, admin control center, client portal, CRM-style records, messaging, uploads, PDFs, dynamic content, and offline-aware features.",
      bullets: [
        "Public PWA",
        "Admin control center",
        "Client portal",
        "CRM-style records",
        "Messaging",
        "Uploads",
        "PDF generation",
        "Dynamic content management",
        "Offline-aware features",
        "Refresh app data",
        "WhatsApp automation",
        "Analytics foundations",
        "Future module expansion",
      ],
      whatItCovers: [
        "Operational workflows",
        "Client servicing",
        "Digital records",
        "Reusable document outputs",
        "Scalable future modules",
      ],
      whoItsFor: [
        "Businesses that need a serious custom operating system.",
        "Premium clients who require portals, workflows, files, PDFs, and admin controls.",
      ],
      keyNotes: [
        "Final value depends on modules, complexity, client requirements, and support needs.",
      ],
    },
    {
      id: "default-crm-compliance-portal",
      category: "operations-pwa",
      name: "CRM / Compliance / Client Portal System",
      order: 30,
      source: "default",
      priceRange: "P20,000-P30,000",
      summary:
        "A workflow system for internal records and client management, including leads, case files, portals, messaging, status tracking, documents, and progress updates.",
      bullets: [
        "Client records",
        "Lead records",
        "Case files",
        "Client portal",
        "Admin portal",
        "Messaging",
        "Status tracking",
        "Document uploads",
        "Case PDFs",
        "Secure access",
        "Staff/admin workflow",
        "Progress updates",
        "Client-safe summaries",
      ],
      whatItCovers: [
        "CRM-style records",
        "Compliance-style case handling",
        "Client-facing visibility",
        "Secure admin workflows",
      ],
      whoItsFor: [
        "Insurance brokers",
        "Consultants",
        "Training institutions",
        "Professional service firms",
        "Businesses with client follow-up processes",
      ],
      keyNotes: [
        "A strong fit when the business needs structured client servicing and internal accountability.",
      ],
    },
  ],

  "partner-led-sales": [
    {
      id: "default-proof-backed-agent-sales",
      category: "partner-led-sales",
      name: "Proof-Backed Agent Sales Model",
      order: 10,
      source: "default",
      summary:
        "A partner sales model where agents sell a visible preview and implementation path instead of an abstract website promise.",
      bullets: [
        "Agents can sell a visible proof stage.",
        "Prospects can see a live working version within 48 hours.",
        "Proof improves trust and speeds up decision-making.",
        "Qualified leads can move into implementation and managed support.",
      ],
      whatItCovers: [
        "Agent sales framing",
        "Lead qualification",
        "Proof-stage positioning",
        "Implementation handoff",
        "Recurring support potential",
      ],
      whoItsFor: [
        "Sales partners",
        "Referral agents",
        "Business development partners",
        "People selling digital systems to SMEs",
      ],
      keyNotes: [
        "The agent advantage is selling something concrete instead of asking the prospect to imagine the solution.",
      ],
    },
    {
      id: "default-sales-framing-pack",
      category: "partner-led-sales",
      name: "AdminHub Sales Framing Pack",
      order: 20,
      source: "default",
      summary:
        "Reusable positioning for different client types: small businesses, service businesses, businesses with clients, agents, and premium clients.",
      bullets: [
        "Small business framing",
        "Service business framing",
        "Client-portal business framing",
        "Agent/sales partner framing",
        "Premium platform framing",
      ],
      whatItCovers: [
        "Clearer offer explanation",
        "Benefit-led sales language",
        "Proof-driven conversion",
        "Premium system positioning",
      ],
      whoItsFor: [
        "Partners who need a simple way to explain AdminHub.",
        "Agents who need confidence selling higher-value platform builds.",
      ],
      keyNotes: [
        "The strongest framing is that AdminHub turns a business website into a working digital operating system.",
      ],
    },
  ],

  "client-hub": [
    {
      id: "default-client-portal",
      category: "client-hub",
      name: "Client Portal",
      order: 10,
      source: "default",
      priceRange: "P15,000-P22,800",
      summary:
        "Secure client portal areas where clients can log in, view assigned records, see updates, access files, message the business, and download PDFs.",
      bullets: [
        "Client login",
        "Client dashboard",
        "Assigned records/cases/projects",
        "Progress updates",
        "Required documents",
        "Uploaded files",
        "Shared links",
        "Status badges",
        "Case details",
        "Messaging",
        "PDF download",
        "Logout flow",
        "Mobile/PWA visibility fixes",
      ],
      whatItCovers: [
        "Client-facing workspace",
        "Project/case visibility",
        "File and message access",
        "Downloadable client-safe documents",
      ],
      whoItsFor: [
        "Businesses that manage clients after the first sale.",
        "Service providers needing structured updates, files, and communication.",
      ],
      keyNotes: [
        "Portal access should be controlled and only shown to assigned client records.",
      ],
    },
    {
      id: "default-case-messaging-system",
      category: "client-hub",
      name: "Case Messaging System",
      order: 20,
      source: "default",
      priceRange: "P6,500-P15,000",
      summary:
        "Project-linked or case-linked communication stored under the relevant record, with sender labels, optional files, links, and conversation history.",
      bullets: [
        "Client/admin messages",
        "Firestore message storage",
        "Sender labels",
        "Real-time syncing where enabled",
        "File or link support",
        "Conversation history",
        "Project/case-specific communication",
      ],
      whatItCovers: [
        "Structured communication",
        "Client replies",
        "Admin follow-up",
        "Document or link sharing",
      ],
      whoItsFor: [
        "Businesses that need communication attached to a specific case or project.",
        "Client-service teams that want to avoid scattered WhatsApp-only follow-up.",
      ],
      keyNotes: [
        "Messaging works best when each record has a clear project or case ID.",
      ],
    },
    {
      id: "default-client-case-pdf-system",
      category: "client-hub",
      name: "Client Case PDF System",
      order: 30,
      source: "default",
      priceRange: "P4,000-P8,000",
      summary:
        "Client-safe downloadable records generated from portal or case data.",
      bullets: [
        "Client details",
        "Case title",
        "Status",
        "Request type",
        "Progress update",
        "Required documents",
        "Support summary",
        "Uploaded file links",
        "Shared resources",
        "Disclaimers",
        "Client-safe downloadable record",
      ],
      whatItCovers: [
        "Case summaries",
        "Client-safe PDF outputs",
        "Portal download buttons",
        "Structured case documentation",
      ],
      whoItsFor: [
        "Insurance brokers",
        "Consultants",
        "Client-service businesses",
        "Any business that needs clean records clients can keep.",
      ],
      keyNotes: [
        "PDF content should be client-safe and avoid exposing internal admin notes unless intentionally included.",
      ],
    },
  ],

  "managed-support": [
    {
      id: "default-starter-support",
      category: "managed-support",
      name: "Starter Support",
      order: 10,
      source: "default",
      priceRange: "P650-P1,500/month",
      summary:
        "Small updates and basic maintenance for simple live websites.",
      bullets: [
        "Minor text/image updates",
        "Basic monitoring",
        "Small fixes",
        "Deployment checks",
      ],
      whatItCovers: [
        "Light website maintenance",
        "Small fixes",
        "Simple deployment checks",
      ],
      whoItsFor: [
        "Small websites",
        "Simple public presence builds",
      ],
      keyNotes: [
        "Best for clients without heavy portal, dashboard, or workflow needs.",
      ],
    },
    {
      id: "default-business-support",
      category: "managed-support",
      name: "Business Support",
      order: 20,
      source: "default",
      priceRange: "P1,500-P3,500/month",
      summary:
        "Monthly support for active business websites and CMS projects.",
      bullets: [
        "Content updates",
        "Blog posting support",
        "Product/service updates",
        "Bug fixes",
        "Small feature adjustments",
        "Monthly check-in",
        "Backup review",
      ],
      whatItCovers: [
        "CMS support",
        "Content refreshes",
        "Small improvements",
        "Regular maintenance",
      ],
      whoItsFor: [
        "Businesses actively updating their website.",
        "CMS clients who need help keeping content current.",
      ],
      keyNotes: [
        "Good fit for websites that publish insights, services, products, or homepage updates.",
      ],
    },
    {
      id: "default-managed-platform-support",
      category: "managed-support",
      name: "Managed Platform Support",
      order: 30,
      source: "default",
      priceRange: "P3,500-P5,000+/month",
      summary:
        "Ongoing support for client portals, dashboards, CRM systems, active PWAs, and workflow-heavy platforms.",
      bullets: [
        "Admin support",
        "Client portal updates",
        "Workflow fixes",
        "PDF template updates",
        "Data structure support",
        "Firebase review",
        "Security rule adjustments",
        "Priority fixes",
        "Monthly improvement work",
      ],
      whatItCovers: [
        "Operational platform support",
        "Client portal continuity",
        "Dashboard improvements",
        "Security and data structure review",
      ],
      whoItsFor: [
        "Clients running portals, dashboards, messaging, PDFs, or active PWA systems.",
      ],
      keyNotes: [
        "This is the correct support tier for serious AdminHub-style platforms.",
      ],
    },
  ],

  "proposal-tools": [
    {
      id: "default-pdf-generation-system",
      category: "proposal-tools",
      name: "PDF Generation System",
      order: 10,
      source: "default",
      priceRange: "P4,000-P8,000",
      summary:
        "Downloadable PDFs generated directly from platform data or page content.",
      bullets: [
        "Product guides",
        "Category guides",
        "Client case summaries",
        "Project summaries",
        "Proposal PDFs",
        "Lead summaries",
        "Support reports",
        "Policy/service information sheets",
        "Custom branded documents",
      ],
      whatItCovers: [
        "Brand colors",
        "Logo",
        "Structured sections",
        "Client-safe content",
        "Disclaimers",
        "Generated file names",
        "Download buttons",
        "Dynamic data from Firestore or page content",
      ],
      whoItsFor: [
        "Businesses that need professional documents generated from their platform.",
        "AdminHub builds where service guides, proposals, or client summaries matter.",
      ],
      keyNotes: [
        "Advanced multi-template PDF systems can be valued higher depending on complexity.",
      ],
    },
    {
      id: "default-advanced-document-system",
      category: "proposal-tools",
      name: "Advanced PDF / Document System",
      order: 20,
      source: "default",
      priceRange: "P8,000-P15,000+",
      summary:
        "A higher-depth document system with multiple templates, branded outputs, and different document types for sales, onboarding, support, or client records.",
      bullets: [
        "Multiple PDF templates",
        "Proposal-ready outputs",
        "Scope summaries",
        "Client-safe records",
        "Support reports",
        "Custom document structures",
      ],
      whatItCovers: [
        "Reusable template logic",
        "Dynamic document sections",
        "File naming",
        "Branding and disclaimers",
      ],
      whoItsFor: [
        "Businesses needing polished documents as part of their workflow.",
        "Platform builds that need more than one PDF output type.",
      ],
      keyNotes: [
        "Final scope depends on the number of templates and how much data must feed into each PDF.",
      ],
    },
    {
      id: "default-article-sharing-system",
      category: "proposal-tools",
      name: "Article Sharing System",
      order: 30,
      source: "default",
      priceRange: "P1,500-P3,500",
      summary:
        "Shareable article functionality that separates content sharing from direct contact actions.",
      bullets: [
        "Native device share where supported",
        "WhatsApp fallback sharing",
        "Article title and URL sharing",
        "Separate ask-about-this-topic action",
        "Cleaner distinction between sharing content and contacting the business",
      ],
      whatItCovers: [
        "Public article sharing",
        "WhatsApp fallback",
        "Topic-based inquiry action",
        "Conversion-friendly insight pages",
      ],
      whoItsFor: [
        "Businesses publishing insights, education, case examples, or trust-building content.",
      ],
      keyNotes: [
        "Works especially well with a combined About + Insights layout.",
      ],
    },
  ],

  "agent-operations": [
    {
      id: "default-agent-operations-layer",
      category: "agent-operations",
      name: "Agent Operations Layer",
      order: 10,
      source: "default",
      summary:
        "Operational tooling for tracking agents, submitted leads, stages, attribution, commissions, payouts, notes, and partner activity.",
      bullets: [
        "Agent records",
        "Submitted leads",
        "Lead status",
        "Attribution",
        "Commission tracking",
        "Payout status",
        "Partner notes",
        "Partner activity",
      ],
      whatItCovers: [
        "Lead ownership",
        "Partner accountability",
        "Sales pipeline visibility",
        "Commission/payout tracking direction",
      ],
      whoItsFor: [
        "AdminHub partners",
        "Sales agents",
        "Founder-led sales operations",
      ],
      keyNotes: [
        "This helps AdminHub know who brought a lead, what happened to it, and what follow-up or payout status applies.",
      ],
    },
    {
      id: "default-whatsapp-automation-system",
      category: "agent-operations",
      name: "Structured WhatsApp Automation",
      order: 20,
      source: "default",
      priceRange: "P3,000-P6,000",
      summary:
        "Pre-filled WhatsApp conversion flows for quote requests, claims, callbacks, article questions, product-specific messages, and contact support.",
      bullets: [
        "Pre-filled quote messages",
        "Claim messages",
        "Callback messages",
        "Ask-about-article messages",
        "Product-specific messages",
        "Contact messages",
        "Client login support messages",
        "Document request messages",
      ],
      whatItCovers: [
        "Structured handoff messages",
        "Reduced friction for users",
        "Cleaner inquiry context",
        "Better follow-up quality",
      ],
      whoItsFor: [
        "WhatsApp-first businesses",
        "Sales partners",
        "Service businesses handling many inquiries manually",
      ],
      keyNotes: [
        "For AdminHub Global public flows, structured inquiry capture should happen before private follow-up.",
      ],
    },
  ],

  "custom-framework": [
    {
      id: "default-adminhub-foundation",
      category: "custom-framework",
      name: "AdminHub Foundation",
      order: 10,
      source: "default",
      summary:
        "The reusable full-stack foundation behind AdminHub builds, designed to deliver faster without starting from zero each time.",
      bullets: [
        "Next.js",
        "React",
        "TypeScript",
        "TailwindCSS",
        "Firebase / Firestore",
        "Firebase security rules",
        "UploadThing file uploads",
        "Vercel deployment",
        "PWA support",
        "Admin dashboards",
        "Client dashboards",
        "Messaging systems",
        "Chat assistant logic",
        "PDF generation tools",
        "Reusable layout and content systems",
      ],
      whatItCovers: [
        "Reusable project foundation",
        "Dashboard and portal architecture",
        "Content systems",
        "Uploads",
        "Messaging",
        "PWA delivery",
        "PDF outputs",
      ],
      whoItsFor: [
        "Businesses that need custom digital infrastructure.",
        "Projects that need more than a boxed-in page builder.",
      ],
      keyNotes: [
        "This foundation is why AdminHub can adapt faster without rebuilding every project from scratch.",
      ],
    },
    {
      id: "default-admin-cms",
      category: "custom-framework",
      name: "Admin Content Management System",
      order: 20,
      source: "default",
      priceRange: "P8,000-P15,000",
      summary:
        "Admin dashboards that manage dynamic business content and operational records.",
      bullets: [
        "Blog / insights",
        "Homepage highlights",
        "Products / services",
        "Claims content",
        "Resources",
        "Events",
        "Client records",
        "Project records",
        "Progress updates",
        "Required documents",
        "Uploaded files",
        "Shared links",
        "Portal visibility controls",
      ],
      whatItCovers: [
        "Admin-managed content",
        "Dynamic public pages",
        "Client/project records",
        "Portal visibility",
      ],
      whoItsFor: [
        "Businesses that need to update content without editing code.",
        "AdminHub platform clients with active operations.",
      ],
      keyNotes: [
        "Larger operational dashboards can move into higher value ranges depending on complexity.",
      ],
    },
    {
      id: "default-smart-chat-assistant",
      category: "custom-framework",
      name: "Smart Site-Aware Chat Assistant",
      order: 30,
      source: "default",
      priceRange: "P6,000-P12,000",
      summary:
        "A chatbot-style assistant that guides users around the site, helps them discover features, and prepares structured next steps.",
      bullets: [
        "Page guidance",
        "Product guidance",
        "Quote help",
        "Claims help",
        "Login help",
        "Contact help",
        "Required document guidance",
        "WhatsApp message preparation",
        "Lead detail collection",
        "Suggestions / quick replies",
        "Guidance to PDFs, share buttons, portals, and dashboards",
      ],
      whatItCovers: [
        "Site guidance",
        "Feature discovery",
        "Lead/inquiry preparation",
        "Fallback help",
        "Quick replies",
      ],
      whoItsFor: [
        "Businesses with features users might miss.",
        "Sites with portals, PDFs, articles, products, and structured flows.",
      ],
      keyNotes: [
        "More advanced AI-backed versions can be priced higher depending on API integration and knowledge-base setup.",
      ],
    },
    {
      id: "default-offline-aware-pwa",
      category: "custom-framework",
      name: "Offline-Aware PWA Layer",
      order: 40,
      source: "default",
      priceRange: "P3,000-P7,000",
      summary:
        "PWA improvements that help the app behave better when offline, while being clear that cloud features still require internet.",
      bullets: [
        "PWA install support",
        "Offline page handling",
        "Saved article cache",
        "Previously loaded content availability",
        "Offline contact guidance",
        "Copy-message buttons for offline use",
        "Online/offline status messages",
        "Refresh App Data button",
        "Cache clearing support",
        "Mobile PWA navigation fixes",
      ],
      whatItCovers: [
        "Better offline experience",
        "Saved content access",
        "Clear user messaging",
        "Cache controls",
      ],
      whoItsFor: [
        "PWAs used on mobile.",
        "Businesses whose users may have unstable connectivity.",
      ],
      keyNotes: [
        "Firebase updates, WhatsApp, email, and new content still require internet.",
      ],
    },
  ],
};

const LOGO_PATH = "/logo.png";

const BRAND = {
  blue: [77, 163, 255] as [number, number, number],
  blueDeep: [47, 125, 255] as [number, number, number],
  navy: [6, 10, 18] as [number, number, number],
  surface: [15, 23, 42] as [number, number, number],
  text: [244, 247, 251] as [number, number, number],
  darkText: [24, 24, 27] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizePackage(
  value: ServicePackage,
  source: "default" | "admin"
): ServicePackage {
  return {
    ...value,
    source,
    bullets: toStringArray(value.bullets),
    whatItCovers: toStringArray(value.whatItCovers),
    whoItsFor: toStringArray(value.whoItsFor),
    keyNotes: toStringArray(value.keyNotes),
  };
}

function getDefaultPackages(category: ServiceCategory) {
  return (DEFAULT_SERVICE_PACKAGES[category] || []).map((item) =>
    normalizePackage(item, "default")
  );
}

function mergeServicePackages(
  defaultItems: ServicePackage[],
  adminItems: ServicePackage[]
) {
  const byId = new Map<string, ServicePackage>();

  defaultItems.forEach((item) => {
    byId.set(item.id, normalizePackage(item, "default"));
  });

  adminItems
    .filter((item) => item.active !== false)
    .forEach((item) => {
      byId.set(item.id, normalizePackage(item, item.source || "admin"));
    });

  return Array.from(byId.values()).sort((a, b) => {
    const orderDiff = (a.order ?? 999) - (b.order ?? 999);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });
}

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
  addField(
    "Public Contact Policy",
    "Direct personal phone and email details are intentionally not displayed publicly."
  );
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

    if (product.priceRange) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...BRAND.blueDeep);
      pdf.text(`Suggested value: ${cleanPdfText(product.priceRange)}`, marginX, y);
      y += 5;
    }

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

  const [items, setItems] = useState<ServicePackage[]>(() =>
    getDefaultPackages(category)
  );
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [cacheSavedAt, setCacheSavedAt] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadProducts() {
      const defaultItems = getDefaultPackages(category);
      const cached = getCachedProducts(category);

      const initialItems =
        cached.products.length > 0
          ? mergeServicePackages(defaultItems, cached.products)
          : defaultItems;

      setItems(initialItems);
      setUsingCachedData(cached.products.length > 0);
      setCacheSavedAt(cached.savedAt);
      setLoading(false);

      try {
        const qRef = query(
          collection(firestore, "service_packages"),
          where("category", "==", category)
        );

        const snap = await getDocs(qRef);

        if (!alive) return;

        const firestoreItems = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Record<string, unknown>),
        })) as ServicePackage[];

        const adminItems = firestoreItems
          .filter((item) => item.active !== false)
          .map((item) => normalizePackage(item, "admin"));

        const merged = mergeServicePackages(defaultItems, adminItems);

        setItems(merged);
        setUsingCachedData(false);
        setCacheSavedAt(new Date().toISOString());

        saveProductsToCache(category, merged);
      } catch (error) {
        console.error("Load AdminHub Global service packages failed:", error);

        if (!alive) return;

        const fallback = getCachedProducts(category);

        if (fallback.products.length > 0) {
          setItems(mergeServicePackages(defaultItems, fallback.products));
          setUsingCachedData(true);
          setCacheSavedAt(fallback.savedAt);
        } else {
          setItems(defaultItems);
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

                <Link href="/partners" prefetch={false} className="menu-link">
                  Partner Portal
                </Link>

                <Link href="/contact" prefetch={false} className="menu-link">
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
                  <FileText size={18} />
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
                This solution area has not been fully populated yet. Submit a
                structured inquiry with your project context, and AdminHub can
                review the best next step privately.
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
                  These default catalogue packages are always available from the
                  AdminHub baseline. Any new service packages created in the
                  admin/products area are added on top of this list.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((product) => (
                  <article key={product.id} className="card h-full overflow-hidden">
                    <div className="card-inner flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="mb-3 flex flex-wrap gap-2">
                            <span className="badge badge-neutral">
                              {product.source === "admin"
                                ? "Admin-added"
                                : "Catalogue baseline"}
                            </span>

                            {product.priceRange ? (
                              <span className="badge">{product.priceRange}</span>
                            ) : null}
                          </div>

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