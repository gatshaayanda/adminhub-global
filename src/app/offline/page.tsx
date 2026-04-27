import Link from "next/link";
import {
  FileText,
  Home,
  LayoutDashboard,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="section-shell relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[rgba(77,163,255,0.12)] blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-[rgba(24,199,184,0.1)] blur-3xl" />

        <div className="container relative">
          <div className="mx-auto max-w-3xl">
            <div className="card-elevated overflow-hidden">
              <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.96)_48%,rgba(24,199,184,0.12)_100%)] p-6 text-center md:p-10">
                <div className="pointer-events-none absolute inset-0 panel-grid opacity-40" />

                <div className="relative">
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(77,163,255,0.12)] text-[var(--brand-primary)] shadow-[var(--shadow-sm)]">
                    <WifiOff size={24} />
                  </div>

                  <div className="eyebrow justify-center">
                    AdminHub Global • Offline-Aware PWA
                  </div>

                  <h1 className="mx-auto max-w-[14ch]">
                    You are offline, but the app shell is still available.
                  </h1>

                  <p className="mx-auto mt-4 max-w-[60ch] text-sm leading-7 text-[var(--text-secondary)]">
                    Saved pages may still open from your device. Fresh Firebase
                    data, new messages, uploads, inquiry submissions, dashboard
                    updates, and latest insights will refresh once your
                    connection comes back.
                  </p>

                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                    <Link href="/" prefetch={false} className="btn btn-primary">
                      <Home size={18} />
                      Go Home
                    </Link>

                    <Link
                      href="/solutions"
                      prefetch={false}
                      className="btn btn-outline"
                    >
                      <LayoutDashboard size={18} />
                      Saved Solutions
                    </Link>

                    <Link
                      href="/blog"
                      prefetch={false}
                      className="btn btn-outline"
                    >
                      <FileText size={18} />
                      Saved Insights
                    </Link>

                    <Link
                      href="/client/dashboard"
                      prefetch={false}
                      className="btn btn-ghost"
                    >
                      <ShieldCheck size={18} />
                      Client Hub
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
                <p className="inline-flex items-center gap-2 font-extrabold text-[var(--text-primary)]">
                  <RefreshCw size={16} className="text-[var(--brand-primary)]" />
                  What still works
                </p>

                <p className="mt-2">
                  Previously opened pages, cached static assets, saved app shell
                  screens, and some offline helper content may still be
                  available depending on what your browser has stored.
                </p>
              </div>

              <div className="frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
                <p className="inline-flex items-center gap-2 font-extrabold text-[var(--text-primary)]">
                  <LockKeyhole
                    size={16}
                    className="text-[var(--brand-primary)]"
                  />
                  What needs internet
                </p>

                <p className="mt-2">
                  New inquiries, private follow-up, Firebase updates, uploads,
                  messages, admin actions, and fresh dashboard data need an
                  active connection.
                </p>
              </div>
            </div>

            <div className="mt-6 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Note:</b> Offline-aware
              mode works best after you have opened the page at least once while
              connected to the internet. AdminHub Global does not claim every
              cloud feature works offline; it simply handles disconnection more
              gracefully.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}