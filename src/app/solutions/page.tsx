import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  Network,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  Workflow,
} from "lucide-react";

const coreSolutions = [
  {
    title: "48-Hour Live Proof",
    eyebrow: "Rapid proof sprint",
    desc: "Turn a short intake or company profile into a live preliminary PWA direction, then use that proof to move toward implementation.",
    href: "/c/rapid-proof",
    icon: <Clock3 size={20} />,
    points: [
      "Short intake or company profile review",
      "Live preview direction",
      "Early backend/admin direction where relevant",
      "Built to reduce buyer uncertainty",
    ],
  },
  {
    title: "Business PWA",
    eyebrow: "Structured SME system",
    desc: "A custom business platform for service SMEs that need more than a brochure website.",
    href: "/c/business-pwa",
    icon: <LayoutDashboard size={20} />,
    points: [
      "Public website",
      "Admin dashboard",
      "Client portal",
      "Messaging, uploads, and support flow",
    ],
  },
  {
    title: "Operations PWA",
    eyebrow: "Workflow-heavy systems",
    desc: "Custom operational infrastructure for businesses managing cases, onboarding, requests, documents, projects, and support.",
    href: "/c/operations-pwa",
    icon: <Workflow size={20} />,
    points: [
      "Workflow and case handling",
      "Multi-role structure",
      "Files and document support",
      "Recurring support visibility",
    ],
  },
];

const platformModules = [
  {
    title: "Agent Management",
    desc: "Track agents, regions, submitted leads, opportunity status, commission terms, and payout notes.",
    icon: <Users size={18} />,
  },
  {
    title: "Lead Pipeline",
    desc: "Capture inquiries, qualify opportunities, track selected packages, and move leads toward conversion.",
    icon: <Network size={18} />,
  },
  {
    title: "Client Onboarding",
    desc: "Collect intake details, branding assets, files, approvals, project context, and launch requirements.",
    icon: <BriefcaseBusiness size={18} />,
  },
  {
    title: "Project Workspace",
    desc: "Manage progress updates, notes, messages, uploads, support status, and project delivery visibility.",
    icon: <LayoutDashboard size={18} />,
  },
  {
    title: "Proposal & PDF Tools",
    desc: "Generate service guides, proof summaries, proposal-ready documents, onboarding summaries, and scope notes.",
    icon: <FileText size={18} />,
  },
  {
    title: "Managed Support",
    desc: "Track monthly support plans, client status, support notes, renewal state, and recurring service continuity.",
    icon: <ShieldCheck size={18} />,
  },
];

const workflowSteps = [
  "Lead submitted",
  "Qualified",
  "48-hour proof",
  "Converted",
  "Onboarded",
  "Built",
  "Launched",
  "Monthly support",
];

