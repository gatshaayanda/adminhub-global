import "server-only";

import { createHash } from "node:crypto";
import type { BoardSignalAccount, BoardSignalContactMethod, StableChessComIdentity } from "../account";
import { defaultNotificationPreferences } from "../account";
import type { BoardSignalBetaPreview } from "../activation";
import { isValidBoardSignalEmail } from "../delivery";
import { resolveChessComPlayer } from "../processor";
import type { PublicUniverseEvent } from "../pulse";
import type { DocumentReference } from "firebase-admin/firestore";
import { getAdminDb } from "../../../utils/firebaseAdmin";
import {
  betaMagicAccessCredential,
  buildSafeBetaPreview,
  createBetaPreviewStatusCredential,
  notifyFounderOfBetaRequest,
} from "./activation";
import { createFoundingBetaAccess, resetFoundingBetaAccess } from "./betaAccess";
import { ensureStablePlayerAccount } from "./persistence";
import { getBoardSignalDeliveryStatus } from "./delivery";
import { sendBoardSignalEmail } from "./email";
import { writePublicUniverseEvent } from "./universePulse";

export type BetaRequestStatus = "pending" | "approved" | "rejected";

export type FoundingBetaRequest = {
  id: string;
  chessPlayerId: number;
  canonicalUsername: string;
  avatar?: string;
  profileUrl?: string;
  preferredContactMethod: BoardSignalContactMethod;
  preferredContactValue: string;
  betaContactConsent: true;
  requestedAt: string;
  status: BetaRequestStatus;
  decidedAt?: string;
  source?: "boardSignalShare";
  shareMomentId?: string;
  statusTokenHash: string;
  previewSnapshot?: BoardSignalBetaPreview;
  previewGeneratedAt?: string;
  previewError?: string;
  firebaseUid?: string;
  claimedAt?: string;
  previewClaimConsumedAt?: string;
  magicAccess?: {
    ticketHash: string;
    expiresAt: string;
    createdAt: string;
    requestId: string;
    playerId: number;
    uid: string;
    consumedAt?: string;
  };
  accessEmailDelivery?: "delivered" | "failed" | "not_eligible" | "not_configured";
  founderAlertSentAt?: string;
};

export type BetaRequestSubmission = {
  request: FoundingBetaRequest;
  statusToken?: string;
  preview?: BoardSignalBetaPreview;
  previewError?: string;
  existingState?: "active_account" | "pending" | "approved_unclaimed";
};

