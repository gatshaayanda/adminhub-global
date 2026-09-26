import "server-only";
import type { BoardSignalAccount, BoardSignalCoachingPresentation, BoardSignalPlayerRoomEngagement, BoardSignalTrustpilotResolution, BoardSignalTrustpilotReviewInvitation } from "@/lib/boardsignal/account";
import { firestoreSafeCoachingState, presentCoachingForSession, presentationFromCoachingState } from "@/lib/boardsignal/coaching";
import { getAdminDb } from "@/utils/firebaseAdmin";
import { recordFounderCoachingPresentationProjection, recordFounderRoomEntryProjection, recordFounderSessionProjection } from "./founderEngagement";
import { validStoredCoachingState } from "./coaching";

const MAX_FOREGROUND_SECONDS = 6 * 60 * 60;
const FOUNDER_USERNAME = (process.env.BOARDSIGNAL_FOUNDER_CHESS_USERNAME ?? "ayandakopano").trim().toLowerCase();
type EngagementWithTotal = BoardSignalPlayerRoomEngagement & { totalForegroundEngagedSeconds?: number };
export type PlayerRoomTrustpilotPrompt = "first" | "final";

export class PlayerRoomEngagementError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "PlayerRoomEngagementError";
    this.code = code;
    this.status = status;
  }
}

function cleanSessionId(value: unknown) {
  const sessionId = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9:_-]{8,180}$/.test(sessionId)) throw new PlayerRoomEngagementError("PLAYER_ROOM_SESSION_INVALID", "That Player Room session is invalid.");
  return sessionId;
}

function cleanForegroundSeconds(value: unknown) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) throw new PlayerRoomEngagementError("PLAYER_ROOM_SUMMARY_INVALID", "That Player Room summary is invalid.");
  return Math.min(MAX_FOREGROUND_SECONDS, Math.round(seconds));
}

function cleanResolution(value: unknown): BoardSignalTrustpilotResolution {
  if (value === "reviewed" || value === "declined" || value === "not_yet") return value;
  throw new PlayerRoomEngagementError("TRUSTPILOT_RESOLUTION_INVALID", "Choose one of the available Trustpilot follow-up options.");
}

function currentVisitCount(value: unknown) {
  const parsed = Number(value);
  return !Number.isFinite(parsed) || parsed < 0 ? 0 : Math.floor(parsed);
}

function trustpilotCycleComplete(invitation?: BoardSignalTrustpilotReviewInvitation) {
  return Boolean(invitation?.automaticCycleCompletedAt || invitation?.resolution);
}

function isFounder(account: BoardSignalAccount) {
  return account.chessCom?.canonicalUsername?.trim().toLowerCase() === FOUNDER_USERNAME;
}

function promptFor(count: number, invitation: BoardSignalTrustpilotReviewInvitation | undefined, founder: boolean): PlayerRoomTrustpilotPrompt | null {
  if (founder || trustpilotCycleComplete(invitation)) return null;
  if (count === 3) return "first";
  if (count === 6) return "final";
  return null;
}

function resultFor(
  status: "recorded" | "duplicate",
  count: number,
  invitation: BoardSignalTrustpilotReviewInvitation | undefined,
  founder: boolean,
  coaching?: BoardSignalCoachingPresentation,
) {
  return {
    status,
    roomVisitCount: count,
    prompt: promptFor(count, invitation, founder),
    invitationConfirmed: Boolean(invitation?.confirmedAt),
    cycleComplete: trustpilotCycleComplete(invitation),
    coaching,
  };
}

