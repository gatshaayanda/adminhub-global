"use client";

import { useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/utils/firebaseConfig";

const VISIBLE_DWELL_MS = 4_000;

export default function PlayerRoomReviewEngagement() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab && requestedTab !== "desk") return;

    let activeUser: User | null = null;
    let timer: ReturnType<typeof window.setTimeout> | undefined;

    const ping = (user: User) => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (document.visibilityState !== "visible") return;
        try {
          const token = await user.getIdToken();
          await fetch("/api/boardsignal/review-engagement", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
        } catch {
          // Engagement telemetry must never interrupt Player Room use.
        }
      }, VISIBLE_DWELL_MS);
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      activeUser = user;
      if (user) ping(user);
    });
    const onHistoryUpdated = () => { if (activeUser) ping(activeUser); };
    window.addEventListener("boardsignal:history-updated", onHistoryUpdated);

    return () => {
      unsubscribe();
      window.removeEventListener("boardsignal:history-updated", onHistoryUpdated);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return null;
}
