"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  Network,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";

interface Blog {
  title: string;
  body: string;
  imageUrl?: string;
  created_at?: { seconds: number; nanoseconds: number };
  createdAt?: { seconds: number; nanoseconds: number };
}

async function shareArticle({
  title,
  url,
}: {
  title: string;
  url: string;
}) {
  const text = "This AdminHub Global insight may be useful:";
  const message = [text, "", title, "", url].join("\n");

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
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

function formatDate(seconds?: number) {
  if (!seconds) return "Recently published";

  return new Date(seconds * 1000).toLocaleDateString("en-BW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function splitParagraphs(body?: string) {
  return (body || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function getIntroText(body?: string, max = 230) {
  const text = (body || "").replace(/\s+/g, " ").trim();

  if (!text) {
    return "Practical AdminHub Global guidance on custom PWA delivery, agents, client portals, workflows, proof sprints, and managed support.";
  }

  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function getPostUrl(origin: string, id?: string) {
  if (!id) return origin ? `${origin}/blog` : "/blog";
  return origin ? `${origin}/blog/${id}` : `/blog/${id}`;
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

function getPostSeconds(post?: Blog | null) {
  return post?.created_at?.seconds || post?.createdAt?.seconds || 0;
}

export default function BlogPostPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [post, setPost] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!id) return;

    let alive = true;

    async function loadPost() {
      try {
        const snap = await getDoc(doc(firestore, "blogs", id));

        if (!snap.exists()) {
          router.replace("/blog");
          return;
        }

        if (!alive) return;

        setPost(snap.data() as Blog);
      } catch (error) {
        console.error("Failed to load AdminHub Global insight:", error);
        router.replace("/blog");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadPost();

    return () => {
      alive = false;
    };
  }, [id, router]);

  const imageSrc = safeImageSrc(post?.imageUrl);
  const paragraphs = splitParagraphs(post?.body);
  const intro = getIntroText(post?.body);
  const articleUrl = useMemo(() => getPostUrl(origin, id), [origin, id]);

  const handleShareArticle = async () => {
    if (!post) return;

    await shareArticle({
      title: post.title,
      url: articleUrl,
    });
  };

  if (loading) {
    return (
      <main className="bg-[var(--background)] text-[var(--foreground)]">
        <section className="section-shell">
          <div className="container">
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="card overflow-hidden">
                <div className="card-inner md:p-8">
                  <div className="h-4 w-32 animate-pulse rounded bg-[var(--surface-2)]" />
                  <div className="mt-4 h-12 w-4/5 animate-pulse rounded bg-[var(--surface-2)]" />
                  <div className="mt-3 h-4 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
                  <div className="mt-5 h-4 w-full animate-pulse rounded bg-[var(--surface-2)]" />
                  <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-[var(--surface-2)]" />
                  <div className="mt-6 flex gap-3">
                    <div className="h-11 w-40 animate-pulse rounded-full bg-[var(--surface-2)]" />
                    <div className="h-11 w-40 animate-pulse rounded-full bg-[var(--surface-2)]" />
                  </div>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="h-[320px] animate-pulse bg-[var(--surface-2)]" />
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="card overflow-hidden">
                <div className="card-inner md:p-8">
                  <div className="h-4 w-24 animate-pulse rounded bg-[var(--surface-2)]" />
                  <div className="mt-6 space-y-3">
                    <div className="h-4 w-full animate-pulse rounded bg-[var(--surface-2)]" />
                    <div className="h-4 w-11/12 animate-pulse rounded bg-[var(--surface-2)]" />
                    <div className="h-4 w-10/12 animate-pulse rounded bg-[var(--surface-2)]" />
                    <div className="h-4 w-full animate-pulse rounded bg-[var(--surface-2)]" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--surface-2)]" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="card overflow-hidden">
                  <div className="card-inner md:p-6">
                    <div className="h-4 w-24 animate-pulse rounded bg-[var(--surface-2)]" />
                    <div className="mt-4 h-8 w-3/4 animate-pulse rounded bg-[var(--surface-2)]" />
                    <div className="mt-4 h-4 w-full animate-pulse rounded bg-[var(--surface-2)]" />
                    <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-[var(--surface-2)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="bg-[var(--background)] text-[var(--foreground)]">
        <section className="section-shell">
          <div className="container">
            <div className="frame-gold p-8 text-center">
              <h1 className="text-2xl">Insight not found</h1>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                This article could not be found. You can return to the Insights
                page.
              </p>

              <div className="mt-5 flex justify-center">
                <Link href="/blog" className="btn btn-outline" prefetch={false}>
                  <ArrowLeft size={18} />
                  Back to Insights
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main" className="bg-[var(--background)] text-[var(--foreground)]">
      <section className="section-shell relative">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />

        <div className="container relative">
          <div className="mb-5">
            <Link
              href="/blog"
              prefetch={false}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
            >
              <ArrowLeft size={16} />
              Back to Insights
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="card-elevated overflow-hidden">
              <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.96)_48%,rgba(24,199,184,0.12)_100%)] p-6 md:p-8">
                <div className="pointer-events-none absolute inset-0 panel-grid opacity-40" />

                <div className="relative">
                  <div className="eyebrow mb-0">
                    <Sparkles size={15} />
                    AdminHub Global • Insight
                  </div>

                  <div className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
                    <CalendarDays size={16} />
                    {formatDate(getPostSeconds(post))}
                  </div>

                  <h1 className="mt-3 max-w-[16ch]">{post.title}</h1>

                  <p className="mt-5 max-w-[62ch] text-base leading-8 text-[var(--text-secondary)]">
                    {intro}
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      href="/contact"
                      prefetch={false}
                      className="btn btn-primary"
                    >
                      <ClipboardList size={18} />
                      Ask via Inquiry
                    </Link>

                    <button
                      type="button"
                      onClick={handleShareArticle}
                      className="btn btn-outline"
                    >
                      <Share2 size={18} />
                      Share Insight
                    </button>

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
                  </div>
                </div>
              </div>
            </div>

            <div className="card-outline-gold overflow-hidden">
              <div className="relative aspect-[16/10] w-full bg-[var(--surface-2)] xl:min-h-[100%]">
                <Image
                  src={imageSrc}
                  alt={post.title}
                  fill
                  sizes="(min-width: 1280px) 40vw, 100vw"
                  className="object-cover opacity-90"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="container">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <article className="card overflow-hidden">
              <div className="card-inner md:p-8">
                <div className="eyebrow mb-0">
                  <FileText size={15} />
                  Article
                </div>

                <div className="mt-5 h-px bg-[var(--border)]" />

                <div className="mt-6 space-y-5 text-[15px] leading-8 text-[var(--text-secondary)]">
                  {paragraphs.length > 0 ? (
                    paragraphs.map((paragraph, index) => (
                      <div key={index}>
                        <p className="whitespace-pre-wrap">{paragraph}</p>

                        {index === 1 ? (
                          <div className="mt-6 rounded-[1.5rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-5">
                            <div className="eyebrow mb-0">
                              <ShieldCheck size={15} />
                              Practical next step
                            </div>

                            <h2 className="mt-2 text-xl text-[var(--text-primary)]">
                              Want to apply this to your own project or sales
                              process?
                            </h2>

                            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                              Submit structured details first: your identity,
                              business context, region, role, and the workflow
                              or platform need you want reviewed. AdminHub can
                              then follow up privately.
                            </p>

                            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                              <Link
                                href="/contact"
                                prefetch={false}
                                className="btn btn-primary"
                              >
                                <ClipboardList size={18} />
                                Submit Inquiry
                              </Link>

                              <button
                                type="button"
                                onClick={handleShareArticle}
                                className="btn btn-outline"
                              >
                                <Share2 size={18} />
                                Share Insight
                              </button>

                              <Link
                                href="/solutions"
                                className="btn btn-outline"
                                prefetch={false}
                              >
                                View Solutions
                                <ArrowRight size={18} />
                              </Link>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p>No article content available.</p>
                  )}
                </div>

                <div className="mt-8 rounded-[1.5rem] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(77,163,255,0.14)_0%,rgba(15,23,42,0.92)_48%,rgba(24,199,184,0.1)_100%)] p-5 md:p-6">
                  <div className="eyebrow mb-0">
                    <Send size={15} />
                    Turn this insight into action
                  </div>

                  <h2 className="mt-2 text-2xl text-[var(--text-primary)]">
                    Ready to discuss this in context?
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    Use the structured inquiry flow to share your name,
                    preferred contact detail, business or organisation, country
                    or region, role, and what you need reviewed.
                  </p>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Link
                      href="/contact"
                      prefetch={false}
                      className="btn btn-primary"
                    >
                      <ClipboardList size={18} />
                      Submit Inquiry
                    </Link>

                    <button
                      type="button"
                      onClick={handleShareArticle}
                      className="btn btn-outline"
                    >
                      <Share2 size={18} />
                      Share Insight
                    </button>
                  </div>
                </div>

                <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
                  <b className="text-[var(--text-primary)]">Contact policy:</b>{" "}
                  AdminHub Global intentionally avoids publishing direct
                  personal phone or email details on public pages. Use structured
                  inquiry capture first so identity, business context, region,
                  role, and project need are recorded before private follow-up.
                </div>
              </div>
            </article>

            <aside className="space-y-4 xl:sticky xl:top-24">
              <InfoCard
                eyebrow="Next step"
                title="Turn this insight into a project review"
                icon={<MessageCircle size={16} />}
              >
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  If this article reflects a business problem, sales process, or
                  platform idea you want reviewed, submit structured details
                  first. Private follow-up happens after the request is reviewed.
                </p>

                <div className="mt-5 flex flex-col gap-2">
                  <Link
                    href="/contact"
                    prefetch={false}
                    className="btn btn-primary w-full"
                  >
                    <ClipboardList size={18} />
                    Submit Inquiry
                  </Link>

                  <button
                    type="button"
                    onClick={handleShareArticle}
                    className="btn btn-outline w-full"
                  >
                    <Share2 size={18} />
                    Share Insight
                  </button>

                  <Link
                    href="/solutions"
                    className="btn btn-outline w-full"
                    prefetch={false}
                  >
                    <LayoutDashboard size={18} />
                    View Solutions
                  </Link>
                </div>
              </InfoCard>

              <InfoCard
                eyebrow="Useful inquiry details"
                title="How to get a better review"
                icon={<CheckCircle2 size={16} />}
              >
                <ul className="mt-3 space-y-2">
                  {[
                    "Mention whether you are asking as a client, agent, or partner",
                    "Share your business or organisation type",
                    "Include your country or target region",
                    "Describe the workflow, portal, dashboard, or support problem",
                    "Mention whether this is a proof sprint, full PWA, or managed support inquiry",
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
              </InfoCard>

              <InfoCard
                eyebrow="Platform context"
                title="Why AdminHub Global shares insights"
                icon={<ShieldCheck size={16} />}
              >
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  These articles explain the business case behind custom PWA
                  systems: faster proof, stronger agent selling, client portals,
                  dashboards, workflows, uploads, PDFs, and recurring support.
                </p>
              </InfoCard>

              <InfoCard
                eyebrow="Custom framework"
                title="Not a boxed-in DIY builder"
                icon={<Network size={16} />}
              >
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  AdminHub Global is built around a reusable Next.js,
                  TailwindCSS, Firebase, UploadThing, and PWA framework designed
                  for workflows, portals, dashboards, messaging, files, and
                  managed support.
                </p>
              </InfoCard>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
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
    <section className="card-outline-gold">
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