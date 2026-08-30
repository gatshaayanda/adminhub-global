"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, LoaderCircle, RefreshCcw, Search } from "lucide-react";
import styles from "./FounderSignupIntelligence.module.css";

type AccountRow = {
  uid: string;
  playerId?: number;
  username: string;
  profileUrl?: string;
  accountStatus?: string;
  accessPath: string;
  googleLinked: boolean;
  googleEmail?: string;
  googleEmailVerified: boolean;
  googleLinkedAt?: string;
  preferredContactEmail?: string;
  betaContactConsent: boolean;
  emailUpdatesEnabled: boolean;
  lastSeenAt?: string;
  privateUseConfirmed: boolean;
  historyDataPresent: boolean;
  reviewCount: number;
  latestReview?: { periodLabel?: string; publishedAt?: string };
  reviewOpened: boolean;
  latestReviewOpened: boolean;
  latestReviewOpenedAt?: string;
  returnedAfterReview: boolean;
  retentionDepth: number;
  forming: boolean;
  readyNotSeen: boolean;
  activityStage: string;
};

type ExceptionCase = {
  uid: string;
  playerId?: number;
  username: string;
  profileUrl?: string;
  category: string;
  reasons: string[];
  nextAction: string;
  currentState?: string;
  lastSeenAt?: string;
  nextDeskDueAt?: string;
};

type Intelligence = {
  generatedAt: string;
  partial: boolean;
  funnel: {
    totalPlayers: number;
    sourceAccountRecords: number;
    duplicateAccountRecords: number;
    unresolvedPlayerRecords: number;
    googleLinked: number;
    googleLinkedLast24h: number;
    googleLinkedLast7d: number;
    privateUseConfirmed: number;
    historyDataPresent: number;
    reviewAvailable: number;
    reviewOpened: number;
    latestReviewOpened: number;
    returnedAfterReview: number;
    r2Plus: number;
    reviewsForming: number;
    emailUpdatesEnabled: number;
  };
  accounts: AccountRow[];
  exceptions: {
    playersFlagged: number;
    categories: Array<{ category: string; count: number }>;
    cases: ExceptionCase[];
  };
};

