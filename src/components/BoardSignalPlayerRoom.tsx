"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { BarChart3, CalendarDays, Inbox, LoaderCircle, ShieldCheck, Target, TrendingUp } from "lucide-react";
import BetaAgreementGate from "@/components/BetaAgreementGate";
import ChessComLoginPanel from "@/components/ChessComLoginPanel";
import PlayerInbox from "@/components/PlayerInbox";
import PlayerFriends from "@/components/PlayerFriends";
import PlayerPreferencesGate from "@/components/PlayerPreferencesGate";
import PlayerProfileNotifications from "@/components/PlayerProfileNotifications";
import UniversalPlayerDesk from "@/components/UniversalPlayerDesk";
import ShareMomentActions from "@/components/ShareMomentActions";
import UsernameDeskForm from "@/components/UsernameDeskForm";
import { removeBoardSignalBrowserPush } from "@/components/BrowserPushControl";
import { hasAcceptedCurrentBetaAgreement, type BoardSignalAccount } from "@/lib/boardsignal/account";
import { buildDeskReturnLoop } from "@/lib/boardsignal/universe";
import type { PlayerPulse, PublicUniverseEvent, SafeShareMoment } from "@/lib/boardsignal/pulse";
import type {
  CurrentEpisodeSummary,
  DeskSummary,
  PersonalRecords,
  ProgressSeries,
  RecurringPattern,
} from "@/lib/boardsignal/memory";
import type { BoardSignalDesk, DeskEngineResult } from "@/lib/boardsignal/types";
import { auth } from "@/utils/firebaseConfig";
import { useBoardSignalConnectivity } from "@/components/ConnectivityProvider";
import { clearBoardSignalPrivateOfflineData } from "@/lib/boardsignal/offline/db";
import { loadPlayerRoomOfflineSnapshot, requestPersistentStorageBestEffort, savePlayerRoomOfflineSnapshot } from "@/lib/boardsignal/offline/snapshots";
import type { OfflinePlayerRoomSnapshot } from "@/lib/boardsignal/offline/types";
import { markBoardSignalPwaEngaged } from "@/lib/boardsignal/offline/install";
import { clearBoardSignalAppBadge, syncBoardSignalAppBadge } from "@/lib/boardsignal/offline/badge";
import OfflinePlayerRoom from "@/components/OfflinePlayerRoom";
import DeskReturnChannelPrompt from "@/components/DeskReturnChannelPrompt";

type DeskBundle = { desk: BoardSignalDesk; engineResults: Record<string, DeskEngineResult>; summary: DeskSummary };
type Snapshot = {
  account: BoardSignalAccount;
  desks: DeskBundle[];
  progress: ProgressSeries[];
  recurringPatterns: RecurringPattern[];
  personalRecords: PersonalRecords;
  currentEpisode?: CurrentEpisodeSummary;
  progressUnavailable?: string;
  pulseUnavailable?: string;
  generationRequired: boolean;
  pulse?: PlayerPulse;
  shareMoments?: Array<SafeShareMoment & { activeDesk?: boolean }>;
};
type RoomTab = "desk" | "progress" | "universe" | "friends" | "inbox" | "profile";
type SocialSummaryPlayer = { playerId: number; canonicalUsername: string; relationshipStatus?: "incoming" | "outgoing" | "friends" };

