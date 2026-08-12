import type { HeadToHeadPayload, SocialPlayerCard } from "./social";

export type GuideTone = "Balanced" | "Direct" | "Analytical" | "Sports Desk" | "Encouraging";
export type GuideDetailLevel = "Short" | "Standard" | "Detailed";

export type GuideNotificationPreferences = {
  email: boolean;
  browserPush: boolean;
  deskReady: boolean;
  episodeProgress: boolean;
  blueReminder: boolean;
  amberWatch: boolean;
  universeAchievement: boolean;
  founderUpdates: boolean;
};

export type GuidePreferences = {
  preferredTone: GuideTone;
  preferredDetailLevel: GuideDetailLevel;
  preferredAddress?: string;
  likesSportsFraming: boolean;
  likesDirectAnswers: boolean;
  likesComparisons: boolean;
  likesProgressContext: boolean;
  lastExplicitToneFeedback?: string;
  updatedAt?: string;
};

export type GuideConversationMemory = {
  recentTopics: string[];
  unresolvedQuestion?: string;
  lastMeaningfulAction?: string;
  recentSupportIssue?: string;
  recentSentiment?: "positive" | "neutral" | "frustrated" | "confused" | "excited";
  recentSentimentAt?: string;
  productSignals: string[];
  updatedAt?: string;
};

export type GuidePulseFact = { eyebrow: string; title: string; body: string; facts?: string[] };
export type GuideStanding = { categoryTitle: string; scopeLabel?: string; rank: number; denominator: number; valueLabel: string };
export type GuideDesk = {
  periodLabel: string;
  headline: string;
  summary: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  score: number;
  primaryPool: string;
  blue?: { title: string; copy: string };
  amber?: { title: string; copy: string };
  red?: { title: string; copy: string };
};

export type GuideContext = {
  authenticated: boolean;
  pathname: string;
  activeTab?: string;
  canonicalUsername?: string;
  currentEpisode?: { status?: string; games: number; wins: number; draws: number; losses: number; daysCompleted?: number; daysRemaining?: number; checkedAt?: string };
  latestDesk?: GuideDesk;
  recentDeskLabels?: string[];
  pulseFacts?: GuidePulseFact[];
  standings?: GuideStanding[];
  shareMoments?: Array<{ id: string; headline: string; supportingFact: string; statValue: string; statLabel: string }>;
  friends?: SocialPlayerCard[];
  incomingRequests?: SocialPlayerCard[];
  outgoingRequests?: SocialPlayerCard[];
  rivalWatch?: Array<{ player: SocialPlayerCard; label: string; detail: string }>;
  comparison?: HeadToHeadPayload;
  unreadInboxCount?: number;
  latestAnnouncement?: { title: string; body: string; link?: string; actionLabel?: string };
  notificationPreferences?: GuideNotificationPreferences;
  preferences?: GuidePreferences;
  tourState?: "unseen" | "completed" | "dismissed";
  releaseHintDismissed?: boolean;
};

export type GuideAction = {
  id: string;
  label: string;
  href?: string;
  kind?: "navigate" | "handoff" | "preference" | "tour" | "feedback";
  requiresConfirmation?: boolean;
  payload?: Record<string, string | boolean>;
};

export type GuideResponse = {
  reply: string;
  chips: string[];
  actions: GuideAction[];
  handoffAvailable: boolean;
  contextReason?: string;
  intent: GuideIntent;
  category?: GuideQuestionCategory;
};

export type GuideQuestionCategory =
  | "privacy_question" | "universe_question" | "ranking_confusion" | "signal_explanation" | "desk_missing"
  | "login_help" | "share_help" | "friend_help" | "notification_help" | "feature_request" | "support_request" | "general";

export type GuideIntent =
  | "welcome" | "what_is_boardsignal" | "how_it_works" | "privacy" | "agreement" | "beta_next" | "beta_cost" | "sign_in" | "username_reason"
  | "universe_what" | "universe_included" | "what_changed" | "explain_desk" | "explain_signal" | "progress" | "explain_rank"
  | "in_reach" | "whats_hot" | "friends" | "friend_requests" | "compare_friend" | "inbox" | "message_founder"
  | "notifications" | "whats_new" | "share" | "tour" | "tone" | "random_position" | "support" | "unknown";

