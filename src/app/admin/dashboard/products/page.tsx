"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FolderKanban,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";
import AdminHubLoader from "@/components/AdminHubLoader";

type ServicePackage = {
  id: string;
  name: string;
  category: string;
  summary?: string;
  bullets?: string[];
  whatItCovers?: string[];
  whoItsFor?: string[];
  keyNotes?: string[];
  priceRange?: string;
  active?: boolean;
  order?: number;
  updatedAt?: unknown;
};

const CATEGORY_LABELS: Record<string, string> = {
  "rapid-proof": "48-Hour Live Proof",
  "business-pwa": "Business PWA Systems",
  "operations-pwa": "Operations PWA Builds",
  "partner-led-sales": "Partner-Led Sales",
  "client-hub": "Client Hub",
  "managed-support": "Managed Support",
  "proposal-tools": "Proposal & PDF Tools",
  "agent-operations": "Agent Operations",
  "custom-framework": "Custom Framework",
};

function getCategoryLabel(category: string) {
  return CATEGORY_LABELS[category?.toLowerCase()] || category || "Other";
}

export default function AdminProductsPage() {
  const [items, setItems] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const cat = (searchParams.get("cat") || "").toLowerCase();

  const load = async () => {
    setLoading(true);

    try {
      const snap = await getDocs(collection(firestore, "service_packages"));

      const mapped = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ServicePackage, "id">),
      })) as ServicePackage[];

      mapped.sort((a, b) => {
        const aCategory = (a.category || "").toLowerCase();
        const bCategory = (b.category || "").toLowerCase();

        if (aCategory !== bCategory) return aCategory.localeCompare(bCategory);

        const aOrder = a.order ?? 9999;
        const bOrder = b.order ?? 9999;

        if (aOrder !== bOrder) return aOrder - bOrder;

        return (a.name || "").localeCompare(b.name || "");
      });

      setItems(mapped);
    } catch (e) {
      console.error("AdminHub service packages load failed:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!cat) return items;
    return items.filter((p) => (p.category || "").toLowerCase() === cat);
  }, [items, cat]);

  const grouped = useMemo(() => {
    const map: Record<string, ServicePackage[]> = {};

    for (const product of filtered) {
      const key = (product.category || "other").toLowerCase();
      map[key] = map[key] || [];
      map[key].push(product);
    }

    return map;
  }, [filtered]);

  const onDelete = async (id: string) => {
    const ok = window.confirm("Delete this AdminHub service package?");
    if (!ok) return;

    try {
      await deleteDoc(doc(firestore, "service_packages", id));
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.error("Delete failed:", e);
      window.alert("Delete failed. Please try again.");
    }
  };

  if (loading) return <AdminHubLoader />;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="section-shell">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5">
              <Link
                href="/admin/dashboard"
                prefetch={false}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Link>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="card-elevated overflow-hidden">
                <div className="bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(6,10,18,0.98)_100%)] p-6 md:p-10">
                  <div className="eyebrow">
                    <FolderKanban size={15} />
                    AdminHub Global • Service Packages
                  </div>

                  <h1 className="max-w-[13ch]">
                    Manage add-on service package content.
                  </h1>

                  <p className="mt-4 max-w-[62ch] text-base leading-8 text-[var(--text-secondary)]">
                    The public <b>/c/</b> solution pages already include the
                    default AdminHub catalogue baseline from the delivery PDF.
                    Use this area only to add new service packages, extensions,
                    pricing notes, or custom offers on top of that baseline.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      href="/admin/dashboard/products/new"
                      prefetch={false}
                      className="btn btn-primary"
                    >
                      <Plus size={18} />
                      New Service Package
                    </Link>

                    <button
                      onClick={load}
                      className="btn btn-outline"
                      type="button"
                    >
                      <RefreshCw size={18} />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              <div className="card-outline-gold self-start">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <ShieldCheck size={15} />
                    Add-on overview
                  </div>

                  <h2 className="mt-2 text-2xl">Current status</h2>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4 text-center">
                      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Admin Add-ons
                      </div>
                      <div className="mt-2 text-3xl font-extrabold text-[var(--text-primary)]">
                        {items.length}
                      </div>
                    </div>

                    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4 text-center">
                      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Filter
                      </div>
                      <div className="mt-2 text-sm font-bold text-[var(--brand-primary)]">
                        {cat ? getCategoryLabel(cat) : "All Categories"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <p className="text-sm font-extrabold text-[var(--text-primary)]">
                      Important behavior
                    </p>
                    <ul className="mt-3 space-y-2">
                      {[
                        "The delivery catalogue baseline is not stored here.",
                        "New records created here are merged into the public /c/ pages.",
                        "Use active=false to hide an admin-created package from public display.",
                        "Use order values to control where admin-created packages appear.",
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
                </div>
              </div>
            </div>

            <section className="mt-8">
              <div className="mb-4">
                <div className="eyebrow">
                  <FolderKanban size={15} />
                  Firestore add-ons
                </div>

                <h2 className="mt-2 text-2xl">
                  Service packages {cat ? `• ${getCategoryLabel(cat)}` : ""}
                </h2>

                <p className="mt-2 max-w-[70ch] text-sm leading-7 text-[var(--text-secondary)]">
                  These are only the extra packages created through admin. The
                  public page still shows the locked AdminHub catalogue baseline
                  even when this list is empty.
                </p>
              </div>

              {filtered.length === 0 ? (
                <div className="frame-gold p-8 text-center">
                  <h3 className="text-2xl">No admin-created packages yet</h3>

                  <p className="mx-auto mt-3 max-w-[58ch] text-sm leading-7 text-[var(--text-secondary)]">
                    That is okay. The public solution pages still use the
                    built-in AdminHub delivery catalogue baseline. Create a new
                    service package here only when you want to add something
                    beyond the default catalogue.
                  </p>

                  <div className="mt-5 flex justify-center">
                    <Link
                      href="/admin/dashboard/products/new"
                      prefetch={false}
                      className="btn btn-primary"
                    >
                      <Plus size={18} />
                      Create Add-on Package
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.keys(grouped)
                    .sort()
                    .map((categoryKey) => (
                      <div
                        key={categoryKey}
                        className="card-outline-gold overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
                          <div>
                            <div className="text-lg font-extrabold text-[var(--text-primary)]">
                              {getCategoryLabel(categoryKey)}
                            </div>

                            <div className="text-sm text-[var(--text-muted)]">
                              {grouped[categoryKey].length} admin add-on
                              {grouped[categoryKey].length === 1 ? "" : "s"}
                            </div>
                          </div>

                          <button
                            onClick={load}
                            className="btn btn-ghost"
                            type="button"
                          >
                            <RefreshCw size={16} />
                            Refresh
                          </button>
                        </div>

                        <div className="divide-y divide-[var(--border)]">
                          {grouped[categoryKey].map((product) => (
                            <div key={product.id} className="px-5 py-5">
                              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-extrabold text-[var(--text-primary)]">
                                      {product.name}
                                    </h3>

                                    {product.active !== false ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-green-400/30 bg-green-400/10 px-2.5 py-1 text-xs font-bold text-green-300">
                                        <CheckCircle2 size={14} />
                                        Active
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-xs font-bold text-red-300">
                                        <XCircle size={14} />
                                        Inactive
                                      </span>
                                    )}

                                    {typeof product.order === "number" ? (
                                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
                                        Order {product.order}
                                      </span>
                                    ) : null}

                                    {product.priceRange ? (
                                      <span className="rounded-full border border-[var(--border)] bg-[var(--brand-tint)] px-2.5 py-1 text-xs font-bold text-[var(--brand-primary)]">
                                        {product.priceRange}
                                      </span>
                                    ) : null}
                                  </div>

                                  {product.summary ? (
                                    <p className="mt-2 max-w-[70ch] text-sm leading-7 text-[var(--text-secondary)]">
                                      {product.summary}
                                    </p>
                                  ) : (
                                    <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
                                      No summary added yet.
                                    </p>
                                  )}

                                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                                    {!!product.bullets?.length && (
                                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-semibold">
                                        Bullets: {product.bullets.length}
                                      </span>
                                    )}

                                    {!!product.whatItCovers?.length && (
                                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-semibold">
                                        Includes: {product.whatItCovers.length}
                                      </span>
                                    )}

                                    {!!product.whoItsFor?.length && (
                                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-semibold">
                                        Who it’s for: {product.whoItsFor.length}
                                      </span>
                                    )}

                                    {!!product.keyNotes?.length && (
                                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-semibold">
                                        Notes: {product.keyNotes.length}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2 xl:justify-end">
                                  <Link
                                    href={`/admin/dashboard/products/${product.id}`}
                                    prefetch={false}
                                    className="btn btn-ghost"
                                  >
                                    <Eye size={16} />
                                    View
                                  </Link>

                                  <Link
                                    href={`/admin/dashboard/products/${product.id}/edit`}
                                    prefetch={false}
                                    className="btn btn-outline"
                                  >
                                    <Pencil size={16} />
                                    Edit
                                  </Link>

                                  <button
                                    onClick={() => onDelete(product.id)}
                                    className="btn btn-ghost"
                                    type="button"
                                  >
                                    <Trash2 size={16} />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>

            <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Admin note:</b> the
              public AdminHub solution pages merge these Firestore records with
              the built-in delivery catalogue baseline. Do not recreate the
              whole PDF catalogue here — only add new service packages when the
              offer expands.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}