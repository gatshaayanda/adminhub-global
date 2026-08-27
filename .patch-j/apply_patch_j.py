from pathlib import Path
import textwrap

ROOT = Path.cwd()


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"PATCH_J_EXACT_REPLACE_FAILED {path}: expected 1 match, found {count}")
    write(path, text.replace(old, new, 1))


def append_once(path: str, marker: str, addition: str) -> None:
    text = read(path)
    if marker in text:
        raise SystemExit(f"PATCH_J_APPEND_ALREADY_PRESENT {path}: {marker}")
    write(path, text.rstrip() + "\n\n" + addition.strip() + "\n")


def write_new(path: str, content: str) -> None:
    target = ROOT / path
    if target.exists():
        raise SystemExit(f"PATCH_J_NEW_FILE_ALREADY_EXISTS {path}")
    write(path, textwrap.dedent(content).lstrip())


write_new("src/lib/boardsignal/reviewJournal.ts", r'''
export const REVIEW_JOURNAL_MAX_NOTE_LENGTH = 1000;
export const REVIEW_JOURNAL_MAX_NOTES = 260;

export const REVIEW_JOURNAL_TYPE_DETAILS = {
  noticed: {
    label: "WHAT I NOTICED",
    helper: "Something I learned from this Review",
    prompt: "What stood out to you?",
  },
  try_next: {
    label: "WHAT I'LL TRY",
    helper: "Something I want to do differently",
    prompt: "What do you want to try in your next games?",
  },
  follow_up: {
    label: "FOLLOW-UP",
    helper: "Something I learned after returning later",
    prompt: "Looking back, did anything change?",
  },
} as const;

export type ReviewJournalNoteType = keyof typeof REVIEW_JOURNAL_TYPE_DETAILS;

export type ReviewJournalReviewIdentity = {
  reviewKey: string;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
};

export type ReviewJournalNote = ReviewJournalReviewIdentity & {
  noteId: string;
  type: ReviewJournalNoteType;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewJournal = {
  version: 1;
  notes: ReviewJournalNote[];
  updatedAt?: string;
};

export function emptyReviewJournal(): ReviewJournal {
  return { version: 1, notes: [] };
}

export function isReviewJournalNoteType(value: unknown): value is ReviewJournalNoteType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(REVIEW_JOURNAL_TYPE_DETAILS, value);
}

export function sortReviewJournalNotes(notes: ReviewJournalNote[]) {
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.noteId.localeCompare(a.noteId));
}
''')

write_new("src/lib/boardsignal/server/reviewJournal.ts", r'''
import "server-only";

import { randomUUID } from "node:crypto";
import {
  REVIEW_JOURNAL_MAX_NOTE_LENGTH,
  REVIEW_JOURNAL_MAX_NOTES,
  isReviewJournalNoteType,
  sortReviewJournalNotes,
  type ReviewJournal,
  type ReviewJournalNote,
  type ReviewJournalNoteType,
  type ReviewJournalReviewIdentity,
} from "@/lib/boardsignal/reviewJournal";
import { getAdminDb } from "@/utils/firebaseAdmin";

type StoredReviewJournal = {
  version?: number;
  notes?: Record<string, ReviewJournalNote>;
  updatedAt?: string;
};

export class ReviewJournalError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "ReviewJournalError";
    this.code = code;
    this.status = status;
  }
}

function journalRef(uid: string) {
  return getAdminDb().collection("users").doc(uid).collection("private").doc("reviewJournal");
}

function cleanSingleLine(value: unknown, label: string, maxLength: number) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > maxLength || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) {
    throw new ReviewJournalError("REVIEW_JOURNAL_INVALID_CONTEXT", `${label} is invalid.`);
  }
  return text;
}

function cleanPeriodDate(value: unknown, label: string) {
  const text = cleanSingleLine(value, label, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(`${text}T00:00:00Z`))) {
    throw new ReviewJournalError("REVIEW_JOURNAL_INVALID_CONTEXT", `${label} must be a calendar date.`);
  }
  return text;
}

function cleanReviewIdentity(input: unknown): ReviewJournalReviewIdentity {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const reviewKey = cleanSingleLine(body.reviewKey, "Review key", 512);
  const periodStart = cleanPeriodDate(body.periodStart, "Review start");
  const periodEnd = cleanPeriodDate(body.periodEnd, "Review end");
  const periodLabel = cleanSingleLine(body.periodLabel, "Review period", 80);
  if (periodEnd < periodStart) throw new ReviewJournalError("REVIEW_JOURNAL_INVALID_CONTEXT", "Review end must not precede Review start.");
  return { reviewKey, periodStart, periodEnd, periodLabel };
}

function cleanType(value: unknown): ReviewJournalNoteType {
  if (!isReviewJournalNoteType(value)) {
    throw new ReviewJournalError("REVIEW_JOURNAL_INVALID_TYPE", "Choose What I noticed, What I'll try, or Follow-up.");
  }
  return value;
}

function cleanBody(value: unknown) {
  const body = typeof value === "string" ? value.trim() : "";
  if (!body) throw new ReviewJournalError("REVIEW_JOURNAL_EMPTY_NOTE", "Write something before saving this note.");
  if (body.length > REVIEW_JOURNAL_MAX_NOTE_LENGTH) {
    throw new ReviewJournalError("REVIEW_JOURNAL_NOTE_TOO_LONG", `Keep your note to ${REVIEW_JOURNAL_MAX_NOTE_LENGTH} characters or fewer.`);
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(body)) {
    throw new ReviewJournalError("REVIEW_JOURNAL_INVALID_NOTE", "The note contains unsupported control characters.");
  }
  return body;
}

function noteMap(data: StoredReviewJournal | undefined) {
  const notes = data?.notes;
  if (!notes || typeof notes !== "object" || Array.isArray(notes)) return {} as Record<string, ReviewJournalNote>;
  return Object.fromEntries(Object.entries(notes).filter(([, value]) => {
    if (!value || typeof value !== "object") return false;
    const candidate = value as ReviewJournalNote;
    return typeof candidate.noteId === "string"
      && typeof candidate.reviewKey === "string"
      && typeof candidate.periodStart === "string"
      && typeof candidate.periodEnd === "string"
      && typeof candidate.periodLabel === "string"
      && isReviewJournalNoteType(candidate.type)
      && typeof candidate.body === "string"
      && typeof candidate.createdAt === "string"
      && typeof candidate.updatedAt === "string";
  })) as Record<string, ReviewJournalNote>;
}

function journalFromMap(notes: Record<string, ReviewJournalNote>, updatedAt?: string): ReviewJournal {
  return { version: 1, notes: sortReviewJournalNotes(Object.values(notes)), ...(updatedAt ? { updatedAt } : {}) };
}

export async function loadReviewJournal(uid: string): Promise<ReviewJournal> {
  const snapshot = await journalRef(uid).get();
  if (!snapshot.exists) return { version: 1, notes: [] };
  const data = snapshot.data() as StoredReviewJournal | undefined;
  return journalFromMap(noteMap(data), data?.updatedAt);
}

export async function addReviewJournalNote(uid: string, input: unknown) {
  const identity = cleanReviewIdentity(input);
  const bodyInput = input as Record<string, unknown>;
  const type = cleanType(bodyInput.type);
  const body = cleanBody(bodyInput.body);
  const ref = journalRef(uid);
  return getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const stored = snapshot.exists ? snapshot.data() as StoredReviewJournal : undefined;
    const notes = noteMap(stored);
    if (Object.keys(notes).length >= REVIEW_JOURNAL_MAX_NOTES) {
      throw new ReviewJournalError("REVIEW_JOURNAL_LIMIT_REACHED", `Your journal has reached its ${REVIEW_JOURNAL_MAX_NOTES}-note limit. Delete a note before adding another.`, 409);
    }
    const now = new Date().toISOString();
    const noteId = randomUUID();
    const note: ReviewJournalNote = { noteId, ...identity, type, body, createdAt: now, updatedAt: now };
    const next = { ...notes, [noteId]: note };
    transaction.set(ref, { version: 1, notes: next, updatedAt: now }, { merge: false });
    return journalFromMap(next, now);
  });
}

export async function editReviewJournalNote(uid: string, input: unknown) {
  const bodyInput = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const noteId = cleanSingleLine(bodyInput.noteId, "Note ID", 80);
  const type = cleanType(bodyInput.type);
  const body = cleanBody(bodyInput.body);
  const ref = journalRef(uid);
  return getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const stored = snapshot.exists ? snapshot.data() as StoredReviewJournal : undefined;
    const notes = noteMap(stored);
    const existing = notes[noteId];
    if (!existing) throw new ReviewJournalError("REVIEW_JOURNAL_NOTE_NOT_FOUND", "That private note no longer exists.", 404);
    const now = new Date().toISOString();
    const next = { ...notes, [noteId]: { ...existing, type, body, updatedAt: now } };
    transaction.set(ref, { version: 1, notes: next, updatedAt: now }, { merge: false });
    return journalFromMap(next, now);
  });
}

export async function deleteReviewJournalNote(uid: string, input: unknown) {
  const bodyInput = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const noteId = cleanSingleLine(bodyInput.noteId, "Note ID", 80);
  const ref = journalRef(uid);
  return getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const stored = snapshot.exists ? snapshot.data() as StoredReviewJournal : undefined;
    const notes = noteMap(stored);
    if (!notes[noteId]) throw new ReviewJournalError("REVIEW_JOURNAL_NOTE_NOT_FOUND", "That private note no longer exists.", 404);
    const next = { ...notes };
    delete next[noteId];
    const now = new Date().toISOString();
    transaction.set(ref, { version: 1, notes: next, updatedAt: now }, { merge: false });
    return journalFromMap(next, now);
  });
}
''')