export const DEFAULT_GUIDE_PREFERENCES: GuidePreferences = {
  preferredTone: "Balanced",
  preferredDetailLevel: "Standard",
  likesSportsFraming: true,
  likesDirectAnswers: true,
  likesComparisons: true,
  likesProgressContext: true,
};

const DIAGNOSIS_FIELDS = ["depressed", "anxious", "neurotic", "addicted", "vulnerable", "lowSelfEsteem", "impulsivePersonality", "personalityDisorder", "mentalHealthDiagnosis", "psychologicalSusceptibility", "manipulationScore"] as const;
export function forbiddenGuideProfileFields() { return [...DIAGNOSIS_FIELDS]; }

function lower(value: string) { return value.trim().toLowerCase(); }
function has(value: string, ...parts: string[]) { const v = lower(value); return parts.some((part) => v.includes(part)); }

export function guideCategoryForIntent(intent: GuideIntent): GuideQuestionCategory {
  if (intent === "privacy" || intent === "universe_included") return "privacy_question";
  if (["explain_rank", "in_reach", "whats_hot", "what_changed"].includes(intent)) return intent === "explain_rank" ? "ranking_confusion" : "universe_question";
  if (intent === "explain_signal") return "signal_explanation";
  if (["friends", "friend_requests", "compare_friend"].includes(intent)) return "friend_help";
  if (intent === "notifications") return "notification_help";
  if (intent === "share") return "share_help";
  if (["message_founder", "support"].includes(intent)) return "support_request";
  return "general";
}

export function detectGuideIntent(message: string, context: Pick<GuideContext, "pathname" | "activeTab">): GuideIntent {
  const text = lower(message);
  if (!text) return "welcome";
  if ((has(text, "best move", "what move", "random position", "fen ") || /^[rnbqkp1-8\/]+\s[wb]\s/.test(text)) && has(text, "move", "position", "fen")) return "random_position";
  if (has(text, "message ayanda", "talk to ayanda", "founder", "human", "support person")) return "message_founder";
  if (has(text, "not working", "broken", "incorrect data", "wrong data", "privacy issue", "help me", "support")) return "support";
  if (has(text, "what changed", "since i was away", "since my last", "what's changed", "whats changed")) return "what_changed";
  if (context.activeTab === "agreement" && has(text, "explain this simply", "explain the agreement", "what am i agreeing")) return "agreement";
  if (has(text, "what is boardsignal", "what's boardsignal", "whats boardsignal")) return "what_is_boardsignal";
  if (has(text, "how does it work", "how it works")) return "how_it_works";
  if (has(text, "how much", "beta cost", "cost of beta", "beta price", "pay for beta")) return "beta_cost";
  if (has(text, "where do i sign in", "how do i sign in", "sign in", "log in")) return "sign_in";
  if (has(text, "what is universe", "what's universe", "whats universe", "what is the universe", "why am i here")) return "universe_what";
  if (has(text, "what stays private", "what is private", "what's private", "privacy", "public")) return "privacy";
  if (has(text, "why do you need my username", "why username")) return "username_reason";
  if (has(text, "what happens next", "after request", "beta request", "request beta access", "get my boardsignal")) return "beta_next";
  if (has(text, "why is universe included", "universe included")) return "universe_included";
  if (has(text, "explain this desk", "explain my desk", "week's story", "weeks story", "headline")) return "explain_desk";
  if (has(text, "amber", "blue", "red signal", "my signal", "signals")) return "explain_signal";
  if (has(text, "compare my recent desks", "am i improving", "progress", "repeated")) return "progress";
  if (has(text, "why am i #", "why am i number", "why is my rank", "explain rank", "why #")) return "explain_rank";
  if (has(text, "in reach", "closest ahead", "who is ahead", "closing the gap", "who passed me")) return "in_reach";
  if (has(text, "what's hot", "whats hot", "who just joined")) return "whats_hot";
  if (has(text, "show my requests", "friend requests", "requests")) return "friend_requests";
  if (has(text, "compare with", "compare me", "who has the edge", "where are we closest", "head to head", "head-to-head")) return "compare_friend";
  if (has(text, "who is closest to me", "which friend", "friends", "rival")) return "friends";
  if (has(text, "unread", "inbox")) return "inbox";
  if (has(text, "notification", "alerts", "reminder")) return "notifications";
  if (has(text, "what's new", "whats new", "new feature", "update")) return "whats_new";
  if (has(text, "share moment", "share my", "strongest moment", "best moment")) return "share";
  if (has(text, "tour", "show me around")) return "tour";
  if (has(text, "where should i look first", "where do i start")) return "how_it_works";
  if (has(text, "tone", "short answers", "direct answers", "analytical", "sports desk", "encouraging")) return "tone";
  if (context.activeTab === "friends" || context.pathname.includes("friends")) return "friends";
  if (context.activeTab === "universe" || context.pathname.includes("feed")) return "unknown";
  return "unknown";
}

