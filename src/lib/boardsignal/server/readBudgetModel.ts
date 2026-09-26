export type ReadBudgetScenario = {
  playerPopulation: number;
  oldUniverseReconstructionReads: number;
  oldPlayerRoomGlobalReads: number;
  newPlayerRoomGlobalReads: number;
  newFeedGlobalReads: number;
  newFounderLandingReads: number;
  newFounderCohortSummaryReads: number;
};

export function readBudgetScenario(playerPopulation: number): ReadBudgetScenario {
  const players = Math.max(0, Math.floor(playerPopulation));
  const oldUniverseReconstructionReads = players + players * 4 + 80;
  return {
    playerPopulation: players,
    oldUniverseReconstructionReads,
    oldPlayerRoomGlobalReads: oldUniverseReconstructionReads * 2,
    newPlayerRoomGlobalReads: 1,
    newFeedGlobalReads: 1,
    newFounderLandingReads: 1,
    newFounderCohortSummaryReads: players,
  };
}
