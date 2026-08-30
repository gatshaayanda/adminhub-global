"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, RefreshCcw } from "lucide-react";
import styles from "./FounderSignupIntelligence.module.css";

type AccountRow = {
  uid: string;
  playerId?: number;
  username: string;
  profileUrl?: string;
  email?: string;
  emailVerified: boolean;
  linkedAt?: string;
  lastSeenAt?: string;
  playerRoomUsed: boolean;
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
  emailUpdatesEnabled: boolean;
  betaContactConsent: boolean;
  preferredContactMethod?: string;
  preferredContactValue?: string;
  accountStatus?: string;
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
    googleClaimed: number;
    claimedLast24h: number;
    claimedLast7d: number;
    playerRoomUsed: number;
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/boardsignal/founder-intelligence", { cache: "no-store" });
      const body = await response.json() as { ok?: boolean; intelligence?: Intelligence; error?: string };
      if (!response.ok || !body.ok || !body.intelligence) throw new Error(body.error ?? "Founder signup intelligence could not be loaded.");
      setData(body.intelligence);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Founder signup intelligence could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading && !data) return <section className={styles.shell}><LoaderCircle className="button-spinner" size={18}/> Loading Founder signup intelligence…</section>;
  if (!data) return <section className={styles.shell}><p className="form-error" role="alert">{error || "Founder signup intelligence is unavailable."}</p><button className="button button-quiet" type="button" onClick={() => void load()}>Try again</button></section>;

  const metrics = [
    ["GOOGLE CLAIMED", data.funnel.googleClaimed, `${data.funnel.claimedLast24h} in 24h · ${data.funnel.claimedLast7d} in 7d`],
    ["PLAYER ROOM USED", data.funnel.playerRoomUsed, "Post-claim private use"],
    ["REVIEW AVAILABLE", data.funnel.reviewAvailable, "At least one Review exists"],
    ["REVIEW OPENED", data.funnel.reviewOpened, `${data.funnel.latestReviewOpened} opened latest · tracked from this update`],
    ["RETURNED AFTER REVIEW", data.funnel.returnedAfterReview, "Historical later-visit signal"],
    ["R2+", data.funnel.r2Plus, "Returned for another Review"],
    ["FORMING NOW", data.funnel.reviewsForming, "Next Review in progress"],
    ["EMAIL UPDATES", data.funnel.emailUpdatesEnabled, "Player-enabled email/contact channel"],
  ] as const;

  return <section className={styles.shell} aria-labelledby="founder-signup-intelligence-heading">
    <div className={styles.heading}>
      <div><p className="kicker">FOUNDER SIGNAL</p><h2 id="founder-signup-intelligence-heading">Who signed up — and what happened next.</h2><p>Google claim → private use → Review availability/open → return. Account emails are Founder-only account data; they are not treated as marketing consent.</p></div>
      <button className="button button-quiet" type="button" onClick={() => void load()} disabled={loading}>{loading ? <LoaderCircle className="button-spinner" size={15}/> : <RefreshCcw size={15}/>} Refresh</button>
    </div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {data.partial ? <p className={styles.warning}><AlertTriangle size={15}/> Safety limit reached. Counts below are a bounded view, not a full population total.</p> : null}

    <div className={styles.metrics}>{metrics.map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div>

    <details className={styles.details} open>
      <summary>Google-linked account map · {data.accounts.length} player{data.accounts.length === 1 ? "" : "s"}</summary>
      <p className={styles.explainer}>This joins Firebase Google identity to the BoardSignal/Chess.com player mapping, so you do not need Firebase Authentication just to work out who a signup belongs to. Dedicated Review-open tracking starts with this update; older history is not fabricated. “Returned after Review” remains the historical signal for a later Player Room visit after publication.</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>PLAYER</th><th>GOOGLE ACCOUNT</th><th>CLAIMED</th><th>PRODUCT USE</th><th>REVIEW / RETURN</th><th>EMAIL STATUS</th><th></th></tr></thead>
          <tbody>{data.accounts.map((row) => <tr key={`${row.uid}:${row.playerId ?? row.username}`}>
            <td><strong>{row.username}</strong><small>Chess.com {row.playerId ?? "ID unavailable"}</small></td>
            <td><strong>{row.email ?? "Email unavailable"}</strong><small>{row.email ? (row.emailVerified ? "Google email verified" : "Google account email") : "No matching Google email found"}</small></td>
            <td><strong>{displayDate(row.linkedAt)}</strong><small>{relative(row.linkedAt)}</small></td>
            <td><strong>{row.playerRoomUsed ? "Player Room used" : "Claimed only"}</strong><small>Last seen {relative(row.lastSeenAt)}</small></td>
            <td><strong>{row.activityStage}</strong><small>{row.reviewCount} Review{row.reviewCount === 1 ? "" : "s"}{row.latestReviewOpenedAt ? ` · opened ${relative(row.latestReviewOpenedAt)}` : ""}{row.forming ? " · next forming" : ""}</small></td>
            <td><strong>{row.emailUpdatesEnabled ? "Updates enabled" : "Account email only"}</strong><small>{row.emailUpdatesEnabled ? "Player enabled an email/contact channel" : "Do not treat Google sign-in as marketing consent"}</small></td>
            <td><Link className="button button-quiet" href={`/admin/players?player=${encodeURIComponent(String(row.playerId ?? row.username))}`}>Manage</Link></td>
          </tr>)}</tbody>
        </table>
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

    <p className={styles.generated}>Snapshot generated {displayDate(data.generatedAt)} · Email-update channels enabled: {data.funnel.emailUpdatesEnabled}</p>
  </section>;
}
