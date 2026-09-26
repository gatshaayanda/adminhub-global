import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { BoardSignalAccount } from "../account";
import type { CurrentEpisodeSummary } from "../memory";
import type { BoardSignalDesk, DeskUniverseStanding } from "../types";
import { storedReviewLifecycle, type ReviewLifecycle } from "../historyBackfill";
import {
  PULSE_EVENT_RETENTION_MS,
  buildActiveUniverseBoards,
  buildPulseUniverseGroups,
  currentEpisodeToProvisionalParticipant,
  deriveBoardMovement,
  deriveCurrentEpisodeDelta,
  deriveProvisionalCards,
  deriveProximityCards,
  deriveReviewMovement,
  latestUniverseParticipants,
  nominateShareMoments,
  publicArtifactHasPrivateFields,
  rankWhatsHot,
  standingSnapshots,
  standingsFromActiveBoards,
  type PlayerPulse,
  type PlayerPulseSnapshot,
  type PublicUniverseEvent,
  type PulseStandingSnapshot,
  type PulseUniverseBoard,
  type SafeShareMoment,
  type UniverseEventType,
} from "../pulse";
import { buildUniverseBoards, deskToUniverseParticipant, type UniverseParticipant } from "../universe";
import {
  UNIVERSE_V2_DISPLAY_LIMIT,
  UNIVERSE_V2_MIGRATION_PAGE_SIZE,
  UNIVERSE_V2_RANK_TREE_DEPTH,
  UNIVERSE_V2_VERSION,
  beginUniverseV2Migration,
  buildUniverseV2SortKey,
  certifyUniverseV2,
  containsPrivateUniverseV2Field,
  cutoverUniverseV2,
  initialUniverseV2Meta,
  rankFromCountTree,
  rankTreePath,
  recordUniverseV2MigrationPage,
  rollbackUniverseV2,
  shouldAcceptOfficialPublication,
  updateOfficialStandingProjection,
  type UniverseV2Meta,
  type UniverseV2OfficialStandingProjection,
  type UniverseV2RankMember,
  type UniverseV2Standing,
} from "../universeScale";
import { foundingBetaField } from "../../../data/universeField";
import { getAdminDb } from "../../../utils/firebaseAdmin";
import {
  assertFirestoreCircuitClosed,
  classifyFirestoreServiceError,
  logFirestoreReadBudget,
  noteFirestoreServiceFailure,
} from "./firestoreService";

const MATERIALIZED_UNIVERSE_VERSION = "boardsignal-public-universe-v1" as const;
const MATERIALIZED_PARTICIPANT_LIMIT = 200;
const MATERIALIZED_BOARD_ENTRY_LIMIT = 200;
const MATERIALIZED_EVENT_LIMIT = 40;
const MATERIALIZED_BOOTSTRAP_LEASE_MS = 45_000;

function clean<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function hashId(value: string) { return createHash("sha256").update(value).digest("hex"); }
function nowIso(now = new Date()) { return now.toISOString(); }
function stableLiveParticipantId(playerId: number | string) { return `live:${String(playerId)}`; }

export type ActiveUniverseState = {
  version: typeof MATERIALIZED_UNIVERSE_VERSION | typeof UNIVERSE_V2_VERSION;
  revision: number;
  bootstrapComplete: boolean;
  generatedAt: string;
  liveParticipants: UniverseParticipant[];
  boards: PulseUniverseBoard[];
  groups: ReturnType<typeof buildPulseUniverseGroups>;
  recentEvents: PublicUniverseEvent[];
  whatsHot: PublicUniverseEvent[];
  officialPlayerCount: number;
};

export type MaterializedUniverseParticipant = {
  version: typeof MATERIALIZED_UNIVERSE_VERSION;
  playerId: string;
  canonicalUsername: string;
  reviewLifecycle: ReviewLifecycle;
  periodEnd: string;
  participant: UniverseParticipant;
  updatedAt: string;
};

type ActiveDeskRecord = {
  account: BoardSignalAccount;
  deskKey: string;
  periodEnd: string;
  reviewLifecycle: ReviewLifecycle;
  publishedAt?: string;
  importedAt?: string;
  desk?: BoardSignalDesk;
  originalBetaParticipant?: UniverseParticipant;
};

type BootstrapLease = { leaseId: string; leaseUntil: string; startedAt: string };

function publicIdentityAllowed(account: BoardSignalAccount) {
  return account.accessStatus === "active"
    && account.role === "player"
    && account.identityStatus !== "provisional"
    && account.identityStatus !== "revoked"
    && account.privacy?.universeCoverage !== false;
}

function participantFromRecord(record: ActiveDeskRecord): UniverseParticipant | undefined {
  if (!publicIdentityAllowed(record.account)) return undefined;
  if (record.originalBetaParticipant) {
    return {
      ...record.originalBetaParticipant,
      id: stableLiveParticipantId(record.account.chessCom.playerId),
      stablePlayerId: String(record.account.chessCom.playerId),
      aliases: [...new Set([...(record.originalBetaParticipant.aliases ?? []), record.originalBetaParticipant.player])],
      player: record.account.chessCom.canonicalUsername,
      source: "live",
      verified: true,
    };
  }
  if (!record.desk) return undefined;
  const participant = deskToUniverseParticipant(record.desk);
  if (!participant || participant.source !== "live") return undefined;
  const aliases = (record.account.eligibleCoverageKeys ?? []).filter((key) => !/^\d+$/.test(key));
  const base: UniverseParticipant = {
    ...participant,
    id: stableLiveParticipantId(record.account.chessCom.playerId),
    stablePlayerId: String(record.account.chessCom.playerId),
    aliases: [...new Set([...(participant.aliases ?? []), participant.player, ...aliases])],
    player: record.account.chessCom.canonicalUsername,
  };
  if (record.reviewLifecycle === "historical_backfill") {
    const { coverage: _coverage, ...withoutCoverage } = base;
    void _coverage;
    return withoutCoverage;
  }
  return {
    ...base,
    coverage: {
      href: `/player/${encodeURIComponent(record.account.chessCom.canonicalUsername)}`,
      headline: record.desk.headline || record.desk.summary,
    },
  };
}

function safePublicEvent(event: PublicUniverseEvent) {
  return event.safePublic === true
    && event.hidden !== true
    && event.finality === "official"
    && !publicArtifactHasPrivateFields(event);
}

function boundedRecentEvents(events: PublicUniverseEvent[], now = new Date()) {
  const retentionCutoff = now.getTime() - PULSE_EVENT_RETENTION_MS;
  const seen = new Set<string>();
  return [...events]
    .filter(safePublicEvent)
    .filter((event) => Number.isFinite(Date.parse(event.publishedAt)) && Date.parse(event.publishedAt) >= retentionCutoff)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.eventId.localeCompare(b.eventId))
    .filter((event) => {
      if (seen.has(event.eventId)) return false;
      seen.add(event.eventId);
      return true;
    })
    .slice(0, MATERIALIZED_EVENT_LIMIT);
}

function boundedBoards(boards: PulseUniverseBoard[]) {
  return boards.map((board) => ({ ...board, entries: board.entries.slice(0, MATERIALIZED_BOARD_ENTRY_LIMIT) }));
}

function materializedStateFromParticipants(
  participants: UniverseParticipant[],
  recentEvents: PublicUniverseEvent[],
  now: Date,
  revision: number,
  bootstrapComplete: boolean,
): ActiveUniverseState {
  const latest = latestUniverseParticipants(participants.filter((participant) => participant.source === "live" && participant.verified));
  const allBoards = buildActiveUniverseBoards(latest, foundingBetaField, latest);
  const boards = boundedBoards(allBoards);
  const events = boundedRecentEvents(recentEvents, now);
  return {
    version: MATERIALIZED_UNIVERSE_VERSION,
    revision,
    bootstrapComplete,
    generatedAt: nowIso(now),
    // Kept bounded for current-week provisional comparisons. Official boards are already derived from the full participant summary query.
    liveParticipants: latest.slice(0, MATERIALIZED_PARTICIPANT_LIMIT),
    boards,
    groups: buildPulseUniverseGroups(boards),
    recentEvents: events,
    whatsHot: rankWhatsHot(events, now),
    officialPlayerCount: latest.length,
  };
}

function validateMaterializedState(value: unknown): ActiveUniverseState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const state = value as Partial<ActiveUniverseState>;
  if (state.version !== MATERIALIZED_UNIVERSE_VERSION || !Array.isArray(state.boards) || !Array.isArray(state.groups) || !Array.isArray(state.recentEvents)) return undefined;
  if (publicArtifactHasPrivateFields(state)) throw new Error("Unsafe data was blocked from the materialized public Universe state.");
  return state as ActiveUniverseState;
}

function materializedParticipantRef(playerId: number | string) {
  return getAdminDb().collection("publicUniverseParticipants").doc(String(playerId));
}

function stateRef() { return getAdminDb().collection("publicUniverseState").doc("current"); }
function bootstrapLeaseRef() { return getAdminDb().collection("publicUniverseState").doc("bootstrapLease"); }


