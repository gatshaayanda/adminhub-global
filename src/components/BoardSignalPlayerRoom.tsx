"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { BarChart3, CalendarDays, LoaderCircle, LogOut, ShieldCheck, Target, TrendingUp } from "lucide-react";
import BetaAgreementGate from "@/components/BetaAgreementGate";
import ChessComLoginPanel from "@/components/ChessComLoginPanel";
import PlayerPreferencesGate from "@/components/PlayerPreferencesGate";
import UniversalPlayerDesk from "@/components/UniversalPlayerDesk";
import UsernameDeskForm from "@/components/UsernameDeskForm";
import { hasAcceptedCurrentBetaAgreement, type BoardSignalAccount } from "@/lib/boardsignal/account";
import { buildDeskReturnLoop } from "@/lib/boardsignal/universe";
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

export default function BoardSignalPlayerRoom() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadRoom = useCallback(async (activeUser: User) => {
    setLoading(true);
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
      setLoading(false);
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, (activeUser) => {
    setUser(activeUser);
    setAuthReady(true);
    if (activeUser) void loadRoom(activeUser).catch((reason) => { setError(reason instanceof Error ? reason.message : "Player Room could not be loaded."); setLoading(false); });
    else { setSnapshot(null); setToken(""); setLoading(false); }
  }), [loadRoom]);

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
    privacy: import("@/lib/boardsignal/account").BoardSignalPrivacySettings,
    notificationPreferences: import("@/lib/boardsignal/account").BoardSignalNotificationPreferences,
  ) {
    const response = await fetch("/api/boardsignal/player-room", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updatePreferences", privacy, notificationPreferences }),
    });
    const body = await response.json() as { ok: boolean; error?: string };
    if (!response.ok || !body.ok) throw new Error(body.error ?? "Preferences could not be saved.");
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

  const latest = snapshot?.desks[0];
  const returnLoop = useMemo(() => latest ? buildDeskReturnLoop(latest.desk) : undefined, [latest]);

  if (!authReady || loading) return <RoomLoading />;
  if (!user) return (
    <div id="main" className="container player-room-entry">
      <p className="kicker">BOARD SIGNAL IDENTITY</p><h1>Your chess identity. Your private Room.</h1>
      <ChessComLoginPanel />
      <div className="oauth-pending-divider"><span>While official Chess.com sign-in is pending</span></div>
      <UsernameDeskForm />
    </div>
  );
  if (error || !snapshot) return <RoomError error={error || "Player Room could not be loaded."} />;
  if (!hasAcceptedCurrentBetaAgreement(snapshot.account)) return <BetaAgreementGate onAccept={acceptAgreement} />;
  if (!snapshot.account.preferencesConfirmedAt) return <PlayerPreferencesGate account={snapshot.account} onContinue={confirmPreferences} />;

  if (snapshot.generationRequired) {
    return (
      <div id="main" className="player-room-authenticated">
        <RoomIdentity account={snapshot.account} onSignOut={() => signOut(auth)} />
        <UniversalPlayerDesk requestedUsername={snapshot.account.chessCom.canonicalUsername} ownerToken={token} onDeskPublished={publishDesk} />
      </div>
    );
  }

  return (
    <div id="main" className="player-room-authenticated">
      <RoomIdentity account={snapshot.account} onSignOut={() => signOut(auth)} />
      <div className="container player-room-memory">
        {snapshot.currentEpisode ? <CurrentEpisodeCard episode={snapshot.currentEpisode} returnLoop={returnLoop} /> : <div className="founding-field-note"><CalendarDays size={18} /><div><strong>Current episode check unavailable</strong><p>{snapshot.progressUnavailable ?? "Your last completed Desk remains unchanged."}</p></div></div>}
        <ProgressSection desks={snapshot.desks.map((item) => item.summary)} progress={snapshot.progress} patterns={snapshot.recurringPatterns} records={snapshot.personalRecords} />
        <RoomPreferences account={snapshot.account} token={token} onSaved={() => user ? loadRoom(user) : Promise.resolve()} />
      </div>
      {latest ? <UniversalPlayerDesk requestedUsername={latest.desk.player.username} publishedDesk={latest.desk} publishedEngineResults={latest.engineResults} /> : null}
    </div>
  );
}

