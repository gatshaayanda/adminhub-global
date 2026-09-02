import "server-only";

import { randomUUID } from "node:crypto";
import type { UserRecord } from "firebase-admin/auth";
import type { Message } from "firebase-admin/messaging";
import {
  BOARDSIGNAL_LIVE_RECOVERY_BODY,
  BOARDSIGNAL_LIVE_RECOVERY_CLAIM,
  BOARDSIGNAL_LIVE_RECOVERY_LINK,
  BOARDSIGNAL_LIVE_RECOVERY_TITLE,
  BOARDSIGNAL_LIVE_RECOVERY_TYPE,
  BOARDSIGNAL_LIVE_RECOVERY_WEBPUSH_TOPIC,
  liveRecoveryClaim,
  liveRecoveryClaimedClaim,
  liveRecoveryClaimIsOwned,
  liveRecoveryClaimIsRequested,
  liveRecoveryCompletedClaim,
  liveRecoveryCronAdmission,
  liveRecoveryIncidentForRequest,
  liveRecoveryRequestedClaim,
  liveRecoveryTopicFor,
  priorLiveRecoveryIncidents,
} from "../liveRecovery";
import { getAdminAuth, getAdminMessaging, isFirebaseAdminConfigured } from "../../../utils/firebaseAdmin";

const FCM_BATCH_LIMIT = 500;
const CLAIM_STABILIZATION_MS = 750;

type DueUser = { uid: string };
type ClaimedUser = { uid: string; claimId: string; claimedAt: string };
type RecoverySendResult = { due: boolean; incident?: string; requested: number; claimed: number; sent: number; failed: number };

const inFlightIncidentRuns = new Map<string, Promise<RecoverySendResult>>();

function recoverySecret() {
  return process.env.CRON_SECRET?.trim() ?? "";
}

export function boardSignalLiveRecoveryConfigured() {
  return Boolean(recoverySecret() && isFirebaseAdminConfigured() && process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim());
}

function requireConfigured() {
  const secret = recoverySecret();
  if (!secret || !isFirebaseAdminConfigured() || !process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim()) {
    throw Object.assign(new Error("BoardSignal recovery reminders are not configured right now."), { status: 503, code: "LIVE_RECOVERY_UNAVAILABLE" });
  }
  return secret;
}

function validatedFcmToken(input: unknown) {
  const token = String(input ?? "").trim();
  if (token.length < 20 || token.length > 4096 || /\s/.test(token)) {
    throw Object.assign(new Error("This browser did not provide a valid recovery notification token."), { status: 400, code: "LIVE_RECOVERY_TOKEN_INVALID" });
  }
  return token;
}

function claimsWithoutRecovery(user: UserRecord) {
  const claims = { ...(user.customClaims ?? {}) } as Record<string, unknown>;
  delete claims[BOARDSIGNAL_LIVE_RECOVERY_CLAIM];
  return claims;
}

function claimsWithRecovery(user: UserRecord, claim: ReturnType<typeof liveRecoveryRequestedClaim>) {
  return { ...(user.customClaims ?? {}), [BOARDSIGNAL_LIVE_RECOVERY_CLAIM]: claim };
}

async function cleanupOldTopics(uid: string, fcmToken: string, incident: string, secret: string) {
  await Promise.all(priorLiveRecoveryIncidents(incident).map(async (oldIncident) => {
    const topic = liveRecoveryTopicFor(uid, oldIncident, secret);
    await getAdminMessaging().unsubscribeFromTopic([fcmToken], topic).catch(() => undefined);
  }));
}

