import Link from "next/link";
import { WifiOff, Home, FileText, MessageCircle } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="section-shell">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <div className="card-elevated overflow-hidden">
              <div className="bg-[linear-gradient(180deg,#fffefb_0%,#f7f1e4_100%)] p-6 text-center md:p-10">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-white text-[var(--brand-primary-strong)] shadow-[var(--shadow-sm)]">
                  <WifiOff size={24} />
                </div>

                <div className="eyebrow justify-center">
                  Sparkle Legacy • Offline Mode
                </div>

                <h1 className="mx-auto max-w-[14ch]">
                  You are offline, but the app is still available.
                </h1>

                <p className="mx-auto mt-4 max-w-[58ch] text-sm leading-7 text-[var(--text-secondary)]">
                  Some saved pages may still open from your device. New articles,
                  case updates, messages, images, and Firebase content will refresh
                  when your connection comes back.
                </p>

                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                  <Link href="/" prefetch={false} className="btn btn-primary">
                    <Home size={18} />
                    Go Home
                  </Link>

                  <Link href="/blog" prefetch={false} className="btn btn-outline">
                    <FileText size={18} />
                    Saved Insights
                  </Link>

                  <Link href="/claims" prefetch={false} className="btn btn-ghost">
                    <MessageCircle size={18} />
                    Claims Help
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Note:</b> Offline mode
              works best after you have opened the page at least once while
              connected to the internet.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}