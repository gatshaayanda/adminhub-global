import "server-only";

import { unstable_cache } from "next/cache";
import { getAdminDb } from "../../../utils/firebaseAdmin";

export type PublicBoardSignalProof = {
  activePlayers: number;
  playersServed: number;
  reviewsProduced: number;
  reviewsForming: number;
  retentionReviews: number;
  returningPlayers: number;
  generatedAt?: string;
};

function count(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

async function readPublicBoardSignalProof(): Promise<PublicBoardSignalProof | undefined> {
  try {
    // Homepage product proof stays on one materialized aggregate read. Never scan
    // players or Reviews to construct social proof. Anonymous Vercel traffic is
    // loaded independently by publicTrafficProof.ts so product and audience truth
    // remain clearly separated.
    const snapshot = await getAdminDb().collection("founderOperationsState").doc("current").get();
    if (!snapshot.exists) return undefined;
    const data = snapshot.data() as Record<string, unknown>;
    const metrics = (data.metrics ?? {}) as Record<string, unknown>;
    const validation = (data.validation ?? {}) as Record<string, unknown>;
    const proof = {
      activePlayers: count(metrics.activePlayers),
      playersServed: count(validation.playersServed),
      reviewsProduced: count(validation.totalReviewsProduced),
      reviewsForming: count(metrics.reviewsForming),
      retentionReviews: count(validation.verifiedReviews),
      returningPlayers: count(validation.r2Plus),
      generatedAt: typeof data.generatedAt === "string" ? data.generatedAt : undefined,
    };
    if (
      proof.activePlayers === 0
      && proof.playersServed === 0
      && proof.reviewsProduced === 0
      && proof.reviewsForming === 0
      && proof.retentionReviews === 0
      && proof.returningPlayers === 0
    ) return undefined;
    return proof;
  } catch {
    return undefined;
  }
}

export const loadPublicBoardSignalProof = unstable_cache(
  readPublicBoardSignalProof,
  ["boardsignal-public-home-proof-v2"],
  { revalidate: 900 },
);
