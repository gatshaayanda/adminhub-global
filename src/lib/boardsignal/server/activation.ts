import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { StableChessComIdentity } from "../account";
import {
  BETA_MAGIC_ACCESS_LIFETIME_MS,
  BETA_MAGIC_ACCESS_TOKEN_BYTES,
  BETA_PREVIEW_STATUS_TOKEN_BYTES,
  betaPreviewContainsPrivateFields,
  type BetaActivationReturnMethod,
  type BetaPreviewPublicPlayer,
  type BetaPreviewStatus,
  type BoardSignalBetaPreview,
} from "../activation";
import { buildLiveDesk } from "../processor";
import { buildActiveUniverseBoards, standingsFromActiveBoards } from "../pulse";
import { deskToUniverseParticipant } from "../universe";
import { foundingBetaField } from "../../../data/universeField";
import { getAdminAuth, getAdminDb, getAdminMessaging } from "../../../utils/firebaseAdmin";
import { loadActiveUniverseState } from "./universePulse";

function clean<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
export function activationSecretHash(value: string) { return createHash("sha256").update(value).digest("hex"); }

function sameHash(expected: string | undefined, raw: string) {
  if (!expected || !/^[a-f0-9]{64}$/.test(expected)) return false;
  const actual = activationSecretHash(raw);
  try { return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex")); } catch { return false; }
}

export function createBetaPreviewStatusCredential() {
  const token = randomBytes(BETA_PREVIEW_STATUS_TOKEN_BYTES).toString("base64url");
  return { token, hash: activationSecretHash(token) };
}

function safeHeadlineFromDesk(desk: Awaited<ReturnType<typeof buildLiveDesk>>) {
  const positivePool = [...desk.pools]
    .filter((pool) => typeof pool.change === "number" && pool.change > 0)
    .sort((a, b) => Number(b.change ?? 0) - Number(a.change ?? 0))[0];
  if (desk.longestWinStreak >= 3) return `${desk.longestWinStreak} straight wins formed the strongest run in this week.`;
  if (positivePool?.change) return `${positivePool.pool.toUpperCase()} moved +${positivePool.change} across this seven-day chapter.`;
  if (desk.checkmateWins && desk.checkmateWins > 0) return `${desk.checkmateWins} win${desk.checkmateWins === 1 ? "" : "s"} finished by checkmate.`;
  return `${desk.games} completed games give BoardSignal a real seven-day chapter to work with.`;
}

function fieldPlayers(boards: ReturnType<typeof buildActiveUniverseBoards>, previewUsername: string): BetaPreviewPublicPlayer[] {
  const seen = new Set<string>();
  const players: BetaPreviewPublicPlayer[] = [];
  for (const board of boards) {
    for (const entry of board.entries) {
      const key = entry.player.toLowerCase();
      if (key === previewUsername.toLowerCase() || seen.has(key)) continue;
      seen.add(key);
      players.push({
        canonicalUsername: entry.player,
        placement: `#${entry.rank} ${board.title}${board.scopeLabel ? ` · ${board.scopeLabel}` : ""}`,
        safeHighlight: entry.coverageHeadline,
        href: entry.coverageHref,
      });
      if (players.length >= 6) return players;
    }
  }
  return players;
}

export async function buildSafeBetaPreview(identity: StableChessComIdentity, now = new Date()): Promise<BoardSignalBetaPreview> {
  let desk: Awaited<ReturnType<typeof buildLiveDesk>> | undefined;
  let noPlayableWeek = false;
  try {
    desk = await buildLiveDesk(identity.canonicalUsername, { referenceDate: now });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/no public game archives|no completed standard game|no games were played/i.test(message) || (error as { code?: string }).code === "NO_ACTIVITY") noPlayableWeek = true;
    else throw error;
  }

  const universe = await loadActiveUniverseState(now).catch(() => ({ liveParticipants: [], boards: [], groups: [], recentEvents: [], whatsHot: [] }));
  const recentUniverseActivity = universe.recentEvents.slice(0, 8).map((event) => ({
    eventId: event.eventId,
    canonicalUsername: event.canonicalUsername,
    headline: event.headline,
    supportingFact: event.supportingFact,
    publishedAt: event.publishedAt,
  }));

  if (!desk || noPlayableWeek) {
    const preview: BoardSignalBetaPreview = {
      canonicalUsername: identity.canonicalUsername,
      avatar: identity.avatar,
      playerId: identity.playerId,
      profileUrl: identity.profileUrl,
      playableWeek: false,
      games: 0, wins: 0, draws: 0, losses: 0, score: 0,
      pools: [],
      safeHeadline: "BoardSignal found this Chess.com profile, but there isn't a playable completed week to show yet.",
      safeHighlight: "Your first completed seven-day chapter becomes the baseline for everything that follows.",
      universePreview: [],
      publicPlayers: fieldPlayers(universe.boards, identity.canonicalUsername),
      recentUniverseActivity,
      generatedAt: now.toISOString(),
    };
    if (betaPreviewContainsPrivateFields(preview)) throw new Error("Private data was blocked from the beta preview.");
    return clean(preview);
  }

  const participant = deskToUniverseParticipant(desk);
  let universePreview: BoardSignalBetaPreview["universePreview"] = [];
  let previewBoards = universe.boards;
  if (participant) {
    previewBoards = buildActiveUniverseBoards([...universe.liveParticipants, participant], foundingBetaField, universe.liveParticipants);
    universePreview = standingsFromActiveBoards(previewBoards, participant.id)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5)
      .map((standing) => ({
        categoryId: standing.categoryId,
        categoryTitle: standing.categoryTitle,
        scopeLabel: standing.scopeLabel,
        rank: standing.rank,
        denominator: standing.denominator,
        valueLabel: standing.valueLabel,
        label: "PROVISIONAL" as const,
        nearestAbove: standing.nearestAbove,
      }));
  }

  const preview: BoardSignalBetaPreview = {
    canonicalUsername: identity.canonicalUsername,
    avatar: identity.avatar,
    playerId: identity.playerId,
    profileUrl: identity.profileUrl,
    playableWeek: true,
    period: {
      start: desk.period.start,
      end: desk.period.end,
      label: desk.period.label,
      mode: desk.period.isLastActive ? "latest_active" : "latest_completed",
      disclosure: desk.period.isLastActive ? "Latest active week — the latest completed week had no games, so this older active block is shown without treating it as current form." : undefined,
    },
    games: desk.games,
    wins: desk.wins,
    draws: desk.draws,
    losses: desk.losses,
    score: desk.score,
    pools: desk.pools.map((pool) => ({
      pool: pool.pool,
      games: pool.games,
      wins: pool.wins,
      draws: pool.draws,
      losses: pool.losses,
      ratingStart: pool.firstRecordedRating,
      ratingEnd: pool.lastRecordedRating,
      ratingDelta: pool.change,
    })),
    primaryPool: desk.primaryPool,
    strongestWinRun: desk.longestWinStreak,
    activeDays: desk.days.filter((day) => day.wins + day.draws + day.losses > 0).length,
    safeHeadline: safeHeadlineFromDesk(desk),
    safeHighlight: safeHeadlineFromDesk(desk),
    universePreview,
    publicPlayers: fieldPlayers(previewBoards, identity.canonicalUsername),
    recentUniverseActivity,
    generatedAt: now.toISOString(),
  };
  if (betaPreviewContainsPrivateFields(preview)) throw new Error("Private data was blocked from the beta preview.");
  return clean(preview);
}

