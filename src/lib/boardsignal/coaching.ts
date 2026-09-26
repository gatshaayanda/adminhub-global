import type { ActiveWeekGuidanceFamily, ActiveWeekNextGameGuidance, ActiveWeekSupportingFact, CurrentEpisodeWithNextGameGuidance } from "./activeWeekGuidance";
import type { BoardSignalCoachingExample, BoardSignalCoachingFeedbackItem, BoardSignalCoachingLevel, BoardSignalCoachingPresentation, BoardSignalCoachingState, BoardSignalCurrentFeedbackItem, BoardSignalCurrentReaction, BoardSignalLegacyCurrentFeedbackItem } from "./account";

export const M7_COACHING_SCHEMA_VERSION = 2 as const;
export const M7_CONCURRENT_SESSION_COALESCE_MS = 90_000;
export const M7_MAX_PRESENTED_SESSION_IDS = 8;
export const M7_MAX_EXAMPLES = 6;

const FAMILY_ACTIONABILITY: Partial<Record<ActiveWeekGuidanceFamily, number>> = {
  clock_conversion: 100,
  queen_safety: 96,
  king_safety: 94,
  forcing_reply: 90,
  material_conversion: 84,
  loss_run: 68,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}

function omitUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined).map((item) => omitUndefinedDeep(item)) as T;
  }
  if (!isPlainObject(value)) return value;
  const cleaned: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue;
    cleaned[key] = omitUndefinedDeep(item);
  }
  return cleaned as T;
}

export function firestoreSafeCoachingState(state: BoardSignalCoachingState): BoardSignalCoachingState {
  return omitUndefinedDeep(state);
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function coachingSignalKeyForEpisode(episode: CurrentEpisodeWithNextGameGuidance) {
  const guidance = episode.nextGameGuidance;
  if (guidance.status === "insufficient_evidence") return undefined;
  if (!guidance.title?.trim() || !guidance.copy?.trim()) return undefined;
  if (guidance.source === "previous_review") {
    const identity = guidance.family ?? stableHash(`${guidance.previousReviewPeriod ?? "review"}|${guidance.title}|${guidance.copy}`);
    return `m7:${episode.periodStart}:previous:${stableHash(guidance.previousReviewPeriod ?? "review")}:${identity}`;
  }
  if (!guidance.family) return undefined;
  return `m7:${episode.periodStart}:current:${guidance.family}`;
}

export function coachingProvenance(guidance: ActiveWeekNextGameGuidance): BoardSignalCoachingState["provenance"] {
  return guidance.source === "previous_review" ? "previous_review" : "current_period";
}

function exampleFromFact(fact: ActiveWeekSupportingFact): BoardSignalCoachingExample | undefined {
  const id = String(fact.id ?? "").trim();
  const summary = String(fact.summary ?? "").trim();
  if (!id || !summary || (!fact.gameId && !fact.gameUrl)) return undefined;
  return {
    id,
    ...(fact.gameId !== undefined ? { gameId: fact.gameId } : {}),
    ...(fact.gameUrl !== undefined ? { gameUrl: fact.gameUrl } : {}),
    ...(fact.occurredAt !== undefined ? { occurredAt: fact.occurredAt } : {}),
    ...(fact.opponent !== undefined ? { opponent: fact.opponent } : {}),
    ...(fact.opponentRating !== undefined ? { opponentRating: fact.opponentRating } : {}),
    ...(fact.pool !== undefined ? { pool: fact.pool } : {}),
    ...(fact.moveNumber !== undefined ? { moveNumber: fact.moveNumber } : {}),
    ...(fact.movePlayed !== undefined ? { movePlayed: fact.movePlayed } : {}),
    ...(fact.opponentReply !== undefined ? { opponentReply: fact.opponentReply } : {}),
    summary,
  };
}

export function coachingExamplesForEpisode(episode: CurrentEpisodeWithNextGameGuidance) {
  if (episode.nextGameGuidance.source === "previous_review") return [] as BoardSignalCoachingExample[];
  const seen = new Set<string>();
  return episode.nextGameGuidance.supportingFacts
    .map(exampleFromFact)
    .filter((item): item is BoardSignalCoachingExample => Boolean(item))
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, M7_MAX_EXAMPLES);
}

