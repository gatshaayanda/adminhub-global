import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  Network,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Workflow,
} from "lucide-react";

const partnerBenefits = [
  {
    title: "A clearer B2B offer",
    desc: "Agents are not selling cheap brochure websites. They are introducing custom PWA systems, portals, dashboards, workflows, and managed support.",
    icon: <BriefcaseBusiness size={18} />,
  },
  {
    title: "48-hour proof advantage",
    desc: "Qualified prospects can move from intake or company profile to a live preliminary direction, making the offer easier to understand.",
    icon: <Clock3 size={18} />,
  },
  {
    title: "Founder-led fulfillment",
    desc: "Delivery stays close to the founder-led AdminHub process, keeping the sales promise connected to the actual build workflow.",
    icon: <ShieldCheck size={18} />,
  },
  {
    title: "Recurring support potential",
    desc: "The offer can move beyond implementation into managed support, creating stronger long-term commercial value.",
    icon: <BadgeDollarSign size={18} />,
  },
];

const portalModules = [
  {
    title: "Lead submission",
    desc: "Submit prospect details, business context, region, problem, package interest, and follow-up notes.",
    icon: <ClipboardList size={18} />,
  },
  {
    title: "Opportunity tracking",
    desc: "Track whether a lead is new, qualified, proof-ready, converted, onboarded, active, or closed.",
    icon: <Target size={18} />,
  },
  {
    title: "Proof sprint visibility",
    desc: "Give agents a clearer view of where the prospect is in the rapid proof-to-deposit process.",
    icon: <Clock3 size={18} />,
  },
  {
    title: "Commission context",
    desc: "Support future tracking of implementation value, recurring support links, payout status, and notes.",
    icon: <BadgeDollarSign size={18} />,
  },
  {
    title: "Client handoff",
    desc: "Once converted, leads can move into onboarding, project workspace, messaging, files, and support.",
    icon: <Workflow size={18} />,
  },
  {
    title: "Controlled follow-up",
    desc: "Public pages collect structured identity and project context first. Direct private details are not exposed publicly.",
    icon: <LockKeyhole size={18} />,
  },
];

const salesFlow = [
  {
    title: "Identify a good-fit SME",
    desc: "Look for businesses with operational pain: scattered communication, weak follow-up, manual onboarding, no client portal, or poor document handling.",
  },
  {
    title: "Submit structured details",
    desc: "Capture the prospect’s name, business, region, role, current problem, and which solution path may fit.",
  },
  {
    title: "Move toward live proof",
    desc: "Qualified prospects can be guided toward a 48-hour live proof sprint instead of being asked to imagine the result.",
  },
  {
    title: "Convert into implementation",
    desc: "Once the prospect sees value, the opportunity can move into build scope, onboarding, production setup, and launch.",
  },
  {
    title: "Continue into support",
    desc: "After launch, the relationship can continue through monthly managed support, updates, and platform continuity.",
  },
];

const goodFitSectors = [
  "Insurance, advisory, and compliance-style service businesses",
  "Education, training, and course providers",
  "Hospitality and service operators",
  "Consulting, agency, and professional service firms",
  "SMEs with recurring client communication or document handling",
  "Businesses that need portals, dashboards, workflows, files, or support tracking",
];

const poorFitSignals = [
  "Only wants a cheap online flyer",
  "Only wants social media presence",
  "Does not value structured client handling",
  "No clear operational pain",
  "Not ready to move beyond basic digital visibility",
];