write_new("src/app/api/boardsignal/review-journal/route.ts", r'''
import { NextResponse } from "next/server";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import {
  ReviewJournalError,
  addReviewJournalNote,
  deleteReviewJournalNote,
  editReviewJournalNote,
} from "@/lib/boardsignal/server/reviewJournal";
import { classifyBoardSignalHttpError } from "@/lib/boardsignal/server/firestoreService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Pragma": "no-cache",
      "Vary": "Authorization",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function failure(error: unknown) {
  if (error instanceof ReviewJournalError) return response({ ok: false, code: error.code, error: error.message }, error.status);
  const classified = classifyBoardSignalHttpError(error);
  return response({ ok: false, code: classified.code, error: classified.message }, classified.status);
}

export async function POST(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const body = await request.json().catch(() => ({}));
    const journal = await addReviewJournalNote(token.uid, body);
    return response({ ok: true, journal });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const body = await request.json().catch(() => ({}));
    const journal = await editReviewJournalNote(token.uid, body);
    return response({ ok: true, journal });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const token = await requirePlayerToken(request);
    const body = await request.json().catch(() => ({}));
    const journal = await deleteReviewJournalNote(token.uid, body);
    return response({ ok: true, journal });
  } catch (error) {
    return failure(error);
  }
}
''')

