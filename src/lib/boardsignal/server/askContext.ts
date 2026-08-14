import "server-only";

import { createHash } from "node:crypto";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminDb } from "@/utils/firebaseAdmin";
import type {
  ActiveWeekNextGameGuidance,
  CurrentEpisodeWithNextGameGuidance,
} from "../activeWeekGuidance";
import type { BoardSignalBetaPreview } from "../activation";
import type { GuideConversationTurn, GuideResponse } from "../guide";
import { deriveRecurringPatterns, type DeskSummary } from "../memory";
import type { BoardSignalDesk } from "../types";
import { verifyBetaPreviewStatusCredential } from "./activation";
import {
  accountForToken,
  loadPendingFactualReviews,
  loadPublishedDesks,
  type PublishedDeskBundle,
} from "./persistence";

export const PATCH_E_BASELINE = "216056e2766c980ca3e898aec0872a082b540340" as const;

type AskContextInput = {
  token?: DecodedIdToken;
  message?: unknown;
  pathname?: unknown;
  activeTab?: unknown;
  visibleEntityId?: unknown;
  recentConversation?: unknown;
  mode?: unknown;
  previewRequestId?: unknown;
  previewStatusToken?: unknown;
};

export type AskContextObservation = {
  stateKey: string;
  priority: number;
  prompt?: string;
  opener: GuideResponse;
  chips: string[];
  contextUpdatedAt?: string;
};

type PrivateAskState = {
  uid: string;
  currentEpisode?: CurrentEpisodeWithNextGameGuidance;
  contextUpdatedAt?: string;
  pendingFactualReview?: Awaited<ReturnType<typeof loadPendingFactualReviews>>[number];
  desks: PublishedDeskBundle[];
};

const ACTIVE_SOURCES = new Set([
  "current_week",
  "previous_review",
  "current_week_reinforces_previous_review",
  "insufficient_current_evidence",
]);
const ACTIVE_STATUSES = new Set(["available", "fallback_previous_review", "insufficient_evidence"]);
const HIGH_VALUE_TABS = new Set(["desk", "progress", "friends", "head-to-head"]);

function safeText(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function safeTab(value: unknown) {
  const tab = safeText(value, 40).toLowerCase();
  return ["desk", "progress", "universe", "friends", "head-to-head", "inbox", "profile"].includes(tab) ? tab : undefined;
}

function safeEntityId(value: unknown) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

function normalizeMessage(value: unknown) {
  return safeText(value, 1200).toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ");
}

function stateKey(parts: unknown[]) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 28);
}

function guideResponse(
  reply: string,
  intent: GuideResponse["intent"],
  provenance?: GuideResponse["provenance"],
  chips: string[] = [],
  actions: GuideResponse["actions"] = [],
): GuideResponse {
  return {
    reply,
    chips: chips.slice(0, 4),
    actions,
    handoffAvailable: false,
    intent,
    category: intent === "progress" ? "general" : intent === "explain_signal" ? "signal_explanation" : "general",
    provenance,
  };
}

function activeGuidance(value: unknown): ActiveWeekNextGameGuidance | undefined {
  if (!value || typeof value !== "object") return undefined;
  const guidance = value as Partial<ActiveWeekNextGameGuidance>;
  if (!ACTIVE_SOURCES.has(String(guidance.source)) || !ACTIVE_STATUSES.has(String(guidance.status))) return undefined;
  if (!Number.isFinite(Number(guidance.gamesConsidered)) || Number(guidance.gamesConsidered) < 0) return undefined;
  if (!Array.isArray(guidance.supportingFacts)) return undefined;
  return guidance as ActiveWeekNextGameGuidance;
}

function currentEpisode(value: unknown): CurrentEpisodeWithNextGameGuidance | undefined {
  if (!value || typeof value !== "object") return undefined;
  const episode = value as Partial<CurrentEpisodeWithNextGameGuidance>;
  const guidance = activeGuidance(episode.nextGameGuidance);
  if (episode.status !== "forming" || !guidance) return undefined;
  if (!safeText(episode.checkedAt, 80) || !Number.isFinite(Number(episode.games))) return undefined;
  return { ...(episode as CurrentEpisodeWithNextGameGuidance), nextGameGuidance: guidance };
}

