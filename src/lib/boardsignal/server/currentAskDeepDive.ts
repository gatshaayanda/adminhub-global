import "server-only";

import { createHash } from "node:crypto";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminDb } from "@/utils/firebaseAdmin";
import type { ActiveWeekNextGameGuidance, CurrentEpisodeWithNextGameGuidance } from "../activeWeekGuidance";
import { buildCurrentBoardSignalMoment, type CurrentBoardSignalMoment } from "../currentBoardSignalPresentation";
import type { GuideConversationTurn, GuideResponse } from "../guide";
import type { PlayerPulse, PlayerPulseCard } from "../pulse";

const ACTIVE_SOURCES = new Set([
  "current_week",
  "previous_review",
  "current_week_reinforces_previous_review",
  "insufficient_current_evidence",
]);
const ACTIVE_STATUSES = new Set(["available", "fallback_previous_review", "insufficient_evidence"]);

type PulseFact = {
  eyebrow: string;
  title: string;
  body: string;
  facts?: string[];
};

type CurrentDeepDiveState = {
  episode: CurrentEpisodeWithNextGameGuidance;
  pulseFacts: PulseFact[];
  updatedAt?: string;
};

type CurrentDeepDiveInput = {
  token?: DecodedIdToken;
  message?: unknown;
  pathname?: unknown;
  activeTab?: unknown;
  recentConversation?: unknown;
};

export type CurrentDeepDiveObservation = {
  stateKey: string;
  priority: number;
  opener: GuideResponse;
  chips: string[];
  contextUpdatedAt?: string;
};

function safeText(value: unknown, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

function safeTab(value: unknown) {
  const tab = safeText(value, 40).toLowerCase();
  return ["desk", "progress", "universe", "friends", "head-to-head", "inbox", "profile"].includes(tab) ? tab : undefined;
}

function normalizeMessage(value: unknown) {
  return safeText(value, 1200).toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
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
  if (!safeText(episode.periodStart, 40) || !safeText(episode.periodEnd, 40) || !safeText(episode.checkedAt, 80)) return undefined;
  if (!Number.isFinite(Number(episode.games))) return undefined;
  return { ...(episode as CurrentEpisodeWithNextGameGuidance), nextGameGuidance: guidance };
}

function pulseFact(value: unknown): PulseFact | undefined {
  if (!value || typeof value !== "object") return undefined;
  const fact = value as Record<string, unknown>;
  const eyebrow = safeText(fact.eyebrow, 80);
  const title = safeText(fact.title, 280);
  const body = safeText(fact.body, 420);
  if (!eyebrow || !title) return undefined;
  const facts = Array.isArray(fact.facts)
    ? fact.facts.map((item) => safeText(item, 260)).filter(Boolean).slice(0, 5)
    : undefined;
  return { eyebrow, title, body, ...(facts?.length ? { facts } : {}) };
}

async function loadCurrentState(token: DecodedIdToken): Promise<CurrentDeepDiveState | undefined> {
  const sessionDoc = await getAdminDb().collection("users").doc(token.uid).collection("guide").doc("session").get();
  const session = sessionDoc.data() as Record<string, unknown> | undefined;
  const episode = currentEpisode(session?.currentEpisode);
  if (!episode) return undefined;
  const rawPulseValue = session?.pulseFacts;
  const rawPulseFacts: unknown[] = Array.isArray(rawPulseValue) ? rawPulseValue : [];
  const pulseFacts = rawPulseFacts.flatMap((item) => {
    const parsed = pulseFact(item);
    return parsed ? [parsed] : [];
  });
  return {
    episode,
    pulseFacts,
    updatedAt: typeof session?.updatedAt === "string" ? session.updatedAt : undefined,
  };
}

function sinceAwayPulse(episode: CurrentEpisodeWithNextGameGuidance, fact: PulseFact): PlayerPulse {
  const sinceAway: PlayerPulseCard = {
    id: `since-away:${episode.periodStart}:${episode.checkedAt}`,
    kind: "since-away",
    eyebrow: "SINCE YOU WERE AWAY",
    title: fact.title,
    body: fact.body,
    facts: fact.facts,
    finality: "provisional",
  };
  return {
    checkedAt: episode.checkedAt,
    sinceAway,
    boardMoved: [],
    reviewMovement: [],
    proximity: [],
    provisional: [],
    fieldMoved: [],
    justIn: [],
    whatsHot: [],
    groups: [],
    standings: [],
    fieldLabels: [],
    officialPlayerCount: 0,
  };
}

function currentMoment(state: CurrentDeepDiveState): CurrentBoardSignalMoment {
  const sinceAway = state.pulseFacts.find((item) => item.eyebrow.toUpperCase() === "SINCE YOU WERE AWAY" && item.facts?.length);
  return buildCurrentBoardSignalMoment({
    episode: state.episode,
    ...(sinceAway ? { pulse: sinceAwayPulse(state.episode, sinceAway) } : {}),
  });
}

function stateKey(parts: unknown[]) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 28);
}