write_new("src/components/PlayerReviewJournal.tsx", r'''
"use client";

import { useId, useState } from "react";
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

export default function PlayerReviewJournal({ review, token, online, journal, onJournalChanged, compact = false }: JournalMutationProps & { review: ReviewJournalReviewIdentity; compact?: boolean }) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const notes = sortReviewJournalNotes(journal.notes.filter((note) => note.reviewKey === review.reviewKey));

  async function add(type: ReviewJournalNoteType, body: string) {
    if (!online) return;
    setSaving(true);
    setError("");
    try {
      const next = await journalMutation(token, "POST", { ...review, type, body });
      onJournalChanged(next);
      setAdding(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your private note could not be saved.");
      throw reason;
    } finally {
      setSaving(false);
    }
  }

  return <section className={`review-journal ${compact ? "is-compact" : ""}`} aria-label={`My notes for ${review.periodLabel}`}>
    <div className="review-journal-heading"><div><p className="kicker">MY NOTES</p><h3>Keep something for your future self.</h3><p>Your notes stay private and do not change BoardSignal's Review.</p></div><span>PRIVATE</span></div>
    {notes.length ? <JournalNotesList notes={notes} token={token} online={online} journal={journal} onJournalChanged={onJournalChanged} /> : <p className="review-journal-empty">No private notes saved for this Review yet.</p>}
    {!online ? <p className="review-journal-offline" role="status">Reconnect to update your notes. Saved notes remain readable while offline.</p> : null}
    {adding && online ? <JournalEditor saveLabel="Save note" busy={saving} onSave={add} onCancel={() => { setAdding(false); setError(""); }} /> : <button type="button" className="review-journal-add" disabled={!online} onClick={() => setAdding(true)}>+ ADD A NOTE{!online ? " — RECONNECT REQUIRED" : ""}</button>}
    {error ? <p className="review-journal-error" role="alert">{error}</p> : null}
  </section>;
}

export function PlayerReviewNotesTimeline({ token, online, journal, onJournalChanged }: JournalMutationProps) {
  const notes = sortReviewJournalNotes(journal.notes);
  return <details className="review-journal-progress">
    <summary><span><strong>YOUR REVIEW NOTES</strong><small>Private reflections that can outlive the four full Review payloads.</small></span><b>{notes.length} note{notes.length === 1 ? "" : "s"}</b></summary>
    <div className="review-journal-progress-body">
      {notes.length ? <JournalNotesList notes={notes} token={token} online={online} journal={journal} onJournalChanged={onJournalChanged} showPeriod /> : <p>You have not saved any Review notes yet. Add one from a completed Review when something is worth keeping for your future self.</p>}
      {!online ? <p className="review-journal-offline" role="status">Reconnect to update your notes.</p> : null}
    </div>
  </details>;
}
''')

replace_once(
    "src/app/api/boardsignal/player-room/route.ts",
    'import { loadRecentReportPeriodTruth, recordReviewPeriodResult } from "@/lib/boardsignal/server/reviewPeriods";\n',
    'import { loadRecentReportPeriodTruth, recordReviewPeriodResult } from "@/lib/boardsignal/server/reviewPeriods";\nimport { loadReviewJournal } from "@/lib/boardsignal/server/reviewJournal";\n',
)
replace_once(
    "src/app/api/boardsignal/player-room/route.ts",
    'if (!hasAcceptedCurrentBetaAgreement(account)) return response({ ok: true, snapshot: { account, desks: [], reviewHistory: [], reportPeriods: [], historyCoverage: { evaluatedCount: 0, totalCount: 0 }, originalBetaReturn: Boolean((account as typeof account & { originalBetaPlayer?: boolean }).originalBetaPlayer), progress: [], recurringPatterns: [], personalRecords: { desksCompleted: 0, personalBestWinRun: 0, largestPoolSpecificRatingClimb: {} }, generationRequired: false } });',
    'if (!hasAcceptedCurrentBetaAgreement(account)) return response({ ok: true, snapshot: { account, desks: [], reviewHistory: [], reportPeriods: [], historyCoverage: { evaluatedCount: 0, totalCount: 0 }, originalBetaReturn: Boolean((account as typeof account & { originalBetaPlayer?: boolean }).originalBetaPlayer), progress: [], recurringPatterns: [], personalRecords: { desksCompleted: 0, personalBestWinRun: 0, largestPoolSpecificRatingClimb: {} }, generationRequired: false, reviewJournal: { version: 1, notes: [] } } });',
)
replace_once(
    "src/app/api/boardsignal/player-room/route.ts",
    '    Object.assign(snapshot, { reportPeriods: reportTruth.periods, historyCoverage: reportTruth.coverage });',
    '    const reviewJournal = await loadReviewJournal(account.uid);\n    Object.assign(snapshot, { reportPeriods: reportTruth.periods, historyCoverage: reportTruth.coverage, reviewJournal });',
)

replace_once(
    "src/lib/boardsignal/offline/types.ts",
    'import type { PlayerPulse, SafeShareMoment } from "@/lib/boardsignal/pulse";\n',
    'import type { PlayerPulse, SafeShareMoment } from "@/lib/boardsignal/pulse";\nimport type { ReviewJournal } from "@/lib/boardsignal/reviewJournal";\n',
)
replace_once(
    "src/lib/boardsignal/offline/types.ts",
    '  shareMoments: SafeShareMoment[];\n};',
    '  shareMoments: SafeShareMoment[];\n  reviewJournal?: ReviewJournal;\n};',
)

replace_once(
    "src/lib/boardsignal/offline/snapshots.ts",
    'import type { PlayerPulse, SafeShareMoment } from "@/lib/boardsignal/pulse";\n',
    'import type { PlayerPulse, SafeShareMoment } from "@/lib/boardsignal/pulse";\nimport type { ReviewJournal } from "@/lib/boardsignal/reviewJournal";\n',
)
replace_once(
    "src/lib/boardsignal/offline/snapshots.ts",
    '  shareMoments?: SafeShareMoment[];\n};',
    '  shareMoments?: SafeShareMoment[];\n  reviewJournal?: ReviewJournal;\n};',
)
replace_once(
    "src/lib/boardsignal/offline/snapshots.ts",
    '    shareMoments: (input.shareMoments ?? []).filter((item) => activeDeskKeys.has(item.deskKey)).slice(0, 12),\n',
    '    shareMoments: (input.shareMoments ?? []).filter((item) => activeDeskKeys.has(item.deskKey)).slice(0, 12),\n    reviewJournal: input.reviewJournal ?? { version: 1, notes: [] },\n',
)

replace_once(
    "src/lib/boardsignal/server/accountDeletion.ts",
    '  "factualReviews",\n  "social",',
    '  "factualReviews",\n  "private",\n  "social",',
)