function displayDate(value?: string) {
  if (!value) return "—";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Date(parsed).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function relative(value?: string) {
  if (!value) return "not recorded";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "not recorded";
  const minutes = Math.max(0, Math.floor((Date.now() - parsed) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function FounderSignupIntelligence() {
  const [data, setData] = useState<Intelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/boardsignal/founder-intelligence", { cache: "no-store" });
      const body = await response.json() as { ok?: boolean; intelligence?: Intelligence; error?: string };
      if (!response.ok || !body.ok || !body.intelligence) throw new Error(body.error ?? "Founder player intelligence could not be loaded.");
      setData(body.intelligence);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Founder player intelligence could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleAccounts = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return data.accounts;
    return data.accounts.filter((row) => [row.username, row.playerId, row.googleEmail, row.preferredContactEmail, row.accessPath, row.activityStage]
      .some((value) => String(value ?? "").toLowerCase().includes(needle)));
  }, [data, query]);

  if (loading && !data) return <section className={styles.shell}><LoaderCircle className="button-spinner" size={18}/> Loading Founder player intelligence…</section>;
  if (!data) return <section className={styles.shell}><p className="form-error" role="alert">{error || "Founder player intelligence is unavailable."}</p><button className="button button-quiet" type="button" onClick={() => void load()}>Try again</button></section>;

  const playerCountNote = [
    "Unique Chess.com player IDs",
    data.funnel.duplicateAccountRecords ? `${data.funnel.duplicateAccountRecords} duplicate access record${data.funnel.duplicateAccountRecords === 1 ? "" : "s"} folded` : "no duplicate access records counted",
    data.funnel.unresolvedPlayerRecords ? `${data.funnel.unresolvedPlayerRecords} unresolved record${data.funnel.unresolvedPlayerRecords === 1 ? "" : "s"} excluded` : "",
  ].filter(Boolean).join(" · ");

  const metrics = [
    ["BOARDSIGNAL PLAYERS", data.funnel.totalPlayers, playerCountNote],
    ["GOOGLE LINKED", data.funnel.googleLinked, `${data.funnel.googleLinkedLast24h} in 24h · ${data.funnel.googleLinkedLast7d} in 7d`],
    ["PRIVATE USE CONFIRMED", data.funnel.privateUseConfirmed, "Evidence beyond account creation"],
    ["HISTORY / REVIEW DATA", data.funnel.historyDataPresent, "History, forming Review or Review data exists"],
    ["REVIEW AVAILABLE", data.funnel.reviewAvailable, "At least one Review exists"],
    ["REVIEW OPENED", data.funnel.reviewOpened, `${data.funnel.latestReviewOpened} opened latest · tracked from 30 Aug`],
    ["R2+", data.funnel.r2Plus, "Returned for another Review"],
    ["FORMING NOW", data.funnel.reviewsForming, "Next Review in progress"],
  ] as const;

  return <section className={styles.shell} aria-labelledby="founder-signup-intelligence-heading">
    <div className={styles.heading}>
      <div><p className="kicker">FOUNDER SIGNAL</p><h2 id="founder-signup-intelligence-heading">Every player — access, activity and return.</h2><p>One stable Chess.com player ID equals one BoardSignal player. Google, email, recovery and other access methods attach to that player and never increase the player count.</p></div>
      <button className="button button-quiet" type="button" onClick={() => void load()} disabled={loading}>{loading ? <LoaderCircle className="button-spinner" size={15}/> : <RefreshCcw size={15}/>} Refresh</button>
    </div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {data.partial ? <p className={styles.warning}><AlertTriangle size={15}/> Safety limit reached. Counts below are a bounded view, not a full population total.</p> : null}

    <div className={styles.metrics}>{metrics.map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div>

    <details className={styles.details} open>
      <summary>BoardSignal player/account map · {data.accounts.length} unique player{data.accounts.length === 1 ? "" : "s"}</summary>
      <p className={styles.explainer}>Rows are deduplicated by stable Chess.com player ID first. Google/Firebase identity, contact details, Reviews and activity are then merged onto that one player. Google account email is Founder-only account information and is not marketing consent.</p>
      <label className={styles.search}><Search size={15}/><span className="sr-only">Search players or emails</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search username, Chess.com ID or email" /></label>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>PLAYER</th><th>ACCESS / GOOGLE</th><th>CONTACT</th><th>PRODUCT USE</th><th>REVIEW / RETURN</th><th>LAST SEEN</th><th></th></tr></thead>
          <tbody>{visibleAccounts.map((row) => <tr key={String(row.playerId ?? row.uid)}>
            <td><strong>{row.username}</strong><small>Chess.com {row.playerId ?? "ID unavailable"} · {row.accountStatus ?? "status unknown"}</small></td>
            <td><strong>{row.googleLinked ? (row.googleEmail ?? "Google linked · email unavailable") : "No Google link recorded"}</strong><small>{row.googleLinked ? `${row.googleEmailVerified ? "Verified Google email" : "Google return key"} · linked ${relative(row.googleLinkedAt)}` : row.accessPath}</small></td>
            <td><strong>{row.preferredContactEmail ?? (row.googleEmail ? "Google account email only" : "No email contact recorded")}</strong><small>{row.emailUpdatesEnabled ? "Player-enabled email/contact updates" : row.betaContactConsent ? "Contact consent recorded; email alerts not enabled" : "Do not infer contact/marketing consent"}</small></td>
            <td><strong>{row.privateUseConfirmed ? "Private use confirmed" : "No later-use signal"}</strong><small>{row.historyDataPresent ? "History / Review data present" : "No history/Review data signal in this snapshot"}</small></td>
            <td><strong>{row.activityStage}</strong><small>{row.reviewCount} Review{row.reviewCount === 1 ? "" : "s"}{row.latestReviewOpenedAt ? ` · opened ${relative(row.latestReviewOpenedAt)}` : ""}{row.forming ? " · next forming" : ""}</small></td>
            <td><strong>{relative(row.lastSeenAt)}</strong><small>{displayDate(row.lastSeenAt)}</small></td>
            <td><Link className="button button-quiet" href={`/admin/players?player=${encodeURIComponent(String(row.playerId ?? row.username))}`}>Manage</Link></td>
          </tr>)}</tbody>
        </table>
        {!visibleAccounts.length ? <p className={styles.explainer}>No player matches that search.</p> : null}
      </div>
    </details>

    <details className={`${styles.details} ${data.exceptions.playersFlagged ? styles.needsAction : ""}`} open={data.exceptions.playersFlagged > 0}>
      <summary>{data.exceptions.playersFlagged} player{data.exceptions.playersFlagged === 1 ? "" : "s"} need a Review/system check</summary>
      <div className={styles.categories}>{data.exceptions.categories.length ? data.exceptions.categories.map((item) => <span key={item.category}><strong>{item.count}</strong> {item.category}</span>) : <span>Nothing currently flagged.</span>}</div>
      {data.exceptions.cases.length ? <div className={styles.cases}>{data.exceptions.cases.map((item) => <article key={`${item.uid}:${item.category}`}>
        <div><strong>{item.username}</strong><span>{item.category}</span></div>
        <p><b>Why:</b> {item.reasons.join(" · ")}</p>
        <p><b>What to do:</b> {item.nextAction}</p>
        <small>Last seen {relative(item.lastSeenAt)} · next/expected Review {displayDate(item.nextDeskDueAt)}</small>
        <Link className="button button-quiet" href={`/admin/players?player=${encodeURIComponent(String(item.playerId ?? item.username))}`}>Open player</Link>
      </article>)}</div> : null}
    </details>

    <p className={styles.generated}>Snapshot generated {displayDate(data.generatedAt)} · Source account records: {data.funnel.sourceAccountRecords} · Email-update channels enabled: {data.funnel.emailUpdatesEnabled} · Review-open telemetry begins with the 30 Aug Founder update; older read history is not fabricated.</p>
  </section>;
}
