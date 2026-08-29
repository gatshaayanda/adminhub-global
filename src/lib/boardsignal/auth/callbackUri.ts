const CHESSCOM_CALLBACK_PATH = "/api/auth/chesscom/callback";
const ALLOWED_PRODUCTION_CALLBACK_ORIGINS = new Set([
  "https://www.boardsignal.ai",
  "https://boardsignal-adminhub.vercel.app",
]);

function isLocalDevelopmentOrigin(origin: string) {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

export function validateChessComCallbackUri(
  value?: string,
  nodeEnv?: string,
): { valid: boolean; normalized?: string; reason?: string } {
  const raw = String(value ?? "").trim();
  if (!raw) return { valid: false, reason: "CHESSCOM_REDIRECT_URI is missing." };
  let url: URL;
  try { url = new URL(raw); }
  catch { return { valid: false, reason: "CHESSCOM_REDIRECT_URI is not a valid URL." }; }
  if (url.search || url.hash) return { valid: false, reason: "CHESSCOM_REDIRECT_URI must not contain query parameters or fragments." };
  if (url.pathname !== CHESSCOM_CALLBACK_PATH) return { valid: false, reason: `CHESSCOM_REDIRECT_URI must use the canonical callback path ${CHESSCOM_CALLBACK_PATH}.` };
  const origin = url.origin.toLowerCase();
  const originAllowed =
    ALLOWED_PRODUCTION_CALLBACK_ORIGINS.has(origin)
    || (nodeEnv !== "production" && isLocalDevelopmentOrigin(origin));
  if (!originAllowed) return { valid: false, reason: `CHESSCOM_REDIRECT_URI origin ${origin} is not allowed.` };
  return { valid: true, normalized: `${origin}${CHESSCOM_CALLBACK_PATH}` };
}

export function resolveChessComCallbackUri(
  value?: string,
  nodeEnv?: string,
) {
  const validation = validateChessComCallbackUri(value, nodeEnv);
  return validation.valid ? validation.normalized : undefined;
}