export function pageGuideSuggestions(pathname: string, activeTab?: string, authenticated = false) {
  if (!authenticated) {
    if (activeTab === "beta-request" || pathname.includes("join")) return ["What happens next?", "Why do you need my username?", "What becomes public?"];
    if (pathname.includes("boardsignal") && !pathname.includes("player-room")) return ["What happens next?", "Why do you need my username?", "What stays private?"];
    return ["What is BoardSignal?", "How does it work?", "What stays private?", "Get my BoardSignal"];
  }
  if (activeTab === "agreement") return ["Explain this simply", "What stays private?", "Why is Universe included?"];
  if (activeTab === "head-to-head") return ["Who has the edge?", "Where are we closest?", "What changed recently?"];
  if (activeTab === "desk") return ["Explain this Desk", "What changed?", "Show my strongest moment"];
  if (activeTab === "progress") return ["Compare my recent Desks", "Am I improving?", "What has repeated?"];
  if (activeTab === "universe") return ["Why am I here?", "Who's in reach?", "What's hot?"];
  if (activeTab === "friends") return ["Who is closest to me?", "Show my requests", "Who can I compare with?"];
  if (activeTab === "inbox") return ["What's unread?", "Message Ayanda"];
  if (activeTab === "profile") return ["Change my notification preferences", "What is public?"];
  if (pathname.includes("share")) return ["What can I share?", "What stays private?"];
  return ["What changed?", "Where should I look first?", "What's new?"];
}

function baseActions(context: GuideContext): GuideAction[] {
  if (!context.authenticated) return [{ id: "join", label: "Get my BoardSignal", href: "/#get-my-boardsignal", kind: "navigate" }, { id: "signin", label: "Open My Player Room", href: "/boardsignal/player-room", kind: "navigate" }];
  return [{ id: "desk", label: "Open my latest Desk", href: "/boardsignal/player-room?tab=desk", kind: "navigate" }, { id: "progress", label: "Show my Progress", href: "/boardsignal/player-room?tab=progress", kind: "navigate" }];
}

function trimChips(items: string[]) { return [...new Set(items)].slice(0, 5); }
function joinFacts(facts: string[]) { return facts.filter(Boolean).slice(0, 4).join(" "); }

export type GuideBrainResult = { intent: GuideIntent; context: GuideContext; message: string };
export interface GuideRenderer { render(result: GuideBrainResult): GuideResponse; }
export function runGuideBrain(message: string, context: GuideContext): GuideBrainResult {
  return { intent: detectGuideIntent(message, context), context, message };
}

