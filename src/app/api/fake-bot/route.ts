import { NextResponse } from "next/server";

type BotResponse = {
  reply: string;
  suggestions?: string[];
};

const PATHS = {
  rapidProof: "/c/rapid-proof",
  businessPwa: "/c/business-pwa",
  operationsPwa: "/c/operations-pwa",
  partners: "/partners",
  contact: "/contact",
  clientHub: "/client/dashboard",
  clientLogin: "/client/login",
  adminControl: "/admin/dashboard",
};

const SUGG = {
  START: "Start inquiry",
  PROOF: "48-hour proof",
  RAPID: "Rapid Proof Sprint",
  BUSINESS: "Business PWA",
  OPERATIONS: "Operations PWA",
  PARTNERS: "Partner Portal",
  CLIENT: "Client Hub",
  ADMIN: "AdminHub Global Control",
  CONTACT: "Contact",
} as const;

const PLATFORM_MODULES = [
  "public website",
  "admin dashboard",
  "client portal",
  "agent management",
  "lead pipeline",
  "client onboarding",
  "project workspace",
  "messaging",
  "uploads",
  "PDF proposals",
  "recurring support tracking",
  "commission tracking",
  "activity logs",
];

const PHASE_ONE_WORKFLOW = [
  "lead capture",
  "qualification",
  "48-hour live proof",
  "conversion",
  "client onboarding",
  "project build",
  "launch",
  "monthly managed support",
];

const PACKAGE_TIERS = [
  "Rapid Proof + Launch",
  "Business PWA",
  "Operations PWA",
];

const BEST_FIT_SECTORS = [
  "insurance and advisory",
  "education and training",
  "hospitality and service businesses",
  "consulting firms",
  "SMEs with recurring client communication",
  "businesses handling files, cases, requests, onboarding, or support",
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const reply = (text: string, suggestions?: string[]): BotResponse => ({
  reply: text.trim(),
  suggestions,
});

const normalize = (value: unknown): string =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const containsAny = (text: string, patterns: (string | RegExp)[]) =>
  patterns.some((pattern) =>
    pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern)
  );

const joinList = (items: string[]) =>
  items.length <= 1
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

function getPageHelpReply(path = ""): BotResponse {
  if (path.includes("/partners")) {
    return reply(
      [
        "This is the Partner Portal area.",
        "",
        "The goal here is to help sales partners understand the offer, submit leads, track opportunities, and sell a proof-backed process instead of a vague promise.",
        "",
        "A good next step is to submit a structured inquiry or review the 48-hour proof process.",
      ].join("\n"),
      [SUGG.START, SUGG.PROOF, SUGG.BUSINESS, SUGG.CONTACT]
    );
  }

  if (path.includes("/client")) {
    return reply(
      [
        "This is part of the Client Hub experience.",
        "",
        "The Client Hub is meant to help clients see project progress, respond to onboarding requests, exchange messages, access files, and follow support updates after launch.",
        "",
        "If you are not already onboarded as a client, start with an inquiry first.",
      ].join("\n"),
      [SUGG.START, SUGG.CONTACT, SUGG.PROOF]
    );
  }

  if (path.includes("/admin")) {
    return reply(
      [
        "This is part of AdminHub Global Control.",
        "",
        "The admin area is the command center for leads, agents, clients, project workspaces, proposals, messaging, support plans, commissions, and activity tracking.",
        "",
        "Access should stay controlled and role-aware.",
      ].join("\n"),
      [SUGG.ADMIN, SUGG.CLIENT, SUGG.PARTNERS]
    );
  }

  if (path.includes("/c/rapid-proof")) {
    return getProofReply();
  }

  if (path.includes("/c/business-pwa")) {
    return getBusinessPwaReply();
  }

  if (path.includes("/c/operations-pwa")) {
    return getOperationsPwaReply();
  }

  if (path.includes("/contact")) {
    return getContactReply();
  }

  return reply(
    [
      "On this page, you can learn what AdminHub Global is, how the 48-hour proof process works, and how the platform connects agents, leads, client onboarding, project delivery, and recurring support.",
      "",
      "Useful next steps:",
      `• Review the 48-hour proof process: ${PATHS.rapidProof}`,
      `• Explore partner selling: ${PATHS.partners}`,
      `• Submit a structured inquiry: ${PATHS.contact}`,
      "",
      "No direct personal contact details are shown publicly. The preferred flow is to capture identity and project context first, then follow up privately.",
    ].join("\n"),
    [SUGG.START, SUGG.PROOF, SUGG.PARTNERS, SUGG.CONTACT]
  );
}

