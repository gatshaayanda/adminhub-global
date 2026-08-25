import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { BoardSignalAccount } from "../account";
import type { CurrentEpisodeSummary } from "../memory";
import type { BoardSignalDesk } from "../types";
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
  version: typeof MATERIALIZED_UNIVERSE_VERSION;
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

export async function loadActiveUniverseState(now = new Date()): Promise<ActiveUniverseState> {
  assertFirestoreCircuitClosed("materialized_universe_read");
  const started = Date.now();
  try {
    const snapshot = await stateRef().get();
    const state = snapshot.exists ? validateMaterializedState(snapshot.data()) : undefined;
    if (state?.bootstrapComplete === true) {
      logFirestoreReadBudget({ operation: "materialized_universe_read", durationMs: Date.now() - started, materialized: "hit", resultSize: state.officialPlayerCount, approxDocumentReads: 1 });
      return state;
    }
    const bootstrapped = await bootstrapMaterializedUniverse(now);
    if (bootstrapped) return bootstrapped;
    throw Object.assign(new Error("The live BoardSignal field is being prepared. Try again shortly."), { status: 503, code: "BOARDSIGNAL_UNIVERSE_BOOTSTRAPPING", retryAfterSeconds: 5 });
  } catch (error) {
    const failure = classifyFirestoreServiceError(error);
    if (failure) noteFirestoreServiceFailure(error);
    logFirestoreReadBudget({ operation: "materialized_universe_read", durationMs: Date.now() - started, materialized: "miss", approxDocumentReads: 1, failure: failure?.kind });
    throw error;
  }
}

export async function rebuildMaterializedUniverseState(now = new Date(), excludePlayerId?: string): Promise<ActiveUniverseState> {
  assertFirestoreCircuitClosed("universe_rebuild");
  const started = Date.now();
  try {
    const db = getAdminDb();
    const [participantsSnapshot, previousSnapshot] = await Promise.all([
      db.collection("publicUniverseParticipants").get(),
      stateRef().get(),
    ]);
    const participantDocs = participantsSnapshot.docs
      .map((document) => document.data() as MaterializedUniverseParticipant)
      .filter((document) => document.version === MATERIALIZED_UNIVERSE_VERSION && document.participant?.verified === true && !publicArtifactHasPrivateFields(document));
    const participants = participantDocs.map((document) => document.participant);
    const previous = previousSnapshot.exists ? validateMaterializedState(previousSnapshot.data()) : undefined;
    const previousEvents = (previous?.recentEvents ?? []).filter((event) => !excludePlayerId || event.playerId !== excludePlayerId);
    const state = materializedStateFromParticipants(participants, previousEvents, now, (previous?.revision ?? 0) + 1, previous?.bootstrapComplete === true);
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
  const currentSnapshot = await stateRef().get();
  const current = currentSnapshot.exists ? validateMaterializedState(currentSnapshot.data()) : undefined;
  if (current?.bootstrapComplete !== true) {
    const bootstrapped = await bootstrapMaterializedUniverse(now);
    if (bootstrapped) return bootstrapped;
    throw Object.assign(new Error("The live BoardSignal field is being prepared. Try again shortly."), { status: 503, code: "BOARDSIGNAL_UNIVERSE_BOOTSTRAPPING", retryAfterSeconds: 5 });
  }
  return rebuildMaterializedUniverseState(now);
}

export async function removeMaterializedUniverseParticipant(playerId: number | string, now = new Date()) {
  const ref = materializedParticipantRef(playerId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return loadActiveUniverseState(now).catch(() => undefined);
  await ref.delete();
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
  const standings = standingsFromActiveBoards(state.boards, participantId);
  const currentStandings = standingSnapshots(state.boards, participantId);
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
  const proximity = deriveProximityCards(state.boards, participantId);
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
