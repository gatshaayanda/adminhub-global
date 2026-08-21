"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import UniversalPlayerDesk from "@/components/UniversalPlayerDesk";
import { buildLiveDeskRequestPath } from "@/lib/boardsignal/firstReviewGeneration.mjs";
import { historicalRequestAnchor, type HistoricalBackfillWork } from "@/lib/boardsignal/historyBackfill";
import type { BoardSignalDesk, DeskApiResponse, DeskEngineResult } from "@/lib/boardsignal/types";
import { auth } from "@/utils/firebaseConfig";

type ClaimResponse = { ok: boolean; username?: string; work?: HistoricalBackfillWork; error?: string };
type StateResponse = { ok?: boolean; error?: string };

export default function BoardSignalHistoryWorker() {
  const [user, setUser] = useState<User | null>(null);
  const [ownerToken, setOwnerToken] = useState("");
  const [username, setUsername] = useState("");
  const [work, setWork] = useState<HistoricalBackfillWork | undefined>();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busyRef = useRef(false);

  const postState = useCallback(async (
    activeUser: User,
    activeWork: HistoricalBackfillWork,
    action: "noActivity" | "retryable" | "published",
    error?: string,
  ) => {
    const token = await activeUser.getIdToken();
    const response = await fetch("/api/boardsignal/history-backfill", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, leaseId: activeWork.leaseId, periodStart: activeWork.periodStart, error }),
    });
    const body = await response.json() as StateResponse;
    if (!response.ok || !body.ok) throw new Error(body.error ?? "Recent Review history could not be updated.");
  }, []);

  const advance = useCallback(async (activeUser: User) => {
    if (busyRef.current || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    busyRef.current = true;
    try {
      const token = await activeUser.getIdToken();
      setOwnerToken(token);
      const response = await fetch("/api/boardsignal/history-backfill", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = await response.json() as ClaimResponse;
      if (!response.ok || !body.ok) return;
      setUsername(body.username ?? "");
      if (!body.work || !body.username) {
        setWork(undefined);
        return;
      }

      const claimed = body.work;
      const requestAnchor = historicalRequestAnchor(claimed.requestCadenceAnchor, claimed.periodStart);
      let preview: Response;
      let deskBody: DeskApiResponse;
      try {
        preview = await fetch(buildLiveDeskRequestPath(body.username, requestAnchor), { cache: "no-store" });
        deskBody = await preview.json() as DeskApiResponse;
      } catch (error) {
        await postState(activeUser, claimed, "retryable", error instanceof Error ? error.message : "Historical Review request failed.").catch(() => undefined);
        return;
      }

      if (!preview.ok || !deskBody.ok) {
        if (!deskBody.ok && (deskBody.code === "NO_ACTIVITY" || deskBody.error.startsWith("No games were played"))) {
          await postState(activeUser, claimed, "noActivity").catch(() => undefined);
          busyRef.current = false;
          void advance(activeUser);
          return;
        }
        await postState(activeUser, claimed, "retryable", !deskBody.ok ? deskBody.error : "Historical Review request failed.").catch(() => undefined);
        return;
      }

      setWork(claimed);
      // The hidden embedded Desk reuses the existing deterministic Review and
      // on-device Stockfish path. Player Room remains fully available above it.
    } finally {
      busyRef.current = false;
    }
  }, [postState]);

  useEffect(() => onAuthStateChanged(auth, (activeUser) => {
    setUser(activeUser);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (activeUser) void advance(activeUser);
    else {
      setWork(undefined);
      setUsername("");
      setOwnerToken("");
      busyRef.current = false;
    }
  }), [advance]);

  useEffect(() => {
    const handleOnline = () => { if (user) void advance(user); };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [advance, user]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const saveFactual = useCallback(async (desk: BoardSignalDesk) => {
    if (!user || !work) return;
    const token = await user.getIdToken();
    const response = await fetch("/api/boardsignal/player-room", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveFactualReview", desk, reviewLifecycle: "historical_backfill", historyLeaseId: work.leaseId }),
    });
    const body = await response.json() as StateResponse;
    if (!response.ok || !body.ok) throw new Error(body.error ?? "Recent Review history could not be saved yet.");
  }, [user, work]);

  const publishHistorical = useCallback(async (desk: BoardSignalDesk, engineResults: Record<string, DeskEngineResult>) => {
    if (!user || !work) return;
    const activeWork = work;
    const token = await user.getIdToken();
    const response = await fetch("/api/boardsignal/player-room", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publishDesk", desk, engineResults, reviewLifecycle: "historical_backfill", historyLeaseId: activeWork.leaseId }),
    });
    const body = await response.json() as StateResponse;
    if (!response.ok || !body.ok) throw new Error(body.error ?? "Recent Review history could not be saved yet.");
    await postState(user, activeWork, "published");
    setWork(undefined);
    timerRef.current = setTimeout(() => void advance(user), 900);
  }, [advance, postState, user, work]);

  if (!user || !work || !username || !ownerToken) return null;
  const requestAnchor = historicalRequestAnchor(work.requestCadenceAnchor, work.periodStart);
  return (
    <div hidden aria-hidden="true">
      <UniversalPlayerDesk
        key={`${work.periodStart}:${work.leaseId}`}
        requestedUsername={username}
        ownerToken={ownerToken}
        cadenceAnchor={requestAnchor}
        onFactualReviewReady={saveFactual}
        onDeskPublished={publishHistorical}
        embedded
      />
    </div>
  );
}
