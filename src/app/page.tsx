"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  Globe2,
  LayoutDashboard,
  MessageCircle,
  Network,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  WifiOff,
  Workflow,
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

const HOME_CACHE_KEY = "adminhub_global_home_highlights_v1";
const FALLBACK_IMAGE = "/placeholder.png";

function safeImageSrc(src?: string) {
  const clean = src?.trim();

  if (!clean) return FALLBACK_IMAGE;

  if (
    clean.startsWith("/") ||
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("data:")
  ) {
    return clean;
  }

  return FALLBACK_IMAGE;
}

function hasUsableImage(src?: string) {
  const clean = src?.trim();
  if (!clean) return false;

  return (
    clean.startsWith("/") ||
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("data:")
  );
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

        const heroPick =
          data.find((item) => item.isHero && hasUsableImage(item.imageUrl)) ||
          data.find((item) => item.isHero) ||
          data.find((item) => hasUsableImage(item.imageUrl)) ||
          data[0] ||
          null;

        const homeCards = data
          .filter((item) => item.showOnHome && item.id !== heroPick?.id)
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
        icon: <Clock3 size={18} />,
        title: "48-Hour Live Proof",
        desc: "Move a prospect from intake or company profile to a live .vercel preview and early backend direction.",
        href: "/c/rapid-proof",
      },
      {
        icon: <LayoutDashboard size={18} />,
        title: "Business PWA Systems",
        desc: "Public site, admin dashboard, client portal, messaging, uploads, and project workflow infrastructure.",
        href: "/c/business-pwa",
      },
      {
        icon: <Workflow size={18} />,
        title: "Operations PWA Builds",
        desc: "Custom workflow-heavy systems for onboarding, cases, requests, documents, client service, and support.",
        href: "/c/operations-pwa",
      },
      {
        icon: <Users size={18} />,
        title: "Partner-Led Sales",
        desc: "A clearer agent sales process built around visible proof, structured implementation, and recurring support.",
        href: "/partners",
      },
    ],
    []
  );

  const supportSteps = useMemo(
    () => [
      {
        title: "Lead enters the system",
        desc: "An agent, referral, or direct prospect submits basic details, a short intake, or a company profile PDF.",
      },
      {
        title: "Rapid proof creates belief",
        desc: "A live preliminary version is produced quickly so the client can see direction instead of imagining it.",
      },
      {
        title: "Build becomes managed support",
        desc: "Approved projects move into implementation, launch, client portal support, and recurring monthly management.",
      },
    ],
    []
  );

  const valueCards = useMemo(
    () => [
      {
        icon: <Network size={18} />,
        title: "Custom framework",
        desc: "Built on a reusable Next.js, Tailwind, Firebase, UploadThing, and PWA architecture — not boxed into a DIY builder.",
      },
      {
        icon: <ShieldCheck size={18} />,
        title: "9th-iteration process",
        desc: "The delivery workflow has been refined across repeated builds, portals, dashboards, messaging, uploads, and PDF tools.",
      },
      {
        icon: <BadgeDollarSign size={18} />,
        title: "Agent-ready offer",
        desc: "The commercial model gives sales partners a stronger B2B offer with proof, implementation, and recurring support potential.",
      },
    ],
    []
  );

  return (
    <main
      id="main"
      className="overflow-hidden bg-[var(--background)] text-[var(--foreground)]"
    >
      <section className="page-shell relative">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-70" />

        <div className="container relative">
          <div className="grid items-center gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-12">
            <div className="space-y-6">
              <div className="eyebrow">
                <Globe2 size={15} />
                AdminHub Global • Custom PWA Framework • Agent-Ready Delivery
              </div>

              {usingCachedData ? (
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.78)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] shadow-[var(--shadow-sm)] backdrop-blur-md">
                  <WifiOff
                    size={14}
                    className="shrink-0 text-[var(--brand-primary)]"
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
                <h1 className="max-w-[13ch]">
                  The custom PWA operating system behind AdminHub.
                </h1>

                <p className="lead max-w-[63ch]">
                  AdminHub Global helps manage agents, leads, client onboarding,
                  project delivery, proposals, messaging, uploads, and recurring
                  support — powered by the 9th iteration of a custom reusable PWA
                  framework.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/contact" prefetch={false} className="btn btn-primary">
                  <FileText size={18} />
                  Submit Project Inquiry
                </Link>

                <Link
                  href="/partners"
                  prefetch={false}
                  className="btn btn-outline"
                >
                  Partner Portal
                  <ArrowRight size={18} />
                </Link>

                <Link
                  href="/client/dashboard"
                  prefetch={false}
                  className="btn btn-ghost"
                >
                  <BriefcaseBusiness size={18} />
                  Client Hub
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="badge">
                  <Sparkles size={14} />
                  48-hour live proof
                </span>
                <span className="badge">
                  <Sparkles size={14} />
                  9th-iteration framework
                </span>
                <span className="badge badge-neutral">
                  <ShieldCheck size={14} />
                  Custom, not boxed-in
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "Lead → qualify → convert",
                  "Onboard → build → launch",
                  "Support → retain → grow",
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
                <div className="relative bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(6,10,18,0.98)_100%)]">
                  <div className="relative h-[260px] w-full overflow-hidden bg-[var(--surface-2)] md:h-[320px]">
                    <img
                      src={safeImageSrc(hero?.imageUrl)}
                      alt={hero?.title || "AdminHub Global highlight"}
                      className="h-full w-full object-cover opacity-95"
                      onError={(event) => {
                        event.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />

                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,18,0.02)_0%,rgba(6,10,18,0.34)_100%)]" />

                    <div className="absolute left-5 top-5 inline-flex w-fit items-center rounded-full border border-[var(--border-strong)] bg-[rgba(6,10,18,0.74)] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand-primary)] backdrop-blur-md">
                      AdminHub Global Control
                    </div>
                  </div>

                  <div className="relative p-6 md:p-8">
                    <div className="absolute inset-0 panel-grid opacity-35" />
                    <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-[rgba(77,163,255,0.13)] blur-3xl" />
                    <div className="absolute bottom-[-90px] left-[-90px] h-72 w-72 rounded-full bg-[rgba(24,199,184,0.1)] blur-3xl" />

                    <div className="relative z-10 space-y-5">
                      <div className="frame-gold p-5">
                        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary)]">
                          Operating model
                        </p>

                        <h2 className="mt-2 text-2xl">
                          {hero?.title ||
                            "From 48-hour proof to managed implementation."}
                        </h2>

                        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                          {hero?.desc ||
                            "Prospects do not need to imagine the solution. AdminHub can move from intake or company profile to a live working direction, then into implementation, client onboarding, launch, and ongoing support."}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="card-outline-gold">
                          <div className="card-inner">
                            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                              Sales engine
                            </p>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              Agents submit leads, track opportunities, and sell
                              a proof-backed process.
                            </p>
                          </div>
                        </div>

                        <div className="card-outline-gold">
                          <div className="card-inner">
                            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                              Delivery system
                            </p>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              AdminHub manages onboarding, messaging, files,
                              proposals, projects, and support.
                            </p>
                          </div>
                        </div>
                      </div>

                      <Link
                        href="/contact"
                        prefetch={false}
                        className="btn btn-outline w-full justify-center"
                      >
                        <Clock3 size={18} />
                        Request a Proof Sprint Review
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {loading ? (
                <p className="mt-3 text-xs font-semibold text-[var(--text-muted)]">
                  Checking latest AdminHub Global highlights…
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="container">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="eyebrow">What the platform manages</div>
              <h2 className="section-title">
                One system for proof, build, launch, and support.
              </h2>
              <p className="section-copy">
                AdminHub Global is shaped around the real business workflow:
                lead capture, qualification, live proof, client onboarding,
                project delivery, and managed monthly support.
              </p>
            </div>

            <Link href="/contact" prefetch={false} className="btn btn-outline">
              Send Project Details
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
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-tint)] text-[var(--brand-primary)]">
                    {item.icon}
                  </div>

                  <h3 className="text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    {item.desc}
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--brand-primary)]">
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

      <section className="section-shell border-y border-[var(--border)] bg-[rgba(11,18,32,0.58)]">
        <div className="container">
          <div className="grid gap-4 md:grid-cols-3">
            {valueCards.map((item) => (
              <div key={item.title} className="card-outline-gold">
                <div className="card-inner">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-tint)] text-[var(--brand-primary)]">
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

      <section className="section-shell">
        <div className="container">
          <div className="mb-6 space-y-2">
            <div className="eyebrow">Phase 1 workflow</div>
            <h2 className="section-title">
              Lead to monthly support, inside one PWA.
            </h2>
            <p className="section-copy">
              The first milestone is simple: an agent brings a lead, AdminHub
              qualifies it, converts it, onboards the client, runs the build, and
              keeps the client on managed support.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {supportSteps.map((step, index) => (
              <div key={step.title} className="frame-gold p-5 md:p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[var(--text-on-brand)] shadow-[var(--shadow-blue)]">
                  <span className="text-sm font-extrabold">{index + 1}</span>
                </div>

                <h3>{step.title}</h3>

                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            {[
              {
                icon: <UploadCloud size={17} />,
                title: "Onboarding",
                desc: "Collect intake details, assets, files, and project requirements.",
              },
              {
                icon: <FileText size={17} />,
                title: "Proposals & PDFs",
                desc: "Support package summaries, scopes, and proposal-ready outputs.",
              },
              {
                icon: <MessageCircle size={17} />,
                title: "Messaging",
                desc: "Keep admin, clients, and support communication structured.",
              },
              {
                icon: <Bot size={17} />,
                title: "AI assistant",
                desc: "Guide users through platform features, onboarding, and support.",
              },
            ].map((item) => (
              <div key={item.title} className="card">
                <div className="card-inner">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-tint)] text-[var(--brand-primary)]">
                    {item.icon}
                  </span>

                  <h3 className="text-base">{item.title}</h3>

                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell border-y border-[var(--border)] bg-[rgba(11,18,32,0.58)]">
        <div className="container">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="eyebrow">Managed from AdminHub Control</div>
              <h2 className="section-title">Updates and platform highlights</h2>
              <p className="section-copy">
                This section remains connected to the existing admin-managed
                highlights collection, so the homepage can stay fresh without
                changing code each time.
              </p>
            </div>

            <Link
              href="/admin/dashboard"
              prefetch={false}
              className="btn btn-outline"
            >
              AdminHub Global Control
              <ArrowRight size={18} />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="card overflow-hidden">
                  <div className="h-40 loading-shimmer" />
                  <div className="card-inner">
                    <div className="h-5 w-3/4 rounded loading-shimmer" />
                    <div className="mt-3 h-4 w-full rounded loading-shimmer" />
                    <div className="mt-2 h-4 w-5/6 rounded loading-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : gallery.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {gallery.map((item) => (
                <article key={item.id} className="card overflow-hidden">
                  <div className="relative h-48 bg-[var(--surface-2)]">
                    <img
                      src={safeImageSrc(item.imageUrl)}
                      alt={item.title || "AdminHub Global highlight"}
                      className="h-full w-full object-cover opacity-95"
                      onError={(event) => {
                        event.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />

                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,18,0.04)_0%,rgba(6,10,18,0.38)_100%)]" />
                  </div>

                  <div className="card-inner">
                    <h3 className="text-lg">
                      {item.title || "Platform update"}
                    </h3>

                    <p className="mt-2 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">
                      {item.desc || "New AdminHub Global update available."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="frame-gold p-5">
              <h3 className="text-lg">No platform highlights yet</h3>

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