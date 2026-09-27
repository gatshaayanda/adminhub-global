export const UNIVERSE_V1_VERSION = "boardsignal-public-universe-v1" as const;
export const UNIVERSE_V2_VERSION = "boardsignal-public-universe-v2" as const;
export const UNIVERSE_V2_RANK_TREE_DEPTH = 43 as const;
export const UNIVERSE_V2_DISPLAY_LIMIT = 200 as const;
export const UNIVERSE_V2_MIGRATION_PAGE_SIZE = 100 as const;

export type UniverseAuthorityPhase = "v1" | "migrating" | "v2-ready" | "v2-active";
export type UniverseReadAuthority = "v1" | "v2";

export type UniverseV2Meta = {
  version: typeof UNIVERSE_V2_VERSION;
  phase: UniverseAuthorityPhase;
  readAuthority: UniverseReadAuthority;
  officialPlayerCount: number;
  indexedPlayerCount: number;
  migrationCursor?: string;
  sourceExhausted: boolean;
  staleBoardCount: number;
  repairRequiredCount: number;
  revision: number;
  updatedAt: string;
  certifiedAt?: string;
  cutoverAt?: string;
};

export type UniverseV2RankMember = {
  boardKey: string;
  categoryId: string;
  categoryTitle: string;
  boardDescription: string;
  scopeLabel?: string;
  minimumLabel: string;
  playerId: string;
  participantId: string;
  player: string;
  value: number;
  secondary: number;
  valueLabel: string;
  evidence: string;
  coverageHref?: string;
  coverageHeadline?: string;
  sortKey: string;
};

export type UniverseV2Standing = {
  boardKey: string;
  categoryId: string;
  categoryTitle: string;
  scopeLabel?: string;
  rank: number;
  denominator: number;
  value: number;
  valueLabel: string;
  player: string;
  nearestAbove?: { player: string; valueLabel: string };
  nearestBelow?: { player: string; valueLabel: string };
};

export type UniverseV2OfficialStandingProjection = {
  version: typeof UNIVERSE_V2_VERSION;
  playerId: string;
  periodEnd: string;
  reviewLifecycle: string;
  revision: number;
  standings: Array<UniverseV2Standing & {
    previousOfficialRank?: number;
    previousOfficialDenominator?: number;
    movement?: number;
  }>;
  updatedAt: string;
};

const METRIC_SCALE = 1000;
const METRIC_WIDTH = 8;
const IDENTITY_WIDTH = 27;
const MAX_SORTABLE_METRIC = Number.parseInt("zzzzzzzz", 36);
const PRIVATE_FIELD_PATTERN = /^(uid|email|phone|notes?|journal|weakness(?:es)?|message(?:s)?|evidencePrivate|accountMetadata|google|accessToken|refreshToken)$/i;

export function readAuthorityForPhase(phase: UniverseAuthorityPhase): UniverseReadAuthority {
  return phase === "v2-active" ? "v2" : "v1";
}

export function initialUniverseV2Meta(nowIso: string): UniverseV2Meta {
  return {
    version: UNIVERSE_V2_VERSION,
    phase: "v1",
    readAuthority: "v1",
    officialPlayerCount: 0,
    indexedPlayerCount: 0,
    sourceExhausted: false,
    staleBoardCount: 0,
    repairRequiredCount: 0,
    revision: 0,
    updatedAt: nowIso,
  };
}