export function naturalEvidenceRatio(evidenceCount: number, gamesConsidered: number) {
  if (gamesConsidered <= 0 || evidenceCount <= 0) return "";
  const ratio = evidenceCount / gamesConsidered;
  if (ratio >= .9) return "nearly all";
  if (ratio >= .72) return "about three quarters";
  if (ratio >= .6) return "about two thirds";
  if (ratio >= .45 && ratio <= .55) return "about half";
  if (ratio >= .35) return "almost half";
  if (ratio >= .22) return "about a quarter";
  if (ratio >= .12) return "a noticeable minority";
  return "a small number";
}

const LEVEL_TWO_EXPLANATION: Record<ActiveWeekGuidanceFamily, (ratio: string) => string> = {
  clock_conversion: (ratio) => `Put more simply: the clock is part of the position. ${ratio ? `BoardSignal has seen this in ${ratio} of the games checked, so ` : ""}before a calculation gets long, look at the time you still need to choose and actually make the move.`,
  queen_safety: (ratio) => `Put more simply: after you find a queen move you like, pause before playing it and scan the opponent's immediate checks and captures. ${ratio ? `That kind of moment has appeared in ${ratio} of the games checked.` : ""}`,
  king_safety: (ratio) => `Put more simply: before committing your move, look first for any forcing reply that reaches your king. ${ratio ? `BoardSignal has seen this kind of moment in ${ratio} of the games checked.` : ""}`,
  forcing_reply: (ratio) => `Put more simply: do not calculate only your own plan. First ask what the opponent can force immediately with a check or capture. ${ratio ? `That pattern has appeared in ${ratio} of the games checked.` : ""}`,
  material_conversion: (ratio) => `Put more simply: before you commit a piece, count what the opponent can take right away. ${ratio ? `BoardSignal has seen that issue in ${ratio} of the games checked.` : ""}`,
  loss_run: () => "Put more simply: the current result run is a scoreboard fact, not a chess diagnosis. Start the next game from the new board and make that position's decision without carrying the last result into it.",
};

export function levelTwoExplanation(guidance: ActiveWeekNextGameGuidance) {
  if (guidance.source === "previous_review") return "Put more simply: this is still the cue from your last completed Review. The current period has not produced enough supported evidence to replace it, so BoardSignal is keeping the older lesson explicit instead of inventing a new one.";
  if (!guidance.family) return "Put more simply: keep the same next-game instruction in front of you. BoardSignal is explaining the same cue, not switching to a different weakness.";
  return LEVEL_TWO_EXPLANATION[guidance.family](naturalEvidenceRatio(Number(guidance.evidenceCount ?? 0), Number(guidance.gamesConsidered ?? 0))).trim();
}

export type CoachingCandidate = {
  key: string;
  family?: string;
  source: string;
  provenance: BoardSignalCoachingState["provenance"];
  cueTitle: string;
  cueCopy: string;
  level2Copy: string;
  periodStart: string;
  periodEnd: string;
  evidenceCount: number;
  gamesConsidered: number;
  previousReviewPeriod?: string;
  examples: BoardSignalCoachingExample[];
};

export function coachingCandidateForEpisode(episode: CurrentEpisodeWithNextGameGuidance): CoachingCandidate | undefined {
  const key = coachingSignalKeyForEpisode(episode);
  const guidance = episode.nextGameGuidance;
  if (!key || !guidance.title || !guidance.copy) return undefined;
  return {
    key,
    ...(guidance.family !== undefined ? { family: guidance.family } : {}),
    source: guidance.source,
    provenance: coachingProvenance(guidance),
    cueTitle: guidance.title,
    cueCopy: guidance.copy,
    level2Copy: levelTwoExplanation(guidance),
    periodStart: episode.periodStart,
    periodEnd: episode.periodEnd,
    evidenceCount: Math.max(0, Math.floor(Number(guidance.evidenceCount ?? 0))),
    gamesConsidered: Math.max(0, Math.floor(Number(guidance.gamesConsidered ?? 0))),
    ...(guidance.previousReviewPeriod !== undefined ? { previousReviewPeriod: guidance.previousReviewPeriod } : {}),
    examples: coachingExamplesForEpisode(episode),
  };
}

