"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Github,
  Linkedin,
  Mail,
  MessageCircle,
  ExternalLink,
} from "lucide-react";

const whatsappHref =
  "https://wa.me/26778098928?text=" +
  encodeURIComponent(
    "Hi Ayanda, I found your profile on adminhub-global.com/ayanda and would like to discuss an opportunity."
  );

const work = [
  {
    title: "Admin Hub",
    role: "Founder · Product Builder · Product Operator",
    period: "2022 – Present",
    copy:
      "Independent product and technical work across business applications, operational systems, PWAs, automation, games and client delivery.",
    href: "https://adminhub-global.com",
    label: "Admin Hub",
  },
  {
    title: "CommissionCrowd",
    role: "Independent Contractor · Business Operations, Client Support & Systems",
    period: "2016 – Present",
    copy:
      "Long-term international remote work across client communication, research, follow-up, data handling and SaaS business operations.",
    href: "https://www.commissioncrowd.com",
    label: "Company",
  },
  {
    title: "RedPlanet",
    role: "AI Automation Specialist",
    period: "Jul – Aug 2026",
    copy:
      "Short technical operations engagement involving automation, browser profiles, APIs, PowerShell, monitoring, QA and recovery work.",
  },
  {
    title: "Markee Books / Markee Media",
    role: "Sales & Client Success Contractor",
    period: "Jun – Jul 2026",
    copy:
      "Client-facing sales and operational work across outreach, workflow coordination, research and support.",
  },
  {
    title: "Northshore Supply",
    role: "E-commerce Product Research & Marketplace Operations",
    period: "Jul – Aug 2026",
    copy:
      "Marketplace research, product evaluation and lead-tracking work for a Canadian e-commerce operation.",
  },
  {
    title: "Translend TMS",
    role: "Current client product work through Admin Hub",
    period: "2026 – Present",
    copy:
      "Operational SaaS work spanning delivery workflows, fleet visibility, telematics, organisation identity, offline behaviour and production deployment.",
    href: "https://translend-tms.vercel.app/pipeline",
    label: "Live system",
  },
];

const adminHubWork = [
  ["BoardSignal", "Founder-built live product", "/boardsignal"],
  ["PurePress", "Client product", "https://purepress-omega.vercel.app/"],
  ["Meating Place", "Client product", "https://meating-place.vercel.app/"],
  ["Namane Tyres", "Business application", "http://namane-tyres.vercel.app/"],
  ["Admin Hub Games", "Games / PWA product line", "https://admin-hub-games.vercel.app/"],
];

const evidence = [
  ["GitHub development history", "Public software development record since 2020.", "https://github.com/gatshaayanda"],
  ["Admin Hub", "Company, products and additional project evidence.", "https://adminhub-global.com"],
  ["Independent reviews", "Public customer reviews for Admin Hub.", "https://www.trustpilot.com/review/adminhub-global.com"],
  ["LinkedIn", "Professional history and recommendations.", "https://www.linkedin.com/in/ayandagatsha"],
];

function ExternalLinkRow({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center justify-between gap-4 border-b border-black/10 py-4 first:border-t hover:text-blue-700"
    >
      <span>
        <span className="block font-semibold text-[#111318] group-hover:text-blue-700">
          {title}
        </span>
        <span className="block text-sm leading-6 text-black/60">{description}</span>
      </span>
      <ArrowUpRight size={18} className="shrink-0 text-black/40 group-hover:text-blue-700" />
    </a>
  );
}

