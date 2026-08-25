import "server-only";

import type { BoardSignalAccount, FounderPlayerIdentityRow, StableChessComIdentity } from "../account";
import {
  createBetaAccessCredential,
  evaluateBetaAccessAttempt,
  isValidBetaAccessCode,
  type BetaAccessRecord,
} from "../auth/betaAccess";
import { resolveChessComPlayer } from "../processor";
import { getAdminAuth, getAdminDb } from "../../../utils/firebaseAdmin";
import { ensureStablePlayerAccount } from "./persistence";
import type { FounderPlayerSummary } from "./founderMaterialized";
import type { FoundingBetaRequest } from "./betaRequests";
import { logReadBudget } from "./firestoreService";

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{2,50}$/;
const FOUNDER_DIRECTORY_VERSION = "boardsignal-founder-directory-v1" as const;
const FOUNDER_DIRECTORY_LIMIT = 200;
const FOUNDER_DIRECTORY_TTL_MS = 15 * 60 * 1000;
const FOUNDER_DIRECTORY_LEASE_MS = 15_000;

export type FounderDirectoryRequest = {
  id: string;
  chessPlayerId: number;
  canonicalUsername: string;
  avatar?: string;
  profileUrl?: string;
  preferredContactMethod?: FoundingBetaRequest["preferredContactMethod"];
  preferredContactValue?: string;
  requestedAt: string;
  activationReturnMethod?: FoundingBetaRequest["activationReturnMethod"];
  activationDevice?: { registeredAt?: string } | null;
  activationDeviceDelivery?: FoundingBetaRequest["activationDeviceDelivery"];
  status: FoundingBetaRequest["status"];
  decidedAt?: string;
  claimedAt?: string;
  provisionalClaimedAt?: string;
  identityReviewStatus?: FoundingBetaRequest["identityReviewStatus"];
  founderAlertRequest?: FoundingBetaRequest["founderAlertRequest"];
  founderAlertProvisionalClaim?: FoundingBetaRequest["founderAlertProvisionalClaim"];
  previewSnapshot?: FoundingBetaRequest["previewSnapshot"];
  previewError?: string;
  accessEmailDelivery?: FoundingBetaRequest["accessEmailDelivery"];
  magicAccess?: { expiresAt?: string; consumedAt?: string };
};

export type FounderPlayerDirectoryState = {
  version: typeof FOUNDER_DIRECTORY_VERSION;
  generatedAt: string;
  players: FounderPlayerIdentityRow[];
  requests: FounderDirectoryRequest[];
};

type FounderDirectoryLease = { leaseId: string; leaseUntil: string; startedAt: string };

export type BetaAccessFailureCode = "BETA_ACCESS_INVALID" | "BETA_ACCESS_REVOKED" | "BETA_ACCESS_LOCKED";

function betaAccessError(code: BetaAccessFailureCode) {
  const status = code === "BETA_ACCESS_LOCKED" ? 429 : code === "BETA_ACCESS_REVOKED" ? 403 : 401;
  const message = code === "BETA_ACCESS_LOCKED"
    ? "Founding Access is temporarily locked after repeated unsuccessful attempts. Try again later or ask BoardSignal for a reset."
    : code === "BETA_ACCESS_REVOKED"
      ? "This Founding Access has been revoked. Ask BoardSignal for a new private access code."
      : "The Chess.com username and private access code did not match an active Founding Access account.";
  return Object.assign(new Error(message), { status, code });
}

function normalizeUsername(value: string) {
  const username = value.trim().replace(/^@/, "");
  if (!USERNAME_PATTERN.test(username)) throw Object.assign(new Error("Enter a valid Chess.com username."), { status: 400, code: "INVALID_USERNAME" });
  return username;
}

function validatePlayerId(value: unknown) {
  const playerId = Number(value);
  if (!Number.isSafeInteger(playerId) || playerId <= 0) throw Object.assign(new Error("A stable Chess.com player ID is required."), { status: 400, code: "INVALID_PLAYER_ID" });
  return playerId;
}

function clean<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

async function revokeExistingFirebaseSession(uid: string) {
  const auth = getAdminAuth();
  try {
    await auth.getUser(uid);
    await auth.revokeRefreshTokens(uid);
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
  }
}

