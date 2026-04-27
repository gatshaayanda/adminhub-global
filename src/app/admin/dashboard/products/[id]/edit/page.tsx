"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  FolderKanban,
  Loader2,
  Pencil,
  ShieldCheck,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";
import AdminHubLoader from "@/components/AdminHubLoader";

type ServiceCategory =
  | "rapid-proof"
  | "business-pwa"
  | "operations-pwa"
  | "partner-led-sales"
  | "client-hub"
  | "managed-support"
  | "proposal-tools"
  | "agent-operations"
  | "custom-framework";

type FormState = {
  name: string;
  category: ServiceCategory;
  summary: string;
  bullets: string;
  whatItCovers: string;
  whoItsFor: string;
  keyNotes: string;
  priceRange: string;
  order: string;
  active: boolean;
};

const CATEGORY_OPTIONS: {
  value: ServiceCategory;
  label: string;
  help: string;
}[] = [
  {
    value: "rapid-proof",
    label: "48-Hour Live Proof",
    help: "Rapid proof sprint for moving a prospect from intake/profile to a live preliminary PWA direction.",
  },
  {
    value: "business-pwa",
    label: "Business PWA Systems",
    help: "Public site, admin dashboard, client portal, messaging, uploads, and support workflow.",
  },
  {
    value: "operations-pwa",
    label: "Operations PWA Builds",
    help: "Workflow-heavy systems for cases, onboarding, files, requests, approvals, and support.",
  },
  {
    value: "partner-led-sales",
    label: "Partner-Led Sales",
    help: "Sales partner model for agents, qualified leads, proof-backed conversion, and recurring support potential.",
  },
  {
    value: "client-hub",
    label: "Client Hub",
    help: "Client-facing workspace for progress updates, messages, files, onboarding, and support visibility.",
  },
  {
    value: "managed-support",
    label: "Managed Support",
    help: "Recurring post-launch support, updates, fixes, content changes, and system continuity.",
  },
  {
    value: "proposal-tools",
    label: "Proposal & PDF Tools",
    help: "Reusable PDFs, proposal sheets, scope summaries, onboarding summaries, and project documents.",
  },
  {
    value: "agent-operations",
    label: "Agent Operations",
    help: "Lead tracking, attribution, agent activity, commissions, payout status, and partner operations.",
  },
  {
    value: "custom-framework",
    label: "Custom Framework",
    help: "The reusable Next.js, TailwindCSS, Firebase, UploadThing, and PWA framework behind AdminHub Global.",
  },
];

const VALID_CATEGORIES = CATEGORY_OPTIONS.map((item) => item.value);

function listToText(value?: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .join("\n")
    : "";
}

