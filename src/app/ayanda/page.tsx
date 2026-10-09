"use client";

import { useEffect, useState } from "react";
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



const museumItems = [
  { category: "References & Records", title: "Archive document 01", description: "Supporting source material supplied for the professional record.", href: "https://drive.google.com/file/d/1ywlV2F8vnfIedIQtg2_Dd5kucRrxBtLZ/view?usp=sharing" },
  { category: "References & Records", title: "Archive document 02", description: "Supporting source material supplied for the professional record.", href: "https://drive.google.com/file/d/1x84eV1mFPOYxTPsainsRxq30LB_o576Q/view" },
  { category: "References & Records", title: "Archive document 03", description: "Supporting source material supplied for the professional record.", href: "https://drive.google.com/file/d/1ggTtLxo7xV6THxgs3GMdXYCnCmReSCe_/view" },
  { category: "Published", title: "Newspaper archive", description: "Newspaper source. Ayanda is in the second-last row, first from the right.", href: "https://drive.google.com/file/d/1uybb5ic9Ixqk74BQg2lcIVPksd4aZzMg/view" },
  { category: "Art & Creative Work", title: "Artwork archive 01", description: "Original creative-work source supplied for the museum.", href: "https://drive.google.com/file/d/12voudI4goOx2wxLa6dAetXLYoris3eDN/view" },
  { category: "Art & Creative Work", title: "Artwork archive 02", description: "Original creative-work source supplied for the museum.", href: "https://drive.google.com/file/d/1HusCy1-nxz1HuuLx6SHVhHS56vkj0-u0/view" },
  { category: "Art & Creative Work", title: "Artwork archive 03", description: "Original creative-work source supplied for the museum.", href: "https://drive.google.com/file/d/1TJjSmCobfHNmmRAXAGbDnEyLQXVWFl1N/view" },
  { category: "Art & Creative Work", title: "Artwork archive 04", description: "Original creative-work source supplied for the museum.", href: "https://drive.google.com/file/d/1ojNvvtAJ_rMU_QMuBvSaQ22WiKbpXF42/view" },
  { category: "Art & Creative Work", title: "Artwork archive 05", description: "Original creative-work source supplied for the museum.", href: "https://drive.google.com/file/d/1VgNVOW0lu457EMXNApC8mmzpZspppRHA/view" },
  { category: "Art & Creative Work", title: "Artwork archive 06", description: "Original creative-work source supplied for the museum.", href: "https://drive.google.com/file/d/1jEhbApDkHPCJwV146RzDn63QVewnbOEf/view" },
];

const museumCategories = ["References & Records", "Published", "Art & Creative Work"];

const work = [
  {
    title: "Admin Hub",
    role: "Founder · Product Builder · Product Operator",
    period: "2026",
    copy:
      "Independent product and technical work across business applications, operational systems, PWAs, automation, games and client delivery.",
    href: "https://adminhub-global.com",
    label: "Admin Hub",
  },
  {
    title: "CommissionCrowd",
    role: "Independent Contractor · Business Operations, Client Support & Systems",
    period: "2026",
    copy:
      "Long-term international remote work across client communication, research, follow-up, data handling and SaaS business operations.",
    href: "https://drive.google.com/file/d/1WDlMlzdXPAmwH3ajtnBFKhvpx8puDQac/view?usp=sharing",
    label: "CommissionCrowd reference",
  },
  {
    title: "RedPlanet",
    role: "AI Automation Specialist",
    period: "Jul – Aug 2026",
    copy:
      "Short technical operations engagement involving automation, browser profiles, APIs, PowerShell, monitoring, QA and recovery work.",
    href: "https://docs.google.com/document/d/1DuUwA1Ms8Nrr9GsPrXE5vZ5z3UJdfPjBH_YaAqKB2mQ/edit?usp=sharing",
    label: "Technical project record",
  },
  {
    title: "Markee Books / Markee Media",
    role: "Sales & Client Success Contractor",
    period: "Jun – Jul 2026",
    copy:
      "Client-facing sales and operational work across outreach, workflow coordination, research and support.",
    href: "https://docs.google.com/document/d/15VS0xBd_YLetSi-rkG2l4ICgRyCrEg_7KPJ1_bf85Bc/edit?tab=t.0#heading=h.k2wc9b9q8grx",
    label: "Operational performance report",
  },
  {
    title: "Northshore Supply",
    role: "E-commerce Product Research & Marketplace Operations",
    period: "Jul – Aug 2026",
    copy:
      "Marketplace research, product evaluation and lead-tracking work for a Canadian e-commerce operation.",
    href: "https://docs.google.com/spreadsheets/d/1Ma02xy6E8O9rrhLXb_qBXqpB4NfsqWVODgjzetXNXbk/edit?gid=1090512502#gid=1090512502",
    label: "Northshore live lead tracker",
  }
];

