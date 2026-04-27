"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  Network,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  XCircle,
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

type ServicePackage = {
  id: string;
  name?: string;
  category?: ServiceCategory | string;
  summary?: string;
  bullets?: string[];
  whatItCovers?: string[];
  whoItsFor?: string[];
  keyNotes?: string[];
  active?: boolean;
  order?: number | null;
  admin_id?: string;
  createdAt?: TimestampLike;
  created_at?: TimestampLike;
  updatedAt?: TimestampLike;
  updated_at?: TimestampLike;
};

const CATEGORY_META: Record<
  ServiceCategory,
  {
    label: string;
    href: string;
    icon: ReactNode;
    help: string;
  }
> = {
  "rapid-proof": {
    label: "48-Hour Live Proof",
    href: "/c/rapid-proof",
    icon: <Globe2 size={18} />,
    help: "Rapid proof sprint for turning a prospect intake into a visible working direction.",
  },
  "business-pwa": {
    label: "Business PWA",
    href: "/c/business-pwa",
    icon: <LayoutDashboard size={18} />,
    help: "Public site, admin dashboard, client portal, messaging, uploads, and support flow.",
  },
  "operations-pwa": {
    label: "Operations PWA",
    href: "/c/operations-pwa",
    icon: <Workflow size={18} />,
    help: "Custom workflow-heavy systems for cases, onboarding, files, requests, and support.",
  },
  "partner-led-sales": {
    label: "Partner-Led Sales",
    href: "/partners",
    icon: <Users size={18} />,
    help: "Agent and partner sales flow around visible proof, attribution, conversion, and support.",
  },
  "client-hub": {
    label: "Client Hub",
    href: "/client/dashboard",
    icon: <PackageCheck size={18} />,
    help: "Client-facing workspace for project updates, files, messages, and support visibility.",
  },
  "managed-support": {
    label: "Managed Support",
    href: "/c/managed-support",
    icon: <ShieldCheck size={18} />,
    help: "Recurring monthly support after launch for updates, fixes, improvements, and continuity.",
  },
  "proposal-tools": {
    label: "Proposal & PDF Tools",
    href: "/c/proposal-tools",
    icon: <FileText size={18} />,
    help: "Proposal, scope, catalog, onboarding summary, and project document tooling.",
  },
  "agent-operations": {
    label: "Agent Operations",
    href: "/c/agent-operations",
    icon: <BadgeCheck size={18} />,
    help: "Operational tooling for managing agents, submitted leads, status, attribution, and payouts.",
  },
  "custom-framework": {
    label: "Custom Framework",
    href: "/c/custom-framework",
    icon: <Network size={18} />,
    help: "The custom 9th-iteration Next.js, TailwindCSS, Firebase, UploadThing, and PWA framework.",
  },
};

function isKnownCategory(value?: string): value is ServiceCategory {
  return !!value && value in CATEGORY_META;
}

function getCategoryMeta(value?: string) {
  if (isKnownCategory(value)) return CATEGORY_META[value];

  return {
    label: value || "Uncategorised",
    href: "/admin/dashboard/products",
    icon: <FolderKanban size={18} />,
    help: "This package does not currently match one of the standard AdminHub Global public solution categories.",
  };
}

