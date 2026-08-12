import "server-only";

import { createHash } from "node:crypto";
import type { BoardSignalContactMethod, StableChessComIdentity } from "../account";
import { defaultNotificationPreferences } from "../account";
import { resolveChessComPlayer } from "../processor";
import { getAdminDb } from "../../../utils/firebaseAdmin";
import { createFoundingBetaAccess, resetFoundingBetaAccess } from "./betaAccess";

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
};

const CONTACT_METHODS = new Set<BoardSignalContactMethod>(["email", "discord", "telegram"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function identityFromResolved(resolved: Awaited<ReturnType<typeof resolveChessComPlayer>>): StableChessComIdentity {
  if (!Number.isSafeInteger(resolved.playerId) || !resolved.playerId) {
    throw Object.assign(new Error("Chess.com did not return the stable player ID BoardSignal requires."), { status: 422 });
  }
  return {
    playerId: resolved.playerId,
    canonicalUsername: resolved.username,
    avatar: resolved.avatar,
    profileUrl: resolved.profileUrl,
  };
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
  const raw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
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

export async function submitFoundingBetaRequest(input: {
  request: Request;
  username: unknown;
  preferredContactMethod: unknown;
  preferredContactValue: unknown;
  betaContactConsent: unknown;
}) {
  await enforceRequestRateLimit(input.request);
  const requestedUsername = String(input.username ?? "").trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_-]{2,50}$/.test(requestedUsername)) {
    throw Object.assign(new Error("Enter a valid Chess.com username."), { status: 400 });
  }
  const contact = validateContact(input.preferredContactMethod, input.preferredContactValue, input.betaContactConsent);
  const identity = identityFromResolved(await resolveChessComPlayer(requestedUsername));
  const now = new Date().toISOString();
  const id = String(identity.playerId);
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
  };
  await getAdminDb().collection("betaRequests").doc(id).set(clean(record));
  return record;
}

export async function listFoundingBetaRequests(status?: BetaRequestStatus) {
  const snapshot = await getAdminDb().collection("betaRequests").get();
  return snapshot.docs
    .map((document) => document.data() as FoundingBetaRequest)
    .filter((request) => !status || request.status === status)
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

function approvalMessage(username: string, accessCode: string) {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.adminhub-global.com";
  return `You're in — your BoardSignal Founding Beta access is ready.\n\nGo to:\n${site}\n\nOpen My Player Room and use:\n\nChess.com username: ${username}\nPrivate Beta Access: ${accessCode}\n\nYour account will then remember your recent Desks and progress.`;
}

export async function approveFoundingBetaRequest(requestId: string) {
  const db = getAdminDb();
  const ref = db.collection("betaRequests").doc(requestId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw Object.assign(new Error("The Founding Beta request was not found."), { status: 404 });
  const request = snapshot.data() as FoundingBetaRequest;
  if (request.status !== "pending") throw Object.assign(new Error(`This request is already ${request.status}.`), { status: 409 });

  let result;
  try {
    result = await createFoundingBetaAccess(request.canonicalUsername);
  } catch (error) {
    if (String((error as { code?: string }).code) !== "BETA_ACCESS_EXISTS") throw error;
    result = await resetFoundingBetaAccess(request.chessPlayerId);
    if (!result.account) throw Object.assign(new Error("The existing Founding Beta identity could not be loaded."), { status: 409 });
  }

  const account = result.account!;
  const decidedAt = new Date().toISOString();
  const currentPreferences = account.notificationPreferences ?? defaultNotificationPreferences();
  await db.collection("users").doc(account.uid).set(clean({
    preferredContactMethod: request.preferredContactMethod,
    preferredContactValue: request.preferredContactValue,
    betaContactConsent: true,
    contactConfirmedAt: decidedAt,
    privacy: {
      ...account.privacy,
      publicPlayerPage: true,
      universeCoverage: true,
    },
    notificationPreferences: {
      ...defaultNotificationPreferences(),
      ...currentPreferences,
      deskReady: currentPreferences.deskReady ?? true,
      episodeProgress: currentPreferences.episodeProgress ?? true,
      blueReminder: currentPreferences.blueReminder ?? true,
      universeAchievement: currentPreferences.universeAchievement ?? true,
      founderUpdates: currentPreferences.founderUpdates ?? true,
    },
  }), { merge: true });
  await db.collection("publicPlayers").doc(String(request.chessPlayerId)).set(clean({
    chessPlayerId: String(request.chessPlayerId),
    username: request.canonicalUsername,
    usernameKey: request.canonicalUsername.toLowerCase(),
    avatar: request.avatar,
    profileUrl: request.profileUrl,
    pageEnabled: true,
  }), { merge: true });
  await ref.set({ status: "approved", decidedAt }, { merge: true });

  return {
    request: { ...request, status: "approved" as const, decidedAt },
    account,
    accessCode: result.accessCode,
    approvalMessage: approvalMessage(request.canonicalUsername, result.accessCode),
  };
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