function getGreetingReply(): BotResponse {
  return reply(
    [
      pick([
        "Hi 👋 You’re chatting with the AdminHub Global assistant.",
        "Hello 👋 I can help you understand AdminHub Global.",
        "Welcome 👋 I can guide you through the platform, proof process, Partner Portal, Client Hub, and inquiry flow.",
      ]),
      "",
      "What would you like help with today?",
    ].join("\n"),
    [SUGG.PROOF, SUGG.PARTNERS, SUGG.CLIENT, SUGG.START]
  );
}

function getProofReply(): BotResponse {
  return reply(
    [
      "The 48-hour live proof process is one of AdminHub Global’s strongest sales advantages.",
      "",
      "The flow is:",
      "1. A prospect submits a short intake or company profile.",
      "2. A live preliminary version is produced quickly on a preview domain.",
      "3. Initial backend/admin direction can be added where relevant.",
      "4. The prospect sees a working direction instead of imagining the solution.",
      "5. If approved, the project moves into implementation, onboarding, launch, and managed support.",
      "",
      "This helps agents sell a visible proof stage rather than an abstract development promise.",
    ].join("\n"),
    [SUGG.START, SUGG.BUSINESS, SUGG.OPERATIONS, SUGG.PARTNERS]
  );
}

function getCustomFrameworkReply(): BotResponse {
  return reply(
    [
      "AdminHub Global is built on a custom reusable PWA framework, not a boxed-in DIY website builder.",
      "",
      "That matters because the framework can support more than brochure pages:",
      `• ${joinList(PLATFORM_MODULES)}`,
      "",
      "The goal is not to compete with simple page builders on DIY convenience. The goal is to build business-specific digital infrastructure: dashboards, portals, workflows, files, messaging, PDFs, and managed support systems.",
    ].join("\n"),
    [SUGG.PROOF, SUGG.BUSINESS, SUGG.OPERATIONS, SUGG.START]
  );
}

function getNinthIterationReply(): BotResponse {
  return reply(
    [
      "AdminHub Global is backed by the 9th iteration of the reusable framework and delivery process.",
      "",
      "That means it is not a first attempt or raw template. It has been refined through repeated builds involving public websites, admin dashboards, client portals, messaging, uploads, PDF tools, Firebase workflows, and PWA app-shell patterns.",
      "",
      "The advantage is a balance of custom delivery and repeatable process.",
    ].join("\n"),
    [SUGG.PROOF, SUGG.BUSINESS, SUGG.START]
  );
}

function getPartnerReply(): BotResponse {
  return reply(
    [
      "The Partner Portal is for sales partners and agents.",
      "",
      "The agent value proposition is:",
      "• a stronger-ticket B2B offer than generic websites",
      "• clear operational pain points to sell against",
      "• a 48-hour proof process that makes the offer easier to understand",
      "• founder-led fulfillment",
      "• potential recurring support revenue after launch",
      "",
      "Agents are not selling a vague promise. They can move qualified prospects toward a visible proof stage.",
    ].join("\n"),
    [SUGG.START, SUGG.PROOF, SUGG.BUSINESS, SUGG.CONTACT]
  );
}

function getClientHubReply(): BotResponse {
  return reply(
    [
      "The Client Hub is the client-facing workspace.",
      "",
      "It should help clients:",
      "• view project progress",
      "• send onboarding details",
      "• exchange project messages",
      "• access files and shared links",
      "• follow support status",
      "• stay connected after launch",
      "",
      "The existing client route structure should be preserved unless the project explicitly changes it.",
    ].join("\n"),
    [SUGG.CLIENT, SUGG.START, SUGG.CONTACT]
  );
}

function getAdminControlReply(): BotResponse {
  return reply(
    [
      "AdminHub Global Control is the internal command center.",
      "",
      "Phase 1 should focus on:",
      `• ${joinList(PHASE_ONE_WORKFLOW)}`,
      "",
      "The admin dashboard should eventually track agents, leads, opportunities, clients, projects, proposals, messages, files, support plans, commissions, and recent activity.",
    ].join("\n"),
    [SUGG.ADMIN, SUGG.PARTNERS, SUGG.CLIENT, SUGG.PROOF]
  );
}

function getBusinessPwaReply(): BotResponse {
  return reply(
    [
      "A Business PWA is best for service SMEs that need more structure than a normal website.",
      "",
      "It can include:",
      "• public website",
      "• admin dashboard",
      "• client portal",
      "• messaging and uploads",
      "• Firebase-backed workflows",
      "• proposal or PDF support",
      "• launch and managed support",
      "",
      "This is the middle tier between a simple proof launch and a heavier operations platform.",
    ].join("\n"),
    [SUGG.START, SUGG.PROOF, SUGG.OPERATIONS, SUGG.CONTACT]
  );
}

