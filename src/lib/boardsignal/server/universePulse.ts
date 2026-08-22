import "server-only";

import { createHash } from "node:crypto";
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
  type PulseUniverseBoard,
  type SafeShareMoment,
  type UniverseEventType,
} from "../pulse";
import { buildUniverseBoards, deskToUniverseParticipant, type UniverseParticipant } from "../universe";
import { foundingBetaField } from "../../../data/universeField";
import { getAdminDb } from "../../../utils/firebaseAdmin";

function clean<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function hashId(value: string) { return createHash("sha256").update(value).digest("hex"); }
function nowIso(now = new Date()) { return now.toISOString(); }
function stableLiveParticipantId(playerId: number | string) { return `live:${String(playerId)}`; }

export type ActiveUniverseState = {
  liveParticipants: UniverseParticipant[];
  boards: PulseUniverseBoard[];
  groups: ReturnType<typeof buildPulseUniverseGroups>;
  recentEvents: PublicUniverseEvent[];
  whatsHot: PublicUniverseEvent[];
  officialPlayerCount: number;
};

type ActiveDeskRecord = {
  uid: string;
  account: BoardSignalAccount;
  deskKey: string;
  periodEnd: string;
  reviewLifecycle: ReviewLifecycle;
  publishedAt?: string;
  importedAt?: string;
  desk?: BoardSignalDesk;
  originalBetaParticipant?: UniverseParticipant;
};

async function activeLiveDeskRecords(): Promise<ActiveDeskRecord[]> {
  const db = getAdminDb();
  const users = await db.collection("users").get();
  const active = users.docs
    .map((document) => document.data() as BoardSignalAccount)
    .filter((account) => account.role === "player" && account.accessTier === "founding_beta" && account.accessStatus === "active");

  const records: ActiveDeskRecord[] = [];
  for (const account of active) {
    const desks = await db.collection("users").doc(account.uid).collection("desks")
      .orderBy("periodEnd", "desc")
      .limit(4)
      .get();
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
        records.push({
          uid: account.uid,
          account,
          deskKey: String(data.deskKey ?? document.id),
          periodEnd: String(data.periodEnd ?? data.desk.period.end),
          reviewLifecycle: storedReviewLifecycle(data) ?? "organic_live",
          publishedAt: data.publishedAt,
          importedAt: data.importedAt,
          desk: data.desk,
        });
        continue;
      }
      const historical = data.originalBeta?.universeParticipant;
      if (!historical?.verified) continue;
      records.push({
        uid: account.uid,
        account,
        deskKey: String(data.deskKey ?? document.id),
        periodEnd: historical.periodEnd,
        reviewLifecycle: "original_beta",
        originalBetaParticipant: {
          ...historical,
          id: stableLiveParticipantId(account.chessCom.playerId),
          stablePlayerId: String(account.chessCom.playerId),
          aliases: [...new Set([...(historical.aliases ?? []), historical.player])],
          player: account.chessCom.canonicalUsername,
          source: "live",
          verified: true,
        },
      });
    }
  }
  return records;
}

