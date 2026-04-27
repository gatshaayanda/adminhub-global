"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ImageIcon,
  LayoutDashboard,
  Loader2,
  MessageSquareText,
  Network,
  PencilLine,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";
import { uploadFiles } from "@/utils/uploadthing";

type UploadThingResult = {
  url?: string;
  ufsUrl?: string;
  appUrl?: string;
  name?: string;
  type?: string;
};

const TOPIC_OPTIONS = [
  "Platform positioning",
  "48-hour live proof",
  "Partner sales",
  "Client portals",
  "Admin dashboards",
  "PWA operations",
  "Custom framework",
  "Managed support",
];

function getUploadUrl(uploaded?: UploadThingResult) {
  return uploaded?.url || uploaded?.ufsUrl || uploaded?.appUrl || "";
}

export default function NewBlogPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState(TOPIC_OPTIONS[0]);
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleImageChange = (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setImageFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");

    if (!file) {
      setFileInputKey((prev) => prev + 1);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");

    const cleanTitle = title.trim();
    const cleanTopic = topic.trim();
    const cleanBody = body.trim();

    if (!cleanTitle) {
      setErr("Please enter an insight title.");
      return;
    }

    if (!cleanBody) {
      setErr("Please enter the insight body.");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = "";
      let imageName = "";
      let imageType = "";

      if (imageFile) {
        const uploaded = await uploadFiles("fileUploader" as any, {
          files: [imageFile],
        });

        const firstUpload = uploaded?.[0] as UploadThingResult | undefined;

        imageUrl = getUploadUrl(firstUpload);
        imageName = firstUpload?.name || imageFile.name || "";
        imageType = firstUpload?.type || imageFile.type || "";

        if (!imageUrl) {
          console.log("UploadThing response:", uploaded);
          throw new Error("Image uploaded, but no image URL was returned.");
        }
      }

      await addDoc(collection(firestore, "blogs"), {
        admin_id: "admin",
        title: cleanTitle,
        topic: cleanTopic,
        category: cleanTopic.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        visibility: "public",
        body: cleanBody,
        imageUrl,
        imageName,
        imageType,
        created_at: serverTimestamp(),
        createdAt: serverTimestamp(),
        updated_at: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push("/admin/blog");
    } catch (e: any) {
      console.error("Failed to save AdminHub Global insight:", e);
      setErr(e?.message || "Failed to save insight.");
      setSaving(false);
    }
  };

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
          <div className="mx-auto max-w-5xl">
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
                      AdminHub Global • New Insight
                    </div>

                    <h1 className="max-w-[13ch]">
                      Write a useful platform insight.
                    </h1>

                    <p className="mt-4 max-w-[64ch] text-base leading-8 text-[var(--text-secondary)]">
                      Use this form to publish content for the public Insights
                      area. Insights is where AdminHub Global explains the
                      platform, the 48-hour proof process, custom framework
                      thinking, partner sales value, Client Hub workflows, and
                      founder-led delivery credibility.
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                        <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                          <Network
                            size={16}
                            className="text-[var(--brand-primary)]"
                          />
                          Best topics
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                          48-hour live proof, agent-led sales, custom PWA
                          systems, portals, dashboards, messaging, uploads,
                          proposals, and managed support.
                        </p>
                      </div>

                      <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                        <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                          <ShieldCheck
                            size={16}
                            className="text-[var(--brand-primary)]"
                          />
                          Public safety
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                          Do not publish private phone numbers, personal email
                          addresses, internal passwords, or sensitive client
                          information in public insights.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-outline-gold self-start">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <PencilLine size={15} />
                    Content checklist
                  </div>

                  <h2 className="mt-2 text-2xl">Before publishing</h2>

                  <ul className="mt-5 space-y-3">
                    {[
                      "Keep the insight tied to AdminHub Global’s real business model.",
                      "Explain the custom framework value without sounding like a generic DIY website builder.",
                      "Use serious, founder-led language with clear commercial credibility.",
                      "Make the post useful for prospects, agents, clients, or future reviewers.",
                      "Use structured inquiry as the next step, not public personal contact details.",
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

                  <div className="mt-6 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                    <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                      <LayoutDashboard
                        size={16}
                        className="text-[var(--brand-primary)]"
                      />
                      Insights role
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      There is no separate About page. The public Insights area
                      carries both platform explanation and article content.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <section className="mt-8">
              <form onSubmit={handleSubmit} className="card-outline-gold">
                <div className="card-inner space-y-5 md:p-8">
                  <div className="eyebrow mb-0">
                    <MessageSquareText size={15} />
                    Insight details
                  </div>

                  <div>
                    <label htmlFor="title" className="label">
                      Title
                    </label>
                    <input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Example: Why a 48-hour live proof makes custom PWA sales easier"
                      required
                      className="input mt-2"
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label htmlFor="topic" className="label">
                      Topic
                    </label>
                    <select
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="select mt-2"
                      disabled={saving}
                    >
                      {TOPIC_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                      This helps organize public insights around the AdminHub
                      Global platform story.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="featuredImage"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"
                    >
                      <ImageIcon size={16} />
                      Featured Image
                      <span className="font-normal text-[var(--text-muted)]">
                        (optional)
                      </span>
                    </label>

                    <input
                      key={fileInputKey}
                      id="featuredImage"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleImageChange(e.target.files?.[0] || null)
                      }
                      className="input mt-2"
                      disabled={saving}
                    />

                    <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                      Upload a featured image for this insight. If left blank,
                      the public page will use the default placeholder image.
                    </p>

                    {previewUrl ? (
                      <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)]">
                        <img
                          src={previewUrl}
                          alt="Featured image preview"
                          className="max-h-[320px] w-full object-cover"
                        />

                        <div className="flex items-center justify-between gap-3 p-3">
                          <span className="min-w-0 truncate text-xs text-[var(--text-muted)]">
                            Selected image: {imageFile?.name}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleImageChange(null)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[rgba(6,10,18,0.58)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[rgba(77,163,255,0.08)] hover:text-[var(--text-primary)]"
                            disabled={saving}
                          >
                            <X size={14} />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="body" className="label">
                      Body
                    </label>
                    <textarea
                      id="body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Write the insight body here..."
                      required
                      className="textarea mt-2 min-h-[260px] rounded-[1.25rem]"
                      disabled={saving}
                    />
                  </div>

                  {err ? (
                    <div className="rounded-[1rem] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-7 text-red-200">
                      {err}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : imageFile ? (
                        <UploadCloud size={18} />
                      ) : (
                        <BookOpen size={18} />
                      )}
                      {saving ? "Saving..." : "Save & Publish"}
                    </button>

                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="btn btn-outline"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </section>

            <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Admin note:</b> strong
              AdminHub Global insights should make the platform easier to
              understand, easier for agents to explain, and safer for prospects
              to evaluate before submitting a structured inquiry.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}