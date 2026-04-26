"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeInfo,
  BriefcaseBusiness,
  ChevronDown,
  ClipboardList,
  FileText,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  Network,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
  Workflow,
  X,
} from "lucide-react";

import LogoMktMark from "@/components/LogoMktMark";

const CLIENT_LOGIN_PATH = "/client/login";
const CLIENT_PORTAL_PATH = "/client/dashboard";

const OFFLINE_LOCAL_STORAGE_KEYS = [
  "adminhub_global_chat_history_v1",
  "adminhub_global_chat_lead_v1",
  "adminhub_global_home_highlights_v1",
  "adminhub_global_blog_cache_v1",
  "adminhub_global_blog_post_cache_v1",
  "adminhub_global_contact_cache_v1",
  "adminhub_global_inquiry_cache_v1",
  "adminhub_global_category_cache_v1",
];

const OFFLINE_DB_NAME_HINTS = [
  "firebase",
  "firestore",
  "adminhub",
  "adminhub-global",
  "workbox",
  "pwa",
];

const primaryNav = [
  { label: "Home", href: "/", icon: <Sparkles size={18} /> },
  { label: "Partner Portal", href: "/partners", icon: <Users size={18} /> },
  { label: "Insights", href: "/blog", icon: <BadgeInfo size={18} /> },
  { label: "Submit Inquiry", href: "/contact", icon: <MessageCircle size={18} /> },
];

const solutionNav = [
  {
    label: "48-Hour Live Proof",
    href: "/c/rapid-proof",
    icon: <Globe2 size={18} />,
    desc: "Rapid proof sprint for turning a prospect intake into a visible working direction.",
  },
  {
    label: "Business PWA",
    href: "/c/business-pwa",
    icon: <LayoutDashboard size={18} />,
    desc: "Public site, admin dashboard, client portal, messaging, uploads, and support flow.",
  },
  {
    label: "Operations PWA",
    href: "/c/operations-pwa",
    icon: <Workflow size={18} />,
    desc: "Custom workflow-heavy systems for cases, onboarding, files, requests, and support.",
  },
  {
    label: "Client Hub",
    href: CLIENT_PORTAL_PATH,
    icon: <BriefcaseBusiness size={18} />,
    desc: "Client-facing workspace for project progress, files, messages, and support.",
  },
];

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.split("=")[1] || "") : "";
}

function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
}

