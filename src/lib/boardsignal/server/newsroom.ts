import "server-only";

import type { BoardSignalAccount } from "../account";
import { getAdminDb } from "../../../utils/firebaseAdmin";

export async function founderNewsroomSummary() {
  const db = getAdminDb();
  const [users, betaRequests, coverage, exceptions] = await Promise.all([
    db.collection("users").get(),
    db.collection("betaRequests").get(),
    db.collection("publicCoverage").orderBy("periodEnd", "desc").limit(8).get(),
    db.collection("exceptions").orderBy("createdAt", "desc").limit(8).get().catch(() => ({ docs: [] })),
  ]);
  const accounts = users.docs.map((document) => document.data() as BoardSignalAccount)
    .filter((account) => account.role === "player" && account.accessTier === "founding_beta" && account.accessStatus === "active");
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let desksReady = 0;
  let unreadReplies = 0;
  for (const account of accounts) {
    const latestDesk = await db.collection("users").doc(account.uid).collection("desks").orderBy("periodEnd", "desc").limit(1).get();
    const desk = latestDesk.docs[0]?.data() as { publishedAt?: string } | undefined;
    if (desk?.publishedAt && (!account.lastSeenAt || account.lastSeenAt < desk.publishedAt)) desksReady += 1;
    const threads = await db.collection("users").doc(account.uid).collection("conversations").where("unreadForFounder", "==", true).get();
    unreadReplies += threads.size;
  }
  return {
    activeFoundingBetaPlayers: accounts.length,
    pendingAccessRequests: betaRequests.docs.filter((document) => document.data().status === "pending").length,
    desksForming: accounts.filter((account) => account.currentEpisodeSummary?.status === "forming").length,
    desksReady,
    playersNotSeenRecently: accounts.filter((account) => !account.lastSeenAt || Date.parse(account.lastSeenAt) < cutoff).length,
    unreadPlayerReplies: unreadReplies,
    latestUniverseAchievements: coverage.docs.map((document) => ({ id: document.id, ...document.data() })),
    recentExceptions: exceptions.docs.map((document) => ({ id: document.id, ...document.data() })),
  };
}
