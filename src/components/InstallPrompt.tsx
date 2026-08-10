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
    <div className="fixed bottom-24 right-6 z-40 max-w-[320px] rounded-[1.25rem] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-lg)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-[var(--text-primary)]">
            Install Sparkle Legacy
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Add the app to your phone for quicker access to quotes, claims, and support.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
          aria-label="Dismiss install prompt"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4">
        <button type="button" onClick={handleInstall} className="btn btn-primary w-full">
          <Download size={18} />
          Install App
        </button>
      </div>
    </div>
  );
}