const CONTACT_METHODS = new Set<BoardSignalContactMethod>(["email", "discord", "telegram"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function identityFromResolved(resolved: Awaited<ReturnType<typeof resolveChessComPlayer>>): StableChessComIdentity {
  if (!Number.isSafeInteger(resolved.playerId) || !resolved.playerId) {
    throw Object.assign(new Error("Chess.com did not return the stable player ID BoardSignal requires."), { status: 422 });
  }
  return { playerId: resolved.playerId, canonicalUsername: resolved.username, avatar: resolved.avatar, profileUrl: resolved.profileUrl };
}

function validateContact(methodValue: unknown, contactValue: unknown, consentValue: unknown) {
  const method = String(methodValue ?? "").toLowerCase() as BoardSignalContactMethod;
  const value = String(contactValue ?? "").trim();
  if (!CONTACT_METHODS.has(method)) throw Object.assign(new Error("Choose Email, Discord or Telegram."), { status: 400 });
  if (consentValue !== true) throw Object.assign(new Error("Contact consent is required for a Founding Beta request."), { status: 400 });
  if (value.length < 2 || value.length > 160) throw Object.assign(new Error("Enter one reachable contact value."), { status: 400 });
  if (method === "email" && !EMAIL_PATTERN.test(value)) throw Object.assign(new Error("Enter a valid email address."), { status: 400 });
  return { method, value };
}

function clientKey(request: Request) {
  const raw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
  return createHash("sha256").update(raw).digest("hex").slice(0, 40);
}

async function enforceRequestRateLimit(request: Request, now = new Date()) {
  const db = getAdminDb();
  const bucket = now.toISOString().slice(0, 10);
  const ref = db.collection("betaRequestRateLimits").doc(`${bucket}_${clientKey(request)}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = Number(snapshot.data()?.count ?? 0);
    if (count >= 5) throw Object.assign(new Error("Too many Founding Beta requests were submitted from this connection today. Try again later."), { status: 429 });
    transaction.set(ref, { count: count + 1, bucket, updatedAt: now.toISOString() }, { merge: true });
  });
}

function contactsMatch(existing: FoundingBetaRequest, method: BoardSignalContactMethod, value: string) {
  return existing.preferredContactMethod === method && existing.preferredContactValue.trim().toLowerCase() === value.trim().toLowerCase();
}

async function existingStableAccount(identity: StableChessComIdentity) {
  const db = getAdminDb();
  const map = await db.collection("chessPlayerAccounts").doc(String(identity.playerId)).get();
  const uid = typeof map.data()?.uid === "string" ? String(map.data()!.uid) : `chesscom_${identity.playerId}`;
  const user = await db.collection("users").doc(uid).get();
  return user.exists ? user.data() as BoardSignalAccount : undefined;
}

async function generateAndStorePreview(ref: DocumentReference, identity: StableChessComIdentity) {
  try {
    const preview = await buildSafeBetaPreview(identity);
    await ref.set(clean({ previewSnapshot: preview, previewGeneratedAt: preview.generatedAt, previewError: null }), { merge: true });
    return { preview };
  } catch (error) {
    const previewError = error instanceof Error ? error.message : "Chess.com did not return the preview yet.";
    await ref.set({ previewError, previewGeneratedAt: new Date().toISOString() }, { merge: true });
    return { previewError };
  }
}

export async function submitFoundingBetaRequest(input: {
  request: Request;
  username: unknown;
  preferredContactMethod: unknown;
  preferredContactValue: unknown;
  betaContactConsent: unknown;
  source?: unknown;
  shareMomentId?: unknown;
}): Promise<BetaRequestSubmission> {
  await enforceRequestRateLimit(input.request);
  const requestedUsername = String(input.username ?? "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_-]{2,50}$/.test(requestedUsername)) throw Object.assign(new Error("Enter a valid Chess.com username."), { status: 400 });
  const contact = validateContact(input.preferredContactMethod, input.preferredContactValue, input.betaContactConsent);
  const identity = identityFromResolved(await resolveChessComPlayer(requestedUsername));
  const db = getAdminDb();
  const id = String(identity.playerId);
  const ref = db.collection("betaRequests").doc(id);
  const existingAccount = await existingStableAccount(identity);
  if (existingAccount?.accessStatus === "active") {
    return {
      request: {
        id,
        chessPlayerId: identity.playerId,
        canonicalUsername: identity.canonicalUsername,
        avatar: identity.avatar,
        profileUrl: identity.profileUrl,
        preferredContactMethod: contact.method,
        preferredContactValue: contact.value,
        betaContactConsent: true,
        requestedAt: existingAccount.lastSeenAt ?? new Date().toISOString(),
        status: "approved",
        statusTokenHash: "",
        firebaseUid: existingAccount.uid,
      },
      existingState: "active_account",
    };
  }

  const previousSnapshot = await ref.get();
  const previous = previousSnapshot.exists ? previousSnapshot.data() as FoundingBetaRequest : undefined;
  if (previous && ["pending", "approved"].includes(previous.status)) {
    if (!contactsMatch(previous, contact.method, contact.value)) {
      throw Object.assign(new Error("BoardSignal already has an access request for this player. Use the original preview link or contact Ayanda if you need recovery."), { status: 409, code: "BETA_REQUEST_EXISTS" });
    }
    let preview = previous.previewSnapshot;
    let previewError = previous.previewError;
    if (!preview) {
      const generated = await generateAndStorePreview(ref, identity);
      preview = generated.preview;
      previewError = generated.previewError;
    }
    // Never issue a new claim-capable status credential from username + contact knowledge alone.
    // The original opaque credential remains the possession factor for an open Preview tab;
    // otherwise access recovery goes through the configured delivery/founder path.
    return {
      request: { ...previous, previewSnapshot: preview, previewError },
      preview,
      previewError,
      existingState: previous.status === "pending" ? "pending" : "approved_unclaimed",
    };
  }

  const now = new Date().toISOString();
  const source = input.source === "boardSignalShare" ? "boardSignalShare" as const : undefined;
  const shareMomentId = source && /^[A-Za-z0-9_-]{3,220}$/.test(String(input.shareMomentId ?? "")) ? String(input.shareMomentId) : undefined;
  const credential = createBetaPreviewStatusCredential();
  const record: FoundingBetaRequest = {
    id,
    chessPlayerId: identity.playerId,
    canonicalUsername: identity.canonicalUsername,
    avatar: identity.avatar,
    profileUrl: identity.profileUrl,
    preferredContactMethod: contact.method,
    preferredContactValue: contact.value,
    betaContactConsent: true,
    requestedAt: now,
    status: "pending",
    source,
    shareMomentId,
    statusTokenHash: credential.hash,
  };
  await ref.set(clean(record));
  const generated = await generateAndStorePreview(ref, identity);
  const founderAlert = await notifyFounderOfBetaRequest({ requestId: id, canonicalUsername: identity.canonicalUsername, previewReady: Boolean(generated.preview) }).catch(() => ({ delivered: 0, failed: 1, eligible: false }));
  if (founderAlert.delivered > 0) await ref.set({ founderAlertSentAt: new Date().toISOString() }, { merge: true }).catch(() => undefined);
  const finalRecord = { ...record, previewSnapshot: generated.preview, previewGeneratedAt: generated.preview?.generatedAt, previewError: generated.previewError };
  return { request: finalRecord, statusToken: credential.token, preview: generated.preview, previewError: generated.previewError };
}

export async function retryFoundingBetaPreview(requestId: string) {
  const ref = getAdminDb().collection("betaRequests").doc(requestId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw Object.assign(new Error("The Founding Beta request was not found."), { status: 404 });
  const request = snapshot.data() as FoundingBetaRequest;
  const identity: StableChessComIdentity = { playerId: request.chessPlayerId, canonicalUsername: request.canonicalUsername, avatar: request.avatar, profileUrl: request.profileUrl };
  return generateAndStorePreview(ref, identity);
}

export async function listFoundingBetaRequests(status?: BetaRequestStatus) {
  const snapshot = await getAdminDb().collection("betaRequests").get();
  return snapshot.docs.map((document) => document.data() as FoundingBetaRequest).filter((request) => !status || request.status === status).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

function newPlayerUniverseEvent(request: FoundingBetaRequest, decidedAt: string): PublicUniverseEvent {
  return {
    eventId: createHash("sha256").update(`new-player:${request.chessPlayerId}`).digest("hex"),
    eventType: "new_player",
    playerId: String(request.chessPlayerId),
    canonicalUsername: request.canonicalUsername,
    avatar: request.avatar,
    occurredAt: decidedAt,
    publishedAt: decidedAt,
    headline: `${request.canonicalUsername} has entered the BoardSignal Universe.`,
    supportingFact: "First Desk forming.",
    dataMode: "live",
    finality: "official",
    safePublic: true,
  };
}

function accessMessage(username: string, link: string) {
  return `Your BoardSignal is ready — open your private Player Room here:\n${link}`;
}

export async function approveFoundingBetaRequest(requestId: string) {
  const db = getAdminDb();
  const ref = db.collection("betaRequests").doc(requestId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw Object.assign(new Error("The Founding Beta request was not found."), { status: 404 });
  const request = snapshot.data() as FoundingBetaRequest;
  if (request.status !== "pending") throw Object.assign(new Error(`This request is already ${request.status}.`), { status: 409 });

  // Approval reuses the stable Chess.com identity already verified at request time.
  // Do not make a second username lookup the authority for account ownership.
  const identity: StableChessComIdentity = {
    playerId: request.chessPlayerId,
    canonicalUsername: request.canonicalUsername,
    avatar: request.avatar,
    profileUrl: request.profileUrl,
  };
  const stableAccount = await ensureStablePlayerAccount(identity);
  if (stableAccount.uid !== `chesscom_${request.chessPlayerId}` || stableAccount.chessCom.playerId !== request.chessPlayerId) {
    throw Object.assign(new Error("The Founding Beta request no longer matches its stable BoardSignal identity."), { status: 409, code: "BETA_IDENTITY_MISMATCH" });
  }

  let result: { account?: BoardSignalAccount; accessCode: string };
  let newlyCreatedAccess = true;
  try {
    result = await createFoundingBetaAccess(request.canonicalUsername);
  } catch (error) {
    if (String((error as { code?: string }).code) !== "BETA_ACCESS_EXISTS") throw error;
    newlyCreatedAccess = false;
    result = await resetFoundingBetaAccess(request.chessPlayerId);
  }
  if (!result.account) throw Object.assign(new Error("The existing Founding Beta identity could not be loaded."), { status: 409 });
  const account = result.account;
  if (account.uid !== stableAccount.uid || account.uid !== `chesscom_${request.chessPlayerId}` || account.chessCom.playerId !== request.chessPlayerId) {
    throw Object.assign(new Error("The Founding Beta Access result no longer matches its verified request identity."), { status: 409, code: "BETA_IDENTITY_MISMATCH" });
  }
  const decidedAt = new Date().toISOString();
  const currentPreferences = account.notificationPreferences ?? defaultNotificationPreferences();
  const consentedEmail = request.preferredContactMethod === "email" && request.betaContactConsent === true && isValidBoardSignalEmail(request.preferredContactValue);
  const notificationPreferences = {
    ...defaultNotificationPreferences(),
    ...currentPreferences,
    email: newlyCreatedAccess && consentedEmail ? true : currentPreferences.email ?? false,
    browserPush: currentPreferences.browserPush ?? false,
    deskReady: currentPreferences.deskReady ?? true,
    episodeProgress: currentPreferences.episodeProgress ?? true,
    blueReminder: currentPreferences.blueReminder ?? true,
    universeAchievement: currentPreferences.universeAchievement ?? true,
    founderUpdates: currentPreferences.founderUpdates ?? true,
  };
  await db.collection("users").doc(account.uid).set(clean({
    preferredContactMethod: request.preferredContactMethod,
    preferredContactValue: request.preferredContactValue,
    betaContactConsent: true,
    contactConfirmedAt: decidedAt,
    preferencesConfirmedAt: account.preferencesConfirmedAt ?? decidedAt,
    universeParticipationDisclosedAt: account.universeParticipationDisclosedAt ?? decidedAt,
    privacy: { ...account.privacy, publicPlayerPage: true, universeCoverage: true },
    notificationPreferences,
  }), { merge: true });
  await db.collection("publicPlayers").doc(String(request.chessPlayerId)).set(clean({
    chessPlayerId: String(request.chessPlayerId), username: request.canonicalUsername, usernameKey: request.canonicalUsername.toLowerCase(), avatar: request.avatar, profileUrl: request.profileUrl, pageEnabled: true,
  }), { merge: true });

  await writePublicUniverseEvent(newPlayerUniverseEvent(request, decidedAt));
  const magic = betaMagicAccessCredential(request.id, request.chessPlayerId, account.uid, new Date(decidedAt));
  await ref.set({ status: "approved", decidedAt, firebaseUid: account.uid, magicAccess: magic.record, claimedAt: null, previewClaimConsumedAt: null }, { merge: true });

  let accessEmailDelivery: FoundingBetaRequest["accessEmailDelivery"] = "not_eligible";
  if (consentedEmail) {
    const delivery = getBoardSignalDeliveryStatus();
    if (!delivery.emailConfigured) accessEmailDelivery = "not_configured";
    else {
      const email = await sendBoardSignalEmail({
        to: request.preferredContactValue,
        subject: "Your BoardSignal is ready",
        text: `Your private Player Room is ready.\n\nOpen My Player Room: ${magic.link}`,
      });
      accessEmailDelivery = email.delivered ? "delivered" : "failed";
    }
    await ref.set({ accessEmailDelivery }, { merge: true });
  }

  return {
    request: { ...request, status: "approved" as const, decidedAt, firebaseUid: account.uid, magicAccess: magic.record, accessEmailDelivery },
    account,
    accessCode: result.accessCode,
    magicLink: magic.link,
    magicAccessExpiresAt: magic.expiresAt,
    approvalMessage: accessMessage(request.canonicalUsername, magic.link),
    accessEmailDelivery,
  };
}

export async function regenerateFoundingBetaMagicAccess(requestId: string) {
  const ref = getAdminDb().collection("betaRequests").doc(requestId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw Object.assign(new Error("The Founding Beta request was not found."), { status: 404 });
  const request = snapshot.data() as FoundingBetaRequest;
  if (request.status !== "approved") throw Object.assign(new Error("Approve this request before creating a private access link."), { status: 409 });
  const uid = request.firebaseUid ?? `chesscom_${request.chessPlayerId}`;
  const magic = betaMagicAccessCredential(request.id, request.chessPlayerId, uid);
  await ref.set(clean({ magicAccess: magic.record, claimedAt: null, previewClaimConsumedAt: null }), { merge: true });
  return { request, magicLink: magic.link, magicAccessExpiresAt: magic.expiresAt, approvalMessage: accessMessage(request.canonicalUsername, magic.link) };
}

export async function rejectFoundingBetaRequest(requestId: string) {
  const ref = getAdminDb().collection("betaRequests").doc(requestId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw Object.assign(new Error("The Founding Beta request was not found."), { status: 404 });
  const request = snapshot.data() as FoundingBetaRequest;
  if (request.status !== "pending") throw Object.assign(new Error(`This request is already ${request.status}.`), { status: 409 });
  const decidedAt = new Date().toISOString();
  await ref.set({ status: "rejected", decidedAt }, { merge: true });
  return { ...request, status: "rejected" as const, decidedAt };
}