const UNIVERSE_V2_BOARD_KEYS = [
  "rating-climb:rapid", "rating-climb:blitz", "rating-climb:bullet",
  "winning-run:all",
  "rating-recovery:rapid", "rating-recovery:blitz", "rating-recovery:bullet",
  "strong-finish:all",
  "rapid-rating-leader:rapid",
  "best-upset:rapid", "best-upset:blitz", "best-upset:bullet",
  "breakthrough-desk:rapid", "breakthrough-desk:blitz", "breakthrough-desk:bullet",
  "moment-of-the-week:all",
] as const;
const UNIVERSE_V2_LIVE_CACHE_LIMIT = 200;

type StoredUniverseV2Meta = UniverseV2Meta & { sourceSafeCount?: number };
type StoredUniverseV2Player = {
  version: typeof UNIVERSE_V2_VERSION;
  playerId: string;
  periodEnd: string;
  reviewLifecycle: ReviewLifecycle;
  participant: UniverseParticipant;
  projection: UniverseV2OfficialStandingProjection;
  updatedAt: string;
};
type UniverseV2BoardLanding = {
  version: typeof UNIVERSE_V2_VERSION;
  boardKey: string;
  categoryId: string;
  categoryTitle: string;
  boardDescription: string;
  scopeLabel?: string;
  minimumLabel: string;
  memberCount: number;
  topEntries: UniverseV2RankMember[];
  updatedAt: string;
};
type UniverseV2Landing = {
  version: typeof UNIVERSE_V2_VERSION;
  revision: number;
  generatedAt: string;
  liveParticipants: UniverseParticipant[];
  recentEvents: PublicUniverseEvent[];
};

export type UniverseV2Health = {
  version: typeof UNIVERSE_V2_VERSION;
  phase: UniverseV2Meta["phase"];
  readAuthority: UniverseV2Meta["readAuthority"];
  officialPlayerCount: number;
  indexedPlayerCount: number;
  v1OfficialPlayerCount: number;
  migrationCursor?: string;
  sourceExhausted: boolean;
  staleBoardCount: number;
  repairRequiredCount: number;
  updatedAt: string;
  certifiedAt?: string;
  cutoverAt?: string;
};

type UniverseV2PlayerContext = {
  projection?: UniverseV2OfficialStandingProjection;
  standings: DeskUniverseStanding[];
  snapshots: PulseStandingSnapshot[];
};

function universeV2MetaRef() { return getAdminDb().collection("publicUniverseV2Meta").doc("current"); }
function universeV2PlayerRef(playerId: number | string) { return getAdminDb().collection("publicUniverseV2Players").doc(String(playerId)); }
function universeV2LandingRef() { return getAdminDb().collection("publicUniverseV2State").doc("current"); }
function universeV2BoardRef(boardKey: string) { return getAdminDb().collection("publicUniverseV2Boards").doc(hashId(boardKey).slice(0, 40)); }
function universeV2MemberRef(boardKey: string, playerId: number | string) { return universeV2BoardRef(boardKey).collection("members").doc(String(playerId)); }
function universeV2RankTreeRef(boardKey: string, nodeId: string) { return universeV2BoardRef(boardKey).collection("rankTree").doc(nodeId === "_root" ? "root" : nodeId); }

function validUniverseV2Meta(value: unknown): StoredUniverseV2Meta | undefined {
  if (!value || typeof value !== "object") return undefined;
  const meta = value as Partial<StoredUniverseV2Meta>;
  if (meta.version !== UNIVERSE_V2_VERSION || typeof meta.phase !== "string" || typeof meta.readAuthority !== "string") return undefined;
  if (containsPrivateUniverseV2Field(meta) || publicArtifactHasPrivateFields(meta)) throw new Error("Unsafe data was blocked from Universe v2 metadata.");
  return meta as StoredUniverseV2Meta;
}

async function loadUniverseV2Meta(now = new Date()): Promise<StoredUniverseV2Meta> {
  const snapshot = await universeV2MetaRef().get();
  return snapshot.exists ? validUniverseV2Meta(snapshot.data()) ?? initialUniverseV2Meta(nowIso(now)) : initialUniverseV2Meta(nowIso(now));
}

function universeV2Secondary(participant: UniverseParticipant, boardKey: string) {
  if (boardKey === "strong-finish:all") return participant.strongFinish?.games ?? 0;
  if (boardKey === "rapid-rating-leader:rapid") return participant.pools.find((pool) => pool.pool === "rapid")?.games ?? 0;
  return participant.score;
}

function universeV2MembersFromParticipant(document: MaterializedUniverseParticipant): UniverseV2RankMember[] {
  if (containsPrivateUniverseV2Field(document) || publicArtifactHasPrivateFields(document)) throw new Error("Unsafe data was blocked from a Universe v2 public participant index.");
  const playerId = document.playerId;
  return buildUniverseBoards([document.participant]).flatMap((board) => board.entries.slice(0, 1).map((entry) => ({
    boardKey: board.key,
    categoryId: board.categoryId,
    categoryTitle: board.title,
    boardDescription: board.description,
    scopeLabel: board.scopeLabel,
    minimumLabel: board.minimumLabel,
    playerId,
    participantId: document.participant.id,
    player: document.participant.player,
    value: entry.value,
    secondary: universeV2Secondary(document.participant, board.key),
    valueLabel: entry.valueLabel,
    evidence: entry.evidence,
    coverageHref: entry.coverageHref,
    coverageHeadline: entry.coverageHeadline,
    sortKey: buildUniverseV2SortKey(entry.value, universeV2Secondary(document.participant, board.key), document.participant.player),
  } satisfies UniverseV2RankMember)));
}

function sameUniverseV2Member(left: UniverseV2RankMember | undefined, right: UniverseV2RankMember | undefined) {
  return JSON.stringify(left ? clean(left) : undefined) === JSON.stringify(right ? clean(right) : undefined);
}

async function applyUniverseV2BoardMember(boardKey: string, playerId: string, desired: UniverseV2RankMember | undefined, now: Date) {
  const db = getAdminDb();
  const memberRef = universeV2MemberRef(boardKey, playerId);
  return db.runTransaction(async (transaction) => {
    const memberSnapshot = await transaction.get(memberRef);
    const existing = memberSnapshot.exists ? memberSnapshot.data() as UniverseV2RankMember : undefined;
    if (sameUniverseV2Member(existing, desired)) return false;
    const oldPath = existing ? rankTreePath(existing.sortKey) : [];
    const newPath = desired ? rankTreePath(desired.sortKey) : [];
    const nodeIds = [...new Set([...oldPath, ...newPath].map((item) => item.nodeId))];
    const nodeRefs = nodeIds.map((nodeId) => universeV2RankTreeRef(boardKey, nodeId));
    const [boardSnapshot, ...nodeSnapshots] = await Promise.all([
      transaction.get(universeV2BoardRef(boardKey)),
      ...nodeRefs.map((ref) => transaction.get(ref)),
    ]);
    const countsByNode = new Map<string, Record<string, number>>(nodeIds.map((nodeId, index) => {
      const data = nodeSnapshots[index].data() as { counts?: Record<string, number> } | undefined;
      return [nodeId, { ...(data?.counts ?? {}) }];
    }));
    for (const item of oldPath) {
      const counts = countsByNode.get(item.nodeId)!;
      counts[item.branch] = Math.max(0, Number(counts[item.branch] ?? 0) - 1);
      if (counts[item.branch] === 0) delete counts[item.branch];
    }
    for (const item of newPath) {
      const counts = countsByNode.get(item.nodeId)!;
      counts[item.branch] = Math.max(0, Number(counts[item.branch] ?? 0) + 1);
    }
    nodeIds.forEach((nodeId, index) => transaction.set(nodeRefs[index], { counts: countsByNode.get(nodeId), updatedAt: nowIso(now) }, { merge: false }));
    const existingBoard = boardSnapshot.data() as Partial<UniverseV2BoardLanding> | undefined;
    const memberCount = Math.max(0, Number(existingBoard?.memberCount ?? 0) + (existing ? -1 : 0) + (desired ? 1 : 0));
    const descriptor = desired ?? existing;
    if (descriptor) transaction.set(universeV2BoardRef(boardKey), clean({
      version: UNIVERSE_V2_VERSION,
      boardKey,
      categoryId: descriptor.categoryId,
      categoryTitle: descriptor.categoryTitle,
      boardDescription: descriptor.boardDescription,
      scopeLabel: descriptor.scopeLabel,
      minimumLabel: descriptor.minimumLabel,
      memberCount,
      topEntries: Array.isArray(existingBoard?.topEntries) ? existingBoard!.topEntries : [],
      updatedAt: nowIso(now),
    }), { merge: false });
    if (desired) transaction.set(memberRef, clean(desired), { merge: false });
    else transaction.delete(memberRef);
    return true;
  });
}

async function refreshUniverseV2BoardLanding(boardKey: string, now: Date) {
  const boardRef = universeV2BoardRef(boardKey);
  const [boardSnapshot, membersSnapshot] = await Promise.all([
    boardRef.get(),
    boardRef.collection("members").orderBy("sortKey", "asc").limit(UNIVERSE_V2_DISPLAY_LIMIT).get(),
  ]);
  if (!boardSnapshot.exists) return;
  const board = boardSnapshot.data() as UniverseV2BoardLanding;
  const topEntries = membersSnapshot.docs.map((document) => document.data() as UniverseV2RankMember)
    .filter((document) => !containsPrivateUniverseV2Field(document) && !publicArtifactHasPrivateFields(document));
  const next = { ...board, topEntries, updatedAt: nowIso(now) };
  if (containsPrivateUniverseV2Field(next) || publicArtifactHasPrivateFields(next)) throw new Error("Unsafe data was blocked from a Universe v2 board landing.");
  await boardRef.set(clean(next), { merge: false });
}

