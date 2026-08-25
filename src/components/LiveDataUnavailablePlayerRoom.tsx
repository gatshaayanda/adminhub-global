"use client";

import { useState } from "react";
import { RefreshCcw, ShieldCheck } from "lucide-react";
import UniversalPlayerDesk from "@/components/UniversalPlayerDesk";
import type { OfflinePlayerRoomSnapshot } from "@/lib/boardsignal/offline/types";

function savedLabel(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function LiveDataUnavailablePlayerRoom({
  initialSnapshot,
  onRetry,
}: {
  initialSnapshot?: OfflinePlayerRoomSnapshot;
  onRetry: () => Promise<boolean | void>;
}) {
  const [retrying, setRetrying] = useState(false);
  const latest = initialSnapshot?.desks?.[0];

  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try { await onRetry(); }
    finally { setRetrying(false); }
  };

  if (!initialSnapshot) {
    return <div id="main" className="desk-processing-page">
      <section className="container desk-processing-card error-card" role="status">
        <ShieldCheck />
        <p className="kicker">LIVE DATA UNAVAILABLE</p>
        <h1>BoardSignal is online, but live account data is temporarily unavailable.</h1>
        <p>No saved My BoardSignal snapshot is available on this device yet. Your account has not been presented as offline and BoardSignal is not fabricating live data.</p>
        <button type="button" className="button button-dark" onClick={() => void retry()} disabled={retrying}>
          <RefreshCcw size={15} /> {retrying ? "Retrying…" : "Retry live data"}
        </button>
      </section>
    </div>;
  }

  return <div id="main" className="player-room-authenticated live-data-unavailable-player-room">
    <header className="container offline-room-identity">
      <div className="universal-avatar">{initialSnapshot.canonicalUsername.slice(0, 2).toUpperCase()}</div>
      <div>
        <span>MY BOARDSIGNAL · SAVED</span>
        <h1>{initialSnapshot.canonicalUsername}</h1>
        <p><ShieldCheck size={14} /> Live BoardSignal data is temporarily unavailable. Showing your saved BoardSignal from {savedLabel(initialSnapshot.lastSyncedAt)}.</p>
      </div>
    </header>
    <div
      className="container offline-room-truth"
      role="status"
      style={{ background: "var(--bs-surface-dark)", color: "var(--bs-text-on-dark)" }}
    >
      <strong style={{ color: "var(--bs-text-on-dark)" }}>LIVE DATA UNAVAILABLE · SAVED</strong>
      <span style={{ color: "var(--bs-text-on-dark)" }}>New games, Pulse movement, messages and account changes may not be current after {savedLabel(initialSnapshot.lastSyncedAt)}. Saved content is read-only until live data returns.</span>
    </div>
    <div className="container player-room-memory">
      <button type="button" className="button button-dark" onClick={() => void retry()} disabled={retrying}>
        <RefreshCcw size={15} /> {retrying ? "Retrying…" : "Retry live data"}
      </button>
      {latest ? <div className="founding-field-note"><ShieldCheck size={18}/><div><strong>Latest saved Review</strong><p>{latest.summary.periodLabel}</p></div></div> : <div className="universe-empty"><p>No completed Review was saved on this device yet.</p></div>}
    </div>
    {latest ? <div aria-label="Saved Review read only">
      <UniversalPlayerDesk requestedUsername={latest.desk.player.username} publishedDesk={latest.desk} publishedEngineResults={latest.engineResults} presentationMode="player-room" embedded />
    </div> : null}
  </div>;
}