export function renderGuideResponse(intent: GuideIntent, context: GuideContext, message = ""): GuideResponse {
  const chips = pageGuideSuggestions(context.pathname, context.activeTab, context.authenticated);
  const actions: GuideAction[] = [];
  let reply = "I can explain what BoardSignal already knows, help you navigate it, or get Ayanda involved when something needs a human.";
  let contextReason = context.activeTab ? `Using your ${context.activeTab} page context.` : `Using ${context.pathname || "/"} page context.`;

  switch (intent) {
    case "what_is_boardsignal":
      reply = "BoardSignal turns a fixed seven days of your Chess.com games into a personal sports Desk: what happened, what mattered, your private Signals, progress across recent Desks, and your public-safe place in the Universe.";
      actions.push({ id: "how", label: "See how it works", href: "/how-it-works", kind: "navigate" });
      break;
    case "how_it_works":
      reply = "BoardSignal uses your Chess.com identity, closes one seven-day episode at a time, builds the Desk deterministically, and keeps your latest four completed Desks active. Your next episode can form between publications without becoming a new diagnostic Desk.";
      actions.push(...baseActions(context));
      break;
    case "privacy":
      reply = "Public coverage is limited to safe sports facts such as your username, avatar, supported highlights and Universe placement. Red, private Amber, Blue, evidence, recurrence, contact details, access credentials and private messages stay private.";
      actions.push({ id: "privacy", label: "Open privacy", href: "/boardsignal/privacy", kind: "navigate" });
      break;
    case "agreement":
      reply = "In plain language: Founding Beta gives you a persistent BoardSignal account; each completed Desk may contribute safe sports-style Universe coverage; your private weakness layer, evidence, progress details, contact information and messages stay private; and beta contact consent is for BoardSignal account, Desk, product-update and feedback communication—not unrelated marketing.";
      actions.push({ id: "terms", label: "Open Beta terms", href: "/boardsignal/beta-terms", kind: "navigate" }, { id: "privacy", label: "Open privacy", href: "/boardsignal/privacy", kind: "navigate" });
      break;
    case "username_reason":
      reply = "Your Chess.com username lets BoardSignal resolve the stable Chess.com player ID that anchors your account. The stable ID—not the spelling of your username—is what keeps your Desks, Friends and future OAuth identity attached to the same player.";
      break;
    case "beta_next":
      reply = context.authenticated ? "You're already inside your persistent Founding Beta account. Your completed Desks belong to this Player Room and your current episode can form here between weeks." : "After you request Founding Beta access, Ayanda reviews it. If approved, you receive a private access code, accept the Founding Beta agreement, set communication preferences, and enter your persistent Player Room.";
      actions.push(...baseActions(context));
      break;
    case "beta_cost":
      reply = "Current Founding Beta access does not require billing or a payment gate. BoardSignal is measuring the join → return → repeat loop before pricing is introduced.";
      actions.push({ id: "join", label: "Get my BoardSignal", href: "/#get-my-boardsignal", kind: "navigate" });
      break;
    case "sign_in":
      reply = context.authenticated ? "You're already signed in to your persistent BoardSignal Player Room." : "Open My Player Room and use your working Founding Beta access path. Returning Firebase sessions should take you straight back into the Room.";
      actions.push({ id: "signin", label: "Open My Player Room", href: "/boardsignal/player-room", kind: "navigate" });
      break;
    case "universe_what":
      reply = "The BoardSignal Universe is the public-safe recent sports field built primarily from active completed Desks. It can show supported leaders, Top 3 placements, What's Hot and safe coverage without exposing private weakness data.";
      actions.push({ id: "universe", label: "Open Universe", href: "/feed", kind: "navigate" });
      break;
    case "universe_included":
      reply = "Founding Beta includes safe BoardSignal Universe participation. A completed Desk may contribute a positive or neutral factual sports item. That does not make your private weakness layer public.";
      break;
    case "what_changed": {
      if (!context.authenticated) { reply = "I can only show personal changes after you sign in to your Player Room."; actions.push({ id: "signin", label: "Open My Player Room", href: "/boardsignal/player-room", kind: "navigate" }); break; }
      const facts = (context.pulseFacts ?? []).flatMap((item) => [item.title, item.body, ...(item.facts ?? [])]).filter(Boolean);
      reply = facts.length ? `Since your last visit: ${joinFacts(facts)}` : "Nothing factual in your saved Pulse says your board changed since the last check. I won't manufacture movement just to fill the page.";
      actions.push({ id: "pulse", label: "Open Pulse", href: "/boardsignal/player-room?tab=universe", kind: "navigate" }, { id: "universe", label: "Open Universe", href: "/feed", kind: "navigate" });
      break;
    }
    case "explain_desk":
      reply = context.latestDesk ? `${context.latestDesk.headline} BoardSignal chose that story from the completed ${context.latestDesk.periodLabel} episode: ${context.latestDesk.summary}` : "There isn't a completed Desk in the verified account context for me to explain yet.";
      actions.push({ id: "desk", label: "Open my latest Desk", href: "/boardsignal/player-room?tab=desk", kind: "navigate" });
      break;
    case "explain_signal": {
      if (!context.latestDesk) { reply = "I need a completed Desk before I can explain one of its Signals."; break; }
      const text = lower(message);
      const selected = text.includes("amber") ? context.latestDesk.amber : text.includes("red") ? context.latestDesk.red : context.latestDesk.blue;
      reply = selected ? `${selected.title}: ${selected.copy} This is an explanation of the Signal already produced by your completed Desk—not new chess analysis.` : "Your latest Desk has no matching saved Signal for that request.";
      actions.push({ id: "signals", label: "Open my signals", href: "/boardsignal/player-room?tab=desk#signals", kind: "navigate" });
      break;
    }
    case "progress":
      reply = context.recentDeskLabels?.length ? `Your active comparison window currently contains ${context.recentDeskLabels.length} completed Desk${context.recentDeskLabels.length === 1 ? "" : "s"}: ${context.recentDeskLabels.join(" · ")}. Progress uses this moving recent-four view rather than an infinite archive.` : "You need completed Desks before BoardSignal can show recent progress.";
      actions.push({ id: "progress", label: "Open Progress", href: "/boardsignal/player-room?tab=progress", kind: "navigate" });
      break;
    case "explain_rank": {
      const best = [...(context.standings ?? [])].sort((a,b) => a.rank-b.rank)[0];
      reply = best ? `Your strongest verified current standing here is #${best.rank} of ${best.denominator} in ${best.categoryTitle}${best.scopeLabel ? ` · ${best.scopeLabel}` : ""}, based on the deterministic completed-Desk field. Forming-episode projections do not become official ranks.` : "I don't have a current official Universe standing in the verified context to explain.";
      actions.push({ id: "universe", label: "Open Universe", href: "/boardsignal/player-room?tab=universe", kind: "navigate" });
      break;
    }
    case "in_reach": {
      const proximity = (context.pulseFacts ?? []).find((item) => /reach|radar|challenger|place/i.test(`${item.eyebrow} ${item.title} ${item.body}`));
      reply = proximity ? `${proximity.title} ${proximity.body}` : "I don't have a current verified In Reach / nearby-field fact for you. BoardSignal only names proximity when the numerical gap is meaningful.";
      actions.push({ id: "universe", label: "Open Universe", href: "/boardsignal/player-room?tab=universe", kind: "navigate" });
      break;
    }
    case "whats_hot":
      reply = "What's Hot is BoardSignal's deterministic recent-sports layer. It favors recency, magnitude, field impact and novelty—never likes, followers or AI judgment.";
      actions.push({ id: "universe", label: "See What's Hot", href: "/feed", kind: "navigate" });
      break;
    case "friends": {
      const friends = context.friends ?? [];
      const rival = context.rivalWatch?.[0];
      reply = rival ? `${rival.label}: ${rival.player.canonicalUsername}. ${rival.detail}` : friends.length ? `You currently have ${friends.length} accepted BoardSignal friend${friends.length === 1 ? "" : "s"}. I only compare public-safe sporting results; friendship never opens private Signals or evidence.` : "You don't have an accepted BoardSignal friend yet. The Friends page can show active players to discover and lets you search by canonical Chess.com username.";
      actions.push({ id: "friends", label: "Open Friends", href: "/boardsignal/player-room?tab=friends", kind: "navigate" });
      break;
    }
    case "friend_requests":
      reply = `You have ${(context.incomingRequests ?? []).length} incoming and ${(context.outgoingRequests ?? []).length} outgoing friend request${((context.incomingRequests ?? []).length + (context.outgoingRequests ?? []).length) === 1 ? "" : "s"}.`;
      actions.push({ id: "friends", label: "Show my requests", href: "/boardsignal/player-room?tab=friends", kind: "navigate" });
      break;
    case "compare_friend": {
      const comparison = context.comparison;
      if (!comparison) { reply = "I can compare accepted friends when you name one whose Head-to-Head context is available. I won't compare private coaching data or mix rating pools."; actions.push({ id: "friends", label: "Choose a friend", href: "/boardsignal/player-room?tab=friends", kind: "navigate" }); break; }
      const metric = comparison.metrics[0];
      reply = metric ? `${metric.label}: ${comparison.left.canonicalUsername} ${metric.leftValue} vs ${comparison.right.canonicalUsername} ${metric.rightValue}.${metric.note ? ` ${metric.note}` : ""}` : `There is not yet a meaningful comparable sample between ${comparison.left.canonicalUsername} and ${comparison.right.canonicalUsername}.`;
      actions.push({ id: "friends", label: "Open Head-to-Head", href: `/boardsignal/player-room?tab=friends&compare=${comparison.right.playerId}`, kind: "navigate" });
      break;
    }
    case "inbox":
      reply = context.authenticated ? `You have ${context.unreadInboxCount ?? 0} unread BoardSignal message${context.unreadInboxCount === 1 ? "" : "s"}.` : "Inbox is private to an authenticated BoardSignal player.";
      actions.push({ id: "inbox", label: "Open Inbox", href: "/boardsignal/player-room?tab=inbox", kind: "navigate" });
      break;
    case "message_founder":
    case "support":
      reply = context.authenticated ? "I can hand this to Ayanda through your existing private BoardSignal conversation, with the current page and issue category attached so you don't have to repeat the basics." : "For account-specific help, sign in first so BoardSignal can attach the right private account context.";
      if (context.authenticated) actions.push({ id: "handoff", label: "Message Ayanda", kind: "handoff", requiresConfirmation: true });
      else actions.push({ id: "signin", label: "Open My Player Room", href: "/boardsignal/player-room", kind: "navigate" });
      break;
    case "notifications":
      reply = context.authenticated ? "Your notification settings live in Profile. I can take you there, but changing a setting always requires an explicit confirmation—it never happens from an ambiguous chat message." : "Notification preferences are available after you sign in.";
      actions.push({ id: "profile", label: "Open notification preferences", href: "/boardsignal/player-room?tab=profile", kind: "navigate" });
      break;
    case "whats_new":
      reply = context.latestAnnouncement ? `${context.latestAnnouncement.title}. ${context.latestAnnouncement.body}` : "There isn't a current major Founder announcement in your Inbox context.";
      if (context.latestAnnouncement?.link) actions.push({ id: "announcement", label: context.latestAnnouncement.actionLabel ?? "Open update", href: context.latestAnnouncement.link, kind: "navigate" });
      break;
    case "share": {
      const best = context.shareMoments?.[0];
      reply = best ? `${best.headline} — ${best.statValue} ${best.statLabel}. That's a public-safe Share Moment from an already completed Desk; your private Signals and evidence are excluded.` : "I don't have a verified Share Moment in the current context yet.";
      if (best) actions.push({ id: "share", label: "Share my best moment", href: `/share/${encodeURIComponent(best.id)}`, kind: "navigate" });
      break;
    }
    case "tour":
      reply = "The 30-second tour is: Desk for the finished week, Progress for the recent-four pattern, Universe for the field, Friends for comparisons, and Inbox / Ask BoardSignal for communication and help.";
      actions.push({ id: "tour-start", label: "Show me", kind: "tour" }, { id: "tour-later", label: "Maybe later", kind: "tour" });
      break;
    case "tone":
      reply = `Your current Ask BoardSignal tone is ${context.preferences?.preferredTone ?? "Balanced"}. Tone changes only after you explicitly choose one.`;
      actions.push(...(["Direct", "Analytical", "Sports Desk", "Balanced"] as GuideTone[]).map((tone) => ({ id: `tone:${tone}`, label: tone, kind: "preference" as const, requiresConfirmation: true, payload: { preferredTone: tone } })));
      break;
    case "random_position":
      reply = "I can explain analysis already produced inside your BoardSignal Desk. I don't create new chess analysis from random positions in the guide.";
      actions.push({ id: "desk", label: "Open my Desk", href: "/boardsignal/player-room?tab=desk", kind: "navigate" });
      break;
    case "welcome": {
      const address = context.preferences?.preferredAddress?.trim();
      reply = context.authenticated ? `${address ? `${address}, ` : ""}Ask BoardSignal is here to explain your Desk, Pulse, Universe, Friends and account without creating new chess analysis.${context.pulseFacts?.length ? " Your Board has recent movement I can explain." : ""}${context.tourState === "unseen" ? " Want the 30-second tour?" : ""}` : "Ask BoardSignal can explain the product, privacy, Universe and Founding Beta flow. Sign in for personal Desk, Pulse, Friends and Inbox context.";
      if (context.authenticated && context.tourState === "unseen") actions.push({ id: "tour-start", label: "Show me", kind: "tour" }, { id: "tour-later", label: "Maybe later", kind: "tour" });
      if (context.authenticated && context.tourState !== "unseen" && context.releaseHintDismissed === false) actions.push({ id: "friends-release", label: "See Friends & Rivals", href: "/boardsignal/player-room?tab=friends", kind: "navigate" }, { id: "release-later", label: "Later", kind: "tour" });
      break;
    }
    default:
      reply = "I can help with this page, your recent BoardSignal facts, Friends comparisons, privacy, Inbox, or support. I won't guess at chess facts that BoardSignal hasn't produced.";
      if (context.authenticated) actions.push({ id: "handoff", label: "Message Ayanda", kind: "handoff", requiresConfirmation: true });
      break;
  }

  const tone = context.preferences?.preferredTone ?? "Balanced";
  const detail = context.preferences?.preferredDetailLevel ?? "Standard";
  if (tone === "Sports Desk" && intent === "what_changed" && (context.pulseFacts?.length ?? 0) > 0 && !reply.startsWith("Your Board moved.")) {
    reply = `Your Board moved. ${reply}`;
  }
  if (tone === "Analytical") {
    contextReason = `${contextReason} Facts are limited to verified BoardSignal state.`;
  }
  const maxChips = detail === "Short" ? 3 : 5;
  const maxActions = detail === "Short" ? 3 : 5;

  return { reply, chips: trimChips(chips).slice(0, maxChips), actions: actions.slice(0, maxActions), handoffAvailable: context.authenticated, contextReason, intent, category: guideCategoryForIntent(intent) };
}

export const deterministicGuideRenderer: GuideRenderer = {
  render(result) { return renderGuideResponse(result.intent, result.context, result.message); },
};

export function boundedGuideMemory(memory: GuideConversationMemory, topic: string, signal?: string): GuideConversationMemory {
  return {
    ...memory,
    recentTopics: [...new Set([topic, ...(memory.recentTopics ?? [])])].slice(0, 6),
    productSignals: [...new Set([...(signal ? [signal] : []), ...(memory.productSignals ?? [])])].slice(0, 8),
  };
}

export function expressedSentiment(message: string): GuideConversationMemory["recentSentiment"] {
  const text = lower(message);
  if (has(text, "frustrated", "annoyed", "this is broken", "still broken")) return "frustrated";
  if (has(text, "confused", "don't understand", "dont understand", "doesn't make sense", "doesnt make sense")) return "confused";
  if (has(text, "excited", "love this", "this is great")) return "excited";
  if (has(text, "thanks", "thank you", "helpful", "got it")) return "positive";
  return undefined;
}