replace_once(
    "src/components/BoardSignalPlayerRoom.tsx",
    'import PlayerRoomQuickRead from "@/components/PlayerRoomQuickRead";\n',
    'import PlayerRoomQuickRead from "@/components/PlayerRoomQuickRead";\nimport PlayerReviewJournal, { PlayerReviewNotesTimeline } from "@/components/PlayerReviewJournal";\n',
)
replace_once(
    "src/components/BoardSignalPlayerRoom.tsx",
    'import { reviewHistoryLifecycleLabel, type CompletedReviewHistoryItem } from "@/lib/boardsignal/reviewHistory";\n',
    'import { reviewHistoryLifecycleLabel, type CompletedReviewHistoryItem } from "@/lib/boardsignal/reviewHistory";\nimport type { ReviewJournal } from "@/lib/boardsignal/reviewJournal";\n',
)
replace_once(
    "src/components/BoardSignalPlayerRoom.tsx",
    '  shareMoments?: Array<SafeShareMoment & { activeDesk?: boolean }>;\n};',
    '  shareMoments?: Array<SafeShareMoment & { activeDesk?: boolean }>;\n  reviewJournal: ReviewJournal;\n};',
)
replace_once(
    "src/components/BoardSignalPlayerRoom.tsx",
    '  }, [connectivity.online, token, user?.uid]);\n\n  const latest = snapshot?.desks[0];',
    '''  }, [connectivity.online, token, user?.uid]);

  const handleJournalChanged = useCallback((reviewJournal: ReviewJournal) => {
    setSnapshot((current) => {
      if (!current || !user) return current;
      const next = { ...current, reviewJournal };
      void savePlayerRoomOfflineSnapshot(user.uid, next).then(() => {
        window.dispatchEvent(new CustomEvent("boardsignal:offline-saved"));
      }).catch(() => undefined);
      return next;
    });
  }, [user]);

  const latest = snapshot?.desks[0];''',
)
replace_once(
    "src/components/BoardSignalPlayerRoom.tsx",
    '{snapshot.pendingFactualReview ? <UniversalPlayerDesk requestedUsername={snapshot.account.chessCom.canonicalUsername} ownerToken={token} cadenceAnchor={snapshot.account.cadenceAnchor} pendingFactualReview={snapshot.pendingFactualReview} onFactualReviewReady={saveFactualReview} onDeskPublished={publishDesk} embedded /> : latest ? <><AuthenticatedUniverseProvider pulse={snapshot.pulse} unavailable={snapshot.pulseUnavailable}><UniversalPlayerDesk requestedUsername={latest.desk.player.username} publishedDesk={latest.desk} publishedEngineResults={latest.engineResults} presentationMode="player-room" embedded /></AuthenticatedUniverseProvider><div className="container player-room-memory g3-post-review">{latest ? <ShareMomentsSection moments={(snapshot.shareMoments ?? []).filter((moment) => moment.deskKey === latest.summary.deskKey).slice(0, 3)} /> : null}<DeskReturnChannelPrompt uid={snapshot.account.uid} idToken={token} browserPushEnabled={snapshot.account.notificationPreferences.browserPush === true} emailActive={snapshot.account.notificationPreferences.email === true} onEnabled={async () => { if (user) await loadRoom(user, true); }} /></div></> : automaticGenerationRequired && hasOriginalHistory ? <div className="container player-room-memory"><div className="founding-field-note"><CalendarDays size={18}/><div><strong>Your original Review is already here.</strong><p>{connectivity.online ? "BoardSignal is building the next eligible LIVE Review from your preserved seven-day cadence." : "Reconnect before BoardSignal retrieves new Chess.com games for your next Review."}</p></div></div>{connectivity.online ? <UniversalPlayerDesk requestedUsername={snapshot.account.chessCom.canonicalUsername} ownerToken={token} cadenceAnchor={originalCadenceAnchor} onFactualReviewReady={saveFactualReview} onDeskPublished={publishDesk} embedded /> : null}</div> : null}',
    '{snapshot.pendingFactualReview ? <UniversalPlayerDesk requestedUsername={snapshot.account.chessCom.canonicalUsername} ownerToken={token} cadenceAnchor={snapshot.account.cadenceAnchor} pendingFactualReview={snapshot.pendingFactualReview} onFactualReviewReady={saveFactualReview} onDeskPublished={publishDesk} embedded /> : latest ? <><AuthenticatedUniverseProvider pulse={snapshot.pulse} unavailable={snapshot.pulseUnavailable}><UniversalPlayerDesk requestedUsername={latest.desk.player.username} publishedDesk={latest.desk} publishedEngineResults={latest.engineResults} presentationMode="player-room" embedded /></AuthenticatedUniverseProvider><div className="container player-room-memory g3-review-journal-slot"><PlayerReviewJournal review={{ reviewKey: latest.summary.deskKey, periodStart: latest.summary.periodStart, periodEnd: latest.summary.periodEnd, periodLabel: latest.summary.periodLabel }} token={token} online={connectivity.online} journal={snapshot.reviewJournal} onJournalChanged={handleJournalChanged} /></div><div className="container player-room-memory g3-post-review">{latest ? <ShareMomentsSection moments={(snapshot.shareMoments ?? []).filter((moment) => moment.deskKey === latest.summary.deskKey).slice(0, 3)} /> : null}<DeskReturnChannelPrompt uid={snapshot.account.uid} idToken={token} browserPushEnabled={snapshot.account.notificationPreferences.browserPush === true} emailActive={snapshot.account.notificationPreferences.email === true} onEnabled={async () => { if (user) await loadRoom(user, true); }} /></div></> : automaticGenerationRequired && hasOriginalHistory ? <div className="container player-room-memory"><div className="founding-field-note"><CalendarDays size={18}/><div><strong>Your original Review is already here.</strong><p>{connectivity.online ? "BoardSignal is building the next eligible LIVE Review from your preserved seven-day cadence." : "Reconnect before BoardSignal retrieves new Chess.com games for your next Review."}</p></div></div>{connectivity.online ? <UniversalPlayerDesk requestedUsername={snapshot.account.chessCom.canonicalUsername} ownerToken={token} cadenceAnchor={originalCadenceAnchor} onFactualReviewReady={saveFactualReview} onDeskPublished={publishDesk} embedded /> : null}</div> : null}',
)
replace_once(
    "src/components/BoardSignalPlayerRoom.tsx",
    '{tab === "progress" ? <section id="player-room-panel-progress" role="tabpanel" aria-labelledby="player-room-tab-progress" className="g3-room-panel"><div className="container player-room-memory"><ProgressSection history={reviewHistory} reportPeriods={reportPeriods} coverage={snapshot.historyCoverage} progress={snapshot.progress} patterns={snapshot.recurringPatterns} records={snapshot.personalRecords} /></div></section> : null}',
    '{tab === "progress" ? <section id="player-room-panel-progress" role="tabpanel" aria-labelledby="player-room-tab-progress" className="g3-room-panel"><div className="container player-room-memory"><ProgressSection history={reviewHistory} reportPeriods={reportPeriods} coverage={snapshot.historyCoverage} progress={snapshot.progress} patterns={snapshot.recurringPatterns} records={snapshot.personalRecords} token={token} online={connectivity.online} journal={snapshot.reviewJournal} onJournalChanged={handleJournalChanged} /></div></section> : null}',
)
replace_once(
    "src/components/BoardSignalPlayerRoom.tsx",
    'function ReviewHistorySection({ history, reportPeriods, embedded = false }: { history: CompletedReviewHistoryItem[]; reportPeriods: CanonicalReportPeriod[]; embedded?: boolean }) {',
    'function ReviewHistorySection({ history, reportPeriods, token, online, journal, onJournalChanged, embedded = false }: { history: CompletedReviewHistoryItem[]; reportPeriods: CanonicalReportPeriod[]; token: string; online: boolean; journal: ReviewJournal; onJournalChanged: (journal: ReviewJournal) => void; embedded?: boolean }) {',
)
replace_once(
    "src/components/BoardSignalPlayerRoom.tsx",
    'return <article key={review.reviewKey} className="g41-review-card"><span>WEEK {index + 1} · REVIEW · {reviewHistoryLifecycleLabel(review)}</span><strong>{review.periodLabel}</strong><p>{review.games} games · {review.wins}W · {review.draws}D · {review.losses}L · {review.scorePct.toFixed(1)}%</p><p>{review.headline}</p>{review.source === "original_beta" ? <><small>{review.sourceRichness} · {review.provenanceLabel}</small>{review.green ? <p><b>Green:</b> {review.green.title}</p> : null}{review.red ? <p><b>Red:</b> {review.red.title}</p> : null}{review.blue ? <p><b>Blue:</b> {review.blue.copy || review.blue.title}</p> : null}{review.publicCoverageHref ? <Link className="text-link" href={review.publicCoverageHref}>Open historical public story</Link> : null}</> : null}</article>;',
    'return <article key={review.reviewKey} className="g41-review-card"><span>WEEK {index + 1} · REVIEW · {reviewHistoryLifecycleLabel(review)}</span><strong>{review.periodLabel}</strong><p>{review.games} games · {review.wins}W · {review.draws}D · {review.losses}L · {review.scorePct.toFixed(1)}%</p><p>{review.headline}</p>{review.source === "original_beta" ? <><small>{review.sourceRichness} · {review.provenanceLabel}</small>{review.green ? <p><b>Green:</b> {review.green.title}</p> : null}{review.red ? <p><b>Red:</b> {review.red.title}</p> : null}{review.blue ? <p><b>Blue:</b> {review.blue.copy || review.blue.title}</p> : null}{review.publicCoverageHref ? <Link className="text-link" href={review.publicCoverageHref}>Open historical public story</Link> : null}</> : null}<PlayerReviewJournal review={{ reviewKey: review.reviewKey, periodStart: review.periodStart, periodEnd: review.periodEnd, periodLabel: review.periodLabel }} token={token} online={online} journal={journal} onJournalChanged={onJournalChanged} compact /></article>;',
)
replace_once(
    "src/components/BoardSignalPlayerRoom.tsx",
    'function ProgressSection({ history, reportPeriods, coverage, progress, patterns, records }: { history: CompletedReviewHistoryItem[]; reportPeriods: CanonicalReportPeriod[]; coverage?: ReviewHistoryCoverage; progress: ProgressSeries[]; patterns: RecurringPattern[]; records: PersonalRecords }) {',
    'function ProgressSection({ history, reportPeriods, coverage, progress, patterns, records, token, online, journal, onJournalChanged }: { history: CompletedReviewHistoryItem[]; reportPeriods: CanonicalReportPeriod[]; coverage?: ReviewHistoryCoverage; progress: ProgressSeries[]; patterns: RecurringPattern[]; records: PersonalRecords; token: string; online: boolean; journal: ReviewJournal; onJournalChanged: (journal: ReviewJournal) => void }) {',
)
replace_once(
    "src/components/BoardSignalPlayerRoom.tsx",
    '    <div className="personal-record-strip"><BarChart3 size={18} /><div><span>Personal record</span><strong>{records.personalBestWinRun} straight wins</strong></div><div><span>Game-bearing Reviews completed</span><strong>{records.desksCompleted}</strong></div></div>\n',
    '    <div className="personal-record-strip"><BarChart3 size={18} /><div><span>Personal record</span><strong>{records.personalBestWinRun} straight wins</strong></div><div><span>Game-bearing Reviews completed</span><strong>{records.desksCompleted}</strong></div></div>\n    <PlayerReviewNotesTimeline token={token} online={online} journal={journal} onJournalChanged={onJournalChanged} />\n',
)
replace_once(
    "src/components/BoardSignalPlayerRoom.tsx",
    '<details className="g3-disclosure g3-review-history-disclosure" open><summary>WEEKLY REPORT HISTORY</summary><div className="g3-disclosure-body"><ReviewHistorySection history={history} reportPeriods={reportPeriods} embedded /></div></details>',
    '<details className="g3-disclosure g3-review-history-disclosure" open><summary>WEEKLY REPORT HISTORY</summary><div className="g3-disclosure-body"><ReviewHistorySection history={history} reportPeriods={reportPeriods} token={token} online={online} journal={journal} onJournalChanged={onJournalChanged} embedded /></div></details>',
)

