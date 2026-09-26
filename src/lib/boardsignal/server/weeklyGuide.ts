import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import type { GuideResponse } from "../guide";
import { NO_ACTIVITY_COPY, performanceEvidencePeriods } from "../reviewPeriods";
import {
  buildReviewProgress,
  deriveRecurringPatternsFromReviewHistory,
  type CompletedReviewHistoryItem,
} from "../reviewHistory";
import { accountForToken, loadCompletedReviewHistory } from "./persistence";
import { loadRecentReportPeriodTruth } from "./reviewPeriods";

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ");
}

const RECENT_HISTORY = /last (?:few|several|four) weeks|recent weeks|weekly history|report periods|no activity|quiet week|weeks? (?:have i|i've)|how have i been doing|how am i doing lately|recent history|recent reviews|review history|progress across/;
const IMPROVEMENT = /am i improving|what am i getting better at|getting better|improv(?:e|ed|ing|ement)/;
const CHANGED = /what changed across (?:my )?reviews|what(?:'s| has) changed across|changed across (?:my )?reviews|review[- ]to[- ]review|how (?:have|did) my reviews change/;
const REPEATING = /what keeps repeating|keeps? repeating|keep repeating|recurr(?:ing|ence|ent)|showing up again|what keeps showing up/;
const FOCUS = /what should i focus on|what should i work on|focus next|work on next|what to focus on/;

function asksRecentHistory(message: string) {
  return RECENT_HISTORY.test(message) || IMPROVEMENT.test(message) || CHANGED.test(message) || REPEATING.test(message) || FOCUS.test(message);
}

function response(reply: string, provenanceId: string): GuideResponse {
  return {
    reply,
    chips: ["Am I improving?", "What changed across my Reviews?", "What keeps repeating?", "What should I focus on?"],
    actions: [],
    handoffAvailable: false,
    intent: "progress",
    category: "general",
    provenance: { kind: "desk", id: provenanceId, title: "RECENT REPORT PERIODS" },
  };
}

function quietContext(periods: Awaited<ReturnType<typeof loadRecentReportPeriodTruth>>["periods"]) {
  const quiet = periods.filter(period => period.outcome === "no_activity");
  if (!quiet.length) return "";
  return ` ${quiet.length} completed week${quiet.length === 1 ? " is" : "s are"} NO ACTIVITY. ${quiet.length === 1 ? "It remains" : "They remain"} in the chronology but contribute zero chess-performance evidence.`;
}

function comparableChanges(evidence: CompletedReviewHistoryItem[]) {
  const series = buildReviewProgress(evidence);
  return series.flatMap(item => {
    const first = item.points[0];
    const latest = item.points.at(-1);
    if (!first || !latest) return [];
    const scoreDelta = first.scorePct !== undefined && latest.scorePct !== undefined
      ? Number((latest.scorePct - first.scorePct).toFixed(1))
      : undefined;
    const firstReview = evidence.find(review => review.reviewKey === first.deskKey);
    const latestReview = evidence.find(review => review.reviewKey === latest.deskKey);
    const firstPool = firstReview?.pools.find(pool => pool.pool.toLowerCase() === item.pool.toLowerCase());
    const latestPool = latestReview?.pools.find(pool => pool.pool.toLowerCase() === item.pool.toLowerCase());
    const ratingEndDelta = firstPool?.ratingEnd !== undefined && latestPool?.ratingEnd !== undefined
      ? latestPool.ratingEnd - firstPool.ratingEnd
      : undefined;
    return [{ pool: item.pool, reviews: item.points.length, scoreDelta, ratingEndDelta }];
  });
}

function formatChange(change: ReturnType<typeof comparableChanges>[number]) {
  const facts = [
    change.ratingEndDelta !== undefined ? `end rating ${change.ratingEndDelta >= 0 ? "+" : ""}${change.ratingEndDelta}` : undefined,
    change.scoreDelta !== undefined ? `Review score ${change.scoreDelta >= 0 ? "+" : ""}${change.scoreDelta.toFixed(1)} percentage points` : undefined,
  ].filter(Boolean);
  return facts.length ? `${change.pool}: ${facts.join("; ")}` : undefined;
}

function familyLabel(value: string) {
  return value.replaceAll("_", " ");
}

export async function weeklyHistoryGuideResponse(token: DecodedIdToken | undefined, messageInput: unknown): Promise<GuideResponse | undefined> {
  if (!token) return undefined;
  const message = normalize(messageInput);
  if (!asksRecentHistory(message)) return undefined;
  const account = await accountForToken(token);
  const [{ periods, coverage }, history] = await Promise.all([
    loadRecentReportPeriodTruth(account),
    loadCompletedReviewHistory(account.uid).catch(() => []),
  ]);
  if (!periods.length) {
    return response(
      "BoardSignal does not have a completed seven-day report period for you yet. Your current week can still be forming without being treated as a completed Review.",
      `report-periods:none:${account.uid}`,
    );
  }

  // This is the one bounded evidence set used for every longitudinal answer below.
  // NO ACTIVITY and out-of-window Reviews never enter performance interpretation.
  const gameBearing = performanceEvidencePeriods(periods, history)
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const pending = periods.filter(period => !period.outcome);
  const chronology = periods
    .map(period => `${period.periodLabel}: ${period.outcome === "review" ? "REVIEW" : period.outcome === "no_activity" ? "NO ACTIVITY" : "still syncing"}`)
    .join("; ");
  const provenanceId = `report-periods:${periods.map(period => period.periodStart).join(",")}`;
  const quiet = quietContext(periods);
  const syncing = pending.length
    ? ` ${pending.length} of the latest ${coverage.totalCount} completed period${pending.length === 1 ? " is" : "s are"} still being synchronized, so I won't invent a result for ${pending.length === 1 ? "it" : "them"}.`
    : "";

  if (REPEATING.test(message)) {
    const repeated = deriveRecurringPatternsFromReviewHistory(gameBearing).filter(pattern => pattern.status === "repeated");
    if (!repeated.length) {
      return response(`Nothing has cleared BoardSignal's repeated-pattern rule across the game-bearing Reviews in your current four-period window yet.${quiet}${syncing}`, provenanceId);
    }
    const lead = repeated[0];
    return response(`${familyLabel(lead.family)} appeared in ${lead.appearances} of the ${lead.desksCompared} game-bearing Reviews compared. That's recurrence in verified Review evidence, not proof it happens in every game.${quiet}${syncing}`, provenanceId);
  }

  if (FOCUS.test(message)) {
    const latest = gameBearing.at(-1);
    if (!latest) return response(`There is no game-bearing Review in the current four-period evidence window, so BoardSignal has no verified Focus Next to give from recent history.${quiet}${syncing}`, provenanceId);
    if (!latest.blue?.title && !latest.blue?.copy) return response(`Your latest game-bearing Review (${latest.periodLabel}) did not publish a supported Focus Next, so I won't invent one.${quiet}${syncing}`, provenanceId);
    return response(`From your latest game-bearing Review (${latest.periodLabel}), FOCUS NEXT — ${latest.blue.title}${latest.blue.copy ? ` ${latest.blue.copy}` : ""}.${quiet}${syncing}`, provenanceId);
  }

  const changes = comparableChanges(gameBearing);
  const changeFacts = changes.map(formatChange).filter((fact): fact is string => Boolean(fact));

  if (IMPROVEMENT.test(message)) {
    if (gameBearing.length < 2 || !changeFacts.length) {
      return response(`BoardSignal does not have at least two comparable game-bearing Reviews in this four-period window to support an improvement claim yet.${quiet}${syncing}`, provenanceId);
    }
    const positive = changes.filter(change => (change.ratingEndDelta ?? 0) > 0 || (change.scoreDelta ?? 0) > 0).map(formatChange).filter((fact): fact is string => Boolean(fact));
    if (/getting better/.test(message)) {
      return response(positive.length
        ? `The measurable recent positives I can support are: ${positive.slice(0, 2).join(". ")}. Those are bounded Review-to-Review movements, not a claim about your personality or every part of your chess.${quiet}${syncing}`
        : `I don't have a measurable positive same-pool movement strong enough to call “getting better” in the current game-bearing Review window yet. I won't turn a quiet week or a short sample into that claim.${quiet}${syncing}`, provenanceId);
    }
    return response(`Across comparable game-bearing Reviews, ${changeFacts.slice(0, 2).join(". ")}. Those are real recent movements in the saved Review evidence, but BoardSignal won't collapse a four-period window into a blanket verdict that you're improving overall.${quiet}${syncing}`, provenanceId);
  }

  if (CHANGED.test(message)) {
    if (!changeFacts.length) return response(`The current game-bearing Reviews do not yet provide two same-pool samples for a clean Review-to-Review comparison.${quiet}${syncing}`, provenanceId);
    return response(`Across your comparable game-bearing Reviews: ${changeFacts.slice(0, 3).join(". ")}.${quiet}${syncing}`, provenanceId);
  }

  return response(
    `Your recent BoardSignal chronology is: ${chronology}. ${gameBearing.length} of these completed periods contain game-bearing Review evidence.${quiet}${syncing}`,
    provenanceId,
  );
}