async function clearOfflineAppData() {
  if (typeof window === "undefined") return;

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }

  try {
    OFFLINE_LOCAL_STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });
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

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const roleValue = getCookie("role");

    setAuthed(!!roleValue && roleValue.includes("@"));

    setOpen(false);
    setSolutionsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const updateOnlineState = () => {
      setOnline(navigator.onLine);
    };

    updateOnlineState();

    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const solutionSectionActive = solutionNav.some((item) => isActive(item.href));

  const closeAll = () => {
    setOpen(false);
    setSolutionsOpen(false);
  };

  const onLogout = () => {
    try {
      clearCookie("role");
      clearCookie("user");
      localStorage.removeItem("mkt_client_authed");
    } catch {}

    setAuthed(false);
    closeAll();
    router.push("/");
  };

  const onSoftRefresh = () => {
    closeAll();
    window.location.reload();
  };

  const onRefreshAppData = async () => {
    const ok = window.confirm(
      "Clear saved offline app data and reload? Your client login should remain active."
    );

    if (!ok) return;

    setRefreshing(true);

    try {
      await clearOfflineAppData();
    } catch (error) {
      console.error("Failed to clear offline app data:", error);
    } finally {
      closeAll();
      window.location.reload();
    }
  };

  const brand = useMemo(
    () => (
      <Link
        href="/"
        onClick={closeAll}
        aria-label="AdminHub Global home"
        className="flex min-w-0 select-none items-center gap-3"
        prefetch={false}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(77,163,255,0.1)] shadow-[var(--shadow-sm)]">
          <LogoMktMark className="h-7 w-7 text-[var(--brand-primary)]" />
        </span>

        <span className="min-w-0">
          <span className="block truncate text-base font-extrabold tracking-[-0.04em] text-[var(--text-primary)] sm:text-lg">
            AdminHub Global
          </span>
          <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-primary)] sm:text-xs">
            Custom PWA OS
          </span>
        </span>
      </Link>
    ),
    []
  );

  return (
    <header className="w-full text-[var(--text-primary)]">
      <a
        href="#main"
        className="sr-only rounded-md bg-white px-3 py-2 text-black focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60]"
      >
        Skip to content
      </a>

      <div className="hidden border-b border-[var(--border)] bg-[rgba(6,10,18,0.78)] lg:block">
        <div className="container flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <ShieldCheck size={15} className="text-[var(--brand-primary)]" />
            <span>
              Custom 9th-iteration PWA framework for agents, clients, projects,
              and managed support.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
                online
                  ? "border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.12)] text-[#86efac]"
                  : "border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] text-[#fcd34d]"
              }`}
              title={online ? "Online" : "Offline"}
            >
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}
              {online ? "Online" : "Offline-aware"}
            </span>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-glow)] hover:text-[var(--text-primary)]"
              prefetch={false}
            >
              <LockKeyhole size={14} className="text-[var(--brand-primary)]" />
              Structured inquiry only
            </Link>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="flex items-center justify-between gap-3 py-3 md:py-4">
          <div className="min-w-0 flex-1 lg:flex-none">{brand}</div>

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Primary navigation"
          >
            {primaryNav.slice(0, 1).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                prefetch={false}
                onClick={closeAll}
                className={`menu-link ${isActive(item.href) ? "active" : ""}`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}

            <div className="relative">
              <button
                type="button"
                onClick={() => setSolutionsOpen((prev) => !prev)}
                className={`menu-link ${
                  solutionSectionActive || solutionsOpen ? "active" : ""
                }`}
                aria-expanded={solutionsOpen}
                aria-haspopup="menu"
              >
                <Network size={18} />
                Solutions
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    solutionsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {solutionsOpen ? (
                <div className="absolute left-0 top-[calc(100%+12px)] z-50 w-[360px] rounded-[1.25rem] border border-[var(--border)] bg-[rgba(11,18,32,0.98)] p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl">
                  {solutionNav.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      prefetch={false}
                      onClick={closeAll}
                      className={`flex items-start gap-3 rounded-2xl px-3 py-3 transition ${
                        isActive(item.href)
                          ? "bg-[var(--brand-tint)] text-[var(--brand-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[rgba(77,163,255,0.08)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="mt-0.5 text-[var(--brand-primary)]">
                        {item.icon}
                      </span>
                      <span>
                        <span className="block text-sm font-extrabold">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-[var(--text-muted)]">
                          {item.desc}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {primaryNav.slice(1).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                prefetch={false}
                onClick={closeAll}
                className={`menu-link ${isActive(item.href) ? "active" : ""}`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/contact"
              className="btn btn-primary"
              prefetch={false}
            >
              <ClipboardList size={18} />
              Submit Inquiry
            </Link>

            <button
              type="button"
              onClick={onSoftRefresh}
              className="btn btn-outline"
              title="Reload the app"
            >
              <RefreshCw size={18} />
              Reload
            </button>

            <button
              type="button"
              onClick={onRefreshAppData}
              disabled={refreshing}
              className="btn btn-ghost"
              title="Clear saved offline data and reload the app"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh Data"}
            </button>

            {!authed ? (
              <Link
                href={CLIENT_LOGIN_PATH}
                className="btn btn-outline"
                prefetch={false}
              >
                Client Login
              </Link>
            ) : (
              <>
                <Link
                  href={CLIENT_PORTAL_PATH}
                  className="btn btn-outline"
                  prefetch={false}
                >
                  Client Hub
                </Link>

                <button
                  type="button"
                  onClick={onLogout}
                  className="btn btn-ghost"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={onSoftRefresh}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(15,23,42,0.86)] text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--brand-tint)]"
              aria-label="Reload app"
              title="Reload app"
            >
              <RefreshCw size={20} />
            </button>

            {!authed ? (
              <Link
                href={CLIENT_LOGIN_PATH}
                prefetch={false}
                onClick={closeAll}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-primary)] px-3 text-xs font-extrabold text-[var(--text-on-brand)] shadow-[var(--shadow-sm)] transition hover:brightness-105 sm:px-4 sm:text-sm"
              >
                Client Login
              </Link>
            ) : (
              <Link
                href={CLIENT_PORTAL_PATH}
                prefetch={false}
                onClick={closeAll}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-primary)] px-3 text-xs font-extrabold text-[var(--text-on-brand)] shadow-[var(--shadow-sm)] transition hover:brightness-105 sm:px-4 sm:text-sm"
              >
                Client Hub
              </Link>
            )}

            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(15,23,42,0.86)] text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--brand-tint)]"
              aria-label="Toggle menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`overflow-hidden border-t border-[var(--border)] bg-[rgba(6,10,18,0.98)] transition-[max-height] duration-300 lg:hidden ${
          open ? "max-h-[calc(100vh-82px)]" : "max-h-0"
        }`}
        aria-hidden={!open}
      >
        <div className="container max-h-[calc(100vh-82px)] overflow-y-auto py-4">
          <div className="flex flex-col gap-2" aria-label="Mobile navigation">
            <div
              className={`mb-2 rounded-[1.25rem] border px-4 py-3 text-sm font-semibold ${
                online
                  ? "border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.12)] text-[#86efac]"
                  : "border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] text-[#fcd34d]"
              }`}
            >
              <div className="flex items-start gap-2">
                {online ? (
                  <Wifi size={17} className="mt-0.5 shrink-0" />
                ) : (
                  <WifiOff size={17} className="mt-0.5 shrink-0" />
                )}
                <span>
                  {online
                    ? "Online. Latest platform content can refresh normally."
                    : "Offline-aware mode. Cached pages may still work, but new messages, uploads, and fresh data need internet."}
                </span>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-4 py-3 text-xs leading-6 text-[var(--text-muted)]">
              <div className="mb-1 flex items-center gap-2 font-extrabold text-[var(--text-primary)]">
                <LockKeyhole size={15} className="text-[var(--brand-primary)]" />
                Controlled contact flow
              </div>
              Direct personal phone or email details are not displayed publicly.
              Submit a structured inquiry first, then AdminHub can follow up
              privately.
            </div>

            {primaryNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                prefetch={false}
                onClick={closeAll}
                className={`menu-link justify-between ${
                  isActive(item.href) ? "active" : ""
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {item.icon}
                  {item.label}
                </span>
                <span className="text-[var(--text-muted)]">›</span>
              </Link>
            ))}

            <div className="mt-2 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-2 shadow-[var(--shadow-sm)]">
              <div className="px-2 pb-2 pt-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                Solutions
              </div>

              {solutionNav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch={false}
                  onClick={closeAll}
                  className={`flex items-center justify-between rounded-2xl px-3 py-3 transition ${
                    isActive(item.href)
                      ? "bg-[var(--brand-tint)] text-[var(--brand-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[rgba(77,163,255,0.08)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {item.icon}
                    {item.label}
                  </span>
                  <span className="text-[var(--text-muted)]">›</span>
                </Link>
              ))}
            </div>

            <Link
              href="/about"
              prefetch={false}
              onClick={closeAll}
              className={`menu-link justify-between ${
                isActive("/about") ? "active" : ""
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <BadgeInfo size={18} />
                About AdminHub
              </span>
              <span className="text-[var(--text-muted)]">›</span>
            </Link>

            <div className="my-2 h-px bg-[var(--border)]" />

            <Link
              href="/contact"
              onClick={closeAll}
              className="btn btn-primary w-full"
              prefetch={false}
            >
              <ClipboardList size={18} />
              Submit Inquiry
            </Link>

            <Link
              href="/partners"
              onClick={closeAll}
              className="btn btn-outline w-full"
              prefetch={false}
            >
              <Users size={18} />
              Partner Access Request
            </Link>

            <button
              type="button"
              onClick={onSoftRefresh}
              className="btn btn-outline w-full"
            >
              <RefreshCw size={18} />
              Reload App
            </button>

            <button
              type="button"
              onClick={onRefreshAppData}
              disabled={refreshing}
              className="btn btn-ghost w-full"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Clear Offline Data"}
            </button>

            <p className="rounded-[1rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-4 py-3 text-xs leading-6 text-[var(--text-muted)]">
              Clear Offline Data removes cached app pages, saved offline helper
              data, and Firestore offline cache. It does not delete Firestore
              records or your client cookie login.
            </p>

            <div className="my-2 h-px bg-[var(--border)]" />

            {!authed ? (
              <Link
                href={CLIENT_LOGIN_PATH}
                onClick={closeAll}
                className="btn btn-outline w-full"
                prefetch={false}
              >
                Client Login
              </Link>
            ) : (
              <>
                <Link
                  href={CLIENT_PORTAL_PATH}
                  onClick={closeAll}
                  className="btn btn-outline w-full"
                  prefetch={false}
                >
                  Client Hub
                </Link>

                <button
                  type="button"
                  onClick={onLogout}
                  className="btn btn-ghost w-full"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            )}

            <div className="pt-2 text-xs font-medium leading-6 text-[var(--text-muted)]">
              AdminHub Global uses structured inquiry capture before private
              follow-up. No direct personal contact details are published here.
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}