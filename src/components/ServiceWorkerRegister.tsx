"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ServiceWorkerRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let disposed = false;
    let reloadedForController = false;
    let warmTimer: number | undefined;

    const collectLoadedAssets = () => {
      const urls = new Set<string>();
      for (const entry of performance.getEntriesByType("resource")) {
        try {
          const url = new URL(entry.name, window.location.href);
          if (url.origin !== window.location.origin) continue;
          if (
            url.pathname.startsWith("/_next/") ||
            /\.(?:css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|webmanifest|woff2?|ttf|otf|wasm)$/i.test(url.pathname)
          ) urls.add(url.href);
        } catch {
          // Ignore browser extension and malformed resource timing entries.
        }
      }
      return [...urls].slice(-300);
    };

    const warmGglSpace = (worker?: ServiceWorker | null) => {
      if (pathname !== "/ggltournaments/game") return;
      const target = worker || navigator.serviceWorker.controller;
      if (!target) return;
      target.postMessage({ type: "CACHE_GGL_SPACE", assets: collectLoadedAssets() });
    };

    const scheduleWarmup = (worker?: ServiceWorker | null) => {
      if (pathname !== "/ggltournaments/game") return;
      if (warmTimer !== undefined) window.clearTimeout(warmTimer);
      // Let the game scene finish loading lazy chunks and textures before
      // reporting the complete set of resources to the service worker.
      warmTimer = window.setTimeout(() => warmGglSpace(worker), 2200);
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        if (navigator.onLine) await registration.update().catch(() => undefined);
        if (disposed) return;

        const ready = await navigator.serviceWorker.ready;
        if (pathname === "/ggltournaments/game") {
          warmGglSpace(ready.active);
          scheduleWarmup(ready.active);
        }

        console.info("Admin Hub service worker ready:", ready.scope);
      } catch (error) {
        console.warn("Admin Hub service worker registration failed:", error);
      }
    };

    const onControllerChange = () => {
      if (reloadedForController || !navigator.serviceWorker.controller) return;
      reloadedForController = true;
      window.location.reload();
    };
    const onOnline = () => {
      if (pathname !== "/ggltournaments/game") return;
      void navigator.serviceWorker.ready.then((ready) => {
        warmGglSpace(ready.active);
        scheduleWarmup(ready.active);
      });
    };
    const onLoad = () => {
      if (pathname === "/ggltournaments/game") {
        void navigator.serviceWorker.ready.then((ready) => scheduleWarmup(ready.active));
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("load", onLoad, { once: true });

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      disposed = true;
      if (warmTimer !== undefined) window.clearTimeout(warmTimer);
      window.removeEventListener("load", register);
      window.removeEventListener("load", onLoad);
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [pathname]);

  return null;
}