export function betaMagicAccessCredential(requestId: string, playerId: number, uid: string, now = new Date()) {
  const secret = randomBytes(BETA_MAGIC_ACCESS_TOKEN_BYTES).toString("base64url");
  const ticket = `${Buffer.from(requestId).toString("base64url")}.${secret}`;
  const expiresAt = new Date(now.getTime() + BETA_MAGIC_ACCESS_LIFETIME_MS).toISOString();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.adminhub-global.com";
  return {
    ticket,
    hash: activationSecretHash(ticket),
    expiresAt,
    link: `${site}/boardsignal/access#ticket=${ticket}`,
    record: { ticketHash: activationSecretHash(ticket), expiresAt, createdAt: now.toISOString(), requestId, playerId, uid },
  };
}

function requestIdFromMagicTicket(ticket: string) {
  const [encoded, secret, extra] = ticket.split(".");
  if (!encoded || !secret || extra || secret.length < 32) return undefined;
  try {
    const requestId = Buffer.from(encoded, "base64url").toString("utf8");
    return /^[A-Za-z0-9_-]{1,180}$/.test(requestId) ? requestId : undefined;
  } catch { return undefined; }
}

export async function consumeBetaMagicTicket(ticketInput: unknown) {
  const ticket = String(ticketInput ?? "").trim();
  if (ticket.length < 40 || ticket.length > 220) throw Object.assign(new Error("This BoardSignal access link is invalid."), { status: 400, code: "MAGIC_ACCESS_INVALID" });
  const requestId = requestIdFromMagicTicket(ticket);
  if (!requestId) throw Object.assign(new Error("This BoardSignal access link is invalid."), { status: 400, code: "MAGIC_ACCESS_INVALID" });
  const db = getAdminDb();
  const ref = db.collection("betaRequests").doc(requestId);
  const data = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw Object.assign(new Error("This BoardSignal access link was not found."), { status: 404, code: "MAGIC_ACCESS_NOT_FOUND" });
    const request = snapshot.data() as Record<string, unknown>;
    const magic = request.magicAccess as Record<string, unknown> | undefined;
    if (request.status !== "approved" || !magic || !sameHash(String(magic.ticketHash ?? ""), ticket)) {
      throw Object.assign(new Error("This BoardSignal access link is no longer active."), { status: 403, code: "MAGIC_ACCESS_INVALID" });
    }
    if (magic.consumedAt || Date.parse(String(magic.expiresAt ?? "")) <= Date.now()) {
      throw Object.assign(new Error("This BoardSignal access link expired or was already used."), { status: 410, code: "MAGIC_ACCESS_EXPIRED" });
    }
    const consumedAt = new Date().toISOString();
    transaction.set(ref, { magicAccess: { ...magic, consumedAt }, claimedAt: consumedAt }, { merge: true });
    return {
      requestId,
      uid: String(magic.uid ?? ""),
      playerId: Number(magic.playerId),
      canonicalUsername: String(request.canonicalUsername ?? ""),
      consumedAt,
    };
  });
  if (!data.uid || !Number.isSafeInteger(data.playerId) || data.playerId <= 0 || !data.canonicalUsername) throw Object.assign(new Error("This BoardSignal access link is incomplete."), { status: 500 });
  const customToken = await getAdminAuth().createCustomToken(data.uid, {
    role: "player",
    accessTier: "founding_beta",
    chessPlayerId: String(data.playerId),
    chessUsername: data.canonicalUsername,
    boardsignalAuthProvider: "founding_beta_magic",
  });
  return { ...data, customToken };
}

