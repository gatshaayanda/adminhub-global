import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/utils/firebaseAdmin";
import { classifyBoardSignalHttpError } from "@/lib/boardsignal/server/firestoreService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 250;
const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };

type AccountData = {
  uid?: string;
  role?: string;
  accessStatus?: string;
  googleAccessConnectedAt?: string;
  chessComOAuthLinkedAt?: string;
  betaAgreementAcceptedAt?: string;
  lastSeenAt?: string;
  cadenceAnchor?: string;
  latestProgressCheckedAt?: string;
  currentEpisodeSummary?: unknown;
  betaContactConsent?: boolean;
  preferredContactMethod?: string;
  preferredContactValue?: string;
  notificationPreferences?: { email?: boolean };
  reviewEngagement?: { latestOpenedReviewKey?: string; latestOpenedAt?: string; latestOpenedPeriodLabel?: string };
  chessCom?: { playerId?: number; canonicalUsername?: string; profileUrl?: string };
};

type GoogleAlias = {
  provider?: string;
  providerUidHash?: string;
  uid?: string;
  playerId?: number;
  canonicalUsername?: string;
  linkedAt?: string;
  lastUsedAt?: string;
};

type FounderSummary = {
  uid?: string;
  playerId?: string;
  active?: boolean;
  validation?: { retentionDepth?: number };
  row?: {
    username?: string;
    playerId?: number;
    profileUrl?: string;
    reviewCount?: number;
    lastSeenAt?: string;
    nextDeskDueAt?: string;
    forming?: boolean;
    readyNotSeen?: boolean;
    reviewCheckRequired?: boolean;
    exceptionCount?: number;
    exceptionTitles?: string[];
    currentState?: string;
    latestReview?: { deskKey?: string; periodLabel?: string; publishedAt?: string };
  };
};

function response(body: unknown, status = 200, retryAfterSeconds?: number) {
  return NextResponse.json(body, { status, headers: { ...headers, ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}) } });
}

function parsed(value?: string) {
  if (!value) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : undefined;
}

function latestIso(a?: string, b?: string) {
  const at = parsed(a) ?? 0;
  const bt = parsed(b) ?? 0;
  return bt > at ? b : a;
}

function earliestIso(a?: string, b?: string) {
  if (!a) return b;
  if (!b) return a;
  return (parsed(b) ?? Number.MAX_SAFE_INTEGER) < (parsed(a) ?? Number.MAX_SAFE_INTEGER) ? b : a;
}

function googleSubjectHash(providerSubject: string) {
  return createHash("sha256").update(`boardsignal-google:${providerSubject}`).digest("hex");
}

function latestAlias(current: GoogleAlias | undefined, candidate: GoogleAlias) {
  if (!current) return candidate;
  return String(candidate.linkedAt ?? candidate.lastUsedAt ?? "") > String(current.linkedAt ?? current.lastUsedAt ?? "") ? candidate : current;
}

function exceptionCategory(reviewCheckRequired: boolean, titles: string[]) {
  if (reviewCheckRequired) return "Review timing check";
  const haystack = titles.join(" ").toLowerCase();
  if (/universe|coverage|public highlight|pulse/.test(haystack)) return "Universe / coverage";
  if (/history|historical|backfill/.test(haystack)) return "Historical onboarding";
  if (/identity|ownership|oauth/.test(haystack)) return "Identity";
  if (/stockfish|engine|position review/.test(haystack)) return "Position review / engine";
  if (/firestore|quota|database|service unavailable/.test(haystack)) return "Data service";
  return "System exception";
}

function nextAction(category: string, reviewCheckRequired: boolean) {
  if (reviewCheckRequired) return "Open the player and verify the latest report/Review state. Contact the player only if the Review is genuinely overdue.";
  if (category === "Universe / coverage") return "Open the player and inspect public coverage/Universe state. Repair system state before contacting the player.";
  if (category === "Historical onboarding") return "Open the player and inspect historical onboarding/backfill state. This is usually a data-operation task, not an access problem.";
  if (category === "Identity") return "Open the player and inspect the identity state before changing access or public verification.";
  if (category === "Position review / engine") return "Open the player and inspect the Review/position-analysis state before asking the player to retry anything.";
  if (category === "Data service") return "Check system health first. A service problem may not require any player contact.";
  return "Open the player and read the recorded exception details before deciding whether any action or player contact is needed.";
}

