import { Chess } from "chess.js";
import openingIndex from "../../data/boardsignal/lichess-openings.json";
import type { BoardSignalOpeningClassification } from "./types";

type OpeningIndex = {
  meta: {
    source: string;
    commit: string;
    license: "CC0-1.0";
    entries: number;
  };
  positions: Record<string, [eco: string, name: string]>;
};

const INDEX = openingIndex as unknown as OpeningIndex;

export const BOARD_SIGNAL_OPENING_DATA = INDEX.meta;

export function openingPositionKey(fen: string) {
  return fen.trim().split(/\s+/).slice(0, 4).join(" ");
}

export function chessComOpeningMetadata(pgn: string): BoardSignalOpeningClassification | undefined {
  const match = pgn.match(/^\[ECOUrl "[^"]*\/openings\/([^"]+)"\]$/m);
  if (!match) return undefined;
  const name = match[1].replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return {
    name,
    source: "chesscom_metadata",
    recognizedPly: 0,
  };
}

export function classifyOpeningPgn(pgn: string): BoardSignalOpeningClassification | undefined {
  try {
    const parsed = new Chess();
    parsed.loadPgn(pgn);
    const moves = parsed.history();
    const replay = new Chess();
    let best: BoardSignalOpeningClassification | undefined;

    moves.forEach((san, index) => {
      replay.move(san);
      const hit = INDEX.positions[openingPositionKey(replay.fen())];
      if (!hit) return;
      best = {
        eco: hit[0],
        name: hit[1],
        source: "lichess_cc0",
        sourceVersion: INDEX.meta.commit,
        recognizedPly: index + 1,
      };
    });

    return best ?? chessComOpeningMetadata(pgn);
  } catch {
    return chessComOpeningMetadata(pgn);
  }
}
