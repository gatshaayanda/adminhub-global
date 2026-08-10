import { Chess } from "chess.js";
import type { BoardSignalDesk, DeskCandidate, DeskDay, DeskPool } from "./types";

type ChessComPlayer = {
  player_id?: number;
  username: string;
  avatar?: string;
  url?: string;
};

type ChessComSide = {
  username: string;
  rating?: number;
  result: string;
};

type ChessComGame = {
  url: string;
  pgn: string;
  end_time: number;
  time_class?: string;
  rules?: string;
  white: ChessComSide;
  black: ChessComSide;
};

const CHESS_COM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "BoardSignal/0.1 (adminhub-global.com/boardsignal)",
};

const DRAW_RESULTS = new Set([
  "agreed",
  "repetition",
  "stalemate",
  "insufficient",
  "50move",
  "timevsinsufficient",
]);

const DAY_MS = 86_400_000;

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function atUtcMidnight(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function latestCompletedWeek(reference = new Date()) {
  const today = atUtcMidnight(reference);
  const day = today.getUTCDay();
  const daysBackToSunday = day === 0 ? 7 : day;
  const end = new Date(today.getTime() - daysBackToSunday * DAY_MS);
  const start = new Date(end.getTime() - 6 * DAY_MS);
  return { start, end };
}

function mondayFor(timestampSeconds: number) {
  const date = atUtcMidnight(new Date(timestampSeconds * 1000));
  const day = date.getUTCDay();
  const distance = day === 0 ? 6 : day - 1;
  return new Date(date.getTime() - distance * DAY_MS);
}

function formatPeriod(start: Date, end: Date) {
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const startPart = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    ...(sameMonth ? {} : { month: "short" as const }),
    timeZone: "UTC",
  }).format(start);
  const endPart = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(end);
  return `${startPart}–${endPart}`;
}

async function chessComJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: CHESS_COM_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const error = new Error(response.status === 404 ? "Chess.com player not found." : `Chess.com returned ${response.status}.`);
    Object.assign(error, { status: response.status });
    throw error;
  }

  return response.json() as Promise<T>;
}

