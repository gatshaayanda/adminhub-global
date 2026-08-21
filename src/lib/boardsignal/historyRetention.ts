export type OperationalReviewEvidence = {
  playerKey: string;
  periodStart: string;
  periodEnd: string;
  source: "original" | "live";
};

export function summarizeOperationalRetention(
  evidence: OperationalReviewEvidence[],
  originalToLivePlayerKeys: Iterable<string>,
  historicalActivationPlayerKeys: Iterable<string> = [],
) {
  const unique = new Map<string, OperationalReviewEvidence>();
  for (const item of evidence) {
    const key = `${item.playerKey}|${item.periodStart}|${item.periodEnd}`;
    const existing = unique.get(key);
    if (!existing || item.source === "original") unique.set(key, item);
  }

  const operationalByPlayer = new Map<string, number>();
  let originalReviews = 0;
  let liveReviews = 0;
  for (const item of unique.values()) {
    operationalByPlayer.set(item.playerKey, (operationalByPlayer.get(item.playerKey) ?? 0) + 1);
    if (item.source === "original") originalReviews += 1;
    else liveReviews += 1;
  }

  const activationBaselines = new Set(historicalActivationPlayerKeys);
  const playerKeys = new Set([...operationalByPlayer.keys(), ...activationBaselines]);
  const retentionDepths = [...playerKeys].map((playerKey) => (
    (operationalByPlayer.get(playerKey) ?? 0) + (activationBaselines.has(playerKey) ? 1 : 0)
  ));

  return {
    playersServed: playerKeys.size,
    verifiedReviews: unique.size,
    originalReviews,
    liveReviews,
    originalToLive: new Set(originalToLivePlayerKeys).size,
    r2Plus: retentionDepths.filter((count) => count >= 2).length,
    r3Plus: retentionDepths.filter((count) => count >= 3).length,
    r4: retentionDepths.filter((count) => count >= 4).length,
  };
}