function formatDate(value?: TimestampLike) {
  if (!value) return "Not recorded";

  try {
    if (value instanceof Date) {
      return value.toLocaleString("en-BW", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    if (typeof value === "string") {
      return new Date(value).toLocaleString("en-BW", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    if (typeof value.toDate === "function") {
      return value.toDate().toLocaleString("en-BW", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    if (value.seconds) {
      return new Date(value.seconds * 1000).toLocaleString("en-BW", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return "Not recorded";
  } catch {
    return "Not recorded";
  }
}

function getListCount(items?: string[]) {
  return Array.isArray(items) ? items.length : 0;
}

export default function ViewServicePackagePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";

  const [item, setItem] = useState<ServicePackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Missing service package ID.");
      setLoading(false);
      return;
    }

    let alive = true;

    async function loadPackage() {
      try {
        setLoading(true);
        setError("");

        const snap = await getDoc(doc(firestore, "service_packages", id));

        if (!alive) return;

        if (!snap.exists()) {
          setError("This service package could not be found.");
          setItem(null);
          return;
        }

        setItem({
          id: snap.id,
          ...(snap.data() as Omit<ServicePackage, "id">),
        });
      } catch (err: any) {
        console.error("Failed to load AdminHub Global service package:", err);

        if (!alive) return;

        setError(err?.message || "Failed to load this service package.");
        setItem(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadPackage();

    return () => {
      alive = false;
    };
  }, [id]);

  const categoryMeta = useMemo(
    () => getCategoryMeta(item?.category),
    [item?.category]
  );

  const title = item?.name?.trim() || "Untitled Service Package";
  const created = formatDate(item?.createdAt || item?.created_at);
  const updated = formatDate(item?.updatedAt || item?.updated_at);

  if (loading) return <AdminHubLoader />;

  if (error || !item) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <section className="section-shell">
          <div className="container">
            <div className="mx-auto max-w-3xl">
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

              <div className="frame-gold p-8 text-center">
                <h1 className="text-2xl">Package not found</h1>
                <p className="mt-3 text-sm leading-7 text-red-400">
                  {error || "This package could not be loaded."}
                </p>

                <div className="mt-5 flex justify-center">
                  <Link
                    href="/admin/dashboard/products"
                    prefetch={false}
                    className="btn btn-outline"
                  >
                    Back to Service Packages
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
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/admin/dashboard/products"
                prefetch={false}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
              >
                <ArrowLeft size={16} />
                Back to Service Packages
              </Link>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link
                  href={`/admin/dashboard/products/${item.id}/edit`}
                  prefetch={false}
                  className="btn btn-primary"
                >
                  <Edit3 size={16} />
                  Edit Package
                </Link>

                <Link
                  href={categoryMeta.href}
                  prefetch={false}
                  className="btn btn-outline"
                >
                  <Eye size={16} />
                  View Public Area
                </Link>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="card-elevated overflow-hidden">
                <div className="bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.98)_48%,rgba(24,199,184,0.12)_100%)] p-6 md:p-10">
                  <div className="eyebrow">
                    <FolderKanban size={15} />
                    AdminHub Global • Service Package View
                  </div>

                  <h1 className="max-w-[14ch]">{title}</h1>

                  <p className="mt-4 max-w-[62ch] text-base leading-8 text-[var(--text-secondary)]">
                    Review this AdminHub Global service package before editing
                    it or checking where it appears on the public solution pages.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MiniStat
                      icon={categoryMeta.icon}
                      label="Category"
                      value={categoryMeta.label}
                    />

                    <MiniStat
                      icon={
                        item.active !== false ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <XCircle size={16} />
                        )
                      }
                      label="Visibility"
                      value={item.active !== false ? "Active" : "Inactive"}
                    />

                    <MiniStat
                      icon={<Sparkles size={16} />}
                      label="Order"
                      value={
                        typeof item.order === "number"
                          ? String(item.order)
                          : "Not set"
                      }
                    />

                    <MiniStat
                      icon={<CalendarDays size={16} />}
                      label="Updated"
                      value={updated}
                    />
                  </div>
                </div>
              </div>

              <div className="card-outline-gold self-start">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <ShieldCheck size={15} />
                    Package snapshot
                  </div>

                  <h2 className="mt-2 text-2xl">Public placement</h2>

                  <div className="mt-5 grid gap-3">
                    <SnapshotRow label="Package ID" value={item.id} />
                    <SnapshotRow
                      label="Public Category"
                      value={categoryMeta.label}
                    />
                    <SnapshotRow
                      label="Raw Category"
                      value={item.category || "—"}
                    />
                    <SnapshotRow
                      label="Active"
                      value={item.active !== false ? "Yes" : "No"}
                    />
                    <SnapshotRow
                      label="Display Order"
                      value={
                        typeof item.order === "number"
                          ? String(item.order)
                          : "Not set"
                      }
                    />
                  </div>

                  <div className="mt-5 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                    <p className="text-sm font-extrabold text-[var(--text-primary)]">
                      Category purpose
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      {categoryMeta.help}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
              <article className="card-outline-gold">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <FileText size={15} />
                    Package content
                  </div>

                  <div className="mt-5 space-y-5">
                    <Read label="Package Name" value={item.name} />
                    <Read label="Summary" value={item.summary} />

                    <DetailList title="Key points" items={item.bullets} />
                    <DetailList
                      title="What it includes"
                      items={item.whatItCovers}
                    />
                    <DetailList title="Who it is for" items={item.whoItsFor} />
                    <DetailList title="Important notes" items={item.keyNotes} />
                  </div>
                </div>
              </article>

              <aside className="space-y-4 xl:sticky xl:top-24">
                <InfoCard
                  eyebrow="Admin checks"
                  title="Before publishing widely"
                  icon={<ShieldCheck size={16} />}
                >
                  <ul className="mt-4 space-y-2">
                    {[
                      "Confirm the category matches the intended public solution page.",
                      "Check that the summary explains the value clearly.",
                      "Keep bullet lists practical and not too long.",
                      "Only keep the package active when it is ready for public display.",
                      "Use the public category link to confirm how the page reads.",
                    ].map((check) => (
                      <li
                        key={check}
                        className="flex gap-2 text-sm leading-7 text-[var(--text-secondary)]"
                      >
                        <CheckCircle2
                          size={16}
                          className="mt-[5px] shrink-0 text-[var(--brand-primary)]"
                        />
                        <span>{check}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 grid gap-2">
                    <Link
                      href={`/admin/dashboard/products/${item.id}/edit`}
                      prefetch={false}
                      className="btn btn-primary w-full"
                    >
                      <Edit3 size={18} />
                      Edit Package
                    </Link>

                    <Link
                      href={categoryMeta.href}
                      prefetch={false}
                      className="btn btn-outline w-full"
                    >
                      <Eye size={18} />
                      View Public Area
                    </Link>
                  </div>
                </InfoCard>

                <InfoCard
                  eyebrow="Content count"
                  title="Field completion"
                  icon={<PackageCheck size={16} />}
                >
                  <div className="mt-4 grid gap-3">
                    <CountRow label="Key points" value={getListCount(item.bullets)} />
                    <CountRow
                      label="What it includes"
                      value={getListCount(item.whatItCovers)}
                    />
                    <CountRow
                      label="Who it is for"
                      value={getListCount(item.whoItsFor)}
                    />
                    <CountRow
                      label="Important notes"
                      value={getListCount(item.keyNotes)}
                    />
                  </div>
                </InfoCard>

                <InfoCard
                  eyebrow="Record dates"
                  title="Timestamps"
                  icon={<CalendarDays size={16} />}
                >
                  <div className="mt-4 space-y-3">
                    <Read label="Created" value={created} />
                    <Read label="Updated" value={updated} />
                  </div>
                </InfoCard>
              </aside>
            </section>

            <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Admin note:</b> this is
              the missing read/view part of CRUD for AdminHub Global service
              packages. Create and edit can change records, while this page gives
              a safe review screen before changes are made.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function DetailList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) {
    return (
      <div>
        <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {title}
        </div>
        <p className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">—</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
        {title}
      </div>

      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li
            key={`${title}-${index}`}
            className="flex gap-2 text-sm leading-7 text-[var(--text-secondary)]"
          >
            <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-primary)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
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

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
      <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {icon}
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold leading-7 text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value?: string }) {
  const text = value && value.trim().length > 0 ? value.trim() : "—";

  return (
    <div className="rounded-[1rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-[var(--text-primary)]">
        {text}
      </div>
    </div>
  );
}

function Read({ label, value }: { label: string; value: unknown }) {
  const text =
    value && value.toString().trim().length > 0 ? value.toString().trim() : "—";

  return (
    <div>
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--text-primary)]">
        {text}
      </div>
    </div>
  );
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
      <span className="text-sm font-semibold text-[var(--text-secondary)]">
        {label}
      </span>
      <span className="rounded-full border border-[var(--border)] bg-[rgba(6,10,18,0.62)] px-2.5 py-1 text-xs font-extrabold text-[var(--brand-primary)]">
        {value}
      </span>
    </div>
  );
}