replace_once(
    "src/components/OfflinePlayerRoom.tsx",
    'import PlayerRoomQuickRead from "@/components/PlayerRoomQuickRead";\n',
    'import PlayerRoomQuickRead from "@/components/PlayerRoomQuickRead";\nimport PlayerReviewJournal, { PlayerReviewNotesTimeline } from "@/components/PlayerReviewJournal";\n',
)
replace_once(
    "src/components/OfflinePlayerRoom.tsx",
    '{selectedDesk ? <div aria-label="Saved Review read only"><UniversalPlayerDesk requestedUsername={selectedDesk.desk.player.username} publishedDesk={selectedDesk.desk} publishedEngineResults={selectedDesk.engineResults} presentationMode="player-room" embedded/></div> : <div className="container offline-empty-card">No completed Review was saved yet.</div>}',
    '{selectedDesk ? <><div aria-label="Saved Review read only"><UniversalPlayerDesk requestedUsername={selectedDesk.desk.player.username} publishedDesk={selectedDesk.desk} publishedEngineResults={selectedDesk.engineResults} presentationMode="player-room" embedded/></div><div className="container player-room-memory g3-review-journal-slot"><PlayerReviewJournal review={{ reviewKey: selectedDesk.summary.deskKey, periodStart: selectedDesk.summary.periodStart, periodEnd: selectedDesk.summary.periodEnd, periodLabel: selectedDesk.summary.periodLabel }} token="" online={false} journal={snapshot.reviewJournal ?? { version: 1, notes: [] }} onJournalChanged={() => undefined} /></div></> : <div className="container offline-empty-card">No completed Review was saved yet.</div>}',
)
replace_once(
    "src/components/OfflinePlayerRoom.tsx",
    '<div className="personal-record-strip"><BarChart3 size={18}/><div><span>Saved personal record</span><strong>{snapshot.personalRecords.personalBestWinRun} straight wins</strong></div><div><span>Reviews completed</span><strong>{snapshot.personalRecords.desksCompleted}</strong></div></div></section></div> : null}',
    '<div className="personal-record-strip"><BarChart3 size={18}/><div><span>Saved personal record</span><strong>{snapshot.personalRecords.personalBestWinRun} straight wins</strong></div><div><span>Reviews completed</span><strong>{snapshot.personalRecords.desksCompleted}</strong></div></div><PlayerReviewNotesTimeline token="" online={false} journal={snapshot.reviewJournal ?? { version: 1, notes: [] }} onJournalChanged={() => undefined} /></section></div> : null}',
)

