"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { BarChart3, CalendarDays, Inbox, ShieldCheck, Swords, TrendingUp, WifiOff } from "lucide-react";
import UniversalPlayerDesk from "@/components/UniversalPlayerDesk";
import { loadPlayerRoomOfflineSnapshot, loadSocialOfflineSnapshot } from "@/lib/boardsignal/offline/snapshots";
import type { OfflinePlayerRoomSnapshot, OfflineSocialSnapshot } from "@/lib/boardsignal/offline/types";
import { auth } from "@/utils/firebaseConfig";
import { BOARDSIGNAL_RECONNECTED_EVENT } from "@/lib/boardsignal/offline/connectivity";

type OfflineTab = "desk" | "progress" | "pulse" | "universe" | "friends";

function savedLabel(value: string) {
  try { return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
  catch { return value; }
}

export default function OfflinePlayerRoom({ uid: suppliedUid, initialSnapshot, embedded = false }: { uid?: string; initialSnapshot?: OfflinePlayerRoomSnapshot; embedded?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(Boolean(suppliedUid));
  const [snapshot, setSnapshot] = useState<OfflinePlayerRoomSnapshot | null>(initialSnapshot ?? null);
  const [social, setSocial] = useState<OfflineSocialSnapshot | null>(null);
  const [tab, setTab] = useState<OfflineTab>("desk");
  const [selectedDeskKey, setSelectedDeskKey] = useState(initialSnapshot?.desks[0]?.summary.deskKey ?? "");
  const uid = suppliedUid ?? user?.uid;

  useEffect(() => {
    if (suppliedUid) return;
    return onAuthStateChanged(auth, (active) => { setUser(active); setAuthReady(true); });
  }, [suppliedUid]);

  useEffect(() => {
    if (!uid) { setSnapshot(null); setSocial(null); return; }
    if (initialSnapshot?.uid === uid) setSnapshot(initialSnapshot);
    else void loadPlayerRoomOfflineSnapshot(uid).then((value) => setSnapshot(value ?? null)).catch(() => setSnapshot(null));
    void loadSocialOfflineSnapshot(uid).then((value) => setSocial(value ?? null)).catch(() => setSocial(null));
  }, [initialSnapshot, uid]);

  useEffect(() => { if (snapshot?.desks[0] && !selectedDeskKey) setSelectedDeskKey(snapshot.desks[0].summary.deskKey); }, [selectedDeskKey, snapshot]);

  useEffect(() => {
    if (embedded) return;
    const recover = () => {
      try { window.sessionStorage.setItem("boardsignal:pwa-recovery-refresh", "1"); } catch { /* optional acknowledgement */ }
      window.location.replace("/boardsignal/player-room");
    };
    window.addEventListener(BOARDSIGNAL_RECONNECTED_EVENT, recover);
    return () => window.removeEventListener(BOARDSIGNAL_RECONNECTED_EVENT, recover);
  }, [embedded]);

  const selectedDesk = useMemo(() => snapshot?.desks.find((item) => item.summary.deskKey === selectedDeskKey) ?? snapshot?.desks[0], [selectedDeskKey, snapshot]);

  if (!authReady) return <div className="container offline-player-room-loading"><span className="button-spinner"/> Opening your saved BoardSignal…</div>;
  if (!uid) return <div id="main" className="container offline-player-room-empty"><WifiOff size={24}/><p className="kicker">BOARDSIGNAL OFFLINE</p><h1>Your saved Player Room needs the same signed-in account.</h1><p>Signing in and Beta Access verification need a connection. Reconnect, sign in once, and BoardSignal can keep your own saved Desk available on this device.</p></div>;
  if (!snapshot || snapshot.uid !== uid) return <div id="main" className="container offline-player-room-empty"><WifiOff size={24}/><p className="kicker">BOARDSIGNAL OFFLINE</p><h1>No BoardSignal has been saved for this account on this device yet.</h1><p>Reconnect and open My Player Room once. BoardSignal will save a bounded offline copy for this Firebase account.</p></div>;

  return <div id="main" className={`offline-player-room ${embedded ? "is-embedded" : ""}`}>
    <header className="container offline-room-identity"><div className="universal-avatar">{snapshot.canonicalUsername.slice(0,2).toUpperCase()}</div><div><span>MY PLAYER ROOM · SAVED</span><h1>{snapshot.canonicalUsername}</h1><p><WifiOff size={14}/> Offline • showing your saved BoardSignal from {savedLabel(snapshot.lastSyncedAt)}</p></div></header>
    <div className="container offline-room-truth"><strong>You're offline.</strong><span>New Chess.com games, Pulse movement, messages and account changes will appear after you reconnect.</span></div>
    <nav className="container offline-room-tabs" aria-label="Saved Player Room">{(["desk","progress","pulse","universe","friends"] as OfflineTab[]).map((item) => <button type="button" key={item} className={tab===item?"active":""} onClick={() => setTab(item)} aria-current={tab===item?"page":undefined}>{item === "desk" ? "Desk" : item === "progress" ? "Progress" : item === "pulse" ? "Pulse" : item === "universe" ? "Universe" : "Friends"}</button>)}</nav>

    {tab === "desk" ? <>
      <div className="container player-room-memory offline-desk-controls">
        <div><p className="kicker">SAVED DESKS</p><h2>Latest four active Desks</h2><p>Last synchronized {savedLabel(snapshot.lastSyncedAt)}. This does not update while offline.</p></div>
        {snapshot.desks.length > 1 ? <div className="offline-desk-picker">{snapshot.desks.map((item, index) => <button type="button" key={item.summary.deskKey} className={selectedDesk?.summary.deskKey === item.summary.deskKey ? "active" : ""} onClick={() => setSelectedDeskKey(item.summary.deskKey)}><span>Desk {snapshot.desks.length-index}</span><strong>{item.summary.periodLabel}</strong></button>)}</div> : null}
        {snapshot.currentEpisode ? <section className="offline-forming-snapshot"><CalendarDays size={18}/><div><strong>Current episode — saved snapshot</strong><p>{snapshot.currentEpisode.periodLabel} · {snapshot.currentEpisode.games} games · {snapshot.currentEpisode.wins}W {snapshot.currentEpisode.draws}D {snapshot.currentEpisode.losses}L</p><small>Latest available data when last synchronized. No new episode analysis runs offline.</small></div></section> : null}
      </div>
      {selectedDesk ? <UniversalPlayerDesk requestedUsername={selectedDesk.desk.player.username} publishedDesk={selectedDesk.desk} publishedEngineResults={selectedDesk.engineResults}/> : <div className="container offline-empty-card">No completed Desk was saved yet.</div>}
    </> : null}

    {tab === "progress" ? <div className="container player-room-memory"><section className="my-progress-section"><div className="universal-section-heading"><span><TrendingUp size={16}/></span><div><p className="kicker">PROGRESS · SAVED</p><h2>Your recent-four snapshot.</h2><p>Saved {savedLabel(snapshot.lastSyncedAt)}. Old Desks still leave this view when the online recent-four window advances.</p></div></div><div className="desk-sequence">{[...snapshot.desks].reverse().map((item,index) => <article key={item.summary.deskKey}><span>DESK {index+1}</span><strong>{item.summary.periodLabel}</strong><p>{item.summary.games} games · {item.summary.scorePct.toFixed(1)}%</p></article>)}</div>{snapshot.progress.map((series) => <div className="pool-progress" key={series.pool}><h3>{series.pool} progress</h3><div>{series.points.length ? <article><span>Saved score movement</span><strong>{series.points.map((point) => `${point.scorePct}%`).join(" → ")}</strong></article> : null}{series.points.filter((point)=>point.ratingDelta!==undefined).length ? <article><span>Saved rating movement</span><strong>{series.points.filter((point)=>point.ratingDelta!==undefined).map((point)=>`${Number(point.ratingDelta)>=0?"+":""}${point.ratingDelta}`).join(" → ")}</strong></article> : null}</div></div>)}<div className="personal-record-strip"><BarChart3 size={18}/><div><span>Saved personal record</span><strong>{snapshot.personalRecords.personalBestWinRun} straight wins</strong></div><div><span>Desks completed</span><strong>{snapshot.personalRecords.desksCompleted}</strong></div></div></section></div> : null}

    {tab === "pulse" ? <div className="container player-room-memory"><section className="pulse-universe-block"><div className="pulse-block-heading"><div><p className="kicker">PULSE · LAST SYNCHRONIZED</p><h2>{savedLabel(snapshot.pulse?.checkedAt ?? snapshot.lastSyncedAt)}</h2></div><span>Offline snapshot</span></div>{snapshot.pulse ? <div className="offline-pulse-list">{snapshot.pulse.sinceAway ? <article><span>{snapshot.pulse.sinceAway.eyebrow}</span><h3>{snapshot.pulse.sinceAway.title}</h3><p>{snapshot.pulse.sinceAway.body}</p></article> : null}{[...snapshot.pulse.boardMoved,...snapshot.pulse.proximity,...snapshot.pulse.provisional].slice(0,8).map((item) => <article key={item.id}><span>{item.eyebrow} · {item.finality}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div> : <div className="offline-empty-card">No Pulse snapshot was saved yet. Pulse does not move while offline.</div>}</section></div> : null}

    {tab === "universe" ? <div className="container player-room-memory"><section className="pulse-universe-block"><div className="pulse-block-heading"><div><p className="kicker">UNIVERSE · OFFLINE SNAPSHOT</p><h2>Saved at {savedLabel(snapshot.lastSyncedAt)}</h2></div><span>Not live</span></div>{snapshot.pulse?.whatsHot?.length ? <><h3>What's Hot — saved</h3><div className="universe-now-grid">{snapshot.pulse.whatsHot.slice(0,6).map((event) => <article key={event.eventId}><span>{event.eventType.replaceAll("_"," ")}</span><h3>{event.headline}</h3><p>{event.supportingFact}</p></article>)}</div></> : null}{snapshot.pulse?.standings?.length ? <><h3>Saved official standings</h3><div className="universe-standing-grid">{snapshot.pulse.standings.slice(0,8).map((standing) => <article key={`${standing.categoryId}:${standing.scopeLabel??"all"}`}><span>{standing.categoryTitle}{standing.scopeLabel?` · ${standing.scopeLabel}`:""}</span><strong>#{standing.rank} of {standing.denominator}</strong><p>{standing.label ?? standing.valueLabel}</p></article>)}</div></> : <div className="offline-empty-card">No safe Universe snapshot was saved yet.</div>}</section></div> : null}

    {tab === "friends" ? <div className="container player-room-memory"><section className="social-panel"><div className="social-panel-heading"><div><p className="kicker">FRIENDS · SAVED</p><h2>Read-only while offline</h2></div>{social?.savedAt ? <span>Saved {savedLabel(social.savedAt)}</span> : null}</div><div className="offline-social-rule"><ShieldCheck size={17}/><p>Reconnect to add, accept, decline, cancel, unfriend, block or change Rival Watch.</p></div>{social?.overview?.friends?.length ? <div className="friend-card-grid">{social.overview.friends.map((friend) => <article className="friend-card" key={friend.playerId}><div className="friend-card-ident"><div className="social-avatar">{friend.canonicalUsername.slice(0,2).toUpperCase()}</div><div><span>FRIEND · SAVED</span><h3>{friend.canonicalUsername}</h3></div></div><div className="friend-card-facts">{friend.latestDeskPeriod?<p><strong>Latest Desk</strong>{friend.latestDeskPeriod}</p>:null}{friend.universePlacement?<p><strong>Universe</strong>{friend.universePlacement}</p>:null}{friend.safeHighlight?<p><strong>Recent moment</strong>{friend.safeHighlight}</p>:null}</div></article>)}</div> : <div className="offline-empty-card">No Friends snapshot was saved. Open Friends online once to make recent comparison context available offline.</div>}{social?.comparisons?.length ? <div className="offline-comparisons"><p className="kicker">SAVED HEAD-TO-HEAD</p>{social.comparisons.map((comparison) => <article key={comparison.right.playerId}><Swords size={16}/><div><strong>{comparison.left.canonicalUsername} vs {comparison.right.canonicalUsername}</strong><p>{comparison.metrics.slice(0,3).map((metric)=>`${metric.label}: ${metric.leftValue} vs ${metric.rightValue}`).join(" · ") || "No comparable pool sample."}</p></div></article>)}</div> : null}<div className="inbox-empty"><Inbox size={20}/><div><strong>Inbox needs a connection.</strong><p>BoardSignal does not save your full private message history offline by default.</p></div></div></section></div> : null}
  </div>;
}
