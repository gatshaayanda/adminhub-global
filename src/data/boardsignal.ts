export type CoverageStory = {
  id: string;
  eyebrow: string;
  headline: string;
  summary: string;
  stat: string;
  detail: string;
  tone: "blue" | "lime" | "coral" | "ink";
  handle?: string;
};

export const leadStory: CoverageStory = {
  id: "eight-game-surge",
  eyebrow: "Lead story · Breakthrough Desk",
  headline: "An eight-game surge changed the shape of the week.",
  summary: "After a difficult opening, Player 001 found a run that proved the week was not defined by its first four games.",
  stat: "8 straight",
  detail: "Longest winning streak",
  tone: "lime",
};

export const coverageStories: CoverageStory[] = [
  {
    id: "recovery-line",
    eyebrow: "Comeback of the week",
    headline: "Five wins rebuilt the rating line after Thursday's slide.",
    summary: "The recovery did not erase the dip. It showed the player could interrupt it before the week ended.",
    stat: "+47",
    detail: "From weekly low",
    tone: "blue",
  },
  {
    id: "volume-week",
    eyebrow: "Newsroom watch",
    headline: "A 285-game week tested stamina—and the limits of the desk.",
    summary: "Extreme volume exposed patterns that disappear inside a normal game list: session fatigue, reset points and recovery windows.",
    stat: "285",
    detail: "Games in seven days",
    tone: "coral",
  },
  {
    id: "calm-finish",
    eyebrow: "Strongest finish",
    headline: "Shorter sessions produced the calmer finish.",
    summary: "The final sessions were not the biggest. They were the most controlled—and that became the useful signal.",
    stat: "3–1",
    detail: "Closing session",
    tone: "ink",
  },
  {
    id: "clock-signal",
    eyebrow: "Signal spotted",
    headline: "The losses ended with time still available.",
    summary: "The desk found a repeated decision-speed pattern and turned it into one practical scan for the next week.",
    stat: "8:37",
    detail: "Typical time left in losses",
    tone: "blue",
  },
];

export const privateWeek = {
  player: "Ayandakopano",
  period: "1–7 July 2026",
  games: 55,
  wins: 25,
  losses: 29,
  draws: 1,
  score: "46.4%",
  ratingStart: 844,
  ratingEnd: 809,
  ratingChange: -35,
  peak: 878,
  low: 796,
  headline: "A week with two different lives",
  standfirst: "An early surge showed what was possible. The second half showed where faster decisions began costing the position.",
  blueSignal: "Before every committed move, scan checks → captures → forcing threats.",
};

export const pipeline = [
  { player: "Bekzatt1", period: "3–9 Aug", state: "Ready", games: 41 },
  { player: "CaptainRangade", period: "3–9 Aug", state: "Editorial review", games: 18 },
  { player: "Phonkrum", period: "3–9 Aug", state: "Processing", games: 62 },
  { player: "MrInbetween23", period: "3–9 Aug", state: "Ready", games: 27 },
  { player: "Kylian_Mbappe_LottinREAL", period: "3–9 Aug", state: "Exception", games: 0 },
];
