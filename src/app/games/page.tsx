import Link from "next/link";
import { ArrowRight, Gamepad2 } from "lucide-react";

export const metadata = {
  title: "Games",
  description: "AdminHub Games — the public home for games built on the platform.",
};

export default function GamesPage() {
  return (
    <main id="main">
      <section className="section-shell">
        <div className="container">
          <div className="max-w-4xl space-y-5">
            <div className="eyebrow">AdminHub / Games</div>
            <h1 className="section-title text-4xl md:text-5xl">
              AdminHub Games
            </h1>
            <p className="section-copy">
              A shared games catalogue and launcher for the games built under
              the AdminHub umbrella.
            </p>
          </div>

          <div className="mt-10 card max-w-3xl">
            <div className="card-inner">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-tint)] text-[var(--brand-primary)]">
                <Gamepad2 size={22} />
              </span>
              <h2 className="mt-6 text-2xl">Enter AdminHub Games</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                Open the live games catalogue and launcher.
              </p>
              <a
                href="https://admin-hub-games.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary mt-6"
              >
                Open Games
                <ArrowRight size={18} />
              </a>
            </div>
          </div>

          <div className="mt-8">
            <Link href="/" prefetch={false} className="btn btn-ghost">
              Back to AdminHub
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