function stableIdentityFromResolved(resolved: Awaited<ReturnType<typeof resolveChessComPlayer>>): StableChessComIdentity {
  if (!Number.isSafeInteger(resolved.playerId) || !resolved.playerId) {
    throw Object.assign(new Error("Chess.com did not return the stable player ID BoardSignal requires."), { status: 422, code: "STABLE_PLAYER_ID_MISSING" });
  }
  return { playerId: resolved.playerId, canonicalUsername: resolved.username, avatar: resolved.avatar, profileUrl: resolved.profileUrl };
}

export async function authenticateFoundingBetaAccess(usernameInput: string, accessCodeInput: string) {
  const username = normalizeUsername(usernameInput);
  const accessCode = accessCodeInput.trim();
  if (!isValidBetaAccessCode(accessCode)) throw betaAccessError("BETA_ACCESS_INVALID");
  const identity = stableIdentityFromResolved(await resolveChessComPlayer(username));
  const db = getAdminDb();
  const accessRef = db.collection("betaAccess").doc(String(identity.playerId));
  const attempt = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(accessRef);
    if (!snapshot.exists) return { ok: false, code: "BETA_ACCESS_INVALID" as const };
    const record = snapshot.data() as BetaAccessRecord;
    if (record.playerId !== identity.playerId) return { ok: false, code: "BETA_ACCESS_INVALID" as const };
    const result = evaluateBetaAccessAttempt(record, accessCode);
    if (result.patch) transaction.set(accessRef, clean({ ...result.patch, canonicalUsername: identity.canonicalUsername }), { merge: true });
    return result;
  });
  if (!attempt.ok) throw betaAccessError(attempt.code);
  const account = await ensureStablePlayerAccount(identity);
  if (account.accessStatus !== "active") throw Object.assign(new Error("This BoardSignal account is not active."), { status: 403, code: "ACCOUNT_NOT_ACTIVE" });
  return { account, identity };
}

export async function createFoundingBetaAccessForIdentity(identityInput: StableChessComIdentity) {
  const playerId = validatePlayerId(identityInput.playerId);
  const canonicalUsername = normalizeUsername(identityInput.canonicalUsername);
  const identity: StableChessComIdentity = {
    playerId,
    canonicalUsername,
    avatar: identityInput.avatar,
    profileUrl: identityInput.profileUrl,
  };
  const account = await ensureStablePlayerAccount(identity);
  const ref = getAdminDb().collection("betaAccess").doc(String(identity.playerId));
  const existing = await ref.get();
  if (existing.exists) throw Object.assign(new Error("Founding Access already exists for this player. Use Reset Access to issue a new code."), { status: 409, code: "BETA_ACCESS_EXISTS" });
  const credential = createBetaAccessCredential(identity);
  await ref.create(clean(credential.record));
  return { account, accessCode: credential.accessCode };
}

export async function createFoundingBetaAccess(usernameInput: string) {
  const identity = stableIdentityFromResolved(await resolveChessComPlayer(normalizeUsername(usernameInput)));
  return createFoundingBetaAccessForIdentity(identity);
}

export async function loadExistingFoundingBetaAccess(playerIdInput: unknown) {
  const playerId = validatePlayerId(playerIdInput);
  const db = getAdminDb();
  const accessRef = db.collection("betaAccess").doc(String(playerId));
  const accessSnapshot = await accessRef.get();
  if (!accessSnapshot.exists) throw Object.assign(new Error("No Founding Access record exists for this player."), { status: 404, code: "BETA_ACCESS_NOT_FOUND" });
  const record = accessSnapshot.data() as BetaAccessRecord;
  if (record.playerId !== playerId) throw Object.assign(new Error("The Founding Access record does not match this stable player ID."), { status: 409, code: "BETA_ACCESS_IDENTITY_MISMATCH" });
  const mapSnapshot = await db.collection("chessPlayerAccounts").doc(String(playerId)).get();
  const mappedUid = typeof mapSnapshot.data()?.uid === "string" ? String(mapSnapshot.data()!.uid) : `chesscom_${playerId}`;
  const accountSnapshot = await db.collection("users").doc(mappedUid).get();
  const account = accountSnapshot.data() as BoardSignalAccount | undefined;
  if (!account || account.uid !== mappedUid || account.chessCom?.playerId !== playerId) throw Object.assign(new Error("The existing Founding Access account could not be loaded for this stable player ID."), { status: 409, code: "BETA_ACCOUNT_NOT_FOUND" });
  return { account, record };
}

