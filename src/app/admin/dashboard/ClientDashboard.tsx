"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getCountFromServer } from "firebase/firestore";
import {
  BookOpen,
  BriefcaseBusiness,
  ClipboardList,
  Database,
  FileText,
  FolderKanban,
  HardDrive,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Network,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  Workflow,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";

const LOCAL_APP_KEYS = [
  "adminhub_global_chat_history_v1",
  "adminhub_global_chat_lead_v1",
  "adminhub_global_home_highlights_v1",
  "adminhub_global_blog_cache_v1",
  "adminhub_global_blog_post_cache_v1",
  "adminhub_global_contact_cache_v1",
  "adminhub_global_inquiry_cache_v1",
  "adminhub_global_category_cache_v1",
  "adminhub_global_client_dashboard_cache_v1",
  "adminhub_global_client_case_cache_v1",
];

const OFFLINE_DB_NAME_HINTS = [
  "firebase",
  "firestore",
  "adminhub",
  "adminhub-global",
  "workbox",
  "pwa",
];

type DashboardStats = {
  projects: string;
  insights: string;
  highlights: string;
  solutions: string;
};

async function countCollection(collectionName: string) {
  const snap = await getCountFromServer(collection(firestore, collectionName));
  return snap.data().count || 0;
}

function getSettledCount(result: PromiseSettledResult<number>) {
  return result.status === "fulfilled" ? String(result.value) : "—";
}

async function clearOfflineAppData() {
  if (typeof window === "undefined") return;

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }

  try {
    LOCAL_APP_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {}

  if ("indexedDB" in window) {
    const idb = window.indexedDB as IDBFactory & {
      databases?: () => Promise<Array<{ name?: string | null }>>;
    };

    if (typeof idb.databases === "function") {
      const databases = await idb.databases();

      const appDatabaseNames = databases
        .map((db) => db.name)
        .filter((name): name is string => Boolean(name))
        .filter((name) => {
          const lower = name.toLowerCase();
          return OFFLINE_DB_NAME_HINTS.some((hint) => lower.includes(hint));
        });

      await Promise.all(
        appDatabaseNames.map(
          (name) =>
            new Promise<void>((resolve) => {
              const request = indexedDB.deleteDatabase(name);

              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            })
        )
      );
    }
  }
}

export default function AdminDashboard() {
  const router = useRouter();

  const [online, setOnline] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    projects: "—",
    insights: "—",
    highlights: "—",
    solutions: "—",
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheMessage, setCacheMessage] = useState("");

  useEffect(() => {
    const updateStatus = () => setOnline(navigator.onLine);

    updateStatus();

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadStats() {
      try {
        setStatsLoading(true);

        const [projectsSnap, blogsSnap, highlightsSnap, solutionsSnap] =
          await Promise.allSettled([
            countCollection("projects"),
            countCollection("blogs"),
            countCollection("highlights"),
            countCollection("insurance_products"),
          ]);

        if (!alive) return;

        setStats({
          projects: getSettledCount(projectsSnap),
          insights: getSettledCount(blogsSnap),
          highlights: getSettledCount(highlightsSnap),
          solutions: getSettledCount(solutionsSnap),
        });
      } catch (error) {
        console.error("Failed to load AdminHub Global dashboard stats:", error);

        if (!alive) return;

        setStats({
          projects: "—",
          insights: "—",
          highlights: "—",
          solutions: "—",
        });
      } finally {
        if (alive) setStatsLoading(false);
      }
    }

    loadStats();

    return () => {
      alive = false;
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
  };

  const handleClearAppStorage = async () => {
    const ok = window.confirm(
      "Clear local PWA cache and saved browser data for AdminHub Global? This will not delete Firestore records."
    );

    if (!ok) return;

    setClearingCache(true);
    setCacheMessage("");

    try {
      await clearOfflineAppData();

      setCacheMessage(
        "Local AdminHub Global cache cleared. Refresh the app to rebuild the latest cached version."
      );
    } catch (error) {
      console.error("Failed to clear AdminHub Global app storage:", error);
      setCacheMessage("Could not clear all local app cache. Please try again.");
    } finally {
      setClearingCache(false);
    }
  };

  const sections = useMemo(
    () => [
      {
        title: "Project Workspace",
        desc: "Manage leads, opportunities, client onboarding, builds, delivery progress, messages, files, and support records.",
        icon: <FolderKanban size={22} />,
        href: "/admin/project",
      },
      {
        title: "New Opportunity",
        desc: "Capture a new lead, client intake, agent referral, proof sprint request, or implementation opportunity.",
        icon: <ClipboardList size={22} />,
        href: "/admin/project/create-project",
      },
      {
        title: "Partner & Client Access",
        desc: "Review portal access, client visibility, partner-facing flows, and secure workspace availability.",
        icon: <Users size={22} />,
        href: "/admin/dashboard/clients",
      },
      {
        title: "Manage Insights",
        desc: "Create and update the combined Insights page content for positioning, education, and trust-building posts.",
        icon: <BookOpen size={22} />,
        href: "/admin/blog",
      },
      {
        title: "Homepage Highlights",
        desc: "Update featured homepage cards, proof-process messaging, platform highlights, and visual content.",
        icon: <ImageIcon size={22} />,
        href: "/admin/dashboard/highlights",
      },
      {
        title: "Solutions Catalogue",
        desc: "Maintain solution/package content such as 48-Hour Live Proof, Business PWA, Operations PWA, and support tiers.",
        icon: <Workflow size={22} />,
        href: "/admin/dashboard/products",
      },
    ],
    []
  );

  const statCards = [
    ["Projects", stats.projects],
    ["Insights", stats.insights],
    ["Highlights", stats.highlights],
    ["Solutions", stats.solutions],
  ];

  return (
    <main
      id="main"
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <section className="section-shell relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />
        <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-[rgba(77,163,255,0.12)] blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-12 h-72 w-72 rounded-full bg-[rgba(24,199,184,0.1)] blur-3xl" />

        <div className="container relative">
          {!online ? (
            <div className="mb-6 rounded-[1.25rem] border border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] px-4 py-3 text-sm leading-7 text-[#fcd34d]">
              <div className="flex items-start gap-2">
                <WifiOff size={17} className="mt-1 shrink-0" />
                <p>
                  You are offline. Admin data may not refresh until the
                  connection returns. Saved public PWA pages may still open, but
                  new messages, uploads, Firestore updates, and dashboard counts
                  need internet.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-[1.25rem] border border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.12)] px-4 py-3 text-sm leading-7 text-[#86efac]">
              <div className="flex items-start gap-2">
                <Wifi size={17} className="mt-1 shrink-0" />
                <p>
                  Online. AdminHub Global records, dashboard counts, portal
                  updates, and project data can refresh normally.
                </p>
              </div>
            </div>
          )}

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="eyebrow">
                <ShieldCheck size={15} />
                AdminHub Global • Admin Control
              </div>

              <h1 className="mt-3 flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--brand-tint)] text-[var(--brand-primary)] shadow-[var(--shadow-blue)]">
                  <LayoutDashboard size={22} />
                </span>
                AdminHub Global Control
              </h1>

              <p className="mt-4 max-w-[66ch] text-base leading-8 text-[var(--text-secondary)]">
                Manage the custom PWA operating system behind AdminHub Global:
                lead intake, agent-supported opportunities, 48-hour live proof
                work, client onboarding, project workspaces, messaging, files,
                proposal-ready outputs, and recurring support tracking.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="badge">
                  <Network size={14} />
                  Custom framework
                </span>
                <span className="badge">
                  <BriefcaseBusiness size={14} />
                  9th iteration
                </span>
                <span className="badge badge-neutral">
                  <ShieldCheck size={14} />
                  Structured inquiry only
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn btn-outline self-start"
              >
                <RefreshCw size={18} />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-outline self-start"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <button
                key={section.title}
                type="button"
                onClick={() => router.push(section.href)}
                className="card-outline-gold h-full text-left transition hover:-translate-y-[2px] hover:border-[var(--border-glow)]"
              >
                <div className="card-inner md:p-6">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--brand-tint)] text-[var(--brand-primary)]">
                      {section.icon}
                    </span>

                    <div>
                      <h2 className="text-xl">{section.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        {section.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <section className="mt-10">
            <div className="mb-4">
              <div className="eyebrow">
                <LayoutDashboard size={15} />
                Quick overview
              </div>
              <h2 className="mt-2 text-2xl">Dashboard summary</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map(([label, value]) => (
                <div key={label} className="card">
                  <div className="card-inner text-center md:p-6">
                    <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      {label}
                    </div>
                    <div className="mt-3 text-3xl font-extrabold text-[var(--text-primary)]">
                      {statsLoading ? "…" : value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <div className="card-outline-gold">
              <div className="card-inner md:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="eyebrow mb-0">
                      <HardDrive size={15} />
                      PWA storage control
                    </div>

                    <h2 className="mt-2 text-2xl">Clear local app cache</h2>

                    <p className="mt-3 max-w-[72ch] text-sm leading-7 text-[var(--text-secondary)]">
                      Use this after major design, content, navigation, or PWA
                      updates if the installed app is showing old cached content.
                      This clears browser-side cache, saved helper data, and
                      matching local IndexedDB databases. It does not delete
                      Firestore records, projects, insights, highlights, client
                      portal data, messages, uploaded files, or admin content.
                    </p>

                    {cacheMessage ? (
                      <div className="mt-4 rounded-[1rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]">
                        {cacheMessage}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                    <button
                      type="button"
                      onClick={handleClearAppStorage}
                      disabled={clearingCache}
                      className="btn btn-outline"
                    >
                      {clearingCache ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                      {clearingCache ? "Clearing..." : "Clear App Cache"}
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      className="btn btn-ghost"
                    >
                      <Database size={18} />
                      View Public App
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
            <b className="text-[var(--text-primary)]">Admin note:</b> this
            dashboard is for AdminHub Global internal control. It keeps the
            existing reusable framework wiring intact while reframing the system
            around agents, leads, live proof, client onboarding, delivery,
            messaging, files, PDFs, and managed support. Public direct personal
            contact details should stay hidden behind structured inquiry flows.
          </div>
        </div>
      </section>
    </main>
  );
}