function RoomIdentity({ account, onSignOut }: { account: BoardSignalAccount; onSignOut: () => void }) {
  return <header className="container player-room-identity"><div className="universal-avatar">{account.chessCom.canonicalUsername.slice(0, 2).toUpperCase()}</div><div><span>MY PLAYER ROOM</span><h1>{account.chessCom.canonicalUsername}</h1><p>Founding Beta · Chess.com account verified</p></div><button className="button button-quiet" type="button" onClick={onSignOut}><LogOut size={15} /> Sign out</button></header>;
}

function CurrentEpisodeCard({ episode, returnLoop }: { episode: CurrentEpisodeSummary; returnLoop?: ReturnType<typeof buildDeskReturnLoop> }) {
  return <section className="current-episode-card"><div className="current-episode-heading"><div><p className="kicker">CURRENT EPISODE</p><h2>Desk forming</h2><p>{episode.periodLabel} · Latest available Chess.com data.</p></div><strong>{episode.daysComplete} of 7 days</strong></div><div className="current-episode-stats"><div><span>Games recorded</span><strong>{episode.games}</strong></div><div><span>Current record</span><strong>{episode.wins}W · {episode.draws}D · {episode.losses}L</strong></div><div><span>Sessions</span><strong>{episode.sessions}</strong></div><div><span>Your next Desk</span><strong>{episode.nextDeskDueAt}</strong></div></div>{episode.pools.length ? <div className="forming-pools">{episode.pools.map((pool) => <article key={pool.pool}><span>{pool.pool}</span><strong>{pool.games} games</strong><p>{pool.wins}W · {pool.draws}D · {pool.losses}L{pool.ratingDelta !== undefined ? ` · ${pool.ratingDelta >= 0 ? "+" : ""}${pool.ratingDelta}` : ""}</p></article>)}</div> : <p className="helper-copy">No games are recorded in this forming episode yet.</p>}<div className="return-loop-grid">{returnLoop?.previousBlue ? <article className="return-loop-blue"><span>CARRY WITH YOU</span><h3>{returnLoop.previousBlue.title}</h3><p>{returnLoop.previousBlue.copy}</p><small>From your last Desk · Not graded</small></article> : null}{returnLoop?.amberWatch ? <article className="return-loop-amber"><span>WATCH</span><h3>{returnLoop.amberWatch.title}</h3><p>{returnLoop.amberWatch.copy}</p><small>Awareness only</small></article> : null}</div><p className="forming-note"><ShieldCheck size={15} /> This is factual progress, not a completed Desk. No new Red, Amber or Blue is generated here.</p></section>;
}

