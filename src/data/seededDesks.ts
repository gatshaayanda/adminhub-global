import { ayandaPositionMoments, betaDesks, privateWeek } from "./boardsignal";
import type { BoardSignalDesk } from "@/lib/boardsignal/types";

function parseRecord(record: string) {
  const read = (letter: string) => Number(record.match(new RegExp(`(\\d+)${letter}`))?.[1] ?? 0);
  return { wins: read("W"), draws: read("D"), losses: read("L") };
}

export function findSeededDesk(requestedUsername: string): BoardSignalDesk | undefined {
  const normalized = requestedUsername.toLowerCase();

  if (normalized === privateWeek.player.toLowerCase()) {
    return {
      source: "seeded",
      player: { requestedUsername, username: privateWeek.player, profileUrl: "https://www.chess.com/member/ayandakopano" },
      period: {
        start: "2026-07-01",
        end: "2026-07-07",
        label: privateWeek.period,
        isLastActive: false,
        latestCompletedLabel: privateWeek.period,
      },
      games: privateWeek.games,
      wins: privateWeek.wins,
      losses: privateWeek.losses,
      draws: privateWeek.draws,
      score: 46.4,
      headline: privateWeek.headline,
      summary: privateWeek.standfirst,
      longestWinStreak: 8,
      longestLossStreak: 4,
      sessions: 0,
      checkmateWins: 0,
      timeoutLosses: 0,
      resignationLosses: 3,
      primaryPool: "rapid",
      days: [
        { date: "2026-07-01", label: "Wed 1", wins: 5, losses: 5, draws: 0 },
        { date: "2026-07-02", label: "Thu 2", wins: 5, losses: 4, draws: 0 },
        { date: "2026-07-03", label: "Fri 3", wins: 4, losses: 3, draws: 1 },
        { date: "2026-07-04", label: "Sat 4", wins: 1, losses: 3, draws: 0 },
        { date: "2026-07-05", label: "Sun 5", wins: 3, losses: 5, draws: 0 },
        { date: "2026-07-06", label: "Mon 6", wins: 4, losses: 6, draws: 0 },
        { date: "2026-07-07", label: "Tue 7", wins: 3, losses: 3, draws: 0 },
      ],
      pools: [{ pool: "rapid", games: 55, record: "25W · 1D · 29L", firstRecordedRating: 844, lastRecordedRating: 809, peak: 878, low: 796 }],
      openings: [],
      signals: {
        green: { label: "Green · Preserve", title: privateWeek.greenSignal, copy: "G07–G14 supplied sustained evidence across eight consecutive games." },
        amber: { label: "Amber · Monitor", title: privateWeek.amberSignal, copy: "The sequence is factual; it does not prove motivation, confidence or tilt." },
        red: { label: "Red · Fix first", title: privateWeek.redSignal, copy: "G30, G42 and G43 were approximately −0.85, −1.06 and −0.99 when the games ended." },
        blue: { label: "Blue · Carry with you", title: privateWeek.action, copy: privateWeek.blueSignal },
      },
      candidates: ayandaPositionMoments.map((moment) => ({
        id: moment.game,
        gameUrl: moment.link,
        opponent: moment.opponent,
        playerColor: moment.color.toLowerCase() as "white" | "black",
        result: "loss",
        reason: `Playable resignation · ${moment.evaluation}`,
        reconstruction: "legal",
      })),
      caveats: [
        "This Desk is based on Ayandakopano's completed seven-day period and reviewed game evidence.",
        "The Blue Signal is advice from this episode, not a cross-week mission BoardSignal grades later.",
      ],
    };
  }

  const beta = betaDesks.find((desk) => desk.handle.toLowerCase() === normalized);
  if (!beta) return undefined;
  const record = parseRecord(beta.record);

  return {
    source: "seeded",
    player: { requestedUsername, username: beta.handle, profileUrl: `https://www.chess.com/member/${encodeURIComponent(beta.handle)}` },
    period: { start: "", end: "", label: beta.period, isLastActive: beta.status === "last-active", latestCompletedLabel: beta.status === "last-active" ? "Latest completed week contained no games" : beta.period },
    games: beta.games,
    wins: record.wins,
    losses: record.losses,
    draws: record.draws,
    score: Number(beta.score.replace("%", "")),
    headline: beta.headline,
    summary: beta.publicStory.summary,
    longestWinStreak: 0,
    longestLossStreak: 0,
    sessions: 0,
    checkmateWins: 0,
    timeoutLosses: 0,
    resignationLosses: 0,
    primaryPool: beta.format,
    days: [],
    pools: [{ pool: beta.format, games: beta.games, record: beta.record }],
    openings: [],
    signals: {
      green: { label: "Green · Preserve", title: beta.green, copy: "The strongest positive quality supported by this week." },
      amber: { label: "Amber · Keep context", title: "Keep pool, opponent and sample-size context visible.", copy: "BoardSignal does not turn one week into a permanent claim about the player." },
      red: { label: "Red · Fix first", title: beta.red, copy: "The first correction selected from the reviewed evidence." },
      blue: { label: "Blue · Carry with you", title: beta.blue, copy: "Advice for this player's next games, not a cross-week task BoardSignal grades." },
    },
    candidates: [],
    caveats: [
      "This Desk preserves the reviewed findings from its completed seven-day period.",
      ...(beta.status === "last-active" ? ["This is an older last-active period; current form cannot be inferred from it."] : []),
    ],
  };
}
