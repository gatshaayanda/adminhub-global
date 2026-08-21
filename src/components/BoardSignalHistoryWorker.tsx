"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import UniversalPlayerDesk from "@/components/UniversalPlayerDesk";
import { buildLiveDeskRequestPath } from "@/lib/boardsignal/firstReviewGeneration.mjs";
import { historicalRequestAnchor, type HistoricalBackfillWork } from "@/lib/boardsignal/historyBackfill";
import type { BoardSignalDesk, DeskApiResponse, DeskEngineResult } from "@/lib/boardsignal/types";
import { auth } from "@/utils/firebaseConfig";

type ClaimResponse = { ok: boolean; username?: string; work?: HistoricalBackfillWork; error?: string };

export default function BoardSignalHistoryWorker() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [work, setWork] = useState<HistoricalBackfillWork | undefined>();
  const [processing, setProcessing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busyRef = useRef(false);

  const postState = useCallback(async (activeUser: User, activeWork: HistoricalBackfillWork, action: "noActivity" | "retryable" | "published", error?: string) => {
    const token = await activeUser.getIdToken();
    await fetch("/api/boardsignal/history-backfill", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, leaseId: activeWork.leaseId, periodStart: activeWork.periodStart, error }),
    });
  }, []);

  const advance = useCallback(async (activeUser: User) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const token = await activeUser.getIdToken();
      const response = await fetch("/api/boardsignal/history-backfill", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const body = await response.json() as ClaimResponse;
      if (!response.ok || !body.ok) return;
      setUsername(body.username ?? "");
      if (!body.work || !body.username) {
        setWork(undefined);
        timerRef.current = setTimeout(() => { busyRef.current = false; void advance(activeUser); }, 25_000);
        return;
      }

      const claimed = body.work;
      const requestAnchor = historicalRequestAnchor(claimed.requestCadenceAnchor, claimed.periodStart);
      const preview = await fetch(buildLiveDeskRequestPath(body.username, requestAnchor), { cache: "no-store" });
      const deskBody = await preview.json() as DeskApiResponse;
      if (!preview.ok || !deskBody.ok) {
        if (!deskBody.ok && (deskBody.code === "NO_ACTIVITY" || deskBody.error.startsWith("No games were played"))) {
          await postState(activeUser, claimed, "noActivity").catch(() => undefined);
          busyRef.current = false;
          void advance(activeUser);
          return;
        }
        await postState(activeUser, claimed, "retryable", !deskBody.ok ? deskBody.error : "Historical Review request failed.").catch(() => undefined);
        timerRef.current = setTimeout(() => { busyRef.current = false; void advance(activeUser); }, 60_000);
        return;
      }
      setWork(claimed);
      setProcessing(true);
      // UniversalPlayerDesk reuses the exact same deterministic Review and
      // on-device Stockfish path. The server archive cache makes this preflight
      // + engine mount a single archive acquisition in normal operation.
    } catch {
      timerRef.current = setTimeout(() => { busyRef.current = false; void advance(activeUser); }, 60_000);
      return;
    }
    busyRef.current = false;
  }, [postState]);

  useEffect(() => onAuthStateChanged(auth, (activeUser) => {
    setUser(activeUser);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (activeUser) void advance(activeUser);
    else { setWork(undefined); setUsername(""); setProcessing(false); busyRef.current = false; }
  }), [advance]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const saveFactual = useCallback(async (desk: BoardSignalDesk) => {
    if (!user || !work) return;
    const token = await user.getIdToken();
    const response = await fetch("/api/boardsignal/player-room", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveFactualReview", desk, reviewLifecycle: "historical_backfill", historyLeaseId: work.leaseId }),
    });
    const body = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !body.ok) throw new Error(body.error ?? "Recent Review history could not be saved yet.");
  }, [user, work]);

  const publishHistorical = useCallback(async (desk: BoardSignalDesk, engineResults: Record<string, DeskEngineResult>) => {
    if (!user || !work) return;
    const token = await user.getIdToken();
    const response = await fetch("/api/boardsignal/player-room", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publishDesk", desk, engineResults, reviewLifecycle: "historical_backfill", historyLeaseId: work.leaseId }),
    });
    const body = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !body.ok) throw new Error(body.error ?? "Recent Review history could not be saved yet.");
    await postState(user, work, "published").catch(() => undefined);
    setWork(undefined);
    setProcessing(false);
    window.dispatchEvent(new CustomEvent("boardsignal:history-updated"));
    timerRef.current = setTimeout(() => { busyRef.current = false; void advance(user); }, 900);
  }, [advance, postState, user, work]);

  if (!user || !work || !username) return null;
  const requestAnchor = historicalRequestAnchor(work.requestCadenceAnchor, work.periodStart);
  return <>
    <div className="container founding-field-note" role="status" aria-live="polite">
      <div><strong>Building your recent BoardSignal history…</strong><p>{processing ? "Your saved Player Room stays available while one earlier Review is checked." : "Preparing recent Review context."}</p></div>
    </div>
    <div hidden aria-hidden="true">
      <UniversalPlayerDesk
        key={`${work.periodStart}:${work.leaseId}`}
        requestedUsername={username}
        ownerToken={undefined}
        cadenceAnchor={requestAnchor}
        onFactualReviewReady={saveFactual}
        onDeskPublished={publishHistorical}
      />
    </div>
  </>;
}
