"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Lock, ShieldCheck, Wifi, WifiOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!online) {
      setError("Admin access requires an internet connection so the server can verify your credentials.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      if (res.ok) { router.replace("/admin/dashboard"); return; }
      const { error: msg } = await res.json().catch(() => ({ error: "Login failed" }));
      setError(msg || "Login failed"); setPw("");
    } catch { setError("Something went wrong. Check your connection and try again."); setPw(""); }
    finally { setLoading(false); }
  }

  return (
    <main id="main" className="min-h-screen bg-[#f7f7f3] text-[#111318]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-[#deded7] pb-4">
          <Link href="/" prefetch={false} className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-[#111318] hover:text-[#173ea5]"><ArrowLeft size={17} />Admin Hub</Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d7d8d1] bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#4e535a]">{online ? <Wifi size={14} /> : <WifiOff size={14} />}{online ? "Online" : "Offline"}</div>
        </header>

        <div className="flex flex-1 items-start py-10 sm:py-14 lg:py-16">
          <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
            <section className="lg:pr-12 lg:pt-4">
              <div className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#173ea5]"><ShieldCheck size={15} />Internal access</div>
              <h1 className="max-w-[11ch] text-5xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl">Admin Hub Control.</h1>
              <p className="mt-5 max-w-[52ch] text-base leading-8 text-[#4e535a]">The private workspace for managing Admin Hub&apos;s apps, games, projects, content, and build evidence.</p>
              <div className="mt-9 grid gap-4 sm:grid-cols-3">
                {[['Apps','Product work'],['Games','Interactive work'],['Build Log','Public proof']].map(([title,copy]) => <div key={title} className="border-l-2 border-[#111318] pl-4"><p className="text-sm font-black text-[#111318]">{title}</p><p className="mt-1 text-xs leading-5 text-[#686d74]">{copy}</p></div>)}
              </div>
            </section>

            <section className="rounded-[1.4rem] border border-[#d7d8d1] bg-white p-6 shadow-[0_20px_60px_rgba(17,19,24,0.08)] sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#111318] text-white"><Lock size={21} /></div>
              <div className="mt-6"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#686d74]">Admin login</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Continue to the dashboard</h2><p className="mt-2 text-sm leading-6 text-[#686d74]">Enter the internal admin password. Access is verified online before the dashboard opens.</p></div>
              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div><label htmlFor="password" className="block text-sm font-extrabold text-[#111318]">Admin password</label><input id="password" type="password" placeholder="Enter admin password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#b9bbc0] bg-[#fbfbf8] px-4 text-base text-[#111318] outline-none transition placeholder:text-[#8a8f96] focus:border-[#173ea5] focus:ring-4 focus:ring-[#173ea5]/10" required autoComplete="current-password" disabled={loading || !online} /></div>
                <button type="submit" disabled={loading || !online} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#111318] px-5 text-sm font-black text-white transition hover:bg-[#173ea5] disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}{loading ? "Signing in..." : online ? "Open Admin Hub Control" : "Offline"}</button>
                {error ? <div role="alert" className="rounded-xl border border-[#e0b7b7] bg-[#fff5f5] px-4 py-3 text-sm leading-6 text-[#9d2424]">{error}</div> : null}
              </form>
              <p className="mt-6 border-t border-[#ecece6] pt-5 text-xs leading-5 text-[#686d74]">Private admin access only. No public content or personal contact details are exposed by this login screen.</p>
            </section>
          </div>
        </div>

        <footer className="border-t border-[#deded7] pt-4 text-xs text-[#686d74]">ADMIN HUB <span className="mx-2">·</span> Internal control</footer>
      </div>
    </main>
  );
}
