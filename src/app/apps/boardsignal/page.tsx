import Link from "next/link";
import { ArrowRight, BarChart3, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "BoardSignal",
  description: "BoardSignal, an AdminHub chess performance product.",
};

export default function BoardSignalPage() {
  return (
    <main id="main">
      <section className="section-shell">
        <div className="container">
          <div className="max-w-4xl space-y-5">
            <div className="eyebrow">AdminHub / Apps / BoardSignal</div>
            <h1 className="section-title text-4xl md:text-5xl">BoardSignal</h1>
            <p className="section-copy">
              A chess performance product built around player review, practical
              feedback, progress, and a clearer picture of how a player is
              actually performing.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="card">
              <div className="card-inner">
                <BarChart3 size={22} className="text-[var(--brand-primary)]" />
                <h2 className="mt-4 text-xl">Performance workspace</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  BoardSignal turns chess games into structured reviews and
                  player-facing feedback.
                </p>
              </div>
            </div>
            <div className="card">
              <div className="card-inner">
                <ShieldCheck size={22} className="text-[var(--brand-primary)]" />
                <h2 className="mt-4 text-xl">AdminHub product</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  BoardSignal remains an AdminHub product and can be reached
                  through this public app catalogue.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Link href="/apps" prefetch={false} className="btn btn-outline">
              Back to Apps
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
