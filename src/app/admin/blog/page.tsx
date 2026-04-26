"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type FirestoreDate =
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
  id: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  imageName?: string;
  imageType?: string;
  admin_id?: string;
  created_at?: FirestoreDate;
  createdAt?: FirestoreDate;
  updated_at?: FirestoreDate;
  updatedAt?: FirestoreDate;
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

function formatDate(value?: FirestoreDate) {
  if (!value) return "Recently published";

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

    return "Recently published";
  } catch {
    return "Recently published";
  }
}

function splitParagraphs(body?: string) {
  return (body || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function getExcerpt(body?: string, max = 220) {
  const text = (body || "").replace(/\s+/g, " ").trim();

  if (!text) {
    return "No article body has been added yet.";
  }

  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

export default function AdminBlogViewPage() {
  const router = useRouter();
  const params = useParams() as { id?: string };
  const id = params?.id || "";

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState("/placeholder.png");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace("/admin/blog");
      return;
    }

    let alive = true;

    async function loadPost() {
      try {
        setLoading(true);
        setError("");

        const snap = await getDoc(doc(firestore, "blogs", id));

        if (!alive) return;

        if (!snap.exists()) {
          setError("This post could not be found.");
          setPost(null);
          return;
        }

        const data = {
          id: snap.id,
          ...(snap.data() as Omit<BlogPost, "id">),
        };

        setPost(data);
        setImageSrc(safeImageSrc(data.imageUrl));
      } catch (err: any) {
        console.error("Failed to load admin blog post:", err);

        if (!alive) return;

        setError(err?.message || "Failed to load this post.");
        setPost(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadPost();

    return () => {
      alive = false;
    };
  }, [id, router]);

  const title = post?.title?.trim() || "Untitled Post";
  const paragraphs = useMemo(() => splitParagraphs(post?.body), [post?.body]);
  const createdDate = formatDate(post?.created_at || post?.createdAt);
  const updatedDate = formatDate(post?.updated_at || post?.updatedAt);

  if (loading) return <AdminHubLoader />;

  if (error || !post) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <section className="section-shell">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <div className="mb-5">
                <Link
                  href="/admin/blog"
                  prefetch={false}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary-strong)] transition hover:opacity-80"
                >
                  <ArrowLeft size={16} />
                  Back to Posts
                </Link>
              </div>

              <div className="frame-gold p-8 text-center">
                <h1 className="text-2xl">Post not found</h1>
                <p className="mt-3 text-sm leading-7 text-red-700">
                  {error || "This post could not be loaded."}
                </p>

                <div className="mt-5 flex justify-center">
                  <Link
                    href="/admin/blog"
                    prefetch={false}
                    className="btn btn-outline"
                  >
                    Back to Blog Posts
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
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="section-shell">
        <div className="container">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5">
              <Link
                href="/admin/blog"
                prefetch={false}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary-strong)] transition hover:opacity-80"
              >
                <ArrowLeft size={16} />
                Back to Posts
              </Link>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="card-elevated overflow-hidden">
                <div className="bg-[linear-gradient(180deg,#fffefb_0%,#f7f1e4_100%)] p-6 md:p-10">
                  <div className="eyebrow">
                    <BookOpen size={15} />
                    Sparkle Legacy • Admin Post View
                  </div>

                  <h1 className="max-w-[14ch]">{title}</h1>

                  <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={16} />
                      {createdDate}
                    </span>

                    {post.updated_at || post.updatedAt ? (
                      <span className="inline-flex items-center gap-2">
                        <ShieldCheck size={16} />
                        Updated {updatedDate}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-5 max-w-[62ch] text-base leading-8 text-[var(--text-secondary)]">
                    {getExcerpt(post.body)}
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      href={`/admin/blog/${post.id}/edit`}
                      prefetch={false}
                      className="btn btn-primary"
                    >
                      <Pencil size={18} />
                      Edit This Post
                    </Link>

                    <Link
                      href={`/blog/${post.id}`}
                      prefetch={false}
                      className="btn btn-outline"
                    >
                      <Eye size={18} />
                      View Public Page
                    </Link>
                  </div>
                </div>
              </div>

              <div className="card-outline-gold overflow-hidden self-start">
                <div className="card-inner md:p-6">
                  <div className="eyebrow mb-0">
                    <ImageIcon size={15} />
                    Featured Image
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-2)]">
                    <img
                      src={imageSrc}
                      alt={title}
                      className="h-[320px] w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = "/placeholder.png";
                      }}
                    />
                  </div>

                  <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-white/80 p-4">
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

            <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
              <article className="card overflow-hidden">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <FileText size={15} />
                    Post Body
                  </div>

                  <div className="mt-5 h-px bg-[var(--border)]" />

                  <div className="mt-6 space-y-5 text-[15px] leading-8 text-[var(--text-secondary)]">
                    {paragraphs.length > 0 ? (
                      paragraphs.map((paragraph, index) => (
                        <p
                          key={`${paragraph.slice(0, 32)}-${index}`}
                          className="whitespace-pre-wrap"
                        >
                          {paragraph}
                        </p>
                      ))
                    ) : (
                      <p>No body content has been added yet.</p>
                    )}
                  </div>
                </div>
              </article>

              <aside className="space-y-4 xl:sticky xl:top-24">
                <section className="card-outline-gold">
                  <div className="card-inner md:p-6">
                    <div className="eyebrow mb-0">
                      <ShieldCheck size={15} />
                      Admin Checks
                    </div>

                    <h2 className="mt-2 text-xl">Before sharing</h2>

                    <ul className="mt-4 space-y-2">
                      {[
                        "Confirm the image displays correctly.",
                        "Check the post title is clear.",
                        "Check paragraph spacing on mobile.",
                        "Open the public page before sharing.",
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

                    <div className="mt-5 flex flex-col gap-2">
                      <Link
                        href={`/admin/blog/${post.id}/edit`}
                        prefetch={false}
                        className="btn btn-primary w-full"
                      >
                        <Pencil size={18} />
                        Edit Post
                      </Link>

                      <Link
                        href={`/blog/${post.id}`}
                        prefetch={false}
                        className="btn btn-outline w-full"
                      >
                        <Eye size={18} />
                        Public View
                      </Link>
                    </div>
                  </div>
                </section>

                <section className="card-outline-gold">
                  <div className="card-inner md:p-6">
                    <div className="eyebrow mb-0">
                      <BookOpen size={15} />
                      Post ID
                    </div>

                    <p className="mt-3 break-all text-xs leading-6 text-[var(--text-muted)]">
                      {post.id}
                    </p>
                  </div>
                </section>
              </aside>
            </section>

            <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Admin note:</b> this is
              the internal admin preview. Use the public view button to confirm
              how clients will see the article on the live Insights page.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}