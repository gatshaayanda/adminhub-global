// Patch B.1 baseline: 0acc31a171f655c15f0cb99137d2c514e4253d76 (Add full BoardSignal account deletion)
import type { CurrentEpisodeSummary } from "./memory";

export type ActiveWeekGuidanceFamily =
  | "clock_conversion"
  | "queen_safety"
  | "king_safety"
  | "forcing_reply"
  | "material_conversion"
  | "loss_run";

export type ActiveWeekGuidanceSource =
  | "current_week"
  | "previous_review"
  | "current_week_reinforces_previous_review"
  | "insufficient_current_evidence";

export type ActiveWeekGuidanceStatus =
  | "available"
  | "fallback_previous_review"
  | "insufficient_evidence";

export type ActiveWeekEvidenceFact = {
  id: string;
  gameId: string;
  family: ActiveWeekGuidanceFamily;
  occurredAt: number;
  summary: string;
  severity: number;
};

export type ActiveWeekSupportingFact = {
  id: string;
  gameId?: string;
  summary: string;
};

export type PreviousReviewGuidance = {
  title: string;
  copy: string;
  family?: string;
  sourcePeriod?: string;
};

export type ActiveWeekNextGameGuidance = {
  status: ActiveWeekGuidanceStatus;
  source: ActiveWeekGuidanceSource;
  family?: ActiveWeekGuidanceFamily;
  title?: string;
  copy?: string;
  gamesConsidered: number;
  evidenceCount?: number;
  supportingFacts: ActiveWeekSupportingFact[];
  previousReviewPeriod?: string;
  reinforcement?: {
    label: "THIS IS STILL SHOWING UP";
    previousTitle: string;
    previousSourcePeriod?: string;
  };
  reason?: "no_games" | "no_supported_fact" | "derivation_unavailable";
};

export type CurrentEpisodeWithNextGameGuidance = CurrentEpisodeSummary & {
  nextGameGuidance: ActiveWeekNextGameGuidance;
};

export type ActiveWeekGuidanceInput = {
  gamesConsidered: number;
  currentLossRun: number;
  latestGameAt?: number;
  evidence: ActiveWeekEvidenceFact[];
};

type RankedCandidate = {
  family: ActiveWeekGuidanceFamily;
  evidenceCount: number;
  evidenceStrength: number;
  latestOccurredAt: number;
  actionability: number;
  severity: number;
  supportingFacts: ActiveWeekSupportingFact[];
};

const MIN_DISTINCT_GAMES: Record<ActiveWeekGuidanceFamily, number> = {
  clock_conversion: 1,
  queen_safety: 1,
  king_safety: 1,
  forcing_reply: 2,
  material_conversion: 2,
  loss_run: 2,
};

const MIN_WEEK_GAMES: Record<ActiveWeekGuidanceFamily, number> = {
  clock_conversion: 1,
  queen_safety: 1,
  king_safety: 1,
  forcing_reply: 3,
  material_conversion: 3,
  loss_run: 2,
};

const ACTIONABILITY: Record<ActiveWeekGuidanceFamily, number> = {
  clock_conversion: 100,
  queen_safety: 96,
  king_safety: 94,
  forcing_reply: 90,
  material_conversion: 84,
  loss_run: 68,
};

const COPY: Record<ActiveWeekGuidanceFamily, { title: string; copy: string }> = {
  clock_conversion: {
    title: "Keep the clock in the decision.",
    copy: "Before starting a long calculation, check the clock first and leave enough time to make the move.",
  },
  queen_safety: {
    title: "Before the queen moves, scan the reply.",
    copy: "Before committing the queen, check the opponent's checks and captures first.",
  },
  king_safety: {
    title: "Check every forcing reply around your king.",
    copy: "Before committing the move, scan the opponent's checks first.",
  },
  forcing_reply: {
    title: "Check the forcing reply first.",
    copy: "Before committing, scan the opponent's checks and captures before calculating your own follow-up.",
  },
  material_conversion: {
    title: "Count what can be taken in reply.",
    copy: "Before committing a piece, check whether the opponent has an immediate capture.",
  },
  loss_run: {
    title: "Reset before the next one.",
    copy: "Give the next game a clean start and make the next decision from the board in front of you, not the previous result.",
  },
};