async function loadPrivateState(token: DecodedIdToken): Promise<PrivateAskState> {
  const account = await accountForToken(token);
  const [sessionDoc, pendingReviews, desks] = await Promise.all([
    getAdminDb().collection("users").doc(account.uid).collection("guide").doc("session").get(),
    loadPendingFactualReviews(account.uid),
    loadPublishedDesks(account.uid),
  ]);
  const session = sessionDoc.data() as Record<string, unknown> | undefined;
  return {
    uid: account.uid,
    currentEpisode: currentEpisode(session?.currentEpisode),
    contextUpdatedAt: typeof session?.updatedAt === "string" ? session.updatedAt : undefined,
    pendingFactualReview: pendingReviews[0],
    desks,
  };
}

function activeProvenance(episode: CurrentEpisodeWithNextGameGuidance): GuideResponse["provenance"] {
  const guidance = episode.nextGameGuidance;
  const previous = guidance.source === "previous_review";
  return {
    kind: "desk",
    id: `active-week:${episode.checkedAt}:${guidance.source}`,
    title: previous
      ? `LAST COMPLETED REVIEW${guidance.previousReviewPeriod ? ` · ${guidance.previousReviewPeriod}` : ""}`
      : `CURRENT WEEK · ${guidance.gamesConsidered} game${guidance.gamesConsidered === 1 ? "" : "s"} checked`,
    timestamp: episode.checkedAt,
  };
}

function pendingProvenance(draft: PrivateAskState["pendingFactualReview"]): GuideResponse["provenance"] {
  if (!draft) return undefined;
  return {
    kind: "desk",
    id: `position-review:${draft.deskKey}`,
    title: "POSITION REVIEW · factual week confirmed",
    timestamp: draft.updatedAt,
  };
}

function completedProvenance(bundle: PublishedDeskBundle, section: "happened" | "mattered" | "focus" | "evidence"): GuideResponse["provenance"] {
  return {
    kind: "desk",
    id: `review:${bundle.summary.deskKey}:${section}`,
    title: section === "evidence" ? "POSITION REVIEW · engine evidence" : `LAST COMPLETED REVIEW · ${bundle.summary.periodLabel}`,
  };
}

function progressProvenance(desks: PublishedDeskBundle[]): GuideResponse["provenance"] {
  const latest = desks[0]?.summary;
  return {
    kind: "desk",
    id: `progress:${latest?.deskKey ?? "none"}`,
    title: `PROGRESS · last ${Math.min(4, desks.length)} Review${desks.length === 1 ? "" : "s"}`,
  };
}

function consumerLanguage(value: string) {
  return value
    .replace(/\bDesks\b/g, "Reviews")
    .replace(/\bDesk\b/g, "Review")
    .replace(/\bepisodes\b/gi, "weeks")
    .replace(/\bepisode\b/gi, "week")
    .trim();
}

function primaryPoolLine(desk: BoardSignalDesk) {
  const primary = desk.pools.find((pool) => pool.pool.toLowerCase() === desk.primaryPool.toLowerCase()) ?? desk.pools[0];
  if (!primary) return "";
  const delta = primary.change ?? (
    primary.firstRecordedRating !== undefined && primary.lastRecordedRating !== undefined
      ? primary.lastRecordedRating - primary.firstRecordedRating
      : undefined
  );
  return delta === undefined ? "" : `, finishing ${delta >= 0 ? "+" : ""}${delta} in ${primary.pool}`;
}

function factualPoolLine(draft: NonNullable<PrivateAskState["pendingFactualReview"]>) {
  const facts = draft.facts;
  const primary = facts.pools.find((pool) => pool.pool.toLowerCase() === facts.primaryPool.toLowerCase()) ?? facts.pools[0];
  if (!primary) return "";
  const delta = primary.change ?? (
    primary.firstRecordedRating !== undefined && primary.lastRecordedRating !== undefined
      ? primary.lastRecordedRating - primary.firstRecordedRating
      : undefined
  );
  return delta === undefined ? "" : ` ${primary.pool} moved ${delta >= 0 ? "+" : ""}${delta}.`;
}

function activeEvidenceSentence(guidance: ActiveWeekNextGameGuidance) {
  const count = Number(guidance.evidenceCount ?? 0);
  if (count >= 2) return `BoardSignal has seen supporting evidence in ${count} different games checked so far.`;
  if (count === 1) return "One concrete current-week event supports the reminder; BoardSignal is not calling it a repeated pattern.";
  return "";
}