function archiveKey(url: string) {
  const match = url.match(/\/(\d{4})\/(\d{2})$/);
  return match ? `${match[1]}-${match[2]}` : "";
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function fetchGames(url: string): Promise<ChessComGame[]> {
  const payload = await chessComJson<{ games?: ChessComGame[] }>(url);
  return payload.games ?? [];
}

function resultFor(game: ChessComGame, username: string) {
  const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
  const player = isWhite ? game.white : game.black;
  const opponent = isWhite ? game.black : game.white;
  const result: "win" | "draw" | "loss" = player.result === "win" ? "win" : DRAW_RESULTS.has(player.result) ? "draw" : "loss";
  return { player, opponent, result, color: isWhite ? "white" as const : "black" as const };
}

function recordLabel(wins: number, losses: number, draws: number) {
  return `${wins}W · ${draws}D · ${losses}L`;
}

function streaks(games: ChessComGame[], username: string) {
  let win = 0;
  let loss = 0;
  let bestWin = 0;
  let bestLoss = 0;

  for (const game of games) {
    const result = resultFor(game, username).result;
    win = result === "win" ? win + 1 : 0;
    loss = result === "loss" ? loss + 1 : 0;
    bestWin = Math.max(bestWin, win);
    bestLoss = Math.max(bestLoss, loss);
  }

  return { bestWin, bestLoss };
}

function parseOpening(pgn: string) {
  const match = pgn.match(/^\[ECOUrl "[^"]*\/openings\/([^"]+)"\]$/m);
  if (!match) return "Unclassified";
  return match[1].replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function finalFen(pgn: string) {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    return chess.fen();
  } catch {
    return undefined;
  }
}

function buildHeadline(args: {
  games: number;
  score: number;
  winStreak: number;
  timeoutLosses: number;
  losses: number;
  checkmateWins: number;
}) {
  if (args.winStreak >= 5) return `${args.winStreak} straight wins gave the week its defining run.`;
  if (args.timeoutLosses >= Math.max(2, Math.ceil(args.losses / 2))) return `The clock decided ${args.timeoutLosses} losses in a ${args.games}-game week.`;
  if (args.checkmateWins >= 3) return `${args.checkmateWins} checkmate finishes became the week's positive signature.`;
  if (args.score >= 60) return `A positive ${args.games}-game week built a ${args.score.toFixed(1)}% score.`;
  if (args.score < 40) return `A difficult score still left a specific place to begin.`;
  return `${args.games} games produced a week with more than one story.`;
}

export async function buildLiveDesk(requestedUsername: string): Promise<BoardSignalDesk> {
  const safeUsername = requestedUsername.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_-]{2,50}$/.test(safeUsername)) throw new Error("Enter a valid Chess.com username.");

  const profile = await chessComJson<ChessComPlayer>(`https://api.chess.com/pub/player/${encodeURIComponent(safeUsername)}`);
  const canonical = profile.username;
  const archivesPayload = await chessComJson<{ archives?: string[] }>(`https://api.chess.com/pub/player/${encodeURIComponent(canonical)}/games/archives`);
  const archives = archivesPayload.archives ?? [];
  const archiveCache = new Map<string, Promise<ChessComGame[]>>();
  const getArchiveGames = (url: string) => {
    const existing = archiveCache.get(url);
    if (existing) return existing;
    const request = fetchGames(url);
    archiveCache.set(url, request);
    return request;
  };

  if (!archives.length) throw new Error("This Chess.com account has no public game archives yet.");

  const latest = latestCompletedWeek();
  const latestCompletedLabel = formatPeriod(latest.start, latest.end);
  const latestEndSeconds = Math.floor((latest.end.getTime() + DAY_MS - 1) / 1000);
  let mostRecentCompletedGame: ChessComGame | undefined;

  for (const archive of [...archives].reverse().slice(0, 24)) {
    const games = await getArchiveGames(archive);
    mostRecentCompletedGame = games
      .filter((game) => game.end_time <= latestEndSeconds && game.rules !== "bughouse")
      .sort((a, b) => b.end_time - a.end_time)[0];
    if (mostRecentCompletedGame) break;
  }

  if (!mostRecentCompletedGame) throw new Error("No completed standard game was found before the latest closed week.");

  const selectedStart = mostRecentCompletedGame.end_time * 1000 >= latest.start.getTime()
    ? latest.start
    : mondayFor(mostRecentCompletedGame.end_time);
  const selectedEnd = new Date(selectedStart.getTime() + 6 * DAY_MS);
  const keys = new Set([monthKey(selectedStart), monthKey(selectedEnd)]);
  const archiveMap = new Map(archives.map((url) => [archiveKey(url), url]));
  const selectedArchives = [...keys].map((key) => archiveMap.get(key)).filter((url): url is string => Boolean(url));
  const selectedGames = (await Promise.all(selectedArchives.map(getArchiveGames)))
    .flat()
    .filter((game) => {
      const time = game.end_time * 1000;
      return time >= selectedStart.getTime() && time < selectedEnd.getTime() + DAY_MS && game.rules !== "bughouse";
    })
    .sort((a, b) => a.end_time - b.end_time);

  if (!selectedGames.length) throw new Error("The selected completed week contained no standard games.");

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let timeoutLosses = 0;
  let resignationLosses = 0;
  let checkmateWins = 0;
  const poolMap = new Map<string, { games: ChessComGame[]; wins: number; losses: number; draws: number; ratings: number[] }>();
  const dayMap = new Map<string, DeskDay>();
  const openingMap = new Map<string, number>();

  for (const game of selectedGames) {
    const result = resultFor(game, canonical);
    if (result.result === "win") wins += 1;
    if (result.result === "loss") losses += 1;
    if (result.result === "draw") draws += 1;
    if (result.result === "loss" && result.player.result === "timeout") timeoutLosses += 1;
    if (result.result === "loss" && result.player.result === "resigned") resignationLosses += 1;
    if (result.result === "win" && result.opponent.result === "checkmated") checkmateWins += 1;

    const pool = game.time_class ?? "other";
    const poolItem = poolMap.get(pool) ?? { games: [], wins: 0, losses: 0, draws: 0, ratings: [] };
    poolItem.games.push(game);
    poolItem.wins += result.result === "win" ? 1 : 0;
    poolItem.losses += result.result === "loss" ? 1 : 0;
    poolItem.draws += result.result === "draw" ? 1 : 0;
    if (typeof result.player.rating === "number") poolItem.ratings.push(result.player.rating);
    poolMap.set(pool, poolItem);

    const date = isoDay(new Date(game.end_time * 1000));
    const day = dayMap.get(date) ?? {
      date,
      label: new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(game.end_time * 1000)),
      wins: 0,
      losses: 0,
      draws: 0,
    };
    day.wins += result.result === "win" ? 1 : 0;
    day.losses += result.result === "loss" ? 1 : 0;
    day.draws += result.result === "draw" ? 1 : 0;
    dayMap.set(date, day);

    const opening = parseOpening(game.pgn);
    openingMap.set(opening, (openingMap.get(opening) ?? 0) + 1);
  }

  const pools: DeskPool[] = [...poolMap.entries()]
    .map(([pool, item]) => ({
      pool,
      games: item.games.length,
      record: recordLabel(item.wins, item.losses, item.draws),
      firstRecordedRating: item.ratings[0],
      lastRecordedRating: item.ratings.at(-1),
      peak: item.ratings.length ? Math.max(...item.ratings) : undefined,
      low: item.ratings.length ? Math.min(...item.ratings) : undefined,
    }))
    .sort((a, b) => b.games - a.games);
  const primaryPool = pools[0]?.pool ?? "chess";
  const { bestWin, bestLoss } = streaks(selectedGames, canonical);
  const score = ((wins + draws / 2) / selectedGames.length) * 100;

  let sessions = selectedGames.length ? 1 : 0;
  for (let index = 1; index < selectedGames.length; index += 1) {
    if (selectedGames[index].end_time - selectedGames[index - 1].end_time >= 30 * 60) sessions += 1;
  }

  const lossCandidates = selectedGames
    .filter((game) => resultFor(game, canonical).result === "loss")
    .sort((a, b) => {
      const priority = (game: ChessComGame) => {
        const player = resultFor(game, canonical).player.result;
        return player === "resigned" ? 0 : player === "timeout" ? 1 : 2;
      };
      return priority(a) - priority(b) || b.end_time - a.end_time;
    })
    .slice(0, 6);

  const candidates: DeskCandidate[] = lossCandidates.map((game, index) => {
    const result = resultFor(game, canonical);
    const fen = finalFen(game.pgn);
    const reason = result.player.result === "resigned"
      ? "Resignation position"
      : result.player.result === "timeout"
        ? "Final position before timeout"
        : "Selected loss position";
    return {
      id: `P${String(index + 1).padStart(2, "0")}`,
      gameUrl: game.url,
      opponent: result.opponent.username,
      playerColor: result.color,
      result: result.result,
      reason,
      fen,
      reconstruction: fen ? "legal" : "unavailable",
    };
  });

  const red = resignationLosses
    ? {
        label: "Red · Review first",
        title: `${resignationLosses} loss${resignationLosses === 1 ? "" : "es"} ended by resignation.`,
        copy: "Stockfish checks the final legal positions before BoardSignal decides whether any were still playable.",
      }
    : timeoutLosses
      ? {
          label: "Red · Review first",
          title: `${timeoutLosses} loss${timeoutLosses === 1 ? "" : "es"} ended on time.`,
          copy: "Separate clock losses from board losses before choosing the correction.",
        }
      : {
          label: "Red · Review first",
          title: "The selected losses need position-level review.",
          copy: "BoardSignal sends the legal final positions to Stockfish instead of inventing a cause from the result alone.",
        };

  const headline = buildHeadline({ games: selectedGames.length, score, winStreak: bestWin, timeoutLosses, losses, checkmateWins });
  const isLastActive = selectedStart.getTime() !== latest.start.getTime();

  return {
    source: "live",
    player: {
      requestedUsername,
      username: canonical,
      playerId: profile.player_id,
      avatar: profile.avatar,
      profileUrl: profile.url,
    },
    period: {
      start: isoDay(selectedStart),
      end: isoDay(selectedEnd),
      label: formatPeriod(selectedStart, selectedEnd),
      isLastActive,
      latestCompletedLabel,
    },
    games: selectedGames.length,
    wins,
    losses,
    draws,
    score: Number(score.toFixed(1)),
    headline,
    summary: isLastActive
      ? `The latest completed week had no games, so BoardSignal found ${canonical}'s most recent active Monday–Sunday chapter. It does not treat older games as current form.`
      : `${canonical}'s latest completed Monday–Sunday chapter is ready. The Replay stays factual; the position-level diagnosis waits for legal reconstruction and engine review.`,
    longestWinStreak: bestWin,
    longestLossStreak: bestLoss,
    sessions,
    checkmateWins,
    timeoutLosses,
    resignationLosses,
    primaryPool,
    days: [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    pools,
    openings: [...openingMap.entries()].map(([name, games]) => ({ name, games })).sort((a, b) => b.games - a.games).slice(0, 5),
    signals: {
      green: {
        label: "Green · Preserve",
        title: bestWin >= 2 ? `${bestWin} straight wins formed the strongest positive run.` : checkmateWins ? `${checkmateWins} win${checkmateWins === 1 ? "" : "s"} ended in checkmate.` : "Every completed win is evidence worth locating.",
        copy: "This is a result-level signal. Exact chess claims come only from the reviewed positions.",
      },
      amber: {
        label: "Amber · Monitor",
        title: bestLoss >= 2 ? `The longest losing sequence reached ${bestLoss} games.` : "No multi-game losing sequence appeared.",
        copy: "A sequence describes what happened; it does not prove tilt, confidence or motivation.",
      },
      red,
      blue: {
        label: "Blue · Provisional action",
        title: resignationLosses ? "Before resigning, check whether a legal reply remains." : timeoutLosses ? "When the clock is low: check, force, simplify, move." : "Open the reviewed position before choosing the next action.",
        copy: "Stockfish can sharpen this cue after the candidate positions finish in the browser.",
      },
    },
    candidates,
    caveats: [
      "The live shell uses public Chess.com data only and requests no Chess.com password.",
      "Ratings are separated by Chess.com time class; first and last values are recorded game boundaries, not an invented pre-game rating.",
      "Automatic narrative is deliberately restrained until Stockfish finishes the selected legal positions.",
      ...(isLastActive ? ["This is an older last-active period. Current form cannot be inferred from it."] : []),
    ],
  };
}