export async function registerBoardSignalLiveRecovery(uid: string, fcmTokenInput: unknown, now = new Date()) {
  const secret = requireConfigured();
  const fcmToken = validatedFcmToken(fcmTokenInput);
  const auth = getAdminAuth();
  const user = await auth.getUser(uid);
  if (user.disabled) throw Object.assign(new Error("This BoardSignal session is no longer active."), { status: 403, code: "LIVE_RECOVERY_ACCOUNT_DISABLED" });
  const incident = liveRecoveryIncidentForRequest(now);
  const topic = liveRecoveryTopicFor(uid, incident.incident, secret);
  await getAdminMessaging().subscribeToTopic([fcmToken], topic);
  try {
    const existing = liveRecoveryClaim(user.customClaims?.[BOARDSIGNAL_LIVE_RECOVERY_CLAIM]);
    if (existing?.incident !== incident.incident || existing.state === "requested") {
      await auth.setCustomUserClaims(uid, claimsWithRecovery(user, liveRecoveryRequestedClaim(incident.incident, now.toISOString())));
    }
  } catch (error) {
    await getAdminMessaging().unsubscribeFromTopic([fcmToken], topic).catch(() => undefined);
    throw error;
  }
  await cleanupOldTopics(uid, fcmToken, incident.incident, secret);
  return { incident: incident.incident, reopensAt: incident.reopensAt };
}

export async function cancelBoardSignalLiveRecovery(uid: string, fcmTokenInput?: unknown) {
  const secret = requireConfigured();
  const fcmToken = typeof fcmTokenInput === "string" && fcmTokenInput.trim() ? validatedFcmToken(fcmTokenInput) : undefined;
  const auth = getAdminAuth();
  const user = await auth.getUser(uid);
  const claim = liveRecoveryClaim(user.customClaims?.[BOARDSIGNAL_LIVE_RECOVERY_CLAIM]);
  if (claim && fcmToken) {
    const topic = liveRecoveryTopicFor(uid, claim.incident, secret);
    await getAdminMessaging().unsubscribeFromTopic([fcmToken], topic).catch(() => undefined);
    await cleanupOldTopics(uid, fcmToken, claim.incident, secret);
  }
  await auth.setCustomUserClaims(uid, claimsWithoutRecovery(user));
  return { removed: true };
}

