"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ServiceWorkerRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let disposed = false;
    let reloadedForController = false;

    const warmGglSpace = (worker?: ServiceWorker | null) => {
      if (pathname !== "/ggltournaments/game") return;
      const target = worker || navigator.serviceWorker.controller;
      target?.postMessage({ type: "CACHE_GGL_SPACE" });
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // Check for a newer worker on every online app launch. The worker uses
        // a versioned cache and skipWaiting/clients.claim to replace stale assets.
        if (navigator.onLine) await registration.update().catch(() => undefined);
        if (disposed) return;

        const ready = await navigator.serviceWorker.ready;
        warmGglSpace(ready.active);
        if (pathname === "/ggltournaments/game") {
          // The route may finish hydrating after the initial install fetch.
          // Ask the active worker to re-fetch its HTML and all referenced bundles.
          window.setTimeout(() => warmGglSpace(ready.active), 1200);
        }

        console.info("Admin Hub service worker ready:", ready.scope);
      } catch (error) {
        console.warn("Admin Hub service worker registration failed:", error);
      }
    };

    const onControllerChange = () => {
      // Reload once when a newly installed worker takes control so the page
      // and its chunks are served from one consistent cache generation.
      if (reloadedForController || !navigator.serviceWorker.controller) return;
      reloadedForController = true;
      window.location.reload();
    };
    const onOnline = () => {
      if (pathname === "/ggltournaments/game") {
        void navigator.serviceWorker.ready.then((ready) => warmGglSpace(ready.active));
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    window.addEventListener("online", onOnline);

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      disposed = true;
      window.removeEventListener("load", register);
      window.removeEventListener("online", onOnline);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [pathname]);

  return null;
}
