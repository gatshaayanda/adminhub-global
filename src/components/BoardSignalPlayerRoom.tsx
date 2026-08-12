"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { BarChart3, CalendarDays, Inbox, LoaderCircle, ShieldCheck, Target, TrendingUp } from "lucide-react";
import BetaAgreementGate from "@/components/BetaAgreementGate";
import ChessComLoginPanel from "@/components/ChessComLoginPanel";
import PlayerInbox from "@/components/PlayerInbox";
import PlayerPreferencesGate from "@/components/PlayerPreferencesGate";
import PlayerProfileNotifications from "@/components/PlayerProfileNotifications";
import UniversalPlayerDesk from "@/components/UniversalPlayerDesk";
import UsernameDeskForm from "@/components/UsernameDeskForm";
import { removeBoardSignalBrowserPush } from "@/components/BrowserPushControl";
import { hasAcceptedCurrentBetaAgreement, type BoardSignalAccount } from "@/lib/boardsignal/account";
import { foundingBetaField } from "@/data/universeField";
import { buildDeskReturnLoop, buildPlayerUniverseView } from "@/lib/boardsignal/universe";
import type {
  CurrentEpisodeSummary,
  DeskSummary,
  PersonalRecords,
  ProgressSeries,
  RecurringPattern,
} from "@/lib/boardsignal/memory";
import type { BoardSignalDesk, DeskEngineResult } from "@/lib/boardsignal/types";
import { auth } from "@/utils/firebaseConfig";

type DeskBundle = { desk: BoardSignalDesk; engineResults: Record<string, DeskEngineResult>; summary: DeskSummary };
type Snapshot = {
  account: BoardSignalAccount;
  desks: DeskBundle[];
  progress: ProgressSeries[];
  recurringPatterns: RecurringPattern[];
  personalRecords: PersonalRecords;
  currentEpisode?: CurrentEpisodeSummary;
  progressUnavailable?: string;
  generationRequired: boolean;
};
type RoomTab = "desk" | "progress" | "universe" | "inbox" | "profile";