function fnv1a32(value: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function orderingIdentity(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  if (!normalized) return "_".padEnd(IDENTITY_WIDTH, "!");
  if (normalized.length <= IDENTITY_WIDTH) return normalized.padEnd(IDENTITY_WIDTH, "!");
  const suffix = fnv1a32(normalized).toString(36).padStart(7, "0").slice(-7);
  return `${normalized.slice(0, IDENTITY_WIDTH - 8)}_${suffix}`;
}

function descendingMetricToken(value: number) {
  if (!Number.isFinite(value)) throw new Error("Universe rank metrics must be finite.");
  const scaled = Math.round(value * METRIC_SCALE);
  const offset = Math.trunc(MAX_SORTABLE_METRIC / 2);
  const biased = Math.max(0, Math.min(MAX_SORTABLE_METRIC, scaled + offset));
  return (MAX_SORTABLE_METRIC - biased).toString(36).padStart(METRIC_WIDTH, "0");
}

export function buildUniverseV2SortKey(value: number, secondary: number, stableOrderingIdentity: string) {
  const key = `${descendingMetricToken(value)}${descendingMetricToken(secondary)}${orderingIdentity(stableOrderingIdentity)}`;
  if (key.length !== UNIVERSE_V2_RANK_TREE_DEPTH) throw new Error(`Universe v2 rank key must be ${UNIVERSE_V2_RANK_TREE_DEPTH} characters.`);
  return key;
}

export function rankTreePath(sortKey: string) {
  if (sortKey.length !== UNIVERSE_V2_RANK_TREE_DEPTH) throw new Error(`Universe v2 rank key must be ${UNIVERSE_V2_RANK_TREE_DEPTH} characters.`);
  return Array.from({ length: UNIVERSE_V2_RANK_TREE_DEPTH }, (_, depth) => ({
    depth,
    nodeId: depth === 0 ? "_root" : sortKey.slice(0, depth),
    branch: sortKey[depth],
  }));
}

export function compareUniverseV2Members(a: Pick<UniverseV2RankMember, "sortKey" | "playerId">, b: Pick<UniverseV2RankMember, "sortKey" | "playerId">) {
  return a.sortKey.localeCompare(b.sortKey) || a.playerId.localeCompare(b.playerId);
}

export function rankedUniverseV2Members(members: UniverseV2RankMember[]) {
  return [...members].sort(compareUniverseV2Members).map((member, index) => ({ ...member, rank: index + 1 }));
}

export function topUniverseV2Members(members: UniverseV2RankMember[], limit = UNIVERSE_V2_DISPLAY_LIMIT) {
  return rankedUniverseV2Members(members).slice(0, Math.max(0, limit));
}

export function rankFromCountTree(sortKey: string, nodes: Array<Record<string, number> | undefined>) {
  const path = rankTreePath(sortKey);
  if (nodes.length !== path.length) throw new Error(`Universe v2 rank lookup requires exactly ${UNIVERSE_V2_RANK_TREE_DEPTH} rank-tree nodes.`);
  let preceding = 0;
  for (let depth = 0; depth < path.length; depth += 1) {
    const counts = nodes[depth] ?? {};
    for (const [branch, count] of Object.entries(counts)) {
      if (branch < path[depth].branch) preceding += Math.max(0, Number(count) || 0);
    }
  }
  return preceding + 1;
}

export function countTransition(currentCount: number, wasPresent: boolean, isPresent: boolean) {
  if (wasPresent === isPresent) return currentCount;
  return Math.max(0, currentCount + (isPresent ? 1 : -1));
}

export function officialMovement(previousRank: number | undefined, nextRank: number) {
  return previousRank === undefined ? undefined : previousRank - nextRank;
}

export function reviewLifecycleMayCreateFreshUniverseEvent(reviewLifecycle: string) {
  return reviewLifecycle !== "historical_backfill";
}

export function shouldAcceptOfficialPublication(input: {
  existingPeriodEnd?: string;
  existingReviewLifecycle?: string;
  incomingPeriodEnd: string;
  incomingReviewLifecycle: string;
}) {
  if (!input.existingPeriodEnd) return true;
  if (input.incomingPeriodEnd < input.existingPeriodEnd) return false;
  if (input.incomingPeriodEnd > input.existingPeriodEnd) return true;
  if (input.incomingReviewLifecycle === "historical_backfill" && input.existingReviewLifecycle !== "historical_backfill") return false;
  return true;
}

export function updateOfficialStandingProjection(input: {
  existing?: UniverseV2OfficialStandingProjection;
  playerId: string;
  periodEnd: string;
  reviewLifecycle: string;
  standings: UniverseV2Standing[];
  nowIso: string;
}) {
  const existing = input.existing;
  if (existing && !shouldAcceptOfficialPublication({
    existingPeriodEnd: existing.periodEnd,
    existingReviewLifecycle: existing.reviewLifecycle,
    incomingPeriodEnd: input.periodEnd,
    incomingReviewLifecycle: input.reviewLifecycle,
  })) return existing;

  const advancesOfficialReview = !existing || input.periodEnd > existing.periodEnd;
  const historicalBackfill = input.reviewLifecycle === "historical_backfill";
  const previous = advancesOfficialReview && !historicalBackfill
    ? new Map((existing?.standings ?? []).map((standing) => [standing.boardKey, standing]))
    : new Map<string, UniverseV2OfficialStandingProjection["standings"][number]>();
  const priorProjection = advancesOfficialReview ? undefined : existing;

  const standings = input.standings.map((standing) => {
    const priorSameBoard = previous.get(standing.boardKey);
    const carried = priorProjection?.standings.find((item) => item.boardKey === standing.boardKey);
    const previousOfficialRank = historicalBackfill ? undefined : advancesOfficialReview ? priorSameBoard?.rank : carried?.previousOfficialRank;
    const previousOfficialDenominator = historicalBackfill ? undefined : advancesOfficialReview ? priorSameBoard?.denominator : carried?.previousOfficialDenominator;
    return {
      ...standing,
      previousOfficialRank,
      previousOfficialDenominator,
      movement: previousOfficialRank === undefined ? undefined : officialMovement(previousOfficialRank, standing.rank),
    };
  });

  return {
    version: UNIVERSE_V2_VERSION,
    playerId: input.playerId,
    periodEnd: input.periodEnd,
    reviewLifecycle: input.reviewLifecycle,
    revision: (existing?.revision ?? 0) + 1,
    standings,
    updatedAt: input.nowIso,
  } satisfies UniverseV2OfficialStandingProjection;
}

export function containsPrivateUniverseV2Field(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsPrivateUniverseV2Field);
  return Object.entries(value as Record<string, unknown>).some(([key, child]) => PRIVATE_FIELD_PATTERN.test(key) || containsPrivateUniverseV2Field(child));
}

