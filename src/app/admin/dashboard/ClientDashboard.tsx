"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getCountFromServer } from "firebase/firestore";
import {
  BookOpen,
  BriefcaseBusiness,
  ClipboardList,
  FolderKanban,
  HardDrive,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  Workflow,
} from "lucide-react";
import { firestore } from "@/utils/firebaseConfig";

const LOGIN_ROUTE = "/login-secret-login-for-admins97F4B2NXQ";
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
const OFFLINE_DB_NAME_HINTS = ["firebase", "firestore", "adminhub", "adminhub-global", "workbox", "pwa"];

type DashboardStats = { projects: string; insights: string; highlights: string; solutions: string };

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
    const idb = window.indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string | null }>> };
    if (typeof idb.databases === "function") {
      const databases = await idb.databases();
      const appDatabaseNames = databases
        .map((db) => db.name)
        .filter((name): name is string => Boolean(name))
        .filter((name) => OFFLINE_DB_NAME_HINTS.some((hint) => name.toLowerCase().includes(hint)));
      await Promise.all(
        appDatabaseNames.map(
          (name) =>
            new Promise<void>((resolve) => {
              const request = indexedDB.deleteDatabase(name);
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            }),
        ),
      );
    }
  }
}

export default function AdminDashboard() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ projects: "—", insights: "—", highlights: "—", solutions: "—" });
  const [statsLoading, setStatsLoading] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheMessage, setCacheMessage] = useState("");

  useEffect(() => {
    const updateOnlineStatus = () => setOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadStats() {
      try {
        setStatsLoading(true);
        const [projectsSnap, blogsSnap, highlightsSnap, solutionsSnap] = await Promise.allSettled([
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
        console.error("Failed to load Admin Hub dashboard stats:", error);
        if (alive) setStats({ projects: "—", insights: "—", highlights: "—", solutions: "—" });
      } finally {
        if (alive) setStatsLoading(false);
      }
    }
    loadStats();
    return () => { alive = false; };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    router.replace(LOGIN_ROUTE);
  };

  const handleClearAppStorage = async () => {
    const ok = window.confirm("Clear local Admin Hub PWA cache and saved browser data? This will not delete Firestore records.");
    if (!ok) return;
    setClearingCache(true);
    setCacheMessage("");
    try {
      await clearOfflineAppData();
      setCacheMessage("Local Admin Hub cache cleared. Refresh to rebuild the current cached version.");
    } catch (error) {
      console.error("Failed to clear Admin Hub app storage:", error);
      setCacheMessage("Could not clear all local app cache. Please try again.");
    } finally {
      setClearingCache(false);
    }
  };

  const sections = useMemo(
    () => [
      { title: "Build Log", desc: "Create, publish, edit, archive, and review the public chronological record of Admin Hub work.", icon: <Workflow size={21} />, href: "/admin/updates", primary: true },
      { title: "Project Workspace", desc: "Manage opportunities, client onboarding, builds, delivery progress, messages, files, and support records.", icon: <FolderKanban size={21} />, href: "/admin/project" },
      { title: "New Opportunity", desc: "Capture a new lead, client intake, referral, proof request, or implementation opportunity.", icon: <ClipboardList size={21} />, href: "/admin/project/create-project" },
      { title: "Client & Partner Access", desc: "Review portal access, client visibility, partner-facing flows, and workspace availability.", icon: <Users size={21} />, href: "/admin/dashboard/clients" },
      { title: "Insights", desc: "Create and update the content used for positioning, education, and trust-building.", icon: <BookOpen size={21} />, href: "/admin/blog" },
      { title: "Homepage Highlights", desc: "Manage featured homepage cards, proof messaging, platform highlights, and visual content.", icon: <ImageIcon size={21} />, href: "/admin/dashboard/highlights" },
      { title: "Solutions Catalogue", desc: "Maintain reusable solution and support content used across Admin Hub workflows.", icon: <BriefcaseBusiness size={21} />, href: "/admin/dashboard/products" },
    ],
    [],
  );

  const statCards = [["Projects", stats.projects], ["Insights", stats.insights], ["Highlights", stats.highlights], ["Solutions", stats.solutions]];

  return (
    <main id="main" className="min-h-screen bg-[#f7f7f3] text-[#111318]">
      <div className="mx-auto w-full max-w-[1320px] px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-[#deded7] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-black tracking-[-0.02em]">ADMIN HUB</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#686d74]">Internal control</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={online ? "inline-flex min-h-10 items-center gap-2 rounded-full border border-[#b9d9bd] bg-[#f2faf3] px-3 text-xs font-extrabold uppercase tracking-[0.1em] text-[#276534]" : "inline-flex min-h-10 items-center gap-2 rounded-full border border-[#e5cf9d] bg-[#fffaf0] px-3 text-xs font-extrabold uppercase tracking-[0.1em] text-[#8a5a00]"}>
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}
              {online ? "Online" : "Offline"}
            </div>
            <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#b9bbc0] bg-white px-4 text-sm font-extrabold hover:border-[#111318]">
              <RefreshCw size={16} /> Refresh
            </button>
            <button type="button" onClick={handleLogout} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#111318] px-4 text-sm font-extrabold text-white hover:bg-[#173ea5]">
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </header>

        {!online ? (
          <div className="mt-5 rounded-xl border border-[#e5cf9d] bg-[#fffaf0] px-4 py-3 text-sm leading-6 text-[#6d4b00]">
            You are offline. Public cached pages may still open, but dashboard data, messages, uploads, and Firestore updates require an internet connection.
          </div>
        ) : null}

        <section className="py-10 sm:py-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#173ea5]">
                <ShieldCheck size={15} /> Admin workspace
              </div>
              <h1 className="mt-4 max-w-[12ch] text-5xl font-black leading-[0.96] tracking-[-0.055em] sm:text-6xl">
                Run the work behind Admin Hub.
              </h1>
              <p className="mt-5 max-w-[64ch] text-base leading-8 text-[#4e535a]">
                Manage the products, projects, content, client work, and public proof that make up the Admin Hub operating surface.
              </p>
            </div>
            <div className="border-l-2 border-[#111318] pl-5 lg:mb-1">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#686d74]">Primary publishing tool</p>
              <p className="mt-2 text-lg font-black tracking-[-0.02em]">Build Log</p>
              <p className="mt-1 text-sm leading-6 text-[#686d74]">The fastest route from completed work to a public, dated evidence entry.</p>
              <button type="button" onClick={() => router.push("/admin/updates")} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#111318] px-4 text-sm font-extrabold text-white hover:bg-[#173ea5]">
                Open Build Log <Workflow size={15} />
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => (
              <button
                key={section.title}
                type="button"
                onClick={() => router.push(section.href)}
                className={section.primary ? "group h-full rounded-[1.25rem] border border-[#111318] bg-white p-5 text-left shadow-[0_12px_30px_rgba(17,19,24,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(17,19,24,0.07)]" : "group h-full rounded-[1.25rem] border border-[#d7d8d1] bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#111318] hover:shadow-[0_16px_40px_rgba(17,19,24,0.07)]"}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={section.primary ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#111318] text-white" : "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0f0eb] text-[#111318]"}>
                    {section.icon}
                  </span>
                  {section.primary ? <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#173ea5]">Public evidence</span> : null}
                </div>
                <h2 className="mt-6 text-xl font-black tracking-[-0.03em]">{section.title}</h2>
                <p className="mt-2 text-sm leading-7 text-[#686d74]">{section.desc}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#173ea5]">
                  Open <span aria-hidden="true">→</span>
                </span>
              </button>
            ))}
          </div>

          <section className="mt-12">
            <div className="border-b border-[#deded7] pb-3">
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#686d74]">
                <LayoutDashboard size={14} /> Snapshot
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">Current workspace</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map(([label, value]) => (
                <div key={label} className="border border-[#d7d8d1] bg-white p-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#686d74]">{label}</div>
                  <div className="mt-3 text-3xl font-black tracking-[-0.04em]">{statsLoading ? "…" : value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12 border-t border-[#deded7] pt-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#686d74]">
                  <HardDrive size={14} /> PWA maintenance
                </div>
                <h2 className="mt-2 text-xl font-black tracking-[-0.03em]">Clear local app cache</h2>
                <p className="mt-2 text-sm leading-7 text-[#686d74]">
                  Use this when an installed Admin Hub PWA is showing an older design, navigation state, or cached content. Firestore records and published content are not deleted.
                </p>
                {cacheMessage ? <p className="mt-3 rounded-xl bg-[#f0f0eb] px-4 py-3 text-sm leading-6 text-[#4e535a]">{cacheMessage}</p> : null}
              </div>
              <button type="button" onClick={handleClearAppStorage} disabled={clearingCache} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#b9bbc0] bg-white px-5 text-sm font-extrabold hover:border-[#111318] disabled:cursor-not-allowed disabled:opacity-50">
                <Trash2 size={17} /> {clearingCache ? "Clearing..." : "Clear App Cache"}
              </button>
            </div>
          </section>

          <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-[#deded7] pt-5 text-xs text-[#686d74]">
            <span>ADMIN HUB · Internal control</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck size={13} /> Protected workspace</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
