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
