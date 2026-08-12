import "server-only";

import type { BoardSignalAccount } from "../account";
import { rankWhatsHot, type PublicUniverseEvent, type SafeShareMoment } from "../pulse";
import { getAdminDb } from "../../../utils/firebaseAdmin";
import { founderGuideSummary } from "./guide";

export async function founderNewsroomSummary() {
  const db = getAdminDb();
  const [users, betaRequests, coverage, exceptions, universeEvents, shareMoments] = await Promise.all([
    db.collection("users").get(),
    db.collection("betaRequests").get(),
    db.collection("publicCoverage").orderBy("periodEnd", "desc").limit(8).get(),
    db.collection("exceptions").orderBy("createdAt", "desc").limit(8).get().catch(() => ({ docs: [] })),
    db.collection("publicUniverseEvents").orderBy("publishedAt", "desc").limit(40).get().catch(() => ({ docs: [] })),
    db.collection("publicShareMoments").orderBy("periodEnd", "desc").limit(12).get().catch(() => ({ docs: [] })),
  ]);
  const accounts = users.docs.map((document) => document.data() as BoardSignalAccount)
    .filter((account) => account.role === "player" && account.accessTier === "founding_beta" && account.accessStatus === "active");
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let desksReady = 0;
  let unreadReplies = 0;
  const latestCompletedDesks: Array<{ username: string; deskKey?: string; periodLabel?: string; periodEnd?: string; publishedAt?: string }> = [];
  for (const account of accounts) {
    const latestDesk = await db.collection("users").doc(account.uid).collection("desks").orderBy("periodEnd", "desc").limit(1).get();
    const desk = latestDesk.docs[0]?.data() as { deskKey?: string; summary?: { periodLabel?: string; periodEnd?: string }; periodEnd?: string; publishedAt?: string } | undefined;
    if (desk?.publishedAt && (!account.lastSeenAt || account.lastSeenAt < desk.publishedAt)) desksReady += 1;
    if (desk) latestCompletedDesks.push({ username: account.chessCom.canonicalUsername, deskKey: desk.deskKey, periodLabel: desk.summary?.periodLabel, periodEnd: desk.summary?.periodEnd ?? desk.periodEnd, publishedAt: desk.publishedAt });
    const threads = await db.collection("users").doc(account.uid).collection("conversations").where("unreadForFounder", "==", true).get();
    unreadReplies += threads.size;
  }
  latestCompletedDesks.sort((a, b) => String(b.periodEnd ?? "").localeCompare(String(a.periodEnd ?? "")));
  const events = universeEvents.docs.map((document) => document.data() as PublicUniverseEvent).filter((event) => event.safePublic === true);
  const newPlayers = events.filter((event) => event.eventType === "new_player").slice(0, 8);
  const newTop3 = events.filter((event) => ["new_leader", "entered_top3", "podium_move"].includes(event.eventType)).slice(0, 8);
  const askBoardSignal = await founderGuideSummary().catch(() => ({ usage: 0, topQuestionCategories: [], unresolvedSupportHandoffs: 0, recentFeedbackCount: 0, relationshipPulse: [] }));
  return {
    askBoardSignal,
    activeFoundingBetaPlayers: accounts.length,
    pendingAccessRequests: betaRequests.docs.filter((document) => document.data().status === "pending").length,
    desksForming: accounts.filter((account) => account.currentEpisodeSummary?.status === "forming").length,
    desksReady,
    playersNotSeenRecently: accounts.filter((account) => !account.lastSeenAt || Date.parse(account.lastSeenAt) < cutoff).length,
    unreadPlayerReplies: unreadReplies,
    latestUniverseAchievements: coverage.docs.map((document) => ({ id: document.id, ...document.data() })),
    recentExceptions: exceptions.docs.map((document) => ({ id: document.id, ...document.data() })),
    newPlayers,
    latestCompletedDesks: latestCompletedDesks.slice(0, 8),
    newTop3,
    whatsHot: rankWhatsHot(events).slice(0, 8),
    recentShareMoments: shareMoments.docs.map((document) => ({ ...(document.data() as SafeShareMoment), id: document.id })).slice(0, 8),
    recentUniverseMovement: events.slice(0, 10),
  };
}
