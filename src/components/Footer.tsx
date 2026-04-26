"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";

const COMPANY = {
  name: "AdminHub (Pty) Ltd",
  product: "AdminHub Global",
  privacySummaryPath: "/privacy",
};

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "48-Hour Live Proof", href: "/c/rapid-proof" },
  { label: "Business PWA", href: "/c/business-pwa" },
  { label: "Operations PWA", href: "/c/operations-pwa" },
  { label: "Partner Portal", href: "/partners" },
  { label: "Client Hub", href: "/client/dashboard" },
  { label: "Insights", href: "/blog" },
  { label: "Submit Inquiry", href: "/contact" },
];

const PLATFORM_MODULES = [
  {
    icon: <LayoutDashboard size={16} />,
    label: "Admin dashboards",
  },
  {
    icon: <Users size={16} />,
    label: "Agent and lead tracking",
  },
  {
    icon: <BriefcaseBusiness size={16} />,
    label: "Client project workspaces",
  },
  {
    icon: <MessageCircle size={16} />,
    label: "Messaging and uploads",
  },
  {
    icon: <FileText size={16} />,
    label: "Proposal and PDF tools",
  },
  {
    icon: <Bot size={16} />,
    label: "AI-guided support",
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 overflow-hidden border-t border-[var(--border)] bg-[linear-gradient(180deg,rgba(6,10,18,0.98)_0%,rgba(11,18,32,0.98)_100%)] text-[var(--text-primary)]">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent_0%,rgba(77,163,255,0.45)_18%,rgba(24,199,184,0.6)_50%,rgba(77,163,255,0.45)_82%,transparent_100%)]" />
      <div className="pointer-events-none absolute inset-0 panel-grid opacity-40" />
      <div className="pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full bg-[rgba(77,163,255,0.1)] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-12 h-72 w-72 rounded-full bg-[rgba(24,199,184,0.08)] blur-3xl" />

      <div className="container relative py-12 md:py-14">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          <section aria-labelledby="footer-brand" className="space-y-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                AdminHub Global
              </p>
              <h2
                id="footer-brand"
                className="mt-2 text-2xl font-extrabold tracking-[-0.04em]"
              >
                Custom PWA operating system.
              </h2>
            </div>

            <p className="max-w-[35ch] text-sm leading-7 text-[var(--text-secondary)]">
              A founder-led platform for managing agents, leads, client
              onboarding, project delivery, proposals, messaging, uploads, and
              recurring managed support.
            </p>

            <div className="flex flex-wrap gap-2">
              <span className="badge">
                <Sparkles size={14} />
                48-hour proof
              </span>
              <span className="badge">
                <Network size={14} />
                Custom framework
              </span>
              <span className="badge badge-neutral">
                <ShieldCheck size={14} />
                9th iteration
              </span>
            </div>

            <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4 text-sm leading-7 text-[var(--text-secondary)] shadow-[var(--shadow-sm)]">
              <p className="inline-flex items-center gap-2 font-extrabold text-[var(--text-primary)]">
                <ShieldCheck size={16} className="text-[var(--brand-primary)]" />
                Business credibility
              </p>

              <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                {COMPANY.name} is a formally incorporated Botswana company
                building {COMPANY.product} as a custom, export-ready PWA
                delivery and operations platform.
              </p>
            </div>
          </section>

          <section aria-labelledby="footer-inquiry" className="space-y-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                Inquiry flow
              </p>
              <h3 id="footer-inquiry" className="mt-2 text-lg font-extrabold">
                Start with structured details.
              </h3>
            </div>

            <div className="frame-gold p-4">
              <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                <div className="flex items-start gap-3 rounded-2xl">
                  <span className="mt-0.5 text-[var(--brand-primary)]">
                    <ClipboardList size={18} />
                  </span>
                  <span>
                    <span className="block font-bold text-[var(--text-primary)]">
                      Submit project context first
                    </span>
                    <span className="block">
                      Share your identity, business, region, role, and what you
                      need before any private follow-up happens.
                    </span>
                  </span>
                </div>

                <div className="flex items-start gap-3 rounded-2xl">
                  <span className="mt-0.5 text-[var(--brand-primary)]">
                    <LockKeyhole size={18} />
                  </span>
                  <span>
                    <span className="block font-bold text-[var(--text-primary)]">
                      No public direct contact details
                    </span>
                    <span className="block">
                      AdminHub Global uses a controlled inquiry flow instead of
                      exposing personal phone or email details publicly.
                    </span>
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Link href="/contact" className="btn btn-primary w-full">
                  <FileText size={18} />
                  Submit Inquiry
                </Link>

                <Link href="/partners" className="btn btn-outline w-full">
                  <Users size={18} />
                  Partner Access Request
                </Link>
              </div>
            </div>
          </section>

          <nav aria-labelledby="footer-links" className="space-y-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                Navigation
              </p>
              <h3 id="footer-links" className="mt-2 text-lg font-extrabold">
                Quick links
              </h3>
            </div>

            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
              {QUICK_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-2 transition hover:text-[var(--brand-primary)]"
                  >
                    <ArrowRight size={14} />
                    {item.label}
                  </Link>
                </li>
              ))}

              <li>
                <Link
                  href={COMPANY.privacySummaryPath}
                  className="inline-flex items-center gap-2 transition hover:text-[var(--brand-primary)]"
                >
                  <ArrowRight size={14} />
                  Privacy Summary
                </Link>
              </li>
            </ul>
          </nav>

          <section aria-labelledby="footer-info" className="space-y-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                Platform scope
              </p>
              <h3 id="footer-info" className="mt-2 text-lg font-extrabold">
                Built beyond brochure sites.
              </h3>
            </div>

            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              AdminHub Global is not a boxed-in DIY website builder. It is a
              custom reusable PWA framework for workflows, portals, dashboards,
              files, proposals, messaging, client delivery, and managed support.
            </p>

            <div className="grid gap-2">
              {PLATFORM_MODULES.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[rgba(15,23,42,0.62)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                >
                  <span className="text-[var(--brand-primary)]">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
              <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                <Workflow size={16} className="text-[var(--brand-primary)]" />
                Phase 1 workflow
              </p>

              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                Lead → qualify → 48-hour proof → convert → onboard → build →
                launch → monthly support.
              </p>

              <div className="mt-4">
                <Link href="/c/rapid-proof" className="btn btn-outline w-full">
                  <Globe2 size={18} />
                  View Proof Process
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="relative border-t border-[var(--border)] bg-[rgba(6,10,18,0.92)]">
        <div className="container flex flex-col gap-3 py-4 text-xs text-[var(--text-muted)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            &copy; {year} {COMPANY.name}. {COMPANY.product}. All rights
            reserved.
          </div>

          <div className="flex flex-col gap-1 lg:text-right">
            <div>
              Custom 9th-iteration PWA framework for agents, clients, projects,
              and managed support.
            </div>
            <div>
              Direct private contact details are intentionally not displayed
              publicly. Please use the structured inquiry flow.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}