function consumerLanguage(value: string) {
  return value
    .replaceAll("the forming episode", "your current picture")
    .replaceAll("Your forming episode", "Your current picture")
    .replaceAll("this episode", "this period")
    .replaceAll("Episode day", "Period day")
    .replace(/\bepisode\b/gi, "period")
    .replace(/\bDesk\b/g, "Review")
    .trim();
}

function provenance(moment: CurrentBoardSignalMoment, episode: CurrentEpisodeWithNextGameGuidance): NonNullable<GuideResponse["provenance"]> {
  return {
    kind: "desk",
    id: `current-item:${moment.itemKey}`,
    title: `${moment.eyebrow} · CURRENT BOARDSIGNAL`,
    timestamp: episode.checkedAt,
  };
}

function currentChips(moment: CurrentBoardSignalMoment, guidance: ActiveWeekNextGameGuidance) {
  const chips = ["WHY IS THIS HAPPENING?"];
  if (moment.variant === "since_away") chips.push("WHAT CHANGED SINCE LAST TIME?");
  if (guidance.supportingFacts.length) chips.push("SHOW ME AN EXAMPLE");
  if ((guidance.status === "available" || guidance.status === "fallback_previous_review") && (guidance.copy || guidance.primaryAction || guidance.title)) {
    chips.push("WHAT SHOULD I DO NEXT?");
  }
  if (guidance.source === "previous_review" || guidance.source === "current_week_reinforces_previous_review") {
    chips.push("HOW DOES THIS COMPARE WITH MY LAST REVIEW?");
  }
  if (chips.length < 4) chips.push("WHAT ARE YOU WATCHING?");
  return [...new Set(chips)].slice(0, 4);
}

function responseFor(
  reply: string,
  moment: CurrentBoardSignalMoment,
  episode: CurrentEpisodeWithNextGameGuidance,
  chips: string[],
  actions: GuideResponse["actions"] = [],
): GuideResponse {
  return {
    reply: consumerLanguage(reply),
    chips,
    actions,
    handoffAvailable: false,
    intent: "explain_signal",
    category: "signal_explanation",
    provenance: provenance(moment, episode),
  };
}

function lastCurrentReferent(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const turns = value.slice(-12) as GuideConversationTurn[];
  const last = [...turns].reverse().find((turn) => turn.role === "guide" && typeof turn.provenance?.id === "string" && turn.provenance.id.startsWith("current-item:"));
  return last?.provenance?.id;
}

function explicitCurrentQuestion(message: string) {
  return /why is this happening|why am i seeing this|why are you showing me this|show me an example|what should i do next|what changed since last time|how does this compare with my last review|what are you watching|is this getting better/.test(message);
}

function currentFollowup(message: string) {
  return /^(?:why|why\?|show me|show me\?|explain that|what does this mean|how do you know|where did that come from|where did this come from)\??$/.test(message);
}

function familyLabel(family?: ActiveWeekNextGameGuidance["family"]) {
  const labels: Record<string, string> = {
    clock_conversion: "clock decisions",
    queen_safety: "queen safety",
    king_safety: "king safety",
    forcing_reply: "forcing replies",
    material_conversion: "material decisions",
    loss_run: "the current result run",
  };
  return family ? labels[family] ?? family.replaceAll("_", " ") : "the current factual signal";
}

function exampleReply(guidance: ActiveWeekNextGameGuidance) {
  const fact = guidance.supportingFacts[0];
  if (!fact) return "I don't have a single saved current-game example for this item, so I won't invent one.";
  const context = [fact.opponent ? `vs ${fact.opponent}` : undefined, fact.pool, fact.moveNumber ? `move ${fact.moveNumber}` : undefined].filter(Boolean).join(" · ");
  const move = fact.movePlayed && fact.opponentReply ? ` ${fact.movePlayed} → ${fact.opponentReply}.` : "";
  return `Here's one current example${context ? ` — ${context}` : ""}: ${safeText(fact.summary, 320)}${move}`;
}

function whyReply(moment: CurrentBoardSignalMoment, guidance: ActiveWeekNextGameGuidance) {
  if (moment.variant === "no_games" || moment.variant === "quiet") {
    return `Here's why BoardSignal is being careful: ${moment.evidence}`;
  }
  if (moment.variant === "current_guidance") {
    return `Here's why this earned a place in Current BoardSignal: ${moment.evidence}${guidance.copy ? ` For your next game: ${guidance.copy}` : ""}`;
  }
  if (moment.variant === "since_away") {
    return `Here's why this is in front of you now: ${moment.evidence} Those are changes since your previous Player Room visit, not a final Review conclusion.`;
  }
  return `Here's why this is here: ${moment.evidence} BoardSignal is showing the current fact without turning it into a final Review conclusion.`;
}

function nextGameReply(guidance: ActiveWeekNextGameGuidance) {
  if (guidance.status === "insufficient_evidence" || guidance.source === "insufficient_current_evidence") {
    return "Nothing specific yet. The current games have not crossed the evidence threshold for a reliable next-game action, so BoardSignal is not guessing.";
  }
  const action = guidance.copy || guidance.primaryAction || guidance.title;
  if (!action) return "There isn't a reliable next-game action attached to this current item yet.";
  const source = guidance.source === "previous_review"
    ? "This is still the reminder from your last completed Review because the current games have not supplied enough replacement evidence yet."
    : guidance.source === "current_week_reinforces_previous_review"
      ? "The current games are independently pointing to the same kind of advice as your last completed Review."
      : "This comes from the games BoardSignal has checked in your current period.";
  return `Try this next game: ${action} ${source}`;
}