export async function verifyBetaPreviewStatusCredential(requestId: string, statusTokenInput: unknown) {
  const statusToken = String(statusTokenInput ?? "").trim();
  if (statusToken.length < 32 || statusToken.length > 160) throw Object.assign(new Error("Preview access is invalid."), { status: 401, code: "PREVIEW_STATUS_INVALID" });
  const snapshot = await getAdminDb().collection("betaRequests").doc(requestId).get();
  if (!snapshot.exists) throw Object.assign(new Error("This BoardSignal preview was not found."), { status: 404, code: "PREVIEW_NOT_FOUND" });
  const request = snapshot.data() as Record<string, unknown>;
  if (!sameHash(String(request.statusTokenHash ?? ""), statusToken)) throw Object.assign(new Error("Preview access is invalid."), { status: 401, code: "PREVIEW_STATUS_INVALID" });
  return { ref: snapshot.ref, request };
}

export function publicBetaPreviewStatus(requestId: string, request: Record<string, unknown>): BetaPreviewStatus {
  const status = String(request.status ?? "pending");
  const magic = request.magicAccess as Record<string, unknown> | undefined;
  const magicExpired = status === "approved" && !request.claimedAt && magic?.expiresAt && Date.parse(String(magic.expiresAt)) <= Date.now();
  const state: BetaPreviewStatus["state"] = request.claimedAt ? "claimed" : magicExpired ? "expired" : status === "approved" ? "approved" : status === "rejected" ? "rejected" : "preview_ready";
  return clean({
    requestId,
    state,
    canonicalUsername: String(request.canonicalUsername ?? "Player"),
    requestedAt: typeof request.requestedAt === "string" ? request.requestedAt : undefined,
    avatar: typeof request.avatar === "string" ? request.avatar : undefined,
    preview: request.previewSnapshot as BoardSignalBetaPreview | undefined,
    previewError: typeof request.previewError === "string" ? request.previewError : undefined,
    accessReady: status === "approved" && !request.claimedAt && !magicExpired,
    approvedAt: typeof request.decidedAt === "string" ? request.decidedAt : undefined,
    claimedAt: typeof request.claimedAt === "string" ? request.claimedAt : undefined,
    magicAccessExpiresAt: typeof magic?.expiresAt === "string" ? magic.expiresAt : undefined,
    emailDelivery: typeof request.accessEmailDelivery === "string" && ["delivered", "failed", "not_eligible", "not_configured"].includes(request.accessEmailDelivery) ? request.accessEmailDelivery as BetaPreviewStatus["emailDelivery"] : undefined,
    activationReturnMethod: ["device", "email", "discord", "telegram", "return_here"].includes(String(request.activationReturnMethod ?? "")) ? request.activationReturnMethod as BetaActivationReturnMethod : undefined,
    preferredContactMethod: ["email", "discord", "telegram"].includes(String(request.preferredContactMethod ?? "")) ? request.preferredContactMethod as "email" | "discord" | "telegram" : undefined,
    preferredContactValue: typeof request.preferredContactValue === "string" ? request.preferredContactValue : undefined,
    betaContactConsent: request.betaContactConsent === true ? true : undefined,
    deviceAlertsEnabled: Boolean((request.activationDevice as Record<string, unknown> | undefined)?.registeredAt),
    deviceDelivery: ["delivered", "failed", "not_eligible"].includes(String(request.activationDeviceDelivery ?? "")) ? request.activationDeviceDelivery as "delivered" | "failed" | "not_eligible" : undefined,
  });
}