replace_once(
    "src/app/boardsignal/privacy/page.tsx",
    '<h2>Private Player Room data</h2><p>Your completed Reviews, Red, private Amber, Blue, reviewed-position evidence, recurrence, private progress, messages, contact details and notification registrations are owner-only data. They are not written into public player or public coverage collections.</p>',
    '<h2>Private Player Room data</h2><p>Your completed Reviews, Red, private Amber, Blue, reviewed-position evidence, recurrence, private progress, player-authored Review notes, messages, contact details and notification registrations are owner-only data. Review notes stay separate from BoardSignal\'s Review facts and are not written into public player, Universe, public coverage or Trustpilot payloads.</p>',
)
replace_once(
    "src/app/boardsignal/privacy/page.tsx",
    '<h2>Retention</h2><p>BoardSignal retains at most four completed Reviews per player. When Review 5 publishes, full Review 1 expires and Reviews 2–5 remain. Small durable personal records may remain only where the existing memory model supports them.</p>',
    '<h2>Retention</h2><p>BoardSignal retains at most four completed Reviews per player. When Review 5 publishes, full Review 1 expires and Reviews 2–5 remain. Small private player-authored Review notes may outlive an expired full Review as journal memory containing only the Review period/key, note type, note text and note timestamps. A note remains until you delete that note or your account, and account deletion removes the journal.</p>',
)

append_once("BOARD_SIGNAL_PRODUCT_CONTRACT.md", "## Private Review journal", r'''
## Private Review journal

- Player-authored Review notes are a separate private layer: `WHAT I NOTICED`, `WHAT I'LL TRY`, and `FOLLOW-UP`. They never mutate, score, reinterpret or become part of BoardSignal's immutable completed Review truth, Stockfish evidence, rankings or lifecycle.
- Notes are player-private account data. They do not enter Universe, public player pages, public highlights, Share Moments, Founder public coverage, Trustpilot payloads, public Ask BoardSignal context or analytics event bodies.
- The private journal may outlive the four-heavy-Review window as tiny durable memory containing only Review identity/period context, note type/body, note ID and created/updated timestamps. Expired engine payloads, reviewed positions and evidence are not retained to support the journal.
- Journal persistence is bounded to one private document per player at `users/{uid}/private/reviewJournal`, with at most 260 notes and 1,000 characters per note. Reaching the bound must fail visibly; BoardSignal never silently deletes an older note to make room.
- Normal Player Room journal loading adds at most one bounded document read, never one read per note or Review. Add/edit/delete mutations are explicit, transaction-safe, and perform one durable journal-document write after validation; typing never writes to Firestore.
- Saved journal notes may be copied into the existing UID-scoped offline Player Room snapshot for read-only offline access. Offline Add/Edit/Delete remains disabled with an explicit reconnect message unless BoardSignal later adopts a real durable mutation queue.
- Deleting the BoardSignal account recursively deletes the private journal. Deleting a single note deletes only that note and never its Review.
''')