export default function BoardSignalPlayerRoom() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<RoomTab>("desk");
  const [unreadCount, setUnreadCount] = useState(0);

  const loadRoom = useCallback(async (activeUser: User, quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const idToken = await activeUser.getIdToken();
      setToken(idToken);
      const response = await fetch("/api/boardsignal/player-room", { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" });
      const body = await response.json() as { ok: boolean; snapshot?: Snapshot; error?: string };
      if (!response.ok || !body.ok || !body.snapshot) throw new Error(body.error ?? "Player Room could not be loaded.");
      setSnapshot(body.snapshot);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Player Room could not be loaded.");
      throw reason;
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, (activeUser) => {
    setUser(activeUser);
    setAuthReady(true);
    if (activeUser) void loadRoom(activeUser).catch((reason) => { setError(reason instanceof Error ? reason.message : "Player Room could not be loaded."); setLoading(false); });
    else { setSnapshot(null); setToken(""); setLoading(false); }
  }), [loadRoom]);

  useEffect(() => {
    if (!user || !token || !snapshot?.account.preferencesConfirmedAt) return;
    fetch("/api/boardsignal/inbox", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((response) => response.json())
      .then((body: { ok?: boolean; inbox?: { unreadCount?: number } }) => setUnreadCount(Number(body.inbox?.unreadCount ?? 0)))
      .catch(() => undefined);
  }, [snapshot?.account.preferencesConfirmedAt, token, user]);

  async function acceptAgreement() {
    const response = await fetch("/api/boardsignal/player-room", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "acceptAgreement" }),
    });
    const body = await response.json() as { ok: boolean; error?: string };
    if (!response.ok || !body.ok) throw new Error(body.error ?? "The agreement could not be recorded.");
    if (user) await loadRoom(user);
  }

  async function confirmPreferences(
    contact: {
      preferredContactMethod: import("@/lib/boardsignal/account").BoardSignalContactMethod;
      preferredContactValue: string;
      betaContactConsent: true;
    },
    notificationPreferences: import("@/lib/boardsignal/account").BoardSignalNotificationPreferences,
  ) {
    if (!snapshot) return;
    const response = await fetch("/api/boardsignal/player-room", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updatePreferences",
        privacy: { ...snapshot.account.privacy, publicPlayerPage: true, universeCoverage: true },
        notificationPreferences,
        contact,
      }),
    });
    const body = await response.json() as { ok: boolean; error?: string };
    if (!response.ok || !body.ok) throw new Error(body.error ?? "Communication setup could not be saved.");
    if (user) await loadRoom(user);
  }

  const publishDesk = useCallback(async (desk: BoardSignalDesk, engineResults: Record<string, DeskEngineResult>) => {
    const response = await fetch("/api/boardsignal/player-room", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publishDesk", desk, engineResults }),
    });
    const body = await response.json() as { ok: boolean; error?: string };
    if (!response.ok || !body.ok) throw new Error(body.error ?? "The completed Desk could not be saved.");
    if (user) await loadRoom(user);
  }, [loadRoom, token, user]);

  const signOutPlayer = useCallback(async () => {
    if (token) await removeBoardSignalBrowserPush(token).catch(() => undefined);
    await signOut(auth);
  }, [token]);

  const latest = snapshot?.desks[0];
  const universeView = useMemo(() => latest ? buildPlayerUniverseView(foundingBetaField, latest.desk) : undefined, [latest]);
  const returnLoop = useMemo(() => latest ? buildDeskReturnLoop(latest.desk, universeView?.standings ?? []) : undefined, [latest, universeView]);

  if (!authReady || loading) return <RoomLoading />;
  if (!user) return (
    <div id="main" className="container player-room-entry">
      <p className="kicker">MY PLAYER ROOM</p><h1>Your chess identity. Your private Room.</h1>
      <ChessComLoginPanel />
      <div className="oauth-pending-divider"><span>Need Founding Beta access?</span></div>
      <UsernameDeskForm />
    </div>
  );
  if (error || !snapshot) return <RoomError error={error || "Player Room could not be loaded."} />;
  if (!hasAcceptedCurrentBetaAgreement(snapshot.account)) return <BetaAgreementGate onAccept={acceptAgreement} />;
  if (!snapshot.account.preferencesConfirmedAt || !snapshot.account.contactConfirmedAt) return <PlayerPreferencesGate account={snapshot.account} onContinue={confirmPreferences} />;

  if (snapshot.generationRequired) {
    return (
      <div id="main" className="player-room-authenticated">
        <RoomIdentity account={snapshot.account} />
        <div className="container member-first-desk-note"><p className="kicker">DESK 1 · PERSISTENT ACCOUNT</p><h2>Your first membership Desk belongs here.</h2><p>BoardSignal is building the latest eligible closed seven-day episode for your verified Chess.com identity. When it clears the existing deterministic checks, it is stored in this Player Room.</p><button className="button button-quiet" type="button" onClick={signOutPlayer}>Sign out</button></div>
        <UniversalPlayerDesk requestedUsername={snapshot.account.chessCom.canonicalUsername} ownerToken={token} onDeskPublished={publishDesk} />
      </div>
    );
  }

  return (
    <div id="main" className="player-room-authenticated">
      <RoomIdentity account={snapshot.account} />
      <RoomNav tab={tab} setTab={setTab} unreadCount={unreadCount} />

      {tab === "desk" ? <>
        <div className="container player-room-memory">
          {snapshot.currentEpisode ? <CurrentEpisodeCard episode={snapshot.currentEpisode} returnLoop={returnLoop} /> : <div className="founding-field-note"><CalendarDays size={18} /><div><strong>Current episode check unavailable</strong><p>{snapshot.progressUnavailable ?? "Your last completed Desk remains unchanged."}</p></div></div>}
        </div>
        {latest ? <UniversalPlayerDesk requestedUsername={latest.desk.player.username} publishedDesk={latest.desk} publishedEngineResults={latest.engineResults} /> : null}
      </> : null}

      {tab === "progress" ? <div className="container player-room-memory"><ProgressSection desks={snapshot.desks.map((item) => item.summary)} progress={snapshot.progress} patterns={snapshot.recurringPatterns} records={snapshot.personalRecords} /></div> : null}
      {tab === "universe" ? <div className="container player-room-memory"><UniverseRoomPanel account={snapshot.account} view={universeView} /></div> : null}
      {tab === "inbox" ? <div className="container player-room-memory"><PlayerInbox token={token} onUnreadChange={setUnreadCount} /></div> : null}
      {tab === "profile" ? <div className="container player-room-memory"><PlayerProfileNotifications account={snapshot.account} token={token} onSaved={() => user ? loadRoom(user, true) : Promise.resolve()} onSignOut={signOutPlayer} /></div> : null}
    </div>
  );
}