export default function BoardSignalPlayerRoom() {
  const connectivity = useBoardSignalConnectivity();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<RoomTab>("desk");
  const [unreadCount, setUnreadCount] = useState(0);
  const [socialPlayers, setSocialPlayers] = useState<Record<string, SocialSummaryPlayer>>({});
  const [friendCompareTarget, setFriendCompareTarget] = useState<number | undefined>();
  const [offlineSnapshot, setOfflineSnapshot] = useState<OfflinePlayerRoomSnapshot | null>(null);
  const [offlineReadyNotice, setOfflineReadyNotice] = useState(false);
  const activeUidRef = useRef<string | undefined>(undefined);
  const reconnectRefreshRef = useRef(false);

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
      setOfflineSnapshot(null);
      void savePlayerRoomOfflineSnapshot(activeUser.uid, body.snapshot).then(({ firstReady }) => {
        window.dispatchEvent(new CustomEvent("boardsignal:offline-saved"));
        if (body.snapshot?.desks?.length) markBoardSignalPwaEngaged();
        if (firstReady) { setOfflineReadyNotice(true); window.setTimeout(() => setOfflineReadyNotice(false), 4200); void requestPersistentStorageBestEffort(activeUser.uid); }
      }).catch(() => undefined);
      try {
        if (window.sessionStorage.getItem("boardsignal:pwa-recovery-refresh") === "1") {
          window.sessionStorage.removeItem("boardsignal:pwa-recovery-refresh");
          window.dispatchEvent(new CustomEvent("boardsignal:refresh-complete"));
        }
      } catch { /* recovery acknowledgement is optional */ }
      return true;
    } catch (reason) {
      const saved = await loadPlayerRoomOfflineSnapshot(activeUser.uid).catch(() => undefined);
      if (saved) {
        setOfflineSnapshot(saved);
        setError("");
        return false;
      }
      setError(reason instanceof Error ? reason.message : "Player Room could not be loaded.");
      throw reason;
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, (activeUser) => {
    const previousUid = activeUidRef.current;
    const nextUid = activeUser?.uid;
    if (previousUid && nextUid && previousUid !== nextUid) {
      // Invalidate Player A immediately before any Player B read begins. The async purge is defense-in-depth.
      setSnapshot(null);
      setOfflineSnapshot(null);
      setToken("");
      setSocialPlayers({});
      setUnreadCount(0);
      void clearBoardSignalAppBadge();
      void clearBoardSignalPrivateOfflineData(previousUid);
    }
    activeUidRef.current = nextUid;
    setUser(activeUser);
    setAuthReady(true);
    if (activeUser) void loadRoom(activeUser).catch((reason) => { setError(reason instanceof Error ? reason.message : "Player Room could not be loaded."); setLoading(false); });
    else { setSnapshot(null); setOfflineSnapshot(null); setToken(""); setLoading(false); }
  }), [loadRoom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (["desk", "progress", "universe", "friends", "inbox", "profile"].includes(requestedTab ?? "")) setTab(requestedTab as RoomTab);
    const compare = Number(new URLSearchParams(window.location.search).get("compare"));
    if (Number.isSafeInteger(compare) && compare > 0) setFriendCompareTarget(compare);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("boardsignal:context", { detail: { activeTab: tab } }));
  }, [tab]);

  useEffect(() => {
    const reconnected = () => {
      if (!user || reconnectRefreshRef.current) return;
      reconnectRefreshRef.current = true;
      void loadRoom(user, true)
        .then((refreshed) => { if (refreshed) window.dispatchEvent(new CustomEvent("boardsignal:refresh-complete")); })
        .catch(() => undefined)
        .finally(() => { reconnectRefreshRef.current = false; });
    };
    window.addEventListener("boardsignal:reconnected", reconnected);
    return () => window.removeEventListener("boardsignal:reconnected", reconnected);
  }, [loadRoom, user]);

  // If a live Player Room loses reachability after it has already rendered,
  // swap to the same UID-scoped saved shell instead of leaving live-only controls active.
  useEffect(() => {
    if (connectivity.state !== "offline" || !user) return;
    let active = true;
    void loadPlayerRoomOfflineSnapshot(user.uid)
      .then((saved) => { if (active && saved) setOfflineSnapshot(saved); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [connectivity.state, user]);

  const refreshSocialSummary = useCallback(async () => {
    if (!token) return;
    const response = await fetch("/api/boardsignal/social?view=overview", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const body = await response.json() as { ok?: boolean; overview?: { friends?: SocialSummaryPlayer[]; incoming?: SocialSummaryPlayer[]; outgoing?: SocialSummaryPlayer[] } };
    if (!response.ok || !body.ok || !body.overview) return;
    const players = [...(body.overview.friends ?? []), ...(body.overview.incoming ?? []), ...(body.overview.outgoing ?? [])];
    setSocialPlayers(Object.fromEntries(players.map((player) => [player.canonicalUsername.toLowerCase(), player])));
  }, [token]);

  useEffect(() => { if (token && snapshot?.account.preferencesConfirmedAt) void refreshSocialSummary(); }, [refreshSocialSummary, snapshot?.account.preferencesConfirmedAt, token]);

  const handleFriendsChanged = useCallback((overview: { friends: SocialSummaryPlayer[]; incoming: SocialSummaryPlayer[]; outgoing: SocialSummaryPlayer[] }) => {
    const players = [...overview.friends, ...overview.incoming, ...overview.outgoing];
    setSocialPlayers(Object.fromEntries(players.map((player) => [player.canonicalUsername.toLowerCase(), player])));
  }, []);

  const socialActionFromUniverse = useCallback(async (username: string) => {
    if (!connectivity.online) { setTab("friends"); return; }
    const known = socialPlayers[username.toLowerCase()];
    if (known?.relationshipStatus === "friends") { setFriendCompareTarget(known.playerId); setTab("friends"); return; }
    if (known) { setTab("friends"); return; }
    if (!token) return;
    const search = await fetch(`/api/boardsignal/social?view=search&q=${encodeURIComponent(username)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const found = await search.json() as { ok?: boolean; players?: SocialSummaryPlayer[] };
    const target = found.players?.find((player) => player.canonicalUsername.toLowerCase() === username.toLowerCase());
    if (!search.ok || !found.ok || !target) { setTab("friends"); return; }
    await fetch("/api/boardsignal/social", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", playerId: target.playerId }) });
    await refreshSocialSummary();
  }, [connectivity.online, refreshSocialSummary, socialPlayers, token]);

  useEffect(() => {
    if (!user || !token || !snapshot?.account.preferencesConfirmedAt) return;
    fetch("/api/boardsignal/inbox", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((response) => response.json())
      .then((body: { ok?: boolean; inbox?: { unreadCount?: number } }) => setUnreadCount(Number(body.inbox?.unreadCount ?? 0)))
      .catch(() => undefined);
  }, [snapshot?.account.preferencesConfirmedAt, token, user]);

  useEffect(() => {
    if (!user?.uid) { void clearBoardSignalAppBadge(); return; }
    void syncBoardSignalAppBadge(unreadCount).catch(() => undefined);
  }, [unreadCount, user?.uid]);

  async function acceptAgreement() {
    if (!connectivity.online) throw new Error("Reconnect before accepting the Founding Beta Agreement.");
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
    if (!connectivity.online) throw new Error("Reconnect before changing BoardSignal account or communication settings.");
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
    if (!connectivity.online) throw new Error("Reconnect before generating or publishing a Desk.");
    const response = await fetch("/api/boardsignal/player-room", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publishDesk", desk, engineResults }),
    });
    const body = await response.json() as { ok: boolean; error?: string };
    if (!response.ok || !body.ok) throw new Error(body.error ?? "The completed Desk could not be saved.");
    if (user) await loadRoom(user);
  }, [connectivity.online, loadRoom, token, user]);

  const signOutPlayer = useCallback(async () => {
    if (token && connectivity.online) await removeBoardSignalBrowserPush(token).catch(() => undefined);
    if (user?.uid) await clearBoardSignalPrivateOfflineData(user.uid).catch(() => undefined);
    setOfflineSnapshot(null);
    setSnapshot(null);
    setUnreadCount(0);
    await clearBoardSignalAppBadge().catch(() => false);
    await signOut(auth);
  }, [connectivity.online, token, user?.uid]);

  const latest = snapshot?.desks[0];
  const returnLoop = useMemo(() => latest ? buildDeskReturnLoop(latest.desk, snapshot?.pulse?.standings ?? []) : undefined, [latest, snapshot?.pulse?.standings]);

  if (!authReady || loading) return <RoomLoading />;
  if (!user && connectivity.state === "offline") return (
    <div id="main" className="container player-room-entry bs-surface-paper">
      <p className="kicker">MY PLAYER ROOM · OFFLINE</p><h1>Reconnect to sign in.</h1>
      <p>BoardSignal never performs Beta Access verification or authentication offline. If this device already has a saved Player Room, it becomes available only after Firebase recognizes that same signed-in account locally.</p>
      <Link className="button button-dark" href="/offline/player-room">Open saved Player Room</Link>
    </div>
  );
  if (!user) return (
    <div id="main" className="container player-room-entry">
      <p className="kicker">MY PLAYER ROOM</p><h1>Your chess identity. Your private Room.</h1>
      <ChessComLoginPanel />
      <div className="oauth-pending-divider"><span>Need Founding Beta access?</span></div>
      <UsernameDeskForm />
    </div>
  );
  if (offlineSnapshot && user) return <OfflinePlayerRoom uid={user.uid} initialSnapshot={offlineSnapshot} embedded />;
  if (error || !snapshot) return <RoomError error={error || "Player Room could not be loaded."} />;
  if (!hasAcceptedCurrentBetaAgreement(snapshot.account)) return <BetaAgreementGate onAccept={acceptAgreement} />;
  if (!snapshot.account.preferencesConfirmedAt || !snapshot.account.contactConfirmedAt) return <PlayerPreferencesGate account={snapshot.account} onContinue={confirmPreferences} />;

  if (snapshot.generationRequired) {
    return (
      <div id="main" className="player-room-authenticated">
        <RoomIdentity account={snapshot.account} />
        <div className="container member-first-desk-note"><p className="kicker">DESK 1 · PERSISTENT ACCOUNT</p><h2>Your first membership Desk belongs here.</h2><p>{connectivity.online ? "BoardSignal is building the latest eligible closed seven-day episode for your verified Chess.com identity. When it clears the existing deterministic checks, it is stored in this Player Room." : "You're offline. BoardSignal will not retrieve Chess.com games or generate a Desk until you reconnect."}</p><button className="button button-quiet" type="button" onClick={signOutPlayer}>Sign out</button></div>
        {connectivity.online ? <UniversalPlayerDesk requestedUsername={snapshot.account.chessCom.canonicalUsername} ownerToken={token} onDeskPublished={publishDesk} /> : <div className="container offline-network-action"><strong>Desk generation needs a connection.</strong><p>Your verified account is unchanged. Reconnect and BoardSignal will continue through the existing deterministic pipeline.</p></div>}
      </div>
    );
  }

  return (
    <div id="main" className="player-room-authenticated">
      <RoomIdentity account={snapshot.account} />
      <RoomNav tab={tab} setTab={setTab} unreadCount={unreadCount} />
      {offlineReadyNotice ? <div className="container offline-ready-note" role="status">Your latest BoardSignal is available offline on this device.</div> : null}

      {tab === "desk" ? <>
        <div className="container player-room-memory">
          {snapshot.currentEpisode ? <CurrentEpisodeCard episode={snapshot.currentEpisode} returnLoop={returnLoop} /> : <div className="founding-field-note"><CalendarDays size={18} /><div><strong>Current episode check unavailable</strong><p>{snapshot.progressUnavailable ?? "Your last completed Desk remains unchanged."}</p></div></div>}
          {latest ? <ShareMomentsSection moments={(snapshot.shareMoments ?? []).filter((moment) => moment.deskKey === latest.summary.deskKey).slice(0, 3)} /> : null}
        </div>
        {latest ? <><UniversalPlayerDesk requestedUsername={latest.desk.player.username} publishedDesk={latest.desk} publishedEngineResults={latest.engineResults} /><div className="container"><DeskReturnChannelPrompt uid={snapshot.account.uid} idToken={token} browserPushEnabled={snapshot.account.notificationPreferences.browserPush === true} emailActive={snapshot.account.notificationPreferences.email === true} onEnabled={async () => { if (user) await loadRoom(user, true); }} /></div></> : null}
      </> : null}

      {tab === "progress" ? <div className="container player-room-memory"><ProgressSection desks={snapshot.desks.map((item) => item.summary)} progress={snapshot.progress} patterns={snapshot.recurringPatterns} records={snapshot.personalRecords} /></div> : null}
      {tab === "universe" ? <div className="container player-room-memory"><UniverseRoomPanel account={snapshot.account} pulse={snapshot.pulse} unavailable={snapshot.pulseUnavailable} socialPlayers={socialPlayers} onSocialAction={socialActionFromUniverse} /></div> : null}
      {tab === "friends" ? <div className="container player-room-memory"><PlayerFriends uid={user.uid} token={token} initialComparePlayerId={friendCompareTarget} onChanged={handleFriendsChanged} /></div> : null}
      {tab === "inbox" ? <div className="container player-room-memory"><PlayerInbox token={token} onUnreadChange={setUnreadCount} /></div> : null}
      {tab === "profile" ? <div className="container player-room-memory"><PlayerProfileNotifications account={snapshot.account} uid={user.uid} token={token} onSaved={async () => { if (user) await loadRoom(user, true); }} onSignOut={signOutPlayer} /></div> : null}
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
    { id: "friends", label: "Friends" },
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

function ShareMomentsSection({ moments }: { moments: SafeShareMoment[] }) {
  if (!moments.length) return null;
  return <section className="share-moments-section"><div className="universal-section-heading"><span>↗</span><div><p className="kicker">YOUR SHAREABLE MOMENTS</p><h2>Up to three public-safe facts from this completed Desk.</h2><p>Your Red, private Amber, Blue, evidence and recurrence never become Share Moments.</p></div></div><div className="share-moment-grid">{moments.map((moment) => <article key={moment.id} className="share-moment-card"><span>{moment.statLabel}</span><h3>{moment.headline}</h3><strong>{moment.statValue}</strong><p>{moment.supportingFact}</p><ShareMomentActions moment={moment} /></article>)}</div></section>;
}

function PulseCards({ cards }: { cards: NonNullable<PlayerPulse["boardMoved"]> }) {
  if (!cards.length) return null;
  return <div className="pulse-card-grid">{cards.map((card) => <article className={`pulse-card pulse-${card.kind}`} key={card.id}><div className="pulse-card-label"><span>{card.eyebrow}</span><b>{card.finality === "provisional" ? "PROVISIONAL" : "OFFICIAL"}</b></div><h3>{card.title}</h3><p>{card.body}</p>{card.facts?.length ? <ul>{card.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : null}</article>)}</div>;
}

function UniverseEventCards({ events, heading, account, socialPlayers, onSocialAction }: { events: PublicUniverseEvent[]; heading: string; account: BoardSignalAccount; socialPlayers: Record<string, SocialSummaryPlayer>; onSocialAction: (username: string) => Promise<void> }) {
  if (!events.length) return null;
  return <section className="pulse-universe-block"><div className="pulse-block-heading"><p className="kicker">{heading}</p></div><div className="pulse-event-grid">{events.map((event) => { const social = socialPlayers[event.canonicalUsername.toLowerCase()]; const canConnect = event.playerId !== String(account.chessCom.playerId); return <article key={event.eventId}><div className="pulse-event-meta"><span>{event.eventType.replaceAll("_", " ")}</span><b>OFFICIAL</b></div><h3>{event.headline}</h3><p>{event.supportingFact}</p><small>{new Date(event.publishedAt).toLocaleDateString()}</small>{canConnect ? <button type="button" className="text-link social-text-button" onClick={() => void onSocialAction(event.canonicalUsername)}>{social?.relationshipStatus === "friends" ? "Compare" : social ? "Open Friends" : "Add Friend"}</button> : null}</article>; })}</div></section>;
}

function UniverseRoomPanel({ account, pulse, unavailable, socialPlayers, onSocialAction }: { account: BoardSignalAccount; pulse?: PlayerPulse; unavailable?: string; socialPlayers: Record<string, SocialSummaryPlayer>; onSocialAction: (username: string) => Promise<void> }) {
  const standings = pulse?.standings ?? [];
  const groups = pulse?.groups ?? [];
  const learning = groups.flatMap((group) => group.boards.flatMap((board) => board.entries.slice(0, 1).map((entry) => ({ group, board, entry })))).filter(({ entry }) => entry.player.toLowerCase() !== account.chessCom.canonicalUsername.toLowerCase()).slice(0, 3);
  return <section className="player-universe-panel">{unavailable ? <p className="notice notice-subtle">{unavailable}</p> : null}<div className="room-section-heading"><div><p className="kicker">UNIVERSE</p><h2>Your board, the field around you, and what changed.</h2><p>Official standings come only from completed eligible active Desks. Current-episode comparisons are always labelled provisional.</p></div><Link href={`/player/${encodeURIComponent(account.chessCom.canonicalUsername)}`} className="button button-outline">Open my public coverage</Link></div>
    {pulse?.boardMoved?.length ? <section className="pulse-universe-block"><p className="kicker">YOUR BOARD MOVED</p><PulseCards cards={pulse.boardMoved} /></section> : null}
    {pulse?.sinceAway ? <section className="pulse-universe-block"><PulseCards cards={[pulse.sinceAway]} /></section> : null}
    {pulse?.proximity?.length ? <section className="pulse-universe-block"><p className="kicker">IN REACH · ON YOUR RADAR</p><PulseCards cards={pulse.proximity} /></section> : null}
    {pulse?.provisional?.length ? <section className="pulse-universe-block"><p className="kicker">CURRENT EPISODE · PRIVATE PROJECTION</p><PulseCards cards={pulse.provisional} /></section> : null}
    {pulse ? <UniverseEventCards events={pulse.fieldMoved} heading="THE FIELD MOVED" account={account} socialPlayers={socialPlayers} onSocialAction={onSocialAction} /> : null}
    {pulse ? <UniverseEventCards events={pulse.whatsHot} heading="WHAT'S HOT" account={account} socialPlayers={socialPlayers} onSocialAction={onSocialAction} /> : null}
    <section className="pulse-universe-block"><div className="pulse-block-heading"><p className="kicker">OFFICIAL STANDINGS</p>{pulse?.fieldLabels?.length ? <span>{pulse.fieldLabels.join(" · ")}</span> : null}</div>{standings.length ? <div className="universe-standing-grid">{standings.slice(0, 8).map((standing) => <article key={`${standing.categoryId}:${standing.scopeLabel ?? "all"}`}><span>{standing.categoryTitle}{standing.scopeLabel ? ` · ${standing.scopeLabel}` : ""}</span><strong>#{standing.rank} of {standing.denominator}</strong><p>{standing.label ?? standing.valueLabel}</p></article>)}</div> : <div className="inbox-empty"><Inbox size={20} /><div><strong>No active recognition yet.</strong><p>Your completed Desk has not yet met a current comparison category's minimum evidence.</p></div></div>}</section>
    {learning.length ? <section className="pulse-universe-block"><p className="kicker">TOP PERFORMANCES TO LEARN FROM</p><div className="universe-learning-grid">{learning.map(({ group, board, entry }) => { const social = socialPlayers[entry.player.toLowerCase()]; const canConnect = entry.participantId.startsWith("live:"); return <article key={`${board.key}:${entry.player}`}><Link href={entry.coverageHref ?? `/player/${encodeURIComponent(entry.player)}`}><span>#1 {group.title}{board.scopeLabel ? ` · ${board.scopeLabel}` : ""}</span><h3>{entry.player}</h3><strong>{entry.valueLabel}</strong><p>{entry.coverageHeadline ?? entry.evidence}</p><small>Open positive coverage</small></Link>{canConnect ? <button type="button" className="text-link social-text-button" onClick={() => void onSocialAction(entry.player)}>{social?.relationshipStatus === "friends" ? "Compare" : social ? "Open Friends" : "Add Friend"}</button> : null}</article>; })}</div></section> : null}
    <Link href="/feed" className="text-link">Explore the global BoardSignal Universe</Link>
  </section>;
}
function RoomLoading() {
  return <div id="main" className="desk-processing-page"><section className="container desk-processing-card"><div className="processing-orb"><LoaderCircle /></div><p className="kicker">MY PLAYER ROOM</p><h1>Loading your private BoardSignal state</h1></section></div>;
}

function RoomError({ error }: { error: string }) {
  return <div id="main" className="desk-processing-page"><section className="container desk-processing-card error-card"><ShieldCheck /><p className="kicker">PLAYER ROOM HELD SAFELY</p><h1>Private state could not be loaded</h1><p>{error}</p></section></div>;
}