function activeEvidenceDetails(guidance: ActiveWeekNextGameGuidance) {
  const facts = guidance.supportingFacts.map((fact) => safeText(fact.summary, 240)).filter(Boolean).slice(0, 2);
  return facts.length ? ` Evidence: ${facts.join(" ")}` : "";
}

function answerActiveWeek(episode: CurrentEpisodeWithNextGameGuidance, message: string, showEvidence = false): GuideResponse {
  const guidance = episode.nextGameGuidance;
  const provenance = activeProvenance(episode);
  const chips = ["Why this next-game action?", "What are you watching?", "What can you tell so far?"];
  const record = `${episode.games} game${episode.games === 1 ? "" : "s"} checked so far: ${episode.wins}W · ${episode.draws}D · ${episode.losses}L.`;

  if (guidance.status === "insufficient_evidence" || guidance.source === "insufficient_current_evidence") {
    return guideResponse(
      `${record} BoardSignal doesn't have enough current-game evidence yet for a new next-game action. I won't manufacture one just to fill the space.`,
      "explain_signal",
      provenance,
      chips,
    );
  }

  if (guidance.source === "previous_review") {
    return guideResponse(
      `That reminder comes from your last completed Review. This week's ${guidance.gamesConsidered} game${guidance.gamesConsidered === 1 ? " hasn't" : "s haven't"} given BoardSignal enough evidence to replace it yet.${guidance.copy ? ` ${consumerLanguage(guidance.copy)}` : ""}`,
      "explain_signal",
      provenance,
      chips,
    );
  }

  if (guidance.source === "current_week_reinforces_previous_review") {
    return guideResponse(
      `This is showing up again. The current-week games independently produced the same guidance family as your last completed Review. ${activeEvidenceSentence(guidance)}${guidance.copy ? ` For the next game: ${consumerLanguage(guidance.copy)}` : ""}${showEvidence ? activeEvidenceDetails(guidance) : ""}`,
      "explain_signal",
      provenance,
      chips,
    );
  }

  const questionIsSummary = /what can you tell so far|what should i know/.test(message);
  return guideResponse(
    `${questionIsSummary ? `${record} ` : ""}That next-game action comes from the games in your current week, not your previous Review. ${activeEvidenceSentence(guidance)}${guidance.copy ? ` ${consumerLanguage(guidance.copy)}` : ""}${showEvidence ? activeEvidenceDetails(guidance) : ""}`.trim(),
    "explain_signal",
    provenance,
    chips,
  );
}

function answerPendingReview(draft: NonNullable<PrivateAskState["pendingFactualReview"]>, message: string): GuideResponse {
  const facts = draft.facts;
  const confirmed = `${facts.period.label}: ${facts.games} games · ${facts.wins}W · ${facts.draws}D · ${facts.losses}L.${factualPoolLine(draft)}`;
  const provenance = pendingProvenance(draft);
  const chips = ["What's already confirmed?", "What's still being checked?", "Can I use this Review now?"];

  if (/why.*(?:engine|stockfish|position).*fail|what.*(?:engine|stockfish).*wrong|why.*retry/.test(message)) {
    return guideResponse(
      "The saved state confirms that position review is still pending, but it does not contain a verified runtime-failure reason. I won't guess why the engine step failed.",
      "explain_desk",
      provenance,
      chips,
    );
  }
  if (/what.*already.*confirm|what.*confirm/.test(message)) {
    return guideResponse(
      `Already confirmed: ${confirmed} The chronology, pool/rating boundaries and other validated factual week fields are saved.`,
      "explain_desk",
      provenance,
      chips,
    );
  }
  if (/what.*still.*check|position review|stockfish|engine pending|still finishing/.test(message)) {
    return guideResponse(
      "Still being checked: the engine-supported position conclusions and any final Focus Next that depends on those positions. BoardSignal has not treated those conclusions as final yet.",
      "explain_desk",
      provenance,
      chips,
    );
  }
  if (/can i use.*review|can i use.*week/.test(message)) {
    return guideResponse(
      `Yes for the factual week: ${confirmed} Position-based WHAT MATTERED and FOCUS NEXT conclusions are still finishing, so use those only after position review completes.`,
      "explain_desk",
      provenance,
      chips,
    );
  }
  return guideResponse(
    `The week itself is complete and your factual Review is saved. ${confirmed} BoardSignal is still finishing the position check, so I won't treat position-based conclusions or Focus Next as final yet.`,
    "explain_desk",
    provenance,
    chips,
  );
}