export default function AyandaPage() {
  return (
    <main className="ayanda-profile bg-[#f7f7f3] text-[#111318]">
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-20">
        <header className="border-b border-black/15 pb-10">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-black/50">
            Professional profile
          </p>

          <h1 className="max-w-4xl text-4xl font-extrabold tracking-[-0.045em] md:text-6xl">
            AYANDA KOPANO GATSHA
          </h1>

          <p className="mt-4 max-w-3xl text-xl font-semibold leading-8 md:text-2xl">
            Technical Operations &amp; Product Systems Specialist{" "}
            <span className="text-black/35">|</span> Founder &amp; Product Operator
          </p>

          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-black/55">
            EMEA <span className="mx-2">|</span> GMT+2 <span className="mx-2">|</span>{" "}
            International Remote
          </p>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm">
            <a className="inline-flex items-center gap-2 font-semibold hover:text-blue-700" href="mailto:gatshaayanda@gmail.com">
              <Mail size={16} /> gatshaayanda@gmail.com
            </a>
            <a className="inline-flex items-center gap-2 font-semibold hover:text-blue-700" href={whatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle size={16} /> WhatsApp / +267 78 098 928
            </a>
          </div>

          <nav aria-label="Professional links" className="mt-6 flex flex-wrap gap-2">
            <a className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:border-black/30" href="https://adminhub-global.com" target="_blank" rel="noreferrer">
              Portfolio <ArrowUpRight size={15} />
            </a>
            <a className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:border-black/30" href="https://www.linkedin.com/in/ayandagatsha" target="_blank" rel="noreferrer">
              <Linkedin size={15} /> LinkedIn
            </a>
            <a className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:border-black/30" href="https://github.com/gatshaayanda" target="_blank" rel="noreferrer">
              <Github size={15} /> GitHub
            </a>
            <a className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:border-black/30" href="https://www.trustpilot.com/review/adminhub-global.com" target="_blank" rel="noreferrer">
              Reviews <ExternalLink size={14} />
            </a>
            <a className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:border-black/30" href="https://admin-hub-games.vercel.app/" target="_blank" rel="noreferrer">
              Game Catalog <ExternalLink size={14} />
            </a>
          </nav>
        </header>

        <section className="border-b border-black/10 py-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">Professional profile</p>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-black/75">
            Technical operations, product systems and business operations professional with 10+ years
            of international remote experience across SaaS operations, customer support and success,
            product development, automation, technical troubleshooting, commercial research,
            process improvement and digital-product delivery.
          </p>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-black/75">
            I work between business requirements, technology and real-world operations: investigating
            what is actually happening, structuring the evidence, communicating it clearly, and then
            building or improving the practical system required to make the work operate reliably.
          </p>
          <p className="mt-5 max-w-4xl font-semibold text-black/80">
            Investigate → understand → structure → build → verify → operate → improve.
          </p>
        </section>

        <section className="border-b border-black/10 py-10">
          <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">Current direction</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em]">Product systems, technical operations and software.</h2>
            </div>
            <div className="space-y-4 text-base leading-7 text-black/70">
              <p>
                Looking for international remote work where technical understanding, product thinking,
                business operations and human communication overlap.
              </p>
              <p>
                Relevant areas include technical operations, product operations, implementation,
                technical support/success, SaaS operations, business systems, frontend/product
                engineering, technical coordination and HTML5/game development.
              </p>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">Work</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.035em]">A varied working history.</h2>
          </div>

          <div className="divide-y divide-black/10 border-y border-black/10">
            {work.map((item) => (
              <article key={item.title} className="py-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-8">
                  <div>
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <p className="mt-1 font-semibold text-black/65">{item.role}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold uppercase tracking-[0.08em] text-black/45">{item.period}</p>
                </div>
                <p className="mt-3 max-w-3xl leading-7 text-black/65">{item.copy}</p>
                {item.href && (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-900"
                  >
                    {item.label ?? "Evidence"} <ArrowUpRight size={14} />
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-black/10 py-10">
          <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">Admin Hub</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em]">Apps, games, products and experiments.</h2>
            </div>
            <div>
              <p className="mb-5 leading-7 text-black/65">
                Admin Hub is the umbrella for my independent product work. The examples below are
                evidence of the range of work rather than separate companies or separate career identities.
              </p>
              <div className="border-y border-black/10">
                {adminHubWork.map(([title, type, href]) =>
                  href.startsWith("/") ? (
                    <Link
                      key={title}
                      href={href}
                      className="group flex items-center justify-between gap-4 border-b border-black/10 py-4 last:border-b-0"
                    >
                      <span>
                        <span className="block font-semibold group-hover:text-blue-700">{title}</span>
                        <span className="block text-sm text-black/55">{type}</span>
                      </span>
                      <ArrowUpRight size={18} className="text-black/35 group-hover:text-blue-700" />
                    </Link>
                  ) : (
                    <a
                      key={title}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center justify-between gap-4 border-b border-black/10 py-4 last:border-b-0"
                    >
                      <span>
                        <span className="block font-semibold group-hover:text-blue-700">{title}</span>
                        <span className="block text-sm text-black/55">{type}</span>
                      </span>
                      <ArrowUpRight size={18} className="text-black/35 group-hover:text-blue-700" />
                    </a>
                  )
                )}
              </div>
              <a
                href="https://admin-hub-games.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 font-bold text-blue-700 hover:text-blue-900"
              >
                Browse the game catalog <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 py-10">
          <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">Career progression</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em]">Journalism → Operations → Software → Product Systems</h2>
            </div>
            <div className="space-y-5 text-black/70">
              <div>
                <p className="font-bold text-black">2016</p>
                <p className="mt-1 leading-7">Simon Fraser University — New Media Journalism. Research, interviewing, source evaluation, evidence gathering and professional communication.</p>
              </div>
              <div>
                <p className="font-bold text-black">2016 – Present</p>
                <p className="mt-1 leading-7">International remote business operations and client work through CommissionCrowd and independent contracting.</p>
              </div>
              <div>
                <p className="font-bold text-black">2020 – Present</p>
                <p className="mt-1 leading-7">Public software-development progression from structured learning and JavaScript projects into React, Next.js, databases, authentication, full-stack applications and production systems.</p>
              </div>
              <div>
                <p className="font-bold text-black">2022 – Present</p>
                <p className="mt-1 leading-7">Admin Hub: independent product building, client delivery and product ownership.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 py-10">
          <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">Evidence</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em]">Verify the work.</h2>
            </div>
            <div>
              {evidence.map(([title, description, href]) => (
                <ExternalLinkRow key={title} title={title} description={description} href={href} />
              ))}
              <p className="mt-5 text-sm leading-6 text-black/50">
                Detailed CV, references, project records and supporting documentation are available as appropriate.
              </p>
            </div>
          </div>
        </section>

        <section className="pt-10">
          <div className="rounded-2xl border border-black/10 bg-white p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">Contact / availability</p>
            <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-3xl font-extrabold tracking-[-0.035em]">Available for international remote work.</h2>
                <p className="mt-3 max-w-2xl leading-7 text-black/65">
                  Technical operations, product systems, software/product development, business systems,
                  support engineering, implementation and related roles.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <a href="mailto:gatshaayanda@gmail.com?subject=Professional%20opportunity%20-%20Ayanda%20Gatsha" className="inline-flex items-center gap-2 rounded-full bg-[#111318] px-5 py-3 text-sm font-bold text-white hover:bg-black">
                  <Mail size={16} /> Email
                </a>
                <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-5 py-3 text-sm font-bold hover:border-black/30">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
