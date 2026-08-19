"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { boardSignalPresentationLabel } from "@/lib/boardsignal/presentationLanguage";

type EventItem = { eventId?: string; canonicalUsername?: string; headline?: string; supportingFact?: string; publishedAt?: string; eventType?: string };
type Summary = {
  deliveryStatus: { inApp: true; browserPushConfigured: boolean; emailConfigured: boolean; emailProvider: "resend" | "none"; registeredDevices: number };
  activeFoundingBetaPlayers: number;
  pendingAccessRequests: number;
  desksForming: number;
  desksReady: number;
  playersNotSeenRecently: number;
  unreadPlayerReplies: number;
  latestUniverseAchievements: Array<{ id: string; username?: string; headline?: string; periodLabel?: string }>;
  recentExceptions: Array<{ id: string; title?: string; message?: string; createdAt?: string }>;
  newPlayers: EventItem[];
  latestCompletedDesks: Array<{ username: string; deskKey?: string; periodLabel?: string; periodEnd?: string; publishedAt?: string }>;
  newTop3: EventItem[];
  whatsHot: EventItem[];
  recentShareMoments: Array<{ id: string; canonicalUsername?: string; headline?: string; statValue?: string; statLabel?: string; periodLabel?: string }>;
  recentUniverseMovement: EventItem[];
  askBoardSignal: {
    usage: number;
    topQuestionCategories: Array<{ category: string; count: number }>;
    unresolvedSupportHandoffs: number;
    recentFeedbackCount: number;
    relationshipPulse: Array<{ username?: string; expressedSentiment?: string; engagement?: string; oftenAsksAbout?: string[]; preferredCommunication?: string; openSupportIssue?: string; lastAskBoardSignalInteraction?: string; recommendedFounderContext?: string }>;
  };
};

function BriefList({ title, items, empty }: { title: string; items: Array<{ id: string; name: string; headline: string; meta?: string }>; empty: string }) {
  return <section className="desk-section"><p className="kicker">{title}</p>{items.length ? <div className="newsroom-brief-list">{items.map((item) => <article key={item.id}><strong>{item.name}</strong><p>{item.headline}</p><span>{item.meta ?? "Recent"}</span></article>)}</div> : <div className="universe-empty"><p>{empty}</p></div>}</section>;
}

