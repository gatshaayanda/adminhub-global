export const FIRESTORE_QUOTA_EXHAUSTED_CODE = "FIRESTORE_QUOTA_EXHAUSTED" as const;
export const BOARDSIGNAL_SUPPORT_DISCORD_URL = "https://discord.gg/CrWy3qJQtg" as const;
export const BOARDSIGNAL_FIRESTORE_QUOTA_STORAGE_KEY = "boardsignal:firestore-quota-until";
export const BOARDSIGNAL_FIRESTORE_QUOTA_EVENT = "boardsignal:firestore-quota";

const PACIFIC_TIME_ZONE = "America/Los_Angeles";
const RESET_BUFFER_MS = 5 * 60 * 1000;
const MAX_SEARCH_MS = 40 * 60 * 60 * 1000;

function pacificDayKey(epochMs: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(epochMs));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

/** First instant of the next calendar day in America/Los_Angeles.
 * Firestore's free daily quota resets around midnight Pacific time.
 */
export function nextFirestoreFreeQuotaResetAt(now = Date.now()) {
  const currentDay = pacificDayKey(now);
  let low = now;
  let high = now + 30 * 60 * 60 * 1000;
  const ceiling = now + MAX_SEARCH_MS;

  while (pacificDayKey(high) === currentDay && high < ceiling) high += 60 * 60 * 1000;
  if (pacificDayKey(high) === currentDay) return now + 24 * 60 * 60 * 1000;

  while (high - low > 1000) {
    const mid = Math.floor((low + high) / 2);
    if (pacificDayKey(mid) === currentDay) low = mid;
    else high = mid;
  }
  return high;
}

export function firestoreQuotaBlockedUntil(now = Date.now()) {
  if (typeof window === "undefined") return undefined;
  const stored = Number(window.localStorage.getItem(BOARDSIGNAL_FIRESTORE_QUOTA_STORAGE_KEY));
  if (!Number.isFinite(stored) || stored <= now) {
    window.localStorage.removeItem(BOARDSIGNAL_FIRESTORE_QUOTA_STORAGE_KEY);
    return undefined;
  }
  return stored;
}

export function firestoreQuotaBlocked(now = Date.now()) {
  return Boolean(firestoreQuotaBlockedUntil(now));
}

export function markFirestoreQuotaExhausted(retryAfterHeader?: string | null, now = Date.now()) {
  if (typeof window === "undefined") return nextFirestoreFreeQuotaResetAt(now) + RESET_BUFFER_MS;
  const retryAfterSeconds = Number(retryAfterHeader);
  const retryAt = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
    ? now + retryAfterSeconds * 1000
    : 0;
  const until = Math.max(nextFirestoreFreeQuotaResetAt(now) + RESET_BUFFER_MS, retryAt);
  window.localStorage.setItem(BOARDSIGNAL_FIRESTORE_QUOTA_STORAGE_KEY, String(until));
  window.dispatchEvent(new CustomEvent(BOARDSIGNAL_FIRESTORE_QUOTA_EVENT, { detail: { until } }));
  return until;
}

export function noteFirestoreQuotaResponse(status: number, code?: string, retryAfterHeader?: string | null) {
  if (status !== 503 || code !== FIRESTORE_QUOTA_EXHAUSTED_CODE) return false;
  markFirestoreQuotaExhausted(retryAfterHeader);
  return true;
}

export function quotaResetLocalLabel(until?: number) {
  if (!until) return "after the next daily reset";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(until));
}
