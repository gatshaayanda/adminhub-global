"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeInfo,
  Briefcase,
  Car,
  ChevronDown,
  Facebook,
  FileText,
  HeartPulse,
  Instagram,
  Landmark,
  LogOut,
  Menu,
  MessageCircle,
  Music,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import LogoMktMark from "@/components/LogoMktMark";

const WHATSAPP_NUMBER = "+26772971852";
const CLIENT_LOGIN_PATH = "/client/login";
const CLIENT_PORTAL_PATH = "/client/dashboard";

const SOCIALS = {
  instagram: "https://www.instagram.com/sparklelegacyinsurancebrokers/",
  tiktok: "https://www.tiktok.com/@sparklelegacyinsurancebr",
  facebook:
    "https://www.facebook.com/Sparkle-Legacy-Insurance-Brokers-61557773288268/",
};

const OFFLINE_LOCAL_STORAGE_KEYS = [
  "sparkle_chat_history_v1",
  "sparkle_chat_lead_v1",
  "sparkle_blog_cache_v1",
  "sparkle_blog_post_cache_v1",
  "sparkle_home_cache_v1",
  "sparkle_claims_cache_v1",
  "sparkle_category_cache_v1",
  "sparkle_contact_cache_v1",
];

const OFFLINE_DB_NAME_HINTS = [
  "firebase",
  "firestore",
  "sparkle",
  "workbox",
  "pwa",
];

const primaryNav = [
  { label: "Home", href: "/", icon: <Sparkles size={18} /> },
  { label: "Claims", href: "/claims", icon: <FileText size={18} /> },
  { label: "Insights", href: "/blog", icon: <BadgeInfo size={18} /> },
  { label: "Contact", href: "/contact", icon: <MessageCircle size={18} /> },
];

const productNav = [
  {
    label: "Short-Term Insurance",
    href: "/c/short-term",
    icon: <Car size={18} />,
  },
  {
    label: "Long-Term Insurance",
    href: "/c/long-term",
    icon: <HeartPulse size={18} />,
  },
  {
    label: "Business / SME Cover",
    href: "/c/business",
    icon: <Briefcase size={18} />,
  },
  {
    label: "Retirement",
    href: "/c/retirement",
    icon: <Landmark size={18} />,
  },
];

