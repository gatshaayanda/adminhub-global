"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ExternalLink,
  LoaderCircle,
  RefreshCcw,
  Search,
  Users,
} from "lucide-react";
import type { CanonicalReportPeriod, ReviewHistoryCoverage } from "@/lib/boardsignal/reviewPeriods";
import {
  filterFounderOperationRows,
  sortFounderOperationRows,
  type FounderHistoryVisibility,
  type FounderOperationComparableRow,
  type FounderOperationFilter,
  type FounderOperationSort,
  type FounderOpsContactMethod,
} from "@/lib/boardsignal/founderOperationsLogic";
import {
  FOUNDER_ACTION_FILTERS,
  FOUNDER_COMMAND_CENTER_STORAGE_KEY,
  appendFounderSnapshot,
  calculateFounderDeltas,
  createFounderLocalSnapshot,
  founderSystemState,
  founderTrendValues,
  parseFounderSnapshotHistory,
  retentionConversion,
  type FounderCounterDeltas,
  type FounderCounterKey,
  type FounderLocalSnapshot,
} from "@/lib/boardsignal/founderCommandCenter";
import styles from "./FounderCommandCenter.module.css";

type OperationsRow = FounderOperationComparableRow & {
  playerId?: number;
  profileUrl?: string;
  avatar?: string;
  accountStatus?: string;
  identityStatus?: string;
  identityReviewStatus?: string;
  publicHighlightsStatus?: string;
  preferredContactMethod?: string;
  preferredContactValue?: string;
  latestReview?: { periodStart?: string; periodEnd?: string; periodLabel?: string; publishedAt?: string };
  latestReportPeriod?: CanonicalReportPeriod;
  recentReportPeriods?: CanonicalReportPeriod[];
  historyCoverage?: ReviewHistoryCoverage;
  officialChessStatePeriod?: { periodStart?: string; periodEnd?: string; periodLabel?: string };
  reviewPeriods: Array<{ periodStart: string; periodEnd: string; periodLabel?: string; source: "original" | "live" }>;
  history: FounderHistoryVisibility;
  lastContactedAt?: string;
  lastContactMethod?: FounderOpsContactMethod;
  followUpSnoozedUntil?: string;
  pendingRequestId?: string;
  exceptionTitles: string[];
  accessStatus?: string;
};

type OperationsResponse = {
  generatedAt: string;
  revision?: number;
  attention: { newRequests: number; followUpsDue: number; unreadReplies: number; exceptions: number; identityConflicts: number };
  metrics: { activePlayers: number; reviewsForming: number; reviewsReady: number; followUpsDue: number; notSeenRecently: number; unreadReplies: number };
  validation: {
    playersServed: number;
    verifiedReviews: number;
    originalReviews: number;
    liveReviews: number;
    historicalPeriods: number;
    totalReviewsProduced: number;
    originalToLive: number;
    r2Plus: number;
    r3Plus: number;
    r4: number;
    dataCompleteness: string;
  };
  rows: OperationsRow[];
};

type PulseMetric = {
  key: FounderCounterKey;
  label: string;
  meaning: string;
  action?: FounderOperationFilter;
};

const PAGE_SIZE = 20;
const FILTERS: Array<[FounderOperationFilter, string]> = [
  ["all", "ALL"],
  ["attention", "ATTENTION"],
  ["new_requests", "NEW REQUESTS"],
  ["follow_up_due", "FOLLOW-UP DUE"],
  ["reviews_ready", "REVIEWS READY"],
  ["reviews_forming", "REVIEWS FORMING"],
  ["unread_replies", "UNREAD REPLIES"],
  ["not_seen", "NOT SEEN 7D+"],
  ["identity", "IDENTITY"],
  ["exceptions", "EXCEPTIONS"],
];
const SORTS: Array<[FounderOperationSort, string]> = [
  ["attention", "ATTENTION"],
  ["next_review", "REVIEW DATE"],
  ["last_seen", "LAST SEEN"],
  ["review_count", "REVIEW COUNT"],
  ["username", "USERNAME"],
];
const CONTACT_METHODS: Array<[FounderOpsContactMethod, string]> = [
  ["email", "EMAIL"],
  ["discord", "DISCORD"],
  ["telegram", "TELEGRAM"],
  ["chesscom", "CHESS.COM"],
  ["other", "OTHER"],
];