function ProgressSection({ desks, progress, patterns, records }: { desks: DeskSummary[]; progress: ProgressSeries[]; patterns: RecurringPattern[]; records: PersonalRecords }) {
  const chronological = [...desks].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const metric = (label: string, values: Array<number | undefined>, suffix = "") => {
    const present = values.filter((value): value is number => value !== undefined);
    return present.length >= 2 ? <article><span>{label}</span><strong>{present.map((value) => `${value}${suffix}`).join(" → ")}</strong></article> : null;
  };
  return <section className="my-progress-section"><div className="universal-section-heading"><span><TrendingUp size={16} /></span><div><p className="kicker">MY PROGRESS</p><h2>Your latest four completed Desks.</h2><p>Pool ratings stay separate. Small samples stay out of trend claims.</p></div></div><div className="desk-sequence">{chronological.map((desk, index) => <article key={desk.deskKey}><span>DESK {index + 1}</span><strong>{desk.periodLabel}</strong><p>{desk.games} games · {desk.scorePct.toFixed(1)}%</p></article>)}</div>{progress.map((series) => <div className="pool-progress" key={series.pool}><h3>{series.pool} progress</h3><div>{metric("Score", series.points.map((point) => point.scorePct), "%")}{metric("Rating movement", series.points.map((point) => point.ratingDelta))}</div></div>)}<div className="cross-desk-metrics">{metric("Winning run", chronological.map((desk) => desk.longestWinRun))}{metric("Median game length", chronological.map((desk) => desk.medianGameLength))}{metric("Black score", chronological.map((desk) => desk.blackScorePct), "%")}</div><div className="personal-record-strip"><BarChart3 size={18} /><div><span>Personal record</span><strong>{records.personalBestWinRun} straight wins</strong></div><div><span>Desks completed</span><strong>{records.desksCompleted}</strong></div></div>{patterns.length ? <div className="recurring-patterns"><p className="kicker">RECURRING PATTERNS</p>{patterns.map((pattern) => <article key={`${pattern.family}:${pattern.status}`}><Target size={16} /><div><strong>{pattern.family.replaceAll("_", " ")}</strong><p>{pattern.message}</p></div></article>)}</div> : <div className="universe-empty"><p>More completed Desks are needed before BoardSignal can name a recurring pattern.</p></div>}</section>;
}

function RoomPreferences({ account, token, onSaved }: { account: BoardSignalAccount; token: string; onSaved: () => Promise<void> }) {
  const [privacy, setPrivacy] = useState(account.privacy);
  const [notifications, setNotifications] = useState(account.notificationPreferences);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/boardsignal/player-room", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "updatePreferences", privacy, notificationPreferences: notifications }) });
      const body = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Preferences could not be saved.");
      setMessage("Preferences saved. No notifications are sent in this patch.");
      await onSaved();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Preferences could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  const notificationOptions: Array<[keyof typeof notifications, string]> = [
    ["email", "Email delivery (future)"], ["browserPush", "Browser push delivery (future)"],
    ["deskReady", "Desk ready"], ["episodeProgress", "Episode progress"], ["blueReminder", "Blue reminder"],
    ["amberWatch", "Amber watch"], ["universeAchievement", "Universe achievement"],
  ];
  return <section className="room-preferences"><details><summary>Privacy & future communication preferences</summary><div className="preference-grid"><div><h3>Public coverage</h3><label><input type="checkbox" checked={privacy.publicPlayerPage} onChange={(event) => setPrivacy((value) => ({ ...value, publicPlayerPage: event.target.checked }))} /> Enable my public positive player page</label><label><input type="checkbox" checked={privacy.universeCoverage} onChange={(event) => setPrivacy((value) => ({ ...value, universeCoverage: event.target.checked }))} /> Allow safe positive Universe coverage</label><p>Red, Amber, Blue, evidence, recurrence and progress remain private either way.</p></div><div><h3>Event preferences</h3>{notificationOptions.map(([key, label]) => <label key={key}><input type="checkbox" checked={notifications[key]} onChange={(event) => setNotifications((value) => ({ ...value, [key]: event.target.checked }))} /> {label}</label>)}<p>Email and browser-push delivery are not built yet. These choices prepare the later layer only.</p></div></div><button className="button button-outline" type="button" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save preferences"}</button>{message ? <p className="helper-copy">{message}</p> : null}</details></section>;
}

function RoomLoading() {
  return <div id="main" className="desk-processing-page"><section className="container desk-processing-card"><div className="processing-orb"><LoaderCircle /></div><p className="kicker">MY PLAYER ROOM</p><h1>Loading your private BoardSignal state</h1></section></div>;
}

function RoomError({ error }: { error: string }) {
  return <div id="main" className="desk-processing-page"><section className="container desk-processing-card error-card"><ShieldCheck /><p className="kicker">PLAYER ROOM HELD SAFELY</p><h1>Private state could not be loaded</h1><p>{error}</p></section></div>;
}
