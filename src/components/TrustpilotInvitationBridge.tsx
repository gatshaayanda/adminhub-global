"use client";

import { useCallback, useEffect, useRef } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/utils/firebaseConfig";
import { loadPlayerRoomOfflineSnapshot } from "@/lib/boardsignal/offline/snapshots";

declare global {
  interface Window {
    tp?: (...args: unknown[]) => void;
  }
}

type InvitationPayload = {
  recipientEmail: string;
  recipientName: string;
  referenceId: string;
  source: "InvitationScript";
};

type PrepareResponse = {
  ok?: boolean;
  status?: "ready" | "already_queued" | "already_reserved" | "monthly_limit" | "not_eligible" | "no_email" | "excluded";
  retryAfter?: string;
  payload?: InvitationPayload;
};

const STORAGE_PREFIX = "boardsignal:trustpilot-invitation:";
const SHORT_RETRY_MS = 24 * 60 * 60 * 1000;

function storageKey(uid: string) {
  return `${STORAGE_PREFIX}${uid}`;
}

function blockedLocally(uid: string) {
  try {
    const stored = window.localStorage.getItem(storageKey(uid));
    if (!stored) return false;
    if (stored === "queued" || stored === "excluded") return true;
    if (stored.startsWith("retry:")) {
      const retryAt = Number(stored.slice(6));
      if (Number.isFinite(retryAt) && retryAt > Date.now()) return true;
      window.localStorage.removeItem(storageKey(uid));
    }
  } catch {
    // Local storage is only a duplicate-suppression convenience. Server state is authoritative.
  }
  return false;
}

function remember(uid: string, value: string) {
  try { window.localStorage.setItem(storageKey(uid), value); }
  catch { /* The server reservation still prevents cross-device duplicates. */ }
}

export default function TrustpilotInvitationBridge() {
  const activeUserRef = useRef<User | null>(null);
  const runningRef = useRef(false);

  const attempt = useCallback(async (activeUser: User) => {
    if (runningRef.current || blockedLocally(activeUser.uid)) return;

    // Use the existing UID-scoped PWA snapshot as the zero-Firestore eligibility gate.
    // Users without a completed Review never call the Trustpilot API route.
    const saved = await loadPlayerRoomOfflineSnapshot(activeUser.uid).catch(() => undefined);
    if (!saved?.desks?.length) return;

    runningRef.current = true;
    try {
      const token = await activeUser.getIdToken();
      const response = await fetch("/api/boardsignal/trustpilot-invitation", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ action: "prepare" }),
      });
      const body = await response.json().catch(() => ({})) as PrepareResponse;
      if (!response.ok || !body.ok) return;

      if (body.status === "already_queued") {
        remember(activeUser.uid, "queued");
        return;
      }
      if (body.status === "excluded") {
        remember(activeUser.uid, "excluded");
        return;
      }
      if (body.status === "monthly_limit" || body.status === "already_reserved") {
        const retryAt = body.retryAfter ? Date.parse(body.retryAfter) : Date.now() + SHORT_RETRY_MS;
        remember(activeUser.uid, `retry:${Number.isFinite(retryAt) ? retryAt : Date.now() + SHORT_RETRY_MS}`);
        return;
      }
      if (body.status === "no_email") {
        remember(activeUser.uid, `retry:${Date.now() + SHORT_RETRY_MS}`);
        return;
      }
      if (body.status !== "ready" || !body.payload) return;

      // The Trustpilot bootstrap defines tp synchronously and queues calls while its
      // external script loads. If a blocker removes it entirely, do not mark success.
      if (typeof window.tp !== "function") {
        remember(activeUser.uid, `retry:${Date.now() + 60 * 60 * 1000}`);
        return;
      }

      window.tp("createInvitation", body.payload);
      // Suppress same-device duplicates immediately; the server-side reservation is
      // the durable cross-device guard. Confirmation records that the client call ran.
      remember(activeUser.uid, "queued");
      await fetch("/api/boardsignal/trustpilot-invitation", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ action: "confirm" }),
      }).catch(() => undefined);
    } finally {
      runningRef.current = false;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (activeUser) => {
      activeUserRef.current = activeUser;
      if (activeUser) void attempt(activeUser);
    });

    const onSnapshotSaved = () => {
      const activeUser = activeUserRef.current;
      if (activeUser) void attempt(activeUser);
    };
    window.addEventListener("boardsignal:offline-saved", onSnapshotSaved);
    return () => {
      unsubscribe();
      window.removeEventListener("boardsignal:offline-saved", onSnapshotSaved);
    };
  }, [attempt]);

  return null;
}
