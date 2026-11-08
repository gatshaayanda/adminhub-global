"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ServiceWorkerRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let disposed = false;
    let reloadedForController = false;
    let warmTimers: number[] = [];
    let observer: PerformanceObserver | undefined;
    let flushTimer: number | undefined;
    const observedAssets = new Set<string>();

    // Resource Timing defaults are small on some mobile browsers. Increase the
    // buffer before the 3D scene and its lazy-loaded chunks finish downloading.
    performance.setResourceTimingBufferSize?.(2000);

    const isCacheableAsset = (pathname: string) =>
      pathname.startsWith("/_next/") ||
      /\.(?:css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|webmanifest|woff2?|ttf|otf|wasm|mp4|webm|mp3|ogg|wav)$/i.test(pathname);

    const addAsset = (candidate: string) => {
      try {
        const url = new URL(candidate, window.location.href);
        if (url.origin === window.location.origin && isCacheableAsset(url.pathname)) observedAssets.add(url.href);
      } catch {
        // Ignore browser extension and malformed resource timing entries.
      }
    };

    const collectLoadedAssets = () => {
      for (const entry of performance.getEntriesByType("resource")) addAsset(entry.name);
      document.querySelectorAll<HTMLScriptElement | HTMLLinkElement | HTMLImageElement | HTMLSourceElement>(
        "script[src],link[href],img[src],source[src]"
      ).forEach((element) => {
        const candidate = "src" in element ? element.src : element.href;
        if (candidate) addAsset(candidate);
      });
      return [...observedAssets].slice(-1200);
    };

    const warmGglSpace = (worker?: ServiceWorker | null) => {
      if (pathname !== "/ggltournaments/game" || disposed) return;
      const target = worker || navigator.serviceWorker.controller;
      if (!target) return;
      target.postMessage({ type: "CACHE_GGL_SPACE", assets: collectLoadedAssets() });
    };

    const scheduleWarmups = (worker?: ServiceWorker | null) => {
      if (pathname !== "/ggltournaments/game") return;
      warmTimers.forEach((timer) => window.clearTimeout(timer));
      warmTimers = [2500, 8000, 18000, 35000].map((delay) =>
        window.setTimeout(() => warmGglSpace(worker), delay)
      );
    };

    const onCacheStatus = (event: MessageEvent) => {
      if (event.data?.type !== "GGL_SPACE_CACHE_STATUS") return;
      if (event.data.ready) {
        console.info("GGL Space offline cache verified:", event.data.version, event.data.cachedAssets, "assets");
      } else {
        console.warn("GGL Space offline cache incomplete:", event.data.failedCriticalAssets || []);
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
        scheduleWarmups(ready.active);
      });
    };

    const onResource = (entries: PerformanceEntry[]) => {
      entries.forEach((entry) => addAsset(entry.name));
      if (pathname !== "/ggltournaments/game" || disposed) return;
      if (flushTimer !== undefined) window.clearTimeout(flushTimer);
      flushTimer = window.setTimeout(() => {
        void navigator.serviceWorker.ready.then((ready) => warmGglSpace(ready.active));
      }, 1800);
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
          try { await navigator.storage?.persist?.(); } catch { /* Browser may decline persistent storage. */ }
          collectLoadedAssets();
          warmGglSpace(ready.active);
          scheduleWarmups(ready.active);
          if ("PerformanceObserver" in window) {
            observer = new PerformanceObserver((list) => onResource(list.getEntries()));
            observer.observe({ type: "resource", buffered: true });
          }
        }
        console.info("Admin Hub service worker ready:", ready.scope);
      } catch (error) {
        console.warn("Admin Hub service worker registration failed:", error);
      }
    };

    navigator.serviceWorker.addEventListener("message", onCacheStatus);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    window.addEventListener("online", onOnline);

    if (document.readyState === "complete") void register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      disposed = true;
      warmTimers.forEach((timer) => window.clearTimeout(timer));
      if (flushTimer !== undefined) window.clearTimeout(flushTimer);
      observer?.disconnect();
      window.removeEventListener("load", register);
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker.removeEventListener("message", onCacheStatus);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [pathname]);

  return null;
}