export default function SolutionsPage() {
  return (
    <main id="main" className="bg-[var(--background)] text-[var(--foreground)]">
      <section className="page-shell relative overflow-hidden border-b border-[var(--border)]">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[rgba(77,163,255,0.12)] blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-[rgba(24,199,184,0.1)] blur-3xl" />

        <div className="container relative">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="space-y-6">
              <div className="eyebrow">
                <Globe2 size={15} />
                AdminHub Global Solutions
              </div>

              <div className="space-y-4">
                <h1 className="max-w-[12ch]">
                  Custom PWA solutions for proof, delivery, and support.
                </h1>

                <p className="lead max-w-[64ch]">
                  AdminHub Global is built around a practical business workflow:
                  prove the idea quickly, convert the client, onboard properly,
                  run the build, and keep the system supported after launch.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/contact" prefetch={false} className="btn btn-primary">
                  <ClipboardIcon />
                  Submit Project Inquiry
                </Link>

                <Link
                  href="/c/rapid-proof"
                  prefetch={false}
                  className="btn btn-outline"
                >
                  View 48-Hour Proof
                  <ArrowRight size={18} />
                </Link>

                <Link href="/partners" prefetch={false} className="btn btn-ghost">
                  <Users size={18} />
                  Partner Portal
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="badge">
                  <Sparkles size={14} />
                  9th iteration
                </span>
                <span className="badge">
                  <Network size={14} />
                  Custom framework
                </span>
                <span className="badge badge-neutral">
                  <LockKeyhole size={14} />
                  Structured inquiry only
                </span>
              </div>
            </div>

            <div className="card-elevated p-5 md:p-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                Phase 1 operating flow
              </p>

              <h2 className="mt-2 text-2xl">Lead to monthly support.</h2>

              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                The first product milestone is simple: an agent brings a lead,
                AdminHub qualifies it, converts it, onboards the client, runs the
                build, and keeps the client on managed support.
              </p>

              <div className="mt-5 grid gap-2">
                {workflowSteps.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[rgba(15,23,42,0.68)] px-3 py-2"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-extrabold text-[var(--text-on-brand)]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-[var(--text-secondary)]">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="container">
          <div className="mb-6 space-y-2">
            <div className="eyebrow">Core solution paths</div>
            <h2 className="section-title">Three main ways to package the offer.</h2>
            <p className="section-copy">
              These routes keep the public structure clean while preserving your
              existing `/c/[category]` framework convention.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {coreSolutions.map((solution) => (
              <article key={solution.title} className="card h-full overflow-hidden">
                <div className="card-inner flex h-full flex-col">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-tint)] text-[var(--brand-primary)]">
                      {solution.icon}
                    </span>

                    <span className="rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.68)] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      {solution.eyebrow}
                    </span>
                  </div>

                  <h3 className="text-xl">{solution.title}</h3>

                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {solution.desc}
                  </p>

                  <ul className="mt-5 space-y-2">
                    {solution.points.map((point) => (
                      <li
                        key={point}
                        className="flex gap-2 text-sm leading-7 text-[var(--text-secondary)]"
                      >
                        <CheckCircle2
                          size={16}
                          className="mt-1 shrink-0 text-[var(--brand-primary)]"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6">
                    <Link
                      href={solution.href}
                      prefetch={false}
                      className="btn btn-outline w-full"
                    >
                      Explore {solution.title}
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell border-y border-[var(--border)] bg-[rgba(11,18,32,0.58)]">
        <div className="container">
          <div className="mb-6 space-y-2">
            <div className="eyebrow">Platform modules</div>
            <h2 className="section-title">What AdminHub Global can manage.</h2>
            <p className="section-copy">
              The public site is only the front layer. The deeper value is in
              the dashboards, portals, workflows, uploads, PDF tools, and
              support systems behind the business.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {platformModules.map((module) => (
              <div key={module.title} className="card-outline-gold">
                <div className="card-inner">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-tint)] text-[var(--brand-primary)]">
                    {module.icon}
                  </span>

                  <h3 className="text-lg">{module.title}</h3>

                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    {module.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div className="frame-gold p-5 md:p-6">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-[var(--brand-primary)]">
                  <ShieldCheck size={20} />
                </span>

                <div>
                  <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                    Custom, not boxed-in
                  </p>

                  <h2 className="mt-2 text-2xl">
                    Built for workflows, portals, and operations.
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    AdminHub Global is not positioned like Wix, Joomla-style
                    templates, or boxed-in DIY page builders. It is a custom
                    Next.js, TailwindCSS, Firebase, UploadThing, and PWA
                    framework designed for deeper business-specific systems.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: <Bot size={18} />,
                  title: "AI-guided experience",
                  desc: "The assistant can guide users around platform features, onboarding, client support, and inquiry flows.",
                },
                {
                  icon: <UploadCloud size={18} />,
                  title: "Files and uploads",
                  desc: "Support project files, onboarding assets, shared documents, proof materials, and client communication.",
                },
                {
                  icon: <BadgeDollarSign size={18} />,
                  title: "Recurring support",
                  desc: "Track managed support plans, client status, agent commission links, and post-launch continuity.",
                },
                {
                  icon: <MessageCircle size={18} />,
                  title: "Controlled inquiry",
                  desc: "No public phone or email exposure. Visitors submit structured identity and project context first.",
                },
              ].map((item) => (
                <div key={item.title} className="card">
                  <div className="card-inner">
                    <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-tint)] text-[var(--brand-primary)]">
                      {item.icon}
                    </span>

                    <h3 className="text-base">{item.title}</h3>

                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-[var(--border-strong)] bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.94)_48%,rgba(24,199,184,0.12)_100%)] p-5 shadow-[var(--shadow-lg)] md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                  Ready for review
                </p>

                <h2 className="mt-2 text-2xl">
                  Submit structured details before private follow-up.
                </h2>

                <p className="mt-3 max-w-[70ch] text-sm leading-7 text-[var(--text-secondary)]">
                  AdminHub Global should collect identity, business context,
                  country or region, role, and project need first. Direct private
                  contact details stay off the public site.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                <Link href="/contact" prefetch={false} className="btn btn-primary">
                  <FileText size={18} />
                  Submit Inquiry
                </Link>

                <Link href="/partners" prefetch={false} className="btn btn-outline">
                  <Users size={18} />
                  Partner Access
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ClipboardIcon() {
  return <FileText size={18} />;
}