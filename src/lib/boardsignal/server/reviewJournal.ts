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
import { recordFounderNoteActivityByUid } from "./founderEngagement";

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

async function projectJournal(uid: string, journal: ReviewJournal, created: boolean) {
  if (!journal.updatedAt) return;
  await recordFounderNoteActivityByUid({
    uid,
    noteCount: journal.notes.length,
    created,
    at: journal.updatedAt,
  }).catch(() => undefined);
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
  const journal = await getAdminDb().runTransaction(async (transaction) => {
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
  await projectJournal(uid, journal, true);
  return journal;
}

export async function editReviewJournalNote(uid: string, input: unknown) {
  const bodyInput = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const noteId = cleanSingleLine(bodyInput.noteId, "Note ID", 80);
  const type = cleanType(bodyInput.type);
  const body = cleanBody(bodyInput.body);
  const ref = journalRef(uid);
  const journal = await getAdminDb().runTransaction(async (transaction) => {
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
  await projectJournal(uid, journal, false);
  return journal;
}

export async function deleteReviewJournalNote(uid: string, input: unknown) {
  const bodyInput = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const noteId = cleanSingleLine(bodyInput.noteId, "Note ID", 80);
  const ref = journalRef(uid);
  const journal = await getAdminDb().runTransaction(async (transaction) => {
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
  await projectJournal(uid, journal, false);
  return journal;
}