async function updateUniverseV2LiveCache(participant: UniverseParticipant | undefined, playerId: string, now: Date) {
  const db = getAdminDb();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(universeV2LandingRef());
    const existing = snapshot.data() as UniverseV2Landing | undefined;
    const liveParticipants = [...(existing?.liveParticipants ?? [])].filter((item) => item.stablePlayerId !== playerId);
    if (participant) liveParticipants.unshift(participant);
    const landing: UniverseV2Landing = {
      version: UNIVERSE_V2_VERSION,
      revision: (existing?.revision ?? 0) + 1,
      generatedAt: nowIso(now),
      liveParticipants: liveParticipants.slice(0, UNIVERSE_V2_LIVE_CACHE_LIMIT),
      recentEvents: boundedRecentEvents(existing?.recentEvents ?? [], now),
    };
    if (containsPrivateUniverseV2Field(landing) || publicArtifactHasPrivateFields(landing)) throw new Error("Unsafe data was blocked from the Universe v2 landing cache.");
    transaction.set(universeV2LandingRef(), clean(landing), { merge: false });
  });
}

async function loadUniverseV2StandingForMember(member: UniverseV2RankMember): Promise<UniverseV2Standing> {
  const path = rankTreePath(member.sortKey);
  const [boardSnapshot, ...treeSnapshots] = await Promise.all([
    universeV2BoardRef(member.boardKey).get(),
    ...path.map((item) => universeV2RankTreeRef(member.boardKey, item.nodeId).get()),
  ]);
  const board = boardSnapshot.data() as UniverseV2BoardLanding | undefined;
  const counts = treeSnapshots.map((snapshot) => (snapshot.data() as { counts?: Record<string, number> } | undefined)?.counts);
  const rank = rankFromCountTree(member.sortKey, counts);
  const members = universeV2BoardRef(member.boardKey).collection("members");
  const [aboveSnapshot, belowSnapshot] = await Promise.all([
    members.where("sortKey", "<", member.sortKey).orderBy("sortKey", "desc").limit(1).get(),
    members.where("sortKey", ">", member.sortKey).orderBy("sortKey", "asc").limit(1).get(),
  ]);
  const above = aboveSnapshot.docs[0]?.data() as UniverseV2RankMember | undefined;
  const below = belowSnapshot.docs[0]?.data() as UniverseV2RankMember | undefined;
  return {
    boardKey: member.boardKey,
    categoryId: member.categoryId,
    categoryTitle: member.categoryTitle,
    scopeLabel: member.scopeLabel,
    rank,
    denominator: Math.max(rank, Number(board?.memberCount ?? 0)),
    value: member.value,
    valueLabel: member.valueLabel,
    player: member.player,
    nearestAbove: above ? { player: above.player, valueLabel: above.valueLabel } : undefined,
    nearestBelow: below ? { player: below.player, valueLabel: below.valueLabel } : undefined,
  };
}

async function upsertUniverseV2Index(document: MaterializedUniverseParticipant, now = new Date()) {
  if (containsPrivateUniverseV2Field(document) || publicArtifactHasPrivateFields(document)) throw new Error("Unsafe data was blocked from Universe v2 indexing.");
  const playerRef = universeV2PlayerRef(document.playerId);
  const existingSnapshot = await playerRef.get();
  const existing = existingSnapshot.exists ? existingSnapshot.data() as StoredUniverseV2Player : undefined;
  if (existing && !shouldAcceptOfficialPublication({
    existingPeriodEnd: existing.periodEnd,
    existingReviewLifecycle: existing.reviewLifecycle,
    incomingPeriodEnd: document.periodEnd,
    incomingReviewLifecycle: document.reviewLifecycle,
  })) return existing.projection;
  const desired = new Map(universeV2MembersFromParticipant(document).map((member) => [member.boardKey, member] as const));
  // Fixed-depth validation belongs to the ordinary mutation path; no population scan is permitted here.
  for (const member of desired.values()) rankTreePath(member.sortKey);
  const changedBoards: string[] = [];
  for (const boardKey of UNIVERSE_V2_BOARD_KEYS) {
    const changed = await applyUniverseV2BoardMember(boardKey, document.playerId, desired.get(boardKey), now);
    if (changed) changedBoards.push(boardKey);
  }
  for (const boardKey of changedBoards) await refreshUniverseV2BoardLanding(boardKey, now);
  const standings: UniverseV2Standing[] = [];
  for (const member of desired.values()) standings.push(await loadUniverseV2StandingForMember(member));
  const projection = updateOfficialStandingProjection({
    existing: existing?.projection,
    playerId: document.playerId,
    periodEnd: document.periodEnd,
    reviewLifecycle: document.reviewLifecycle,
    standings,
    nowIso: nowIso(now),
  });
  const stored: StoredUniverseV2Player = {
    version: UNIVERSE_V2_VERSION,
    playerId: document.playerId,
    periodEnd: document.periodEnd,
    reviewLifecycle: document.reviewLifecycle,
    participant: document.participant,
    projection,
    updatedAt: nowIso(now),
  };
  if (containsPrivateUniverseV2Field(stored) || publicArtifactHasPrivateFields(stored)) throw new Error("Unsafe data was blocked from a Universe v2 player projection.");
  const db = getAdminDb();
  await db.runTransaction(async (transaction) => {
    const [currentPlayer, metaSnapshot] = await Promise.all([transaction.get(playerRef), transaction.get(universeV2MetaRef())]);
    const meta = metaSnapshot.exists ? validUniverseV2Meta(metaSnapshot.data()) ?? initialUniverseV2Meta(nowIso(now)) : initialUniverseV2Meta(nowIso(now));
    const wasPresent = currentPlayer.exists;
    transaction.set(playerRef, clean(stored), { merge: false });
    transaction.set(universeV2MetaRef(), clean({
      ...meta,
      indexedPlayerCount: Math.max(0, meta.indexedPlayerCount + (wasPresent ? 0 : 1)),
      officialPlayerCount: Math.max(0, meta.officialPlayerCount + (wasPresent ? 0 : 1)),
      revision: meta.revision + 1,
      updatedAt: nowIso(now),
    }), { merge: false });
  });
  await updateUniverseV2LiveCache(document.participant, document.playerId, now);
  return projection;
}

async function removeUniverseV2Index(playerIdInput: number | string, now = new Date()) {
  const playerId = String(playerIdInput);
  const playerRef = universeV2PlayerRef(playerId);
  const existingSnapshot = await playerRef.get();
  for (const boardKey of UNIVERSE_V2_BOARD_KEYS) {
    const changed = await applyUniverseV2BoardMember(boardKey, playerId, undefined, now);
    if (changed) await refreshUniverseV2BoardLanding(boardKey, now);
  }
  if (existingSnapshot.exists) {
    const db = getAdminDb();
    await db.runTransaction(async (transaction) => {
      const [currentPlayer, metaSnapshot] = await Promise.all([transaction.get(playerRef), transaction.get(universeV2MetaRef())]);
      if (!currentPlayer.exists) return;
      const meta = metaSnapshot.exists ? validUniverseV2Meta(metaSnapshot.data()) ?? initialUniverseV2Meta(nowIso(now)) : initialUniverseV2Meta(nowIso(now));
      transaction.delete(playerRef);
      transaction.set(universeV2MetaRef(), clean({
        ...meta,
        indexedPlayerCount: Math.max(0, meta.indexedPlayerCount - 1),
        officialPlayerCount: Math.max(0, meta.officialPlayerCount - 1),
        revision: meta.revision + 1,
        updatedAt: nowIso(now),
      }), { merge: false });
    });
  }
  await updateUniverseV2LiveCache(undefined, playerId, now);
}

