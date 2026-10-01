"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Eye,
  FilePlus2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

type Update = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  status: string;
  category: string;
  published: boolean;
  archived: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  viewCount: number;
};

const blank: Omit<Update, "id" | "publishedAt" | "createdAt" | "updatedAt" | "viewCount"> = {
  slug: "",
  title: "",
  summary: "",
  body: "",
  status: "building",
  category: "build",
  published: false,
  archived: false,
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminUpdatesPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [form, setForm] = useState(blank);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadUpdates() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/admin/updates", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load Build Log.");
      }

      setUpdates(data.updates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Build Log.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUpdates();
  }, []);

  function resetForm() {
    setForm(blank);
    setEditingSlug(null);
    setMessage("");
    setError("");
  }

  function editUpdate(update: Update) {
    setEditingSlug(update.slug);
    setForm({
      slug: update.slug,
      title: update.title,
      summary: update.summary,
      body: update.body,
      status: update.status,
      category: update.category,
      published: update.published,
      archived: update.archived,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await fetch(
        editingSlug
          ? `/api/admin/updates/${editingSlug}`
          : "/api/admin/updates",
        {
          method: editingSlug ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save update.");
      }

      setMessage(editingSlug ? "Build update saved." : "Build update created.");
      resetForm();
      await loadUpdates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save update.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUpdate(update: Update) {
    const ok = window.confirm(
      `Permanently delete “${update.title}”? This removes the public entry and its view count.`
    );

    if (!ok) return;

    try {
      setError("");
      const response = await fetch(`/api/admin/updates/${update.slug}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete update.");
      }

      if (editingSlug === update.slug) resetForm();
      setMessage("Build update deleted.");
      await loadUpdates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete update.");
    }
  }

  return (
    <main id="main" className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="section-shell relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />
        <div className="container relative">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)]"
              >
                <ArrowLeft size={16} />
                Admin Dashboard
              </Link>
              <Link href="/updates" target="_blank" className="btn btn-outline">
                <Eye size={17} />
                Public Build Log
              </Link>
            </div>

            <div className="mb-8">
              <div className="eyebrow">
                <FilePlus2 size={15} />
                AdminHub Global • Build Log
              </div>
              <h1 className="mt-3">Build updates.</h1>
              <p className="mt-4 max-w-[70ch] text-base leading-8 text-[var(--text-secondary)]">
                Create the dated public record of what Admin Hub is exploring,
                building, testing and shipping. Nothing is seeded automatically.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
              <form onSubmit={saveUpdate} className="card-elevated">
                <div className="card-inner md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="eyebrow mb-0">
                        {editingSlug ? <Pencil size={15} /> : <Plus size={15} />}
                        {editingSlug ? "Edit update" : "New update"}
                      </div>
                      <h2 className="mt-2 text-2xl">
                        {editingSlug ? "Update the record" : "Publish a build signal"}
                      </h2>
                    </div>

                    {editingSlug ? (
                      <button type="button" onClick={resetForm} className="btn btn-ghost">
                        <X size={17} />
                        Cancel
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-6 space-y-4">
                    <Field
                      label="Title"
                      value={form.title}
                      onChange={(value) => setForm((current) => ({ ...current, title: value }))}
                      placeholder="Example: Admin Hub Build Log is live"
                      required
                    />

                    <Field
                      label="Slug"
                      value={form.slug}
                      onChange={(value) => setForm((current) => ({ ...current, slug: value }))}
                      placeholder="admin-hub-build-log-live"
                      disabled={Boolean(editingSlug)}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField
                        label="Status"
                        value={form.status}
                        onChange={(value) => setForm((current) => ({ ...current, status: value }))}
                        options={[
                          ["exploring", "Exploring"],
                          ["building", "Building"],
                          ["testing", "Testing"],
                          ["live", "Live"],
                          ["paused", "Paused"],
                          ["archived", "Archived"],
                        ]}
                      />

                      <SelectField
                        label="Category"
                        value={form.category}
                        onChange={(value) => setForm((current) => ({ ...current, category: value }))}
                        options={[
                          ["build", "Build"],
                          ["release", "Release"],
                          ["research", "Research"],
                          ["client", "Client"],
                          ["platform", "Platform"],
                        ]}
                      />
                    </div>

                    <TextAreaField
                      label="Short summary"
                      value={form.summary}
                      onChange={(value) => setForm((current) => ({ ...current, summary: value }))}
                      placeholder="One or two sentences that work in the homepage Building Now signal."
                      required
                      rows={4}
                    />

                    <TextAreaField
                      label="Full update"
                      value={form.body}
                      onChange={(value) => setForm((current) => ({ ...current, body: value }))}
                      placeholder="Write the complete public update. Separate paragraphs with a blank line."
                      required
                      rows={10}
                    />

                    <label className="flex items-center gap-3 rounded-[1rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={form.published}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, published: event.target.checked }))
                        }
                      />
                      Publish publicly
                    </label>

                    <label className="flex items-center gap-3 rounded-[1rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={form.archived}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, archived: event.target.checked }))
                        }
                      />
                      Archive this record
                    </label>

                    {message ? (
                      <div className="rounded-[1rem] border border-green-400/30 bg-green-400/10 px-4 py-3 text-sm text-green-200">
                        {message}
                      </div>
                    ) : null}

                    {error ? (
                      <div className="rounded-[1rem] border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                        {error}
                      </div>
                    ) : null}

                    <button type="submit" disabled={saving} className="btn btn-primary">
                      {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      {saving ? "Saving..." : editingSlug ? "Save Update" : "Create Update"}
                    </button>
                  </div>
                </div>
              </form>

              <section className="card">
                <div className="card-inner md:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="eyebrow mb-0">
                        <Archive size={15} />
                        Public history
                      </div>
                      <h2 className="mt-2 text-2xl">All build records</h2>
                    </div>

                    <button type="button" onClick={loadUpdates} className="btn btn-outline">
                      <RefreshCw size={17} />
                      Refresh
                    </button>
                  </div>

                  {loading ? (
                    <div className="mt-6 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                      <Loader2 size={17} className="animate-spin" />
                      Loading Build Log...
                    </div>
                  ) : updates.length === 0 ? (
                    <div className="empty-state mt-6">
                      No Build Log records exist yet. Create the first one when
                      there is a real update worth publishing.
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      {updates.map((update) => (
                        <article
                          key={update.id}
                          className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.58)] p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                <span>{update.status}</span>
                                <span>•</span>
                                <span>{update.category}</span>
                                <span>•</span>
                                <span>{update.published ? "Published" : "Draft"}</span>
                                {update.archived ? <><span>•</span><span>Archived</span></> : null}
                              </div>
                              <h3 className="text-xl">{update.title}</h3>
                              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                                {update.summary}
                              </p>
                            </div>

                            <div className="shrink-0 text-right text-xs leading-6 text-[var(--text-muted)]">
                              <div>Views {update.viewCount}</div>
                              <div>{formatDate(update.publishedAt || update.createdAt)}</div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" onClick={() => editUpdate(update)} className="btn btn-outline">
                              <Pencil size={16} />
                              Edit
                            </button>
                            {update.published ? (
                              <Link
                                href={`/updates/${update.slug}`}
                                target="_blank"
                                className="btn btn-ghost"
                              >
                                <Eye size={16} />
                                Public view
                              </Link>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => deleteUpdate(update)}
                              className="btn btn-ghost text-red-300"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input mt-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 6,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea
        className="textarea mt-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        rows={rows}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="select mt-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
