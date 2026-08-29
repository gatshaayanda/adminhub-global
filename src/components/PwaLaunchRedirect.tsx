"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { usePathname } from "next/navigation";
import { auth } from "@/utils/firebaseConfig";
import { isStandaloneBoardSignal } from "@/lib/boardsignal/offline/install";

export default function PwaLaunchRedirect() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/boardsignal" || new URLSearchParams(window.location.search).get("source") !== "pwa" || !isStandaloneBoardSignal()) return;
    return onAuthStateChanged(auth, () => {
      // Installed BoardSignal opens the actual app entry. Signed-in players
      // continue into their room; signed-out players see the Google-first gate.
      // A full navigation is intentional so offline service-worker fallback can
      // still substitute the saved Player Room when available.
      window.location.replace("/boardsignal/player-room");
    });
  }, [pathname]);
  return null;
}
