import type { CurrentEpisodeWithNextGameGuidance } from "./activeWeekGuidance";
import type { PlayerPulse, PublicUniverseEvent } from "./pulse";

export type CurrentBoardSignalMomentVariant =
  | "since_away"
  | "positive_run"
  | "difficult_run"
  | "draw_stable"
  | "rating_move"
  | "current_guidance"
  | "quiet"
  | "no_games"
  | "current_fact";

export type CurrentBoardSignalMoment = {
  itemKey: string;
  variant: CurrentBoardSignalMomentVariant;
  eyebrow: "SINCE YOU WERE AWAY" | "RIGHT NOW";
  headline: string;
  evidence: string;
  carry?: {
    label: "CURRENT PERIOD · PROVISIONAL" | "FROM YOUR LAST REVIEW";
    title: string;
    copy?: string;
  };
  around?: {
    headline: string;
    supportingFact: string;
  };
};

type Input = {
  episode: CurrentEpisodeWithNextGameGuidance;
  pulse?: PlayerPulse;
  canonicalUsername?: string;
};

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function cleanPulseLanguage(value: string) {
  return value
    .replaceAll("the forming episode", "your current picture")
    .replaceAll("Your forming episode", "Your current picture")
    .replaceAll("this episode", "this period")
    .replaceAll("Episode day", "Period day")
    .replaceAll("episode", "period");
}

function recordLine(episode: CurrentEpisodeWithNextGameGuidance) {
  return `${episode.wins}W · ${episode.draws}D · ${episode.losses}L across ${episode.games} game${episode.games === 1 ? "" : "s"} this period.`;
}

function carryFromGuidance(episode: CurrentEpisodeWithNextGameGuidance): CurrentBoardSignalMoment["carry"] {
  const guidance = episode.nextGameGuidance;
  const available = guidance.status === "available" || guidance.status === "fallback_previous_review";
  if (!available || !guidance.title) return undefined;
  return {
    label: guidance.source === "previous_review" ? "FROM YOUR LAST REVIEW" : "CURRENT PERIOD · PROVISIONAL",
    title: guidance.title,
    copy: guidance.copy,
  };
}

function strongestRatingMove(episode: CurrentEpisodeWithNextGameGuidance) {
  return [...episode.pools]
    .filter((pool) => typeof pool.ratingDelta === "number" && pool.ratingDelta !== 0)
    .sort((a, b) => Math.abs(b.ratingDelta ?? 0) - Math.abs(a.ratingDelta ?? 0))[0];
}

function aroundEvent(pulse: PlayerPulse | undefined, canonicalUsername?: string): PublicUniverseEvent | undefined {
  if (!pulse) return undefined;
  const normalized = canonicalUsername?.trim().toLowerCase();
  return pulse.fieldMoved[0]
    ?? pulse.justIn.find((event) => !normalized || event.canonicalUsername.trim().toLowerCase() !== normalized);
}

function withAround(
  base: Omit<CurrentBoardSignalMoment, "itemKey">,
  pulse: PlayerPulse | undefined,
  canonicalUsername?: string,
) {
  if (!["no_games", "quiet", "draw_stable", "current_fact"].includes(base.variant)) return base;
  const event = aroundEvent(pulse, canonicalUsername);
  if (!event) return base;
  return { ...base, around: { headline: event.headline, supportingFact: event.supportingFact } };
}

