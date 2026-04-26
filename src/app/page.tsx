"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Car,
  CheckCircle2,
  Clock3,
  FileText,
  HeartPulse,
  Landmark,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";

import { firestore } from "@/utils/firebaseConfig";

type Highlight = {
  id: string;
  imageUrl?: string;
  title?: string;
  desc?: string;
  showOnHome?: boolean;
  order?: number;
  isHero?: boolean;
};

type HomeCachePayload = {
  savedAt: string;
  hero: Highlight | null;
  gallery: Highlight[];
};

const WHATSAPP_NUMBER = "+26772971852";
const HOME_CACHE_KEY = "sparkle_legacy_home_highlights_v1";

function waLink(message: string) {
  const digits = WHATSAPP_NUMBER.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function readHomeCache(): HomeCachePayload | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as HomeCachePayload;

    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.gallery)) return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveHomeCache(hero: Highlight | null, gallery: Highlight[]) {
  if (typeof window === "undefined") return;

  try {
    const payload: HomeCachePayload = {
      savedAt: new Date().toISOString(),
      hero,
      gallery,
    };

    localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Could not save homepage highlights for offline use:", error);
  }
}

function formatCacheTime(value?: string) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("en-BW", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function HomePage() {
  const [hero, setHero] = useState<Highlight | null>(null);
  const [gallery, setGallery] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [cacheSavedAt, setCacheSavedAt] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadHighlights() {
      const cached = readHomeCache();

      if (cached) {
        setHero(cached.hero || null);
        setGallery(cached.gallery || []);
        setUsingCachedData(true);
        setCacheSavedAt(cached.savedAt);
        setLoading(false);
      }

      try {
        const snap = await getDocs(collection(firestore, "highlights"));

        const data = snap.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Highlight, "id">),
          }))
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

        const heroPick = data.find((item) => !!item.isHero) || data[0] || null;

        const homeCards = data
          .filter((item) => item.showOnHome && !item.isHero)
          .slice(0, 4);

        if (!alive) return;

        setHero(heroPick);
        setGallery(homeCards);
        setUsingCachedData(false);
        setCacheSavedAt(new Date().toISOString());

        saveHomeCache(heroPick, homeCards);
      } catch (error) {
        console.error("Home highlights load failed:", error);

        if (!alive) return;

        const fallback = readHomeCache();

        if (fallback) {
          setHero(fallback.hero || null);
          setGallery(fallback.gallery || []);
          setUsingCachedData(true);
          setCacheSavedAt(fallback.savedAt);
        } else {
          setHero(null);
          setGallery([]);
          setUsingCachedData(false);
          setCacheSavedAt("");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadHighlights();

    return () => {
      alive = false;
    };
  }, []);

  const quickCards = useMemo(
    () => [
      {
        icon: <Car size={18} />,
        title: "Short-Term Insurance",
        desc: "Motor, home, household contents, travel, personal accident, and more.",
        href: "/c/short-term",
      },
      {
        icon: <HeartPulse size={18} />,
        title: "Long-Term Insurance",
        desc: "Life, funeral, disability, credit life, and protection for what matters most.",
        href: "/c/long-term",
      },
      {
        icon: <Briefcase size={18} />,
        title: "Business & SME Cover",
        desc: "Business assets, liability, interruption cover, fleet, and broader commercial protection.",
        href: "/c/business",
      },
      {
        icon: <Landmark size={18} />,
        title: "Retirement & Planning",
        desc: "Long-term planning support to help secure future goals with clarity and confidence.",
        href: "/c/retirement",
      },
    ],
    []
  );

  const supportSteps = useMemo(
    () => [
      {
        title: "Tell us what you need",
        desc: "Share your cover type, product, and a few details through WhatsApp or the chat assistant.",
      },
      {
        title: "Get guided support",
        desc: "We help you understand options clearly, with less jargon and more practical direction.",
      },
      {
        title: "Move faster with confidence",
        desc: "From quote requests to claim support, the process is structured to save time and reduce confusion.",
      },
    ],
    []
  );

  const valueCards = useMemo(
    () => [
      {
        icon: <ShieldCheck size={18} />,
        title: "Clear guidance",
        desc: "We focus on clarity first so clients can understand cover before making decisions.",
      },
      {
        icon: <FileText size={18} />,
        title: "Practical process",
        desc: "Quotes and claims support should feel structured, not confusing or buried in jargon.",
      },
      {
        icon: <MessageCircle size={18} />,
        title: "Accessible support",
        desc: "WhatsApp remains central because it reduces friction and meets clients where they already are.",
      },
    ],
    []
  );

  return (
    <main
      id="main"
      className="overflow-hidden bg-[var(--background)] text-[var(--foreground)]"
    >
      {/* HERO */}
      <section className="page-shell relative">
        <div className="container">
          <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
            <div className="space-y-6">
              <div className="eyebrow">
                <ShieldCheck size={15} />
                Botswana • Quotes • Claims • Policy Support
              </div>

              {usingCachedData ? (
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-white/80 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <WifiOff
                    size={14}
                    className="shrink-0 text-[var(--brand-primary-strong)]"
                  />
                  <span>
                    Showing saved offline homepage content
                    {cacheSavedAt
                      ? ` • Updated ${formatCacheTime(cacheSavedAt)}`
                      : ""}
                  </span>
                </div>
              ) : null}

              <div className="space-y-4">
                <h1 className="max-w-[12ch]">
                  Trusted insurance guidance with a cleaner digital experience.
                </h1>

                <p className="lead max-w-[60ch]">
                  Sparkle Legacy Insurance Brokers helps individuals, families,
                  and businesses understand cover clearly, request quotes faster,
                  and get practical support when it matters most.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href={waLink(
                    "Hi Sparkle Legacy 👋 I’d like a quote.\n\nCover type:\nProduct:\nCity/Town:\nName:"
                  )}
                  className="btn btn-primary"
                >
                  <MessageCircle size={18} />
                  Get a Quote on WhatsApp
                </a>

                <Link
                  href="/c/short-term"
                  prefetch={false}
                  className="btn btn-outline"
                >
                  Browse Cover Types
                  <ArrowRight size={18} />
                </Link>

                <Link href="/claims" prefetch={false} className="btn btn-ghost">
                  <FileText size={18} />
                  Claims Help
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="badge">
                  <Sparkles size={14} />
                  Short-Term
                </span>
                <span className="badge">
                  <Sparkles size={14} />
                  Long-Term
                </span>
                <span className="badge badge-neutral">
                  <Clock3 size={14} />
                  Fast response
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "Clear cover explanations",
                  "WhatsApp-first convenience",
                  "Professional claims support",
                ].map((item) => (
                  <div key={item} className="card-outline-gold">
                    <div className="card-inner flex items-start gap-3">
                      <span className="mt-0.5 text-[var(--brand-primary)]">
                        <CheckCircle2 size={18} />
                      </span>
                      <p className="text-sm font-semibold text-[var(--text-secondary)]">
                        {item}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="card-elevated overflow-hidden">
                <div className="relative min-h-[420px] bg-[linear-gradient(180deg,#fffefb_0%,#f7f1e4_100%)]">
                  {hero?.imageUrl ? (
                    <>
                      <div className="absolute inset-0">
                        <img
                          src={hero.imageUrl}
                          alt={hero.title || "Sparkle Legacy highlight"}
                          className="h-full w-full object-cover opacity-[0.18]"
                        />
                      </div>
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,253,249,0.84)_0%,rgba(252,251,247,0.96)_72%,rgba(252,251,247,1)_100%)]" />
                    </>
                  ) : null}

                  <div className="relative z-10 flex min-h-[420px] flex-col justify-between p-6 md:p-8">
                    <div className="space-y-4">
                      <div className="inline-flex w-fit items-center rounded-full border border-[var(--border-strong)] bg-white/90 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand-primary-strong)]">
                        Sparkle Legacy Insurance Brokers
                      </div>

                      <div className="frame-gold p-5">
                        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary-strong)]">
                          Welcome
                        </p>
                        <h2 className="mt-2 text-2xl">
                          {hero?.title ||
                            "Practical support for personal and business cover."}
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                          {hero?.desc ||
                            "Request quotes, understand your options more clearly, and get help with claim-related questions through a cleaner, more professional digital experience."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="card-outline-gold">
                        <div className="card-inner">
                          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand-primary-strong)]">
                            Personal
                          </p>
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            Motor, home, travel, accident, life, funeral, and
                            more.
                          </p>
                        </div>
                      </div>

                      <div className="card-outline-gold">
                        <div className="card-inner">
                          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand-primary-strong)]">
                            Business
                          </p>
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            Commercial insurance, liability, interruption cover,
                            fleet, and broader protection.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <a
                        href={waLink(
                          "Hi Sparkle Legacy 👋 I need guidance on choosing the right cover.\n\nName:\nCity/Town:\nWhat do you need insured?"
                        )}
                        className="btn btn-outline w-full justify-center"
                      >
                        <MessageCircle size={18} />
                        Ask for Guidance
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {loading ? (
                <p className="mt-3 text-xs font-semibold text-[var(--text-muted)]">
                  Checking latest homepage highlights…
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* INSURANCE CATEGORIES */}
      <section className="section-shell">
        <div className="container">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="eyebrow">Insurance categories</div>
              <h2 className="section-title">
                Start with the type of cover you need.
              </h2>
              <p className="section-copy">
                The site is structured so visitors can move from broad cover
                types into more specific products without getting lost.
              </p>
            </div>

            <Link href="/contact" prefetch={false} className="btn btn-outline">
              Contact Us
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickCards.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                prefetch={false}
                className="card group block overflow-hidden"
              >
                <div className="card-inner flex h-full flex-col">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-tint)] text-[var(--brand-primary-strong)]">
                    {item.icon}
                  </div>

                  <h3 className="text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    {item.desc}
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--brand-primary-strong)]">
                    Explore
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* VALUE CARDS */}
      <section className="section-shell border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="container">
          <div className="grid gap-4 md:grid-cols-3">
            {valueCards.map((item) => (
              <div key={item.title} className="card-outline-gold">
                <div className="card-inner">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-tint)] text-[var(--brand-primary-strong)]">
                      {item.icon}
                    </span>
                    <h3 className="text-base">{item.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section-shell">
        <div className="container">
          <div className="mb-6 space-y-2">
            <div className="eyebrow">How it works</div>
            <h2 className="section-title">
              A simpler path from question to action.
            </h2>
            <p className="section-copy">
              The experience should help visitors move from uncertainty to the
              right next step with less delay and better guidance.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {supportSteps.map((step, index) => (
              <div key={step.title} className="frame-gold p-5 md:p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[var(--text-on-brand)]">
                  <span className="text-sm font-extrabold">{index + 1}</span>
                </div>
                <h3>{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ADMIN-MANAGED HIGHLIGHTS */}
      <section className="section-shell border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="container">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="eyebrow">Managed from admin</div>
              <h2 className="section-title">Updates and highlights</h2>
              <p className="section-copy">
                This section stays connected to admin-managed highlights so the
                homepage can stay fresh without changing code each time.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="card overflow-hidden">
                  <div className="h-40 animate-pulse bg-[var(--surface-2)]" />
                  <div className="card-inner">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-[var(--surface-2)]" />
                    <div className="mt-3 h-4 w-full animate-pulse rounded bg-[var(--surface-2)]" />
                    <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-[var(--surface-2)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : gallery.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {gallery.map((item) => (
                <article key={item.id} className="card overflow-hidden">
                  <div className="relative h-48 bg-[var(--surface-2)]">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title || "Sparkle Legacy highlight"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f8f3e8_0%,#efe7d4_100%)]" />
                    )}

                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(23,20,17,0.16)_100%)]" />
                  </div>

                  <div className="card-inner">
                    <h3 className="text-lg">{item.title || "Highlight"}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">
                      {item.desc || "New update available."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="frame-gold p-5">
              <h3 className="text-lg">No highlights yet</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Add entries in the <b>highlights</b> collection with{" "}
                <b>showOnHome</b> enabled to populate this section.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}