function focusEvidence(bundle: PublishedDeskBundle) {
  const ids = bundle.desk.signals.blue.evidenceIds ?? [];
  const candidates = ids
    .map((id) => bundle.desk.candidates.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is BoardSignalDesk["candidates"][number] => Boolean(candidate));
  const engineBacked = ids.filter((id) => Boolean(bundle.engineResults[id])).length;
  if (!ids.length) return "BoardSignal did not publish position evidence IDs for this Focus Next.";
  const reasons = candidates.map((candidate) => consumerLanguage(candidate.reason)).filter(Boolean).slice(0, 2);
  return `The published Focus Next is tied to ${ids.length} reviewed position${ids.length === 1 ? "" : "s"}${engineBacked ? `, with engine evidence stored for ${engineBacked}` : ""}.${reasons.length ? ` The review reasons include: ${reasons.join("; ")}.` : ""}`;
}

function answerCompletedReview(bundle: PublishedDeskBundle, message: string, referent?: string): GuideResponse | undefined {
  const desk = bundle.desk;
  const lowerReferent = referent ?? "";
  const asksEvidence = /how do you know|where did.*come|show me.*evidence|why does boardsignal think|^why\??$/.test(message)
    || lowerReferent.includes(":focus") || lowerReferent.includes(":evidence");
  const asksFocus = /focus next|what should i work on|what should i focus|work on next|explain focus/.test(message)
    || lowerReferent.includes(":focus");
  const asksMattered = /what mattered|matter most|most important/.test(message)
    || lowerReferent.includes(":mattered");
  const asksHappened = /what happened|how did i do|week summary|review summary/.test(message)
    || lowerReferent.includes(":happened");
  const chips = ["What mattered most?", "Explain Focus Next", "Why does BoardSignal think this?"];

  if (asksEvidence && lowerReferent.includes(":happened")) {
    return guideResponse(
      "Those numbers come directly from the completed Review facts: game count, W/D/L and recorded pool rating boundaries. No new chess interpretation is being added here.",
      "explain_desk",
      completedProvenance(bundle, "happened"),
      chips,
    );
  }
  if (asksEvidence && lowerReferent.includes(":mattered")) {
    return guideResponse(
      "That wording comes from the published WHAT MATTERED interpretation in your completed Review. I won't invent a second explanation or pretend the saved headline has a separate position-evidence list when it does not.",
      "explain_desk",
      completedProvenance(bundle, "mattered"),
      chips,
    );
  }
  if (asksEvidence) {
    return guideResponse(
      focusEvidence(bundle),
      "explain_signal",
      completedProvenance(bundle, "evidence"),
      chips,
    );
  }
  if (asksFocus) {
    const blue = desk.signals.blue;
    const reply = blue.status === "withheld"
      ? "BoardSignal did not publish a supported Focus Next for this Review, so I won't invent a replacement."
      : `FOCUS NEXT — ${consumerLanguage(blue.title)} ${consumerLanguage(blue.copy)}`;
    return guideResponse(reply, "explain_signal", completedProvenance(bundle, "focus"), chips);
  }
  if (asksMattered) {
    return guideResponse(
      `WHAT MATTERED — ${consumerLanguage(desk.headline)} ${consumerLanguage(desk.summary)}`,
      "explain_desk",
      completedProvenance(bundle, "mattered"),
      chips,
    );
  }
  if (asksHappened) {
    return guideResponse(
      `WHAT HAPPENED — You played ${desk.games} games: ${desk.wins} wins, ${desk.losses} losses and ${desk.draws} draw${desk.draws === 1 ? "" : "s"}${primaryPoolLine(desk)}.`,
      "explain_desk",
      completedProvenance(bundle, "happened"),
      chips,
    );
  }
  return undefined;
}