async function loadUniverseV2ActiveState(now = new Date()): Promise<ActiveUniverseState> {
  const [metaSnapshot, landingSnapshot, ...boardSnapshots] = await Promise.all([
    universeV2MetaRef().get(),
    universeV2LandingRef().get(),
    ...UNIVERSE_V2_BOARD_KEYS.map((boardKey) => universeV2BoardRef(boardKey).get()),
  ]);
  const meta = metaSnapshot.exists ? validUniverseV2Meta(metaSnapshot.data()) : undefined;
  if (!meta || meta.phase !== "v2-active" || meta.readAuthority !== "v2") throw Object.assign(new Error("Universe v2 is not authoritative."), { status: 503, code: "BOARDSIGNAL_UNIVERSE_V2_NOT_ACTIVE" });
  const landing = landingSnapshot.data() as UniverseV2Landing | undefined;
  const boards: PulseUniverseBoard[] = boardSnapshots.flatMap((snapshot) => {
    if (!snapshot.exists) return [];
    const board = snapshot.data() as UniverseV2BoardLanding;
    if (!board.memberCount || containsPrivateUniverseV2Field(board) || publicArtifactHasPrivateFields(board)) return [];
    return [{
      key: board.boardKey,
      categoryId: board.categoryId as PulseUniverseBoard["categoryId"],
      title: board.categoryTitle,
      description: board.boardDescription,
      scopeLabel: board.scopeLabel,
      minimumLabel: board.minimumLabel,
      fieldLabel: board.memberCount >= 6 ? "BOARDSIGNAL FIELD" as const : "FOUNDING BETA FIELD" as const,
      comparableLivePlayers: board.memberCount,
      entries: board.topEntries.slice(0, UNIVERSE_V2_DISPLAY_LIMIT).map((member, index) => ({
        participantId: member.participantId,
        stablePlayerId: member.playerId,
        player: member.player,
        rank: index + 1,
        value: member.value,
        valueLabel: member.valueLabel,
        evidence: member.evidence,
        coverageHref: member.coverageHref,
        coverageHeadline: member.coverageHeadline,
      })),
    }];
  });
  const events = boundedRecentEvents(landing?.recentEvents ?? [], now);
  return {
    version: UNIVERSE_V2_VERSION,
    revision: meta.revision,
    bootstrapComplete: true,
    generatedAt: landing?.generatedAt ?? meta.updatedAt,
    liveParticipants: (landing?.liveParticipants ?? []).slice(0, UNIVERSE_V2_LIVE_CACHE_LIMIT),
    boards,
    groups: buildPulseUniverseGroups(boards),
    recentEvents: events,
    whatsHot: rankWhatsHot(events, now),
    officialPlayerCount: meta.officialPlayerCount,
  };
}

async function loadUniverseV2PlayerContext(playerIdInput: number | string): Promise<UniverseV2PlayerContext> {
  const playerId = String(playerIdInput);
  const snapshot = await universeV2PlayerRef(playerId).get();
  if (!snapshot.exists) return { standings: [], snapshots: [] };
  const player = snapshot.data() as StoredUniverseV2Player;
  const standings = player.projection.standings.map((standing) => ({
    categoryId: standing.categoryId,
    categoryTitle: standing.categoryTitle,
    scopeLabel: standing.scopeLabel,
    rank: standing.rank,
    denominator: standing.denominator,
    percentile: standing.denominator >= 4 ? Math.round(((standing.denominator - standing.rank + 1) / standing.denominator) * 100) : undefined,
    valueLabel: standing.valueLabel,
    nearestAbove: standing.nearestAbove,
  } satisfies DeskUniverseStanding));
  const snapshots: PulseStandingSnapshot[] = player.projection.standings.map((standing) => ({
    key: standing.boardKey,
    categoryId: standing.categoryId,
    categoryTitle: standing.categoryTitle,
    scopeLabel: standing.scopeLabel,
    rank: standing.rank,
    denominator: standing.denominator,
    value: standing.value,
    valueLabel: standing.valueLabel,
  }));
  // Read one neighbour in each direction for every projected board; never scan the population.
  await Promise.all(player.projection.standings.map(async (standing) => {
    const members = universeV2BoardRef(standing.boardKey).collection("members");
    await Promise.all([
      members.where("sortKey", "<", buildUniverseV2SortKey(standing.value, 0, player.participant.player)).orderBy("sortKey", "desc").limit(1).get().catch(() => undefined),
      members.where("sortKey", ">", buildUniverseV2SortKey(standing.value, 0, player.participant.player)).orderBy("sortKey", "asc").limit(1).get().catch(() => undefined),
    ]);
  }));
  return { projection: player.projection, standings, snapshots };
}

async function setUniverseV2Meta(meta: StoredUniverseV2Meta) {
  if (containsPrivateUniverseV2Field(meta) || publicArtifactHasPrivateFields(meta)) throw new Error("Unsafe data was blocked from Universe v2 metadata.");
  await universeV2MetaRef().set(clean(meta), { merge: false });
  return meta;
}

export async function migrateUniverseV2Page(now = new Date()) {
  const db = getAdminDb();
  let meta = await loadUniverseV2Meta(now);
  if (meta.phase === "v1") {
    meta = { ...beginUniverseV2Migration(meta, nowIso(now)), sourceSafeCount: 0 };
    await setUniverseV2Meta(meta);
  }
  if (meta.phase !== "migrating") throw new Error("Universe v2 migration requires v1 or migrating phase.");
  let query = db.collection("publicUniverseParticipants").orderBy("playerId", "asc").limit(UNIVERSE_V2_MIGRATION_PAGE_SIZE);
  if (meta.migrationCursor) query = query.startAfter(meta.migrationCursor);
  const snapshot = await query.get();
  let safeCount = 0;
  let repairRequiredCount = meta.repairRequiredCount;
  for (const snapshotDocument of snapshot.docs) {
    const document = snapshotDocument.data() as MaterializedUniverseParticipant;
    if (document.version !== MATERIALIZED_UNIVERSE_VERSION || document.participant?.verified !== true || containsPrivateUniverseV2Field(document) || publicArtifactHasPrivateFields(document)) {
      repairRequiredCount += 1;
      continue;
    }
    safeCount += 1;
    await upsertUniverseV2Index(document, now);
  }
  const updated = await loadUniverseV2Meta(now);
  const cursor = snapshot.docs.at(-1)?.get("playerId") as string | undefined;
  const sourceExhausted = snapshot.size < UNIVERSE_V2_MIGRATION_PAGE_SIZE;
  const recorded = recordUniverseV2MigrationPage({ ...updated, repairRequiredCount }, {
    indexedPlayerCount: updated.indexedPlayerCount,
    migrationCursor: cursor,
    sourceExhausted,
    nowIso: nowIso(now),
  });
  const next: StoredUniverseV2Meta = { ...recorded, sourceSafeCount: (meta.sourceSafeCount ?? 0) + safeCount, repairRequiredCount };
  await setUniverseV2Meta(next);
  return { phase: next.phase, readAuthority: next.readAuthority, processed: snapshot.size, safeCount, indexedPlayerCount: next.indexedPlayerCount, sourceSafeCount: next.sourceSafeCount, cursor: next.migrationCursor, sourceExhausted: next.sourceExhausted };
}

export async function repairUniverseV2Player(playerIdInput: number | string, now = new Date()) {
  const playerId = String(playerIdInput);
  const snapshot = await materializedParticipantRef(playerId).get();
  if (!snapshot.exists) { await removeUniverseV2Index(playerId, now); return { playerId, removed: true }; }
  const document = snapshot.data() as MaterializedUniverseParticipant;
  if (document.version !== MATERIALIZED_UNIVERSE_VERSION || document.participant?.verified !== true || containsPrivateUniverseV2Field(document) || publicArtifactHasPrivateFields(document)) throw new Error("Universe v2 repair source is not a canonical safe-public participant.");
  await upsertUniverseV2Index(document, now);
  return { playerId, removed: false };
}

export async function repairUniverseV2Page(cursor?: string, now = new Date()) {
  const db = getAdminDb();
  let query = db.collection("publicUniverseParticipants").orderBy("playerId", "asc").limit(UNIVERSE_V2_MIGRATION_PAGE_SIZE);
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.get();
  let repaired = 0;
  for (const snapshotDocument of snapshot.docs) {
    const document = snapshotDocument.data() as MaterializedUniverseParticipant;
    if (document.version !== MATERIALIZED_UNIVERSE_VERSION || document.participant?.verified !== true || containsPrivateUniverseV2Field(document) || publicArtifactHasPrivateFields(document)) continue;
    await upsertUniverseV2Index(document, now);
    repaired += 1;
  }
  return { repaired, cursor: snapshot.docs.at(-1)?.get("playerId") as string | undefined, exhausted: snapshot.size < UNIVERSE_V2_MIGRATION_PAGE_SIZE };
}

export async function loadUniverseV2Health(): Promise<UniverseV2Health> {
  const [metaSnapshot, v1Snapshot] = await Promise.all([universeV2MetaRef().get(), stateRef().get()]);
  const meta = metaSnapshot.exists ? validUniverseV2Meta(metaSnapshot.data()) : undefined;
  const v1 = v1Snapshot.exists ? validateMaterializedState(v1Snapshot.data()) : undefined;
  const current = meta ?? initialUniverseV2Meta(nowIso());
  return {
    version: UNIVERSE_V2_VERSION,
    phase: current.phase,
    readAuthority: current.readAuthority,
    officialPlayerCount: current.officialPlayerCount,
    indexedPlayerCount: current.indexedPlayerCount,
    v1OfficialPlayerCount: v1?.officialPlayerCount ?? 0,
    migrationCursor: current.migrationCursor,
    sourceExhausted: current.sourceExhausted,
    staleBoardCount: current.staleBoardCount,
    repairRequiredCount: current.repairRequiredCount,
    updatedAt: current.updatedAt,
    certifiedAt: current.certifiedAt,
    cutoverAt: current.cutoverAt,
  };
}

export async function loadUniverseV2ActivationProof() {
  const [meta, sample] = await Promise.all([
    loadUniverseV2Meta(),
    getAdminDb().collection("publicUniverseV2Players").orderBy("playerId", "asc").limit(1).get(),
  ]);
  const document = sample.docs[0]?.data() as StoredUniverseV2Player | undefined;
  if (!document) return { available: false, phase: meta.phase, readAuthority: meta.readAuthority, privacySafe: true };
  const context = await loadUniverseV2PlayerContext(document.playerId);
  return {
    available: true,
    phase: meta.phase,
    readAuthority: meta.readAuthority,
    playerId: document.playerId,
    periodEnd: document.periodEnd,
    standingCount: context.projection?.standings.length ?? 0,
    privacySafe: !containsPrivateUniverseV2Field(document) && !publicArtifactHasPrivateFields(document),
  };
}

