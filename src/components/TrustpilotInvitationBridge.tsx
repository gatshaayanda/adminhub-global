"use client";

import { useCallback, useEffect, useRef } from "react";
import type { User } from "firebase/auth";
import { auth } from "@/utils/firebaseConfig";

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

type LocalBlock = "queued" | "excluded" | "retry" | null;

function storageKey(uid: string) {
  return `${STORAGE_PREFIX}${uid}`;
}

function localBlock(uid: string): LocalBlock {
  try {
    const stored = window.localStorage.getItem(storageKey(uid));
    if (!stored) return null;
    if (stored === "queued") return "queued";
    if (stored === "excluded") return "excluded";
    if (stored.startsWith("retry:")) {
      const retryAt = Number(stored.slice(6));
      if (Number.isFinite(retryAt) && retryAt > Date.now()) return "retry";
      window.localStorage.removeItem(storageKey(uid));
    }
  } catch {
    // Local storage is only duplicate-suppression convenience. Server state is authoritative.
  }
  return null;
}

function remember(uid: string, value: string) {
  try { window.localStorage.setItem(storageKey(uid), value); }
  catch { /* The server reservation still prevents cross-device duplicates. */ }
}

function notify(name: "boardsignal:trustpilot-queued" | "boardsignal:trustpilot-unavailable", detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export default function TrustpilotInvitationBridge() {
  const runningRef = useRef(false);

  const attempt = useCallback(async (activeUser: User) => {
    if (runningRef.current) return;
    const blocked = localBlock(activeUser.uid);
    if (blocked === "queued") {
      notify("boardsignal:trustpilot-queued", { status: "already_queued" });
      return;
    }
    if (blocked === "excluded" || blocked === "retry") {
      notify("boardsignal:trustpilot-unavailable", { status: blocked });
      return;
    }

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
      if (!response.ok || !body.ok) {
        notify("boardsignal:trustpilot-unavailable", { status: "request_failed" });
        return;
      }

      if (body.status === "already_queued") {
        remember(activeUser.uid, "queued");
        notify("boardsignal:trustpilot-queued", { status: body.status });
        return;
      }
      if (body.status === "excluded") {
        remember(activeUser.uid, "excluded");
        notify("boardsignal:trustpilot-unavailable", { status: body.status });
        return;
      }
      if (body.status === "monthly_limit" || body.status === "already_reserved") {
        const retryAt = body.retryAfter ? Date.parse(body.retryAfter) : Date.now() + SHORT_RETRY_MS;
        remember(activeUser.uid, `retry:${Number.isFinite(retryAt) ? retryAt : Date.now() + SHORT_RETRY_MS}`);
        notify("boardsignal:trustpilot-unavailable", { status: body.status });
        return;
      }
      if (body.status === "no_email") {
        remember(activeUser.uid, `retry:${Date.now() + SHORT_RETRY_MS}`);
        notify("boardsignal:trustpilot-unavailable", { status: body.status });
        return;
      }
      if (body.status !== "ready" || !body.payload) {
        notify("boardsignal:trustpilot-unavailable", { status: body.status ?? "not_ready" });
        return;
      }

      if (typeof window.tp !== "function") {
        remember(activeUser.uid, `retry:${Date.now() + 60 * 60 * 1000}`);
        notify("boardsignal:trustpilot-unavailable", { status: "script_unavailable" });
        return;
      }

      window.tp("createInvitation", body.payload);
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
      notify("boardsignal:trustpilot-queued", { status: "ready" });
    } finally {
      runningRef.current = false;
    }
  }, []);

  useEffect(() => {
    const requested = () => {
      const activeUser = auth.currentUser;
      if (!activeUser) {
        notify("boardsignal:trustpilot-unavailable", { status: "signed_out" });
        return;
      }
      void attempt(activeUser);
    };
    window.addEventListener("boardsignal:trustpilot-request", requested);
    return () => window.removeEventListener("boardsignal:trustpilot-request", requested);
  }, [attempt]);

  return null;
}