const FAMILY_LABELS: Record<string, string> = {
  forcing_reply: "forcing replies",
  material_conversion: "material decisions",
  clock_conversion: "clock decisions",
  queen_safety: "queen safety",
  king_safety: "king safety",
  general_decision: "general decision-making",
  playable_resignation: "playable resignations",
  loss_run: "loss runs",
  narrow_sample: "small-sample caution",
  pool_divergence: "time-control divergence",
  opponent_band: "opponent-rating bands",
  passed_pawn_conversion: "passed-pawn conversion",
  winning_run: "winning runs",
  checkmate_finish: "checkmate finishes",
  rating_climb: "rating climbs",
};

function comparablePoolWindow(summaries: DeskSummary[]) {
  const chronological = [...summaries].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const counts = new Map<string, number>();
  for (const summary of chronological) for (const pool of summary.pools.filter((item) => item.games >= 3)) counts.set(pool.pool, (counts.get(pool.pool) ?? 0) + 1);
  const poolName = [...counts.entries()].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  if (!poolName) return undefined;
  const points = chronological.flatMap((summary) => {
    const pool = summary.pools.find((item) => item.pool === poolName && item.games >= 3);
    return pool ? [{ summary, pool }] : [];
  });
  return points.length >= 2 ? { poolName, points } : undefined;
}

function answerProgress(desks: PublishedDeskBundle[], message: string): GuideResponse {
  const summaries = desks.map((item) => item.summary);
  const provenance = progressProvenance(desks);
  const chips = ["Am I improving?", "What changed across my Reviews?", "What keeps repeating?"];
  if (summaries.length < 2) {
    return guideResponse("BoardSignal needs at least two comparable completed Reviews before it can describe a Review-to-Review direction.", "progress", provenance, chips);
  }

  if (/what keeps repeating|keep repeating|recurr/.test(message)) {
    const repeated = deriveRecurringPatterns(summaries).filter((item) => item.status === "repeated");
    if (!repeated.length) return guideResponse("Nothing has cleared BoardSignal's repeated-pattern rule across your recent completed Reviews yet.", "progress", provenance, chips);
    const lead = repeated[0];
    return guideResponse(`${FAMILY_LABELS[lead.family] ?? lead.family} appeared in ${lead.appearances} of the ${lead.desksCompared} recent Reviews compared. That's recurrence in the saved Review history, not proof that it happens in every game.`, "progress", provenance, chips);
  }

  const window = comparablePoolWindow(summaries);
  if (!window) return guideResponse("BoardSignal has multiple completed Reviews, but not enough same-pool samples to make a clean recent comparison yet.", "progress", provenance, chips);
  const first = window.points[0].pool;
  const last = window.points.at(-1)!.pool;
  const scoreDelta = last.scorePct !== undefined && first.scorePct !== undefined ? Number((last.scorePct - first.scorePct).toFixed(1)) : undefined;
  const ratingDelta = last.ratingEnd !== undefined && first.ratingEnd !== undefined ? last.ratingEnd - first.ratingEnd : undefined;
  const facts = [
    ratingDelta !== undefined ? `${window.poolName} end rating moved ${ratingDelta >= 0 ? "+" : ""}${ratingDelta}` : undefined,
    scoreDelta !== undefined ? `Review score moved ${scoreDelta >= 0 ? "+" : ""}${scoreDelta.toFixed(1)} percentage points` : undefined,
  ].filter(Boolean);
  const direction = facts.length ? facts.join("; ") : "the comparable sample changed";
  const improvingQuestion = /am i improving|improv/.test(message);
  return guideResponse(
    improvingQuestion
      ? `Across the comparable recent ${window.poolName} Reviews, ${direction}. That's a real recent movement in those measures, but BoardSignal won't turn a short window into a blanket claim that you're improving overall.`
      : `Across your comparable recent ${window.poolName} Reviews, ${direction}. I can separate rating movement, Review score and repeated patterns rather than collapsing them into one verdict.`,
    "progress",
    provenance,
    chips,
  );
}

function lastContextualReferent(recentConversation: unknown) {
  if (!Array.isArray(recentConversation)) return undefined;
  const safe = recentConversation.slice(-12) as GuideConversationTurn[];
  const last = [...safe].reverse().find((turn) => turn.role === "guide" && typeof turn.provenance?.id === "string");
  return last?.provenance?.id;
}