export async function resetFoundingBetaAccess(playerIdInput: unknown) {
  const playerId = validatePlayerId(playerIdInput);
  const db = getAdminDb();
  const ref = db.collection("betaAccess").doc(String(playerId));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw Object.assign(new Error("No Founding Access record exists for this player."), { status: 404, code: "BETA_ACCESS_NOT_FOUND" });
  const previous = snapshot.data() as BetaAccessRecord;
  const accountSnapshot = await db.collection("users").doc(`chesscom_${playerId}`).get();
  const account = accountSnapshot.data() as BoardSignalAccount | undefined;
  const identity = account?.chessCom ?? { playerId, canonicalUsername: previous.canonicalUsername };
  const credential = createBetaAccessCredential(identity, new Date(), previous);
  await ref.set(clean(credential.record));
  if (account?.uid) await revokeExistingFirebaseSession(account.uid);
  return { account, accessCode: credential.accessCode };
}

export async function revokeFoundingBetaAccess(playerIdInput: unknown) {
  const playerId = validatePlayerId(playerIdInput);
  const ref = getAdminDb().collection("betaAccess").doc(String(playerId));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw Object.assign(new Error("No Founding Access record exists for this player."), { status: 404, code: "BETA_ACCESS_NOT_FOUND" });
  await ref.set({ status: "revoked", failedAttempts: 0, lockedUntil: null }, { merge: true });
  await revokeExistingFirebaseSession(`chesscom_${playerId}`);
  return { playerId, status: "revoked" as const };
}

function founderDirectoryRef() { return getAdminDb().collection("founderDirectoryState").doc("current"); }
function founderDirectoryLeaseRef() { return getAdminDb().collection("founderDirectoryState").doc("buildLease"); }

function validFounderDirectoryState(value: unknown, now = new Date(), allowStale = false): FounderPlayerDirectoryState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const state = value as Partial<FounderPlayerDirectoryState>;
  if (state.version !== FOUNDER_DIRECTORY_VERSION || !Array.isArray(state.players) || !Array.isArray(state.requests) || typeof state.generatedAt !== "string") return undefined;
  if (!allowStale && (!Number.isFinite(Date.parse(state.generatedAt)) || now.getTime() - Date.parse(state.generatedAt) > FOUNDER_DIRECTORY_TTL_MS)) return undefined;
  return state as FounderPlayerDirectoryState;
}

function founderIdentityRow(summary: FounderPlayerSummary, betaAccess?: BetaAccessRecord): FounderPlayerIdentityRow | undefined {
  const row = summary.row;
  if (!summary.active || row.uid.startsWith("request:") || !Number.isSafeInteger(row.playerId)) return undefined;
  const retainedReviews = row.reviewPeriods.length;
  const liveCoverage = row.publicHighlightsStatus === "live" ? retainedReviews : 0;
  return {
    uid: row.uid,
    username: row.username,
    playerId: row.playerId!,
    avatar: row.avatar,
    profileUrl: row.profileUrl,
    betaAccessStatus: betaAccess?.status ?? "not_created",
    accountStatus: (row.accessStatus === "paused" || row.accessStatus === "deleted") ? row.accessStatus : "active",
    desksStored: retainedReviews,
    latestDesk: row.latestReview?.periodEnd ? {
      deskKey: row.latestReview.deskKey ?? `${row.playerId}:${row.latestReview.periodStart ?? row.latestReview.periodEnd}`,
      periodLabel: row.latestReview.periodLabel ?? `${row.latestReview.periodStart ?? ""} → ${row.latestReview.periodEnd}`,
      periodEnd: row.latestReview.periodEnd,
    } : undefined,
    publicHighlights: {
      status: (row.publicHighlightsStatus ?? "no_completed_review") as FounderPlayerIdentityRow["publicHighlights"]["status"],
      retainedReviews,
      expectedCoverage: retainedReviews,
      liveCoverage,
      repairAvailable: row.publicHighlightsStatus === "repair_needed",
    },
    lastSeen: row.lastSeenAt,
    oauthLinked: row.identityStatus === "oauth_verified",
    preferredContactMethod: row.preferredContactMethod as FounderPlayerIdentityRow["preferredContactMethod"],
    preferredContactValue: row.preferredContactValue,
    betaContactConsent: Boolean(row.preferredContactValue),
    identityStatus: row.identityStatus as FounderPlayerIdentityRow["identityStatus"],
  };
}