function getOperationsPwaReply(): BotResponse {
  return reply(
    [
      "An Operations PWA is for workflow-heavy businesses.",
      "",
      "It is a good fit when a business needs to manage cases, claims, service requests, onboarding, documents, client communication, files, approvals, support history, or multi-role operations.",
      "",
      "This is where AdminHub Global becomes more than a website — it becomes tailored digital infrastructure around the way the business works.",
    ].join("\n"),
    [SUGG.START, SUGG.BUSINESS, SUGG.PROOF, SUGG.CONTACT]
  );
}

function getPricingReply(): BotResponse {
  return reply(
    [
      "AdminHub Global pricing should be framed in stages, not as a vague one-off website quote.",
      "",
      "Recommended export-market structure:",
      "• Rapid Proof + Launch: USD 2,500–5,000",
      "• Business PWA: USD 5,000–12,000 plus managed support",
      "• Operations PWA: USD 12,000–25,000+ plus stronger managed support",
      "",
      "The proof stage should be treated as a serious paid validation step, not a free sample. Exact pricing depends on scope, workflow complexity, portal needs, backend depth, and support requirements.",
    ].join("\n"),
    [SUGG.START, SUGG.PROOF, SUGG.BUSINESS, SUGG.OPERATIONS]
  );
}

function getSupportReply(): BotResponse {
  return reply(
    [
      "Managed support is part of the long-term value of AdminHub Global.",
      "",
      "After launch, support can cover:",
      "• updates and fixes",
      "• content and system adjustments",
      "• portal continuity",
      "• client/project support",
      "• workflow refinement",
      "• future feature improvements",
      "",
      "This is why the model should not be positioned as a one-off website sale only.",
    ].join("\n"),
    [SUGG.START, SUGG.BUSINESS, SUGG.CONTACT]
  );
}

function getPwaReply(): BotResponse {
  return reply(
    [
      "AdminHub Global should feel like an installable, mobile-first PWA.",
      "",
      "That means:",
      "• standalone app feel",
      "• manifest and icons",
      "• polished loading states",
      "• responsive dashboards",
      "• app-like navigation",
      "• offline-aware behavior where realistic",
      "",
      "Important: offline-aware does not mean every cloud feature works offline. Firebase updates, uploads, new messages, and fresh data still need an internet connection.",
    ].join("\n"),
    [SUGG.PROOF, SUGG.CLIENT, SUGG.ADMIN]
  );
}

function getPdfReply(): BotResponse {
  return reply(
    [
      "PDF and proposal tools are a useful part of AdminHub Global.",
      "",
      "They can support:",
      "• service catalog summaries",
      "• proof sprint summaries",
      "• proposal exports",
      "• scope summaries",
      "• onboarding summaries",
      "• project/support reports",
      "",
      "The goal is to help turn the platform into a sales and delivery system, not just a public website.",
    ].join("\n"),
    [SUGG.START, SUGG.PROOF, SUGG.BUSINESS]
  );
}

function getInquiryReply(): BotResponse {
  return reply(
    [
      "The best next step is to submit a structured inquiry.",
      "",
      "AdminHub Global should collect identity and project context first, such as:",
      "• name",
      "• preferred contact detail",
      "• business or organisation",
      "• country or region",
      "• whether the person is a client, agent, or partner",
      "• what they need",
      "",
      "After that, AdminHub can review the request and follow up privately. Direct personal contact details are not displayed publicly.",
    ].join("\n"),
    [SUGG.START, SUGG.CONTACT, SUGG.PROOF]
  );
}

function getContactReply(): BotResponse {
  return reply(
    [
      `Use the structured contact/inquiry page here: ${PATHS.contact}`,
      "",
      "AdminHub Global does not need to expose direct personal phone or email publicly. The cleaner flow is to capture the person’s identity, business context, location, and request first, then follow up privately.",
    ].join("\n"),
    [SUGG.START, SUGG.PROOF, SUGG.PARTNERS]
  );
}

function getFitReply(): BotResponse {
  return reply(
    [
      "AdminHub Global is strongest for SMEs that need structured digital operations, not just a basic online presence.",
      "",
      "Best-fit sectors include:",
      `• ${BEST_FIT_SECTORS.join("\n• ")}`,
      "",
      "Poor-fit prospects are usually businesses that only want social media presence or are not ready to move beyond basic digital visibility.",
    ].join("\n"),
    [SUGG.START, SUGG.BUSINESS, SUGG.OPERATIONS]
  );
}

function getComparisonReply(): BotResponse {
  return reply(
    [
      "The simple difference is:",
      "",
      "DIY builders help people assemble websites.",
      "AdminHub builds custom digital infrastructure around how a business actually works.",
      "",
      "AdminHub Global is better suited for workflows, portals, dashboards, messaging, uploads, proposals, support processes, and operational systems that need more flexibility than boxed-in page-builder tooling.",
    ].join("\n"),
    [SUGG.PROOF, SUGG.BUSINESS, SUGG.OPERATIONS, SUGG.START]
  );
}

