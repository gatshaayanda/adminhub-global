import type { CSSProperties } from "react";
import { Activity, BarChart3, BadgeCheck, BookOpenCheck, ExternalLink } from "lucide-react";
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

type ProofStory = {
  key: string;
  lead: string;
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
  const stories: ProofStory[] = [];

  if (proof && qualifies(proof.activePlayers)) {
    stories.push({
      key: "active-players",
      lead: `${format(proof.activePlayers)} active player accounts`,
      detail: "are currently in BoardSignal's live player lifecycle.",
      icon: Activity,
    });
  }

  if (proof && qualifies(proof.reviewsProduced) && qualifies(proof.playersServed)) {
    stories.push({
      key: "review-history",
      lead: `${format(proof.reviewsProduced)} Reviews completed across ${format(proof.playersServed)} players`,
      detail: "in BoardSignal's durable Review history.",
      icon: BookOpenCheck,
    });
  }

  const hasVisitors = qualifies(traffic?.visitors30d);
  const hasPageviews = qualifies(traffic?.pageviews30d);
  if (traffic && (hasVisitors || hasPageviews)) {
    const audienceLead = hasVisitors && hasPageviews
      ? `${format(traffic.visitors30d)} site visitors · ${format(traffic.pageviews30d)} page views`
      : hasVisitors
        ? `${format(traffic.visitors30d)} site visitors`
        : `${format(traffic.pageviews30d)} page views`;
    stories.push({
      key: "audience-30d",
      lead: audienceLead,
      detail: "in the last 30 days, from anonymous aggregated Vercel Web Analytics — not player accounts.",
      icon: BarChart3,
    });
  }

  if (stories.length === 0) return null;

  return (
    <section className={styles.rail} data-boardsignal-home-proof aria-label="Real BoardSignal activity and independent reputation">
      <div className={styles.heading}>
        <span className={styles.liveLabel}><span aria-hidden="true" /> BOARD SIGNAL IN USE</span>
        <p>Real product and audience evidence — no signup counter, no fabricated activity.</p>
      </div>

      <div className={styles.storyList}>
        {stories.map((story, index) => {
          const Icon = story.icon;
          return <article className={styles.story} data-proof-story={story.key} style={{ "--proof-delay": `${index * 60}ms` } as CSSProperties} key={story.key}>
            <Icon size={17} aria-hidden="true" />
            <p><strong>{story.lead}</strong> <span>{story.detail}</span></p>
          </article>;
        })}
      </div>

      <div className={styles.trustPanel}>
        <BadgeCheck size={21} aria-hidden="true" />
        <div className={styles.trustCopy}>
          <span>INDEPENDENT PUBLIC REVIEWS</span>
          <strong>BoardSignal is on Trustpilot through Admin Hub.</strong>
          <p>Eligible returning players may be invited at the same Player Room visit rhythm. Invitations are not filtered by rating, sentiment or chess results.</p>
        </div>
        <a className={styles.trustLink} href={TRUSTPILOT_PROFILE_URL} target="_blank" rel="noreferrer noopener">
          CHECK OUR TRUSTPILOT PROFILE <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