append_once("src/app/boardsignal-player-room-g3.css", "/* Patch J — private Review journal.", r'''
/* Patch J — private Review journal. Neutral signifiers only; note types are not grades. */
.player-room-authenticated .g3-review-journal-slot {
  width: min(100% - 1rem, var(--g3-reading-width));
  padding-block: 1rem;
}

.player-room-authenticated .review-journal,
.player-room-authenticated .review-journal-progress {
  border: 1px solid var(--bs-border);
  border-radius: var(--bs-radius-lg);
  background: var(--bs-surface);
  color: var(--bs-text-primary);
  box-shadow: var(--bs-shadow-1);
}

.player-room-authenticated .review-journal { padding: clamp(1rem, 2.5vw, 1.5rem); }
.player-room-authenticated .review-journal.is-compact { margin-top: 1rem; padding: 1rem; box-shadow: none; }
.player-room-authenticated .review-journal-heading { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
.player-room-authenticated .review-journal-heading h3 { margin: .2rem 0; }
.player-room-authenticated .review-journal-heading p:not(.kicker),
.player-room-authenticated .review-journal-empty,
.player-room-authenticated .review-journal-field-help,
.player-room-authenticated .review-journal-body-label span,
.player-room-authenticated .review-journal-note small,
.player-room-authenticated .review-journal-progress summary small { color: var(--bs-text-secondary); }
.player-room-authenticated .review-journal-heading > span,
.player-room-authenticated .review-journal-period,
.player-room-authenticated .review-journal-note-type { font-size: .75rem; font-weight: 800; letter-spacing: .07em; }
.player-room-authenticated .review-journal-heading > span { padding: .35rem .55rem; border: 1px solid var(--bs-border-strong); border-radius: 999px; }
.player-room-authenticated .review-journal-add,
.player-room-authenticated .review-journal-note-actions button { min-height: 44px; border: 1px solid var(--bs-border-strong); border-radius: var(--bs-radius-md); background: transparent; color: var(--bs-text-primary); font: inherit; font-weight: 800; cursor: pointer; }
.player-room-authenticated .review-journal-add { margin-top: 1rem; padding: .7rem .9rem; }
.player-room-authenticated .review-journal-note-actions button { padding: .55rem .75rem; }
.player-room-authenticated .review-journal-add:disabled,
.player-room-authenticated .review-journal-note-actions button:disabled { cursor: not-allowed; opacity: .7; }
.player-room-authenticated .review-journal-add:focus-visible,
.player-room-authenticated .review-journal-note-actions button:focus-visible,
.player-room-authenticated .review-journal-editor button:focus-visible,
.player-room-authenticated .review-journal-editor textarea:focus-visible,
.player-room-authenticated .review-journal-type-grid input:focus-visible,
.player-room-authenticated .review-journal-progress > summary:focus-visible { outline: 3px solid var(--bs-focus); outline-offset: 3px; }
.player-room-authenticated .review-journal-note-list { display: grid; gap: .75rem; margin-top: 1rem; }
.player-room-authenticated .review-journal-note { padding: 1rem; border: 1px solid var(--bs-border); border-radius: var(--bs-radius-md); background: var(--bs-surface-soft); }
.player-room-authenticated .review-journal-note > p { margin: .55rem 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.player-room-authenticated .review-journal-period { display: block; margin-bottom: .25rem; color: var(--bs-text-secondary); }
.player-room-authenticated .review-journal-note-actions,
.player-room-authenticated .review-journal-editor-actions,
.player-room-authenticated .review-journal-delete-confirm > div { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .75rem; }
.player-room-authenticated .review-journal-editor { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--bs-border); }
.player-room-authenticated .review-journal-editor fieldset { margin: 0; padding: 0; border: 0; }
.player-room-authenticated .review-journal-editor legend,
.player-room-authenticated .review-journal-body-label > strong { font-weight: 800; }
.player-room-authenticated .review-journal-type-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .6rem; margin-top: .75rem; }
.player-room-authenticated .review-journal-type-grid label { display: flex; min-height: 64px; gap: .55rem; align-items: flex-start; padding: .75rem; border: 1px solid var(--bs-border); border-radius: var(--bs-radius-md); cursor: pointer; }
.player-room-authenticated .review-journal-type-grid label.is-selected { border-color: var(--bs-border-strong); background: var(--bs-surface-soft); }
.player-room-authenticated .review-journal-type-grid input { width: 20px; height: 20px; margin-top: .1rem; }
.player-room-authenticated .review-journal-type-grid span,
.player-room-authenticated .review-journal-body-label { display: grid; gap: .2rem; }
.player-room-authenticated .review-journal-type-grid small { color: var(--bs-text-secondary); }
.player-room-authenticated .review-journal-body-label { margin-top: 1rem; }
.player-room-authenticated .review-journal-editor textarea { width: 100%; min-height: 110px; margin-top: .5rem; padding: .75rem; border: 1px solid var(--bs-border-strong); border-radius: var(--bs-radius-md); background: var(--bs-surface); color: var(--bs-text-primary); font: inherit; resize: vertical; }
.player-room-authenticated .review-journal-editor-meta { display: flex; justify-content: space-between; gap: .75rem; margin-top: .35rem; }
.player-room-authenticated .review-journal-error,
.player-room-authenticated .review-journal-offline { margin-top: .75rem; color: var(--bs-text-secondary); }
.player-room-authenticated .review-journal-delete-confirm { margin-top: .75rem; padding: .75rem; border: 1px solid var(--bs-border-strong); border-radius: var(--bs-radius-md); }
.player-room-authenticated .review-journal-progress { margin: 1rem 0; }
.player-room-authenticated .review-journal-progress > summary { min-height: 48px; display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: 1rem; cursor: pointer; }
.player-room-authenticated .review-journal-progress > summary span { display: grid; gap: .2rem; }
.player-room-authenticated .review-journal-progress-body { padding: 0 1rem 1rem; }
@media (max-width: 720px) {
  .player-room-authenticated .review-journal-type-grid { grid-template-columns: 1fr; }
  .player-room-authenticated .review-journal-heading,
  .player-room-authenticated .review-journal-editor-meta,
  .player-room-authenticated .review-journal-progress > summary { align-items: stretch; flex-direction: column; }
}
''')

