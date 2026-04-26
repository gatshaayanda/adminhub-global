"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (installed || dismissed || !deferredPrompt) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  return (
    <div className="fixed bottom-24 right-6 z-40 max-w-[320px] overflow-hidden rounded-[1.25rem] border border-[var(--border-strong)] bg-[rgba(11,18,32,0.98)] p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 panel-grid opacity-30" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[rgba(77,163,255,0.16)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-[rgba(24,199,184,0.1)] blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-[var(--text-primary)]">
            Install AdminHub Global
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Add the PWA to your device for quicker access to the command center,
            Partner Portal, Client Hub, project workflows, and support tools.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[rgba(6,10,18,0.72)] text-[var(--text-secondary)] transition hover:bg-[var(--brand-tint)] hover:text-[var(--text-primary)]"
          aria-label="Dismiss install prompt"
        >
          <X size={16} />
        </button>
      </div>

      <div className="relative mt-4">
        <button
          type="button"
          onClick={handleInstall}
          className="btn btn-primary w-full"
        >
          <Download size={18} />
          Install PWA
        </button>
      </div>

      <p className="relative mt-3 text-xs leading-5 text-[var(--text-muted)]">
        Offline-aware access may show saved content, but fresh messages, uploads,
        and Firebase updates still require internet.
      </p>
    </div>
  );
}