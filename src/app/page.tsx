import Link from "next/link";
import { ArrowDown, ArrowUpRight, Boxes, FlaskConical, Gamepad2, Network } from "lucide-react";

const destinations = [
  { label: "Apps", href: "/apps", icon: Boxes },
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Products", href: "/boardsignal", icon: Network },
  { label: "Experiments", href: "/about", icon: FlaskConical },
];

export default function HomePage() {
  return (
    <main id="main" className="min-h-[calc(100vh-160px)] overflow-hidden">
      <section className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center px-5 py-20 sm:px-8 lg:px-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 top-12 h-80 w-80 rounded-full bg-blue-500/10 blur-[110px]" />
          <div className="absolute -right-24 bottom-8 h-80 w-80 rounded-full bg-cyan-400/10 blur-[110px]" />
          <div className="panel-grid absolute inset-0 opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
        </div>

        <div className="max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">
            ADMIN HUB
          </p>

          <nav aria-label="Admin Hub divisions" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-base font-bold text-slate-300">
            {destinations.map(({ label, href }) => (
              <Link key={label} href={href} className="transition hover:text-white">
                {label}
              </Link>
            ))}
          </nav>

          <div className="my-12 flex justify-center sm:justify-start" aria-hidden="true">
            <ArrowDown className="text-slate-500" size={28} strokeWidth={1.5} />
          </div>

          <Link
            href="/boardsignal"
            className="group block max-w-3xl rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/70 p-7 shadow-2xl shadow-blue-950/30 transition hover:border-cyan-300/50 sm:p-10"
          >
            <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
                  PRODUCT
                </p>
                <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] text-white sm:text-7xl">
                  BOARD<span className="text-cyan-300">SIGNAL</span>
                </h1>
                <p className="mt-4 text-xl font-semibold text-slate-300">
                  Chess performance system
                </p>
                <p className="mt-2 max-w-xl text-sm leading-7 text-slate-400">
                  A personal chess performance desk that turns your games into structured Reviews,
                  recurring signals, and practical guidance.
                </p>
              </div>

              <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-extrabold text-slate-950 transition group-hover:bg-white">
                Enter <ArrowUpRight size={17} />
              </span>
            </div>
          </Link>
        </div>
      </section>

      <section className="border-t border-white/10 bg-slate-950/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-12">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">BUILD WITH ADMIN HUB</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-6xl">
              25GB EACH
            </h2>
            <p className="mt-3 text-xl font-bold text-slate-200">APPS + GAMES</p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-400">
              Custom business applications, browser games and branded interactive experiences built from the same reusable delivery discipline.
            </p>
            <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-slate-300">
              {["Business Apps","Ordering","Booking","Dashboards","Browser Games","Mobile Games","Branded Experiences"].map(item => (
                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-2">{item}</span>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-cyan-300/15 bg-white/[0.04] p-7 sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">CLIENT CAPACITY MODEL</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <strong className="block text-3xl font-black text-white">500</strong>
                <span className="mt-1 block text-sm text-slate-400">regular users</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <strong className="block text-3xl font-black text-white">25GB</strong>
                <span className="mt-1 block text-sm text-slate-400">per month model</span>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-slate-400">
              A simple client-facing planning model for efficient, low-read/low-write applications. Actual capacity depends on the product, workload and backend configuration.
            </p>
            <Link href="/contact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-extrabold text-slate-950">
              Have an idea? Let&apos;s build it <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