write_new("tests/boardsignal-patch-j-review-journal.test.cjs", r'''
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const shared = read('src/lib/boardsignal/reviewJournal.ts');
const server = read('src/lib/boardsignal/server/reviewJournal.ts');
const route = read('src/app/api/boardsignal/review-journal/route.ts');
const roomRoute = read('src/app/api/boardsignal/player-room/route.ts');
const room = read('src/components/BoardSignalPlayerRoom.tsx');
const journalUi = read('src/components/PlayerReviewJournal.tsx');
const offlineRoom = read('src/components/OfflinePlayerRoom.tsx');
const offlineTypes = read('src/lib/boardsignal/offline/types.ts');
const offlineSnapshots = read('src/lib/boardsignal/offline/snapshots.ts');
const deletion = read('src/lib/boardsignal/server/accountDeletion.ts');
const privacy = read('src/app/boardsignal/privacy/page.tsx');
const contract = read('BOARD_SIGNAL_PRODUCT_CONTRACT.md');
const css = read('src/app/boardsignal-player-room-g3.css');
const trustpilot = read('src/app/api/boardsignal/trustpilot-invitation/route.ts');
const publicProfile = read('src/lib/boardsignal/server/publicProfile.ts');
const universe = read('src/lib/boardsignal/server/universePulse.ts');
const guide = read('src/lib/boardsignal/server/guide.ts');

test('Patch J defines all three plainly labelled private note types and bounded input', () => {
  assert.match(shared, /noticed:[\s\S]*label: "WHAT I NOTICED"/);
  assert.match(shared, /try_next:[\s\S]*label: "WHAT I'LL TRY"/);
  assert.match(shared, /follow_up:[\s\S]*label: "FOLLOW-UP"/);
  assert.match(shared, /REVIEW_JOURNAL_MAX_NOTE_LENGTH = 1000/);
  assert.match(shared, /REVIEW_JOURNAL_MAX_NOTES = 260/);
  assert.match(server, /REVIEW_JOURNAL_EMPTY_NOTE/);
  assert.match(server, /REVIEW_JOURNAL_NOTE_TOO_LONG/);
  assert.match(journalUi, /maxLength=\{REVIEW_JOURNAL_MAX_NOTE_LENGTH\}/);
});

test('mutations are authenticated, UID-derived, validated, private and transaction safe', () => {
  assert.equal((route.match(/requirePlayerToken\(request\)/g) || []).length, 3);
  assert.equal((route.match(/token\.uid/g) || []).length, 3);
  assert.doesNotMatch(route, /body\.uid|uid:\s*body/);
  assert.match(route, /private, no-store/);
  assert.match(route, /"Vary": "Authorization"/);
  assert.match(server, /collection\("users"\)\.doc\(uid\)\.collection\("private"\)\.doc\("reviewJournal"\)/);
  assert.equal((server.match(/runTransaction/g) || []).length, 3);
  assert.match(server, /const next = \{ \.\.\.notes, \[noteId\]: note \}/);
  assert.match(server, /const next = \{ \.\.\.notes, \[noteId\]: \{ \.\.\.existing, type, body, updatedAt: now \} \}/);
  assert.match(server, /createdAt: now, updatedAt: now/);
  assert.match(server, /delete next\[noteId\]/);
});

test('completed Review truth is never mutated by journal persistence', () => {
  assert.doesNotMatch(server, /collection\("desks"\)|engineResults|signals|reviewLifecycle|rank/i);
  assert.match(contract, /never mutate, score, reinterpret or become part of BoardSignal's immutable completed Review truth/);
  assert.match(journalUi, /do not change BoardSignal's Review/);
  assert.match(journalUi, /This removes only this private note\. Your BoardSignal Review stays unchanged/);
});

test('journal loading is one bounded document read and never O(number of Reviews)', () => {
  const loader = server.slice(server.indexOf('export async function loadReviewJournal'), server.indexOf('export async function addReviewJournalNote'));
  assert.equal((loader.match(/\.get\(\)/g) || []).length, 1);
  assert.doesNotMatch(loader, /for\s*\(|\.map\([\s\S]*\.get\(/);
  assert.equal((roomRoute.match(/loadReviewJournal\(account\.uid\)/g) || []).length, 1);
  assert.match(contract, /at most one bounded document read/);
});

test('durable journal survives heavy Review rotation without retaining evidence payloads', () => {
  assert.match(server, /collection\("private"\)\.doc\("reviewJournal"\)/);
  assert.doesNotMatch(server, /engineResults|evidence|reviewed.position|stockfish/i);
  assert.match(shared, /reviewKey: string;[\s\S]*periodStart: string;[\s\S]*periodEnd: string;[\s\S]*periodLabel: string;/);
  assert.match(shared, /type: ReviewJournalNoteType;[\s\S]*body: string;[\s\S]*createdAt: string;[\s\S]*updatedAt: string;/);
  assert.match(contract, /Expired engine payloads, reviewed positions and evidence are not retained/);
});

test('account deletion and public/privacy isolation are explicit', () => {
  assert.match(deletion, /PRIVATE_PLAYER_SUBCOLLECTIONS[\s\S]*"private"/);
  assert.match(privacy, /player-authored Review notes/);
  assert.match(privacy, /account deletion removes the journal/);
  for (const publicSource of [trustpilot, publicProfile, universe]) {
    assert.doesNotMatch(publicSource, /reviewJournal|ReviewJournalNote|WHAT I NOTICED|WHAT I'LL TRY|FOLLOW-UP/);
  }
  assert.doesNotMatch(guide, /reviewJournal|ReviewJournalNote/);
  assert.doesNotMatch(roomRoute, /recordGuidePlayerRoomSnapshot\([^;]*reviewJournal/);
  assert.match(contract, /do not enter Universe, public player pages, public highlights, Share Moments, Founder public coverage, Trustpilot payloads/);
});

test('PWA keeps synced notes readable and disables offline mutation', () => {
  assert.match(offlineTypes, /reviewJournal\?: ReviewJournal/);
  assert.match(offlineSnapshots, /reviewJournal: input\.reviewJournal \?\? \{ version: 1, notes: \[\] \}/);
  assert.match(room, /savePlayerRoomOfflineSnapshot\(user\.uid, next\)/);
  assert.match(offlineRoom, /PlayerReviewJournal[\s\S]*online=\{false\}/);
  assert.match(offlineRoom, /PlayerReviewNotesTimeline[\s\S]*online=\{false\}/);
  assert.match(journalUi, /Reconnect to update your notes/);
  assert.match(journalUi, /disabled=\{!online \|\| busy\}/);
});

test('UI uses progressive disclosure, explicit actions and mobile-accessible controls', () => {
  assert.match(journalUi, /\+ ADD A NOTE/);
  assert.match(journalUi, /Save note/);
  assert.match(journalUi, /Save changes/);
  assert.match(journalUi, />Cancel</);
  assert.match(journalUi, /Delete note/);
  assert.match(journalUi, /Confirm note deletion/);
  assert.match(journalUi, /<legend>Choose a note type<\/legend>/);
  assert.match(journalUi, /htmlFor=\{`\$\{fieldId\}-body`\}/);
  assert.match(journalUi, /<details className="review-journal-progress">/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /var\(--bs-text-primary\)/);
  assert.match(css, /var\(--bs-text-secondary\)/);
});
''')

print("PATCH_J_EXACT_TRANSFORM_COMPLETE")