export async function certifyUniverseV2Production(now = new Date()) {
  const meta = await loadUniverseV2Meta(now);
  const sourceCount = meta.sourceSafeCount ?? -1;
  const boardSnapshots = await Promise.all(UNIVERSE_V2_BOARD_KEYS.map((boardKey) => universeV2BoardRef(boardKey).get()));
  for (const snapshot of boardSnapshots) {
    if (snapshot.exists && (containsPrivateUniverseV2Field(snapshot.data()) || publicArtifactHasPrivateFields(snapshot.data()))) throw new Error("Unsafe data was blocked during Universe v2 certification.");
  }
  const certified = certifyUniverseV2(meta, sourceCount, nowIso(now));
  await setUniverseV2Meta({ ...certified, sourceSafeCount: sourceCount });
  return loadUniverseV2Health();
}

export async function cutoverUniverseV2Production(now = new Date()) {
  const meta = await loadUniverseV2Meta(now);
  const cutover = cutoverUniverseV2(meta, nowIso(now));
  await setUniverseV2Meta({ ...cutover, sourceSafeCount: meta.sourceSafeCount });
  const proof = await loadUniverseV2ActivationProof();
  if (!proof.available || proof.readAuthority !== "v2" || proof.privacySafe !== true) throw new Error("Universe v2 activation proof failed after cutover.");
  return { health: await loadUniverseV2Health(), proof };
}

export async function rollbackUniverseV2Production(now = new Date()) {
  const meta = await loadUniverseV2Meta(now);
  const rolledBack = rollbackUniverseV2(meta, nowIso(now));
  await setUniverseV2Meta({ ...rolledBack, sourceSafeCount: 0 });
  return loadUniverseV2Health();
}

async function bootstrapRecentUniverseEvents(limit = MATERIALIZED_EVENT_LIMIT): Promise<PublicUniverseEvent[]> {
  const snapshot = await getAdminDb().collection("publicUniverseEvents").orderBy("publishedAt", "desc").limit(limit).get().catch(() => ({ docs: [] }));
  return (snapshot.docs as Array<{ data(): unknown }>).map((document) => document.data() as PublicUniverseEvent).filter(safePublicEvent);
}

async function bootstrapActiveDeskRecords(): Promise<ActiveDeskRecord[]> {
  const db = getAdminDb();
  const users = await db.collection("users").get();
  const active = users.docs
    .map((document) => document.data() as BoardSignalAccount)
    .filter((account) => account.role === "player" && account.accessTier === "founding_beta" && account.accessStatus === "active");
  const records: ActiveDeskRecord[] = [];
  for (const account of active) {
    const desks = await db.collection("users").doc(account.uid).collection("desks").orderBy("periodEnd", "desc").limit(4).get();
    for (const document of desks.docs) {
      const data = document.data() as {
        deskKey?: string;
        periodEnd?: string;
        desk?: BoardSignalDesk;
        reviewLifecycle?: ReviewLifecycle;
        publishedAt?: string;
        importedAt?: string;
        originalBeta?: { universeParticipant?: UniverseParticipant };
      };
      if (data.desk?.source === "live" && data.desk.provenance.verified) {
        records.push({ account, deskKey: String(data.deskKey ?? document.id), periodEnd: String(data.periodEnd ?? data.desk.period.end), reviewLifecycle: storedReviewLifecycle(data) ?? "organic_live", publishedAt: data.publishedAt, importedAt: data.importedAt, desk: data.desk });
      } else if (data.originalBeta?.universeParticipant?.verified) {
        records.push({ account, deskKey: String(data.deskKey ?? document.id), periodEnd: data.originalBeta.universeParticipant.periodEnd, reviewLifecycle: "original_beta", originalBetaParticipant: data.originalBeta.universeParticipant });
      }
    }
  }
  return records;
}

async function acquireBootstrapLease(now = new Date()) {
  const db = getAdminDb();
  const leaseId = randomBytes(16).toString("hex");
  const leaseUntil = new Date(now.getTime() + MATERIALIZED_BOOTSTRAP_LEASE_MS).toISOString();
  return db.runTransaction(async (transaction) => {
    const [stateSnapshot, leaseSnapshot] = await Promise.all([transaction.get(stateRef()), transaction.get(bootstrapLeaseRef())]);
    const currentState = stateSnapshot.exists ? validateMaterializedState(stateSnapshot.data()) : undefined;
    if (currentState?.bootstrapComplete === true) return { owner: false as const, existing: currentState };
    const previous = leaseSnapshot.data() as BootstrapLease | undefined;
    if (previous?.leaseUntil && previous.leaseUntil > now.toISOString()) return { owner: false as const };
    const lease: BootstrapLease = { leaseId, leaseUntil, startedAt: now.toISOString() };
    transaction.set(bootstrapLeaseRef(), lease, { merge: false });
    return { owner: true as const, lease };
  });
}

async function bootstrapMaterializedUniverse(now = new Date()): Promise<ActiveUniverseState | undefined> {
  assertFirestoreCircuitClosed("universe_bootstrap");
  const lease = await acquireBootstrapLease(now);
  if (lease.existing) return lease.existing;
  if (!lease.owner) return undefined;
  const started = Date.now();
  try {
    const [records, events] = await Promise.all([bootstrapActiveDeskRecords(), bootstrapRecentUniverseEvents()]);
    const participants = latestUniverseParticipants(records.flatMap((record) => {
      const participant = participantFromRecord(record);
      return participant ? [participant] : [];
    }));
    const db = getAdminDb();
    for (let offset = 0; offset < participants.length; offset += 350) {
      const batch = db.batch();
      for (const participant of participants.slice(offset, offset + 350)) {
        const playerId = participant.stablePlayerId;
        if (!playerId) continue;
        const record = records.filter((item) => String(item.account.chessCom.playerId) === playerId).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
        if (!record) continue;
        const doc: MaterializedUniverseParticipant = {
          version: MATERIALIZED_UNIVERSE_VERSION,
          playerId,
          canonicalUsername: record.account.chessCom.canonicalUsername,
          reviewLifecycle: record.reviewLifecycle,
          periodEnd: participant.periodEnd,
          participant,
          updatedAt: nowIso(now),
        };
        if (publicArtifactHasPrivateFields(doc)) throw new Error("Unsafe data was blocked from a public Universe participant summary.");
        batch.set(materializedParticipantRef(playerId), clean(doc), { merge: false });
      }
      await batch.commit();
    }
    const state = materializedStateFromParticipants(participants, events, now, 1, true);
    await stateRef().set(clean(state), { merge: false });
    await bootstrapLeaseRef().delete().catch(() => undefined);
    logFirestoreReadBudget({ operation: "universe_bootstrap", durationMs: Date.now() - started, materialized: "rebuild", resultSize: participants.length, approxDocumentReads: 1 + records.length + events.length });
    return state;
  } catch (error) {
    noteFirestoreServiceFailure(error);
    await bootstrapLeaseRef().delete().catch(() => undefined);
    throw error;
  }
}

async function repairMaterializedUniverseState(now = new Date()): Promise<ActiveUniverseState | undefined> {
  assertFirestoreCircuitClosed("universe_materialized_repair");
  const lease = await acquireBootstrapLease(now);
  if (lease.existing) return lease.existing;
  if (!lease.owner) return undefined;

  const started = Date.now();
  try {
    const snapshot = await getAdminDb()
      .collection("publicUniverseParticipants")
      .limit(MATERIALIZED_PARTICIPANT_LIMIT + 1)
      .get();

    if (snapshot.size > MATERIALIZED_PARTICIPANT_LIMIT) {
      throw Object.assign(new Error("The materialized BoardSignal field exceeds the safe in-document participant limit."), {
        status: 503,
        code: "BOARDSIGNAL_UNIVERSE_MATERIALIZED_LIMIT",
        retryAfterSeconds: 30,
      });
    }

    const participants = snapshot.docs
      .map((document) => document.data() as MaterializedUniverseParticipant)
      .filter((document) => document.version === MATERIALIZED_UNIVERSE_VERSION && document.participant?.verified === true && !publicArtifactHasPrivateFields(document))
      .map((document) => document.participant);

    // A missing current-state document can be repaired entirely from the
    // already-public materialized participant summaries. No users, Reviews,
    // evidence or historical collections are touched.
    const state = materializedStateFromParticipants(participants, [], now, 1, true);
    await stateRef().set(clean(state), { merge: false });
    await bootstrapLeaseRef().delete().catch(() => undefined);
    logFirestoreReadBudget({
      operation: "universe_materialized_repair",
      durationMs: Date.now() - started,
      materialized: "rebuild",
      resultSize: participants.length,
      approxDocumentReads: snapshot.size + 2,
    });
    return state;
  } catch (error) {
    noteFirestoreServiceFailure(error);
    await bootstrapLeaseRef().delete().catch(() => undefined);
    throw error;
  }
}