const PULSE_METRICS: PulseMetric[] = [
  { key: "activePlayers", label: "ACTIVE PLAYERS", meaning: "Players currently inside the active Founder population.", action: "all" },
  { key: "reviewsForming", label: "REVIEWS FORMING", meaning: "Players with a cadence-aligned current week underway.", action: "reviews_forming" },
  { key: "reviewsReady", label: "REVIEWS READY", meaning: "Completed Reviews published after the player's last recorded visit.", action: "reviews_ready" },
  { key: "playersServed", label: "PLAYERS SERVED", meaning: "Distinct players with durable Review product output." },
  { key: "liveReviews", label: "ORGANIC REVIEWS", meaning: "Reviews produced by the live weekly BoardSignal loop, excluding onboarding history." },
  { key: "notSeenRecently", label: "NOT SEEN RECENTLY", meaning: "Players without a recorded visit in the operational recency window.", action: "not_seen" },
];

const CHANGE_METRICS: Array<{ key: FounderCounterKey; label: string }> = [
  { key: "activePlayers", label: "ACTIVE PLAYERS" },
  { key: "totalReviewsProduced", label: "TOTAL REVIEWS" },
  { key: "liveReviews", label: "ORGANIC LIVE" },
  { key: "playersServed", label: "PLAYERS SERVED" },
  { key: "r2Plus", label: "R2+" },
  { key: "r3Plus", label: "R3+" },
  { key: "r4", label: "R4+" },
  { key: "reviewsForming", label: "REVIEWS FORMING" },
  { key: "notSeenRecently", label: "NOT SEEN RECENTLY" },
  { key: "exceptions", label: "EXCEPTIONS" },
];

function displayDate(value?: string, empty = "—") {
  if (!value) return empty;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : empty;
}

