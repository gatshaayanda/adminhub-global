"use client";

import { useId, useState } from "react";
import CurrentBoardSignalEngagement from "./CurrentBoardSignalEngagement";
import engagementStyles from "./CurrentBoardSignalEngagement.module.css";
import {
  REVIEW_JOURNAL_MAX_NOTE_LENGTH,
  REVIEW_JOURNAL_TYPE_DETAILS,
  sortReviewJournalNotes,
  type ReviewJournal,
  type ReviewJournalNote,
  type ReviewJournalNoteType,
  type ReviewJournalReviewIdentity,
} from "@/lib/boardsignal/reviewJournal";

type JournalMutationProps = {
  token: string;
  online: boolean;
  journal: ReviewJournal;
  onJournalChanged: (journal: ReviewJournal) => void;
};

type JournalEditorProps = {
  initialType?: ReviewJournalNoteType;
  initialBody?: string;
  saveLabel: string;
  busy: boolean;
  onSave: (type: ReviewJournalNoteType, body: string) => Promise<void>;
  onCancel: () => void;
};

function dateLabel(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
}

function openAskBoardSignal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("boardsignal:ask-open"));
}

async function journalMutation(token: string, method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
  const response = await fetch("/api/boardsignal/review-journal", {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as { ok?: boolean; journal?: ReviewJournal; error?: string };
  if (!response.ok || !payload.ok || !payload.journal) throw new Error(payload.error ?? "Your private note could not be updated.");
  return payload.journal;
}

function JournalEditor({ initialType, initialBody = "", saveLabel, busy, onSave, onCancel }: JournalEditorProps) {
  const fieldId = useId();
  const [type, setType] = useState<ReviewJournalNoteType | undefined>(initialType);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState("");
  const trimmed = body.trim();

  async function save() {
    if (!type || !trimmed) {
      setError(!type ? "Choose what kind of note this is." : "Write something before saving this note.");
      return;
    }
    setError("");
    try {
      await onSave(type, trimmed);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your private note could not be saved.");
    }
  }

  return <div className="review-journal-editor">
    <fieldset disabled={busy}>
      <legend>Choose a note type</legend>
      <p className="review-journal-field-help">Adding a note is optional. If you add one, choose the kind that best matches what you want your future self to remember.</p>
      <div className="review-journal-type-grid">
        {(Object.keys(REVIEW_JOURNAL_TYPE_DETAILS) as ReviewJournalNoteType[]).map((value) => {
          const detail = REVIEW_JOURNAL_TYPE_DETAILS[value];
          return <label key={value} className={type === value ? "is-selected" : ""}>
            <input type="radio" name={`${fieldId}-type`} value={value} checked={type === value} onChange={() => setType(value)} />
            <span><strong>{detail.label}</strong><small>{detail.helper}</small></span>
          </label>;
        })}
      </div>
    </fieldset>
    <label className="review-journal-body-label" htmlFor={`${fieldId}-body`}>
      <strong>Your note</strong>
      <span>{type ? REVIEW_JOURNAL_TYPE_DETAILS[type].prompt : "Choose a note type first, then write what you want to remember."}</span>
    </label>
    <textarea id={`${fieldId}-body`} value={body} onChange={(event) => setBody(event.target.value)} maxLength={REVIEW_JOURNAL_MAX_NOTE_LENGTH} rows={4} disabled={busy} aria-describedby={`${fieldId}-count`} />
    <div className="review-journal-editor-meta"><small id={`${fieldId}-count`}>{body.length}/{REVIEW_JOURNAL_MAX_NOTE_LENGTH} characters</small>{error ? <p role="alert">{error}</p> : null}</div>
    <div className="review-journal-editor-actions">
      <button type="button" className="button button-dark" disabled={busy || !type || !trimmed} onClick={() => void save()}>{busy ? "Saving…" : saveLabel}</button>
      <button type="button" className="button button-quiet" disabled={busy} onClick={onCancel}>Cancel</button>
    </div>
  </div>;
}

function JournalNotesList({ notes, token, online, onJournalChanged, showPeriod = false }: JournalMutationProps & { notes: ReviewJournalNote[]; showPeriod?: boolean }) {
  const [editingId, setEditingId] = useState<string>();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>();
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState("");

  async function edit(note: ReviewJournalNote, type: ReviewJournalNoteType, body: string) {
    if (!online) return;
    setBusyId(note.noteId);
    setError("");
    try {
      const next = await journalMutation(token, "PATCH", { noteId: note.noteId, type, body });
      onJournalChanged(next);
      setEditingId(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your private note could not be changed.");
      throw reason;
    } finally {
      setBusyId(undefined);
    }
  }

  async function remove(note: ReviewJournalNote) {
    if (!online) return;
    setBusyId(note.noteId);
    setError("");
    try {
      const next = await journalMutation(token, "DELETE", { noteId: note.noteId });
      onJournalChanged(next);
      setConfirmDeleteId(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your private note could not be deleted.");
    } finally {
      setBusyId(undefined);
    }
  }

  return <div className="review-journal-note-list">
    {error ? <p className="review-journal-error" role="alert">{error}</p> : null}
    {notes.map((note) => {
      const detail = REVIEW_JOURNAL_TYPE_DETAILS[note.type];
      const edited = note.updatedAt !== note.createdAt;
      const busy = busyId === note.noteId;
      return <article className="review-journal-note" key={note.noteId}>
        {showPeriod ? <span className="review-journal-period">{note.periodLabel}</span> : null}
        <strong className="review-journal-note-type">{detail.label}</strong>
        {editingId === note.noteId ? <JournalEditor initialType={note.type} initialBody={note.body} saveLabel="Save changes" busy={busy} onSave={(type, body) => edit(note, type, body)} onCancel={() => setEditingId(undefined)} /> : <>
          <p>{note.body}</p>
          <small>Written {dateLabel(note.createdAt)}{edited ? ` · Edited ${dateLabel(note.updatedAt)}` : ""}</small>
          <div className="review-journal-note-actions">
            <button type="button" disabled={!online || busy} onClick={() => { setEditingId(note.noteId); setConfirmDeleteId(undefined); }}>{online ? "Edit" : "Edit — reconnect required"}</button>
            <button type="button" disabled={!online || busy} onClick={() => { setConfirmDeleteId(note.noteId); setEditingId(undefined); }}>{online ? "Delete" : "Delete — reconnect required"}</button>
          </div>
          {confirmDeleteId === note.noteId ? <div className="review-journal-delete-confirm" role="group" aria-label="Confirm note deletion"><p><strong>Delete this note?</strong> This removes only this private note. Your BoardSignal Review stays unchanged.</p><div><button type="button" className="button button-dark" disabled={busy} onClick={() => void remove(note)}>{busy ? "Deleting…" : "Delete note"}</button><button type="button" className="button button-quiet" disabled={busy} onClick={() => setConfirmDeleteId(undefined)}>Cancel</button></div></div> : null}
        </>}
      </article>;
    })}
  </div>;
}

export default function PlayerReviewJournal({ review, token, online, journal, onJournalChanged, compact = false, context = "review" }: JournalMutationProps & { review: ReviewJournalReviewIdentity; compact?: boolean; context?: "current" | "review" }) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedNotice, setSavedNotice] = useState("");
  const current = context === "current";
  const notes = sortReviewJournalNotes(journal.notes.filter((note) => note.reviewKey === review.reviewKey || (note.periodStart === review.periodStart && note.periodEnd === review.periodEnd)));

  async function add(type: ReviewJournalNoteType, body: string) {
    if (!online) return;
    setSaving(true);
    setError("");
    setSavedNotice("");
    try {
      const next = await journalMutation(token, "POST", { ...review, type, body });
      onJournalChanged(next);
      setAdding(false);
      if (current) setSavedNotice("Saved. That's part of this BoardSignal now.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your private note could not be saved.");
      throw reason;
    } finally {
      setSaving(false);
    }
  }

  return <section className={`review-journal ${compact ? "is-compact" : ""}`} aria-label={current ? `Your take for ${review.periodLabel}` : `My notes for ${review.periodLabel}`}>
    {current ? <CurrentBoardSignalEngagement review={review} token={token} online={online} /> : null}
    <div className="review-journal-heading"><div><p className="kicker">{current ? "YOUR TAKE" : "MY NOTES"}</p><h3>{current ? "Anything you'd change or add?" : "Keep something for your future self."}</h3><p>{current ? "Your note stays private. What you write here travels with this period when it closes into a completed Review." : "Your notes stay private and do not change BoardSignal's Review."}</p></div><span>PRIVATE</span></div>
    {notes.length ? <JournalNotesList notes={notes} token={token} online={online} journal={journal} onJournalChanged={onJournalChanged} /> : <p className="review-journal-empty">{current ? "No private notes for your current BoardSignal yet." : "No private notes saved for this Review yet."}</p>}
    {!online ? <p className="review-journal-offline" role="status">Reconnect to update your notes. Saved notes remain readable while offline.</p> : null}
    {adding && online ? <JournalEditor saveLabel="Save note" busy={saving} onSave={add} onCancel={() => { setAdding(false); setError(""); setSavedNotice(""); }} /> : current ? <div className="review-journal-editor-actions"><button type="button" className="review-journal-add" disabled={!online} onClick={() => { setAdding(true); setSavedNotice(""); }}>ADD A NOTE{!online ? " — RECONNECT REQUIRED" : ""}</button><button type="button" className="button button-quiet" disabled={!online} onClick={openAskBoardSignal} aria-label="Ask BoardSignal about this current item">ASK BOARDSIGNAL</button></div> : <button type="button" className="review-journal-add" disabled={!online} onClick={() => { setAdding(true); setSavedNotice(""); }}>+ ADD A NOTE{!online ? " — RECONNECT REQUIRED" : ""}</button>}
    {savedNotice ? <p className={engagementStyles.noteSaved} role="status">{savedNotice}</p> : null}
    {error ? <p className="review-journal-error" role="alert">{error}</p> : null}
  </section>;
}

export function PlayerReviewNotesTimeline({ token, online, journal, onJournalChanged }: JournalMutationProps) {
  const notes = sortReviewJournalNotes(journal.notes);
  return <details className="review-journal-progress">
    <summary><span><strong>YOUR REVIEW NOTES</strong><small>Private reflections that can outlive the four full Review payloads.</small></span><b>{notes.length} note{notes.length === 1 ? "" : "s"}</b></summary>
    <div className="review-journal-progress-body">
      {notes.length ? <JournalNotesList notes={notes} token={token} online={online} journal={journal} onJournalChanged={onJournalChanged} showPeriod /> : <p>You have not saved any BoardSignal notes yet. Add one from Current BoardSignal or a completed Review when something is worth keeping for your future self.</p>}
      {!online ? <p className="review-journal-offline" role="status">Reconnect to update your notes.</p> : null}
    </div>
  </details>;
}
