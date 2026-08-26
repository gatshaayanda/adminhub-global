export type HumanMovePrediction = {
  uci: string;
  probability?: number;
};

export type HumanMoveModelAdapter = {
  id: string;
  available: boolean;
  predict(input: { fen: string; playerRating?: number; opponentRating?: number }): Promise<HumanMovePrediction[] | undefined>;
};

export const HUMAN_MOVE_MODEL_REVIEW = {
  maia2: {
    project: "CSSLab/maia2",
    purpose: "Skill-aware human move prediction",
    license: "MIT",
    runtime: "Python 3.10–3.12 / PyTorch; CPU, CUDA or Apple MPS",
    boardSignalStatus: "adapter_candidate_not_integrated",
  },
  maia3: {
    project: "CSSLab/maia3",
    purpose: "Human move prediction with Chessformer models",
    license: "AGPL-3.0",
    runtime: "Python / model checkpoint runtime",
    boardSignalStatus: "blocked_pending_explicit_license_approval",
  },
} as const;

export const unavailableHumanMoveModelAdapter: HumanMoveModelAdapter = {
  id: "unavailable",
  available: false,
  async predict() {
    return undefined;
  },
};

export function humanMoveModelStatus() {
  return {
    adapter: unavailableHumanMoveModelAdapter.id,
    available: false,
    factualAuthority: false,
    boardSignalContinuesWithoutAdapter: true,
  } as const;
}