function participantFromRecord(record: ActiveDeskRecord): UniverseParticipant | undefined {
  if (record.originalBetaParticipant) return record.originalBetaParticipant;
  if (!record.desk) return undefined;
  const participant = deskToUniverseParticipant(record.desk);
  if (!participant || participant.source !== "live") return undefined;
  const base: UniverseParticipant = {
    ...participant,
    id: stableLiveParticipantId(record.account.chessCom.playerId),
    stablePlayerId: String(record.account.chessCom.playerId),
    aliases: [...new Set([...(participant.aliases ?? []), participant.player, ...record.account.eligibleCoverageKeys.filter((key) => !/^\d+$/.test(key))])],
    player: record.account.chessCom.canonicalUsername,
  };
  if (record.reviewLifecycle === "historical_backfill") {
    const { coverage: _coverage, ...withoutCoverage } = base;
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

function seedsAsOf(cutoff: string) {
  return foundingBetaField.filter((participant) => participant.periodEnd <= cutoff);
}

function recordsAsOf(records: ActiveDeskRecord[], cutoff: string) {
  return records.filter((record) => record.periodEnd <= cutoff);
}

function canReconstructFieldAsOf(records: ActiveDeskRecord[], cutoff: string) {
  const byPlayer = new Map<string, ActiveDeskRecord[]>();
  for (const record of records) {
    const key = String(record.account.chessCom.playerId);
    byPlayer.set(key, [...(byPlayer.get(key) ?? []), record]);
  }
  for (const playerRecords of byPlayer.values()) {
    if (playerRecords.some((record) => record.periodEnd <= cutoff)) continue;
    const account = playerRecords[0]?.account;
    const disclosedDay = account?.universeParticipationDisclosedAt?.slice(0, 10);
    if (disclosedDay && disclosedDay > cutoff) continue;
    return false;
  }
  return true;
}

function boardsFromRecordsAsOf(records: ActiveDeskRecord[], cutoff: string) {
  if (!canReconstructFieldAsOf(records, cutoff)) return undefined;
  const participants = recordsAsOf(records, cutoff).flatMap((record) => {
    const participant = participantFromRecord(record);
    return participant ? [participant] : [];
  });
  const latest = latestUniverseParticipants(participants);
  return buildActiveUniverseBoards(latest, seedsAsOf(cutoff), latest);
}

function activeStateFromRecords(records: ActiveDeskRecord[], recentEvents: PublicUniverseEvent[], now: Date): ActiveUniverseState {
  const participants = records.flatMap((record) => {
    const participant = participantFromRecord(record);
    return participant ? [participant] : [];
  });
  const liveParticipants = latestUniverseParticipants(participants);
  const boards = buildActiveUniverseBoards(liveParticipants, foundingBetaField, liveParticipants);
  return {
    liveParticipants,
    boards,
    groups: buildPulseUniverseGroups(boards),
    recentEvents,
    whatsHot: rankWhatsHot(recentEvents, now),
    officialPlayerCount: liveParticipants.length,
  };
}

export async function listRecentUniverseEvents(limit = 80): Promise<PublicUniverseEvent[]> {
  const snapshot = await getAdminDb().collection("publicUniverseEvents").orderBy("publishedAt", "desc").limit(limit).get().catch(() => ({ docs: [] }));
  return snapshot.docs
    .map((document) => document.data() as PublicUniverseEvent)
    .filter((event) => event.safePublic === true && event.hidden !== true && event.finality === "official" && !publicArtifactHasPrivateFields(event));
}

export async function loadUniverseHomepageLead(): Promise<PublicUniverseEvent | undefined> {
  const snapshot = await getAdminDb().collection("publicUniverseEvents")
    .where("homepageLead", "==", true)
    .limit(1)
    .get();
  const event = snapshot.docs[0]?.data() as PublicUniverseEvent | undefined;
  if (!event || event.safePublic !== true || event.hidden === true || publicArtifactHasPrivateFields(event)) return undefined;
  return event;
}

export async function loadActiveUniverseState(now = new Date()): Promise<ActiveUniverseState> {
  const [records, recentEvents] = await Promise.all([activeLiveDeskRecords(), listRecentUniverseEvents()]);
  return activeStateFromRecords(records, recentEvents, now);
}

export async function writePublicUniverseEvent(event: PublicUniverseEvent) {
  if (!event.safePublic || publicArtifactHasPrivateFields(event)) {
    throw new Error("Unsafe data was blocked from the public Universe event store.");
  }
  await getAdminDb().collection("publicUniverseEvents").doc(event.eventId).set(clean(event), { merge: true });
  return event;
}

export async function recordNewPlayerUniverseIntro(account: BoardSignalAccount, now = new Date()) {
  if (!account.betaAgreementAcceptedAt || !account.universeParticipationDisclosedAt) return undefined;
  const eventId = hashId(`new-player:${account.chessCom.playerId}`);
  const existing = await getAdminDb().collection("publicUniverseEvents").doc(eventId).get();
  if (existing.exists) return existing.data() as PublicUniverseEvent;
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

async function pruneMundaneUniverseEvents(now = new Date()) {
  const cutoff = now.getTime() - PULSE_EVENT_RETENTION_MS;
  const snapshot = await getAdminDb().collection("publicUniverseEvents").orderBy("publishedAt", "asc").limit(120).get().catch(() => ({ docs: [] }));
  const stale = snapshot.docs.filter((document) => Date.parse(String(document.data().publishedAt ?? "")) < cutoff);
  if (!stale.length) return;
  const batch = getAdminDb().batch();
  stale.forEach((document) => batch.delete(document.ref));
  await batch.commit();
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
  deskCountAfter: number;
  reviewLifecycle?: ReviewLifecycle;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const afterState = await loadActiveUniverseState(now);
  if (input.reviewLifecycle === "historical_backfill") {
    return { events: [] as PublicUniverseEvent[], shareMoments: [] as SafeShareMoment[], afterState };
  }
  const participantId = stableLiveParticipantId(input.account.chessCom.playerId);

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
    const event: PublicUniverseEvent = {
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
    };
    events.push(event);
  }

  const officialStandings = standingsFromActiveBoards(afterState.boards, participantId);
  const shareMoments = nominateShareMoments(input.desk, officialStandings, now).map((moment) => ({ ...moment, deskKey: input.deskKey }));
  await upsertShareMoments(shareMoments);

  if (input.deskCountAfter === 1) {
    const strongest = shareMoments[0];
    events.unshift({
      eventId: hashId(`first-desk:${input.deskKey}`),
      eventType: "first_desk",
      playerId: String(input.account.chessCom.playerId),
      canonicalUsername: input.account.chessCom.canonicalUsername,
      avatar: input.account.chessCom.avatar,
      deskKey: input.deskKey,
      episodeKey: input.desk.episodeKey,
      occurredAt: input.desk.period.end,
      publishedAt: nowIso(now),
      headline: `First Review is in for ${input.account.chessCom.canonicalUsername}.`,
      supportingFact: strongest?.supportingFact ?? `${input.desk.games} games closed the first completed seven-day Review.`,
      dataMode: "live",
      finality: "official",
      safePublic: true,
    });

    const watch = officialStandings
      .filter((standing) => standing.rank >= 4 && standing.rank <= 5)
      .sort((a, b) => a.rank - b.rank || a.categoryTitle.localeCompare(b.categoryTitle))[0];
    if (watch) {
      events.push({
        eventId: hashId(`player-to-watch:${input.deskKey}:${watch.categoryId}:${watch.scopeLabel ?? "all"}`),
        eventType: "player_to_watch",
        playerId: String(input.account.chessCom.playerId),
        canonicalUsername: input.account.chessCom.canonicalUsername,
        avatar: input.account.chessCom.avatar,
        deskKey: input.deskKey,
        episodeKey: input.desk.episodeKey,
        pool: watch.scopeLabel?.toLowerCase() as PublicUniverseEvent["pool"],
        categoryId: watch.categoryId as PublicUniverseEvent["categoryId"],
        occurredAt: input.desk.period.end,
        publishedAt: nowIso(now),
        rankAfter: watch.rank,
        headline: `Player to watch: ${input.account.chessCom.canonicalUsername} opened at #${watch.rank} in ${watch.categoryTitle}${watch.scopeLabel ? ` · ${watch.scopeLabel}` : ""}.`,
        supportingFact: `${watch.valueLabel} placed the first completed Review #${watch.rank} of ${watch.denominator} in the current official field.`,
        dataMode: "live",
        finality: "official",
        safePublic: true,
      });
    }
  } else if (!events.length) {
    const strongest = shareMoments[0];
    const eventType = eventTypeForShareMoment(strongest);
    events.push({
      eventId: hashId(`desk-completed:${input.deskKey}:${eventType}`),
      eventType,
      playerId: String(input.account.chessCom.playerId),
      canonicalUsername: input.account.chessCom.canonicalUsername,
      avatar: input.account.chessCom.avatar,
      deskKey: input.deskKey,
      episodeKey: input.desk.episodeKey,
      pool: strongest?.pool,
      categoryId: strongest?.categoryId === "checkmate-finish" ? "moment-of-the-week" : strongest?.categoryId,
      occurredAt: input.desk.period.end,
      publishedAt: nowIso(now),
      headline: strongest ? `${input.account.chessCom.canonicalUsername}: ${strongest.headline}.` : `${input.account.chessCom.canonicalUsername} published a new BoardSignal Review.`,
      supportingFact: strongest?.supportingFact ?? `${input.desk.games} games closed the completed seven-day Review.`,
      dataMode: "live",
      finality: "official",
      safePublic: true,
    });
  }

  for (const event of events.slice(0, 3)) await writePublicUniverseEvent(event);
  await pruneMundaneUniverseEvents(now);
  return { events: events.slice(0, 3), shareMoments, afterState };
}

export async function ensureShareMomentsForActiveDesks(account: BoardSignalAccount, desks: Array<{ desk: BoardSignalDesk; summary: { deskKey: string } }>, state?: ActiveUniverseState) {
  if (!desks.length) return [];
  const active = state ?? await loadActiveUniverseState();
  const participantId = stableLiveParticipantId(account.chessCom.playerId);
  const standings = standingsFromActiveBoards(active.boards, participantId);
  const moments = desks.flatMap((bundle, index) => nominateShareMoments(bundle.desk, index === 0 ? standings : [], new Date())
    .map((moment) => ({ ...moment, deskKey: bundle.summary.deskKey })));
  await upsertShareMoments(moments);
  return moments;
}

export async function listPlayerShareMoments(playerId: number, activeDeskKeys?: string[]) {
  const snapshot = await getAdminDb().collection("publicShareMoments").where("playerId", "==", String(playerId)).get().catch(() => ({ docs: [] }));
  const active = activeDeskKeys ? new Set(activeDeskKeys) : undefined;
  return snapshot.docs
    .map((document) => document.data() as SafeShareMoment)
    .filter((moment) => moment.safePublic === true && !publicArtifactHasPrivateFields(moment))
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || a.id.localeCompare(b.id))
    .map((moment) => ({ ...moment, activeDesk: active ? active.has(moment.deskKey) : undefined }));
}

export async function loadPublicShareMoment(momentId: string): Promise<SafeShareMoment | undefined> {
  if (!/^[A-Za-z0-9_-]{3,220}$/.test(momentId)) return undefined;
  const snapshot = await getAdminDb().collection("publicShareMoments").doc(momentId).get();
  if (!snapshot.exists) return undefined;
  const moment = snapshot.data() as SafeShareMoment;
  if (moment.safePublic !== true || publicArtifactHasPrivateFields(moment)) return undefined;
  return moment;
}

function reviewMovementForPlayer(records: ActiveDeskRecord[], state: ActiveUniverseState, account: BoardSignalAccount, latestDesk?: BoardSignalDesk) {
  if (!latestDesk) return [];
  const playerId = String(account.chessCom.playerId);
  const playerRecords = records
    .filter((record) => String(record.account.chessCom.playerId) === playerId)
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || a.deskKey.localeCompare(b.deskKey));
  const currentRecord = playerRecords[0];
  const previousRecord = playerRecords[1];
  if (!currentRecord || !previousRecord || currentRecord.periodEnd !== latestDesk.period.end) return [];
  const previousBoards = boardsFromRecordsAsOf(records, previousRecord.periodEnd);
  if (!previousBoards) return [];
  const participantId = stableLiveParticipantId(playerId);
  const previousStandings = standingSnapshots(previousBoards, participantId);
  const currentStandings = standingSnapshots(state.boards, participantId);
  return deriveReviewMovement(previousStandings, currentStandings);
}