function compareReply(guidance: ActiveWeekNextGameGuidance) {
  if (guidance.source === "previous_review") {
    return `This is still coming from your last completed Review${guidance.previousReviewPeriod ? ` (${guidance.previousReviewPeriod})` : ""}. The current games have not produced enough evidence to replace it yet.`;
  }
  if (guidance.source === "current_week_reinforces_previous_review") {
    return `The same guidance family is showing up again. Your current games independently point to ${familyLabel(guidance.family)}, matching the direction from your last completed Review.`;
  }
  return "This current item is not a clean last-Review comparison. I won't invent a before-and-after claim where BoardSignal has not established one.";
}

export async function currentBoardSignalDeepDiveObservation(input: CurrentDeepDiveInput): Promise<CurrentDeepDiveObservation | undefined> {
  if (!input.token || !safeText(input.pathname, 300).includes("boardsignal/player-room")) return undefined;
  if ((safeTab(input.activeTab) ?? "desk") !== "desk") return undefined;
  const state = await loadCurrentState(input.token);
  if (!state) return undefined;
  const moment = currentMoment(state);
  const chips = currentChips(moment, state.episode.nextGameGuidance);
  const opener = responseFor(
    `${moment.headline} ${moment.evidence} Ask why it is showing up, open a current example when one exists, or turn it into one next-game action.`,
    moment,
    state.episode,
    chips,
  );
  return {
    stateKey: stateKey(["m5-current-item", input.token.uid, moment.itemKey, state.episode.checkedAt]),
    priority: 0,
    opener,
    chips,
    contextUpdatedAt: state.updatedAt ?? state.episode.checkedAt,
  };
}

export async function currentBoardSignalDeepDiveResponse(input: CurrentDeepDiveInput): Promise<GuideResponse | undefined> {
  if (!input.token || !safeText(input.pathname, 300).includes("boardsignal/player-room")) return undefined;
  if ((safeTab(input.activeTab) ?? "desk") !== "desk") return undefined;
  const message = normalizeMessage(input.message);
  if (!message) return undefined;
  const referent = lastCurrentReferent(input.recentConversation);
  const explicit = explicitCurrentQuestion(message);
  const followup = Boolean(referent) && currentFollowup(message);
  if (!explicit && !followup) return undefined;

  const state = await loadCurrentState(input.token);
  if (!state) return undefined;
  const moment = currentMoment(state);
  const guidance = state.episode.nextGameGuidance;
  const chips = currentChips(moment, guidance);
  const currentReferent = provenance(moment, state.episode).id;

  if (referent && currentReferent && referent !== currentReferent && followup) {
    return responseFor(
      `That Current BoardSignal item has changed since the answer you're referring to. The current card now says: ${moment.headline} ${moment.evidence}`,
      moment,
      state.episode,
      chips,
    );
  }

  if (/show me an example/.test(message) || (followup && /^show me/.test(message))) {
    return responseFor(exampleReply(guidance), moment, state.episode, chips);
  }

  if (/what should i do next/.test(message)) {
    return responseFor(nextGameReply(guidance), moment, state.episode, chips);
  }

  if (/how does this compare with my last review/.test(message)) {
    return responseFor(compareReply(guidance), moment, state.episode, chips);
  }

  if (/what changed since last time/.test(message)) {
    const reply = moment.variant === "since_away"
      ? `Since your last Player Room visit: ${moment.evidence}`
      : guidance.source === "previous_review" || guidance.source === "current_week_reinforces_previous_review"
        ? compareReply(guidance)
        : "This card is a current snapshot, not a before-and-after claim. BoardSignal does not have a separate verified change fact for this exact item, so I won't manufacture one.";
    return responseFor(reply, moment, state.episode, chips);
  }

  if (/is this getting better/.test(message)) {
    return responseFor(
      `This current item is movement, not proof of overall improvement. ${moment.evidence} Use Progress for Review-to-Review direction rather than turning one live period into a verdict.`,
      moment,
      state.episode,
      chips,
      [{ id: "open-progress", label: "Open Progress", href: "/boardsignal/player-room?tab=progress", kind: "navigate" }],
    );
  }

  if (/what are you watching/.test(message)) {
    const evidenceCount = Number(guidance.evidenceCount ?? 0);
    const evidenceLine = evidenceCount > 0
      ? `It has ${evidenceCount} current supporting example${evidenceCount === 1 ? "" : "s"} so far.`
      : "It has not built enough repeated current evidence for a stronger claim yet.";
    return responseFor(
      `BoardSignal is watching whether ${familyLabel(guidance.family)} repeats, strengthens, or gives way to something else as more games arrive. ${evidenceLine}`,
      moment,
      state.episode,
      chips,
    );
  }

  return responseFor(whyReply(moment, guidance), moment, state.episode, chips);
}
