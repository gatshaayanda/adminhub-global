"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { BoardSignalTrustpilotResolution } from "@/lib/boardsignal/account";
import { auth } from "@/utils/firebaseConfig";

type EngagementView = {
  status: "recorded" | "duplicate";
  roomVisitCount: number;
  prompt: "first" | "final" | null;
  invitationConfirmed: boolean;
  cycleComplete: boolean;
};

type EngagementResponse = {
  ok?: boolean;
  engagement?: EngagementView;
};

type ResolveResponse = {
  ok?: boolean;
  trustpilot?: {
    status?: "resolved" | "already_resolved";
    resolution?: BoardSignalTrustpilotResolution;
    invitationConfirmed?: boolean;
  };
  error?: string;
};

type ActiveSession = {
  uid: string;
  sessionId: string;
  token: string;
};

const SESSION_STORAGE_PREFIX = "boardsignal:m3-player-room-session:";

function freshSessionId() {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `m3:${random}`;
}

function playerRoomSessionId(uid: string) {
  if (typeof window === "undefined") return freshSessionId();
  const key = `${SESSION_STORAGE_PREFIX}${uid}`;
  try {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const existing = window.sessionStorage.getItem(key);
    if (navigation?.type === "reload" && existing) return existing;
    const sessionId = freshSessionId();
    window.sessionStorage.setItem(key, sessionId);
    return sessionId;
  } catch {
    return freshSessionId();
  }
}

function requestTrustpilotInvitation() {
  window.dispatchEvent(new CustomEvent("boardsignal:trustpilot-request"));
}