export async function claimApprovedBetaPreview(requestId: string, statusTokenInput: unknown) {
  const verified = await verifyBetaPreviewStatusCredential(requestId, statusTokenInput);
  const db = getAdminDb();
  const claim = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(verified.ref);
    const request = fresh.data() as Record<string, unknown>;
    if (request.status !== "approved") throw Object.assign(new Error("Private access is not ready yet."), { status: 409, code: "ACCESS_NOT_READY" });
    if (request.claimedAt) throw Object.assign(new Error("This preview access was already claimed. Open My Player Room or use the fallback access path."), { status: 409, code: "ACCESS_ALREADY_CLAIMED" });
    const currentMagic = request.magicAccess as Record<string, unknown> | undefined;
    if (!currentMagic || Date.parse(String(currentMagic.expiresAt ?? "")) <= Date.now()) throw Object.assign(new Error("This one-time access window expired. Ask Ayanda to prepare a fresh access link."), { status: 410, code: "MAGIC_ACCESS_EXPIRED" });
    if (!sameHash(String(request.statusTokenHash ?? ""), String(statusTokenInput ?? "").trim())) throw Object.assign(new Error("Preview access is invalid."), { status: 401 });
    const playerId = Number(request.chessPlayerId);
    const uid = String(request.firebaseUid ?? `chesscom_${playerId}`);
    const canonicalUsername = String(request.canonicalUsername ?? "");
    if (!Number.isSafeInteger(playerId) || playerId <= 0 || !canonicalUsername) throw Object.assign(new Error("Approved identity is incomplete."), { status: 500 });
    const claimedAt = new Date().toISOString();
    const magic = request.magicAccess as Record<string, unknown> | undefined;
    transaction.set(verified.ref, { claimedAt, previewClaimConsumedAt: claimedAt, activationDevice: null, ...(magic ? { magicAccess: { ...magic, consumedAt: claimedAt } } : {}) }, { merge: true });
    return { playerId, uid, canonicalUsername, claimedAt };
  });
  const customToken = await getAdminAuth().createCustomToken(claim.uid, {
    role: "player",
    accessTier: "founding_beta",
    chessPlayerId: String(claim.playerId),
    chessUsername: claim.canonicalUsername,
    boardsignalAuthProvider: "founding_beta_preview_claim",
  });
  return { ...claim, customToken };
}

