"use client";

import { useEffect, useState } from "react";
import type { CurrentEpisodeWithNextGameGuidance } from "@/lib/boardsignal/activeWeekGuidance";
import type {
  BoardSignalCurrentFeedback,
  BoardSignalCurrentFeedbackItem,
  BoardSignalCurrentReaction,
} from "@/lib/boardsignal/account";
import { buildCurrentBoardSignalMoment, type CurrentBoardSignalMoment } from "@/lib/boardsignal/currentBoardSignalPresentation";
import { loadPlayerRoomOfflineSnapshot } from "@/lib/boardsignal/offline/snapshots";
import type { OfflinePlayerRoomSnapshot } from "@/lib/boardsignal/offline/types";
import type { ReviewJournalReviewIdentity } from "@/lib/boardsignal/reviewJournal";
import { auth } from "@/utils/firebaseConfig";
import styles from "./CurrentBoardSignalEngagement.module.css";

async function currentFeedbackMutation(
  token: string,
  moment: CurrentBoardSignalMoment,
  review: ReviewJournalReviewIdentity,
  reaction: BoardSignalCurrentReaction,
) {
  const response = await fetch("/api/boardsignal/current-feedback", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ periodStart: review.periodStart, periodEnd: review.periodEnd, itemKey: moment.itemKey, reaction }),
  });
  const payload = await response.json() as { ok?: boolean; feedback?: BoardSignalCurrentFeedback; error?: string };
  if (!response.ok || !payload.ok || !payload.feedback) throw new Error(payload.error ?? "BoardSignal could not save that reaction.");
  return payload.feedback;
}

function MomentCard({ moment, feedback, online, busy, error, onReact }: {
  moment?: CurrentBoardSignalMoment;
  feedback?: BoardSignalCurrentFeedbackItem;
  online: boolean;
  busy: boolean;
  error: string;
  onReact: (reaction: BoardSignalCurrentReaction) => Promise<void>;
}) {
  if (!moment) return null;
  const settled = Boolean(feedback);
  return <section className={styles.liveMoment} data-variant={moment.variant} aria-label="Current BoardSignal live context">
    <span className={styles.eyebrow}>{moment.eyebrow}</span>
    <h3>{moment.headline}</h3>
    <p className={styles.evidence}>{moment.evidence}</p>
    {moment.carry ? <div className={styles.carry}><span>{moment.carry.label}</span><b>{moment.carry.title}</b>{moment.carry.copy ? <p>{moment.carry.copy}</p> : null}</div> : null}
    {moment.around ? <div className={styles.around}><span>AROUND BOARDSIGNAL</span><b>{moment.around.headline}</b><p>{moment.around.supportingFact}</p></div> : null}
    <div className={`${styles.helpful} ${settled ? styles.settled : ""}`}>
      {settled ? <p className={styles.acknowledgement} role="status">{feedback?.reaction === "helpful" ? "Got it — we'll keep leaning into what helps." : "Got it — that's useful for BoardSignal to know."}</p> : <>
        <strong>Helpful?</strong>
        <div className={styles.reactionButtons}>
          <button type="button" disabled={!online || busy} aria-label="Yes, this was helpful" onClick={() => void onReact("helpful")}>👍</button>
          <button type="button" disabled={!online || busy} aria-label="No, this was not helpful" onClick={() => void onReact("not_helpful")}>👎</button>
        </div>
        {!online ? <p className={styles.reconnectHint}>Reconnect to send this feedback.</p> : null}
      </>}
    </div>
    {error ? <p className={styles.feedbackError} role="alert">{error}</p> : null}
  </section>;
}

export default function CurrentBoardSignalEngagement({ review, token, online }: { review: ReviewJournalReviewIdentity; token: string; online: boolean }) {
  const [snapshot, setSnapshot] = useState<OfflinePlayerRoomSnapshot>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sessionFeedback, setSessionFeedback] = useState<{ itemKey: string; reaction: BoardSignalCurrentReaction }>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;
    const refresh = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const saved = await loadPlayerRoomOfflineSnapshot(uid).catch(() => undefined);
      if (!active || !saved) return;
      if (saved.currentEpisode?.periodStart !== review.periodStart || saved.currentEpisode?.periodEnd !== review.periodEnd) return;
      setSnapshot(saved);
    };
    const onOfflineSaved = () => { void refresh(); };
    void refresh();
    window.addEventListener("boardsignal:offline-saved", onOfflineSaved);
    return () => {
      active = false;
      window.removeEventListener("boardsignal:offline-saved", onOfflineSaved);
    };
  }, [review.periodEnd, review.periodStart]);

  const liveEpisode = snapshot?.currentEpisode as CurrentEpisodeWithNextGameGuidance | undefined;
  const moment = liveEpisode?.nextGameGuidance
    ? buildCurrentBoardSignalMoment({ episode: liveEpisode, pulse: snapshot?.pulse, canonicalUsername: snapshot?.canonicalUsername })
    : undefined;
  const durableFeedback = moment
    && snapshot?.currentBoardSignalFeedback?.periodStart === review.periodStart
    && snapshot.currentBoardSignalFeedback.periodEnd === review.periodEnd
      ? snapshot.currentBoardSignalFeedback.items.find((item) => item.itemKey === moment.itemKey)
      : undefined;
  const feedback = durableFeedback ?? (moment && sessionFeedback?.itemKey === moment.itemKey ? { itemKey: moment.itemKey, reaction: sessionFeedback.reaction, reactedAt: "session" } : undefined);
  const momentItemKey = moment?.itemKey;

  useEffect(() => {
    if (!momentItemKey || typeof window === "undefined" || durableFeedback) {
      setSessionFeedback(undefined);
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const stored = window.sessionStorage.getItem(`boardsignal:m2-feedback:${uid}:${momentItemKey}`);
      setSessionFeedback(stored === "helpful" || stored === "not_helpful" ? { itemKey: momentItemKey, reaction: stored } : undefined);
    } catch {
      setSessionFeedback(undefined);
    }
  }, [durableFeedback, momentItemKey]);

  async function react(reaction: BoardSignalCurrentReaction) {
    if (!moment || !online || busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await currentFeedbackMutation(token, moment, review, reaction);
      setSnapshot((current) => current ? { ...current, currentBoardSignalFeedback: next } : current);
      setSessionFeedback({ itemKey: moment.itemKey, reaction });
      const uid = auth.currentUser?.uid;
      if (uid && typeof window !== "undefined") {
        try { window.sessionStorage.setItem(`boardsignal:m2-feedback:${uid}:${moment.itemKey}`, reaction); } catch { /* server durability is authoritative */ }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "BoardSignal could not save that reaction.");
    } finally {
      setBusy(false);
    }
  }

  return <MomentCard moment={moment} feedback={feedback} online={online} busy={busy} error={error} onReact={react} />;
}