export default function PlayerRoomEngagementBridge() {
  const [engagement, setEngagement] = useState<EngagementView>();
  const [activeSession, setActiveSession] = useState<ActiveSession>();
  const [activeTab, setActiveTab] = useState("desk");
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [busy, setBusy] = useState(false);
  const [trustpilotMessage, setTrustpilotMessage] = useState("");
  const [settledMessage, setSettledMessage] = useState("");
  const recordingRef = useRef(false);
  const sessionUidRef = useRef<string>();
  const sessionIdRef = useRef<string>();
  const recordedSessionRef = useRef<string>();

  const resetSession = useCallback((uid?: string) => {
    sessionUidRef.current = uid;
    sessionIdRef.current = undefined;
    recordedSessionRef.current = undefined;
    recordingRef.current = false;
    setEngagement(undefined);
    setActiveSession(undefined);
    setTrustpilotMessage("");
    setSettledMessage("");
  }, []);

  const recordEntry = useCallback(async () => {
    if (recordingRef.current || typeof document === "undefined") return;
    if (!document.querySelector(".player-room-authenticated")) return;
    const activeUser = auth.currentUser;
    if (!activeUser) return;

    if (sessionUidRef.current && sessionUidRef.current !== activeUser.uid) resetSession(activeUser.uid);
    sessionUidRef.current = activeUser.uid;
    const sessionId = sessionIdRef.current ?? playerRoomSessionId(activeUser.uid);
    sessionIdRef.current = sessionId;
    if (recordedSessionRef.current === sessionId) return;

    recordingRef.current = true;
    try {
      const token = await activeUser.getIdToken();
      const response = await fetch("/api/boardsignal/player-room-engagement", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "enter", sessionId }),
      });
      const body = await response.json().catch(() => ({})) as EngagementResponse;
      if (!response.ok || !body.ok || !body.engagement) return;
      recordedSessionRef.current = sessionId;
      setEngagement(body.engagement);
      setActiveSession({ uid: activeUser.uid, sessionId, token });
    } catch {
      // Engagement is best-effort and must never block or replace Player Room content.
    } finally {
      recordingRef.current = false;
    }
  }, [resetSession]);

  useEffect(() => onAuthStateChanged(auth, (activeUser) => {
    if (!activeUser) {
      resetSession();
      return;
    }
    if (sessionUidRef.current && sessionUidRef.current !== activeUser.uid) resetSession(activeUser.uid);
  }), [resetSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const maybeRecord = () => window.requestAnimationFrame(() => { void recordEntry(); });
    const onContext = (event: Event) => {
      const tab = (event as CustomEvent<{ activeTab?: string }>).detail?.activeTab;
      if (tab) setActiveTab(tab);
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("boardsignal:offline-saved", maybeRecord);
    window.addEventListener("boardsignal:context", onContext);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    maybeRecord();
    return () => {
      window.removeEventListener("boardsignal:offline-saved", maybeRecord);
      window.removeEventListener("boardsignal:context", onContext);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [recordEntry]);

  useEffect(() => {
    if (!activeSession || typeof window === "undefined" || typeof document === "undefined") return;
    let visibleStartedAt = document.visibilityState === "visible" ? Date.now() : undefined;
    let foregroundMs = 0;
    let sent = false;

    const accumulateVisibleTime = () => {
      if (visibleStartedAt === undefined) return;
      foregroundMs += Math.max(0, Date.now() - visibleStartedAt);
      visibleStartedAt = undefined;
    };

    const sendSummary = () => {
      if (sent) return;
      accumulateVisibleTime();
      sent = true;
      const foregroundEngagedSeconds = Math.max(0, Math.round(foregroundMs / 1000));
      void fetch("/api/boardsignal/player-room-engagement", {
        method: "POST",
        headers: { Authorization: `Bearer ${activeSession.token}`, "Content-Type": "application/json" },
        cache: "no-store",
        keepalive: true,
        body: JSON.stringify({ action: "summary", sessionId: activeSession.sessionId, foregroundEngagedSeconds }),
      }).catch(() => undefined);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendSummary();
        return;
      }
      if (!sent && visibleStartedAt === undefined) visibleStartedAt = Date.now();
    };
    const onPageHide = () => sendSummary();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      sendSummary();
    };
  }, [activeSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const queued = () => {
      setEngagement((current) => current ? { ...current, invitationConfirmed: true } : current);
      setTrustpilotMessage("Thanks — your Trustpilot invitation has been sent.");
    };
    const unavailable = () => {
      setTrustpilotMessage("Trustpilot could not start right now. Your Player Room still works normally.");
    };
    window.addEventListener("boardsignal:trustpilot-queued", queued);
    window.addEventListener("boardsignal:trustpilot-unavailable", unavailable);
    return () => {
      window.removeEventListener("boardsignal:trustpilot-queued", queued);
      window.removeEventListener("boardsignal:trustpilot-unavailable", unavailable);
    };
  }, []);

  async function resolveFinal(resolution: BoardSignalTrustpilotResolution) {
    if (!engagement || engagement.prompt !== "final" || busy || !online) return;
    setBusy(true);
    setTrustpilotMessage("");
    try {
      if (resolution === "not_yet" && !engagement.invitationConfirmed) requestTrustpilotInvitation();
      const activeUser = auth.currentUser;
      if (!activeUser) return;
      const token = await activeUser.getIdToken();
      const response = await fetch("/api/boardsignal/player-room-engagement", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "resolve", resolution }),
      });
      const body = await response.json().catch(() => ({})) as ResolveResponse;
      if (!response.ok || !body.ok || !body.trustpilot) throw new Error(body.error ?? "BoardSignal could not save that choice.");
      setEngagement((current) => current ? {
        ...current,
        prompt: null,
        cycleComplete: true,
        invitationConfirmed: body.trustpilot?.invitationConfirmed ?? current.invitationConfirmed,
      } : current);
      setSettledMessage(
        resolution === "reviewed"
          ? "Thank you — BoardSignal won't ask again."
          : resolution === "declined"
            ? "No problem — BoardSignal won't ask again."
            : "No problem — this was the final reminder.",
      );
    } catch (error) {
      setTrustpilotMessage(error instanceof Error ? error.message : "BoardSignal could not save that choice.");
    } finally {
      setBusy(false);
    }
  }

  if (activeTab !== "desk" || (!engagement?.prompt && !settledMessage)) return null;

  if (settledMessage) {
    return <div className="container player-room-memory"><section className="first-value-preview" aria-label="BoardSignal Trustpilot follow-up"><p className="kicker">THANK YOU</p><h2>{settledMessage}</h2>{trustpilotMessage ? <p role="status">{trustpilotMessage}</p> : null}</section></div>;
  }

  if (engagement?.prompt === "first") {
    return <div className="container player-room-memory"><section className="first-value-preview" aria-label="Help BoardSignal grow">
      <p className="kicker">HELP BOARDSIGNAL GROW?</p>
      <h2>A quick Trustpilot review helps other chess players understand what it's actually like to use BoardSignal.</h2>
      {engagement.invitationConfirmed
        ? <p role="status">Your Trustpilot invitation has already been sent. Thanks for considering it.</p>
        : <div className="resolved-player-actions"><button type="button" className="button button-outline" disabled={!online} onClick={requestTrustpilotInvitation}>LEAVE A REVIEW</button>{!online ? <span>Reconnect to use Trustpilot.</span> : null}</div>}
      {trustpilotMessage ? <p role="status">{trustpilotMessage}</p> : null}
    </section></div>;
  }

  return <div className="container player-room-memory"><section className="first-value-preview" aria-label="Final BoardSignal Trustpilot follow-up">
    <p className="kicker">QUICK ONE — DID YOU END UP REVIEWING BOARDSIGNAL?</p>
    <div className="resolved-player-actions">
      <button type="button" className="button button-outline" disabled={!online || busy} onClick={() => void resolveFinal("reviewed")}>YES, I DID</button>
      <button type="button" className="button button-quiet" disabled={!online || busy} onClick={() => void resolveFinal("declined")}>I'D RATHER NOT</button>
      <button type="button" className="button button-quiet" disabled={!online || busy} onClick={() => void resolveFinal("not_yet")}>NOT YET</button>
    </div>
    {!online ? <p>Reconnect to save this choice.</p> : null}
    {trustpilotMessage ? <p role="status">{trustpilotMessage}</p> : null}
  </section></div>;
}
