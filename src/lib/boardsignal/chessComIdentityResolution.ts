import { resolveChessComPlayer } from "./processor";

export type ChessComIdentityResolutionCode =
  | "CHESS_COM_INVALID_INPUT"
  | "CHESS_COM_UNRESOLVED"
  | "CHESS_COM_RATE_LIMITED"
  | "CHESS_COM_UNAVAILABLE"
  | "CHESS_COM_TIMEOUT"
  | "CHESS_COM_NETWORK";

const INVALID_INPUT_MESSAGE = "Enter a valid Chess.com username or Chess.com member profile link.";
const UNRESOLVED_MESSAGE = "Chess.com couldn't resolve that username. Check the current username on your profile or paste your Chess.com profile link.";
const RATE_LIMITED_MESSAGE = "Chess.com is limiting requests right now. Try again shortly.";
const UNAVAILABLE_MESSAGE = "Chess.com is temporarily unavailable. Your BoardSignal account is fine — try again shortly.";

export class ChessComIdentityResolutionError extends Error {
  readonly code: ChessComIdentityResolutionCode;
  readonly status: number;

  constructor(code: ChessComIdentityResolutionCode, message: string, status: number) {
    super(message);
    this.name = "ChessComIdentityResolutionError";
    this.code = code;
    this.status = status;
  }
}

function invalidInput(): never {
  throw new ChessComIdentityResolutionError("CHESS_COM_INVALID_INPUT", INVALID_INPUT_MESSAGE, 400);
}

export function normalizeChessComIdentityInput(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) invalidInput();

  let username = raw.replace(/^@/, "");
  const isMemberUrl = /^https?:\/\//i.test(username) || /^www\./i.test(username);

  if (isMemberUrl) {
    let parsed: URL;
    try {
      parsed = new URL(/^www\./i.test(username) ? `https://${username}` : username);
    } catch {
      invalidInput();
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      (parsed.protocol !== "https:" && parsed.protocol !== "http:")
      || (hostname !== "chess.com" && hostname !== "www.chess.com")
      || parsed.port
      || parsed.username
      || parsed.password
      || parsed.search
      || parsed.hash
    ) {
      invalidInput();
    }

    const match = /^\/member\/([^/]+)\/?$/i.exec(parsed.pathname);
    if (!match) invalidInput();
    try {
      username = decodeURIComponent(match[1]);
    } catch {
      invalidInput();
    }
  }

  if (!/^[A-Za-z0-9_-]{2,50}$/.test(username)) invalidInput();
  return username;
}

function upstreamStatus(error: unknown) {
  const value = Number((error as { status?: unknown })?.status);
  return Number.isInteger(value) ? value : undefined;
}

function isTimeout(error: unknown) {
  const name = String((error as { name?: unknown })?.name ?? "");
  return name === "TimeoutError" || name === "AbortError";
}

export function mapChessComIdentityResolutionError(error: unknown): ChessComIdentityResolutionError {
  if (error instanceof ChessComIdentityResolutionError) return error;
  const status = upstreamStatus(error);
  if (status === 404) return new ChessComIdentityResolutionError("CHESS_COM_UNRESOLVED", UNRESOLVED_MESSAGE, 404);
  if (status === 429) return new ChessComIdentityResolutionError("CHESS_COM_RATE_LIMITED", RATE_LIMITED_MESSAGE, 429);
  if (typeof status === "number" && status >= 500) {
    return new ChessComIdentityResolutionError("CHESS_COM_UNAVAILABLE", UNAVAILABLE_MESSAGE, 503);
  }
  if (isTimeout(error)) return new ChessComIdentityResolutionError("CHESS_COM_TIMEOUT", UNAVAILABLE_MESSAGE, 503);
  return new ChessComIdentityResolutionError("CHESS_COM_NETWORK", UNAVAILABLE_MESSAGE, 503);
}

export async function resolveChessComIdentityInput(value: unknown) {
  const username = normalizeChessComIdentityInput(value);
  try {
    return await resolveChessComPlayer(username);
  } catch (error) {
    throw mapChessComIdentityResolutionError(error);
  }
}