function founderDirectoryRequest(request: FoundingBetaRequest): FounderDirectoryRequest {
  return clean({
    id: request.id,
    chessPlayerId: request.chessPlayerId,
    canonicalUsername: request.canonicalUsername,
    avatar: request.avatar,
    profileUrl: request.profileUrl,
    preferredContactMethod: request.preferredContactMethod,
    preferredContactValue: request.preferredContactValue,
    requestedAt: request.requestedAt,
    activationReturnMethod: request.activationReturnMethod,
    activationDevice: request.activationDevice ? { registeredAt: request.activationDevice.registeredAt } : request.activationDevice,
    activationDeviceDelivery: request.activationDeviceDelivery,
    status: request.status,
    decidedAt: request.decidedAt,
    claimedAt: request.claimedAt,
    provisionalClaimedAt: request.provisionalClaimedAt,
    identityReviewStatus: request.identityReviewStatus,
    founderAlertRequest: request.founderAlertRequest,
    founderAlertProvisionalClaim: request.founderAlertProvisionalClaim,
    ...(request.status === "pending" ? { previewSnapshot: request.previewSnapshot, previewError: request.previewError } : {}),
    accessEmailDelivery: request.accessEmailDelivery,
    magicAccess: request.magicAccess ? { expiresAt: request.magicAccess.expiresAt, consumedAt: request.magicAccess.consumedAt } : undefined,
  });
}

async function acquireFounderDirectoryLease(now = new Date()) {
  const db = getAdminDb();
  const leaseId = `${now.getTime()}-${Math.random().toString(36).slice(2)}`;
  const leaseUntil = new Date(now.getTime() + FOUNDER_DIRECTORY_LEASE_MS).toISOString();
  return db.runTransaction(async (transaction) => {
    const [stateSnapshot, leaseSnapshot] = await Promise.all([
      transaction.get(founderDirectoryRef()),
      transaction.get(founderDirectoryLeaseRef()),
    ]);
    const existing = stateSnapshot.exists ? validFounderDirectoryState(stateSnapshot.data(), now) : undefined;
    if (existing) return { owner: false as const, existing };
    const previous = leaseSnapshot.data() as FounderDirectoryLease | undefined;
    if (previous?.leaseUntil && previous.leaseUntil > now.toISOString()) return { owner: false as const };
    const lease: FounderDirectoryLease = { leaseId, leaseUntil, startedAt: now.toISOString() };
    transaction.set(founderDirectoryLeaseRef(), lease, { merge: false });
    return { owner: true as const };
  });
}

async function rebuildFounderPlayerDirectoryState(now = new Date()): Promise<FounderPlayerDirectoryState> {
  const started = Date.now();
  const db = getAdminDb();
  const [summaries, access, requests] = await Promise.all([
    db.collection("founderPlayerSummaries").limit(FOUNDER_DIRECTORY_LIMIT + 1).get(),
    db.collection("betaAccess").limit(FOUNDER_DIRECTORY_LIMIT + 1).get(),
    db.collection("betaRequests").limit(FOUNDER_DIRECTORY_LIMIT + 1).get(),
  ]);
  if (summaries.size > FOUNDER_DIRECTORY_LIMIT || access.size > FOUNDER_DIRECTORY_LIMIT || requests.size > FOUNDER_DIRECTORY_LIMIT) {
    throw Object.assign(new Error("Founder directory exceeded its bounded materialization limit."), { status: 503, code: "FOUNDER_DIRECTORY_LIMIT", retryAfterSeconds: 30 });
  }
  const accessByPlayer = new Map(access.docs.map((document) => [document.id, document.data() as BetaAccessRecord]));
  const players = summaries.docs
    .map((document) => document.data() as FounderPlayerSummary)
    .flatMap((summary) => {
      const row = founderIdentityRow(summary, accessByPlayer.get(String(summary.playerId)));
      return row ? [row] : [];
    })
    .sort((a, b) => a.username.localeCompare(b.username));
  const requestRows = requests.docs
    .map((document) => founderDirectoryRequest(document.data() as FoundingBetaRequest))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const state: FounderPlayerDirectoryState = { version: FOUNDER_DIRECTORY_VERSION, generatedAt: now.toISOString(), players, requests: requestRows };
  await founderDirectoryRef().set(clean(state), { merge: false });
  await founderDirectoryLeaseRef().delete().catch(() => undefined);
  logReadBudget({
    operation: "founder_directory_rebuild",
    durationMs: Date.now() - started,
    querySizes: { summaries: summaries.size, betaAccess: access.size, betaRequests: requests.size },
    approximateReads: summaries.size + access.size + requests.size,
  });
  return state;
}