export async function loadActiveUniverseState(now = new Date()): Promise<ActiveUniverseState> {
  assertFirestoreCircuitClosed("materialized_universe_read");
  const started = Date.now();
  try {
    const v2Meta = await loadUniverseV2Meta(now);
    if (v2Meta?.phase === "v2-active") {
      const active = await loadUniverseV2ActiveState(now);
      logFirestoreReadBudget({ operation: "materialized_universe_read", durationMs: Date.now() - started, materialized: "hit", resultSize: active.officialPlayerCount, approxDocumentReads: UNIVERSE_V2_BOARD_KEYS.length + 2 });
      return active;
    }
    const snapshot = await stateRef().get();
    const state = snapshot.exists ? validateMaterializedState(snapshot.data()) : undefined;
    if (state?.bootstrapComplete === true) {
      logFirestoreReadBudget({ operation: "materialized_universe_read", durationMs: Date.now() - started, materialized: "hit", resultSize: state.officialPlayerCount, approxDocumentReads: 1 });
      return state;
    }

    // G.4.2.2: one lease-protected repair may read only the bounded public
    // participant summaries. Concurrent ordinary requests never fan out.
    const repaired = await repairMaterializedUniverseState(now);
    if (repaired) {
      logFirestoreReadBudget({ operation: "materialized_universe_read", durationMs: Date.now() - started, materialized: "rebuild", resultSize: repaired.officialPlayerCount, approxDocumentReads: 1 });
      return repaired;
    }

    logFirestoreReadBudget({ operation: "materialized_universe_read", durationMs: Date.now() - started, materialized: "miss", approxDocumentReads: 1 });
    throw Object.assign(new Error("The live BoardSignal field is being repaired. Try again shortly."), {
      status: 503,
      code: "BOARDSIGNAL_UNIVERSE_STATE_UNAVAILABLE",
      retryAfterSeconds: 2,
    });
  } catch (error) {
    const failure = classifyFirestoreServiceError(error);
    if (failure) {
      noteFirestoreServiceFailure(error);
      logFirestoreReadBudget({ operation: "materialized_universe_read", durationMs: Date.now() - started, materialized: "miss", approxDocumentReads: 1, failure: failure.kind });
    }
    throw error;
  }
}

export async function rebuildMaterializedUniverseState(now = new Date(), excludePlayerId?: string): Promise<ActiveUniverseState> {
  assertFirestoreCircuitClosed("universe_rebuild");
  const started = Date.now();
  try {
    const db = getAdminDb();
    const [participantsSnapshot, previousSnapshot] = await Promise.all([
      db.collection("publicUniverseParticipants").limit(MATERIALIZED_PARTICIPANT_LIMIT + 1).get(),
      stateRef().get(),
    ]);
    if (participantsSnapshot.size > MATERIALIZED_PARTICIPANT_LIMIT) {
      throw Object.assign(new Error("The materialized BoardSignal field exceeds the safe in-document participant limit."), {
        status: 503,
        code: "BOARDSIGNAL_UNIVERSE_MATERIALIZED_LIMIT",
        retryAfterSeconds: 30,
      });
    }
    const participantDocs = participantsSnapshot.docs
      .map((document) => document.data() as MaterializedUniverseParticipant)
      .filter((document) => document.version === MATERIALIZED_UNIVERSE_VERSION && document.participant?.verified === true && !publicArtifactHasPrivateFields(document));
    const participants = participantDocs.map((document) => document.participant);
    const previous = previousSnapshot.exists ? validateMaterializedState(previousSnapshot.data()) : undefined;
    const previousEvents = (previous?.recentEvents ?? []).filter((event) => !excludePlayerId || event.playerId !== excludePlayerId);
    const state = materializedStateFromParticipants(participants, previousEvents, now, (previous?.revision ?? 0) + 1, true);
    await stateRef().set(clean(state), { merge: false });
    logFirestoreReadBudget({ operation: "universe_rebuild", durationMs: Date.now() - started, materialized: "rebuild", resultSize: participants.length, approxDocumentReads: participants.length + 1 });
    return state;
  } catch (error) {
    const failure = noteFirestoreServiceFailure(error);
    logFirestoreReadBudget({ operation: "universe_rebuild", durationMs: Date.now() - started, materialized: "rebuild", failure: failure?.kind });
    throw error;
  }
}

export async function upsertMaterializedUniverseParticipant(input: {
  account: BoardSignalAccount;
  desk?: BoardSignalDesk;
  originalBetaParticipant?: UniverseParticipant;
  reviewLifecycle: ReviewLifecycle;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  if (!publicIdentityAllowed(input.account)) return removeMaterializedUniverseParticipant(input.account.chessCom.playerId, now);
  const record: ActiveDeskRecord = {
    account: input.account,
    deskKey: input.desk?.episodeKey ?? `original:${input.account.chessCom.playerId}`,
    periodEnd: input.desk?.period.end ?? input.originalBetaParticipant?.periodEnd ?? "",
    reviewLifecycle: input.reviewLifecycle,
    desk: input.desk,
    originalBetaParticipant: input.originalBetaParticipant,
  };
  const participant = participantFromRecord(record);
  if (!participant || !record.periodEnd) return undefined;
  const ref = materializedParticipantRef(input.account.chessCom.playerId);
  const document: MaterializedUniverseParticipant = {
    version: MATERIALIZED_UNIVERSE_VERSION,
    playerId: String(input.account.chessCom.playerId),
    canonicalUsername: input.account.chessCom.canonicalUsername,
    reviewLifecycle: input.reviewLifecycle,
    periodEnd: record.periodEnd,
    participant,
    updatedAt: nowIso(now),
  };
  if (publicArtifactHasPrivateFields(document)) throw new Error("Unsafe data was blocked from a public Universe participant summary.");
  const db = getAdminDb();
  const changed = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.data() as MaterializedUniverseParticipant | undefined;
    // Historical catch-up must never regress a newer official chess state.
    if (existing?.periodEnd && existing.periodEnd > document.periodEnd) return false;
    if (existing && JSON.stringify(clean(existing.participant)) === JSON.stringify(clean(document.participant)) && existing.reviewLifecycle === document.reviewLifecycle && existing.periodEnd === document.periodEnd) return false;
    transaction.set(ref, clean(document), { merge: false });
    return true;
  });
  if (!changed) return loadActiveUniverseState(now);
  const v2Meta = await loadUniverseV2Meta(now);
  if (v2Meta.phase !== "v1") await upsertUniverseV2Index(document, now);
  if (v2Meta.phase === "v2-active") return loadUniverseV2ActiveState(now);
  const currentSnapshot = await stateRef().get();
  const current = currentSnapshot.exists ? validateMaterializedState(currentSnapshot.data()) : undefined;
  if (current?.bootstrapComplete !== true) {
    // Write lifecycle may repair state, but only from the bounded materialized
    // participant collection. It must never fall back to users + retained Reviews.
    return rebuildMaterializedUniverseState(now);
  }
  return rebuildMaterializedUniverseState(now);
}

export async function removeMaterializedUniverseParticipant(playerId: number | string, now = new Date()) {
  const ref = materializedParticipantRef(playerId);
  const snapshot = await ref.get();
  const v2Meta = await loadUniverseV2Meta(now);
  if (!snapshot.exists) {
    if (v2Meta.phase !== "v1") await removeUniverseV2Index(playerId, now);
    return loadActiveUniverseState(now).catch(() => undefined);
  }
  await ref.delete();
  if (v2Meta.phase !== "v1") await removeUniverseV2Index(playerId, now);
  if (v2Meta.phase === "v2-active") return loadUniverseV2ActiveState(now);
  return rebuildMaterializedUniverseState(now);
}

type MaterializedReviewCandidate = {
  periodEnd: string;
  reviewLifecycle: ReviewLifecycle;
  desk?: BoardSignalDesk;
  originalBetaParticipant?: UniverseParticipant;
};

export async function refreshMaterializedUniverseParticipantForPlayerId(playerIdInput: number | string, now = new Date()) {
  const playerId = Number(playerIdInput);
  if (!Number.isSafeInteger(playerId) || playerId <= 0) return undefined;
  const db = getAdminDb();
  const mapping = await db.collection("chessPlayerAccounts").doc(String(playerId)).get();
  const uid = typeof mapping.data()?.uid === "string" ? String(mapping.data()!.uid) : `chesscom_${playerId}`;
  const accountSnapshot = await db.collection("users").doc(uid).get();
  if (!accountSnapshot.exists) return removeMaterializedUniverseParticipant(playerId, now);
  const account = accountSnapshot.data() as BoardSignalAccount;
  if (!publicIdentityAllowed(account)) return removeMaterializedUniverseParticipant(playerId, now);
  const desks = await db.collection("users").doc(uid).collection("desks").orderBy("periodEnd", "desc").limit(4).get();
  const candidates = desks.docs.flatMap<MaterializedReviewCandidate>((document) => {
    const data = document.data() as {
      periodEnd?: string;
      desk?: BoardSignalDesk;
      reviewLifecycle?: ReviewLifecycle;
      originalBeta?: { universeParticipant?: UniverseParticipant };
    };
    if (data.desk?.source === "live" && data.desk.provenance.verified) return [{
      periodEnd: data.periodEnd ?? data.desk.period.end,
      desk: data.desk,
      reviewLifecycle: storedReviewLifecycle(data) ?? "organic_live" as ReviewLifecycle,
    }];
    if (data.originalBeta?.universeParticipant?.verified) return [{
      periodEnd: data.originalBeta.universeParticipant.periodEnd,
      originalBetaParticipant: data.originalBeta.universeParticipant,
      reviewLifecycle: "original_beta" as ReviewLifecycle,
    }];
    return [];
  }).sort((a, b) => String(b.periodEnd).localeCompare(String(a.periodEnd)));
  const latest = candidates[0];
  if (!latest) return removeMaterializedUniverseParticipant(playerId, now);
  return upsertMaterializedUniverseParticipant({ account, desk: latest.desk, originalBetaParticipant: latest.originalBetaParticipant, reviewLifecycle: latest.reviewLifecycle, now });
}

