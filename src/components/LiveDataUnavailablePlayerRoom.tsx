"use client";

import { useEffect, useState } from "react";
import { MessageCircle, RefreshCcw, ShieldCheck } from "lucide-react";
import UniversalPlayerDesk from "@/components/UniversalPlayerDesk";
import type { OfflinePlayerRoomSnapshot } from "@/lib/boardsignal/offline/types";
import {
  BOARDSIGNAL_SUPPORT_DISCORD_URL,
  FIRESTORE_QUOTA_EXHAUSTED_CODE,
  firestoreQuotaBlockedUntil,
  quotaResetLocalLabel,
} from "@/lib/boardsignal/client/firestoreQuota";

function savedLabel(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

function FounderHelp() {
  return <a className="button button-quiet" href={BOARDSIGNAL_SUPPORT_DISCORD_URL} target="_blank" rel="noreferrer noopener">
    <MessageCircle size={15} /> Talk to the founder on Discord
  </a>;
}

export default function LiveDataUnavailablePlayerRoom({
  initialSnapshot,
  onRetry,
  reasonCode,
}: {
  initialSnapshot?: OfflinePlayerRoomSnapshot;
  onRetry: () => Promise<boolean | void>;
  reasonCode?: string;
}) {
  const [retrying, setRetrying] = useState(false);
  const latest = initialSnapshot?.desks?.[0];
  const quotaExhausted = reasonCode === FIRESTORE_QUOTA_EXHAUSTED_CODE;
  const quotaUntil = quotaExhausted ? firestoreQuotaBlockedUntil() : undefined;
  const resetLabel = quotaResetLocalLabel(quotaUntil);

  const retry = async () => {
    if (retrying || (quotaExhausted && firestoreQuotaBlockedUntil())) return;
    setRetrying(true);
    try { await onRetry(); }
    finally { setRetrying(false); }
  };

  useEffect(() => {
    if (!quotaExhausted || !quotaUntil) return;
    const delay = Math.max(1000, quotaUntil - Date.now() + 1000);
    const timer = window.setTimeout(() => { void onRetry(); }, Math.min(delay, 2_147_000_000));
    return () => window.clearTimeout(timer);
  }, [onRetry, quotaExhausted, quotaUntil]);

  if (!initialSnapshot) {
    return <div id="main" className="desk-processing-page">
      <section className="container desk-processing-card error-card" role="status">
        <ShieldCheck />
        <p className="kicker">{quotaExhausted ? "LIVE DATA PAUSED FOR TODAY" : "LIVE DATA UNAVAILABLE"}</p>
        <h1>{quotaExhausted
          ? "BoardSignal has reached today's live-data allowance."
          : "BoardSignal is online, but live account data is temporarily unavailable."}</h1>
        <p>{quotaExhausted
          ? `Current BoardSignal updates, completed Review generation, Universe movement, messages and account changes will return after the daily reset — approximately ${resetLabel} for you. Nothing has been deleted.`
          : "No saved My BoardSignal copy is available on this device yet. Your account has not been presented as offline and BoardSignal is not fabricating live data."}</p>
        {quotaExhausted ? <FounderHelp /> : <button type="button" className="button button-dark" onClick={() => void retry()} disabled={retrying}>
          <RefreshCcw size={15} /> {retrying ? "Retrying…" : "Retry live data"}
        </button>}
      </section>
    </div>;
  }

  return <div id="main" className="player-room-authenticated live-data-unavailable-player-room">
    <header className="container offline-room-identity">
      <div className="universal-avatar">{initialSnapshot.canonicalUsername.slice(0, 2).toUpperCase()}</div>
      <div>
        <span>MY BOARDSIGNAL · SAVED</span>
        <h1>{initialSnapshot.canonicalUsername}</h1>
        <p><ShieldCheck size={14} /> {quotaExhausted
          ? `Today's live-data allowance has been used. Your saved BoardSignal remains available. Live updates are expected back around ${resetLabel}.`
          : `Live BoardSignal data is temporarily unavailable. Showing your saved BoardSignal from ${savedLabel(initialSnapshot.lastSyncedAt)}.`}</p>
      </div>
    </header>
    <div className="container offline-room-truth" role="status">
      <strong>{quotaExhausted ? "LIVE DATA PAUSED · SAVED" : "LIVE DATA UNAVAILABLE · SAVED"}</strong>
      <span>{quotaExhausted
        ? `Your saved BoardSignal and completed Reviews remain read-only and safe on this device. Live BoardSignal work resumes after the daily allowance resets, with another check after ${resetLabel}.`
        : `New games, Universe movement, messages and account changes may not be current after ${savedLabel(initialSnapshot.lastSyncedAt)}. Saved content is read-only until live data returns.`}</span>
    </div>
    <div className="container player-room-memory">
      {quotaExhausted ? <FounderHelp /> : <button type="button" className="button button-dark" onClick={() => void retry()} disabled={retrying}>
        <RefreshCcw size={15} /> {retrying ? "Retrying…" : "Retry live data"}
      </button>}
      {latest ? <div className="founding-field-note"><ShieldCheck size={18}/><div><strong>Latest saved completed Review</strong><p>{latest.summary.periodLabel}</p></div></div> : <div className="universe-empty"><p>No completed Review was saved on this device yet.</p></div>}
    </div>
    {latest ? <div aria-label="Saved Review read only">
      <UniversalPlayerDesk requestedUsername={latest.desk.player.username} publishedDesk={latest.desk} publishedEngineResults={latest.engineResults} presentationMode="player-room" embedded />
    </div> : null}
  </div>;
}
