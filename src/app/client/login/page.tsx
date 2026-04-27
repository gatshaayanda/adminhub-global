"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  Lock,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";

export default function ClientLoginPage() {
  const router = useRouter();

  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!online) {
      setError(
        "Client login needs an internet connection. Public cached pages may still open offline, but Client Hub access must be verified online."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/client-login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });

      if (res.ok) {
        const { email } = await res.json();

        document.cookie = `role=${encodeURIComponent(
          email
        )}; path=/; max-age=${60 * 60 * 24}`;

        router.push("/client/dashboard");
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Login failed");
      setPw("");
    } catch {
      setError(
        "Something went wrong. Please check your connection and try again."
      );
      setPw("");
    } finally {
      setLoading(false);
    }
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
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/"
                prefetch={false}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
              >
                <ArrowLeft size={16} />
                Back to Home
              </Link>

              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${
                  online
                    ? "border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.12)] text-[#86efac]"
                    : "border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] text-[#fcd34d]"
                }`}
              >
                {online ? <Wifi size={16} /> : <WifiOff size={16} />}
                {online ? "Online" : "Offline-aware"}
              </div>
            </div>

            {!online ? (
              <div className="mb-5 rounded-[1.25rem] border border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] px-4 py-3 text-sm leading-7 text-[#fcd34d]">
                <div className="flex items-start gap-2">
                  <WifiOff size={17} className="mt-1 shrink-0" />
                  <p>
                    You are offline. Public PWA pages may still load from saved
                    content, but Client Hub login requires internet because your
                    password and dashboard access must be verified securely.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="card-elevated overflow-hidden">
                <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.96)_48%,rgba(24,199,184,0.12)_100%)] p-6 md:p-10">
                  <div className="pointer-events-none absolute inset-0 panel-grid opacity-40" />

                  <div className="relative">
                    <div className="eyebrow">
                      <ShieldCheck size={15} />
                      AdminHub Global • Client Hub Access
                    </div>

                    <h1 className="max-w-[12ch]">
                      Secure client login for project visibility.
                    </h1>

                    <p className="mt-4 max-w-[62ch] text-base leading-8 text-[var(--text-secondary)]">
                      Use your access password to enter the Client Hub. This
                      area supports private project updates, files, messaging,
                      onboarding requests, support visibility, and delivery
                      follow-up inside AdminHub Global.
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                        <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                          <LockKeyhole
                            size={16}
                            className="text-[var(--brand-primary)]"
                          />
                          Private client area
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                          Client workspaces are separated from the public site
                          for cleaner project and support management.
                        </p>
                      </div>

                      <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                        <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                          <Wifi
                            size={16}
                            className="text-[var(--brand-primary)]"
                          />
                          Online verification
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                          Login stays online-only so AdminHub Global can confirm
                          the correct client account before opening dashboard
                          records.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <Link
                        href="/contact"
                        prefetch={false}
                        className="btn btn-outline"
                      >
                        <ClipboardList size={18} />
                        Request Login Help
                      </Link>

                      <Link
                        href="/solutions"
                        prefetch={false}
                        className="btn btn-ghost"
                      >
                        <LayoutDashboard size={18} />
                        View Solutions
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-outline-gold self-start">
                <div className="card-inner md:p-8">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--brand-tint)] text-[var(--brand-primary)]">
                    <Lock size={24} />
                  </div>

                  <div className="mt-5 text-center">
                    <div className="eyebrow justify-center">
                      <Lock size={15} />
                      Client Hub Sign In
                    </div>

                    <h2 className="mt-2 text-2xl">Client Login</h2>

                    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                      Enter your secure access password to continue to your
                      Client Hub.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="password" className="label">
                        Password
                      </label>

                      <input
                        id="password"
                        type="password"
                        placeholder="Enter password"
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        className="input mt-2"
                        required
                        autoComplete="current-password"
                        disabled={loading || !online}
                      />

                      {!online ? (
                        <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                          Login is disabled while offline.
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !online}
                      className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <LogIn size={18} />
                      )}
                      {loading
                        ? "Logging In..."
                        : online
                          ? "Login to Client Hub"
                          : "Offline"}
                    </button>

                    {error ? (
                      <div className="rounded-[1rem] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-7 text-red-200">
                        {error}
                      </div>
                    ) : null}
                  </form>

                  <div className="mt-6 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                    <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                      <LayoutDashboard
                        size={16}
                        className="text-[var(--brand-primary)]"
                      />
                      Access note
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      Keep your login details private. Public pages may support
                      offline viewing, but your Client Hub should only open after
                      online verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Contact policy:</b>{" "}
              Login help should go through structured inquiry capture first. No
              direct personal phone or email details are displayed publicly.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}