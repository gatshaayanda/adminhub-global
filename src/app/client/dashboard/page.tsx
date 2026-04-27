"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Wifi,
  WifiOff,
  Workflow,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";
import AdminHubLoader from "@/components/AdminHubLoader";

type ClientProject = {
  id: string;

  client_name?: string;
  client_email?: string;
  client_phone?: string;

  project_name?: string;
  business?: string;
  business_name?: string;
  organisation?: string;
  industry?: string;

  request_type?: string;
  service_type?: string;
  selected_package?: string;
  package_name?: string;

  status?: string;
  stage?: string;
  progress_update?: string;
  onboarding_status?: string;
  support_status?: string;
  recurring_status?: string;

  required_documents?: string;
  onboarding_requests?: string;
  build_notes?: string;

  documentUrl?: string;
  documentName?: string;
  proposalUrl?: string;
  proposalName?: string;

  portal_access?: boolean;
  admin_panel?: boolean;
};

type CachedDashboard = {
  projects: ClientProject[];
  messageCounts: Record<string, number>;
  cachedAt: string;
};

const CACHE_PREFIX = "adminhub_global_client_dashboard_cache_v1";

function cacheKey(email: string) {
  return `${CACHE_PREFIX}_${email.toLowerCase().trim()}`;
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readCachedDashboard(email: string): CachedDashboard | null {
  if (typeof window === "undefined") return null;

  try {
    return safeJsonParse<CachedDashboard>(localStorage.getItem(cacheKey(email)));
  } catch {
    return null;
  }
}

function saveCachedDashboard(
  email: string,
  data: Omit<CachedDashboard, "cachedAt">
) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      cacheKey(email),
      JSON.stringify({
        ...data,
        cachedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.warn("Could not save AdminHub Global Client Hub cache:", error);
  }
}

function formatCachedAt(value: string) {
  try {
    return new Date(value).toLocaleString("en-BW", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "recently";
  }
}

function niceLabel(value?: string) {
  if (!value) return "—";

  return value
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getProjectTitle(item: ClientProject) {
  return (
    item.project_name?.trim() ||
    item.business_name?.trim() ||
    item.business?.trim() ||
    item.organisation?.trim() ||
    item.selected_package?.trim() ||
    item.package_name?.trim() ||
    item.client_name?.trim() ||
    "AdminHub Global Project"
  );
}

function getProjectPackage(item: ClientProject) {
  return (
    item.selected_package?.trim() ||
    item.package_name?.trim() ||
    item.service_type?.trim() ||
    item.request_type?.trim() ||
    "—"
  );
}

function getProjectStage(item: ClientProject) {
  return item.stage?.trim() || item.status?.trim() || "active";
}

function canShowInPortal(item: ClientProject) {
  return item.portal_access === true || item.admin_panel === true;
}

export default function ClientDashboard() {
  const router = useRouter();

  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [clientEmail, setClientEmail] = useState("");
  const [cachedAt, setCachedAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const updateOnlineStatus = () => {
      setOnline(navigator.onLine);
    };

    updateOnlineStatus();

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  async function loadFromNetwork(email: string, hasCachedData: boolean) {
    setError("");

    if (hasCachedData) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const q = query(
        collection(firestore, "projects"),
        where("client_email", "==", email)
      );

      const snap = await getDocs(q);

      const rows = snap.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ClientProject, "id">),
        }))
        .filter(canShowInPortal);

      const counts: Record<string, number> = {};

      await Promise.all(
        rows.map(async (item) => {
          try {
            const messagesCol = collection(
              firestore,
              "projects",
              item.id,
              "messages"
            );

            const countSnap = await getCountFromServer(messagesCol);
            counts[item.id] = countSnap.data().count || 0;
          } catch (countError) {
            console.warn("Could not count project messages:", countError);
            counts[item.id] = 0;
          }
        })
      );

      setProjects(rows);
      setMessageCounts(counts);

      const savedAt = new Date().toISOString();
      setCachedAt(savedAt);

      saveCachedDashboard(email, {
        projects: rows,
        messageCounts: counts,
      });
    } catch (err) {
      console.error("Client Hub load failed:", err);

      const cached = readCachedDashboard(email);

      if (cached) {
        setProjects(cached.projects || []);
        setMessageCounts(cached.messageCounts || {});
        setCachedAt(cached.cachedAt || "");
        setError("");
      } else {
        setError("Could not load your Client Hub records.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("role="));

    const email = cookie ? decodeURIComponent(cookie.split("=")[1] || "") : "";

    if (!email || !email.includes("@")) {
      router.replace("/client/login");
      return;
    }

    setClientEmail(email);

    const cached = readCachedDashboard(email);
    const hasCachedData = !!cached;

    if (cached) {
      setProjects(cached.projects || []);
      setMessageCounts(cached.messageCounts || {});
      setCachedAt(cached.cachedAt || "");
      setLoading(false);
    }

    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    loadFromNetwork(email, hasCachedData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, online]);

  const stats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter((item) => getProjectStage(item) !== "closed")
        .length,
      withMessages: projects.filter((item) => (messageCounts[item.id] || 0) > 0)
        .length,
      onSupport: projects.filter((item) =>
        ["active", "monthly", "managed", "retainer"].some((word) =>
          `${item.support_status || ""} ${item.recurring_status || ""}`
            .toLowerCase()
            .includes(word)
        )
      ).length,
    };
  }, [projects, messageCounts]);

  const handleLogout = () => {
    document.cookie = "role=; path=/; max-age=0;";
    router.replace("/client/login");
  };

  const handleRefresh = () => {
    if (!clientEmail || !online) return;
    loadFromNetwork(clientEmail, projects.length > 0);
  };

  if (loading) return <AdminHubLoader />;

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <section className="section-shell relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />

          <div className="container relative">
            <div className="frame-gold mx-auto max-w-2xl p-8 text-center">
              <h1 className="text-2xl">Unable to load Client Hub</h1>
              <p className="mt-3 text-sm leading-7 text-red-200">{error}</p>

              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-outline mt-5"
              >
                Return to Login
              </button>
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
            {!online ? (
              <div className="mb-5 rounded-[1.25rem] border border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] px-4 py-3 text-sm leading-7 text-[#fcd34d]">
                <div className="flex items-start gap-2">
                  <WifiOff size={17} className="mt-1 shrink-0" />
                  <p>
                    You are offline. This Client Hub is showing saved project
                    data from this device. New messages, files, project updates,
                    and support records will refresh when you are online again.
                  </p>
                </div>
              </div>
            ) : cachedAt ? (
              <div className="mb-5 rounded-[1.25rem] border border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.12)] px-4 py-3 text-sm leading-7 text-[#86efac]">
                <div className="flex items-start gap-2">
                  <Wifi size={17} className="mt-1 shrink-0" />
                  <p>
                    Online. Client Hub data was last saved on{" "}
                    <b>{formatCachedAt(cachedAt)}</b>.
                    {refreshing ? " Refreshing latest updates…" : ""}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="eyebrow mb-2">
                  <ShieldCheck size={15} />
                  AdminHub Global • Client Hub
                </div>
                <h1 className="max-w-[14ch]">
                  Your project workspace and support view.
                </h1>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={!online || refreshing}
                  className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={18}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <Link
                  href="/contact"
                  prefetch={false}
                  className="btn btn-outline"
                >
                  <ClipboardList size={18} />
                  Request Help
                </Link>

                <button
                  onClick={handleLogout}
                  className="btn btn-ghost"
                  type="button"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="card-elevated overflow-hidden">
                <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.96)_48%,rgba(24,199,184,0.12)_100%)] p-6 md:p-10">
                  <div className="pointer-events-none absolute inset-0 panel-grid opacity-40" />

                  <div className="relative">
                    <div className="eyebrow">
                      <UserRound size={15} />
                      Logged in client
                    </div>

                    <h2 className="text-2xl">Welcome back.</h2>

                    <p className="mt-4 max-w-[62ch] text-base leading-8 text-[var(--text-secondary)]">
                      This Client Hub lets you view assigned AdminHub Global
                      project workspaces, track progress updates, open files or
                      proposals, continue project communication, and follow
                      onboarding or support requests.
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <InfoMini
                        label="Account"
                        value={clientEmail}
                        icon={<Mail size={15} />}
                      />
                      <InfoMini
                        label="Projects"
                        value={String(stats.total)}
                        icon={<FileText size={15} />}
                      />
                      <InfoMini
                        label="Conversations"
                        value={String(stats.withMessages)}
                        icon={<MessageCircle size={15} />}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-outline-gold self-start">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <BadgeCheck size={15} />
                    Workspace status
                  </div>

                  <h2 className="mt-2 text-2xl">At a glance</h2>

                  <div className="mt-5 grid gap-3 sm:grid-cols-4 xl:grid-cols-2">
                    <StatCard label="Total" value={String(stats.total)} />
                    <StatCard label="Active" value={String(stats.active)} />
                    <StatCard label="Chats" value={String(stats.withMessages)} />
                    <StatCard label="Support" value={String(stats.onSupport)} />
                  </div>

                  <div className="mt-5 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                    <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                      <LayoutDashboard
                        size={16}
                        className="text-[var(--brand-primary)]"
                      />
                      Client Hub purpose
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      Your workspace is for project visibility, onboarding
                      requests, files, support updates, and structured
                      communication. For login or support issues, use the
                      structured inquiry page.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="mt-8 frame-gold p-8 text-center">
                <h2 className="text-2xl">
                  {online
                    ? "No active Client Hub projects yet"
                    : "No saved projects available offline"}
                </h2>
                <p className="mx-auto mt-3 max-w-[58ch] text-sm leading-7 text-[var(--text-secondary)]">
                  {online
                    ? "Your login is active, but no AdminHub Global project workspaces have been assigned to this email yet. Once a project is ready for portal access, it will appear here."
                    : "This device does not have saved Client Hub project data yet. Go online once, open your dashboard, and the PWA will save your latest visible records for offline-aware viewing."}
                </p>

                <div className="mt-5 flex justify-center">
                  <Link
                    href="/contact"
                    prefetch={false}
                    className="btn btn-outline"
                  >
                    <ClipboardList size={18} />
                    Request Access Review
                  </Link>
                </div>
              </div>
            ) : (
              <section className="mt-8 grid gap-4">
                {projects.map((item) => {
                  const count = messageCounts[item.id] || 0;

                  return (
                    <article key={item.id} className="card-outline-gold">
                      <div className="card-inner md:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-xl">
                                {getProjectTitle(item)}
                              </h2>

                              <span className="rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
                                {niceLabel(getProjectStage(item))}
                              </span>

                              {item.support_status || item.recurring_status ? (
                                <span className="rounded-full border border-[rgba(77,163,255,0.32)] bg-[rgba(77,163,255,0.1)] px-2.5 py-1 text-xs font-bold text-[var(--brand-primary)]">
                                  {niceLabel(
                                    item.support_status ||
                                      item.recurring_status ||
                                      "support"
                                  )}
                                </span>
                              ) : null}

                              {count > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.12)] px-2.5 py-1 text-xs font-bold text-[#86efac]">
                                  <MessageCircle size={13} />
                                  Conversation available
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-3 grid gap-3 md:grid-cols-3">
                              <ProjectMini
                                label="Package"
                                value={niceLabel(getProjectPackage(item))}
                              />
                              <ProjectMini
                                label="Industry"
                                value={niceLabel(item.industry)}
                              />
                              <ProjectMini
                                label="Onboarding"
                                value={niceLabel(item.onboarding_status)}
                              />
                            </div>

                            {item.progress_update ? (
                              <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                                <p className="text-sm font-extrabold text-[var(--text-primary)]">
                                  Latest update
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                                  {item.progress_update}
                                </p>
                              </div>
                            ) : (
                              <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
                                No progress update has been added yet.
                              </p>
                            )}

                            {item.required_documents ||
                            item.onboarding_requests ? (
                              <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                                <p className="text-sm font-extrabold text-[var(--text-primary)]">
                                  Onboarding / requested items
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                                  {item.required_documents ||
                                    item.onboarding_requests}
                                </p>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                            <Link
                              href={`/client/project/${item.id}`}
                              className="btn btn-primary"
                              prefetch={false}
                            >
                              Open Workspace
                              <ArrowRight size={18} />
                            </Link>

                            {item.documentUrl ? (
                              <a
                                href={item.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline"
                              >
                                <FileText size={18} />
                                {item.documentName ? "Open File" : "Open File"}
                              </a>
                            ) : null}

                            {item.proposalUrl ? (
                              <a
                                href={item.proposalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline"
                              >
                                <BriefcaseBusiness size={18} />
                                {item.proposalName
                                  ? "Open Proposal"
                                  : "Open Proposal"}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}

            <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Contact policy:</b>{" "}
              Client Hub access is limited to workspaces assigned to your email.
              If a workspace is missing or you need login help, use the
              structured inquiry page so your identity and context are recorded
              before private follow-up.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4 text-center">
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-extrabold text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

function InfoMini({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
      <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {icon}
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

function ProjectMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}