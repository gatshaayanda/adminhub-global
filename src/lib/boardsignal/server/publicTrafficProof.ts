import "server-only";

import { unstable_cache } from "next/cache";
import { getFounderTraffic } from "./vercelTraffic";

export type PublicBoardSignalTrafficProof = {
  visitors30d: number;
  pageviews30d: number;
  since: string;
  until: string;
};

function count(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

async function readPublicBoardSignalTrafficProof(): Promise<PublicBoardSignalTrafficProof | undefined> {
  try {
    // Vercel Web Analytics is anonymous aggregate audience evidence. Keep the
    // analytics token and the richer Founder breakdowns server-side; the public
    // homepage receives only the 30-day visitor/page-view totals and dates.
    const traffic = await getFounderTraffic(30);
    if (traffic.connection !== "connected" || !traffic.totals) return undefined;
    const proof = {
      visitors30d: count(traffic.totals.visitors),
      pageviews30d: count(traffic.totals.pageviews),
      since: traffic.since,
      until: traffic.until,
    };
    if (proof.visitors30d === 0 && proof.pageviews30d === 0) return undefined;
    return proof;
  } catch {
    return undefined;
  }
}

export const loadPublicBoardSignalTrafficProof = unstable_cache(
  readPublicBoardSignalTrafficProof,
  ["boardsignal-public-traffic-proof-v1"],
  { revalidate: 900 },
);