export function buildCurrentBoardSignalMoment(input: Input): CurrentBoardSignalMoment {
  const { episode, pulse, canonicalUsername } = input;
  const guidance = episode.nextGameGuidance;
  const carry = carryFromGuidance(episode);
  const sinceAway = pulse?.sinceAway;
  let base: Omit<CurrentBoardSignalMoment, "itemKey">;

  if (sinceAway?.facts?.length) {
    const evidence = sinceAway.facts.slice(0, 2).map(cleanPulseLanguage).join(" · ");
    base = {
      variant: "since_away",
      eyebrow: "SINCE YOU WERE AWAY",
      headline: cleanPulseLanguage(sinceAway.title),
      evidence,
      carry,
    };
  } else if (episode.games === 0) {
    base = {
      variant: "no_games",
      eyebrow: "RIGHT NOW",
      headline: "No current games yet — so BoardSignal is staying quiet on purpose.",
      evidence: `${episode.daysComplete} of 7 days are complete. There is no current-period game evidence to overstate.`,
      carry,
    };
  } else if (episode.currentWinRun >= 2 && episode.currentWinRun >= episode.currentLossRun) {
    base = {
      variant: "positive_run",
      eyebrow: "RIGHT NOW",
      headline: `You are on a ${episode.currentWinRun}-game winning run.`,
      evidence: recordLine(episode),
      carry,
    };
  } else if (episode.currentLossRun >= 2) {
    base = {
      variant: "difficult_run",
      eyebrow: "RIGHT NOW",
      headline: `The current run is difficult: ${episode.currentLossRun} losses in a row.`,
      evidence: recordLine(episode),
      carry,
    };
  } else if (episode.games >= 3 && episode.draws >= 2 && episode.draws / episode.games >= 0.4) {
    base = {
      variant: "draw_stable",
      eyebrow: "RIGHT NOW",
      headline: "Draws are a real part of this current record.",
      evidence: `${episode.draws} of ${episode.games} games have finished drawn. BoardSignal is treating that as a result fact, not a positional conclusion.`,
      carry,
    };
  } else {
    const ratingMove = strongestRatingMove(episode);
    if (ratingMove?.ratingDelta !== undefined && ratingMove.ratingDelta >= 10) {
      base = {
        variant: "rating_move",
        eyebrow: "RIGHT NOW",
        headline: `${ratingMove.pool} is ${ratingMove.ratingDelta > 0 ? "up" : "down"} ${Math.abs(ratingMove.ratingDelta)} this period.`,
        evidence: `${ratingMove.games} ${ratingMove.pool} game${ratingMove.games === 1 ? "" : "s"} are behind that current movement.`,
        carry,
      };
    } else if (guidance.status === "available" && guidance.source !== "previous_review" && guidance.title) {
      const count = guidance.evidenceCount ?? 0;
      base = {
        variant: "current_guidance",
        eyebrow: "RIGHT NOW",
        headline: "One next-game cue has enough current support to be useful.",
        evidence: count > 0
          ? `It is supported by ${count} current game${count === 1 ? "" : "s"} out of ${guidance.gamesConsidered} checked.`
          : recordLine(episode),
        carry,
      };
    } else if (episode.games <= 2 || guidance.status === "insufficient_evidence") {
      base = {
        variant: "quiet",
        eyebrow: "RIGHT NOW",
        headline: episode.games <= 2 ? "The current sample is still light." : "The current picture is still settling.",
        evidence: `${recordLine(episode)} BoardSignal is waiting for stronger repetition before saying more.`,
        carry,
      };
    } else {
      base = {
        variant: "current_fact",
        eyebrow: "RIGHT NOW",
        headline: `${episode.games} games are shaping your current BoardSignal.`,
        evidence: recordLine(episode),
        carry,
      };
    }
  }

  const enriched = withAround(base, pulse, canonicalUsername);
  const signature = [
    episode.periodStart,
    enriched.variant,
    enriched.headline,
    enriched.evidence,
    episode.latestGame?.gameId ?? "",
    pulse?.sinceAway?.id ?? "",
    guidance.family ?? "",
    guidance.source,
    guidance.evidenceCount ?? 0,
    episode.currentWinRun,
    episode.currentLossRun,
  ].join("|");

  return {
    ...enriched,
    itemKey: `m2:${episode.periodStart}:${enriched.variant}:${stableHash(signature)}`,
  };
}