function RoomIdentity({ account }: { account: BoardSignalAccount }) {
  return <header className="container player-room-identity"><div className="universal-avatar">{account.chessCom.canonicalUsername.slice(0, 2).toUpperCase()}</div><div><span>MY PLAYER ROOM</span><h1>{account.chessCom.canonicalUsername}</h1><p>Founding Beta · Chess.com account verified</p></div></header>;
}

function RoomNav({ tab, setTab, unreadCount }: { tab: RoomTab; setTab: (tab: RoomTab) => void; unreadCount: number }) {
  const items: Array<{ id: RoomTab; label: string }> = [
    { id: "desk", label: "Desk" },
    { id: "progress", label: "Progress" },
    { id: "universe", label: "Universe" },
    { id: "inbox", label: "Inbox" },
    { id: "profile", label: "Profile" },
  ];
  return <nav className="container room-tab-nav" aria-label="My Player Room"><div>{items.map((item) => <button type="button" key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined}>{item.label}{item.id === "inbox" && unreadCount > 0 ? <span className="unread-badge">{unreadCount}</span> : null}</button>)}</div></nav>;
}

function CurrentEpisodeCard({ episode, returnLoop }: { episode: CurrentEpisodeSummary; returnLoop?: ReturnType<typeof buildDeskReturnLoop> }) {
  return <section className="current-episode-card"><div className="current-episode-heading"><div><p className="kicker">CURRENT EPISODE</p><h2>Desk forming</h2><p>{episode.periodLabel} · Latest available Chess.com data.</p></div><strong>{episode.daysComplete} of 7 days</strong></div><div className="current-episode-stats"><div><span>Games recorded</span><strong>{episode.games}</strong></div><div><span>Current record</span><strong>{episode.wins}W · {episode.draws}D · {episode.losses}L</strong></div><div><span>Sessions</span><strong>{episode.sessions}</strong></div><div><span>Your next Desk</span><strong>{episode.nextDeskDueAt}</strong></div></div>{episode.pools.length ? <div className="forming-pools">{episode.pools.map((pool) => <article key={pool.pool}><span>{pool.pool}</span><strong>{pool.games} games</strong><p>{pool.wins}W · {pool.draws}D · {pool.losses}L{pool.ratingDelta !== undefined ? ` · ${pool.ratingDelta >= 0 ? "+" : ""}${pool.ratingDelta}` : ""}</p></article>)}</div> : <p className="helper-copy">No games are recorded in this forming episode yet.</p>}<div className="return-loop-grid">{returnLoop?.previousBlue ? <article className="return-loop-blue"><span>CARRY WITH YOU</span><h3>{returnLoop.previousBlue.title}</h3><p>{returnLoop.previousBlue.copy}</p><small>From your last Desk · Not graded</small></article> : null}{returnLoop?.amberWatch ? <article className="return-loop-amber"><span>WATCH</span><h3>{returnLoop.amberWatch.title}</h3><p>{returnLoop.amberWatch.copy}</p><small>Private awareness only</small></article> : null}</div><p className="forming-note"><ShieldCheck size={15} /> This is factual progress, not a completed Desk. No new Red, Amber or Blue is generated here.</p></section>;
}

