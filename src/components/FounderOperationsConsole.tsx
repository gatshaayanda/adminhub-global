"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, RefreshCcw, Search } from "lucide-react";

type TrustpilotStatus = "not_asked" | "asked_visit_3" | "final_ask" | "says_reviewed" | "declined" | "not_yet";
type PlayerFilter = "all" | "recent" | "new" | "new_google" | "returned" | "feedback" | "notes" | "ask" | "trustpilot";
type PlayerSort = "latest" | "visits" | "engaged" | "username";

type ChessSnapshot = {
  periodStart: string;
  periodEnd: string;
  checkedAt: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
};

type ChessDelta = {
  periodStart: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
};

type EngagementRow = {
  uid: string;
  playerId: number;
  username: string;
  profileUrl?: string;
  accountStatus?: string;
  identityStatus?: string;
  access: {
    origin?: "new_player_via_google" | "existing_player_linked_google";
    googleLinkedAt?: string;
    latestMethod?: "google_onboarding" | "google_return" | "player_session";
    latestAccessAt?: string;
  };
  usage: {
    roomVisitCount: number;
    firstRoomVisitAt?: string;
    latestRoomVisitAt?: string;
    lastActiveAt?: string;
    totalForegroundEngagedSeconds: number;
    latestSessionForegroundEngagedSeconds: number;
  };
  currentBoardSignal: {
    helpfulCount: number;
    notHelpfulCount: number;
    latestFeedbackAt?: string;
    noteCount: number;
    notesCreated: number;
    latestNoteAt?: string;
    askQuestionCount: number;
    latestAskAt?: string;
  };
  chess: {
    current?: ChessSnapshot;
    sincePreviousVisit?: ChessDelta;
  };
  trustpilot: {
    status: TrustpilotStatus;
    firstAskShownAt?: string;
    finalAskShownAt?: string;
    resolvedAt?: string;
  };
};

type IntelligenceResponse = {
  generatedAt?: string;
  metrics: {
    activePlayers: number;
    reviewsForming: number;
    reviewsReady: number;
    followUpsDue: number;
    notSeenRecently: number;
    unreadReplies: number;
  };
  attention: {
    followUpsDue: number;
    unreadReplies: number;
    exceptions: number;
    identityConflicts: number;
  };
  engagement: {
    roomVisits: number;
    playersReturning: number;
    foregroundEngagedSeconds: number;
    helpful: number;
    notHelpful: number;
    notesCreated: number;
    askQuestions: number;
    updatedAt?: string;
  };
  validation: {
    playersServed: number;
    originalReviews: number;
    liveReviews: number;
    historicalPeriods: number;
    totalReviewsProduced: number;
    originalToLive: number;
  };
  rows: EngagementRow[];
};

const PAGE_SIZE = 20;
const FILTERS: Array<[PlayerFilter, string]> = [
  ["all", "ALL"],
  ["recent", "RECENT ACTIVE"],
  ["new", "NEW"],
  ["new_google", "NEW VIA GOOGLE"],
  ["returned", "RETURNED"],
  ["feedback", "FEEDBACK"],
  ["notes", "NOTES"],
  ["ask", "ASK USED"],
  ["trustpilot", "TRUSTPILOT"],
];
const SORTS: Array<[PlayerSort, string]> = [
  ["latest", "LATEST ACTIVITY"],
  ["visits", "ROOM VISITS"],
  ["engaged", "ENGAGED TIME"],
  ["username", "USERNAME"],
];

function displayDate(value?: string, empty = "—") {
  if (!value) return empty;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed)
    ? new Date(parsed).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : empty;
}