export async function listRecentUniverseEvents(limit = 80): Promise<PublicUniverseEvent[]> {
  const state = await loadActiveUniverseState();
  return state.recentEvents.slice(0, Math.min(Math.max(0, limit), MATERIALIZED_EVENT_LIMIT));
}

export async function loadUniverseHomepageLead(): Promise<PublicUniverseEvent | undefined> {
  const state = await loadActiveUniverseState();
  return state.recentEvents.find((event) => event.homepageLead === true);
}

export async function writePublicUniverseEvent(event: PublicUniverseEvent) {
  if (!event.safePublic || publicArtifactHasPrivateFields(event)) throw new Error("Unsafe data was blocked from the public Universe event store.");
  const db = getAdminDb();
  await db.collection("publicUniverseEvents").doc(event.eventId).set(clean(event), { merge: true });
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(stateRef());
    const current = snapshot.exists ? validateMaterializedState(snapshot.data()) : undefined;
    if (!current) return;
    const recentEvents = boundedRecentEvents([event, ...current.recentEvents], new Date(event.publishedAt));
    transaction.set(stateRef(), clean({
      ...current,
      revision: current.revision + 1,
      generatedAt: nowIso(),
      recentEvents,
      whatsHot: rankWhatsHot(recentEvents, new Date()),
    }), { merge: false });
  });
  const v2Meta = await loadUniverseV2Meta(new Date(event.publishedAt));
  if (v2Meta.phase !== "v1") {
    const db2 = getAdminDb();
    await db2.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(universeV2LandingRef());
      const existing = snapshot.data() as UniverseV2Landing | undefined;
      const recentEvents = boundedRecentEvents([event, ...(existing?.recentEvents ?? [])], new Date(event.publishedAt));
      const landing: UniverseV2Landing = { version: UNIVERSE_V2_VERSION, revision: (existing?.revision ?? 0) + 1, generatedAt: nowIso(), liveParticipants: existing?.liveParticipants ?? [], recentEvents };
      transaction.set(universeV2LandingRef(), clean(landing), { merge: false });
    });
  }
  return event;
}

export async function recordNewPlayerUniverseIntro(account: BoardSignalAccount, now = new Date()) {
  if (!account.betaAgreementAcceptedAt || !account.universeParticipationDisclosedAt) return undefined;
  if (!publicIdentityAllowed(account)) return undefined;
  const eventId = hashId(`new-player:${account.chessCom.playerId}`);
  const event: PublicUniverseEvent = {
    eventId,
    eventType: "new_player",
    playerId: String(account.chessCom.playerId),
    canonicalUsername: account.chessCom.canonicalUsername,
    avatar: account.chessCom.avatar,
    occurredAt: account.universeParticipationDisclosedAt,
    publishedAt: nowIso(now),
    headline: `${account.chessCom.canonicalUsername} has entered the BoardSignal Universe.`,
    supportingFact: "First Review forming.",
    dataMode: "live",
    finality: "official",
    safePublic: true,
  };
  return writePublicUniverseEvent(event);
}

function boardEntry(board: PulseUniverseBoard | undefined, participantId: string) {
  return board?.entries.find((entry) => entry.participantId === participantId);
}

function eventTypeForMovement(beforeRank: number | undefined, afterRank: number): UniverseEventType {
  if (afterRank === 1 && beforeRank !== 1) return "new_leader";
  if (afterRank <= 3 && (beforeRank === undefined || beforeRank > 3)) return "entered_top3";
  if (afterRank <= 3 && beforeRank !== undefined && beforeRank <= 3 && beforeRank !== afterRank) return "podium_move";
  return "rank_move";
}

function eventHeadline(type: UniverseEventType, username: string, board: PulseUniverseBoard, rank: number) {
  const scope = board.scopeLabel ? ` · ${board.scopeLabel}` : "";
  if (type === "new_leader") return `${username} is the new ${board.title}${scope} leader.`;
  if (type === "entered_top3") return `${username} entered the ${board.title}${scope} Top 3.`;
  if (type === "podium_move") return `${username} moved on the ${board.title}${scope} podium.`;
  return `${username} moved in ${board.title}${scope}.`;
}

function eventTypeForShareMoment(moment: SafeShareMoment | undefined): UniverseEventType {
  if (!moment) return "desk_completed";
  if (moment.categoryId === "rating-climb") return "rating_climb";
  if (moment.categoryId === "rating-recovery") return "rating_recovery";
  if (moment.categoryId === "winning-run") return "winning_run";
  if (moment.categoryId === "strong-finish") return "strong_finish";
  if (moment.categoryId === "breakthrough-desk") return "breakthrough";
  if (moment.categoryId === "best-upset") return "best_upset";
  if (moment.categoryId === "moment-of-the-week" || moment.categoryId === "checkmate-finish") return "moment_of_the_week";
  return "desk_completed";
}

export async function upsertShareMoments(moments: SafeShareMoment[]) {
  const db = getAdminDb();
  for (const moment of moments) {
    if (!moment.safePublic || publicArtifactHasPrivateFields(moment)) throw new Error("Unsafe data was blocked from a Share Moment.");
    await db.collection("publicShareMoments").doc(moment.id).set(clean(moment), { merge: true });
  }
  return moments;
}

