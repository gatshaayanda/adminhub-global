"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, LoaderCircle, RefreshCcw, Search } from "lucide-react";
import styles from "./FounderSignupIntelligence.module.css";

type GoogleAccessOrigin = "new_player_via_google" | "existing_player_linked_google";

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

type GoogleAccounting = {
  generatedAt: string;
  partial: boolean;
  funnel: {
    activePlayers: number;
    canonicalPlayers: number;
    inactivePlayers: number;
    newViaGoogle: number;
    existingGoogleLinked: number;
    googleLinkedTotal: number;
    googleReturns: number;
    repairedSummaries: number;
    unresolvedPlayerRecords: number;
  };
  players: Record<string, {
    origin?: GoogleAccessOrigin;
    linkedAt?: string;
    lastUsedAt?: string;
    returnedWithGoogle: boolean;
  }>;
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

function googleLabel(origin?: GoogleAccessOrigin) {
  if (origin === "new_player_via_google") return "New player via Google";
  if (origin === "existing_player_linked_google") return "Existing player · Google linked";
  return "Google linked";
}

export default function FounderSignupIntelligence() {
  const [data, setData] = useState<Intelligence | null>(null);
  const [google, setGoogle] = useState<GoogleAccounting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [playerResponse, googleResponse] = await Promise.all([
        fetch("/api/admin/boardsignal/founder-intelligence", { cache: "no-store" }),
        fetch("/api/admin/boardsignal/google-accounting", { cache: "no-store" }),
      ]);
      const playerBody = await playerResponse.json() as { ok?: boolean; intelligence?: Intelligence; error?: string };
      const googleBody = await googleResponse.json() as { ok?: boolean; accounting?: GoogleAccounting; error?: string };
      if (!playerResponse.ok || !playerBody.ok || !playerBody.intelligence) throw new Error(playerBody.error ?? "Founder player intelligence could not be loaded.");
      if (!googleResponse.ok || !googleBody.ok || !googleBody.accounting) throw new Error(googleBody.error ?? "Google player accounting could not be loaded.");
      setData(playerBody.intelligence);
      setGoogle(googleBody.accounting);
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

  if (loading && (!data || !google)) return <section className={styles.shell}><LoaderCircle className="button-spinner" size={18}/> Loading Founder player intelligence…</section>;
  if (!data || !google) return <section className={styles.shell}><p className="form-error" role="alert">{error || "Founder player intelligence is unavailable."}</p><button className="button button-quiet" type="button" onClick={() => void load()}>Try again</button></section>;

  const playerCountNote = google.funnel.canonicalPlayers === google.funnel.activePlayers
    ? `${google.funnel.canonicalPlayers} canonical Chess.com players · all currently active`
    : `${google.funnel.canonicalPlayers} canonical Chess.com players · ${google.funnel.inactivePlayers} outside the active lifecycle`;

  const metrics = [
    ["ACTIVE BOARDSIGNAL PLAYERS", google.funnel.activePlayers, playerCountNote],
    ["NEW VIA GOOGLE", google.funnel.newViaGoogle, "The only Google path that increases player count"],
    ["EXISTING + GOOGLE", google.funnel.existingGoogleLinked, "Google attached later · player count unchanged"],
    ["GOOGLE RETURNS", google.funnel.googleReturns, "Linked Google key used to come back"],
    ["REVIEW AVAILABLE", data.funnel.reviewAvailable, "At least one Review exists"],
    ["REVIEW OPENED", data.funnel.reviewOpened, `${data.funnel.latestReviewOpened} opened latest · tracked from 30 Aug`],
    ["R2+", data.funnel.r2Plus, "Returned for another Review"],
    ["FORMING NOW", data.funnel.reviewsForming, "Next Review in progress"],
  ] as const;

  return <section className={styles.shell} aria-labelledby="founder-signup-intelligence-heading">
    <div className={styles.heading}>
      <div><p className="kicker">FOUNDER SIGNAL</p><h2 id="founder-signup-intelligence-heading">Players first. Google is only how they get back in.</h2><p>One stable Chess.com player ID equals one BoardSignal player. A genuinely new Google signup adds one player. Linking Google to somebody already in BoardSignal adds zero players.</p></div>
      <button className="button button-quiet" type="button" onClick={() => void load()} disabled={loading}>{loading ? <LoaderCircle className="button-spinner" size={15}/> : <RefreshCcw size={15}/>} Refresh</button>
    </div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {(data.partial || google.partial) ? <p className={styles.warning}><AlertTriangle size={15}/> Safety limit reached. Counts below are a bounded view, not a full population total.</p> : null}
    {google.funnel.repairedSummaries > 0 ? <p className={styles.warning}><RefreshCcw size={15}/> Reconciled {google.funnel.repairedSummaries} active player{google.funnel.repairedSummaries === 1 ? "" : "s"} that had not yet reached the Founder aggregate. Homepage player proof has been invalidated for refresh.</p> : null}

    <div className={styles.metrics}>{metrics.map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div>

    <details className={styles.details} open>
      <summary>BoardSignal player/account map · {google.funnel.canonicalPlayers} canonical player{google.funnel.canonicalPlayers === 1 ? "" : "s"}</summary>
      <p className={styles.explainer}>The player is the Chess.com identity. Google, contact email, recovery access, Reviews and activity sit on that player. Google never forms a second player population.</p>
      <label className={styles.search}><Search size={15}/><span className="sr-only">Search players or emails</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search username, Chess.com ID or email" /></label>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>PLAYER</th><th>ACCESS / GOOGLE</th><th>CONTACT</th><th>PRODUCT USE</th><th>REVIEW / RETURN</th><th>LAST SEEN</th><th></th></tr></thead>
          <tbody>{visibleAccounts.map((row) => {
            const googleState = row.playerId ? google.players[String(row.playerId)] : undefined;
            return <tr key={String(row.playerId ?? row.uid)}>
              <td><strong>{row.username}</strong><small>Chess.com {row.playerId ?? "ID unavailable"} · {row.accountStatus ?? "status unknown"}</small></td>
              <td><strong>{row.googleLinked ? googleLabel(googleState?.origin) : "No Google link"}</strong><small>{row.googleLinked ? `${row.googleEmail ?? "Google email unavailable"} · linked ${relative(googleState?.linkedAt ?? row.googleLinkedAt)}${googleState?.returnedWithGoogle ? ` · returned ${relative(googleState.lastUsedAt)}` : ""}` : row.accessPath}</small></td>
              <td><strong>{row.preferredContactEmail ?? (row.googleEmail ? "Google account email only" : "No email contact recorded")}</strong><small>{row.emailUpdatesEnabled ? "Player-enabled email/contact updates" : row.betaContactConsent ? "Contact consent recorded; email alerts not enabled" : "Do not infer contact/marketing consent"}</small></td>
              <td><strong>{row.privateUseConfirmed ? "Private use confirmed" : "No later-use signal"}</strong><small>{row.historyDataPresent ? "History / Review data present" : "No history/Review data signal in this snapshot"}</small></td>
              <td><strong>{row.activityStage}</strong><small>{row.reviewCount} Review{row.reviewCount === 1 ? "" : "s"}{row.latestReviewOpenedAt ? ` · opened ${relative(row.latestReviewOpenedAt)}` : ""}{row.forming ? " · next forming" : ""}</small></td>
              <td><strong>{relative(row.lastSeenAt)}</strong><small>{displayDate(row.lastSeenAt)}</small></td>
              <td><Link className="button button-quiet" href={`/admin/players?player=${encodeURIComponent(String(row.playerId ?? row.username))}`}>Manage</Link></td>
            </tr>;
          })}</tbody>
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

    <p className={styles.generated}>Snapshot generated {displayDate(data.generatedAt)} · Google linked total: {google.funnel.googleLinkedTotal} · Review-open telemetry begins with the 30 Aug Founder update; older read history is not fabricated.</p>
  </section>;
}