function relativeActivity(value?: string) {
  if (!value) return "NOT RECORDED";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "NOT RECORDED";
  const days = Math.max(0, Math.floor((Date.now() - parsed) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function duration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  if (safe < 60) return `${safe}s`;
  const minutes = Math.floor(safe / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function trustpilotLabel(status: TrustpilotStatus) {
  if (status === "asked_visit_3") return "ASKED ON VISIT 3";
  if (status === "final_ask") return "FINAL ASK SHOWN";
  if (status === "says_reviewed") return "SAYS REVIEWED";
  if (status === "declined") return "DECLINED";
  if (status === "not_yet") return "NOT YET · CYCLE CLOSED";
  return "NOT ASKED";
}

function accessOriginLabel(row: EngagementRow) {
  if (row.access.origin === "new_player_via_google") return "NEW VIA GOOGLE";
  if (row.access.origin === "existing_player_linked_google") return "EXISTING · GOOGLE LINKED";
  if (row.access.googleLinkedAt) return "GOOGLE LINKED";
  return "EXISTING ACCESS";
}

function accessMethodLabel(row: EngagementRow) {
  if (row.access.latestMethod === "google_return") return "Latest: Google return";
  if (row.access.latestMethod === "google_onboarding") return "Latest: Google onboarding";
  if (row.access.latestMethod === "player_session") return "Latest: player session";
  return "Latest method not yet projected";
}

function chessLabel(row: EngagementRow) {
  const delta = row.chess.sincePreviousVisit;
  if (delta) {
    return {
      primary: `${delta.games} new game${delta.games === 1 ? "" : "s"}`,
      secondary: `${delta.wins}W · ${delta.draws}D · ${delta.losses}L since previous visit`,
    };
  }
  const current = row.chess.current;
  if (current) {
    return {
      primary: `${current.games} current-period game${current.games === 1 ? "" : "s"}`,
      secondary: `${current.wins}W · ${current.draws}D · ${current.losses}L · ${current.periodStart}`,
    };
  }
  return { primary: "No cheap chess snapshot", secondary: "Founder did not fetch Chess.com for this row." };
}

function explicitUseCount(row: EngagementRow) {
  return row.currentBoardSignal.helpfulCount
    + row.currentBoardSignal.notHelpfulCount
    + row.currentBoardSignal.notesCreated
    + row.currentBoardSignal.askQuestionCount;
}

function isRecent(row: EngagementRow) {
  const parsed = Date.parse(row.usage.lastActiveAt ?? "");
  return Number.isFinite(parsed) && Date.now() - parsed <= 7 * 24 * 60 * 60 * 1000;
}

function matchesFilter(row: EngagementRow, filter: PlayerFilter) {
  if (filter === "recent") return isRecent(row);
  if (filter === "new") return row.usage.roomVisitCount === 1;
  if (filter === "new_google") return row.access.origin === "new_player_via_google";
  if (filter === "returned") return row.usage.roomVisitCount >= 2;
  if (filter === "feedback") return row.currentBoardSignal.helpfulCount + row.currentBoardSignal.notHelpfulCount > 0;
  if (filter === "notes") return row.currentBoardSignal.noteCount > 0 || row.currentBoardSignal.notesCreated > 0;
  if (filter === "ask") return row.currentBoardSignal.askQuestionCount > 0;
  if (filter === "trustpilot") return row.trustpilot.status !== "not_asked";
  return true;
}

function sortedRows(rows: EngagementRow[], sort: PlayerSort) {
  return [...rows].sort((left, right) => {
    if (sort === "username") return left.username.localeCompare(right.username);
    if (sort === "visits") return right.usage.roomVisitCount - left.usage.roomVisitCount;
    if (sort === "engaged") return right.usage.totalForegroundEngagedSeconds - left.usage.totalForegroundEngagedSeconds;
    return String(right.usage.lastActiveAt ?? "").localeCompare(String(left.usage.lastActiveAt ?? ""));
  });
}

async function fetchIntelligence(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json() as { ok?: boolean; intelligence?: IntelligenceResponse; error?: string };
  if (!response.ok || !body.ok || !body.intelligence) throw new Error(body.error ?? "Founder product intelligence could not be loaded.");
  return body.intelligence;
}

export default function FounderOperationsConsole() {
  const [intelligence, setIntelligence] = useState<IntelligenceResponse | null>(null);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<PlayerFilter>("all");
  const [sort, setSort] = useState<PlayerSort>("latest");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await fetchIntelligence("/api/admin/boardsignal/founder-engagement");
      setIntelligence((current) => ({ ...next, rows: current?.rows ?? [] }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Founder product intelligence could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRows = useCallback(async () => {
    setRowsLoading(true);
    setError("");
    try {
      const next = await fetchIntelligence("/api/admin/boardsignal/founder-engagement?view=rows");
      setIntelligence(next);
      setRowsLoaded(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Player engagement could not be loaded.");
    } finally {
      setRowsLoading(false);
    }
  }, []);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => { setPage(1); }, [filter, sort, search]);

  const filtered = useMemo(() => {
    if (!intelligence || !rowsLoaded) return [];
    const needle = search.trim().toLowerCase();
    const matching = intelligence.rows.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!needle) return true;
      return row.username.toLowerCase().includes(needle) || String(row.playerId).includes(needle);
    });
    return sortedRows(matching, sort);
  }, [filter, intelligence, rowsLoaded, search, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const shown = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (error && !intelligence) return <p className="form-error" role="alert">{error}</p>;
  if (!intelligence) return <div className="founder-directory-loading"><LoaderCircle className="button-spinner" /> Loading Founder product intelligence</div>;

  const helpfulTotal = intelligence.engagement.helpful + intelligence.engagement.notHelpful;
  const helpfulRate = helpfulTotal > 0 ? Math.round((intelligence.engagement.helpful / helpfulTotal) * 100) : undefined;
  const headline = [
    ["PLAYERS", intelligence.metrics.activePlayers, "Canonical active BoardSignal players"],
    ["ROOM VISITS", intelligence.engagement.roomVisits, "Explicit authenticated entries captured by M4"],
    ["PLAYERS RETURNING", intelligence.engagement.playersReturning, "Actual first → second room-visit transitions captured by M4"],
    ["ENGAGED TIME", duration(intelligence.engagement.foregroundEngagedSeconds), "Foreground time only; hidden tabs are excluded"],
    ["HELPFUL", helpfulRate === undefined ? "—" : `${helpfulRate}%`, `👍 ${intelligence.engagement.helpful} · 👎 ${intelligence.engagement.notHelpful}`],
  ] as const;
  const productHistory = [
    ["REVIEWS PRODUCED", intelligence.validation.totalReviewsProduced],
    ["ORIGINAL MANUAL", intelligence.validation.originalReviews],
    ["ORGANIC LIVE", intelligence.validation.liveReviews],
    ["HISTORICAL ONBOARDING", intelligence.validation.historicalPeriods],
    ["PLAYERS WITH COMPLETED REVIEW", intelligence.validation.playersServed],
    ["ORIGINAL → LIVE", intelligence.validation.originalToLive],
  ] as const;
  const attention = [
    ["FOLLOW-UPS DUE", intelligence.attention.followUpsDue],
    ["UNREAD REPLIES", intelligence.attention.unreadReplies],
    ["EXCEPTIONS", intelligence.attention.exceptions],
    ["IDENTITY CONFLICTS", intelligence.attention.identityConflicts],
  ] as const;

  return <div className="founder-ops-console">
    <section className="founder-live-metrics" aria-labelledby="founder-product-intelligence-heading">
      <div className="founder-ops-heading">
        <div>
          <p className="kicker">FOUNDER PRODUCT INTELLIGENCE</p>
          <h2 id="founder-product-intelligence-heading">Is BoardSignal actually being used?</h2>
          <p>Current BoardSignal leads. These are compact explicit account signals, not page views, clickstream events or a Week 1/2/3/4 scorecard.</p>
        </div>
        <button className="button button-quiet" type="button" onClick={() => void loadSummary()} disabled={loading}>
          {loading ? <LoaderCircle className="button-spinner" size={15} /> : <RefreshCcw size={15} />} Refresh
        </button>
      </div>
      <div className="founder-compact-metrics">
        {headline.map(([label, value, detail]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
      </div>
      <p className="founder-data-completeness">M4 headline interaction totals accumulate from explicit authenticated actions after this patch. Per-player room-visit counts remain the cumulative M3 source of truth.</p>
    </section>

    <section className="founder-validation-section" aria-labelledby="current-use-heading">
      <div className="founder-ops-heading"><div><p className="kicker">CURRENT BOARDSIGNAL USE</p><h2 id="current-use-heading">What players explicitly do with it.</h2><p>No impression counter is treated as engagement. Notes expose counts and timestamps only; Ask BoardSignal exposes usage counts only.</p></div></div>
      <div className="founder-validation-grid">
        <article><span>NOTES CREATED</span><strong>{intelligence.engagement.notesCreated}</strong></article>
        <article><span>ASK QUESTIONS</span><strong>{intelligence.engagement.askQuestions}</strong></article>
        <article><span>HELPFUL REACTIONS</span><strong>{intelligence.engagement.helpful}</strong></article>
        <article><span>NOT HELPFUL</span><strong>{intelligence.engagement.notHelpful}</strong></article>
      </div>
    </section>

    <section className="founder-live-directory" id="founder-player-engagement" aria-labelledby="player-engagement-heading">
      <div className="founder-ops-heading">
        <div>
          <p className="kicker">PLAYER ENGAGEMENT</p>
          <h2 id="player-engagement-heading">One player, one account picture.</h2>
          <p>{rowsLoaded ? `${filtered.length} matching player${filtered.length === 1 ? "" : "s"} · at most ${PAGE_SIZE} shown per page.` : "Player rows are not read until you open this view. The load is one account document per player, with no Review, note, chat or Chess.com fan-out."}</p>
        </div>
        {!rowsLoaded ? <button className="button button-dark" type="button" onClick={() => void loadRows()} disabled={rowsLoading}>{rowsLoading ? <LoaderCircle className="button-spinner" size={15} /> : null} Open player engagement</button> : null}
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {rowsLoaded ? <>
        <div className="founder-ops-controls">
          <label className="founder-ops-search"><span>Search player</span><div><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Username or Chess.com ID" /></div></label>
          <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as PlayerSort)}>{SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="founder-filter-strip" aria-label="Player engagement filters">{FILTERS.map(([value, label]) => <button type="button" key={value} className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
        {shown.length ? <div className="founder-ops-table" role="table" aria-label="Player engagement intelligence">
          <div className="founder-ops-table-head" role="row"><span>PLAYER</span><span>ACCESS</span><span>USAGE</span><span>CHESS SINCE USE</span><span>CURRENT BOARDSIGNAL</span><span>FEEDBACK</span><span>TRUSTPILOT</span><span>LAST ACTIVE</span><span>ACTION</span></div>
          {shown.map((row) => {
            const chess = chessLabel(row);
            const feedbackTotal = row.currentBoardSignal.helpfulCount + row.currentBoardSignal.notHelpfulCount;
            return <article className="founder-ops-row" role="row" key={row.uid}>
              <div className="founder-ops-main-row">
                <div data-label="PLAYER"><strong>{row.username}</strong><small>Chess.com ID {row.playerId}</small></div>
                <div data-label="ACCESS"><strong>{accessOriginLabel(row)}</strong><small>{accessMethodLabel(row)}</small></div>
                <div data-label="USAGE"><strong>{row.usage.roomVisitCount} visit{row.usage.roomVisitCount === 1 ? "" : "s"}</strong><small>{duration(row.usage.totalForegroundEngagedSeconds)} foreground engaged</small></div>
                <div data-label="CHESS SINCE USE"><strong>{chess.primary}</strong><small>{chess.secondary}</small></div>
                <div data-label="CURRENT BOARDSIGNAL"><strong>{explicitUseCount(row)} explicit action{explicitUseCount(row) === 1 ? "" : "s"}</strong><small>{row.currentBoardSignal.noteCount} note{row.currentBoardSignal.noteCount === 1 ? "" : "s"} · {row.currentBoardSignal.askQuestionCount} Ask question{row.currentBoardSignal.askQuestionCount === 1 ? "" : "s"}</small></div>
                <div data-label="FEEDBACK"><strong>{feedbackTotal ? `👍 ${row.currentBoardSignal.helpfulCount} · 👎 ${row.currentBoardSignal.notHelpfulCount}` : "NO FEEDBACK YET"}</strong><small>{row.currentBoardSignal.latestFeedbackAt ? `Latest ${displayDate(row.currentBoardSignal.latestFeedbackAt)}` : "Explicit Helpful only"}</small></div>
                <div data-label="TRUSTPILOT"><strong>{trustpilotLabel(row.trustpilot.status)}</strong><small>{row.trustpilot.resolvedAt ? `Resolved ${displayDate(row.trustpilot.resolvedAt)}` : "Independent of sentiment and chess results"}</small></div>
                <div data-label="LAST ACTIVE"><strong>{relativeActivity(row.usage.lastActiveAt)}</strong><small>{displayDate(row.usage.lastActiveAt)}</small></div>
                <div data-label="ACTION"><Link className="button button-quiet" href={`/admin/players?player=${encodeURIComponent(String(row.playerId))}`}>MANAGE</Link></div>
              </div>
              <details className="founder-ops-details"><summary>Safe detail</summary><div className="founder-ops-detail-grid"><dl>
                <div><dt>First room visit</dt><dd>{displayDate(row.usage.firstRoomVisitAt, "Not recorded")}</dd></div>
                <div><dt>Latest room visit</dt><dd>{displayDate(row.usage.latestRoomVisitAt, "Not recorded")}</dd></div>
                <div><dt>Latest session engaged</dt><dd>{duration(row.usage.latestSessionForegroundEngagedSeconds)}</dd></div>
                <div><dt>Latest note activity</dt><dd>{displayDate(row.currentBoardSignal.latestNoteAt, "None")}</dd></div>
                <div><dt>Latest Ask activity</dt><dd>{displayDate(row.currentBoardSignal.latestAskAt, "None")}</dd></div>
                <div><dt>Identity state</dt><dd>{row.identityStatus ?? "Not recorded"}</dd></div>
              </dl><div className="founder-review-periods"><span>PRIVACY BOUNDARY</span><p>Founder sees note count/latest activity and Ask usage count/latest activity only. Private journal text and Ask conversation contents are not loaded here.</p>{row.profileUrl ? <a className="text-link" href={row.profileUrl} target="_blank" rel="noreferrer">Open Chess.com profile <ExternalLink size={14} /></a> : null}</div></div></details>
            </article>;
          })}
        </div> : <div className="universe-empty"><p>No players match this engagement view.</p></div>}
        <nav className="founder-pagination" aria-label="Player engagement pages"><button type="button" className="button button-quiet" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={15} /> Previous</button><span>Page {currentPage} of {pages}</span><button type="button" className="button button-quiet" disabled={currentPage >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Next <ChevronRight size={15} /></button></nav>
      </> : null}
    </section>

    <section className="founder-attention-section" aria-labelledby="secondary-ops-heading">
      <div className="founder-ops-heading"><div><p className="kicker">SECONDARY OPERATIONS</p><h2 id="secondary-ops-heading">Exceptions and support, not the product score.</h2><p>These remain operational queues. They do not define whether the product is engaging.</p></div></div>
      <div className="founder-attention-grid">{attention.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{value ? "Review in Founder tools" : "Nothing flagged"}</small></article>)}</div>
    </section>

    <section className="founder-validation-section" aria-labelledby="product-history-heading">
      <div className="founder-ops-heading"><div><p className="kicker">PRODUCT HISTORY / VALIDATION</p><h2 id="product-history-heading">Cumulative truth stays intact.</h2><p>Historical Review production is validation evidence. It is no longer presented as the primary operating model for current player engagement.</p></div></div>
      <div className="founder-validation-grid">{productHistory.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <p className="founder-data-completeness">Reviews produced = Original Manual + Organic Live + Historical Onboarding. Historical onboarding is real Review output, but it is not automatically a player return. No “retention Review” label is inferred from verified Review production.</p>
    </section>
  </div>;
}
