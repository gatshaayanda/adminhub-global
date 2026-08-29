"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Share2, X } from "lucide-react";
import styles from "./BoardSignalInstallPrompt.module.css";

const DISMISSED_KEY = "boardsignal:install:dismissed-at";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function isBoardSignalInstallSurface(pathname: string | null) {
  return Boolean(
    pathname === "/" ||
    pathname === "/feed" ||
    pathname?.startsWith("/boardsignal") ||
    pathname?.startsWith("/player/"),
  );
}

function isInstalledOrStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
}

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const navigator = window.navigator;
  const ua = navigator.userAgent;
  const iosDevice = /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua);
  return iosDevice && safari;
}

function dismissedRecently() {
  if (typeof window === "undefined") return false;
  try {
    const value = window.localStorage.getItem(DISMISSED_KEY);
    if (!value) return false;
    const at = Date.parse(value);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
  } catch {
    // Installation stays optional if local storage is unavailable.
  }
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const eligibleRoute = useMemo(() => isBoardSignalInstallSurface(pathname), [pathname]);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosManual, setIosManual] = useState(false);
  const [automaticVisible, setAutomaticVisible] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const refresh = useCallback(() => {
    if (!eligibleRoute || isInstalledOrStandalone()) {
      setInstalled(isInstalledOrStandalone());
      setAutomaticVisible(false);
      setManualOpen(false);
      return;
    }

    const ios = isIosSafari();
    setIosManual(ios);
    if ((deferredPrompt || ios) && !dismissedRecently()) setAutomaticVisible(true);
  }, [deferredPrompt, eligibleRoute]);

  useEffect(() => {
    setInstalled(isInstalledOrStandalone());
    setIosManual(isIosSafari());
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      if (!isBoardSignalInstallSurface(window.location.pathname) || isInstalledOrStandalone()) return;
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (!dismissedRecently()) setAutomaticVisible(true);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setAutomaticVisible(false);
      setManualOpen(false);
      try { window.localStorage.removeItem(DISMISSED_KEY); } catch {}
    };

    const media = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => {
      if (isInstalledOrStandalone()) onAppInstalled();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    media.addEventListener?.("change", onDisplayModeChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      media.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setDeferredPrompt(null);
    setAutomaticVisible(false);
    setManualOpen(false);
    if (choice.outcome === "dismissed") rememberDismissal();
  }, [deferredPrompt]);

  function dismissAutomatic() {
    rememberDismissal();
    setAutomaticVisible(false);
    setManualOpen(false);
  }

  if (!eligibleRoute || installed) return null;

  const programmaticAvailable = Boolean(deferredPrompt);
  const manualAvailable = iosManual;
  if (!programmaticAvailable && !manualAvailable) return null;

  const showCard = automaticVisible || manualOpen;
  if (!showCard) {
    return (
      <div className={`${styles.shell} ${styles.compact}`}>
        <button
          className={styles.compactButton}
          type="button"
          onClick={() => setManualOpen(true)}
          aria-label={manualAvailable ? "Add BoardSignal to your Home Screen" : "Install BoardSignal"}
        >
          {manualAvailable ? <Share2 size={18} aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
          {manualAvailable ? "ADD BOARDSIGNAL" : "INSTALL BOARDSIGNAL"}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <section className={styles.card} role="region" aria-label={manualAvailable ? "Add BoardSignal to your Home Screen" : "Install BoardSignal"}>
        <div className={styles.brandRow}>
          <div>
            <p className={styles.kicker}>BOARDSIGNAL ON YOUR DEVICE</p>
            <h2 className={styles.title}>
              {manualAvailable ? "ADD BOARDSIGNAL TO YOUR HOME SCREEN" : "KEEP BOARDSIGNAL WITHIN EASY REACH"}
            </h2>
            <p className={styles.copy}>
              {manualAvailable
                ? "BoardSignal is an app. Add it to your Home Screen for quick access to your Review, Progress, Universe and Inbox."
                : "Install BoardSignal for faster return access and your saved offline Player Room when available."}
            </p>
          </div>
          <button className={styles.closeButton} type="button" onClick={dismissAutomatic} aria-label="Not now">
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        {manualAvailable ? (
          <ol className={styles.instructions}>
            <li>Tap Share.</li>
            <li>Tap Add to Home Screen.</li>
          </ol>
        ) : null}

        <div className={styles.actions}>
          {programmaticAvailable ? (
            <button className={styles.primary} type="button" onClick={() => void install()}>
              <Download size={18} aria-hidden="true" />
              INSTALL BOARDSIGNAL
            </button>
          ) : (
            <button className={styles.primary} type="button" onClick={dismissAutomatic}>
              GOT IT
            </button>
          )}
          {programmaticAvailable ? (
            <button className={styles.secondary} type="button" onClick={dismissAutomatic}>
              NOT NOW
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