const adminHubWork = [
  ["BoardSignal", "Founder-built live product · 100+ users", "/boardsignal"],
  ["Translend TMS", "Current client product work through Admin Hub", "https://translend-tms.vercel.app/pipeline"],
  ["PurePress", "Client product", "https://purepress-omega.vercel.app/"],
  ["Meating Place", "Client product", "https://meating-place.vercel.app/"],
  ["Namane Tyres", "Business application", "http://namane-tyres.vercel.app/"],
  ["Admin Hub Games", "Games / PWA product line", "https://admin-hub-games.vercel.app/"],
];

const evidence = [
  ["GitHub development history", "Public software development record since 2020.", "https://github.com/gatshaayanda"],
  ["LinkedIn", "Professional history and recommendations.", "https://www.linkedin.com/in/ayandagatsha"],
  ["Independent reviews", "Public customer reviews for Admin Hub.", "https://www.trustpilot.com/review/adminhub-global.com"],
  ["CommissionCrowd reference", "Long-term independent-contractor reference from CommissionCrowd.", "https://drive.google.com/file/d/1WDlMlzdXPAmwH3ajtnBFKhvpx8puDQac/view?usp=sharing"],
  ["BoardSignal project record", "Product and business-operations case study.", "https://docs.google.com/document/d/1sFsrmiBoNg8Q9jqTpWJEvuLZCjJiNavqBnVPmLfERBE/edit?tab=t.0#heading=h.yb7rpc0vo3y"],
  ["RedPlanet technical case study", "Automation and technical-operations project record.", "https://docs.google.com/document/d/1DuUwA1Ms8Nrr9GsPrXE5vZ5z3UJdfPjBH_YaAqKB2mQ/edit?usp=sharing"],
  ["Markee operational report", "Operational learning and performance report.", "https://docs.google.com/document/d/15VS0xBd_YLetSi-rkG2l4ICgRyCrEg_7KPJ1_bf85Bc/edit?tab=t.0#heading=h.k2wc9b9q8grx"],
  ["Northshore live lead tracker", "Live research and sourcing work record.", "https://docs.google.com/spreadsheets/d/1Ma02xy6E8O9rrhLXb_qBXqpB4NfsqWVODgjzetXNXbk/edit?gid=1090512502#gid=1090512502"],
  ["The Navigator", "Published journalism and service writing.", "https://thenav.ca/sports-life/lifestyle/a-guide-to-adulting-university-edition/"],
  ["The Other Press", "Published journalism and reporting.", "https://theotherpress.ca/?s=Ayanda"],
  ["Current CV", "Current recruiter-facing CV and professional record.", "https://docs.google.com/document/d/1KY3iqIML-gVlRaAgNgf5_GrcO5tLerBlw_3X4aF6rp0/edit?usp=sharing"],
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
  const [museumOpen, setMuseumOpen] = useState<number | null>(null);
  const activeMuseumItem = museumOpen === null ? null : museumItems[museumOpen];

  useEffect(() => {
    if (museumOpen === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMuseumOpen(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [museumOpen]);

  return (
    <main className="ayanda-profile overflow-x-clip bg-[#f7f7f3] text-[#111318]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-5 sm:py-12 md:px-8 md:py-20">
        <header className="border-b border-black/15 pb-10">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-black/50">
            Professional profile
          </p>

          <h1 className="max-w-4xl break-words text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl md:text-6xl">
            AYANDA KOPANO GATSHA
          </h1>

          <p className="mt-4 max-w-3xl text-lg font-semibold leading-7 sm:text-xl sm:leading-8 md:text-2xl">
            Technical Operations &amp; Product Systems Specialist{" "}
            <span className="text-black/35">|</span> Founder &amp; Product Operator
          </p>

          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-black/55">
            EMEA <span className="mx-2">|</span> GMT+2 <span className="mx-2">|</span>{" "}
            International Remote
          </p>

          <div className="mt-7 flex min-w-0 flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-3">
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
          <div className="grid min-w-0 gap-8 md:grid-cols-[0.7fr_1.3fr]">
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
                the products and client work behind that umbrella. Translend TMS is included here
                because it is current client product work delivered through Admin Hub, not a separate company.
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


        <section className="border-y border-black/10 py-10">
          <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">Museum of Success</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em]">The record behind the profile.</h2>
              <p className="mt-4 max-w-sm leading-7 text-black/60">A compact archive of source material. The page stays readable; the evidence opens only when you ask for it.</p>
            </div>
            <div>
              <div className="flex flex-wrap gap-2">
                {museumCategories.map((category) => <span key={category} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-black/55">{category}</span>)}
              </div>
              <div className="mt-5 divide-y divide-black/10 border-y border-black/10">
                {museumItems.map((item, index) => (
                  <button key={item.href} type="button" onClick={() => setMuseumOpen(index)} className="group flex w-full items-center justify-between gap-5 py-4 text-left transition hover:bg-black/[0.025]" aria-label={`Open ${item.title}`}>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-black/35">{item.category}</span>
                      <span className="mt-1 block truncate font-semibold group-hover:text-blue-700">{item.title}</span>
                      <span className="mt-1 block truncate text-sm text-black/50">{item.description}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-black/35 group-hover:text-blue-700">OPEN ↗</span>
                  </button>
                ))}
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


        <section className="border-t border-black/10 pt-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">Start here</p>
          <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold tracking-[-0.035em]">Start here.</h2>
              <p className="mt-3 max-w-2xl leading-7 text-black/65">If you would like to discuss a role, project or practical product opportunity, start here.</p>
            </div>
            <Link href="/#start" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#111318] px-5 py-3 text-sm font-bold text-white hover:bg-black">Start here <ArrowUpRight size={16} /></Link>
          </div>
        </section>

        {activeMuseumItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#111318]/75 p-3 sm:p-5 md:p-8" role="dialog" aria-modal="true" aria-labelledby="museum-dialog-title" onClick={() => setMuseumOpen(null)}>
            <section className="relative flex max-h-[calc(100dvh-24px)] w-full max-w-5xl min-w-0 flex-col overflow-hidden rounded-xl bg-[#f7f7f3] text-[#111318] shadow-2xl sm:max-h-[calc(100dvh-40px)]" onClick={(event) => event.stopPropagation()}>
              <header className="grid min-w-0 grid-cols-1 gap-3 border-b border-black/10 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">{activeMuseumItem.category}</p>
                  <h2 id="museum-dialog-title" className="mt-1 break-words text-lg font-bold leading-snug sm:text-xl">{activeMuseumItem.title}</h2>
                  <p className="mt-1 break-words text-sm leading-6 text-black/60">{activeMuseumItem.description}</p>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
                  <a href={activeMuseumItem.href} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center justify-center rounded-full border border-black/15 bg-white px-4 py-2.5 text-xs font-bold leading-5 hover:border-black/30">Open original in Drive ↗</a>
                  <button type="button" onClick={() => setMuseumOpen(null)} className="inline-flex items-center justify-center rounded-full bg-[#111318] px-4 py-2.5 text-xs font-bold leading-5 text-white hover:bg-black">Close</button>
                </div>
              </header>
              <div className="min-h-0 w-full flex-1 overflow-auto bg-white">
                <iframe title={activeMuseumItem.title} src={activeMuseumItem.href.replace("/view", "/preview")} className="block h-full min-h-[55vh] w-full border-0" allow="autoplay" />
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