function isFollowup(message: string) {
  return /^(why|why\?|how do you know|where did that come from|where did this come from|show me|explain that|what do you mean)\??$/.test(message);
}

function activeQuestion(message: string) {
  return /why this|why are you telling me|what should i do next|what are you watching|why are you watching|what can you tell so far|next[- ]game|before (?:my|your) next game|what should i know|show me.*evidence/.test(message);
}

function pendingQuestion(message: string) {
  return /is my review done|review done|already confirmed|still being checked|still being check|can i use.*review|position review|stockfish|engine pending|position check/.test(message);
}

function progressQuestion(message: string) {
  return /am i improving|what changed across|what keeps repeating|review.*progress|progress across/.test(message);
}

export async function contextualGuideResponse(input: AskContextInput): Promise<GuideResponse | undefined> {
  if (!input.token || input.mode === "beta_preview") return undefined;
  const message = normalizeMessage(input.message);
  if (!message) return undefined;
  const tab = safeTab(input.activeTab);
  const state = await loadPrivateState(input.token);
  const referent = lastContextualReferent(input.recentConversation);
  const followup = isFollowup(message);

  if (state.pendingFactualReview && (pendingQuestion(message) || (followup && referent?.startsWith("position-review:")))) {
    return answerPendingReview(state.pendingFactualReview, message);
  }

  if (state.currentEpisode && (activeQuestion(message) || (followup && referent?.startsWith("active-week:")))) {
    const wantsEvidence = /show me|evidence|how do you know|where did/.test(message);
    return answerActiveWeek(state.currentEpisode, message, wantsEvidence);
  }

  const latest = state.desks[0];
  if (latest) {
    const reviewReferent = followup && referent?.startsWith("review:") ? referent : undefined;
    const completed = answerCompletedReview(latest, message, reviewReferent);
    if (completed) return completed;
  }

  if (progressQuestion(message) || (tab === "progress" && /what changed|what should i know/.test(message))) {
    return answerProgress(state.desks, message);
  }

  return undefined;
}

function activeObservation(state: PrivateAskState, tab: string | undefined): AskContextObservation | undefined {
  const episode = state.currentEpisode;
  if (!episode || tab !== "desk") return undefined;
  const guidance = episode.nextGameGuidance;
  if (guidance.status === "insufficient_evidence") return undefined;
  const provenance = activeProvenance(episode);
  const chips = ["Why this next-game action?", "What are you watching?", "What can you tell so far?"];
  const reinforcement = guidance.source === "current_week_reinforces_previous_review";
  const fallback = guidance.source === "previous_review";
  const prompt = reinforcement
    ? "Want to know why BoardSignal says this is showing up again?"
    : fallback
      ? "Want to know why this reminder is still coming from your last Review?"
      : "Want to know why this is the next-game focus?";
  const opener = reinforcement
    ? "This next-game action comes from this week's games and independently matches your last completed Review. I can show you the evidence."
    : fallback
      ? "This next-game reminder is still coming from your last completed Review because this week's games have not supplied enough replacement evidence yet."
      : "BoardSignal has a next-game action from the games checked this week. I can explain why it earned that spot.";
  return {
    stateKey: stateKey([PATCH_E_BASELINE, state.uid, "active-week", episode.periodStart, episode.periodEnd, episode.games, episode.wins, episode.draws, episode.losses, guidance.status, guidance.source, guidance.family, guidance.evidenceCount]),
    priority: 1,
    prompt,
    opener: guideResponse(opener, "explain_signal", provenance, chips),
    chips,
    contextUpdatedAt: episode.checkedAt,
  };
}

function pendingObservation(state: PrivateAskState, tab: string | undefined): AskContextObservation | undefined {
  const draft = state.pendingFactualReview;
  if (!draft || tab !== "desk") return undefined;
  const chips = ["What's already confirmed?", "What's still being checked?", "Can I use this Review now?"];
  return {
    stateKey: stateKey([PATCH_E_BASELINE, state.uid, "position-review", draft.deskKey, draft.updatedAt]),
    priority: 2,
    prompt: "Your facts are ready — want to know what's still being checked?",
    opener: guideResponse("Your week facts are already confirmed. I can show you what is still waiting on position review.", "explain_desk", pendingProvenance(draft), chips),
    chips,
    contextUpdatedAt: draft.updatedAt,
  };
}