export async function registerBetaPreviewNotificationDevice(input: { requestId: string; statusToken: unknown; fcmToken: unknown; userAgent?: unknown }) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim()) throw Object.assign(new Error("Device alerts are not configured yet."), { status: 503, code: "PREVIEW_PUSH_NOT_CONFIGURED" });
  const verified = await verifyBetaPreviewStatusCredential(input.requestId, input.statusToken);
  const token = String(input.fcmToken ?? "").trim();
  if (token.length < 20 || token.length > 4096) throw Object.assign(new Error("This device did not return a valid notification registration."), { status: 400, code: "PREVIEW_PUSH_TOKEN_INVALID" });
  const fresh = await verified.ref.get();
  const request = fresh.data() as Record<string, unknown>;
  if (request.status !== "pending") throw Object.assign(new Error("Device return settings can only change while this Preview is pending."), { status: 409, code: "PREVIEW_RETURN_LOCKED" });
  const now = new Date().toISOString();
  await verified.ref.set(clean({
    activationReturnMethod: "device",
    activationDevice: { token, registeredAt: now, updatedAt: now, userAgentSummary: String(input.userAgent ?? "").slice(0, 300) },
    activationReturnUpdatedAt: now,
  }), { merge: true });
  return { registered: true, activationReturnMethod: "device" as const };
}

export async function notifyApprovedBetaPreviewDevice(input: { requestId: string; fcmToken?: unknown }) {
  const token = String(input.fcmToken ?? "").trim();
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim() || token.length < 20) return { eligible: false, delivered: 0, failed: 0, status: "not_eligible" as const };
  const link = `/boardsignal/preview/${encodeURIComponent(input.requestId)}`;
  try {
    await getAdminMessaging().send({
      token,
      notification: { title: "BoardSignal", body: "Your private Player Room is ready.\nOpen BoardSignal to continue." },
      webpush: { fcmOptions: { link } },
      data: { type: "beta_preview_approved", link, requestId: input.requestId },
    });
    return { eligible: true, delivered: 1, failed: 0, status: "delivered" as const };
  } catch {
    return { eligible: true, delivered: 0, failed: 1, status: "failed" as const };
  }
}

export async function registerFounderNotificationDevice(fcmTokenInput: unknown, userAgentInput?: unknown) {
  const token = String(fcmTokenInput ?? "").trim();
  if (token.length < 20 || token.length > 4096) throw Object.assign(new Error("Founder browser alert token is invalid."), { status: 400 });
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim()) throw Object.assign(new Error("Founder browser alerts require BoardSignal Web Push configuration."), { status: 503 });
  const id = Buffer.from(token).toString("base64url").slice(0, 180);
  const now = new Date().toISOString();
  await getAdminDb().collection("founderNotificationDevices").doc(id).set(clean({ token, createdAt: now, updatedAt: now, userAgent: String(userAgentInput ?? "").slice(0, 500) }), { merge: true });
  return { registered: true };
}

export async function unregisterFounderNotificationDevice(fcmTokenInput?: unknown) {
  const collection = getAdminDb().collection("founderNotificationDevices");
  const token = String(fcmTokenInput ?? "").trim();
  if (token) {
    const id = Buffer.from(token).toString("base64url").slice(0, 180);
    await collection.doc(id).delete().catch(() => undefined);
  }
  return { registered: false };
}

export async function founderNotificationDeviceCount() {
  const snapshot = await getAdminDb().collection("founderNotificationDevices").get().catch(() => ({ size: 0 }));
  return snapshot.size ?? 0;
}

export async function notifyFounderOfBetaRequest(input: { requestId: string; canonicalUsername: string; previewReady?: boolean }) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim()) return { eligible: false, delivered: 0, failed: 0 };
  const devices = await getAdminDb().collection("founderNotificationDevices").get();
  if (devices.empty) return { eligible: false, delivered: 0, failed: 0 };
  const link = `/admin/players?request=${encodeURIComponent(input.requestId)}`;
  let delivered = 0;
  let failed = 0;
  for (const device of devices.docs) {
    const token = String(device.data().token ?? "");
    if (!token) continue;
    try {
      await getAdminMessaging().send({
        token,
        notification: { title: "BoardSignal", body: input.previewReady === false ? `New beta request — ${input.canonicalUsername}\nRequest saved; preview needs a retry.` : `New beta request — ${input.canonicalUsername}\nPreview is ready for approval.` },
        webpush: { fcmOptions: { link } },
        data: { type: "founder_beta_request", link, requestId: input.requestId },
      });
      delivered += 1;
    } catch (error) {
      failed += 1;
      const code = String((error as { code?: string }).code ?? "");
      if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) await device.ref.delete().catch(() => undefined);
    }
  }
  return { eligible: true, delivered, failed };
}
