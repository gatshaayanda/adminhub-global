"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";
import {
  PWA_DISMISSED_KEY,
  PWA_ENGAGED_EVENT,
  PWA_ENGAGED_KEY,
  PWA_INSTALL_REQUEST_EVENT,
  installDismissedRecently,
  isIosInstallCandidate,
  isStandaloneBoardSignal,
} from "@/lib/boardsignal/offline/install";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosCandidate, setIosCandidate] = useState(false);
  const [ready, setReady] = useState(false);

  const refreshEligibility = useCallback(() => {
    const standalone = isStandaloneBoardSignal();
    setInstalled(standalone);
    setIosCandidate(isIosInstallCandidate());
    if (standalone) { setReady(false); return; }
    const engaged = Boolean(window.localStorage.getItem(PWA_ENGAGED_KEY));
    const eligiblePath = pathname.startsWith("/boardsignal/player-room");
    setReady(engaged && eligiblePath && !installDismissedRecently());
  }, [pathname]);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      refreshEligibility();
    };
    const onAppInstalled = () => { setInstalled(true); setDeferredPrompt(null); setReady(false); };
    const onEngaged = () => refreshEligibility();
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener(PWA_ENGAGED_EVENT, onEngaged);
    refreshEligibility();
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener(PWA_ENGAGED_EVENT, onEngaged);
    };
  }, [refreshEligibility]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") { setDeferredPrompt(null); setReady(false); }
    return choice.outcome === "accepted";
  }, [deferredPrompt]);

  useEffect(() => {
    const manual = () => { void handleInstall(); };
    window.addEventListener(PWA_INSTALL_REQUEST_EVENT, manual);
    return () => window.removeEventListener(PWA_INSTALL_REQUEST_EVENT, manual);
  }, [handleInstall]);

  function dismiss() {
    window.localStorage.setItem(PWA_DISMISSED_KEY, new Date().toISOString());
    setReady(false);
  }

  if (installed || !ready || (!deferredPrompt && !iosCandidate)) return null;

  return <div className={`install-card bs-surface-paper ${iosCandidate ? "is-ios-install" : ""}`} role="region" aria-label="Install BoardSignal">
    <div className="install-card-heading">
      <div>
        <strong>Keep BoardSignal on your device</strong>
        <p>{iosCandidate ? "BoardSignal installs from this website on iPhone and iPad." : "Install BoardSignal from this website for quicker access to your Player Room and saved Review."}</p>
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss install prompt"><X size={16}/></button>
    </div>
    {iosCandidate ? <>
      <ol className="ios-install-steps">
        <li>Tap the Share button in Safari.</li>
        <li>Choose <strong>Add to Home Screen</strong>.</li>
        <li>Confirm <strong>BoardSignal</strong>.</li>
      </ol>
      <p className="install-store-clarifier">You do not need the App Store or Play Store.</p>
    </> : <>
      <button type="button" onClick={() => void handleInstall()} className="button button-dark install-card-action"><Download size={18}/> Install BoardSignal</button>
      <p className="install-store-clarifier">BoardSignal installs directly from this website. No app store is required.</p>
    </>}
  </div>;
}