async function dueUsers(incident: string) {
  const auth = getAdminAuth();
  const found: DueUser[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      if (user.disabled || !liveRecoveryClaimIsRequested(user.customClaims?.[BOARDSIGNAL_LIVE_RECOVERY_CLAIM], incident)) continue;
      found.push({ uid: user.uid });
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return found;
}

async function claimUserForDelivery(user: DueUser, incident: string): Promise<ClaimedUser | undefined> {
  const auth = getAdminAuth();
  // Firebase Auth custom claims do not expose compare-and-set. Re-read directly
  // before claiming, then verify unique ownership twice before any FCM send.
  // A missed reminder is preferable to sending twice, so a claimed marker is
  // never returned to REQUESTED even when delivery later fails.
  const fresh = await auth.getUser(user.uid);
  if (fresh.disabled || !liveRecoveryClaimIsRequested(fresh.customClaims?.[BOARDSIGNAL_LIVE_RECOVERY_CLAIM], incident)) return undefined;
  const claimId = randomUUID();
  const claimedAt = new Date().toISOString();
  await auth.setCustomUserClaims(user.uid, claimsWithRecovery(fresh, liveRecoveryClaimedClaim(incident, claimId, claimedAt)));
  return { uid: user.uid, claimId, claimedAt };
}

async function verifyClaimOwners(candidates: ClaimedUser[], incident: string) {
  const auth = getAdminAuth();
  const checked = await Promise.all(candidates.map(async (candidate) => {
    const fresh = await auth.getUser(candidate.uid);
    return !fresh.disabled && liveRecoveryClaimIsOwned(fresh.customClaims?.[BOARDSIGNAL_LIVE_RECOVERY_CLAIM], incident, candidate.claimId) ? candidate : undefined;
  }));
  return checked.filter((candidate): candidate is ClaimedUser => Boolean(candidate));
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function claimDueUsers(users: DueUser[], incident: string) {
  const claimed = (await Promise.all(users.map((user) => claimUserForDelivery(user, incident))))
    .filter((user): user is ClaimedUser => Boolean(user));
  if (!claimed.length) return claimed;

  // Two quiet-period ownership reads make overlapping stateless workers converge
  // on the final Auth claim owner before delivery. Same-instance overlap is also
  // coalesced by inFlightIncidentRuns below. There is no Firestore lock or token
  // persistence in this outage path.
  await sleep(CLAIM_STABILIZATION_MS);
  const firstPass = await verifyClaimOwners(claimed, incident);
  if (!firstPass.length) return firstPass;
  await sleep(CLAIM_STABILIZATION_MS);
  return verifyClaimOwners(firstPass, incident);
}

function recoveryMessage(uid: string, incident: string, secret: string): Message {
  return {
    topic: liveRecoveryTopicFor(uid, incident, secret),
    notification: { title: BOARDSIGNAL_LIVE_RECOVERY_TITLE, body: BOARDSIGNAL_LIVE_RECOVERY_BODY },
    data: { type: BOARDSIGNAL_LIVE_RECOVERY_TYPE, link: BOARDSIGNAL_LIVE_RECOVERY_LINK, incident },
    webpush: {
      headers: { TTL: "3600", Urgency: "normal", Topic: BOARDSIGNAL_LIVE_RECOVERY_WEBPUSH_TOPIC },
      fcmOptions: { link: BOARDSIGNAL_LIVE_RECOVERY_LINK },
    },
  };
}

async function finalizeClaim(user: ClaimedUser, incident: string, outcome: "sent" | "failed") {
  const auth = getAdminAuth();
  const fresh = await auth.getUser(user.uid);
  if (fresh.disabled || !liveRecoveryClaimIsOwned(fresh.customClaims?.[BOARDSIGNAL_LIVE_RECOVERY_CLAIM], incident, user.claimId)) return;
  const completed = liveRecoveryCompletedClaim(incident, user.claimId, user.claimedAt, new Date().toISOString(), outcome);
  await auth.setCustomUserClaims(user.uid, claimsWithRecovery(fresh, completed));
}

async function runBoardSignalLiveRecoveryDelivery(due: NonNullable<ReturnType<typeof liveRecoveryCronAdmission>>, secret: string): Promise<RecoverySendResult> {
  const users = await dueUsers(due.incident);
  if (!users.length) return { due: true, incident: due.incident, requested: 0, claimed: 0, sent: 0, failed: 0 };

  // REQUESTED -> CLAIMED happens for every candidate before FCM. Neither a send
  // failure nor a completion-write failure restores REQUESTED, preserving the
  // explicit at-most-once policy for this optional service-recovery reminder.
  const claimed = await claimDueUsers(users, due.incident);
  if (!claimed.length) return { due: true, incident: due.incident, requested: users.length, claimed: 0, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  for (let offset = 0; offset < claimed.length; offset += FCM_BATCH_LIMIT) {
    const batchUsers = claimed.slice(offset, offset + FCM_BATCH_LIMIT);
    const result = await getAdminMessaging().sendEach(batchUsers.map((user) => recoveryMessage(user.uid, due.incident, secret)));
    for (let index = 0; index < result.responses.length; index += 1) {
      const user = batchUsers[index];
      if (!result.responses[index]?.success) {
        failed += 1;
        await finalizeClaim(user, due.incident, "failed").catch(() => undefined);
        continue;
      }
      sent += 1;
      await finalizeClaim(user, due.incident, "sent").catch(() => undefined);
    }
  }
  return { due: true, incident: due.incident, requested: users.length, claimed: claimed.length, sent, failed };
}

export async function sendBoardSignalLiveRecoveryIfDue(scheduleHeader: string | null | undefined, now = new Date()): Promise<RecoverySendResult> {
  const secret = requireConfigured();
  const due = liveRecoveryCronAdmission(scheduleHeader, now);
  if (!due) return { due: false, requested: 0, claimed: 0, sent: 0, failed: 0 };

  const key = `${due.incident}:${String(scheduleHeader)}`;
  const existing = inFlightIncidentRuns.get(key);
  if (existing) return existing;

  const work = runBoardSignalLiveRecoveryDelivery(due, secret);
  inFlightIncidentRuns.set(key, work);
  try {
    return await work;
  } finally {
    if (inFlightIncidentRuns.get(key) === work) inFlightIncidentRuns.delete(key);
  }
}
