import Link from "next/link";
import { ArrowRight, Bot, Gamepad2, Grid2X2, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Apps",
  description: "Public applications built and operated through AdminHub.",
};

const apps = [
  {
    href: "/apps/learn-forex",
    title: "Learn Forex Trading Botswana Academy",
    label: "Academy",
    icon: <Bot size={22} />,
    description:
      "The Academy's public digital home for programme information, enrolment guidance, training support, and its WhatsApp-assisted customer journey.",
  },
  {
    href: "/apps/boardsignal",
    title: "BoardSignal",
    label: "Chess performance",
    icon: <Grid2X2 size={22} />,
    description:
      "An AdminHub product focused on chess performance, review, player progress, and practical feedback.",
  },
];

export default function AppsPage() {
  return (
    <main id="main">
      <section className="section-shell">
        <div className="container">
          <div className="max-w-3xl space-y-5">
            <div className="eyebrow">AdminHub / Apps</div>
            <h1 className="section-title text-4xl md:text-5xl">
              Public apps, gathered in one place.
            </h1>
            <p className="section-copy">
              AdminHub is the home for the applications we build, operate, and
              evolve. Each app can have its own public experience without
              needing a separate top-level site.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {apps.map((app) => (
              <Link
                key={app.href}
                href={app.href}
                prefetch={false}
                className="card group block"
              >
                <div className="card-inner flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-tint)] text-[var(--brand-primary)]">
                      {app.icon}
                    </span>
                    <span className="badge">{app.label}</span>
                  </div>
                  <h2 className="mt-6 text-2xl">{app.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {app.description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--brand-primary)]">
                    Open app
                    <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 frame-gold p-5 md:p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-[var(--brand-primary)]" size={20} />
              <div>
                <h2 className="text-lg">One AdminHub, separate products.</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  The public catalogue is intentionally simple: discover an
                  app here, then enter that app's own experience.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <Link href="/games" prefetch={false} className="btn btn-outline">
              <Gamepad2 size={18} />
              Browse AdminHub Games
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
