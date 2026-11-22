"use client";

import { useEffect, useRef, useState } from "react";
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
  { category: "Company & Public Records", title: "Youth Development Fund — LEA consultation", description: "Government Endorsement Confirmation from LEA Gaborone acknowledging consultation on a Youth Development Fund business plan.", href: "https://drive.google.com/file/d/1ywlV2F8vnfIedIQtg2_Dd5kucRrxBtLZ/view?usp=sharing" },
  { category: "Company & Public Records", title: "Admin Hub — Certificate of Incorporation", description: "Certificate of Incorporation for Admin Hub Proprietary Limited.", href: "https://drive.google.com/file/d/1x84eV1mFPOYxTPsainsRxq30LB_o576Q/view" },
  { category: "Credentials & Training", title: "Insurance Training Institute — reference", description: "Reference letter acknowledging completion of long-term and short-term insurance certifications.", href: "https://drive.google.com/file/d/1ggTtLxo7xV6THxgs3GMdXYCnCmReSCe_/view" },
  { category: "Published Record", title: "Mmegi — Rainbow High School Class of 2010", description: "Newspaper feature on Rainbow High School’s high-achieving Class of 2010. Ayanda is in the second-last row, first from the right.", href: "https://drive.google.com/file/d/1uybb5ic9Ixqk74BQg2lcIVPksd4aZzMg/view" },
  { category: "Education & Achievements", title: "Myerscough College — football and BTEC Sport", description: "Award certificate recognizing completion of study in football and BTEC Sport and Excellence.", href: "https://drive.google.com/file/d/12voudI4goOx2wxLa6dAetXLYoris3eDN/view" },
  { category: "References & Recommendations", title: "Dr. Teresa Howell — Psychology 1200 recommendation", description: "Academic letter of recommendation written by Dr. Teresa Howell for Psychology 1200.", href: "https://drive.google.com/file/d/1HusCy1-nxz1HuuLx6SHVhHS56vkj0-u0/view" },
  { category: "References & Recommendations", title: "Stuart Entwistle — character reference", description: "Personal character reference letter written by Stuart Entwistle.", href: "https://drive.google.com/file/d/1TJjSmCobfHNmmRAXAGbDnEyLQXVWFl1N/view" },
  { category: "References & Recommendations", title: "Rainbow High School — academic and athletic reference", description: "Character reference from Rainbow High School highlighting academic and athletic achievements.", href: "https://drive.google.com/file/d/1ojNvvtAJ_rMU_QMuBvSaQ22WiKbpXF42/view" },
  { category: "References & Recommendations", title: "EduKick Manchester — programme recommendation", description: "Recommendation letter summarizing participation in the 2012–2013 EduKick Manchester Football Academy programme.", href: "https://drive.google.com/file/d/1VgNVOW0lu457EMXNApC8mmzpZspppRHA/view" },
  { category: "Technical & Product Work", title: "Chess.com — 9,745-game statistical report", description: "Statistical and narrative analysis of a 9,745-game Chess.com history spanning 2013–2026.", href: "https://drive.google.com/file/d/1jEhbApDkHPCJwV146RzDn63QVewnbOEf/view" },
];

