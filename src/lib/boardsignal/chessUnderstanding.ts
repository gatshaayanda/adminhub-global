import { Chess } from "chess.js";
import { humanMoveModelStatus } from "./humanMoveModel";
import type {
  BoardSignalDesk,
  ChessUnderstandingConceptId,
  DeskCandidate,
  DeskEngineResult,
  DeskUnderstandingMoment,
} from "./types";

export const CHESS_UNDERSTANDING_VERSION = "boardsignal-understanding-1.0.0" as const;

type ColorCode = "w" | "b";
type PieceFact = { type: string; color: ColorCode; square: string };

const PIECE_NAME: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const FILES = "abcdefgh";
const WHITE_MINOR_STARTS = new Set(["b1", "g1", "c1", "f1"]);
const BLACK_MINOR_STARTS = new Set(["b8", "g8", "c8", "f8"]);

function code(color: DeskCandidate["playerColor"]): ColorCode {
  return color === "white" ? "w" : "b";
}

function other(color: ColorCode): ColorCode {
  return color === "w" ? "b" : "w";
}

function coords(square: string) {
  return { file: FILES.indexOf(square[0]), rank: Number(square[1]) - 1 };
}

function square(file: number, rank: number) {
  return `${FILES[file]}${rank + 1}`;
}

function pieces(fen: string): PieceFact[] {
  const chess = new Chess(fen);
  return chess.board().flatMap((row) => row.flatMap((piece) => piece
    ? [{ type: piece.type, color: piece.color as ColorCode, square: piece.square }]
    : []));
}

function mapPieces(fen: string) {
  return new Map(pieces(fen).map((piece) => [piece.square, piece] as const));
}

function rayClear(board: Map<string, PieceFact>, from: string, to: string) {
  const a = coords(from);
  const b = coords(to);
  const stepFile = Math.sign(b.file - a.file);
  const stepRank = Math.sign(b.rank - a.rank);
  let file = a.file + stepFile;
  let rank = a.rank + stepRank;
  while (file !== b.file || rank !== b.rank) {
    if (board.has(square(file, rank))) return false;
    file += stepFile;
    rank += stepRank;
  }
  return true;
}

function attacks(piece: PieceFact, target: string, board: Map<string, PieceFact>) {
  const from = coords(piece.square);
  const to = coords(target);
  const df = to.file - from.file;
  const dr = to.rank - from.rank;
  const adf = Math.abs(df);
  const adr = Math.abs(dr);

  if (piece.type === "p") return adf === 1 && dr === (piece.color === "w" ? 1 : -1);
  if (piece.type === "n") return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
  if (piece.type === "k") return Math.max(adf, adr) === 1;
  if (piece.type === "b") return adf === adr && adf > 0 && rayClear(board, piece.square, target);
  if (piece.type === "r") return ((df === 0) !== (dr === 0)) && rayClear(board, piece.square, target);
  if (piece.type === "q") return (
    (adf === adr && adf > 0)
    || ((df === 0) !== (dr === 0))
  ) && rayClear(board, piece.square, target);
  return false;
}

function defenders(fen: string, target: string, color: ColorCode) {
  const board = mapPieces(fen);
  return [...board.values()]
    .filter((piece) => piece.color === color && piece.square !== target && attacks(piece, target, board))
    .map((piece) => piece.square);
}

function legalOpponentCaptures(fenAfter: string) {
  try {
    return new Chess(fenAfter).moves({ verbose: true }).filter((move) => Boolean(move.captured));
  } catch {
    return [];
  }
}

function movePiece(fen: string, uci?: string) {
  if (!uci || uci.length < 4) return undefined;
  return mapPieces(fen).get(uci.slice(0, 2));
}

function isMinorStartingSquare(squareValue: string, color: ColorCode) {
  return (color === "w" ? WHITE_MINOR_STARTS : BLACK_MINOR_STARTS).has(squareValue);
}

function bestMoveDevelopsMinor(candidate: DeskCandidate, result: DeskEngineResult) {
  const best = result.bestMove;
  if (!best || best.length < 4 || !candidate.fenBefore) return false;
  const piece = movePiece(candidate.fenBefore, best);
  return Boolean(piece && (piece.type === "n" || piece.type === "b") && isMinorStartingSquare(piece.square, piece.color));
}

function forcingKind(san?: string) {
  if (!san) return undefined;
  if (san.includes("#")) return "mate" as const;
  if (san.includes("+")) return "check" as const;
  if (san.includes("x")) return "capture" as const;
  return undefined;
}