export async function GET() {
  try {
    const db = getAdminDb();
    const [aliasesSnapshot, summariesSnapshot, accountsSnapshot, authPage] = await Promise.all([
      db.collection("playerIdentityAliases").where("provider", "==", "google_access").limit(MAX_ROWS + 1).get(),
      db.collection("founderPlayerSummaries").limit(MAX_ROWS + 1).get(),
      db.collection("users").where("role", "==", "player").limit(MAX_ROWS + 1).get(),
      getAdminAuth().listUsers(1000),
    ]);

    const partial = aliasesSnapshot.size > MAX_ROWS || summariesSnapshot.size > MAX_ROWS || accountsSnapshot.size > MAX_ROWS || Boolean(authPage.pageToken);
    const aliases = aliasesSnapshot.docs.slice(0, MAX_ROWS).map((document) => document.data() as GoogleAlias);
    const summaries = summariesSnapshot.docs.slice(0, MAX_ROWS).map((document) => document.data() as FounderSummary);
    const accounts = accountsSnapshot.docs.slice(0, MAX_ROWS).map((document) => ({ id: document.id, data: document.data() as AccountData }));

    const summaryByUid = new Map(summaries.filter((item) => item.uid).map((item) => [String(item.uid), item] as const));
    const aliasByUid = new Map<string, GoogleAlias>();
    for (const alias of aliases) {
      if (!alias.uid) continue;
      aliasByUid.set(String(alias.uid), latestAlias(aliasByUid.get(String(alias.uid)), alias));
    }

    const googleEmailByHash = new Map<string, { email?: string; verified: boolean }>();
    const directGoogleByUid = new Map<string, { email?: string; verified: boolean }>();
    for (const authUser of authPage.users) {
      for (const provider of authUser.providerData) {
        if (provider.providerId !== "google.com" || !provider.uid) continue;
        const value = { email: provider.email ?? authUser.email, verified: authUser.emailVerified === true };
        googleEmailByHash.set(googleSubjectHash(provider.uid), value);
        directGoogleByUid.set(authUser.uid, value);
      }
    }

    const now = Date.now();
    const rawAccountRows = accounts.map(({ id, data: account }) => {
      const uid = String(account.uid ?? id);
      const summary = summaryByUid.get(uid);
      const row = summary?.row;
      const alias = aliasByUid.get(uid);
      const googleLinked = Boolean(alias || account.googleAccessConnectedAt);
      const linkedAt = alias?.linkedAt ?? account.googleAccessConnectedAt;
      const linkedTime = parsed(linkedAt);
      const lastSeenAt = row?.lastSeenAt ?? account.lastSeenAt;
      const lastSeenTime = parsed(lastSeenAt);
      const reviewCount = Math.max(0, Number(row?.reviewCount) || 0);
      const retentionDepth = Math.max(0, Number(summary?.validation?.retentionDepth) || 0);
      const latestPublishedTime = parsed(row?.latestReview?.publishedAt);
      const returnedAfterReview = Boolean(latestPublishedTime !== undefined && lastSeenTime !== undefined && lastSeenTime > latestPublishedTime + 5 * 60 * 1000);
      const googleIdentity = alias?.providerUidHash ? googleEmailByHash.get(alias.providerUidHash) : directGoogleByUid.get(uid);
      const preferredContactEmail = account.preferredContactMethod === "email" && account.preferredContactValue ? account.preferredContactValue : undefined;
      const emailUpdatesEnabled = Boolean((account.notificationPreferences?.email === true || account.betaContactConsent === true) && preferredContactEmail);
      const reviewOpened = Boolean(account.reviewEngagement?.latestOpenedAt);
      const latestReviewOpened = Boolean(row?.latestReview?.deskKey && account.reviewEngagement?.latestOpenedReviewKey === row.latestReview.deskKey);
      const historyDataPresent = Boolean(reviewCount > 0 || row?.forming || account.cadenceAnchor || account.currentEpisodeSummary);
      const postGoogleUse = Boolean(linkedTime !== undefined && lastSeenTime !== undefined && lastSeenTime > linkedTime + 1000);
      const privateUseConfirmed = Boolean(reviewCount > 0 || account.betaAgreementAcceptedAt || account.latestProgressCheckedAt || historyDataPresent || postGoogleUse);
      const accessPath = googleLinked
        ? "Google linked"
        : account.chessComOAuthLinkedAt
          ? "Chess.com verified access"
          : "Existing BoardSignal access";
      const activityStage = retentionDepth >= 2
        ? "Returned for another Review"
        : latestReviewOpened
          ? "Latest Review opened"
          : returnedAfterReview
            ? "Returned after latest Review"
            : reviewCount > 0
              ? "Review available"
              : historyDataPresent
                ? "History / Review data present"
                : privateUseConfirmed
                  ? "Private use confirmed"
                  : "Active account · no later-use signal";

      const activityTime = Math.max(lastSeenTime ?? 0, linkedTime ?? 0, parsed(row?.latestReview?.publishedAt) ?? 0);
      return {
        uid,
        playerId: Number(account.chessCom?.playerId ?? row?.playerId ?? alias?.playerId) || undefined,
        username: account.chessCom?.canonicalUsername ?? row?.username ?? alias?.canonicalUsername ?? "Unknown player",
        profileUrl: account.chessCom?.profileUrl ?? row?.profileUrl,
        accountStatus: account.accessStatus,
        accessPath,
        googleLinked,
        googleEmail: googleIdentity?.email,
        googleEmailVerified: googleIdentity?.verified === true,
        googleLinkedAt: linkedAt,
        preferredContactEmail,
        betaContactConsent: account.betaContactConsent === true,
        emailUpdatesEnabled,
        lastSeenAt,
        privateUseConfirmed,
        historyDataPresent,
        reviewCount,
        latestReview: row?.latestReview,
        reviewOpened,
        latestReviewOpened,
        latestReviewOpenedAt: account.reviewEngagement?.latestOpenedAt,
        returnedAfterReview,
        retentionDepth,
        forming: row?.forming === true,
        readyNotSeen: row?.readyNotSeen === true,
        activityStage,
        linkedLast24h: googleLinked && linkedTime !== undefined && now - linkedTime <= 24 * 60 * 60 * 1000,
        linkedLast7d: googleLinked && linkedTime !== undefined && now - linkedTime <= 7 * 24 * 60 * 60 * 1000,
        activityTime,
      };
    });

    // One stable Chess.com player ID is one BoardSignal player. Google/access/auth
    // records enrich that person and can never increase the player population.
    const validPlayerRows = rawAccountRows.filter((item) => Number.isSafeInteger(item.playerId) && Number(item.playerId) > 0);
    const unresolvedPlayerRecords = rawAccountRows.length - validPlayerRows.length;
    const canonicalByPlayerId = new Map<number, (typeof rawAccountRows)[number]>();

    for (const candidate of validPlayerRows) {
      const playerId = Number(candidate.playerId);
      const current = canonicalByPlayerId.get(playerId);
      if (!current) {
        canonicalByPlayerId.set(playerId, candidate);
        continue;
      }

      const currentScore = current.retentionDepth * 1000 + current.reviewCount * 100 + (current.historyDataPresent ? 50 : 0) + (current.privateUseConfirmed ? 20 : 0) + (current.preferredContactEmail ? 5 : 0);
      const candidateScore = candidate.retentionDepth * 1000 + candidate.reviewCount * 100 + (candidate.historyDataPresent ? 50 : 0) + (candidate.privateUseConfirmed ? 20 : 0) + (candidate.preferredContactEmail ? 5 : 0);
      const primary = candidateScore > currentScore ? candidate : current;
      const secondary = primary === candidate ? current : candidate;
      const latestReview = parsed(candidate.latestReview?.publishedAt) > parsed(current.latestReview?.publishedAt)
        ? candidate.latestReview
        : current.latestReview;
      const mergedRetentionDepth = Math.max(current.retentionDepth, candidate.retentionDepth);
      const mergedReviewCount = Math.max(current.reviewCount, candidate.reviewCount);
      const mergedHistoryData = current.historyDataPresent || candidate.historyDataPresent;
      const mergedPrivateUse = current.privateUseConfirmed || candidate.privateUseConfirmed;
      const mergedLatestReviewOpened = current.latestReviewOpened || candidate.latestReviewOpened;
      const mergedReturnedAfterReview = current.returnedAfterReview || candidate.returnedAfterReview;
      const mergedActivityStage = mergedRetentionDepth >= 2
        ? "Returned for another Review"
        : mergedLatestReviewOpened
          ? "Latest Review opened"
          : mergedReturnedAfterReview
            ? "Returned after latest Review"
            : mergedReviewCount > 0
              ? "Review available"
              : mergedHistoryData
                ? "History / Review data present"
                : mergedPrivateUse
                  ? "Private use confirmed"
                  : "Active account · no later-use signal";
      const mergedGoogleLinked = current.googleLinked || candidate.googleLinked;

      canonicalByPlayerId.set(playerId, {
        ...secondary,
        ...primary,
        playerId,
        accountStatus: current.accountStatus === "active" || candidate.accountStatus === "active" ? "active" : primary.accountStatus,
        accessPath: mergedGoogleLinked ? "Google linked" : primary.accessPath,
        googleLinked: mergedGoogleLinked,
        googleEmail: current.googleEmail ?? candidate.googleEmail,
        googleEmailVerified: current.googleEmailVerified || candidate.googleEmailVerified,
        googleLinkedAt: earliestIso(current.googleLinkedAt, candidate.googleLinkedAt),
        preferredContactEmail: primary.preferredContactEmail ?? secondary.preferredContactEmail,
        betaContactConsent: primary.betaContactConsent || secondary.betaContactConsent,
        emailUpdatesEnabled: primary.emailUpdatesEnabled || secondary.emailUpdatesEnabled,
        lastSeenAt: latestIso(current.lastSeenAt, candidate.lastSeenAt),
        privateUseConfirmed: mergedPrivateUse,
        historyDataPresent: mergedHistoryData,
        reviewCount: mergedReviewCount,
        latestReview,
        reviewOpened: current.reviewOpened || candidate.reviewOpened,
        latestReviewOpened: mergedLatestReviewOpened,
        latestReviewOpenedAt: latestIso(current.latestReviewOpenedAt, candidate.latestReviewOpenedAt),
        returnedAfterReview: mergedReturnedAfterReview,
        retentionDepth: mergedRetentionDepth,
        forming: current.forming || candidate.forming,
        readyNotSeen: current.readyNotSeen || candidate.readyNotSeen,
        activityStage: mergedActivityStage,
        linkedLast24h: current.linkedLast24h || candidate.linkedLast24h,
        linkedLast7d: current.linkedLast7d || candidate.linkedLast7d,
        activityTime: Math.max(current.activityTime, candidate.activityTime),
      });
    }

    const accountRows = [...canonicalByPlayerId.values()].sort((a, b) => b.activityTime - a.activityTime);
    const duplicateAccountRecords = Math.max(0, validPlayerRows.length - accountRows.length);

    const exceptionCases = summaries
      .filter((summary) => summary.active !== false && summary.row && ((summary.row.exceptionCount ?? 0) > 0 || summary.row.reviewCheckRequired === true))
      .map((summary) => {
        const row = summary.row!;
        const titles = Array.isArray(row.exceptionTitles) ? row.exceptionTitles.filter(Boolean) : [];
        const reviewCheckRequired = row.reviewCheckRequired === true;
        const category = exceptionCategory(reviewCheckRequired, titles);
        const reasons = [...(reviewCheckRequired ? ["Expected Review timing has passed without a ready/forming Review."] : []), ...titles];
        return {
          uid: String(summary.uid ?? ""),
          playerId: Number(row.playerId) || undefined,
          username: row.username ?? "Unknown player",
          profileUrl: row.profileUrl,
          category,
          reasons: reasons.length ? reasons : ["BoardSignal flagged this player for a system check."],
          nextAction: nextAction(category, reviewCheckRequired),
          currentState: row.currentState,
          lastSeenAt: row.lastSeenAt,
          nextDeskDueAt: row.nextDeskDueAt,
        };
      });

    const categoryCounts = new Map<string, number>();
    for (const item of exceptionCases) categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);

    return response({
      ok: true,
      intelligence: {
        generatedAt: new Date().toISOString(),
        partial,
        funnel: {
          totalPlayers: accountRows.length,
          sourceAccountRecords: rawAccountRows.length,
          duplicateAccountRecords,
          unresolvedPlayerRecords,
          googleLinked: accountRows.filter((item) => item.googleLinked).length,
          googleLinkedLast24h: accountRows.filter((item) => item.linkedLast24h).length,
          googleLinkedLast7d: accountRows.filter((item) => item.linkedLast7d).length,
          privateUseConfirmed: accountRows.filter((item) => item.privateUseConfirmed).length,
          historyDataPresent: accountRows.filter((item) => item.historyDataPresent).length,
          reviewAvailable: accountRows.filter((item) => item.reviewCount > 0).length,
          reviewOpened: accountRows.filter((item) => item.reviewOpened).length,
          latestReviewOpened: accountRows.filter((item) => item.latestReviewOpened).length,
          returnedAfterReview: accountRows.filter((item) => item.returnedAfterReview).length,
          r2Plus: accountRows.filter((item) => item.retentionDepth >= 2).length,
          reviewsForming: accountRows.filter((item) => item.forming).length,
          emailUpdatesEnabled: accountRows.filter((item) => item.emailUpdatesEnabled).length,
        },
        accounts: accountRows.map(({ activityTime, linkedLast24h, linkedLast7d, ...item }) => {
          void activityTime;
          void linkedLast24h;
          void linkedLast7d;
          return item;
        }),
        exceptions: {
          playersFlagged: exceptionCases.length,
          categories: [...categoryCounts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
          cases: exceptionCases,
        },
      },
    });
  } catch (error) {
    const classified = classifyBoardSignalHttpError(error);
    return response({ ok: false, code: classified.code, error: classified.message }, classified.status, classified.retryAfterSeconds);
  }
}
