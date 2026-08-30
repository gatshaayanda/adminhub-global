import type { CSSProperties } from "react";
import { Activity, BarChart3, BookOpenCheck, ExternalLink, Radio, UsersRound } from "lucide-react";
import type { PublicBoardSignalProof } from "@/lib/boardsignal/server/publicProof";
import type { PublicBoardSignalTrafficProof } from "@/lib/boardsignal/server/publicTrafficProof";
import styles from "./HomeProofRail.module.css";

const TRUSTPILOT_PROFILE_URL = "https://www.trustpilot.com/review/adminhub-global.com";
export const PUBLIC_PROOF_MINIMUM = 20;
const numberFormatter = new Intl.NumberFormat("en-US");

function qualifies(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= PUBLIC_PROOF_MINIMUM;
}

function format(value: number) {
  return numberFormatter.format(Math.max(0, Math.round(value)));
}

type ProofMetric = {
  key: string;
  label: string;
  value: number;
  detail: string;
  icon: typeof Activity;
};

export default function HomeProofRail({
  proof,
  traffic,
}: {
  proof?: PublicBoardSignalProof;
  traffic?: PublicBoardSignalTrafficProof;
}) {
  const metrics: ProofMetric[] = proof ? [
    qualifies(proof.activePlayers) ? {
      key: "active-players",
      label: "Active players",
      value: proof.activePlayers,
      detail: "Current BoardSignal player lifecycle.",
      icon: Activity,
    } : undefined,
    qualifies(proof.reviewsProduced) ? {
      key: "reviews-completed",
      label: "Reviews completed",
      value: proof.reviewsProduced,
      detail: qualifies(proof.retentionReviews)
        ? `${format(proof.retentionReviews)} retention Review records in the durable history.`
        : "Cumulative BoardSignal Review output.",
      icon: BookOpenCheck,
    } : undefined,
    qualifies(proof.playersServed) ? {
      key: "players-served",
      label: "Players served",
      value: proof.playersServed,
      detail: "Players represented in durable BoardSignal Review history.",
      icon: UsersRound,
    } : undefined,
    qualifies(proof.reviewsForming) ? {
      key: "reviews-forming",
      label: "Reviews forming now",
      value: proof.reviewsForming,
      detail: "Current cadence-aligned Review weeks.",
      icon: Radio,
    } : undefined,
  ].filter((item): item is ProofMetric => Boolean(item)) : [];

  const hasTraffic = qualifies(traffic?.visitors30d) || qualifies(traffic?.pageviews30d);
  if (metrics.length === 0 && !hasTraffic) return null;

  return (
    <section className={styles.rail} data-boardsignal-home-proof aria-label="Real BoardSignal product and audience activity">
      <div className={styles.heading}>
        <div>
          <span className={styles.liveLabel}><span aria-hidden="true" /> BOARD SIGNAL IN USE</span>
          <p>Real product activity, durable Review records, and separately labelled site audience.</p>
        </div>
        <a className={styles.trustLink} href={TRUSTPILOT_PROFILE_URL} target="_blank" rel="noreferrer noopener">
          Read independent reviews on Trustpilot <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>

      {metrics.length > 0 ? <div className={styles.metrics}>
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return <article className={styles.metric} data-proof-metric={metric.key} style={{ "--proof-index": index } as CSSProperties} key={metric.key}>
            <div className={styles.metricTop}><Icon size={16} aria-hidden="true" /><span>{metric.label}</span></div>
            <strong>{format(metric.value)}</strong>
            <p>{metric.detail}</p>
          </article>;
        })}
      </div> : null}

      {hasTraffic && traffic ? <div className={styles.traffic} data-proof-metric="traffic-30d">
        <div className={styles.trafficLabel}><BarChart3 size={16} aria-hidden="true" /><span>LAST 30 DAYS · VERCEL WEB ANALYTICS</span></div>
        <p>
          {qualifies(traffic.visitors30d) ? <strong>{format(traffic.visitors30d)} site visitors</strong> : null}
          {qualifies(traffic.visitors30d) && qualifies(traffic.pageviews30d) ? <span aria-hidden="true"> · </span> : null}
          {qualifies(traffic.pageviews30d) ? <strong>{format(traffic.pageviews30d)} page views</strong> : null}
        </p>
        <small>Anonymous aggregated site activity — not player accounts.</small>
      </div> : null}
    </section>
  );
}