function waLink(message: string) {
  const digits = WHATSAPP_NUMBER.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function telLink() {
  return `tel:${WHATSAPP_NUMBER.replace(/[^\d+]/g, "")}`;
}

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
  const [productsOpen, setProductsOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const roleValue = getCookie("role");

    setAuthed(!!roleValue && roleValue.includes("@"));

    setOpen(false);
    setProductsOpen(false);
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

  const productSectionActive = productNav.some((item) => isActive(item.href));

  const closeAll = () => {
    setOpen(false);
    setProductsOpen(false);
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
        aria-label="Sparkle Legacy Insurance Brokers home"
        className="flex min-w-0 items-center gap-3 select-none"
        prefetch={false}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-white shadow-[var(--shadow-sm)]">
          <LogoMktMark className="h-7 w-7 text-[var(--brand-primary)]" />
        </span>

        <span className="min-w-0">
          <span className="block truncate text-base font-extrabold tracking-[-0.03em] text-[var(--text-primary)] sm:text-lg">
            Sparkle Legacy
          </span>
          <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-primary-strong)] sm:text-xs">
            Insurance Brokers
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

      <div className="hidden border-b border-[var(--border)] bg-[var(--surface)] lg:block">
        <div className="container flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <ShieldCheck
              size={15}
              className="text-[var(--brand-primary-strong)]"
            />
            <span>
              Trusted support for quotes, claims, and policy guidance in
              Botswana.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
                online
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
              title={online ? "Online" : "Offline"}
            >
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}
              {online ? "Online" : "Offline"}
            </span>

            <a
              href={telLink()}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <PhoneCall
                size={14}
                className="text-[var(--brand-primary-strong)]"
              />
              {WHATSAPP_NUMBER}
            </a>

            <a
              href={SOCIALS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--brand-tint)] hover:text-[var(--brand-primary-strong)]"
            >
              <Instagram size={16} />
            </a>

            <a
              href={SOCIALS.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--brand-tint)] hover:text-[var(--brand-primary-strong)]"
            >
              <Music size={16} />
            </a>

            <a
              href={SOCIALS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--brand-tint)] hover:text-[var(--brand-primary-strong)]"
            >
              <Facebook size={16} />
            </a>
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
                onClick={() => setProductsOpen((prev) => !prev)}
                className={`menu-link ${
                  productSectionActive || productsOpen ? "active" : ""
                }`}
                aria-expanded={productsOpen}
                aria-haspopup="menu"
              >
                <Briefcase size={18} />
                Products
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    productsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {productsOpen ? (
                <div className="absolute left-0 top-[calc(100%+12px)] z-50 w-[320px] rounded-[1.25rem] border border-[var(--border)] bg-white p-2 shadow-[var(--shadow-lg)]">
                  {productNav.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      prefetch={false}
                      onClick={closeAll}
                      className={`flex items-start gap-3 rounded-2xl px-3 py-3 transition ${
                        isActive(item.href)
                          ? "bg-[var(--brand-tint)] text-[var(--brand-primary-strong)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="mt-0.5 text-[var(--brand-primary-strong)]">
                        {item.icon}
                      </span>
                      <span>
                        <span className="block text-sm font-extrabold">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                          Explore this cover category
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
            <a
              href={waLink(
                "Hi Sparkle Legacy 👋 I need help with a quote / policy / claim."
              )}
              className="btn btn-outline"
              aria-label="Chat on WhatsApp"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>

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
                className="btn btn-primary"
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
                  Dashboard
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
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-white text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--brand-tint)]"
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
                Portal
              </Link>
            )}

            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-white text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--brand-tint)]"
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
        className={`overflow-hidden border-t border-[var(--border)] bg-[var(--surface)] transition-[max-height] duration-300 lg:hidden ${
          open ? "max-h-[calc(100vh-82px)]" : "max-h-0"
        }`}
        aria-hidden={!open}
      >
        <div className="container max-h-[calc(100vh-82px)] overflow-y-auto py-4">
          <div className="flex flex-col gap-2" aria-label="Mobile navigation">
            <div
              className={`mb-2 rounded-[1.25rem] border px-4 py-3 text-sm font-semibold ${
                online
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
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
                    ? "Online. Latest content can refresh normally."
                    : "Offline. Cached pages may still work, but new content needs internet."}
                </span>
              </div>
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

            <div className="mt-2 rounded-[1.25rem] border border-[var(--border)] bg-white p-2 shadow-[var(--shadow-sm)]">
              <div className="px-2 pb-2 pt-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand-primary-strong)]">
                Products
              </div>

              {productNav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch={false}
                  onClick={closeAll}
                  className={`flex items-center justify-between rounded-2xl px-3 py-3 transition ${
                    isActive(item.href)
                      ? "bg-[var(--brand-tint)] text-[var(--brand-primary-strong)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
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
                About
              </span>
              <span className="text-[var(--text-muted)]">›</span>
            </Link>

            <div className="my-2 h-px bg-[var(--border)]" />

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

            <p className="rounded-[1rem] border border-[var(--border)] bg-white/70 px-4 py-3 text-xs leading-6 text-[var(--text-muted)]">
              Clear Offline Data removes cached app pages, saved offline helper
              data, and Firestore offline cache. It does not delete Firestore
              records or your client cookie login.
            </p>

            <div className="my-2 h-px bg-[var(--border)]" />

            <a
              href={waLink(
                "Hi Sparkle Legacy 👋 I’d like help with a quote / policy / claim."
              )}
              onClick={closeAll}
              className="btn btn-primary w-full"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>

            <a
              href={telLink()}
              onClick={closeAll}
              className="btn btn-outline w-full"
            >
              <PhoneCall size={18} />
              Call
            </a>

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
                  Dashboard
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

            <div className="my-2 h-px bg-[var(--border)]" />

            <div className="flex items-center gap-2">
              <a
                href={SOCIALS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--brand-tint)] hover:text-[var(--brand-primary-strong)]"
              >
                <Instagram size={16} />
              </a>

              <a
                href={SOCIALS.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--brand-tint)] hover:text-[var(--brand-primary-strong)]"
              >
                <Music size={16} />
              </a>

              <a
                href={SOCIALS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--brand-tint)] hover:text-[var(--brand-primary-strong)]"
              >
                <Facebook size={16} />
              </a>
            </div>

            <div className="pt-1 text-xs font-medium text-[var(--text-muted)]">
              WhatsApp / Call: {WHATSAPP_NUMBER}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}