function familyActionability(value?: string) {
  return value && value in FAMILY_ACTIONABILITY ? FAMILY_ACTIONABILITY[value as ActiveWeekGuidanceFamily] ?? 0 : 0;
}

export function shouldReplaceIncumbentSignal(
  incumbent: Pick<BoardSignalCoachingState, "periodStart" | "family" | "provenance" | "evidenceCount" | "gamesConsidered">,
  candidate: CoachingCandidate,
) {
  if (incumbent.periodStart !== candidate.periodStart) return true;
  if (incumbent.provenance === "previous_review" && candidate.provenance === "current_period") return true;
  if (incumbent.provenance === "current_period" && candidate.provenance === "previous_review") return false;
  if (incumbent.family === candidate.family) return false;
  if (incumbent.family === "loss_run" && candidate.family !== "loss_run") return true;
  const evidenceLead = candidate.evidenceCount - Math.max(0, incumbent.evidenceCount);
  const candidateActionability = familyActionability(candidate.family);
  const incumbentActionability = familyActionability(incumbent.family);
  if (evidenceLead >= 2) return true;
  if (candidate.evidenceCount >= Math.max(0, incumbent.evidenceCount) && candidateActionability >= incumbentActionability + 15) return true;
  return false;
}

function uniqueExamples(items: BoardSignalCoachingExample[]) {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, M7_MAX_EXAMPLES);
}

function hasRealExample(state: Pick<BoardSignalCoachingState, "examples" | "selectedExampleSnapshot">) {
  return (state.examples ?? []).length > 0 || Boolean(state.selectedExampleSnapshot);
}

export function coachingVariantsForState(state: Pick<BoardSignalCoachingState, "examples" | "selectedExampleSnapshot">): BoardSignalCoachingLevel[] {
  return hasRealExample(state) ? [1, 2, 3] : [1, 2];
}

function nextVariantAfter(state: Pick<BoardSignalCoachingState, "examples" | "selectedExampleSnapshot">, level: BoardSignalCoachingLevel) {
  const variants = coachingVariantsForState(state);
  const index = variants.indexOf(level);
  return variants[(index >= 0 ? index + 1 : 0) % variants.length];
}

export function automaticVariantCursorForState(state: Pick<BoardSignalCoachingState, "level" | "automaticVariantCursor" | "examples" | "selectedExampleSnapshot">) {
  const variants = coachingVariantsForState(state);
  if (state.automaticVariantCursor && variants.includes(state.automaticVariantCursor)) return state.automaticVariantCursor;
  if (!variants.includes(state.level)) return variants[0];
  return nextVariantAfter(state, state.level);
}

export function selectedCoachingExample(state: Pick<BoardSignalCoachingState, "examples" | "selectedExampleId" | "selectedExampleSnapshot">) {
  const examples = uniqueExamples(state.examples ?? []);
  return state.selectedExampleId ? examples.find((example) => example.id === state.selectedExampleId) ?? state.selectedExampleSnapshot : state.selectedExampleSnapshot ?? examples[0];
}

export function activeCoachingPresentationCopy(state: Pick<BoardSignalCoachingState, "level" | "cueTitle" | "cueCopy" | "level2Copy" | "examples" | "selectedExampleId" | "selectedExampleSnapshot">) {
  if (state.level === 2) return { title: state.cueTitle, copy: state.level2Copy };
  if (state.level === 3) {
    const selected = selectedCoachingExample(state);
    if (selected?.summary) return { title: state.cueTitle, copy: selected.summary };
  }
  return { title: state.cueTitle, copy: state.cueCopy };
}

