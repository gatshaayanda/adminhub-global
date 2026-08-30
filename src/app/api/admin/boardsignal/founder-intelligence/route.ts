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
  betaAgreementAcceptedAt?: string;
  lastSeenAt?: string;
  cadenceAnchor?: string;
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

function googleSubjectHash(providerSubject: string) {
  return createHash("sha256").update(`boardsignal-google:${providerSubject}`).digest("hex");
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
      db.collection("users").limit(MAX_ROWS + 1).get(),
      getAdminAuth().listUsers(1000),
    ]);

    const partial = aliasesSnapshot.size > MAX_ROWS || summariesSnapshot.size > MAX_ROWS || accountsSnapshot.size > MAX_ROWS || Boolean(authPage.pageToken);
    const aliases = aliasesSnapshot.docs.slice(0, MAX_ROWS).map((document) => document.data() as GoogleAlias);
    const summaries = summariesSnapshot.docs.slice(0, MAX_ROWS).map((document) => document.data() as FounderSummary);
    const accounts = accountsSnapshot.docs.slice(0, MAX_ROWS)
      .map((document) => ({ id: document.id, data: document.data() as AccountData }))
      .filter(({ data }) => data.role === "player");

    const summaryByUid = new Map(summaries.filter((item) => item.uid).map((item) => [String(item.uid), item] as const));
    const accountByUid = new Map(accounts.map(({ id, data }) => [String(data.uid ?? id), data] as const));
    const googleEmailByHash = new Map<string, { email?: string; verified: boolean }>();

    for (const authUser of authPage.users) {
      for (const provider of authUser.providerData) {
        if (provider.providerId !== "google.com" || !provider.uid) continue;
        googleEmailByHash.set(googleSubjectHash(provider.uid), {
          email: provider.email ?? authUser.email,
          verified: authUser.emailVerified === true,
        });
      }
    }

    const now = Date.now();
    const linkedAccounts = aliases.map((alias) => {
      const uid = String(alias.uid ?? "");
      const account = accountByUid.get(uid);
      const summary = summaryByUid.get(uid);
      const row = summary?.row;
      const linkedAt = alias.linkedAt ?? account?.googleAccessConnectedAt;
      const lastSeenAt = row?.lastSeenAt ?? account?.lastSeenAt;
      const linkedTime = parsed(linkedAt);
      const lastSeenTime = parsed(lastSeenAt);
      const agreementTime = parsed(account?.betaAgreementAcceptedAt);
      const latestPublishedTime = parsed(row?.latestReview?.publishedAt);
      const playerRoomUsed = Boolean(
        agreementTime
        || (linkedTime !== undefined && lastSeenTime !== undefined && lastSeenTime > linkedTime + 1000),
      );
      const reviewCount = Math.max(0, Number(row?.reviewCount) || 0);
      const returnedAfterReview = Boolean(
        latestPublishedTime !== undefined
        && lastSeenTime !== undefined
        && lastSeenTime > latestPublishedTime + 5 * 60 * 1000,
      );
      const retentionDepth = Math.max(0, Number(summary?.validation?.retentionDepth) || 0);
      const email = alias.providerUidHash ? googleEmailByHash.get(alias.providerUidHash) : undefined;
      const emailUpdatesEnabled = account?.notificationPreferences?.email === true || account?.betaContactConsent === true;
      const reviewOpened = Boolean(account?.reviewEngagement?.latestOpenedAt);
      const latestReviewOpened = Boolean(
        row?.latestReview?.deskKey
        && account?.reviewEngagement?.latestOpenedReviewKey === row.latestReview.deskKey,
      );
      const activityStage = retentionDepth >= 2
        ? "Returned for another Review"
        : latestReviewOpened
          ? "Latest Review opened"
          : returnedAfterReview
            ? "Returned after latest Review"
            : reviewCount > 0
              ? "Review available"
              : playerRoomUsed
                ? "Player Room used"
                : "Claimed only";

      return {
        uid,
        playerId: Number(alias.playerId ?? row?.playerId ?? account?.chessCom?.playerId) || undefined,
        username: alias.canonicalUsername ?? row?.username ?? account?.chessCom?.canonicalUsername ?? "Unknown player",
        profileUrl: row?.profileUrl ?? account?.chessCom?.profileUrl,
        email: email?.email,
        emailVerified: email?.verified === true,
        linkedAt,
        lastSeenAt,
        playerRoomUsed,
        reviewCount,
        latestReview: row?.latestReview,
        reviewOpened,
        latestReviewOpened,
        latestReviewOpenedAt: account?.reviewEngagement?.latestOpenedAt,
        returnedAfterReview,
        retentionDepth,
        forming: row?.forming === true,
        readyNotSeen: row?.readyNotSeen === true,
        activityStage,
        emailUpdatesEnabled,
        betaContactConsent: account?.betaContactConsent === true,
        preferredContactMethod: account?.preferredContactMethod,
        preferredContactValue: account?.preferredContactValue,
        accountStatus: account?.accessStatus,
        claimedLast24h: linkedTime !== undefined && now - linkedTime <= 24 * 60 * 60 * 1000,
        claimedLast7d: linkedTime !== undefined && now - linkedTime <= 7 * 24 * 60 * 60 * 1000,
      };
    }).sort((a, b) => String(b.linkedAt ?? "").localeCompare(String(a.linkedAt ?? "")));

    const exceptionCases = summaries
      .filter((summary) => summary.active !== false && summary.row && ((summary.row.exceptionCount ?? 0) > 0 || summary.row.reviewCheckRequired === true))
      .map((summary) => {
        const row = summary.row!;
        const titles = Array.isArray(row.exceptionTitles) ? row.exceptionTitles.filter(Boolean) : [];
        const reviewCheckRequired = row.reviewCheckRequired === true;
        const category = exceptionCategory(reviewCheckRequired, titles);
        const reasons = [
          ...(reviewCheckRequired ? ["Expected Review timing has passed without a ready/forming Review."] : []),
          ...titles,
        ];
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
          googleClaimed: linkedAccounts.length,
          claimedLast24h: linkedAccounts.filter((item) => item.claimedLast24h).length,
          claimedLast7d: linkedAccounts.filter((item) => item.claimedLast7d).length,
          playerRoomUsed: linkedAccounts.filter((item) => item.playerRoomUsed).length,
          reviewAvailable: linkedAccounts.filter((item) => item.reviewCount > 0).length,
          reviewOpened: linkedAccounts.filter((item) => item.reviewOpened).length,
          latestReviewOpened: linkedAccounts.filter((item) => item.latestReviewOpened).length,
          returnedAfterReview: linkedAccounts.filter((item) => item.returnedAfterReview).length,
          r2Plus: linkedAccounts.filter((item) => item.retentionDepth >= 2).length,
          reviewsForming: linkedAccounts.filter((item) => item.forming).length,
          emailUpdatesEnabled: linkedAccounts.filter((item) => item.emailUpdatesEnabled).length,
        },
        accounts: linkedAccounts,
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
