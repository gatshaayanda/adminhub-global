"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  ArrowRight,
  BadgeDollarSign,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  Network,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  WifiOff,
  Workflow,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";

interface Blog {
  id: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  created_at?: { seconds: number; nanoseconds: number };
  createdAt?: { seconds: number; nanoseconds: number };
}

type BlogCachePayload = {
  posts: Blog[];
  savedAt: string;
};

const BLOG_CACHE_KEY = "adminhub_global_blog_posts_v1";

async function shareArticle({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  const text = "This AdminHub Global insight may be useful:";
  const message = [text, "", title, "", url].join("\n");

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return;
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(message);
    window.alert("Insight link copied.");
  } catch {
    window.alert("Sharing is not available right now. Please copy the page link.");
  }
}

function readBlogCache(): BlogCachePayload | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(BLOG_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as BlogCachePayload;
    if (!Array.isArray(parsed.posts)) return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveBlogCache(posts: Blog[]) {
  if (typeof window === "undefined") return;

  try {
    const payload: BlogCachePayload = {
      posts,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(BLOG_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Could not save AdminHub Global insights for offline use:", error);
  }
}

function getPostSeconds(post: Blog) {
  return post.created_at?.seconds || post.createdAt?.seconds || 0;
}

function formatDate(post?: Blog) {
  const seconds = post ? getPostSeconds(post) : 0;

  if (!seconds) return "Recently published";

  return new Date(seconds * 1000).toLocaleDateString("en-BW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

function getExcerpt(body?: string, max = 150) {
  const text = (body || "").replace(/\s+/g, " ").trim();

  if (!text) {
    return "AdminHub Global insight on custom PWA delivery, agent-led sales, client portals, project workflows, and managed support.";
  }

  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function getPostUrl(origin: string, postId: string) {
  return origin ? `${origin}/blog/${postId}` : `/blog/${postId}`;
}

function safeImageSrc(src?: string) {
  const clean = src?.trim();

  if (!clean) return "/placeholder.png";

  if (
    clean.startsWith("/") ||
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.startsWith("data:")
  ) {
    return clean;
  }

  return "/placeholder.png";
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [cacheSavedAt, setCacheSavedAt] = useState("");
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  async function loadPosts() {
    setLoadError("");

    const cached = readBlogCache();

    if (cached?.posts?.length) {
      setPosts(cached.posts);
      setUsingCachedData(true);
      setCacheSavedAt(cached.savedAt || "");
      setLoading(false);
    }

    try {
      const snap = await getDocs(collection(firestore, "blogs"));

      const freshPosts = snap.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Blog, "id">),
        }))
        .filter((post) => post.title || post.body)
        .sort((a, b) => getPostSeconds(b) - getPostSeconds(a));

      setPosts(freshPosts);
      setUsingCachedData(false);
      setCacheSavedAt(new Date().toISOString());
      saveBlogCache(freshPosts);
    } catch (error) {
      console.error("Failed to load AdminHub Global insights:", error);

      const fallback = readBlogCache();

      if (fallback?.posts?.length) {
        setPosts(fallback.posts);
        setUsingCachedData(true);
        setCacheSavedAt(fallback.savedAt || "");
      } else {
        setPosts([]);
        setLoadError(
          "Insights could not be loaded right now. Check your connection and try again."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  const featuredPosts = useMemo(() => posts.slice(0, 3), [posts]);
  const remainingPosts = useMemo(() => posts.slice(3), [posts]);

  const refreshPosts = async () => {
    setRefreshing(true);
    await loadPosts();
  };

  return (
    <main id="main" className="bg-[var(--background)] text-[var(--foreground)]">
      <section className="section-shell relative">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />

        <div className="container relative">
          {usingCachedData ? (
            <div className="mb-5 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.78)] px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <WifiOff
                    size={17}
                    className="mt-1 shrink-0 text-[var(--brand-primary)]"
                  />
                  <p>
                    Showing saved offline insights
                    {cacheSavedAt
                      ? ` • Updated ${formatCacheTime(cacheSavedAt)}`
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={refreshPosts}
                  disabled={refreshing}
                  className="btn btn-outline"
                >
                  <RefreshCw
                    size={16}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="card-elevated overflow-hidden">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.96)_48%,rgba(24,199,184,0.12)_100%)] p-6 md:p-10">
              <div className="pointer-events-none absolute inset-0 panel-grid opacity-40" />
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[rgba(77,163,255,0.14)] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[rgba(24,199,184,0.1)] blur-3xl" />

              <div className="relative">
                <div className="eyebrow">
                  <ShieldCheck size={15} />
                  AdminHub Global • About & Insights
                </div>

                <h1 className="max-w-[13ch]">
                  Proof, portals, workflows, and managed support explained.
                </h1>

                <p className="mt-4 max-w-[66ch] text-base leading-8 text-[var(--text-secondary)]">
                  AdminHub Global is a custom 9th-iteration PWA framework for
                  agents, leads, client onboarding, project delivery, proposal
                  tools, messaging, uploads, and recurring managed support.
                  These insights help explain the platform, the sales process,
                  and why custom infrastructure matters beyond basic website
                  builders.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/contact"
                    className="btn btn-primary"
                    prefetch={false}
                  >
                    <ClipboardList size={18} />
                    Submit Inquiry
                  </Link>

                  <Link
                    href="/solutions"
                    className="btn btn-outline"
                    prefetch={false}
                  >
                    View Solutions
                    <ArrowRight size={18} />
                  </Link>

                  <Link
                    href="/partners"
                    className="btn btn-ghost"
                    prefetch={false}
                  >
                    <Users size={18} />
                    Partner Portal
                  </Link>

                  <button
                    type="button"
                    onClick={refreshPosts}
                    disabled={refreshing}
                    className="btn btn-outline"
                  >
                    <RefreshCw
                      size={18}
                      className={refreshing ? "animate-spin" : ""}
                    />
                    {refreshing ? "Refreshing..." : "Refresh Insights"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loadError ? (
            <div className="mt-6 rounded-[1.25rem] border border-red-500/30 bg-red-500/10 p-4 text-sm leading-7 text-red-200">
              {loadError}
            </div>
          ) : null}
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-3">
            <InfoPanel
              eyebrow="What the platform explains"
              title="From live proof to operating system"
              icon={<Sparkles size={18} />}
            >
              <ul className="mt-4 space-y-3">
                {[
                  "Why the 48-hour live proof process helps prospects understand value before a full build.",
                  "How agents can sell a visible proof stage instead of an abstract development promise.",
                  "How Client Hub, messaging, uploads, and project workspaces support delivery after conversion.",
                  "Why the custom framework can go beyond boxed-in DIY website builders.",
                  "How recurring support keeps launched projects useful after the first deployment.",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-sm leading-7 text-[var(--text-secondary)]"
                  >
                    <CheckCircle2
                      size={16}
                      className="mt-[5px] shrink-0 text-[var(--brand-primary)]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                <Link
                  href="/solutions"
                  className="btn btn-outline w-full"
                  prefetch={false}
                >
                  Explore Solutions
                  <ArrowRight size={18} />
                </Link>
              </div>
            </InfoPanel>

            {loading ? (
              <LoadingCard />
            ) : featuredPosts[0] ? (
              <InsightCard post={featuredPosts[0]} origin={origin} />
            ) : (
              <PlaceholderInsightCard />
            )}

            <InfoPanel
              eyebrow="How the model works"
              title="A cleaner path from lead to support"
              icon={<Workflow size={18} />}
            >
              <ol className="mt-4 space-y-3">
                {[
                  {
                    title: "Lead or inquiry enters",
                    desc: "A prospect, agent, or partner submits identity, business context, region, and project need.",
                  },
                  {
                    title: "Rapid proof creates clarity",
                    desc: "A live preliminary direction helps the client see the solution instead of imagining it.",
                  },
                  {
                    title: "Implementation becomes structured",
                    desc: "Approved projects move into onboarding, dashboard/portal wiring, messaging, uploads, and launch prep.",
                  },
                  {
                    title: "Support continues after launch",
                    desc: "The relationship can move into monthly managed support, updates, refinements, and platform continuity.",
                  },
                ].map((step, index) => (
                  <li
                    key={step.title}
                    className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-extrabold text-[var(--text-on-brand)]">
                        {index + 1}
                      </span>
                      <span>
                        <span className="block text-sm font-extrabold text-[var(--text-primary)]">
                          {step.title}
                        </span>
                        <span className="mt-1 block text-sm leading-7 text-[var(--text-secondary)]">
                          {step.desc}
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </InfoPanel>

            <InfoPanel
              eyebrow="Inquiry preparation"
              title="What to include before private follow-up"
              icon={<FileText size={18} />}
            >
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                AdminHub Global uses a structured inquiry flow instead of
                exposing direct personal phone or email details publicly.
              </p>

              <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                <p className="text-sm font-extrabold text-[var(--text-primary)]">
                  Useful inquiry details
                </p>
                <ul className="mt-3 space-y-2">
                  {[
                    "Name and preferred contact detail",
                    "Business or organisation name",
                    "Country or region",
                    "Whether you are asking as a client, agent, or partner",
                    "What workflow, portal, dashboard, or support need you want reviewed",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-sm leading-7 text-[var(--text-secondary)]"
                    >
                      <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-primary)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <Link
                  href="/contact"
                  className="btn btn-primary w-full"
                  prefetch={false}
                >
                  <ClipboardList size={18} />
                  Submit Inquiry
                </Link>

                <Link
                  href="/c/rapid-proof"
                  className="btn btn-outline w-full"
                  prefetch={false}
                >
                  View Proof Process
                  <ArrowRight size={18} />
                </Link>
              </div>
            </InfoPanel>

            {loading ? (
              <LoadingCard />
            ) : featuredPosts[1] ? (
              <InsightCard post={featuredPosts[1]} origin={origin} />
            ) : (
              <QuickHelpCard />
            )}

            {loading ? (
              <LoadingCard />
            ) : featuredPosts[2] ? (
              <InsightCard post={featuredPosts[2]} origin={origin} />
            ) : (
              <WhyInsightsCard />
            )}
          </div>
        </div>
      </section>

      {remainingPosts.length > 0 ? (
        <section className="section-shell pt-0">
          <div className="container">
            <div className="mb-6">
              <div className="eyebrow">
                <CalendarDays size={15} />
                More from AdminHub Global
              </div>

              <h2 className="section-title">More insights and updates</h2>
              <p className="section-copy mt-2">
                Educational posts that explain the proof process, custom PWA
                delivery, partner-led sales, client portals, dashboards,
                workflows, and managed support.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {remainingPosts.map((post) => (
                <InsightCard key={post.id} post={post} origin={origin} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-shell pt-0">
        <div className="container">
          <div className="frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
            <b className="text-[var(--text-primary)]">Contact policy:</b>{" "}
            AdminHub Global intentionally avoids publishing direct personal
            contact details on public pages. Use structured inquiry capture first
            so identity, business context, region, role, and project need are
            recorded before private follow-up.
          </div>
        </div>
      </section>
    </main>
  );
}

function InsightCard({ post, origin }: { post: Blog; origin: string }) {
  const title = post.title?.trim() || "AdminHub Global Insight";
  const imageSrc = safeImageSrc(post.imageUrl);
  const articleUrl = getPostUrl(origin, post.id);

  const handleShare = async () => {
    await shareArticle({
      title,
      url: articleUrl,
    });
  };

  return (
    <article className="card-outline-gold overflow-hidden">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--surface-2)]">
        <img
          src={imageSrc}
          alt={title}
          className="h-full w-full object-cover opacity-90"
          onError={(event) => {
            event.currentTarget.src = "/placeholder.png";
          }}
        />
      </div>

      <div className="card-inner md:p-6">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
          <CalendarDays size={14} />
          {formatDate(post)}
        </div>

        <h2 className="mt-3 text-2xl">{title}</h2>

        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          {getExcerpt(post.body)}
        </p>

        <div className="mt-5 grid gap-2">
          <Link
            href={`/blog/${post.id}`}
            className="btn btn-outline w-full justify-center"
            prefetch={false}
          >
            Read insight
            <ArrowRight size={18} />
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="btn btn-ghost w-full justify-center"
          >
            <Share2 size={18} />
            Share Insight
          </button>

          <Link
            href="/contact"
            prefetch={false}
            className="btn btn-primary w-full justify-center"
          >
            <MessageCircle size={18} />
            Ask via Inquiry
          </Link>
        </div>
      </div>
    </article>
  );
}

function PlaceholderInsightCard() {
  return (
    <section className="card-outline-gold">
      <div className="card-inner md:p-6">
        <div className="eyebrow mb-0">
          <Sparkles size={18} />
          Latest insights
        </div>

        <h2 className="mt-2 text-xl">No insights published yet</h2>

        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          Once posts are published in the blog collection, they will appear
          inside this blended About and Insights layout.
        </p>

        <div className="mt-5">
          <Link href="/contact" prefetch={false} className="btn btn-primary">
            <ClipboardList size={18} />
            Submit Inquiry
          </Link>
        </div>
      </div>
    </section>
  );
}

function QuickHelpCard() {
  return (
    <section className="card-outline-gold">
      <div className="card-inner md:p-6">
        <div className="eyebrow mb-0">
          <LockKeyhole size={18} />
          Controlled follow-up
        </div>

        <h2 className="mt-2 text-xl">Need to discuss AdminHub Global?</h2>

        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          Submit structured details first: your identity, business context,
          region, role, and what you need. AdminHub can then review the request
          and follow up privately.
        </p>

        <div className="mt-5">
          <Link href="/contact" prefetch={false} className="btn btn-primary w-full">
            <ClipboardList size={18} />
            Submit Inquiry
          </Link>
        </div>
      </div>
    </section>
  );
}

function WhyInsightsCard() {
  return (
    <section className="card-outline-gold">
      <div className="card-inner md:p-6">
        <div className="eyebrow mb-0">
          <ShieldCheck size={18} />
          Why insights matter
        </div>

        <h2 className="mt-2 text-xl">
          Sales education, proof, and credibility.
        </h2>

        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          These insights help explain why AdminHub Global is more than a simple
          website service: it is a custom PWA framework for workflows, portals,
          dashboards, delivery, and recurring support.
        </p>
      </div>
    </section>
  );
}

function LoadingCard() {
  return (
    <div className="card overflow-hidden">
      <div className="h-[220px] loading-shimmer" />
      <div className="card-inner md:p-6">
        <div className="h-4 w-32 rounded loading-shimmer" />
        <div className="mt-4 h-8 w-3/4 rounded loading-shimmer" />
        <div className="mt-3 h-4 w-full rounded loading-shimmer" />
        <div className="mt-2 h-4 w-5/6 rounded loading-shimmer" />
      </div>
    </div>
  );
}

function InfoPanel({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card-outline-gold h-full">
      <div className="card-inner md:p-6">
        <div className="eyebrow mb-0">
          {icon}
          {eyebrow}
        </div>

        <h2 className="mt-2 text-xl">{title}</h2>

        {children}
      </div>
    </section>
  );
}