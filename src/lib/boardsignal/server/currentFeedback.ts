import "server-only";

import type {
  BoardSignalCurrentFeedback,
  BoardSignalCurrentFeedbackItem,
  BoardSignalCurrentReaction,
} from "@/lib/boardsignal/account";
import type { CurrentEpisodeSummary } from "@/lib/boardsignal/memory";
import { getAdminDb } from "@/utils/firebaseAdmin";

const MAX_CURRENT_FEEDBACK_ITEMS = 12;

export class CurrentBoardSignalFeedbackError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "CurrentBoardSignalFeedbackError";
    this.code = code;
    this.status = status;
  }
}

function cleanDate(value: unknown, label: string) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(`${text}T00:00:00Z`))) {
    throw new CurrentBoardSignalFeedbackError("CURRENT_FEEDBACK_INVALID_PERIOD", `${label} is invalid.`);
  }
  return text;
}

function cleanItemKey(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!/^m2:\d{4}-\d{2}-\d{2}:[a-z_]+:[a-z0-9]+$/.test(text) || text.length > 180) {
    throw new CurrentBoardSignalFeedbackError("CURRENT_FEEDBACK_INVALID_ITEM", "That Current BoardSignal item is invalid.");
  }
  return text;
}

function cleanReaction(value: unknown): BoardSignalCurrentReaction {
  if (value === "helpful" || value === "not_helpful") return value;
  throw new CurrentBoardSignalFeedbackError("CURRENT_FEEDBACK_INVALID_REACTION", "Choose whether this Current BoardSignal was helpful.");
}

function validItems(value: unknown): BoardSignalCurrentFeedbackItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is BoardSignalCurrentFeedbackItem => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as BoardSignalCurrentFeedbackItem;
    return typeof candidate.itemKey === "string"
      && (candidate.reaction === "helpful" || candidate.reaction === "not_helpful")
      && typeof candidate.reactedAt === "string";
  }).slice(0, MAX_CURRENT_FEEDBACK_ITEMS);
}

export async function recordCurrentBoardSignalFeedback(uid: string, input: unknown): Promise<BoardSignalCurrentFeedback> {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const periodStart = cleanDate(body.periodStart, "Current period start");
  const periodEnd = cleanDate(body.periodEnd, "Current period end");
  const itemKey = cleanItemKey(body.itemKey);
  const reaction = cleanReaction(body.reaction);
  if (!itemKey.startsWith(`m2:${periodStart}:`)) {
    throw new CurrentBoardSignalFeedbackError("CURRENT_FEEDBACK_INVALID_ITEM", "That feedback item does not belong to this Current BoardSignal.");
  }

  const ref = getAdminDb().collection("users").doc(uid);
  return getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new CurrentBoardSignalFeedbackError("CURRENT_FEEDBACK_ACCOUNT_NOT_FOUND", "This BoardSignal account could not be found.", 404);
    const account = snapshot.data() as {
      accessStatus?: string;
      currentEpisodeSummary?: CurrentEpisodeSummary;
      currentBoardSignalFeedback?: BoardSignalCurrentFeedback;
    };
    if (account.accessStatus && account.accessStatus !== "active") {
      throw new CurrentBoardSignalFeedbackError("CURRENT_FEEDBACK_ACCESS_INACTIVE", "This BoardSignal access is not active.", 403);
    }
    const current = account.currentEpisodeSummary;
    if (!current || current.periodStart !== periodStart || current.periodEnd !== periodEnd) {
      throw new CurrentBoardSignalFeedbackError("CURRENT_FEEDBACK_PERIOD_CHANGED", "Your Current BoardSignal has moved on. Refresh before rating this item.", 409);
    }

    const existingFeedback = account.currentBoardSignalFeedback;
    const existingItems = existingFeedback?.periodStart === periodStart && existingFeedback.periodEnd === periodEnd
      ? validItems(existingFeedback.items)
      : [];
    const existing = existingItems.find((item) => item.itemKey === itemKey);
    if (existing?.reaction === reaction) {
      return { periodStart, periodEnd, items: existingItems };
    }

    const item: BoardSignalCurrentFeedbackItem = { itemKey, reaction, reactedAt: new Date().toISOString() };
    const items = [item, ...existingItems.filter((candidate) => candidate.itemKey !== itemKey)].slice(0, MAX_CURRENT_FEEDBACK_ITEMS);
    const feedback: BoardSignalCurrentFeedback = { periodStart, periodEnd, items };
    transaction.set(ref, { currentBoardSignalFeedback: feedback }, { merge: true });
    return feedback;
  });
}