export async function buildPlayerPulse(input: {
  account: BoardSignalAccount;
  latestDesk?: BoardSignalDesk;
  currentEpisode?: CurrentEpisodeSummary;
  now?: Date;
}) : Promise<PlayerPulse | undefined> {
  const now = input.now ?? new Date();
  const [records, recentEvents] = await Promise.all([activeLiveDeskRecords(), listRecentUniverseEvents()]);
  const state = activeStateFromRecords(records, recentEvents, now);
  const participantId = stableLiveParticipantId(input.account.chessCom.playerId);
  const standings = standingsFromActiveBoards(state.boards, participantId);
  const currentStandings = standingSnapshots(state.boards, participantId);
  const reviewMovement = reviewMovementForPlayer(records, state, input.account, input.latestDesk);

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
    const provisionalParticipant = currentEpisodeToProvisionalParticipant(
      input.account.chessCom.canonicalUsername,
      String(input.account.chessCom.playerId),
      input.currentEpisode,
    );
    const withoutSelf = state.liveParticipants.filter((participant) => participant.stablePlayerId !== String(input.account.chessCom.playerId));
    const projectedParticipants = [...withoutSelf, provisionalParticipant];
    const projectedBoards = buildActiveUniverseBoards(
      projectedParticipants,
      foundingBetaField,
      state.liveParticipants,
    );
    provisional = deriveProvisionalCards(projectedBoards, provisionalParticipant.id);
  }

  const previousSeenAt = previous?.viewedAt ? Date.parse(previous.viewedAt) : NaN;
  const fieldMoved = sameReviewAsLastVisit && Number.isFinite(previousSeenAt)
    ? state.recentEvents.filter((event) => event.playerId !== String(input.account.chessCom.playerId) && Date.parse(event.publishedAt) > previousSeenAt).slice(0, 5)
    : [];

  const snapshot: PlayerPulseSnapshot = {
    viewedAt: nowIso(now),
    latestReviewPeriodEnd,
    currentEpisode: input.currentEpisode,
    standings: currentStandings,
  };
  await pulseRef.set(clean(snapshot));

  return {
    checkedAt: nowIso(now),
    sinceAway,
    boardMoved,
    reviewMovement,
    proximity,
    provisional,
    fieldMoved,
    justIn: state.recentEvents.slice(0, 8),
    whatsHot: state.whatsHot,
    groups: state.groups,
    standings,
    fieldLabels: [...new Set(state.boards.map((board) => board.fieldLabel))],
    officialPlayerCount: state.officialPlayerCount,
  };
}
