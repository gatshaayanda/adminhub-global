"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

export default function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const reloadForUpdateRef = useRef(false);
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;

    const inspectWaiting = () => {
      if (active && registration?.waiting) setWaiting(registration.waiting);
    };

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        inspectWaiting();
        registration.addEventListener("updatefound", () => {
          const worker = registration?.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller && active) setWaiting(worker);
          });
        });
      } catch (error) {
        console.warn("BoardSignal service worker registration failed:", error);
      }
    };

    const controllerChanged = () => {
      if (!reloadForUpdateRef.current || reloadedRef.current) return;
      reloadedRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", controllerChanged);

    if (document.readyState === "complete") void register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      active = false;
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChanged);
    };
  }, []);

  function refreshToUpdate() {
    if (!waiting) return;
    reloadForUpdateRef.current = true;
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  return waiting ? <div className="bs-update-ready" role="status">
    <div><strong>BoardSignal update ready</strong><span>Refresh when you're ready. Your current session will not reload by itself.</span></div>
    <button type="button" onClick={refreshToUpdate}><RefreshCw size={15}/> Refresh</button>
  </div> : null;
}