export async function loadFounderPlayerDirectoryState(now = new Date()): Promise<FounderPlayerDirectoryState> {
  const started = Date.now();
  const snapshot = await founderDirectoryRef().get();
  const existing = snapshot.exists ? validFounderDirectoryState(snapshot.data(), now) : undefined;
  if (existing) {
    logReadBudget({ operation: "founder_beta_directory", durationMs: Date.now() - started, querySizes: { materializedDirectory: 1 }, approximateReads: 1 });
    return existing;
  }

  const lease = await acquireFounderDirectoryLease(now);
  if (lease.existing) return lease.existing;
  if (lease.owner) {
    try {
      return await rebuildFounderPlayerDirectoryState(now);
    } catch (error) {
      await founderDirectoryLeaseRef().delete().catch(() => undefined);
      throw error;
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 900));
  const repaired = await founderDirectoryRef().get();
  const repairedState = repaired.exists ? validFounderDirectoryState(repaired.data(), new Date()) : undefined;
  if (repairedState) return repairedState;
  throw Object.assign(new Error("Founder player directory is being prepared. Try again shortly."), { status: 503, code: "FOUNDER_DIRECTORY_BUILDING", retryAfterSeconds: 2 });
}

export async function refreshFounderDirectoryPlayer(playerIdInput: unknown, now = new Date()) {
  const playerId = validatePlayerId(playerIdInput);
  const db = getAdminDb();
  await db.runTransaction(async (transaction) => {
    const [stateSnapshot, summarySnapshot, accessSnapshot] = await Promise.all([
      transaction.get(founderDirectoryRef()),
      transaction.get(db.collection("founderPlayerSummaries").doc(String(playerId))),
      transaction.get(db.collection("betaAccess").doc(String(playerId))),
    ]);
    const state = stateSnapshot.exists ? validFounderDirectoryState(stateSnapshot.data(), now, true) : undefined;
    if (!state) return;
    const summary = summarySnapshot.exists ? summarySnapshot.data() as FounderPlayerSummary : undefined;
    const betaAccess = accessSnapshot.exists ? accessSnapshot.data() as BetaAccessRecord : undefined;
    const nextRow = summary ? founderIdentityRow(summary, betaAccess) : undefined;
    const players = state.players.filter((player) => player.playerId !== playerId);
    if (nextRow) players.push(nextRow);
    players.sort((a, b) => a.username.localeCompare(b.username));
    transaction.set(founderDirectoryRef(), clean({ ...state, generatedAt: now.toISOString(), players }), { merge: false });
  });
}

export async function refreshFounderDirectoryRequest(requestId: string, now = new Date()) {
  if (!requestId) return;
  const db = getAdminDb();
  await db.runTransaction(async (transaction) => {
    const [stateSnapshot, requestSnapshot] = await Promise.all([
      transaction.get(founderDirectoryRef()),
      transaction.get(db.collection("betaRequests").doc(requestId)),
    ]);
    const state = stateSnapshot.exists ? validFounderDirectoryState(stateSnapshot.data(), now, true) : undefined;
    if (!state) return;
    const requests = state.requests.filter((request) => request.id !== requestId);
    if (requestSnapshot.exists) requests.push(founderDirectoryRequest(requestSnapshot.data() as FoundingBetaRequest));
    requests.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    transaction.set(founderDirectoryRef(), clean({ ...state, generatedAt: now.toISOString(), requests }), { merge: false });
  });
}

export async function listFounderPlayerIdentities(): Promise<FounderPlayerIdentityRow[]> {
  return (await loadFounderPlayerDirectoryState()).players;
}
