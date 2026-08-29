import "server-only";

import { unstable_cache } from "next/cache";
import { getAdminDb } from "../../../utils/firebaseAdmin";

export type PublicBoardSignalProof = {
  playersServed: number;
  reviewsProduced: number;
  reviewsForming: number;
  returningPlayers: number;
  generatedAt?: string;
};

function count(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

async function readPublicBoardSignalProof(): Promise<PublicBoardSignalProof | undefined> {
  try {
    // Patch K quota contract: exactly one direct aggregate read. Never scan users,
    // Reviews or Vercel traffic to manufacture homepage proof.
    const snapshot = await getAdminDb().collection("founderOperationsState").doc("current").get();
    if (!snapshot.exists) return undefined;
    const data = snapshot.data() as Record<string, unknown>;
    const metrics = (data.metrics ?? {}) as Record<string, unknown>;
    const validation = (data.validation ?? {}) as Record<string, unknown>;
    const proof = {
      playersServed: count(validation.playersServed),
      reviewsProduced: count(validation.totalReviewsProduced),
      reviewsForming: count(metrics.reviewsForming),
      returningPlayers: count(validation.r2Plus),
      generatedAt: typeof data.generatedAt === "string" ? data.generatedAt : undefined,
    };
    if (proof.playersServed === 0 && proof.reviewsProduced === 0 && proof.reviewsForming === 0 && proof.returningPlayers === 0) return undefined;
    return proof;
  } catch {
    return undefined;
  }
}

export const loadPublicBoardSignalProof = unstable_cache(
  readPublicBoardSignalProof,
  ["boardsignal-public-home-proof-v1"],
  { revalidate: 900 },
);