const museumCategories = ["Company & Public Records", "Credentials & Training", "Published Record", "Education & Achievements", "References & Recommendations", "Technical & Product Work"];

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
  const [expandedSections, setExpandedSections] = useState<string[]>(["profile"]);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const toggleSection = (section: string) => setExpandedSections((current) => current.includes(section) ? current.filter((item) => item !== section) : [...current, section]);
  const activeMuseumItem = museumOpen === null ? null : museumItems[museumOpen];

  useEffect(() => {
    if (museumOpen === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMuseumOpen(null);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])')).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [museumOpen]);

  return (
    <main className="ayanda-profile overflow-x-clip bg-[#f7f7f3] text-[#111318]">
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <section className="relative overflow-hidden rounded-[1.6rem] bg-[#111b2b] px-5 py-8 text-white shadow-xl sm:px-9 sm:py-12 lg:px-12 lg:py-14">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-8 -top-12 h-56 w-56 rounded-full border border-white/10" />
          <div className="relative grid gap-9 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#b9d2f5]">Founder &amp; Product Operator · Admin Hub Global</p>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[.98] tracking-[-.055em] sm:text-5xl lg:text-7xl">Ayanda Kopano<br className="hidden sm:block"/> Gatsha<span className="text-[#9fc3f5]">.</span></h1>
              <p className="mt-5 max-w-3xl text-xl font-semibold leading-snug text-white/90 sm:text-2xl">Technical Operations &amp; Product Systems Specialist</p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/95">I connect business operations, technology and product delivery — understanding how work happens, building practical systems, and helping those systems operate reliably.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#selected-work" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#111b2b] transition hover:bg-[#dce9fa]">View selected work <ArrowUpRight size={16}/></a>
                <a href="mailto:gatshaayanda@gmail.com" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"><Mail size={16}/> Contact me</a>
              </div>
            </div>
            <aside className="rounded-2xl border border-white/15 bg-white/[.07] p-5 backdrop-blur-sm sm:p-6">
              <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#b9d2f5]">Professional focus</p>
              <div className="mt-4 grid gap-4">
                <div><p className="text-sm font-bold">Operations</p><p className="mt-1 text-sm leading-6 text-white/90">Workflows, delivery, support and coordination.</p></div>
                <div className="border-t border-white/10 pt-4"><p className="text-sm font-bold">Technology</p><p className="mt-1 text-sm leading-6 text-white/90">Software, integrations, troubleshooting and QA.</p></div>
                <div className="border-t border-white/10 pt-4"><p className="text-sm font-bold">Product</p><p className="mt-1 text-sm leading-6 text-white/90">Ownership, user experience, systems and implementation.</p></div>
              </div>
              <div className="mt-5 border-t border-white/10 pt-4 text-xs font-semibold uppercase tracking-[.12em] text-white/85">Botswana · EMEA · GMT+2 · International remote</div>
            </aside>
          </div>
          <div className="relative mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/15 pt-5 text-sm font-semibold text-white/95">
            <a className="inline-flex items-center gap-2 hover:text-white" href="mailto:gatshaayanda@gmail.com"><Mail size={15}/> gatshaayanda@gmail.com</a>
            <a className="inline-flex items-center gap-2 hover:text-white" href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a>
            <a className="inline-flex items-center gap-2 hover:text-white" href="https://www.linkedin.com/in/ayandagatsha" target="_blank" rel="noreferrer"><Linkedin size={15}/> LinkedIn</a>
            <a className="inline-flex items-center gap-2 hover:text-white" href="https://github.com/gatshaayanda" target="_blank" rel="noreferrer"><Github size={15}/> GitHub</a>
          </div>
        </section>

        <section className="grid gap-5 border-b border-black/10 py-10 md:grid-cols-3">
          <article className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-blue-700">01 · Understand</p><h2 className="mt-3 text-xl font-extrabold">Investigate the real work.</h2><p className="mt-2 text-sm leading-6 text-black/65">Research, evidence gathering, customer context and operational diagnosis.</p></article>
          <article className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-blue-700">02 · Build</p><h2 className="mt-3 text-xl font-extrabold">Make useful systems.</h2><p className="mt-2 text-sm leading-6 text-black/65">Translate requirements into workflows, interfaces, software and practical tools.</p></article>
          <article className="rounded-2xl border border-black/10 bg-white p-5"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-blue-700">03 · Deliver</p><h2 className="mt-3 text-xl font-extrabold">Verify and improve.</h2><p className="mt-2 text-sm leading-6 text-black/65">Test the experience, support the people using it and keep improving how it operates.</p></article>
        </section>

        <section id="selected-work" className="scroll-mt-24 py-12">
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-blue-700">Selected work</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Products built around real problems.</h2></div>
            <p className="max-w-md text-sm leading-6 text-black/60">A selection of independent products and client delivery. Each example represents a different part of the work.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <a href="https://iteration13.vercel.app/" target="_blank" rel="noreferrer" className="group rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg">
              <div className="flex items-center justify-between"><span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-blue-800">Business operating system</span><ArrowUpRight className="text-black/35 group-hover:text-blue-700"/></div><h3 className="mt-5 text-2xl font-black">i13 · Business OS</h3><p className="mt-2 text-sm leading-6 text-black/65">A connected business experience spanning storefront, customer workspace, requests and the owner's Briefcase.</p><p className="mt-5 text-sm font-extrabold text-blue-700">Explore i13 ↗</p>
            </a>
            <a href="https://iteration14.vercel.app/" target="_blank" rel="noreferrer" className="group rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg">
              <div className="flex items-center justify-between"><span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-blue-800">Personal operating system</span><ArrowUpRight className="text-black/35 group-hover:text-blue-700"/></div><h3 className="mt-5 text-2xl font-black">i14 · Backpack OS</h3><p className="mt-2 text-sm leading-6 text-black/65">A personal workspace for Backpacks, channels, circles, updates and private spaces.</p><p className="mt-5 text-sm font-extrabold text-blue-700">Explore i14 ↗</p>
            </a>
            <Link href="/boardsignal" className="group rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg">
              <div className="flex items-center justify-between"><span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">Founder-built live product</span><ArrowUpRight className="text-black/35 group-hover:text-blue-700"/></div><h3 className="mt-5 text-2xl font-black">BoardSignal</h3><p className="mt-2 text-sm leading-6 text-black/65">A live interactive product with more than 100 users, combining structured experiences, community and product operations.</p><p className="mt-5 text-sm font-extrabold text-blue-700">Explore BoardSignal ↗</p>
            </Link>
            <a href="https://translend-tms.vercel.app/pipeline" target="_blank" rel="noreferrer" className="group rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg">
              <div className="flex items-center justify-between"><span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-900">Client product · Admin Hub delivery</span><ArrowUpRight className="text-black/35 group-hover:text-blue-700"/></div><h3 className="mt-5 text-2xl font-black">Translend TMS</h3><p className="mt-2 text-sm leading-6 text-black/65">Current client product work delivered through Admin Hub — included as client delivery, not a separate company.</p><p className="mt-5 text-sm font-extrabold text-blue-700">View product ↗</p>
            </a>
            <a href="https://admin-hub-games.vercel.app/" target="_blank" rel="noreferrer" className="group rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg md:col-span-2">
              <div className="flex items-center justify-between"><span className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-violet-900">Interactive work</span><ArrowUpRight className="text-black/35 group-hover:text-blue-700"/></div><h3 className="mt-5 text-2xl font-black">Admin Hub Games</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-black/65">A collection of browser-based games and interactive experiments — a different view of product design, iteration and technical implementation.</p><p className="mt-5 text-sm font-extrabold text-blue-700">Browse the game catalog ↗</p>
            </a>
          </div>
          <div className="mt-7 rounded-2xl border border-black/10 bg-[#eceeea] p-5 sm:flex sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-black/50">The company behind the work</p><h3 className="mt-1 text-xl font-black">Admin Hub Global</h3><p className="mt-1 text-sm leading-6 text-black/65">Independent product building, client delivery and technical operations.</p></div><a href="https://adminhub-global.com" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 font-extrabold text-blue-700 sm:mt-0">Visit Admin Hub <ArrowUpRight size={16}/></a></div>
        </section>

        <section className="border-t border-black/10 py-12">
          <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr]">
            <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-blue-700">Career journey</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Journalism → Operations → Software → Product Systems</h2><p className="mt-4 text-sm leading-6 text-black/60">A varied path, with each stage adding a capability I use in the work today.</p></div>
            <ol className="relative ml-2 space-y-7 border-l border-black/15 pl-6">
              <li className="relative"><span className="absolute -left-[1.93rem] top-1 h-3 w-3 rounded-full border-2 border-blue-700 bg-[#f7f7f3]"/><p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">2016</p><h3 className="mt-1 font-extrabold">Simon Fraser University · New Media Journalism</h3><p className="mt-1 text-sm leading-6 text-black/65">Research, interviewing, source evaluation, evidence gathering and professional communication.</p></li>
              <li className="relative"><span className="absolute -left-[1.93rem] top-1 h-3 w-3 rounded-full border-2 border-blue-700 bg-[#f7f7f3]"/><p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">2016 – Present</p><h3 className="mt-1 font-extrabold">International remote operations &amp; client work</h3><p className="mt-1 text-sm leading-6 text-black/65">Business operations, client communication, research, follow-up and independent contracting through CommissionCrowd and other engagements.</p></li>
              <li className="relative"><span className="absolute -left-[1.93rem] top-1 h-3 w-3 rounded-full border-2 border-blue-700 bg-[#f7f7f3]"/><p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">2020 – Present</p><h3 className="mt-1 font-extrabold">Software development progression</h3><p className="mt-1 text-sm leading-6 text-black/65">From structured learning and JavaScript projects into React, Next.js, databases, authentication, full-stack applications and production systems.</p></li>
              <li className="relative"><span className="absolute -left-[1.93rem] top-1 h-3 w-3 rounded-full border-2 border-blue-700 bg-[#f7f7f3]"/><p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">2022 – Present</p><h3 className="mt-1 font-extrabold">Admin Hub · Independent product work</h3><p className="mt-1 text-sm leading-6 text-black/65">Product ownership, building, client delivery and the development of connected digital systems.</p></li>
            </ol>
          </div>
          <details className="group mt-9 rounded-2xl border border-black/10 bg-white p-5">
            <summary className="cursor-pointer list-none font-extrabold text-blue-700">Explore detailed work history <span className="float-right text-black/45 group-open:hidden">+</span><span className="float-right hidden text-black/45 group-open:inline">−</span></summary>
            <div className="mt-4 divide-y divide-black/10 border-t border-black/10">
              {work.map((item)=><article key={item.title} className="py-5"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-extrabold">{item.title}</h3><p className="text-sm font-semibold text-black/60">{item.role}</p></div><span className="text-xs font-bold uppercase tracking-wider text-black/45">{item.period}</span></div><p className="mt-2 text-sm leading-6 text-black/65">{item.copy}</p>{item.href&&<a className="mt-2 inline-flex items-center gap-1 text-sm font-extrabold text-blue-700" href={item.href} target="_blank" rel="noreferrer">{item.label??"Supporting record"} <ArrowUpRight size={14}/></a>}</article>)}
            </div>
          </details>
        </section>

        <section className="border-t border-black/10 py-12">
          <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr]">
            <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-blue-700">Museum of Success</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">The evidence behind the work.</h2><p className="mt-4 text-sm leading-6 text-black/60">An organised archive of source material. Open the documents you want to inspect; the full record stays available without overwhelming the profile.</p><div className="mt-5 flex flex-wrap gap-2">{museumCategories.map((category)=><span key={category} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-black/55">{category}</span>)}</div></div>
            <div className="rounded-2xl border border-black/10 bg-white px-5">
              {museumCategories.map((category)=>{const items=museumItems.filter(item=>item.category===category);return <details key={category} className="group border-b border-black/10 last:border-b-0"><summary className="cursor-pointer list-none py-4 font-extrabold">{category}<span className="ml-2 text-xs font-semibold text-black/40">({items.length})</span><span className="float-right text-black/45 group-open:hidden">+</span><span className="float-right hidden text-black/45 group-open:inline">−</span></summary><div className="divide-y divide-black/10 border-t border-black/10">{items.map((item)=>{const index=museumItems.indexOf(item);return <button key={item.href} type="button" onClick={(event)=>{triggerRef.current=event.currentTarget;setMuseumOpen(index);}} className="group flex w-full items-start justify-between gap-3 py-4 text-left hover:bg-black/[.025]" aria-label={`Open ${item.title}`}><span className="min-w-0"><span className="block font-bold leading-6 group-hover:text-blue-700">{item.title}</span><span className="mt-1 block text-sm leading-5 text-black/60">{item.description}</span></span><span className="shrink-0 pt-1 text-xs font-extrabold text-blue-700">OPEN ↗</span></button>})}</div></details>})}
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-black/10 bg-[#eceeea] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-black/50">Additional verification</p><h3 className="mt-1 text-xl font-black">Public records, references &amp; project evidence.</h3><p className="mt-1 text-sm text-black/60">Supporting links for recruiters, collaborators and clients.</p></div><span className="text-sm font-extrabold text-black/50">{evidence.length} resources</span></div>
            <details className="group mt-3"><summary className="cursor-pointer list-none py-3 font-extrabold text-blue-700">Explore supporting evidence <span className="float-right text-black/45 group-open:hidden">+</span><span className="float-right hidden text-black/45 group-open:inline">−</span></summary><div className="border-t border-black/10">{evidence.map(([title,description,href])=><ExternalLinkRow key={title} title={title} description={description} href={href}/>)}</div><p className="mt-4 pb-3 text-xs leading-5 text-black/50">Detailed CV, references, project records and supporting documentation are available through the linked sources.</p></details>
          </div>
        </section>

        <section className="mt-3 rounded-[1.6rem] bg-[#111b2b] p-6 text-white sm:p-9">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#b9d2f5]">Let's work together</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-.04em] sm:text-4xl">A role, a product challenge or an operational problem?</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/95">I'm interested in international remote opportunities and thoughtful collaborations where operations, technology and product delivery meet.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="mailto:gatshaayanda@gmail.com?subject=Professional%20opportunity" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#111b2b] hover:bg-[#dce9fa]"><Mail size={16}/> Discuss an opportunity</a>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"><MessageCircle size={16}/> WhatsApp</a>
            <a href="https://adminhub-global.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">Admin Hub <ArrowUpRight size={15}/></a>
          </div>
          <p className="mt-6 border-t border-white/15 pt-4 text-xs font-semibold uppercase tracking-[.12em] text-white/85">Ayanda Gatsha · Botswana · International remote</p>
        </section>

        {activeMuseumItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#111318]/80 p-2 sm:p-4 md:p-8" onClick={() => setMuseumOpen(null)}>
            <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="museum-dialog-title" className="relative flex max-h-[calc(100dvh-16px)] w-full max-w-5xl min-w-0 flex-col overflow-hidden rounded-xl bg-[#f7f7f3] text-[#111318] shadow-2xl sm:max-h-[calc(100dvh-32px)]" onClick={(event) => event.stopPropagation()}>
              <header className="grid min-w-0 grid-cols-1 gap-3 border-b border-black/10 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-black/45">{activeMuseumItem.category}</p><h2 id="museum-dialog-title" className="mt-1 break-words text-lg font-bold leading-snug sm:text-xl">{activeMuseumItem.title}</h2><p className="mt-1 break-words text-sm leading-6 text-black/60">{activeMuseumItem.description}</p></div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end"><a href={activeMuseumItem.href} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center justify-center rounded-full border border-black/15 bg-white px-4 py-2.5 text-xs font-bold leading-5 hover:border-black/30">Open original ↗</a><button ref={closeButtonRef} type="button" onClick={() => setMuseumOpen(null)} className="inline-flex items-center justify-center rounded-full bg-[#111318] px-4 py-2.5 text-xs font-bold leading-5 text-white hover:bg-black">Close</button></div>
              </header>
              <div className="min-h-[35vh] w-full flex-1 overflow-auto overscroll-contain bg-white"><iframe title={activeMuseumItem.title} src={activeMuseumItem.href.replace("/view", "/preview")} className="block h-[min(68dvh,760px)] min-h-[35vh] w-full border-0 sm:h-[min(72dvh,820px)]" allow="autoplay"/></div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