function toList(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCategory(value?: unknown): ServiceCategory {
  const clean = typeof value === "string" ? value.trim() : "";

  if (VALID_CATEGORIES.includes(clean as ServiceCategory)) {
    return clean as ServiceCategory;
  }

  return "rapid-proof";
}

export default function EditServicePackagePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    category: "rapid-proof",
    summary: "",
    bullets: "",
    whatItCovers: "",
    whoItsFor: "",
    keyNotes: "",
    priceRange: "",
    order: "",
    active: true,
  });

  const selectedCategory = useMemo(
    () => CATEGORY_OPTIONS.find((item) => item.value === form.category),
    [form.category]
  );

  useEffect(() => {
    let alive = true;

    async function loadPackage() {
      try {
        if (!id) {
          router.replace("/admin/dashboard/products");
          return;
        }

        const ref = doc(firestore, "service_packages", id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          throw new Error("Service package not found.");
        }

        const servicePackage = snap.data() as Record<string, unknown>;

        if (!alive) return;

        setForm({
          name:
            typeof servicePackage.name === "string"
              ? servicePackage.name
              : "",
          category: normalizeCategory(servicePackage.category),
          summary:
            typeof servicePackage.summary === "string"
              ? servicePackage.summary
              : "",
          bullets: listToText(servicePackage.bullets),
          whatItCovers: listToText(servicePackage.whatItCovers),
          whoItsFor: listToText(servicePackage.whoItsFor),
          keyNotes: listToText(servicePackage.keyNotes),
          priceRange:
            typeof servicePackage.priceRange === "string"
              ? servicePackage.priceRange
              : "",
          order:
            typeof servicePackage.order === "number"
              ? String(servicePackage.order)
              : "",
          active: servicePackage.active !== false,
        });
      } catch (error) {
        console.error("Load service package failed:", error);
        window.alert("Could not load service package.");
        router.push("/admin/dashboard/products");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadPackage();

    return () => {
      alive = false;
    };
  }, [id, router]);

  async function save(e: FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      window.alert("Service package name is required.");
      return;
    }

    if (!form.summary.trim()) {
      window.alert("Summary is required.");
      return;
    }

    const orderValue =
      form.order.trim() === "" ? null : Number.parseInt(form.order, 10);

    if (form.order.trim() !== "" && Number.isNaN(orderValue)) {
      window.alert("Order must be a valid number.");
      return;
    }

    if (!id) return;

    setSaving(true);

    try {
      await updateDoc(doc(firestore, "service_packages", id), {
        name: form.name.trim(),

        // Public /c/[category] bucket.
        // This must match the category slugs used in the public /c/ page.
        category: form.category,

        summary: form.summary.trim(),
        bullets: toList(form.bullets),
        whatItCovers: toList(form.whatItCovers),
        whoItsFor: toList(form.whoItsFor),
        keyNotes: toList(form.keyNotes),
        priceRange: form.priceRange.trim(),
        order: orderValue,
        active: form.active,

        // Admin ownership / compatibility
        admin_id: "admin",

        updatedAt: serverTimestamp(),
      });

      router.push("/admin/dashboard/products");
    } catch (error) {
      console.error("Update failed:", error);
      window.alert("Failed to update service package.");
      setSaving(false);
    }
  }

  if (loading) return <AdminHubLoader />;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="section-shell">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5">
              <Link
                href="/admin/dashboard/products"
                prefetch={false}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
              >
                <ArrowLeft size={16} />
                Back to Service Packages
              </Link>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="card-elevated overflow-hidden">
                <div className="bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(6,10,18,0.98)_100%)] p-6 md:p-10">
                  <div className="eyebrow">
                    <Pencil size={15} />
                    AdminHub Global • Edit Service Package
                  </div>

                  <h1 className="max-w-[13ch]">
                    Update an AdminHub service package.
                  </h1>

                  <p className="mt-4 max-w-[62ch] text-base leading-8 text-[var(--text-secondary)]">
                    Edit this Firestore add-on package. The built-in AdminHub
                    Global service catalogue still stays available on the public{" "}
                    <b>/c/</b> pages, and this package is merged on top of that
                    baseline.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                      <p className="text-sm font-extrabold text-[var(--text-primary)]">
                        Public category
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        This controls which <b>/c/</b> page the package appears
                        on.
                      </p>
                    </div>

                    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                      <p className="text-sm font-extrabold text-[var(--text-primary)]">
                        Add-on behavior
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        This updates only the Firestore package. It does not
                        remove or replace the default service catalogue.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-outline-gold self-start">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <ShieldCheck size={15} />
                    Editing checklist
                  </div>

                  <h2 className="mt-2 text-2xl">Before saving</h2>

                  <ul className="mt-5 space-y-3">
                    {[
                      "Keep the package aligned with the correct public /c/ category.",
                      "Do not recreate the whole PDF catalogue here.",
                      "Use clear package language for prospects and partners.",
                      "Only mark inactive if the package should stay hidden from public pages.",
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

                  <div className="mt-6 rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <p className="text-sm font-extrabold text-[var(--text-primary)]">
                      Current public bucket
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      <b>{selectedCategory?.label}</b>
                      <br />
                      {selectedCategory?.help}
                    </p>
                  </div>

                  <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <p className="text-sm font-extrabold text-[var(--text-primary)]">
                      Package ID
                    </p>
                    <p className="mt-2 break-all text-xs leading-6 text-[var(--text-muted)]">
                      {id}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <section className="mt-8">
              <form onSubmit={save} className="card-outline-gold">
                <div className="card-inner space-y-5 md:p-8">
                  <div className="eyebrow mb-0">
                    <FileText size={15} />
                    Service package details
                  </div>

                  <div>
                    <label
                      htmlFor="name"
                      className="text-sm font-semibold text-[var(--text-primary)]"
                    >
                      Package Name
                    </label>
                    <input
                      id="name"
                      className="input mt-2"
                      placeholder="Example: Rapid Proof + Launch Sprint"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="category"
                        className="text-sm font-semibold text-[var(--text-primary)]"
                      >
                        Public Category
                      </label>
                      <select
                        id="category"
                        className="input mt-2"
                        value={form.category}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            category: e.target.value as ServiceCategory,
                          }))
                        }
                      >
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="priceRange"
                        className="text-sm font-semibold text-[var(--text-primary)]"
                      >
                        Price Range / Commercial Note
                      </label>
                      <input
                        id="priceRange"
                        className="input mt-2"
                        placeholder="Example: USD 2,500–5,000 or Custom quote"
                        value={form.priceRange}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            priceRange: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="summary"
                      className="text-sm font-semibold text-[var(--text-primary)]"
                    >
                      Summary
                    </label>
                    <textarea
                      id="summary"
                      className="input mt-2 min-h-[110px] resize-y rounded-[1.25rem]"
                      placeholder="Write a short practical summary of what this package is and why it matters."
                      value={form.summary}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          summary: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bullets"
                      className="text-sm font-semibold text-[var(--text-primary)]"
                    >
                      Key Points
                    </label>
                    <textarea
                      id="bullets"
                      className="input mt-2 min-h-[140px] resize-y rounded-[1.25rem]"
                      placeholder={`One item per line\nExample:\nLive preliminary version\nStructured intake review\nEarly backend/admin direction`}
                      value={form.bullets}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          bullets: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="whatItCovers"
                      className="text-sm font-semibold text-[var(--text-primary)]"
                    >
                      What It Includes
                    </label>
                    <textarea
                      id="whatItCovers"
                      className="input mt-2 min-h-[140px] resize-y rounded-[1.25rem]"
                      placeholder={`One item per line\nExample:\nPublic PWA direction\nAdmin dashboard foundation\nClient portal planning\nPDF/output workflow direction`}
                      value={form.whatItCovers}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          whatItCovers: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="whoItsFor"
                      className="text-sm font-semibold text-[var(--text-primary)]"
                    >
                      Who It’s For
                    </label>
                    <textarea
                      id="whoItsFor"
                      className="input mt-2 min-h-[120px] resize-y rounded-[1.25rem]"
                      placeholder={`One item per line\nExample:\nSMEs that need more than a brochure website\nAgents selling proof-backed digital infrastructure\nBusinesses with client communication and file workflows`}
                      value={form.whoItsFor}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          whoItsFor: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="keyNotes"
                      className="text-sm font-semibold text-[var(--text-primary)]"
                    >
                      Important Notes
                    </label>
                    <textarea
                      id="keyNotes"
                      className="input mt-2 min-h-[120px] resize-y rounded-[1.25rem]"
                      placeholder={`One item per line\nExample:\nFinal scope depends on submitted project details\nPricing depends on implementation depth\nManaged support is quoted separately where applicable`}
                      value={form.keyNotes}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          keyNotes: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="order"
                        className="text-sm font-semibold text-[var(--text-primary)]"
                      >
                        Display Order
                      </label>
                      <input
                        id="order"
                        className="input mt-2"
                        placeholder="Example: 1"
                        value={form.order}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            order: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">
                        <input
                          type="checkbox"
                          checked={form.active}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              active: e.target.checked,
                            }))
                          }
                        />
                        Active on public pages
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      disabled={saving}
                      className="btn btn-primary"
                      type="submit"
                    >
                      {saving ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <FolderKanban size={18} />
                      )}
                      {saving ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      onClick={() => router.push("/admin/dashboard/products")}
                      className="btn btn-outline"
                      type="button"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </section>

            <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Admin note:</b> the
              default AdminHub service catalogue remains available on the public{" "}
              <b>/c/</b> pages. This editor only updates the extra Firestore
              package that gets merged into that catalogue.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}