function displayDateTime(value?: string, empty = "Not available") {
  if (!value) return empty;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return empty;
  return new Date(parsed).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function relativeSeen(value?: string) {
  if (!value) return "NEVER / NOT RECORDED";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "NOT RECORDED";
  const days = Math.max(0, Math.floor((Date.now() - parsed) / (24 * 60 * 60 * 1000)));
  return days === 0 ? "Today" : days === 1 ? "1d ago" : `${days}d ago`;
}

function followUpLabel(row: OperationsRow) {
  if (row.followUpStatus === "snoozed") return `SNOOZED UNTIL ${displayDate(row.followUpSnoozedUntil)}`;
  if (row.followUpStatus === "due") return "DUE NOW";
  if (row.followUpStatus === "upcoming") return displayDate(row.followUpDueAt);
  if (row.followUpStatus === "check") return "CHECK";
  return "No follow-up";
}

function stateTone(row: OperationsRow) {
  if (row.exceptionCount || row.reviewCheckRequired || row.identityConflict) return "error";
  if (row.unreadReplies || row.pendingRequest || row.readyNotSeen || row.followUpStatus === "due") return "processing";
  return "ready";
}

function defaultContactMethod(row: OperationsRow): FounderOpsContactMethod {
  if (row.lastContactMethod) return row.lastContactMethod;
  if (row.preferredContactMethod === "email" || row.preferredContactMethod === "discord" || row.preferredContactMethod === "telegram") return row.preferredContactMethod;
  return row.profileUrl ? "chesscom" : "other";
}

function historyDetail(history: FounderHistoryVisibility) {
  if (!history.totalSlots) return { primary: "Not started", secondary: "Historical onboarding has not established a target window yet." };
  const state = history.status === "retryable" ? " · retryable" : history.status === "complete" ? " · complete" : " · pending";
  return {
    primary: `${history.evaluatedSlots} / ${history.totalSlots} evaluated`,
    secondary: `${history.reviewSlots} Review${history.reviewSlots === 1 ? "" : "s"} · ${history.noActivitySlots} no-activity${state}`,
  };
}

async function fetchOperations(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json() as { ok?: boolean; operations?: OperationsResponse; error?: string };
  if (!response.ok || !body.ok || !body.operations) throw new Error(body.error ?? "Founder operations could not be loaded.");
  return body.operations;
}

function deltaLabel(delta: number | undefined) {
  if (delta === undefined) return "BASELINE";
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "NO CHANGE";
}

function deltaSentence(key: FounderCounterKey, delta: number | undefined) {
  if (delta === undefined) return "Baseline established for this device.";
  if (delta === 0) {
    if (key === "r2Plus" || key === "r3Plus" || key === "r4") return "No new retention movement yet.";
    return "No change since your last successful check.";
  }
  const amount = Math.abs(delta);
  const more = delta > 0;
  if (key === "activePlayers") return `${amount} ${more ? "more" : "fewer"} active player${amount === 1 ? "" : "s"} since your last check.`;
  if (key === "totalReviewsProduced") return `${amount} ${more ? "new" : "fewer recorded"} total Review${amount === 1 ? "" : "s"} since your last check.`;
  if (key === "liveReviews") return `${amount} ${more ? "new Organic Review" : "fewer Organic Review"}${amount === 1 ? "" : "s"} recorded.`;
  if (key === "playersServed") return `${amount} ${more ? "additional" : "fewer"} player${amount === 1 ? "" : "s"} served in cumulative truth.`;
  if (key === "r2Plus") return `${amount} player${amount === 1 ? "" : "s"} ${more ? "crossed into" : "moved out of"} R2+ cumulative truth.`;
  if (key === "r3Plus") return `${amount} player${amount === 1 ? "" : "s"} ${more ? "crossed into" : "moved out of"} R3+ cumulative truth.`;
  if (key === "r4") return `${amount} player${amount === 1 ? "" : "s"} ${more ? "crossed into" : "moved out of"} R4+ cumulative truth.`;
  if (key === "reviewsForming") return `${amount} ${more ? "more" : "fewer"} Review${amount === 1 ? " is" : "s are"} forming.`;
  if (key === "notSeenRecently") return `${amount} ${more ? "more" : "fewer"} player${amount === 1 ? " is" : "s are"} not seen recently.`;
  if (key === "exceptions") return `Exceptions ${more ? "increased" : "decreased"} by ${amount}.`;
  return `${amount} ${more ? "more" : "fewer"} since your last check.`;
}

function freshnessLabel(snapshot: FounderLocalSnapshot, now: Date) {
  const parsed = Date.parse(snapshot.generatedAt);
  if (!Number.isFinite(parsed)) return { label: "UNKNOWN FRESHNESS", tone: "info" as const };
  const minutes = Math.max(0, Math.floor((now.getTime() - parsed) / 60000));
  if (minutes <= 5) return { label: "DATA CURRENT", tone: "healthy" as const };
  if (minutes <= 30) return { label: `${minutes}M OLD`, tone: "info" as const };
  return { label: `${minutes}M OLD · REFRESH ADVISED`, tone: "attention" as const };
}

function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return <div className={styles.sparklineEmpty} aria-label={`${label}: trend starts after the next successful check`}>TREND STARTS NEXT CHECK</div>;
  const width = 120;
  const height = 34;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 3 - ((value - min) / span) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return <svg className={styles.sparkline} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} local trend across ${values.length} successful checks`}><polyline points={points} /></svg>;
}

export default function FounderOperationsConsole() {
  const [operations, setOperations] = useState<OperationsResponse | null>(null);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [filter, setFilter] = useState<FounderOperationFilter>("attention");
  const [sort, setSort] = useState<FounderOperationSort>("attention");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [contactMethods, setContactMethods] = useState<Record<string, FounderOpsContactMethod>>({});
  const [snapshot, setSnapshot] = useState<FounderLocalSnapshot | null>(null);
  const [history, setHistory] = useState<FounderLocalSnapshot[]>([]);
  const [deltas, setDeltas] = useState<FounderCounterDeltas | null>(null);
  const [founderNow, setFounderNow] = useState(() => new Date());
  const historyRef = useRef<FounderLocalSnapshot[]>([]);

  const rememberSuccessfulSummary = useCallback((next: OperationsResponse) => {
    const nextSnapshot = createFounderLocalSnapshot(next);
    const previous = historyRef.current.at(-1);
    setDeltas(calculateFounderDeltas(nextSnapshot, previous));
    setSnapshot(nextSnapshot);
    const nextHistory = appendFounderSnapshot(historyRef.current, nextSnapshot);
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    try {
      window.localStorage.setItem(FOUNDER_COMMAND_CENTER_STORAGE_KEY, JSON.stringify(nextHistory));
    } catch {
      // Local Founder history is convenience-only; live aggregate remains authoritative.
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await fetchOperations("/api/admin/boardsignal/operations");
      setOperations((current) => ({ ...next, rows: current?.rows ?? [] }));
      rememberSuccessfulSummary(next);
      setFounderNow(new Date());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Founder operations could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [rememberSuccessfulSummary]);

  const loadRows = useCallback(async () => {
    setRowsLoading(true);
    setError("");
    try {
      const next = await fetchOperations("/api/admin/boardsignal/operations?view=rows");
      setOperations(next);
      setRowsLoaded(true);
      const hasAttention = next.rows.some((row) => row.attentionReasons.length > 0);
      setFilter((current) => current === "attention" && !hasAttention ? "all" : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Player operations could not be loaded.");
    } finally {
      setRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    let restored: FounderLocalSnapshot[] = [];
    try {
      restored = parseFounderSnapshotHistory(window.localStorage.getItem(FOUNDER_COMMAND_CENTER_STORAGE_KEY));
    } catch {
      restored = [];
    }
    historyRef.current = restored;
    setHistory(restored);
    const latest = restored.at(-1);
    if (latest) {
      setSnapshot(latest);
      setDeltas(calculateFounderDeltas(latest, restored.at(-2)));
    }
  }, []);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => { setPage(1); }, [filter, sort, search]);

  const filtered = useMemo(
    () => operations && rowsLoaded ? sortFounderOperationRows(filterFounderOperationRows(operations.rows, filter, search), sort) as OperationsRow[] : [],
    [filter, operations, rowsLoaded, search, sort],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE);

  async function mutate(row: OperationsRow, action: "markContacted" | "snooze" | "clearSnooze", extra: Record<string, unknown> = {}) {
    if (row.uid.startsWith("request:")) return;
    setBusy(`${row.uid}:${action}`);
    setError("");
    try {
      const response = await fetch("/api/admin/boardsignal/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action, uid: row.uid, ...extra }),
      });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Founder follow-up state could not be updated.");
      await Promise.all([loadSummary(), loadRows()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Founder follow-up state could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  function chooseFilter(next: FounderOperationFilter) {
    setFilter(next);
    void loadRows().then(() => document.getElementById("founder-live-operations")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const currentSnapshot = snapshot;
  const systemState = currentSnapshot ? founderSystemState(currentSnapshot) : "normal";
  const freshness = currentSnapshot ? freshnessLabel(currentSnapshot, founderNow) : { label: "ESTABLISHING STATE", tone: "info" as const };
  const stateLabel = systemState === "normal" ? "SYSTEM NORMAL" : "ATTENTION REQUIRED";
  const criticalCount = currentSnapshot ? currentSnapshot.counters.exceptions + currentSnapshot.counters.identityConflicts : 0;
  const attentionCount = currentSnapshot ? currentSnapshot.counters.newRequests + currentSnapshot.counters.followUpsDue + currentSnapshot.counters.unreadReplies : 0;

  if (!currentSnapshot && !operations && error) return <p className="form-error" role="alert">{error}</p>;
  if (!currentSnapshot && !operations) {
    return <div className={styles.loadingShell}><LoaderCircle className="button-spinner" /> Establishing Founder Command Center state from the aggregate operations endpoint…</div>;
  }

  const counters = currentSnapshot?.counters ?? createFounderLocalSnapshot(operations as OperationsResponse).counters;
  const actionCards: Array<{ key: keyof typeof FOUNDER_ACTION_FILTERS; label: string; severity: "attention" | "critical" }> = [
    { key: "newRequests", label: "NEW REQUESTS", severity: "attention" },
    { key: "followUpsDue", label: "FOLLOW-UPS DUE", severity: "attention" },
    { key: "unreadReplies", label: "UNREAD REPLIES", severity: "attention" },
    { key: "exceptions", label: "REVIEW / SYSTEM EXCEPTIONS", severity: "critical" },
    { key: "identityConflicts", label: "IDENTITY CONFLICTS", severity: "critical" },
  ];

  const r2Conversion = retentionConversion(counters.r2Plus, counters.playersServed);
  const r3Conversion = retentionConversion(counters.r3Plus, counters.r2Plus);
  const r4Conversion = retentionConversion(counters.r4, counters.r3Plus);

  return <div className={styles.console}>
    <section className={styles.commandHeader} aria-labelledby="founder-command-center-heading">
      <div className={styles.commandEyebrow}>ADMIN HUB // BOARDSIGNAL CONTROL</div>
      <div className={styles.commandHeaderGrid}>
        <div>
          <p className={styles.sectionNumber}>01 // SYSTEM STATE</p>
          <h1 id="founder-command-center-heading">FOUNDER COMMAND CENTER</h1>
          <div className={`${styles.systemState} ${styles[systemState]}`}>
            <span className={styles.statusLed} aria-hidden="true" />
            <strong>{stateLabel}</strong>
            <span>{criticalCount > 0 ? `${criticalCount} critical signal${criticalCount === 1 ? "" : "s"}` : attentionCount > 0 ? `${attentionCount} action signal${attentionCount === 1 ? "" : "s"}` : "No Founder action counters are raised"}</span>
          </div>
        </div>
        <div className={styles.telemetryPanel}>
          <div><span>FOUNDER LOCAL TIME</span><strong>{founderNow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong></div>
          <div><span>LAST DATA SYNC</span><strong>{displayDateTime(currentSnapshot?.capturedAt)}</strong></div>
          <div><span>FRESHNESS</span><strong className={styles[freshness.tone]}>{freshness.label}</strong></div>
          <div><span>SOURCE</span><strong>{operations ? "CURRENT MATERIALIZED AGGREGATE" : "LOCAL FOUNDER SNAPSHOT"}</strong></div>
          <button type="button" className={styles.refreshButton} onClick={() => void loadSummary()} disabled={loading}>
            {loading ? <LoaderCircle className="button-spinner" size={16} /> : <RefreshCcw size={16} />} MANUAL REFRESH
          </button>
        </div>
      </div>
      {error ? <p className={styles.syncWarning} role="status"><AlertTriangle size={16} /> Live refresh failed. Showing the last successful Founder state where available. {error}</p> : null}
    </section>

    <section className={styles.changeSection} aria-labelledby="since-last-check-heading">
      <div className={styles.sectionHeading}>
        <div><p className={styles.sectionNumber}>02 // CHANGE DETECTION</p><h2 id="since-last-check-heading">Since your last check.</h2></div>
        <p>{deltas ? "Compared with this browser's previous successful aggregate snapshot." : "Baseline established. Changes will appear next time you return."}</p>
      </div>
      <div className={styles.changeGrid}>
        {CHANGE_METRICS.map(({ key, label }) => {
          const delta = deltas?.[key];
          return <article key={key} className={styles.changeCard}>
            <div><span>{label}</span><strong className={delta && delta > 0 ? styles.deltaUp : delta && delta < 0 ? styles.deltaDown : undefined}>{deltaLabel(delta)}</strong></div>
            <p>{deltaSentence(key, delta)}</p>
            <Sparkline values={founderTrendValues(history, key)} label={label} />
            {key === "activePlayers" && delta !== undefined && delta !== 0 ? <button type="button" onClick={() => chooseFilter("all")} className={styles.inlineAction}>SEE WHO <Users size={14} /></button> : null}
          </article>;
        })}
      </div>
    </section>

    <section className={styles.pulseSection} aria-labelledby="live-product-pulse-heading">
      <div className={styles.sectionHeading}><div><p className={styles.sectionNumber}>03 // LIVE PRODUCT PULSE</p><h2 id="live-product-pulse-heading">BoardSignal right now.</h2></div><p>Current materialized Founder truth, explained without a wall of raw numbers.</p></div>
      <div className={styles.pulseGrid}>
        {PULSE_METRICS.map((metric) => <article key={metric.key} className={styles.pulseCard}>
          <div className={styles.pulseTop}><span className={styles.signalGlyph} aria-hidden="true"><Activity size={17} /></span><span>{metric.label}</span></div>
          <strong className={styles.pulseValue}>{counters[metric.key]}</strong>
          <p>{metric.meaning}</p>
          <div className={styles.pulseFooter}><span>{deltas ? deltaLabel(deltas[metric.key]) + " SINCE LAST CHECK" : "LOCAL BASELINE"}</span>{metric.action ? <button type="button" onClick={() => chooseFilter(metric.action!)}>OPEN <ChevronRight size={14} /></button> : null}</div>
        </article>)}
      </div>
    </section>

    <section className={styles.actionSection} aria-labelledby="action-queue-heading">
      <div className={styles.sectionHeading}><div><p className={styles.sectionNumber}>04 // ACTION QUEUE</p><h2 id="action-queue-heading">What needs action.</h2></div><p>Counts come from the aggregate. Player rows stay unloaded until you open a matching queue.</p></div>
      <div className={styles.actionGrid}>
        {actionCards.map((card) => {
          const value = counters[card.key];
          const raised = value > 0;
          return <button type="button" key={card.key} className={`${styles.actionCard} ${raised ? styles[card.severity] : styles.quiet}`} onClick={() => chooseFilter(FOUNDER_ACTION_FILTERS[card.key] as FounderOperationFilter)}>
            <span className={styles.actionLed} aria-hidden="true" /><span>{card.label}</span><strong>{value}</strong><small>{raised ? "OPEN MATCHING PLAYERS" : "QUIET · NOTHING FLAGGED"}</small>
          </button>;
        })}
      </div>
    </section>

    <section className={styles.retentionSection} aria-labelledby="retention-ladder-heading">
      <div className={styles.sectionHeading}><div><p className={styles.sectionNumber}>05 // VALIDATION MOVEMENT</p><h2 id="retention-ladder-heading">Retention ladder.</h2></div><p>Historical onboarding remains product output, not a return event. Retention uses established cumulative Review truth only.</p></div>
      <div className={styles.retentionLayout}>
        <div className={styles.retentionLadder}>
          <div className={styles.retentionNode}><span>BASELINE</span><strong>{counters.playersServed}</strong><small>players served</small></div>
          <div className={styles.retentionRail} aria-hidden="true" />
          <div className={styles.retentionNode}><span>R2+</span><strong>{counters.r2Plus}</strong><small>{r2Conversion === null ? "No valid conversion yet" : `${r2Conversion.toFixed(1)}% of served`}</small></div>
          <div className={styles.retentionRail} aria-hidden="true" />
          <div className={styles.retentionNode}><span>R3+</span><strong>{counters.r3Plus}</strong><small>{r3Conversion === null ? "No valid conversion yet" : `${r3Conversion.toFixed(1)}% of R2+`}</small></div>
          <div className={styles.retentionRail} aria-hidden="true" />
          <div className={styles.retentionNode}><span>R4+</span><strong>{counters.r4}</strong><small>{r4Conversion === null ? "No valid conversion yet" : `${r4Conversion.toFixed(1)}% of R3+`}</small></div>
        </div>
        <div className={styles.truthPanel}>
          <div><span>TOTAL REVIEWS</span><strong>{counters.totalReviewsProduced}</strong><small>Original Manual + Organic Live + Historical Onboarding</small></div>
          <div><span>ORGANIC LIVE</span><strong>{counters.liveReviews}</strong><small>Live weekly Review product output</small></div>
          {operations ? <div><span>RETENTION REVIEWS</span><strong>{operations.validation.verifiedReviews}</strong><small>Original Manual + Organic Live</small></div> : null}
          {operations ? <p>{operations.validation.dataCompleteness}</p> : <p>Full validation notes load from the current aggregate when live sync succeeds.</p>}
        </div>
      </div>
    </section>

    <section className={styles.workspaceSection} aria-labelledby="deeper-workspaces-heading">
      <div className={styles.sectionHeading}><div><p className={styles.sectionNumber}>06 // DEEPER WORKSPACES</p><h2 id="deeper-workspaces-heading">Open the workstation you need.</h2></div><p>Detailed tools stay separate so the Command Center does not become another endless report.</p></div>
      <div className={styles.workspaceGrid}>
        <button type="button" onClick={() => chooseFilter("all")}><CircleDot size={17} /><span>PLAYER OPERATIONS</span><small>Lazy player rows</small></button>
        <a href="#founder-workspace-newsroom"><CircleDot size={17} /><span>NEWSROOM</span><small>Lazy editorial detail</small></a>
        <a href="#founder-workspace-traffic"><CircleDot size={17} /><span>TRAFFIC</span><small>Lazy analytics detail</small></a>
        <Link href="/admin/communications"><CircleDot size={17} /><span>COMMUNICATIONS</span><small>Founder outreach</small></Link>
        <Link href="/admin/desks"><CircleDot size={17} /><span>REVIEW PIPELINE</span><small>Desk / Review workflow</small></Link>
        <Link href="/admin/coverage"><CircleDot size={17} /><span>COVERAGE</span><small>Public coverage tools</small></Link>
        <Link href="/admin/exceptions"><CircleDot size={17} /><span>EXCEPTIONS</span><small>Operational repair</small></Link>
      </div>
    </section>

    <section className="founder-live-directory" id="founder-live-operations" aria-labelledby="live-player-operations-heading">
      <div className="founder-ops-heading">
        <div><p className="kicker">PLAYER OPERATIONS</p><h2 id="live-player-operations-heading">Players and the next operational action.</h2><p>{rowsLoaded ? `${filtered.length} matching row${filtered.length === 1 ? "" : "s"} · at most ${PAGE_SIZE} shown per page.` : "Individual player rows load only when you open this operational detail view."}</p></div>
        {!rowsLoaded ? <button className="button button-dark" type="button" onClick={() => void loadRows()} disabled={rowsLoading}>{rowsLoading ? <LoaderCircle className="button-spinner" size={15} /> : null} Open player operations</button> : null}
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {rowsLoaded ? <>
        <div className="founder-ops-controls"><label className="founder-ops-search"><span>Search player or contact</span><div><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Username or contact" /></div></label><label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as FounderOperationSort)}>{SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        <div className="founder-filter-strip" aria-label="Player operation filters">{FILTERS.map(([value, label]) => <button type="button" key={value} className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
        {shown.length ? <div className="founder-ops-table" role="table" aria-label="Live player operations">
          <div className="founder-ops-table-head" role="row"><span>PLAYER</span><span>REVIEWS</span><span>HISTORY</span><span>CURRENT STATE</span><span>LAST SEEN</span><span>REVIEW DATE</span><span>FOLLOW-UP</span><span>CONTACT</span><span>ACTION</span></div>
          {shown.map((row) => {
            const historyInfo = historyDetail(row.history);
            return <article className="founder-ops-row" role="row" key={row.uid}>
              <div className="founder-ops-main-row">
                <div data-label="PLAYER"><strong>{row.username}</strong>{row.playerId ? <small>Chess.com ID {row.playerId}</small> : <small>Pending request</small>}</div>
                <div data-label="REVIEWS"><strong>{row.reviewCount} qualifying</strong></div>
                <div data-label="HISTORY" className="founder-history-cell"><strong>{historyInfo.primary}</strong><small>{historyInfo.secondary}</small><small><b>LATEST REPORT</b> · {row.latestReportPeriod?.outcome === "review" ? "REVIEW" : row.latestReportPeriod?.outcome === "no_activity" ? "NO ACTIVITY" : "SYNCING"} · {row.latestReportPeriod?.periodLabel ?? "No completed report period"}</small><small><b>OFFICIAL CHESS STATE</b> · {row.officialChessStatePeriod?.periodLabel ?? "No game-bearing Review"}</small></div>
                <div data-label="CURRENT STATE"><span className={`state-pill ${stateTone(row)}`}>{row.currentState}</span></div>
                <div data-label="LAST SEEN"><strong>{relativeSeen(row.lastSeenAt)}</strong></div>
                <div data-label={row.reviewDateLabel}><small className="founder-review-date-label">{row.reviewDateLabel}</small><strong>{displayDate(row.nextDeskDueAt)}</strong></div>
                <div data-label="FOLLOW-UP"><strong>{followUpLabel(row)}</strong></div>
                <div data-label="CONTACT"><strong>{row.preferredContactMethod ? row.preferredContactMethod.toUpperCase() : row.profileUrl ? "CHESS.COM" : "—"}</strong><small>{row.preferredContactValue ?? (row.profileUrl ? "Profile available" : "Not confirmed")}</small></div>
                <div data-label="ACTION"><Link className="button button-quiet" href={row.pendingRequestId ? `/admin/players?request=${encodeURIComponent(row.pendingRequestId)}` : `/admin/players?player=${encodeURIComponent(String(row.playerId ?? row.username))}`}>MANAGE</Link></div>
              </div>
              <details className="founder-ops-details"><summary>Details</summary><div className="founder-ops-detail-grid"><dl>
                <div><dt>Stable Chess.com ID</dt><dd>{row.playerId ?? "Not yet recorded"}</dd></div><div><dt>Identity</dt><dd>{row.identityStatus ?? "Not recorded"}{row.identityReviewStatus ? ` · ${row.identityReviewStatus}` : ""}</dd></div><div><dt>Account</dt><dd>{row.accountStatus ?? "Pending request"}</dd></div><div><dt>Public highlights</dt><dd>{row.publicHighlightsStatus ?? "Not available yet"}</dd></div><div><dt>Latest completed report period</dt><dd>{row.latestReportPeriod ? `${row.latestReportPeriod.periodLabel} · ${row.latestReportPeriod.outcome === "review" ? "REVIEW" : row.latestReportPeriod.outcome === "no_activity" ? "NO ACTIVITY" : "SYNCING"}` : "None"}</dd></div><div><dt>Official chess state period</dt><dd>{row.officialChessStatePeriod?.periodLabel ?? "No game-bearing Review"}</dd></div><div><dt>Unread replies</dt><dd>{row.unreadReplies}</dd></div><div><dt>Follow-up reason</dt><dd>{row.attentionReasons.join(" · ") || "No operational attention"}</dd></div>
              </dl><div className="founder-review-periods"><span>LATEST VERIFIED REVIEW PERIODS</span>{row.reviewPeriods.length ? <ol>{row.reviewPeriods.map((review) => <li key={`${review.periodStart}:${review.periodEnd}`}><strong>{review.periodLabel ?? `${review.periodStart} → ${review.periodEnd}`}</strong><small>{review.source === "original" ? "Original Beta provenance" : "Live digital Review"}</small></li>)}</ol> : <p>No verified completed Review periods stored.</p>}{row.exceptionTitles.length ? <div className="founder-ops-exceptions"><strong>Operational exceptions</strong>{row.exceptionTitles.map((title) => <p key={title}>{title}</p>)}</div> : null}</div></div>
              <div className="founder-followup-actions"><div><label htmlFor={`contact-${row.uid}`}>Contact method</label><select id={`contact-${row.uid}`} value={contactMethods[row.uid] ?? defaultContactMethod(row)} disabled={row.uid.startsWith("request:") || busy !== null} onChange={(event) => setContactMethods((values) => ({ ...values, [row.uid]: event.target.value as FounderOpsContactMethod }))}>{CONTACT_METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="button button-dark" type="button" disabled={row.uid.startsWith("request:") || busy !== null} onClick={() => void mutate(row, "markContacted", { method: contactMethods[row.uid] ?? defaultContactMethod(row) })}>{busy === `${row.uid}:markContacted` ? <LoaderCircle className="button-spinner" size={14} /> : null} MARK CONTACTED</button><small>Records that you contacted this player. It does not send anything.</small></div><div><span>Snooze normal follow-up</span><div>{[1, 3, 7].map((days) => <button className="button button-outline" type="button" key={days} disabled={row.uid.startsWith("request:") || busy !== null} onClick={() => void mutate(row, "snooze", { days })}>{days} DAY{days === 1 ? "" : "S"}</button>)}{row.followUpSnoozedUntil ? <button className="button button-quiet" type="button" disabled={busy !== null} onClick={() => void mutate(row, "clearSnooze")}>CLEAR SNOOZE</button> : null}</div><small>Snooze never hides unread replies, identity conflicts or system exceptions.</small></div>{row.profileUrl ? <a className="text-link" href={row.profileUrl} target="_blank" rel="noreferrer">Open Chess.com profile <ExternalLink size={14} /></a> : null}</div>
              </details>
            </article>;
          })}
        </div> : <div className="universe-empty"><p>No players match this operational view.</p></div>}
        <nav className="founder-pagination" aria-label="Player operations pages"><button type="button" className="button button-quiet" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={15} /> Previous</button><span>Page {Math.min(page, pages)} of {pages}</span><button type="button" className="button button-quiet" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Next <ChevronRight size={15} /></button></nav>
      </> : null}
    </section>
  </div>;
}