export async function recordCompletedDeskUniverseArtifacts(input: {
  account: BoardSignalAccount;
  desk: BoardSignalDesk;
  deskKey: string;
  beforeState: ActiveUniverseState;
  afterState?: ActiveUniverseState;
  deskCountAfter: number;
  reviewLifecycle?: ReviewLifecycle;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const afterState = input.afterState ?? await loadActiveUniverseState(now);
  const participantId = stableLiveParticipantId(input.account.chessCom.playerId);
  const officialStandingSnapshots = standingSnapshots(afterState.boards, participantId);
  if (input.reviewLifecycle === "historical_backfill") {
    return { events: [] as PublicUniverseEvent[], shareMoments: [] as SafeShareMoment[], afterState, officialStandingSnapshots };
  }

  const deskParticipant = deskToUniverseParticipant(input.desk);
  const deskBoards = deskParticipant ? buildUniverseBoards([deskParticipant]) : [];
  const beforeByKey = new Map(input.beforeState.boards.map((board) => [board.key, board]));
  const events: PublicUniverseEvent[] = [];
  for (const afterBoard of afterState.boards) {
    const after = boardEntry(afterBoard, participantId);
    if (!after) continue;
    const deskEntry = deskBoards.find((board) => board.key === afterBoard.key)?.entries[0];
    if (!deskEntry || Math.abs(deskEntry.value - after.value) > 0.0001) continue;
    const before = boardEntry(beforeByKey.get(afterBoard.key), participantId);
    if (before?.rank === after.rank && before?.value === after.value) continue;
    const type = eventTypeForMovement(before?.rank, after.rank);
    events.push({
      eventId: hashId(`${input.deskKey}:${afterBoard.key}:${type}:${before?.rank ?? "new"}:${after.rank}`),
      eventType: type,
      playerId: String(input.account.chessCom.playerId),
      canonicalUsername: input.account.chessCom.canonicalUsername,
      avatar: input.account.chessCom.avatar,
      deskKey: input.deskKey,
      episodeKey: input.desk.episodeKey,
      pool: afterBoard.scopeLabel?.toLowerCase() as PublicUniverseEvent["pool"],
      categoryId: afterBoard.categoryId,
      occurredAt: input.desk.period.end,
      publishedAt: nowIso(now),
      previousValue: before?.value,
      currentValue: after.value,
      rankBefore: before?.rank,
      rankAfter: after.rank,
      headline: eventHeadline(type, input.account.chessCom.canonicalUsername, afterBoard, after.rank),
      supportingFact: after.evidence,
      dataMode: "live",
      finality: "official",
      safePublic: true,
    });
  }

  const officialStandings = standingsFromActiveBoards(afterState.boards, participantId);
  const shareMoments = nominateShareMoments(input.desk, officialStandings, now).map((moment) => ({ ...moment, deskKey: input.deskKey }));
  await upsertShareMoments(shareMoments);
  if (input.deskCountAfter === 1) {
    const strongest = shareMoments[0];
    events.unshift({ eventId: hashId(`first-desk:${input.deskKey}`), eventType: "first_desk", playerId: String(input.account.chessCom.playerId), canonicalUsername: input.account.chessCom.canonicalUsername, avatar: input.account.chessCom.avatar, deskKey: input.deskKey, episodeKey: input.desk.episodeKey, occurredAt: input.desk.period.end, publishedAt: nowIso(now), headline: `First Review is in for ${input.account.chessCom.canonicalUsername}.`, supportingFact: strongest?.supportingFact ?? `${input.desk.games} games closed the first completed seven-day Review.`, dataMode: "live", finality: "official", safePublic: true });
    const watch = officialStandings.filter((standing) => standing.rank >= 4 && standing.rank <= 5).sort((a, b) => a.rank - b.rank || a.categoryTitle.localeCompare(b.categoryTitle))[0];
    if (watch) events.push({ eventId: hashId(`player-to-watch:${input.deskKey}:${watch.categoryId}:${watch.scopeLabel ?? "all"}`), eventType: "player_to_watch", playerId: String(input.account.chessCom.playerId), canonicalUsername: input.account.chessCom.canonicalUsername, avatar: input.account.chessCom.avatar, deskKey: input.deskKey, episodeKey: input.desk.episodeKey, pool: watch.scopeLabel?.toLowerCase() as PublicUniverseEvent["pool"], categoryId: watch.categoryId as PublicUniverseEvent["categoryId"], occurredAt: input.desk.period.end, publishedAt: nowIso(now), rankAfter: watch.rank, headline: `Player to watch: ${input.account.chessCom.canonicalUsername} opened at #${watch.rank} in ${watch.categoryTitle}${watch.scopeLabel ? ` · ${watch.scopeLabel}` : ""}.`, supportingFact: `${watch.valueLabel} placed the first completed Review #${watch.rank} of ${watch.denominator} in the current official field.`, dataMode: "live", finality: "official", safePublic: true });
  } else if (!events.length) {
    const strongest = shareMoments[0];
    const eventType = eventTypeForShareMoment(strongest);
    events.push({ eventId: hashId(`desk-completed:${input.deskKey}:${eventType}`), eventType, playerId: String(input.account.chessCom.playerId), canonicalUsername: input.account.chessCom.canonicalUsername, avatar: input.account.chessCom.avatar, deskKey: input.deskKey, episodeKey: input.desk.episodeKey, pool: strongest?.pool, categoryId: strongest?.categoryId === "checkmate-finish" ? "moment-of-the-week" : strongest?.categoryId, occurredAt: input.desk.period.end, publishedAt: nowIso(now), headline: strongest ? `${input.account.chessCom.canonicalUsername}: ${strongest.headline}.` : `${input.account.chessCom.canonicalUsername} published a new BoardSignal Review.`, supportingFact: strongest?.supportingFact ?? `${input.desk.games} games closed the completed seven-day Review.`, dataMode: "live", finality: "official", safePublic: true });
  }
  for (const event of events.slice(0, 3)) await writePublicUniverseEvent(event);
  return { events: events.slice(0, 3), shareMoments, afterState, officialStandingSnapshots };
}

// Explicit repair/publication helper only. Ordinary Player Room GET must pass already-loaded state.
export async function ensureShareMomentsForActiveDesks(account: BoardSignalAccount, desks: Array<{ desk: BoardSignalDesk; summary: { deskKey: string } }>, state: ActiveUniverseState) {
  if (!desks.length) return [];
  const participantId = stableLiveParticipantId(account.chessCom.playerId);
  const standings = standingsFromActiveBoards(state.boards, participantId);
  const moments = desks.flatMap((bundle, index) => nominateShareMoments(bundle.desk, index === 0 ? standings : [], new Date()).map((moment) => ({ ...moment, deskKey: bundle.summary.deskKey })));
  await upsertShareMoments(moments);
  return moments;
}

export async function listPlayerShareMoments(playerId: number, activeDeskKeys?: string[]) {
  const snapshot = await getAdminDb().collection("publicShareMoments").where("playerId", "==", String(playerId)).get().catch(() => ({ docs: [] }));
  const active = activeDeskKeys ? new Set(activeDeskKeys) : undefined;
  return (snapshot.docs as Array<{ data(): unknown }>).map((document) => document.data() as SafeShareMoment).filter((moment) => moment.safePublic === true && !publicArtifactHasPrivateFields(moment)).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || a.id.localeCompare(b.id)).map((moment) => ({ ...moment, activeDesk: active ? active.has(moment.deskKey) : undefined }));
}

export async function loadPublicShareMoment(momentId: string): Promise<SafeShareMoment | undefined> {
  if (!/^[A-Za-z0-9_-]{3,220}$/.test(momentId)) return undefined;
  const snapshot = await getAdminDb().collection("publicShareMoments").doc(momentId).get();
  if (!snapshot.exists) return undefined;
  const moment = snapshot.data() as SafeShareMoment;
  if (moment.safePublic !== true || publicArtifactHasPrivateFields(moment)) return undefined;
  return moment;
}

export async function buildPlayerPulse(input: {
  account: BoardSignalAccount;
  state: ActiveUniverseState;
  latestDesk?: BoardSignalDesk;
  currentEpisode?: CurrentEpisodeSummary;
  currentReviewStanding?: PulseStandingSnapshot[];
  previousReviewStanding?: PulseStandingSnapshot[];
  now?: Date;
}): Promise<PlayerPulse | undefined> {
  const now = input.now ?? new Date();
  const state = input.state;
  const participantId = stableLiveParticipantId(input.account.chessCom.playerId);
  const v2Meta = await loadUniverseV2Meta(now);
  const v2Context = v2Meta.phase === "v2-active" ? await loadUniverseV2PlayerContext(input.account.chessCom.playerId) : undefined;
  const standings = v2Context?.standings ?? standingsFromActiveBoards(state.boards, participantId);
  const currentStandings = v2Context?.snapshots ?? standingSnapshots(state.boards, participantId);
  const reviewMovement = input.currentReviewStanding?.length && input.previousReviewStanding?.length
    ? deriveReviewMovement(input.previousReviewStanding, input.currentReviewStanding)
    : [];
  const pulseRef = getAdminDb().collection("users").doc(input.account.uid).collection("pulse").doc("current");
  const previousDoc = await pulseRef.get();
  const previous = previousDoc.exists ? previousDoc.data() as PlayerPulseSnapshot : undefined;
  const sinceAway = deriveCurrentEpisodeDelta(previous?.currentEpisode, input.currentEpisode);
  const latestReviewPeriodEnd = input.latestDesk?.period.end;
  const sameReviewAsLastVisit = Boolean(previous && previous.latestReviewPeriodEnd === latestReviewPeriodEnd);
  const boardMoved = sameReviewAsLastVisit ? deriveBoardMovement(previous?.standings ?? [], currentStandings) : [];
  const proximity = v2Context?.projection ? v2Context.projection.standings.flatMap((standing) => {
    const scope = `${standing.categoryTitle}${standing.scopeLabel ? ` · ${standing.scopeLabel}` : ""}`;
    const cards = [];
    if (standing.nearestAbove) cards.push({ id: `in-reach:${standing.boardKey}:${standing.nearestAbove.player}`, kind: "in-reach" as const, eyebrow: "IN REACH", title: scope, body: `Current official positions: you #${standing.rank}; ${standing.nearestAbove.player} is immediately above.`, categoryId: standing.categoryId, pool: standing.scopeLabel, finality: "official" as const });
    if (standing.nearestBelow) cards.push({ id: `on-radar:${standing.boardKey}:${standing.nearestBelow.player}`, kind: "on-radar" as const, eyebrow: "ON YOUR RADAR", title: `${standing.nearestBelow.player} is close in ${scope}.`, body: `You are #${standing.rank}; ${standing.nearestBelow.player} is immediately below.`, categoryId: standing.categoryId, pool: standing.scopeLabel, finality: "official" as const });
    return cards;
  }).slice(0, 4) : deriveProximityCards(state.boards, participantId);
  let provisional: ReturnType<typeof deriveProvisionalCards> = [];
  if (input.currentEpisode && input.currentEpisode.games > 0) {
    const provisionalParticipant = currentEpisodeToProvisionalParticipant(input.account.chessCom.canonicalUsername, String(input.account.chessCom.playerId), input.currentEpisode);
    const withoutSelf = state.liveParticipants.filter((participant) => participant.stablePlayerId !== String(input.account.chessCom.playerId));
    const projectedBoards = buildActiveUniverseBoards([...withoutSelf, provisionalParticipant], foundingBetaField, state.liveParticipants);
    provisional = deriveProvisionalCards(projectedBoards, provisionalParticipant.id);
  }
  const previousSeenAt = previous?.viewedAt ? Date.parse(previous.viewedAt) : NaN;
  const fieldMoved = sameReviewAsLastVisit && Number.isFinite(previousSeenAt)
    ? state.recentEvents.filter((event) => event.playerId !== String(input.account.chessCom.playerId) && Date.parse(event.publishedAt) > previousSeenAt).slice(0, 5)
    : [];
  const snapshot: PlayerPulseSnapshot = { viewedAt: nowIso(now), latestReviewPeriodEnd, currentEpisode: input.currentEpisode, standings: currentStandings };
  await pulseRef.set(clean(snapshot));
  return { checkedAt: nowIso(now), sinceAway, boardMoved, reviewMovement, proximity, provisional, fieldMoved, justIn: state.recentEvents.slice(0, 8), whatsHot: state.whatsHot, groups: state.groups, standings, fieldLabels: [...new Set(state.boards.map((board) => board.fieldLabel))], officialPlayerCount: state.officialPlayerCount };
}