export function stateForNewCandidate(candidate: CoachingCandidate, nowIso: string): BoardSignalCoachingState {
  const selected = candidate.examples[0];
  return {
    schemaVersion: M7_COACHING_SCHEMA_VERSION,
    coachingSignalKey: candidate.key,
    periodStart: candidate.periodStart,
    periodEnd: candidate.periodEnd,
    ...(candidate.family !== undefined ? { family: candidate.family } : {}),
    source: candidate.source,
    provenance: candidate.provenance,
    ...(candidate.previousReviewPeriod !== undefined ? { previousReviewPeriod: candidate.previousReviewPeriod } : {}),
    level: 1,
    automaticVariantCursor: 2,
    cueTitle: candidate.cueTitle,
    cueCopy: candidate.cueCopy,
    level2Copy: candidate.level2Copy,
    evidenceCount: candidate.evidenceCount,
    gamesConsidered: candidate.gamesConsidered,
    reactions: {},
    examples: uniqueExamples(candidate.examples),
    ...(selected ? { selectedExampleId: selected.id, selectedExampleSnapshot: selected } : {}),
    presentedSessionIds: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function mergeSameSignalState(existing: BoardSignalCoachingState, candidate: CoachingCandidate, nowIso: string) {
  const currentSelected = existing.selectedExampleSnapshot;
  const candidateSelected = existing.selectedExampleId ? candidate.examples.find((example) => example.id === existing.selectedExampleId) : undefined;
  const selected = candidateSelected ?? currentSelected ?? candidate.examples[0];
  const examples = uniqueExamples([...(selected ? [selected] : []), ...candidate.examples, ...(existing.examples ?? [])]);
  const family = candidate.family ?? existing.family;
  const previousReviewPeriod = candidate.previousReviewPeriod ?? existing.previousReviewPeriod;
  const rotationBase = { ...existing, examples, ...(selected ? { selectedExampleSnapshot: selected } : {}) };
  return {
    ...existing,
    schemaVersion: M7_COACHING_SCHEMA_VERSION,
    ...(family !== undefined ? { family } : {}),
    source: candidate.source,
    provenance: candidate.provenance,
    ...(previousReviewPeriod !== undefined ? { previousReviewPeriod } : {}),
    automaticVariantCursor: automaticVariantCursorForState(rotationBase),
    evidenceCount: candidate.evidenceCount,
    gamesConsidered: candidate.gamesConsidered,
    examples,
    ...(selected ? { selectedExampleId: selected.id, selectedExampleSnapshot: selected } : {}),
    updatedAt: nowIso,
  } satisfies BoardSignalCoachingState;
}

export function presentationFromCoachingState(state: BoardSignalCoachingState): BoardSignalCoachingPresentation {
  const examples = uniqueExamples(state.examples ?? []);
  const selectedExample = selectedCoachingExample({ ...state, examples });
  return { ...state, examples, selectedExample, hold: state.level === 3 };
}

export type SessionPresentationResult = {
  state: BoardSignalCoachingState;
  advanced: boolean;
  previousLevel: BoardSignalCoachingLevel;
  coalesced: boolean;
  automaticPresentation: boolean;
};

export function presentCoachingForSession(state: BoardSignalCoachingState, sessionId: string, nowMs: number): SessionPresentationResult {
  const previousLevel = state.level;
  const ids = Array.isArray(state.presentedSessionIds) ? state.presentedSessionIds : [];
  if (ids.includes(sessionId)) return { state, advanced: false, previousLevel, coalesced: false, automaticPresentation: false };
  const nowIso = new Date(nowMs).toISOString();
  const lastPresentationMs = state.lastPresentationAt ? Date.parse(state.lastPresentationAt) : NaN;
  const coalesced = Number.isFinite(lastPresentationMs) && nowMs - lastPresentationMs < M7_CONCURRENT_SESSION_COALESCE_MS;
  const firstPresentation = ids.length === 0;
  const presentedSessionIds = [...ids.filter((value) => value !== sessionId), sessionId].slice(-M7_MAX_PRESENTED_SESSION_IDS);
  if (coalesced) {
    return {
      state: { ...state, automaticVariantCursor: automaticVariantCursorForState(state), presentedSessionIds, lastPresentationAt: nowIso, updatedAt: nowIso },
      advanced: false,
      previousLevel,
      coalesced: true,
      automaticPresentation: false,
    };
  }
  const level = firstPresentation ? 1 : automaticVariantCursorForState(state);
  const automaticVariantCursor = nextVariantAfter(state, level);
  const advanced = !firstPresentation && level !== previousLevel;
  const next: BoardSignalCoachingState = {
    ...state,
    level,
    automaticVariantCursor,
    automaticPresentationCount: Math.max(0, Number(state.automaticPresentationCount ?? 0)) + 1,
    lastPresentationSource: "AUTO_RETURN",
    presentedSessionIds,
    lastPresentationAt: nowIso,
    ...(advanced ? { lastMeaningfulAdvanceAt: nowIso } : {}),
    updatedAt: nowIso,
  };
  return { state: next, advanced, previousLevel, coalesced: false, automaticPresentation: true };
}

export function switchCoachingVariant(state: BoardSignalCoachingState, variant: BoardSignalCoachingLevel, nowIso: string) {
  const variants = coachingVariantsForState(state);
  if (!variants.includes(variant) || variant === state.level) return state;
  return {
    ...state,
    level: variant,
    automaticVariantCursor: automaticVariantCursorForState(state),
    lastPresentationSource: "MANUAL_SWITCH",
    lastManualVariantSwitchAt: nowIso,
    manualVariantSwitchCount: Math.max(0, Number(state.manualVariantSwitchCount ?? 0)) + 1,
    updatedAt: nowIso,
  } satisfies BoardSignalCoachingState;
}

export function nextManualCoachingVariant(state: BoardSignalCoachingState) {
  return nextVariantAfter(state, state.level);
}

function isLegacyFeedbackItem(value: unknown): value is BoardSignalLegacyCurrentFeedbackItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<BoardSignalLegacyCurrentFeedbackItem>;
  return typeof item.itemKey === "string" && (item.reaction === "helpful" || item.reaction === "not_helpful") && typeof item.reactedAt === "string";
}

function isM7FeedbackItem(value: unknown): value is BoardSignalCoachingFeedbackItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<BoardSignalCoachingFeedbackItem>;
  return item.schemaVersion === 2 && typeof item.coachingSignalKey === "string" && (item.level === 1 || item.level === 2 || item.level === 3) && (item.reaction === "helpful" || item.reaction === "not_helpful") && typeof item.reactedAt === "string";
}

