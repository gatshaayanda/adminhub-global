export type DeskSignal = {
  label: string;
  title: string;
  copy: string;
};

export type DeskCandidate = {
  id: string;
  gameUrl: string;
  opponent: string;
  playerColor: "white" | "black";
  result: "win" | "loss" | "draw";
  reason: string;
  fen?: string;
  reconstruction: "legal" | "unavailable";
};

export type DeskDay = {
  date: string;
  label: string;
  wins: number;
  losses: number;
  draws: number;
};

export type DeskPool = {
  pool: string;
  games: number;
  record: string;
  firstRecordedRating?: number;
  lastRecordedRating?: number;
  peak?: number;
  low?: number;
};

export type BoardSignalDesk = {
  source: "seeded" | "live";
  player: {
    requestedUsername: string;
    username: string;
    playerId?: number;
    avatar?: string;
    profileUrl?: string;
  };
  period: {
    start: string;
    end: string;
    label: string;
    isLastActive: boolean;
    latestCompletedLabel: string;
  };
  games: number;
  wins: number;
  losses: number;
  draws: number;
  score: number;
  headline: string;
  summary: string;
  longestWinStreak: number;
  longestLossStreak: number;
  sessions: number;
  checkmateWins: number;
  timeoutLosses: number;
  resignationLosses: number;
  primaryPool: string;
  days: DeskDay[];
  pools: DeskPool[];
  openings: Array<{ name: string; games: number }>;
  signals: {
    green: DeskSignal;
    amber: DeskSignal;
    red: DeskSignal;
    blue: DeskSignal;
  };
  candidates: DeskCandidate[];
  caveats: string[];
};

export type DeskApiResponse =
  | { ok: true; desk: BoardSignalDesk }
  | { ok: false; error: string; code: string };