function ProgressSection({ desks, progress, patterns, records }: { desks: DeskSummary[]; progress: ProgressSeries[]; patterns: RecurringPattern[]; records: PersonalRecords }) {
  const chronological = [...desks].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const metric = (label: string, values: Array<number | undefined>, suffix = "") => {
    const present = values.filter((value): value is number => value !== undefined);
    return present.length >= 2 ? <article><span>{label}</span><strong>{present.map((value) => `${value}${suffix}`).join(" → ")}</strong></article> : null;
  };
  return <section className="my-progress-section"><div className="universal-section-heading"><span><TrendingUp size={16} /></span><div><p className="kicker">MY PROGRESS</p><h2>Your latest four completed Desks.</h2><p>Pool ratings stay separate. Small samples stay out of trend claims.</p></div></div><div className="desk-sequence">{chronological.map((desk, index) => <article key={desk.deskKey}><span>DESK {index + 1}</span><strong>{desk.periodLabel}</strong><p>{desk.games} games · {desk.scorePct.toFixed(1)}%</p></article>)}</div>{progress.map((series) => <div className="pool-progress" key={series.pool}><h3>{series.pool} progress</h3><div>{metric("Score", series.points.map((point) => point.scorePct), "%")}{metric("Rating movement", series.points.map((point) => point.ratingDelta))}</div></div>)}<div className="cross-desk-metrics">{metric("Winning run", chronological.map((desk) => desk.longestWinRun))}{metric("Median game length", chronological.map((desk) => desk.medianGameLength))}{metric("Black score", chronological.map((desk) => desk.blackScorePct), "%")}</div><div className="personal-record-strip"><BarChart3 size={18} /><div><span>Personal record</span><strong>{records.personalBestWinRun} straight wins</strong></div><div><span>Desks completed</span><strong>{records.desksCompleted}</strong></div></div>{patterns.length ? <div className="recurring-patterns"><p className="kicker">RECURRING PATTERNS</p>{patterns.map((pattern) => <article key={`${pattern.family}:${pattern.status}`}><Target size={16} /><div><strong>{pattern.family.replaceAll("_", " ")}</strong><p>{pattern.message}</p></div></article>)}</div> : <div className="universe-empty"><p>More completed Desks are needed before BoardSignal can name a recurring pattern.</p></div>}</section>;
}

function UniverseRoomPanel({ account, view }: { account: BoardSignalAccount; view?: ReturnType<typeof buildPlayerUniverseView> }) {
  return <section className="player-universe-panel"><div className="room-section-heading"><div><p className="kicker">UNIVERSE</p><h2>Your public sports identity. Your private weakness stays private.</h2><p>Founding Beta includes safe sports-style Universe coverage from completed Desks. Red, private Amber, Blue, evidence, recurrence and private progress never belong here.</p></div><Link href={`/player/${encodeURIComponent(account.chessCom.canonicalUsername)}`} className="button button-outline">Open my public coverage</Link></div>{view?.standings?.length ? <div className="universe-standing-grid">{view.standings.slice(0, 6).map((standing) => <article key={`${standing.categoryId}:${standing.scopeLabel ?? "all"}`}><span>{standing.categoryTitle}{standing.scopeLabel ? ` · ${standing.scopeLabel}` : ""}</span><strong>#{standing.rank} of {standing.denominator}</strong><p>{standing.label ?? standing.valueLabel}</p></article>)}</div> : <div className="inbox-empty"><Inbox size={20} /><div><strong>No active recognition yet.</strong><p>Your safe public coverage can enter BoardSignal recognition when the deterministic evidence supports it.</p></div></div>}<Link href="/feed" className="text-link">Explore the BoardSignal Universe</Link></section>;
}

function RoomLoading() {
  return <div id="main" className="desk-processing-page"><section className="container desk-processing-card"><div className="processing-orb"><LoaderCircle /></div><p className="kicker">MY PLAYER ROOM</p><h1>Loading your private BoardSignal state</h1></section></div>;
}

function RoomError({ error }: { error: string }) {
  return <div id="main" className="desk-processing-page"><section className="container desk-processing-card error-card"><ShieldCheck /><p className="kicker">PLAYER ROOM HELD SAFELY</p><h1>Private state could not be loaded</h1><p>{error}</p></section></div>;
}