export async function recordPlayerRoomEntry(uid: string, input: unknown) {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const sessionId = cleanSessionId(body.sessionId);
  const db = getAdminDb();
  const ref = db.collection("users").doc(uid);
  const outcome = await db.runTransaction(async (transaction: any) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new PlayerRoomEngagementError("PLAYER_ROOM_ACCOUNT_NOT_FOUND", "This BoardSignal account could not be found.", 404);
    const account = snapshot.data() as BoardSignalAccount;
    if (account.accessStatus !== "active") throw new PlayerRoomEngagementError("PLAYER_ROOM_ACCESS_INACTIVE", "This BoardSignal access is not active.", 403);
    const engagement = account.playerRoomEngagement;
    const invitation = account.trustpilotReviewInvitation;
    const count = currentVisitCount(engagement?.roomVisitCount);
    const founder = isFounder(account);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const storedCoaching = validStoredCoachingState(account.coachingState);
    const coachingPresentation = storedCoaching ? presentCoachingForSession(storedCoaching, sessionId, nowMs) : undefined;
    const persistedCoaching = coachingPresentation ? firestoreSafeCoachingState(coachingPresentation.state) : undefined;
    const coachingProjection = coachingPresentation?.automaticPresentation && persistedCoaching
      ? { source: "AUTO_RETURN" as const, variant: persistedCoaching.level, at: nowIso }
      : undefined;

    if (engagement?.lastCountedSessionId === sessionId) {
      if (persistedCoaching && coachingPresentation?.state !== storedCoaching) {
        transaction.set(ref, { coachingState: persistedCoaching }, { merge: true });
      }
      return {
        result: resultFor("duplicate", count, invitation, founder, persistedCoaching ? presentationFromCoachingState(persistedCoaching) : undefined),
        projection: undefined,
        coachingProjection,
      };
    }

    const nextCount = count + 1;
    const nextEngagement: BoardSignalPlayerRoomEngagement = {
      ...engagement,
      roomVisitCount: nextCount,
      firstRoomVisitAt: engagement?.firstRoomVisitAt ?? nowIso,
      latestRoomVisitAt: nowIso,
      lastActiveAt: nowIso,
      lastCountedSessionId: sessionId,
      latestSessionEnteredAt: nowIso,
    };
    let nextInvitation = invitation;
    const prompt = promptFor(nextCount, invitation, founder);
    if (prompt === "first" && !invitation?.firstAskShownAt) nextInvitation = { ...invitation, firstAskShownAt: nowIso };
    if (prompt === "final" && !invitation?.finalAskShownAt) nextInvitation = { ...invitation, finalAskShownAt: nowIso };
    const write: Record<string, unknown> = { playerRoomEngagement: nextEngagement };
    if (nextInvitation !== invitation) write.trustpilotReviewInvitation = nextInvitation;
    if (persistedCoaching) write.coachingState = persistedCoaching;
    transaction.set(ref, write, { merge: true });
    return {
      result: resultFor("recorded", nextCount, nextInvitation, founder, persistedCoaching ? presentationFromCoachingState(persistedCoaching) : undefined),
      projection: { account, previousVisitCount: count, nextVisitCount: nextCount, accessProvider: body.accessProvider, at: nowIso },
      coachingProjection,
    };
  });
  if (outcome.projection) await recordFounderRoomEntryProjection(outcome.projection).catch(() => undefined);
  if (outcome.coachingProjection) await recordFounderCoachingPresentationProjection({ uid, ...outcome.coachingProjection }).catch(() => undefined);
  return outcome.result;
}

export async function recordPlayerRoomSummary(uid: string, input: unknown) {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const sessionId = cleanSessionId(body.sessionId);
  const foregroundEngagedSeconds = cleanForegroundSeconds(body.foregroundEngagedSeconds);
  const db = getAdminDb();
  const ref = db.collection("users").doc(uid);
  const outcome = await db.runTransaction(async (transaction: any) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return { result: { status: "ignored" as const } };
    const account = snapshot.data() as BoardSignalAccount;
    if (account.accessStatus !== "active") return { result: { status: "ignored" as const } };
    const engagement = account.playerRoomEngagement as EngagementWithTotal | undefined;
    if (!engagement || engagement.lastCountedSessionId !== sessionId) return { result: { status: "stale" as const } };
    if (engagement.latestSummarySessionId === sessionId) return { result: { status: "duplicate" as const } };
    const endedAt = new Date().toISOString();
    const next: EngagementWithTotal = {
      ...engagement,
      latestSummarySessionId: sessionId,
      latestSessionEndedAt: endedAt,
      lastActiveAt: endedAt,
      latestSessionForegroundEngagedSeconds: foregroundEngagedSeconds,
      totalForegroundEngagedSeconds: currentVisitCount(engagement.totalForegroundEngagedSeconds) + foregroundEngagedSeconds,
    };
    transaction.set(ref, { playerRoomEngagement: next }, { merge: true });
    return { result: { status: "recorded" as const }, projection: { foregroundEngagedSeconds, at: endedAt } };
  });
  if (outcome.projection) await recordFounderSessionProjection(outcome.projection).catch(() => undefined);
  return outcome.result;
}

export async function resolveTrustpilotFollowUp(uid: string, input: unknown) {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const resolution = cleanResolution(body.resolution);
  const db = getAdminDb();
  const ref = db.collection("users").doc(uid);
  return db.runTransaction(async (transaction: any) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new PlayerRoomEngagementError("PLAYER_ROOM_ACCOUNT_NOT_FOUND", "This BoardSignal account could not be found.", 404);
    const account = snapshot.data() as BoardSignalAccount;
    if (account.accessStatus !== "active") throw new PlayerRoomEngagementError("PLAYER_ROOM_ACCESS_INACTIVE", "This BoardSignal access is not active.", 403);
    if (isFounder(account)) throw new PlayerRoomEngagementError("TRUSTPILOT_FOUNDER_EXCLUDED", "Founder activity is excluded from automated Trustpilot asks.", 403);
    if (currentVisitCount(account.playerRoomEngagement?.roomVisitCount) < 6) throw new PlayerRoomEngagementError("TRUSTPILOT_FOLLOW_UP_TOO_EARLY", "The final Trustpilot follow-up is not available yet.", 409);
    const invitation = account.trustpilotReviewInvitation;
    if (trustpilotCycleComplete(invitation)) return { status: "already_resolved" as const, resolution: invitation?.resolution, invitationConfirmed: Boolean(invitation?.confirmedAt) };
    const nowIso = new Date().toISOString();
    const next: BoardSignalTrustpilotReviewInvitation = { ...invitation, resolution, resolvedAt: nowIso, automaticCycleCompletedAt: nowIso };
    transaction.set(ref, { trustpilotReviewInvitation: next }, { merge: true });
    return { status: "resolved" as const, resolution, invitationConfirmed: Boolean(next.confirmedAt) };
  });
}
