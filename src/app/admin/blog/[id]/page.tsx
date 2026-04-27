"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Eye,
  FileText,
  ImageIcon,
  Pencil,
  ShieldCheck,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";
import AdminHubLoader from "@/components/AdminHubLoader";

type TimestampLike =
  | {
      seconds?: number;
      nanoseconds?: number;
      toDate?: () => Date;
    }
  | Date
  | string
  | null
  | undefined;

type BlogPost = {
  title?: string;
  body?: string;
  imageUrl?: string;
  imageName?: string;
  imageType?: string;
  topic?: string;
  category?: string;
  visibility?: string;
  admin_id?: string;
  created_at?: TimestampLike;
  createdAt?: TimestampLike;
  updated_at?: TimestampLike;
  updatedAt?: TimestampLike;
};

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

function formatDate(value?: TimestampLike) {
  if (!value) return "Draft / recently added";

  try {
    if (value instanceof Date) {
      return value.toLocaleDateString("en-BW", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    if (typeof value === "string") {
      return new Date(value).toLocaleDateString("en-BW", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    if (typeof value.toDate === "function") {
      return value.toDate().toLocaleDateString("en-BW", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    if (value.seconds) {
      return new Date(value.seconds * 1000).toLocaleDateString("en-BW", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    return "Draft / recently added";
  } catch {
    return "Draft / recently added";
  }
}

function splitParagraphs(body?: string) {
  return (body || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function getExcerpt(body?: string, max = 240) {
  const text = (body || "").replace(/\s+/g, " ").trim();

  if (!text) {
    return "No insight body has been added yet. Add clear platform context, commercial value, framework credibility, or practical guidance before publishing.";
  }

  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function niceLabel(value?: string) {
  if (!value) return "—";

  return value
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function AdminViewBlogPage() {
  const params = useParams() as { id?: string };
  const id = params.id || "";

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    if (!id) {
      setError("Missing insight ID.");
      setLoading(false);
      return;
    }

    async function loadPost() {
      try {
        setLoading(true);
        setError("");

        const snap = await getDoc(doc(firestore, "blogs", id));

        if (!alive) return;

        if (!snap.exists()) {
          setError("Insight not found.");
          setPost(null);
          return;
        }

        setPost(snap.data() as BlogPost);
      } catch (e: any) {
        console.error("Failed to load AdminHub Global insight:", e);

        if (!alive) return;

        setError(e?.message || "Failed to load insight.");
        setPost(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadPost();

    return () => {
      alive = false;
    };
  }, [id]);

  const title = post?.title?.trim() || "Untitled Insight";
  const imageSrc = safeImageSrc(post?.imageUrl);
  const paragraphs = useMemo(() => splitParagraphs(post?.body), [post?.body]);
  const createdDate = formatDate(post?.created_at || post?.createdAt);
  const updatedDate = formatDate(post?.updated_at || post?.updatedAt);
  const hasUpdatedDate = Boolean(post?.updated_at || post?.updatedAt);

  if (loading) return <AdminHubLoader />;

  if (error || !post) {
    return (
      <main
        id="main"
        className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
      >
        <section className="section-shell relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />

          <div className="container relative">
            <div className="mx-auto max-w-3xl">
              <div className="mb-5">
                <Link
                  href="/admin/blog"
                  prefetch={false}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
                >
                  <ArrowLeft size={16} />
                  Back to Insights
                </Link>
              </div>

              <div className="frame-gold p-8 text-center">
                <h1 className="text-2xl">Unable to open insight</h1>
                <p className="mt-3 text-sm leading-7 text-red-200">
                  {error || "This insight could not be loaded."}
                </p>

                <div className="mt-5 flex justify-center">
                  <Link
                    href="/admin/blog"
                    prefetch={false}
                    className="btn btn-outline"
                  >
                    Back to Admin Insights
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      id="main"
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <section className="section-shell relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[rgba(77,163,255,0.12)] blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-[rgba(24,199,184,0.1)] blur-3xl" />

        <div className="container relative">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5">
              <Link
                href="/admin/blog"
                prefetch={false}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
              >
                <ArrowLeft size={16} />
                Back to Insights
              </Link>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="card-elevated overflow-hidden">
                <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.96)_48%,rgba(24,199,184,0.12)_100%)] p-6 md:p-10">
                  <div className="pointer-events-none absolute inset-0 panel-grid opacity-40" />

                  <div className="relative">
                    <div className="eyebrow">
                      <BookOpen size={15} />
                      AdminHub Global • Admin Insight View
                    </div>

                    <h1 className="max-w-[16ch]">{title}</h1>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={16} />
                        {createdDate}
                      </span>

                      {hasUpdatedDate ? (
                        <span className="inline-flex items-center gap-2">
                          <ShieldCheck size={16} />
                          Updated {updatedDate}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-5 max-w-[64ch] text-base leading-8 text-[var(--text-secondary)]">
                      {getExcerpt(post.body)}
                    </p>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <Link
                        href={`/admin/blog/${id}/edit`}
                        prefetch={false}
                        className="btn btn-primary"
                      >
                        <Pencil size={18} />
                        Edit This Insight
                      </Link>

                      <Link
                        href={`/blog/${id}`}
                        prefetch={false}
                        className="btn btn-outline"
                      >
                        <Eye size={18} />
                        View Public Page
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-outline-gold self-start">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <ImageIcon size={15} />
                    Featured image
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)]">
                    <img
                      src={imageSrc}
                      alt={title}
                      className="h-[320px] w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = "/placeholder.png";
                      }}
                    />
                  </div>

                  <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                    <p className="text-sm font-extrabold text-[var(--text-primary)]">
                      Image details
                    </p>

                    <div className="mt-3 space-y-2 text-xs leading-6 text-[var(--text-muted)]">
                      <p className="break-all">
                        <b className="text-[var(--text-secondary)]">URL:</b>{" "}
                        {post.imageUrl?.trim() || "Using default placeholder"}
                      </p>

                      {post.imageName ? (
                        <p>
                          <b className="text-[var(--text-secondary)]">Name:</b>{" "}
                          {post.imageName}
                        </p>
                      ) : null}

                      {post.imageType ? (
                        <p>
                          <b className="text-[var(--text-secondary)]">Type:</b>{" "}
                          {post.imageType}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
              <article className="card overflow-hidden">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <FileText size={15} />
                    Insight content
                  </div>

                  <div className="mt-5 h-px bg-[var(--border)]" />

                  <div className="mt-6 space-y-5 text-[15px] leading-8 text-[var(--text-secondary)]">
                    {paragraphs.length > 0 ? (
                      paragraphs.map((paragraph, index) => (
                        <p
                          key={`${paragraph.slice(0, 30)}-${index}`}
                          className="whitespace-pre-wrap"
                        >
                          {paragraph}
                        </p>
                      ))
                    ) : (
                      <p>No insight content available.</p>
                    )}
                  </div>
                </div>
              </article>

              <aside className="space-y-4 xl:sticky xl:top-24">
                <InfoCard
                  eyebrow="Admin reminder"
                  title="Before publishing widely"
                  icon={<ShieldCheck size={15} />}
                >
                  <ul className="mt-4 space-y-2">
                    {[
                      "Make sure the title clearly explains the platform value.",
                      "Keep the insight practical and commercially credible.",
                      "Do not expose private phone numbers, personal email addresses, passwords, or sensitive client details.",
                      "Remember: Insights is the public explanation and article area. There is no separate About page.",
                      "Check the public page view before sending the link out.",
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
                  eyebrow="Insight metadata"
                  title="Internal reference"
                  icon={<BookOpen size={15} />}
                >
                  <div className="mt-4 space-y-3 text-xs leading-6 text-[var(--text-muted)]">
                    <p className="break-all">
                      <b className="text-[var(--text-secondary)]">Post ID:</b>{" "}
                      {id}
                    </p>

                    <p>
                      <b className="text-[var(--text-secondary)]">Topic:</b>{" "}
                      {niceLabel(post.topic || post.category)}
                    </p>

                    <p>
                      <b className="text-[var(--text-secondary)]">
                        Visibility:
                      </b>{" "}
                      {niceLabel(post.visibility || "public")}
                    </p>

                    {post.admin_id ? (
                      <p className="break-all">
                        <b className="text-[var(--text-secondary)]">
                          Admin ID:
                        </b>{" "}
                        {post.admin_id}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-col gap-2">
                    <Link
                      href={`/admin/blog/${id}/edit`}
                      prefetch={false}
                      className="btn btn-primary w-full"
                    >
                      <Pencil size={18} />
                      Edit Insight
                    </Link>

                    <Link
                      href={`/blog/${id}`}
                      prefetch={false}
                      className="btn btn-outline w-full"
                    >
                      <Eye size={18} />
                      Public View
                    </Link>
                  </div>
                </InfoCard>
              </aside>
            </section>

            <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Admin note:</b> this is
              the internal AdminHub Global insight preview. Use the public view
              button to confirm how visitors will see it on the live Insights
              page.
            </div>
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