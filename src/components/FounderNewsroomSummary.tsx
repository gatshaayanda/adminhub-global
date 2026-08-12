"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

type Summary = {
  activeFoundingBetaPlayers: number;
  pendingAccessRequests: number;
  desksForming: number;
  desksReady: number;
  playersNotSeenRecently: number;
  unreadPlayerReplies: number;
  latestUniverseAchievements: Array<{ id: string; username?: string; headline?: string; periodLabel?: string }>;
  recentExceptions: Array<{ id: string; title?: string; message?: string; createdAt?: string }>;
};

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
    ["Active beta players", summary.activeFoundingBetaPlayers],
    ["Pending access", summary.pendingAccessRequests],
    ["Desks forming", summary.desksForming],
    ["Desks ready", summary.desksReady],
    ["Not seen recently", summary.playersNotSeenRecently],
    ["Unread replies", summary.unreadPlayerReplies],
  ];
  return <><div className="admin-metrics newsroom-metrics">{metrics.map(([label, value], index) => <div className={`metric-card ${index === 0 ? "lime" : index === 3 ? "blue" : ""}`} key={String(label)}><span>{label}</span><strong>{value}</strong><p>Founding Beta operations</p></div>)}</div><div className="newsroom-brief-grid"><section className="desk-section"><p className="kicker">LATEST UNIVERSE ACHIEVEMENTS</p><h2>Safe public coverage</h2>{summary.latestUniverseAchievements.length ? <div className="newsroom-brief-list">{summary.latestUniverseAchievements.map((item) => <article key={item.id}><strong>{item.username ?? "Player"}</strong><p>{item.headline ?? "Safe Universe coverage"}</p><span>{item.periodLabel ?? "Latest completed Desk"}</span></article>)}</div> : <div className="universe-empty"><p>No recent Universe coverage.</p></div>}</section><section className="desk-section"><p className="kicker">RECENT EXCEPTIONS</p><h2>Needs founder attention</h2>{summary.recentExceptions.length ? <div className="newsroom-brief-list">{summary.recentExceptions.map((item) => <article key={item.id}><strong>{item.title ?? "BoardSignal exception"}</strong><p>{item.message ?? "Review in Exceptions."}</p><span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Recent"}</span></article>)}</div> : <div className="universe-empty"><p>No recent exceptions recorded.</p></div>}</section></div></>;
}