function fallbackReply(): BotResponse {
  return reply(
    pick([
      "I can help with AdminHub Global, the 48-hour proof process, Partner Portal, Client Hub, admin workflows, proposals, messaging, uploads, recurring support, and custom PWA positioning. Tell me what you want to understand.",
      "Tell me whether you are asking as a client, agent, partner, or internal admin user, and I’ll guide the next step.",
      "If you are ready to move forward, the best step is to submit a structured inquiry so AdminHub can review your identity, business context, and request before private follow-up.",
    ]),
    [SUGG.START, SUGG.PROOF, SUGG.PARTNERS, SUGG.CLIENT]
  );
}

function detectReply(text: string, path = ""): BotResponse {
  if (!text) return getGreetingReply();

  if (
    containsAny(text, [
      /\b(hello|hi|hey|morning|afternoon|evening|start|menu)\b/,
      /\b(dumela|hola)\b/,
    ])
  ) {
    return getGreetingReply();
  }

  if (
    containsAny(text, [
      /\b(what can i do|this page|page help|where am i|how do i use this)\b/,
    ])
  ) {
    return getPageHelpReply(path);
  }

  if (
    containsAny(text, [
      /\b(48|forty eight|proof|prototype|preview|rapid|sprint|vercel)\b/,
      /\b(live version|live proof|working version)\b/,
    ])
  ) {
    return getProofReply();
  }

  if (
    containsAny(text, [
      /\b(custom|framework|next\.?js|firebase|tailwind|uploadthing)\b/,
      /\b(boxed|builder|page builder|wix|joomla|wordpress|diy)\b/,
    ])
  ) {
    return getCustomFrameworkReply();
  }

  if (
    containsAny(text, [
      /\b(9th|ninth|iteration|battle tested|refined|repeatable)\b/,
    ])
  ) {
    return getNinthIterationReply();
  }

  if (
    containsAny(text, [
      /\b(agent|agents|partner|partners|sales partner|commission|commissions|payout)\b/,
    ])
  ) {
    return getPartnerReply();
  }

  if (
    containsAny(text, [
      /\b(client hub|client portal|client dashboard|client login|client access)\b/,
    ])
  ) {
    return getClientHubReply();
  }

  if (
    containsAny(text, [
      /\b(admin|dashboard|control|command center|adminhub global control)\b/,
    ])
  ) {
    return getAdminControlReply();
  }

  if (
    containsAny(text, [
      /\b(business pwa|service business|service sme|sme pwa)\b/,
    ])
  ) {
    return getBusinessPwaReply();
  }

  if (
    containsAny(text, [
      /\b(operations pwa|workflow|workflows|case|cases|claims|requests|records|multi-role|operational)\b/,
    ])
  ) {
    return getOperationsPwaReply();
  }

  if (
    containsAny(text, [
      /\b(price|pricing|cost|package|packages|tier|tiers|how much|quote)\b/,
    ])
  ) {
    return getPricingReply();
  }

  if (
    containsAny(text, [
      /\b(monthly|support|retainer|managed support|recurring|maintenance)\b/,
    ])
  ) {
    return getSupportReply();
  }

  if (
    containsAny(text, [
      /\b(pwa|install|installable|offline|app|mobile app|standalone|manifest)\b/,
    ])
  ) {
    return getPwaReply();
  }

  if (
    containsAny(text, [
      /\b(pdf|proposal|catalog|catalogue|scope|export|document|invoice)\b/,
    ])
  ) {
    return getPdfReply();
  }

  if (
    containsAny(text, [
      /\b(contact|inquiry|enquiry|submit|reach|message|talk|speak|follow up)\b/,
    ])
  ) {
    return getInquiryReply();
  }

  if (
    containsAny(text, [
      /\b(best fit|good fit|who is this for|ideal customer|sector|industry|industries)\b/,
    ])
  ) {
    return getFitReply();
  }

  if (
    containsAny(text, [
      /\b(compare|difference|different|better than|vs|versus)\b/,
      /\b(wix|joomla|wordpress|shopify|squarespace|diy builder)\b/,
    ])
  ) {
    return getComparisonReply();
  }

  return fallbackReply();
}

export async function POST(req: Request) {
  let raw = "";
  let path = "";

  try {
    const body = await req.json();
    raw = String(body?.message ?? "");
    path = String(body?.path ?? "");
  } catch {
    raw = "";
    path = "";
  }

  const text = normalize(raw);
  return NextResponse.json(detectReply(text, normalize(path)));
}