function completedObservation(state: PrivateAskState, tab: string | undefined): AskContextObservation | undefined {
  const latest = state.desks[0];
  if (!latest || tab !== "desk") return undefined;
  const chips = ["What mattered most?", "Explain Focus Next", "Why does BoardSignal think this?"];
  return {
    stateKey: stateKey([PATCH_E_BASELINE, state.uid, "completed-review", latest.summary.deskKey]),
    priority: 3,
    prompt: "Want the short version of what mattered?",
    opener: guideResponse("Want the short version of what mattered in your latest Review?", "explain_desk", completedProvenance(latest, "mattered"), chips),
    chips,
  };
}

function progressObservation(state: PrivateAskState, tab: string | undefined): AskContextObservation | undefined {
  if (tab !== "progress" || state.desks.length < 2) return undefined;
  const chips = ["Am I improving?", "What changed across my Reviews?", "What keeps repeating?"];
  return {
    stateKey: stateKey([PATCH_E_BASELINE, state.uid, "progress", ...state.desks.slice(0, 4).map((item) => item.summary.deskKey)]),
    priority: 5,
    prompt: "Want to know what changed across your recent Reviews?",
    opener: guideResponse("I can explain what changed across your recent Reviews without turning one good week into an improvement claim.", "progress", progressProvenance(state.desks), chips),
    chips,
  };
}

function friendObservation(state: PrivateAskState, tab: string | undefined, visibleEntityId: number | undefined): AskContextObservation | undefined {
  if (!visibleEntityId || (tab !== "friends" && tab !== "head-to-head")) return undefined;
  const chips = ["Where are we closest?", "What's different?", "How is this comparison calculated?"];
  return {
    stateKey: stateKey([PATCH_E_BASELINE, state.uid, "friend-comparison", visibleEntityId]),
    priority: 6,
    prompt: "Want help reading this comparison?",
    opener: guideResponse("I can explain this comparison from the relationship-safe metrics already available here. I won't expose the other player's private guidance.", "compare_friend", { kind: "friends", id: `friend:${visibleEntityId}`, title: "FRIEND COMPARISON" }, chips),
    chips,
  };
}

async function previewObservation(input: AskContextInput): Promise<AskContextObservation | undefined> {
  if (input.mode !== "beta_preview") return undefined;
  const requestId = safeText(input.previewRequestId, 180);
  const statusToken = safeText(input.previewStatusToken, 400);
  if (!requestId || !statusToken) return undefined;
  const verified = await verifyBetaPreviewStatusCredential(requestId, statusToken);
  const preview = verified.request.previewSnapshot as BoardSignalBetaPreview | undefined;
  if (!preview) return undefined;
  const chips = ["Show me my week", "Explain my Universe preview", "What unlocks next?", "What stays private?"];
  return {
    stateKey: stateKey([PATCH_E_BASELINE, "preview", requestId, preview.generatedAt, preview.games]),
    priority: 7,
    prompt: "Want the short version of what BoardSignal found?",
    opener: guideResponse(
      `This Preview contains ${preview.games} verified game${preview.games === 1 ? "" : "s"}${preview.period?.label ? ` from ${preview.period.label}` : ""}. I can explain what BoardSignal found and what unlocks next.`,
      "beta_next",
      { kind: "product_knowledge", id: `preview:${requestId}`, title: "PREVIEW · safe preview", timestamp: preview.generatedAt },
      chips,
    ),
    chips,
    contextUpdatedAt: preview.generatedAt,
  };
}

export async function guideContextObservation(input: AskContextInput): Promise<AskContextObservation | undefined> {
  const pathname = safeText(input.pathname, 300);
  if (input.mode === "beta_preview") return previewObservation(input);
  if (!input.token || !pathname.includes("boardsignal/player-room")) return undefined;
  const tab = safeTab(input.activeTab) ?? "desk";
  if (!HIGH_VALUE_TABS.has(tab)) return undefined;
  const state = await loadPrivateState(input.token);
  const visibleEntityId = safeEntityId(input.visibleEntityId);
  return activeObservation(state, tab)
    ?? pendingObservation(state, tab)
    ?? completedObservation(state, tab)
    ?? progressObservation(state, tab)
    ?? friendObservation(state, tab, visibleEntityId);
}