export function beginUniverseV2Migration(meta: UniverseV2Meta, nowIso: string) {
  if (meta.phase === "v2-active") throw new Error("Post-cutover rollback/migration requires a separate incident carriage.");
  return {
    ...meta,
    phase: "migrating" as const,
    readAuthority: "v1" as const,
    sourceExhausted: false,
    certifiedAt: undefined,
    cutoverAt: undefined,
    revision: meta.revision + 1,
    updatedAt: nowIso,
  };
}

export function recordUniverseV2MigrationPage(meta: UniverseV2Meta, input: {
  indexedPlayerCount: number;
  migrationCursor?: string;
  sourceExhausted: boolean;
  nowIso: string;
}) {
  if (meta.phase !== "migrating") throw new Error("Universe v2 migration pages require migrating phase.");
  return {
    ...meta,
    readAuthority: "v1" as const,
    indexedPlayerCount: Math.max(meta.indexedPlayerCount, input.indexedPlayerCount),
    migrationCursor: input.migrationCursor,
    sourceExhausted: input.sourceExhausted,
    revision: meta.revision + 1,
    updatedAt: input.nowIso,
  };
}

export function certifyUniverseV2(meta: UniverseV2Meta, sourceCount: number, nowIso: string) {
  if (meta.phase !== "migrating") throw new Error("Universe v2 certification requires migrating phase.");
  if (!meta.sourceExhausted) throw new Error("Universe v2 migration source is not exhausted.");
  if (meta.indexedPlayerCount !== sourceCount) throw new Error("Universe v2 indexed player count does not match the certified safe-public source count.");
  if (meta.staleBoardCount !== 0) throw new Error("Universe v2 has stale boards.");
  if (meta.repairRequiredCount !== 0) throw new Error("Universe v2 requires repair.");
  return {
    ...meta,
    phase: "v2-ready" as const,
    readAuthority: "v1" as const,
    officialPlayerCount: sourceCount,
    certifiedAt: nowIso,
    revision: meta.revision + 1,
    updatedAt: nowIso,
  };
}

export function cutoverUniverseV2(meta: UniverseV2Meta, nowIso: string) {
  if (meta.phase !== "v2-ready") throw new Error("Universe v2 cutover requires v2-ready phase.");
  return {
    ...meta,
    phase: "v2-active" as const,
    readAuthority: "v2" as const,
    cutoverAt: nowIso,
    revision: meta.revision + 1,
    updatedAt: nowIso,
  };
}

export function rollbackUniverseV2(meta: UniverseV2Meta, nowIso: string) {
  if (meta.phase === "v2-active") throw new Error("Post-cutover reversal requires a separately authorized incident carriage.");
  return {
    ...meta,
    phase: "v1" as const,
    readAuthority: "v1" as const,
    migrationCursor: undefined,
    sourceExhausted: false,
    certifiedAt: undefined,
    cutoverAt: undefined,
    revision: meta.revision + 1,
    updatedAt: nowIso,
  };
}

export function universeV2ComplexityModel(population: number) {
  const normalizedPopulation = Math.max(0, Math.floor(population));
  return {
    population: normalizedPopulation,
    rankTreeDepth: UNIVERSE_V2_RANK_TREE_DEPTH,
    participantUpdate: { populationReads: 0, rankTreeDepth: UNIVERSE_V2_RANK_TREE_DEPTH, bounded: true },
    participantDelete: { populationReads: 0, rankTreeDepth: UNIVERSE_V2_RANK_TREE_DEPTH, bounded: true },
    publicUniverseRead: { populationReads: 0, bounded: true },
    playerStandingRead: { populationReads: 0, rankTreeDepth: UNIVERSE_V2_RANK_TREE_DEPTH, bounded: true },
    founderHealthRead: { populationReads: 0, bounded: true },
    repair: { populationReads: Math.min(normalizedPopulation, UNIVERSE_V2_MIGRATION_PAGE_SIZE), paged: true },
    migrationPage: { populationReads: Math.min(normalizedPopulation, UNIVERSE_V2_MIGRATION_PAGE_SIZE), paged: true },
  };
}