function evaluationCost(result: DeskEngineResult) {
  const cp = result.evaluationLossCp;
  if (cp === undefined) return "Stockfish found a materially stronger continuation.";
  if (cp >= 100) return `The move cost about ${(cp / 100).toFixed(1)} pawns of evaluation before the position settled.`;
  return "Stockfish found a stronger continuation.";
}

function plainPiece(piece?: PieceFact) {
  return piece ? PIECE_NAME[piece.type] ?? "piece" : "piece";
}

export type BoardStructureFacts = {
  undevelopedMinorSquares: string[];
  kingSquare?: string;
  castled: boolean;
  activeMinorPieces: number;
  centerControlSquares: string[];
  openFiles: string[];
  semiOpenFiles: string[];
  doubledPawnFiles: string[];
  isolatedPawnFiles: string[];
  passedPawnSquares: string[];
};

export function structuralFacts(fen: string, playerColor: DeskCandidate["playerColor"]): BoardStructureFacts {
  const color = code(playerColor);
  const board = mapPieces(fen);
  const own = [...board.values()].filter((piece) => piece.color === color);
  const enemy = [...board.values()].filter((piece) => piece.color === other(color));
  const minorStarts = color === "w" ? WHITE_MINOR_STARTS : BLACK_MINOR_STARTS;
  const undevelopedMinorSquares = own
    .filter((piece) => (piece.type === "n" || piece.type === "b") && minorStarts.has(piece.square))
    .map((piece) => piece.square)
    .sort();
  const kingSquare = own.find((piece) => piece.type === "k")?.square;
  const castled = kingSquare === (color === "w" ? "g1" : "g8") || kingSquare === (color === "w" ? "c1" : "c8");
  const activeMinorPieces = own.filter((piece) => (piece.type === "n" || piece.type === "b") && !minorStarts.has(piece.square)).length;
  const center = ["d4", "e4", "d5", "e5"];
  const centerControlSquares = center.filter((target) => own.some((piece) => attacks(piece, target, board)));

  const ownPawns = own.filter((piece) => piece.type === "p");
  const enemyPawns = enemy.filter((piece) => piece.type === "p");
  const ownByFile = new Map<string, PieceFact[]>();
  const enemyByFile = new Map<string, PieceFact[]>();
  for (const pawn of ownPawns) ownByFile.set(pawn.square[0], [...(ownByFile.get(pawn.square[0]) ?? []), pawn]);
  for (const pawn of enemyPawns) enemyByFile.set(pawn.square[0], [...(enemyByFile.get(pawn.square[0]) ?? []), pawn]);

  const openFiles = [...FILES].filter((file) => !(ownByFile.get(file)?.length) && !(enemyByFile.get(file)?.length));
  const semiOpenFiles = [...FILES].filter((file) => !(ownByFile.get(file)?.length) && Boolean(enemyByFile.get(file)?.length));
  const doubledPawnFiles = [...ownByFile.entries()].filter(([, pawns]) => pawns.length >= 2).map(([file]) => file);
  const isolatedPawnFiles = [...ownByFile.keys()].filter((file) => {
    const index = FILES.indexOf(file);
    return !ownByFile.has(FILES[index - 1] ?? "") && !ownByFile.has(FILES[index + 1] ?? "");
  });

  const passedPawnSquares = ownPawns.filter((pawn) => {
    const here = coords(pawn.square);
    return !enemyPawns.some((enemyPawn) => {
      const there = coords(enemyPawn.square);
      const adjacent = Math.abs(there.file - here.file) <= 1;
      const ahead = color === "w" ? there.rank > here.rank : there.rank < here.rank;
      return adjacent && ahead;
    });
  }).map((pawn) => pawn.square);

  return {
    undevelopedMinorSquares,
    kingSquare,
    castled,
    activeMinorPieces,
    centerControlSquares,
    openFiles,
    semiOpenFiles,
    doubledPawnFiles,
    isolatedPawnFiles,
    passedPawnSquares,
  };
}

function moment(input: Omit<DeskUnderstandingMoment, "status" | "confidence" | "evidenceIds"> & { confidence?: "high" | "medium" }): DeskUnderstandingMoment {
  return {
    ...input,
    status: "supported",
    confidence: input.confidence ?? "high",
    evidenceIds: [input.candidateId],
  };
}

function withheld(candidate: DeskCandidate, conceptId: ChessUnderstandingConceptId, reason: string): DeskUnderstandingMoment {
  return {
    candidateId: candidate.id,
    gameId: candidate.gameId,
    conceptId,
    status: "withheld",
    confidence: "low",
    evidenceIds: [candidate.id],
    boardFacts: [],
    whatHappened: reason,
    whatYouCouldHaveNoticed: "",
    whyItMattered: "",
    nextGameRule: "",
    opening: candidate.opening,
  };
}