function boundedSeverity(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function groupedEvidence(evidence: ActiveWeekEvidenceFact[]) {
  const groups = new Map<ActiveWeekGuidanceFamily, Map<string, ActiveWeekEvidenceFact>>();
  for (const fact of evidence) {
    const byGame = groups.get(fact.family) ?? new Map<string, ActiveWeekEvidenceFact>();
    const existing = byGame.get(fact.gameId);
    if (!existing
      || boundedSeverity(fact.severity) > boundedSeverity(existing.severity)
      || (boundedSeverity(fact.severity) === boundedSeverity(existing.severity) && fact.occurredAt > existing.occurredAt)
      || (boundedSeverity(fact.severity) === boundedSeverity(existing.severity) && fact.occurredAt === existing.occurredAt && fact.id < existing.id)) {
      byGame.set(fact.gameId, fact);
    }
    groups.set(fact.family, byGame);
  }
  return groups;
}

function rankCandidates(input: ActiveWeekGuidanceInput): RankedCandidate[] {
  const groups = groupedEvidence(input.evidence);
  const ranked: RankedCandidate[] = [];

  for (const family of ["clock_conversion", "queen_safety", "king_safety", "forcing_reply", "material_conversion"] as const) {
    const facts = [...(groups.get(family)?.values() ?? [])]
      .sort((a, b) => b.occurredAt - a.occurredAt || boundedSeverity(b.severity) - boundedSeverity(a.severity) || a.id.localeCompare(b.id));
    const evidenceCount = facts.length;
    if (input.gamesConsidered < MIN_WEEK_GAMES[family] || evidenceCount < MIN_DISTINCT_GAMES[family]) continue;
    const severity = Math.max(0, ...facts.map((fact) => boundedSeverity(fact.severity)));
    const directConcreteBonus = family === "clock_conversion" || family === "queen_safety" || family === "king_safety" ? 1 : 0;
    ranked.push({
      family,
      evidenceCount,
      evidenceStrength: Math.min(4, evidenceCount + directConcreteBonus),
      latestOccurredAt: facts[0]?.occurredAt ?? 0,
      actionability: ACTIONABILITY[family],
      severity,
      supportingFacts: facts.slice(0, 3).map((fact) => ({ id: fact.id, gameId: fact.gameId, summary: fact.summary })),
    });
  }

  // Result-run reset is deliberately a fallback. A concrete legal-move or
  // termination fact should win whenever one is safely eligible.
  if (!ranked.length && input.gamesConsidered >= MIN_WEEK_GAMES.loss_run && input.currentLossRun >= MIN_DISTINCT_GAMES.loss_run) {
    ranked.push({
      family: "loss_run",
      evidenceCount: input.currentLossRun,
      evidenceStrength: Math.min(4, input.currentLossRun),
      latestOccurredAt: input.latestGameAt ?? 0,
      actionability: ACTIONABILITY.loss_run,
      severity: 45,
      supportingFacts: [{
        id: `current-loss-run-${input.currentLossRun}`,
        summary: `${input.currentLossRun} consecutive losses make up the current result run.`,
      }],
    });
  }

  return ranked.sort((a, b) =>
    b.evidenceStrength - a.evidenceStrength
    || b.latestOccurredAt - a.latestOccurredAt
    || b.evidenceCount - a.evidenceCount
    || b.actionability - a.actionability
    || b.severity - a.severity
    || a.family.localeCompare(b.family),
  );
}

export function deriveActiveWeekNextGameGuidance(input: ActiveWeekGuidanceInput): ActiveWeekNextGameGuidance {
  const gamesConsidered = Math.max(0, Math.floor(input.gamesConsidered));
  if (gamesConsidered === 0) {
    return {
      status: "insufficient_evidence",
      source: "insufficient_current_evidence",
      gamesConsidered: 0,
      supportingFacts: [],
      reason: "no_games",
    };
  }

  const selected = rankCandidates(input)[0];
  if (!selected) {
    return {
      status: "insufficient_evidence",
      source: "insufficient_current_evidence",
      gamesConsidered,
      supportingFacts: [],
      reason: "no_supported_fact",
    };
  }

  return {
    status: "available",
    source: "current_week",
    family: selected.family,
    title: COPY[selected.family].title,
    copy: COPY[selected.family].copy,
    gamesConsidered,
    evidenceCount: selected.evidenceCount,
    supportingFacts: selected.supportingFacts,
  };
}

export function unavailableActiveWeekGuidance(gamesConsidered: number): ActiveWeekNextGameGuidance {
  return {
    status: "insufficient_evidence",
    source: "insufficient_current_evidence",
    gamesConsidered: Math.max(0, Math.floor(gamesConsidered)),
    supportingFacts: [],
    reason: "derivation_unavailable",
  };
}

export function withPreviousReviewGuidance(
  current: ActiveWeekNextGameGuidance,
  previous?: PreviousReviewGuidance,
): ActiveWeekNextGameGuidance {
  const validPrevious = previous && previous.title.trim() && previous.copy.trim() ? previous : undefined;
  if (current.status === "available") {
    if (validPrevious?.family && current.family === validPrevious.family) {
      return {
        ...current,
        source: "current_week_reinforces_previous_review",
        reinforcement: {
          label: "THIS IS STILL SHOWING UP",
          previousTitle: validPrevious.title,
          previousSourcePeriod: validPrevious.sourcePeriod,
        },
      };
    }
    return current;
  }

  if (!validPrevious) return current;
  return {
    status: "fallback_previous_review",
    source: "previous_review",
    family: undefined,
    title: validPrevious.title,
    copy: validPrevious.copy,
    gamesConsidered: current.gamesConsidered,
    evidenceCount: 0,
    supportingFacts: [],
    previousReviewPeriod: validPrevious.sourcePeriod,
    reason: current.reason,
  };
}