export default function FounderNewsroomSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/boardsignal/newsroom", { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json() as { ok: boolean; summary?: Summary; error?: string } }))
      .then(({ response, body }) => { if (!response.ok || !body.ok || !body.summary) throw new Error(body.error ?? "Newsroom summary unavailable."); setSummary(body.summary); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Newsroom summary unavailable."));
  }, []);
  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!summary) return <div className="founder-directory-loading"><LoaderCircle className="button-spinner" /> Loading Founder Newsroom</div>;
  const metrics = [
    ["Active players", summary.activeFoundingBetaPlayers],
    ["NEW REQUESTS", summary.pendingAccessRequests],
    ["Reviews forming", summary.desksForming],
    ["Reviews ready", summary.desksReady],
    ["Not seen recently", summary.playersNotSeenRecently],
    ["Unread replies", summary.unreadPlayerReplies],
  ];
  return <>
    <div className="admin-metrics newsroom-metrics">{metrics.map(([label, value], index) => <div className={`metric-card ${index === 0 ? "lime" : index === 3 ? "blue" : ""}`} key={String(label)}><span>{label}</span><strong>{value}</strong><p>BoardSignal operations</p></div>)}</div>
    <div className="newsroom-live-actions"><Link href="/admin/players" className="button button-lime">{summary.pendingAccessRequests ? `${summary.pendingAccessRequests} New Request${summary.pendingAccessRequests === 1 ? "" : "s"}` : "Open Players"}</Link><Link href="/admin/coverage" className="button button-outline">Open Coverage Editor</Link><Link href="/admin/communications" className="button button-outline">Open Communications</Link></div>
    <section className="desk-section founder-delivery-status"><p className="kicker">DELIVERY STATUS</p><h2>How BoardSignal can reach players.</h2><div className="delivery-status-grid"><article><span>In-app Inbox</span><strong>READY</strong><p>Core private delivery stays available without external providers.</p></article><article><span>Browser Push</span><strong>{summary.deliveryStatus.browserPushConfigured ? "READY" : "CONFIGURATION REQUIRED"}</strong><p>{summary.deliveryStatus.registeredDevices} registered device{summary.deliveryStatus.registeredDevices === 1 ? "" : "s"}</p></article><article><span>Email</span><strong>{summary.deliveryStatus.emailConfigured ? "READY" : "CONFIGURATION REQUIRED"}</strong><p>{summary.deliveryStatus.emailConfigured ? "Resend configured" : "Optional provider is not active"}</p></article></div></section>
    <section className="desk-section founder-guide-section"><p className="kicker">ASK BOARDSIGNAL</p><h2>What players are trying to understand.</h2><div className="founder-guide-grid"><article className="founder-guide-card"><h3>Usage & confusion</h3><p>{summary.askBoardSignal.usage} recent guide interactions · {summary.askBoardSignal.unresolvedSupportHandoffs} unresolved support handoffs · {summary.askBoardSignal.recentFeedbackCount} feedback responses.</p><div className="guide-category-list">{summary.askBoardSignal.topQuestionCategories.length ? summary.askBoardSignal.topQuestionCategories.map((item) => <article key={item.category}><span>{boardSignalPresentationLabel(item.category)}</span><strong>{item.count}</strong></article>) : <p>No guide question categories recorded yet.</p>}</div></article><article className="founder-guide-card"><h3>Player Relationship Pulse</h3><p>Descriptive support context only. No psychological profiling or vulnerability scoring.</p><div className="relationship-pulse-list">{summary.askBoardSignal.relationshipPulse.length ? summary.askBoardSignal.relationshipPulse.slice(0,5).map((item) => <article key={item.username}><strong>{item.username}</strong><span>{item.engagement} · expressed {item.expressedSentiment}</span><p>Often asks about: {(item.oftenAsksAbout ?? []).map((value) => value.replaceAll("_", " ")).join(", ") || "No pattern yet"}</p><p>Preferred: {item.preferredCommunication}</p><p>Support: {item.openSupportIssue}</p><p>{item.recommendedFounderContext}</p></article>) : <p>No relationship Pulse summaries yet.</p>}</div></article></div></section>
    <div className="newsroom-brief-grid newsroom-pulse-grid">
      <BriefList title="NEW PLAYERS" empty="No new Universe entrants yet." items={summary.newPlayers.map((item, i) => ({ id: item.eventId ?? `new-${i}`, name: item.canonicalUsername ?? "Player", headline: item.headline ?? "Entered the BoardSignal Universe", meta: item.publishedAt ? new Date(item.publishedAt).toLocaleString() : undefined }))} />
      <BriefList title="LATEST COMPLETED REVIEWS" empty="No completed live Reviews yet." items={summary.latestCompletedDesks.map((item, i) => ({ id: item.deskKey ?? `desk-${i}`, name: item.username, headline: item.periodLabel ?? "Completed seven-day Review", meta: item.publishedAt ? new Date(item.publishedAt).toLocaleString() : item.periodEnd }))} />
      <BriefList title="NEW TOP 3" empty="No new Top 3 movement yet." items={summary.newTop3.map((item, i) => ({ id: item.eventId ?? `top-${i}`, name: item.canonicalUsername ?? "Player", headline: item.headline ?? "Top 3 movement", meta: item.supportingFact }))} />
      <BriefList title="WHAT'S HOT" empty="No current hot events yet." items={summary.whatsHot.map((item, i) => ({ id: item.eventId ?? `hot-${i}`, name: item.canonicalUsername ?? "Player", headline: item.headline ?? "Universe movement", meta: item.supportingFact }))} />
      <BriefList title="RECENT SHARE MOMENTS" empty="No Share Moments generated yet." items={summary.recentShareMoments.map((item) => ({ id: item.id, name: item.canonicalUsername ?? "Player", headline: item.headline ?? "Share Moment", meta: `${item.statValue ?? ""} ${item.statLabel ?? item.periodLabel ?? ""}`.trim() }))} />
      <BriefList title="RECENT UNIVERSE MOVEMENT" empty="No recent Universe movement yet." items={summary.recentUniverseMovement.map((item, i) => ({ id: item.eventId ?? `move-${i}`, name: item.canonicalUsername ?? "Player", headline: item.headline ?? "Universe movement", meta: item.supportingFact }))} />
      <BriefList title="LATEST UNIVERSE ACHIEVEMENTS" empty="No recent Universe coverage." items={summary.latestUniverseAchievements.map((item) => ({ id: item.id, name: item.username ?? "Player", headline: item.headline ?? "Safe Universe coverage", meta: item.periodLabel ?? "Latest completed Review" }))} />
      <BriefList title="RECENT EXCEPTIONS" empty="No recent exceptions recorded." items={summary.recentExceptions.map((item) => ({ id: item.id, name: item.title ?? "BoardSignal exception", headline: item.message ?? "Review in Exceptions.", meta: item.createdAt ? new Date(item.createdAt).toLocaleString() : "Recent" }))} />
    </div>
  </>;
}