export function understandCandidate(candidate: DeskCandidate, result: DeskEngineResult): DeskUnderstandingMoment {
  if (
    candidate.role !== "correction"
    || candidate.kind !== "player-move"
    || candidate.reconstruction !== "legal"
    || !candidate.fenBefore
    || !candidate.fenAfter
    || !candidate.movePlayedUci
    || result.status === "failed"
    || (result.evaluationLossCp ?? 0) < 100
  ) {
    return withheld(candidate, "opponent_forcing_reply", "The position did not clear BoardSignal's deterministic teaching threshold.");
  }

  const player = code(candidate.playerColor);
  const beforeMap = mapPieces(candidate.fenBefore);
  const afterMap = mapPieces(candidate.fenAfter);
  const moved = movePiece(candidate.fenBefore, candidate.movePlayedUci);
  const from = candidate.movePlayedUci.slice(0, 2);
  const strongestReply = result.strongestOpponentReplySan ?? candidate.opponentReply;
  const strongestReplyUci = result.strongestOpponentReply;
  const strongestTarget = strongestReplyUci?.slice(2, 4);
  const legalCaptures = legalOpponentCaptures(candidate.fenAfter);
  const structureBefore = structuralFacts(candidate.fenBefore, candidate.playerColor);

  const vulnerable = [...afterMap.values()]
    .filter((piece) => piece.color === player && piece.type !== "k")
    .map((piece) => ({
      piece,
      defendersAfter: defenders(candidate.fenAfter!, piece.square, player),
      legalCaptures: legalCaptures.filter((capture) => capture.to === piece.square),
    }))
    .filter((item) => item.defendersAfter.length === 0 && item.legalCaptures.length > 0)
    .sort((a, b) => {
      const aStrong = a.piece.square === strongestTarget ? 1 : 0;
      const bStrong = b.piece.square === strongestTarget ? 1 : 0;
      return bStrong - aStrong || (PIECE_VALUE[b.piece.type] ?? 0) - (PIECE_VALUE[a.piece.type] ?? 0);
    })[0];

  if (vulnerable && (vulnerable.piece.square === strongestTarget || candidate.opponentReply?.includes("x"))) {
    const beforeDefenders = defenders(candidate.fenBefore, vulnerable.piece.square, player);
    const onlyMovedDefender = beforeDefenders.length === 1 && beforeDefenders[0] === from;
    const boardFacts = [
      `${plainPiece(vulnerable.piece)} on ${vulnerable.piece.square} could be captured immediately after the move.`,
      `It had ${vulnerable.defendersAfter.length} protecting piece${vulnerable.defendersAfter.length === 1 ? "" : "s"} after the move.`,
      ...(onlyMovedDefender ? [`The ${plainPiece(moved)} on ${from} had been its only protector before moving.`] : []),
      ...(strongestReply ? [`Stockfish's strongest immediate reply was ${strongestReply}.`] : []),
    ];
    return moment({
      candidateId: candidate.id,
      gameId: candidate.gameId,
      conceptId: "piece_safety",
      boardFacts,
      whatHappened: onlyMovedDefender
        ? `Moving the ${plainPiece(moved)} from ${from} removed the only protection from your ${plainPiece(vulnerable.piece)} on ${vulnerable.piece.square}. ${strongestReply ? `${strongestReply} could take advantage immediately.` : "It could be taken immediately."}`
        : `After ${candidate.movePlayed ?? "your move"}, your ${plainPiece(vulnerable.piece)} on ${vulnerable.piece.square} was left without a defender and could be taken immediately.`,
      whatYouCouldHaveNoticed: onlyMovedDefender
        ? `Before moving the ${plainPiece(moved)}, it was the only piece protecting ${vulnerable.piece.square}.`
        : `Before releasing the move, you could check which of your pieces would be attacked and whether each one still had protection.`,
      whyItMattered: evaluationCost(result),
      chessName: "Loose / hanging piece",
      nextGameRule: "Before moving a defender, check what it was protecting.",
      opening: candidate.opening,
    });
  }

  const force = forcingKind(strongestReply);
  if ((force === "mate" || force === "check") && structureBefore.kingSquare) {
    return moment({
      candidateId: candidate.id,
      gameId: candidate.gameId,
      conceptId: "king_safety",
      boardFacts: [
        `Your king was on ${structureBefore.kingSquare} before the move.`,
        `Stockfish's strongest immediate reply was ${strongestReply}, a ${force === "mate" ? "mating move" : "check"}.`,
      ],
      whatHappened: `${candidate.movePlayed ?? "The move"} allowed ${strongestReply ?? "an immediate check"} before your own plan could continue.`,
      whatYouCouldHaveNoticed: "The opponent had a forcing check available immediately after your move.",
      whyItMattered: evaluationCost(result),
      chessName: "King safety / forcing check",
      nextGameRule: "Before committing, scan every check your opponent will have.",
      opening: candidate.opening,
    });
  }

  if (candidate.opening
    && (candidate.playerContext?.playerQueenMovesBefore ?? 0) >= 1
    && moved?.type === "q"
    && structureBefore.undevelopedMinorSquares.length >= 2
    && bestMoveDevelopsMinor(candidate, result)
  ) {
    return moment({
      candidateId: candidate.id,
      gameId: candidate.gameId,
      conceptId: "opening_danger",
      boardFacts: [
        `Your queen had already moved ${candidate.playerContext?.playerQueenMovesBefore ?? 0} time${(candidate.playerContext?.playerQueenMovesBefore ?? 0) === 1 ? "" : "s"} before this decision.`,
        `${structureBefore.undevelopedMinorSquares.length} minor pieces were still on their starting squares.`,
        `${result.bestMoveSan ?? "Stockfish's stronger move"} developed a piece instead.`,
      ],
      whatHappened: `Your queen moved again while ${structureBefore.undevelopedMinorSquares.length} minor pieces were still waiting to develop.`,
      whatYouCouldHaveNoticed: "When the queen has already moved early, compare another queen move with bringing a new piece into the game.",
      whyItMattered: evaluationCost(result),
      chessName: `${candidate.opening.name} · development and tempo`,
      nextGameRule: "If the queen has already moved, ask whether a new piece can join the game instead.",
      opening: candidate.opening,
    });
  }

  if (!force && structureBefore.undevelopedMinorSquares.length >= 2 && bestMoveDevelopsMinor(candidate, result)) {
    return moment({
      candidateId: candidate.id,
      gameId: candidate.gameId,
      conceptId: "development",
      boardFacts: [
        `${structureBefore.undevelopedMinorSquares.length} minor pieces were still on their starting squares.`,
        `${result.bestMoveSan ?? "Stockfish's stronger move"} developed one of them.`,
      ],
      whatHappened: `${candidate.movePlayed ?? "The move"} left several pieces undeveloped while a stronger move brought another piece into the game.`,
      whatYouCouldHaveNoticed: `Before choosing a quiet move, you could see ${structureBefore.undevelopedMinorSquares.join(", ")} were still on their starting squares.`,
      whyItMattered: evaluationCost(result),
      chessName: candidate.opening ? `${candidate.opening.name} · development` : "Development",
      nextGameRule: "In a quiet position, ask which unused piece can improve first.",
      opening: candidate.opening,
      confidence: "medium",
    });
  }

  if (force === "capture" || force === "check" || force === "mate") {
    return moment({
      candidateId: candidate.id,
      gameId: candidate.gameId,
      conceptId: "opponent_forcing_reply",
      boardFacts: [
        `Stockfish's strongest immediate reply was ${strongestReply}.`,
        `That reply was a ${force}.`,
        ...(result.forcingLineSan?.length ? [`The supporting line begins ${result.forcingLineSan.slice(0, 3).join(" ")}.`] : []),
      ],
      whatHappened: `${candidate.movePlayed ?? "The move"} allowed an immediate ${force} that changed the position.`,
      whatYouCouldHaveNoticed: `Before moving, the opponent's strongest immediate ${force} was available to test.`,
      whyItMattered: evaluationCost(result),
      chessName: "Forcing reply",
      nextGameRule: "Move chosen? Test their strongest check, capture or direct threat first.",
      opening: candidate.opening,
    });
  }

  return withheld(candidate, "piece_activity", "The engine preferred another move, but BoardSignal could not tie the difference to a sufficiently explicit board clue.");
}

export function buildDeskUnderstanding(
  _desk: BoardSignalDesk,
  reviewed: Array<{ candidate: DeskCandidate; result: DeskEngineResult }>,
) {
  const moments = reviewed.map(({ candidate, result }) => understandCandidate(candidate, result));
  const conceptIds = [...new Set(moments
    .filter((item) => item.status === "supported")
    .map((item) => item.conceptId))];
  return {
    version: CHESS_UNDERSTANDING_VERSION,
    moments,
    conceptIds,
    humanMoveModel: humanMoveModelStatus(),
  };
}