export default function PartnerPortalPage() {
  return (
    <main id="main" className="bg-[var(--background)] text-[var(--foreground)]">
      <section className="page-shell relative overflow-hidden border-b border-[var(--border)]">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[rgba(77,163,255,0.12)] blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-[rgba(24,199,184,0.1)] blur-3xl" />

        <div className="container relative">
          <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
            <div className="space-y-6">
              <div className="eyebrow">
                <Users size={15} />
                AdminHub Global • Partner Portal
              </div>

              <div className="space-y-4">
                <h1 className="max-w-[12ch]">
                  A stronger way for agents to sell custom PWA systems.
                </h1>

                <p className="lead max-w-[66ch]">
                  The Partner Portal is the agent-facing layer of AdminHub
                  Global. It supports lead submission, opportunity tracking,
                  proof sprint movement, client handoff, commissions, and
                  recurring support visibility.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/contact" prefetch={false} className="btn btn-primary">
                  <ClipboardList size={18} />
                  Submit Partner Inquiry
                </Link>

                <Link
                  href="/c/rapid-proof"
                  prefetch={false}
                  className="btn btn-outline"
                >
                  View 48-Hour Proof
                  <ArrowRight size={18} />
                </Link>

                <Link href="/solutions" prefetch={false} className="btn btn-ghost">
                  <LayoutDashboard size={18} />
                  View Solutions
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="badge">
                  <Sparkles size={14} />
                  Agent-ready offer
                </span>
                <span className="badge">
                  <Clock3 size={14} />
                  Live proof process
                </span>
                <span className="badge badge-neutral">
                  <LockKeyhole size={14} />
                  Structured inquiry only
                </span>
              </div>
            </div>

            <div className="card-elevated p-5 md:p-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                Partner sales advantage
              </p>

              <h2 className="mt-2 text-2xl">
                Prospects do not need to imagine the solution.
              </h2>

              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                A qualified prospect can move from basic intake or company
                profile into a visible live proof direction. That gives agents a
                clearer next step than selling an abstract future build.
              </p>

              <div className="mt-5 grid gap-3">
                {[
                  "Submit lead",
                  "Qualify opportunity",
                  "Move to 48-hour proof",
                  "Convert to build",
                  "Continue to managed support",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[rgba(15,23,42,0.68)] px-3 py-2"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-extrabold text-[var(--text-on-brand)]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-[var(--text-secondary)]">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <Link href="/contact" prefetch={false} className="btn btn-outline w-full">
                  Request Partner Access
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="container">
          <div className="mb-6 space-y-2">
            <div className="eyebrow">Why agents can sell this</div>
            <h2 className="section-title">
              A clearer offer than generic website sales.
            </h2>
            <p className="section-copy">
              AdminHub Global gives agents a business-infrastructure offer:
              public site, admin dashboard, client portal, messaging, uploads,
              proposals, workflows, and managed support.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {partnerBenefits.map((item) => (
              <InfoCard
                key={item.title}
                title={item.title}
                desc={item.desc}
                icon={item.icon}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell border-y border-[var(--border)] bg-[rgba(11,18,32,0.58)]">
        <div className="container">
          <div className="mb-6 space-y-2">
            <div className="eyebrow">Partner Portal modules</div>
            <h2 className="section-title">What the portal should manage.</h2>
            <p className="section-copy">
              Phase 1 can start simple, then expand into fuller agent operations,
              commission tracking, lead history, and support-linked payouts.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {portalModules.map((item) => (
              <InfoCard
                key={item.title}
                title={item.title}
                desc={item.desc}
                icon={item.icon}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="frame-gold p-5 md:p-6">
              <div className="eyebrow mb-0">
                <Workflow size={15} />
                Recommended sales flow
              </div>

              <h2 className="mt-2 text-2xl">
                From lead to managed support.
              </h2>

              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                The strongest first milestone is not complicated: an agent
                brings a lead, AdminHub qualifies it, creates proof, converts the
                client, runs the build, and keeps the client supported after
                launch.
              </p>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link href="/contact" prefetch={false} className="btn btn-primary">
                  <ClipboardList size={18} />
                  Submit Inquiry
                </Link>

                <Link href="/c/business-pwa" prefetch={false} className="btn btn-outline">
                  Business PWA
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              {salesFlow.map((step, index) => (
                <div
                  key={step.title}
                  className="card-outline-gold overflow-hidden"
                >
                  <div className="card-inner flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-sm font-extrabold text-[var(--text-on-brand)]">
                      {index + 1}
                    </span>

                    <div>
                      <h3 className="text-lg">{step.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell border-y border-[var(--border)] bg-[rgba(11,18,32,0.58)]">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card-elevated p-5 md:p-6">
              <div className="eyebrow mb-0">
                <CheckCircle2 size={15} />
                Good-fit prospects
              </div>

              <h2 className="mt-2 text-2xl">
                Businesses with real operational pain.
              </h2>

              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                The best prospects are not just asking for a pretty homepage.
                They need better structure around clients, communication, files,
                onboarding, requests, support, or internal workflows.
              </p>

              <ul className="mt-5 space-y-3">
                {goodFitSectors.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-sm leading-7 text-[var(--text-secondary)]"
                  >
                    <CheckCircle2
                      size={16}
                      className="mt-1 shrink-0 text-[var(--brand-primary)]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card-elevated p-5 md:p-6">
              <div className="eyebrow mb-0">
                <ShieldCheck size={15} />
                Poor-fit signals
              </div>

              <h2 className="mt-2 text-2xl">
                Not every prospect is the right prospect.
              </h2>

              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                This keeps the sales process honest. AdminHub Global is strongest
                when the prospect values business infrastructure, not just a
                cheap web presence.
              </p>

              <ul className="mt-5 space-y-3">
                {poorFitSignals.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-sm leading-7 text-[var(--text-secondary)]"
                  >
                    <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-primary)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="container">
          <div className="rounded-[1.75rem] border border-[var(--border-strong)] bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.94)_48%,rgba(24,199,184,0.12)_100%)] p-5 shadow-[var(--shadow-lg)] md:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                  Partner access request
                </p>

                <h2 className="mt-2 text-2xl">
                  Submit structured partner details first.
                </h2>

                <p className="mt-3 max-w-[72ch] text-sm leading-7 text-[var(--text-secondary)]">
                  AdminHub Global does not publish direct personal contact
                  details publicly. Partner requests should capture identity,
                  region, sales background, target market, and the type of leads
                  the partner can realistically bring.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                <Link href="/contact" prefetch={false} className="btn btn-primary">
                  <ClipboardList size={18} />
                  Request Partner Access
                </Link>

                <Link href="/blog" prefetch={false} className="btn btn-outline">
                  <FileText size={18} />
                  Read Insights
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
            <b className="text-[var(--text-primary)]">Contact policy:</b>{" "}
            Direct private phone or email details are intentionally not displayed
            on public pages. Submit structured information first so AdminHub can
            review the request and follow up privately.
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: ReactNode;
}) {
  return (
    <article className="card h-full overflow-hidden">
      <div className="card-inner">
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-tint)] text-[var(--brand-primary)]">
          {icon}
        </span>

        <h3 className="text-lg">{title}</h3>

        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
          {desc}
        </p>
      </div>
    </article>
  );
}