export function normalizeCurrentFeedbackItems(value: unknown, maxItems = 24): BoardSignalCurrentFeedbackItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is BoardSignalCurrentFeedbackItem => isLegacyFeedbackItem(item) || isM7FeedbackItem(item)).slice(0, maxItems);
}

export type CoachingReactionTransition = {
  state: BoardSignalCoachingState;
  advancedTo?: BoardSignalCoachingLevel;
  level3Reached: boolean;
  ladderExhausted: boolean;
};

export function applyCoachingReaction(
  state: BoardSignalCoachingState,
  level: BoardSignalCoachingLevel,
  reaction: BoardSignalCurrentReaction,
  nowIso: string,
): CoachingReactionTransition {
  const next: BoardSignalCoachingState = {
    ...state,
    reactions: { ...(state.reactions ?? {}), [level]: { reaction, reactedAt: nowIso } },
    updatedAt: nowIso,
  };
  return { state: next, advancedTo: undefined, level3Reached: false, ladderExhausted: false };
}

export function cycleCoachingExample(state: BoardSignalCoachingState, nowIso: string) {
  const examples = uniqueExamples(state.examples ?? []);
  if (state.level !== 3 || examples.length < 2) return state;
  const currentIndex = Math.max(0, examples.findIndex((example) => example.id === state.selectedExampleId));
  const selected = examples[(currentIndex + 1) % examples.length];
  return {
    ...state,
    examples,
    selectedExampleId: selected.id,
    selectedExampleSnapshot: selected,
    exampleCycleCount: (state.exampleCycleCount ?? 0) + 1,
    updatedAt: nowIso,
  } satisfies BoardSignalCoachingState;
}
