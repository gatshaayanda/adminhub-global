import { createHmac } from "node:crypto";

export const BOARDSIGNAL_LIVE_RECOVERY_CLAIM = "boardSignalLiveRecoveryIncident" as const;
export const BOARDSIGNAL_LIVE_RECOVERY_TYPE = "service_recovery" as const;
export const BOARDSIGNAL_LIVE_RECOVERY_LINK = "/boardsignal/player-room" as const;
export const BOARDSIGNAL_LIVE_RECOVERY_TITLE = "BoardSignal is live again" as const;
export const BOARDSIGNAL_LIVE_RECOVERY_BODY = "Your next check is ready when you are." as const;
export const BOARDSIGNAL_LIVE_RECOVERY_WEBPUSH_TOPIC = "boardsignal-live-recovery" as const;
export const BOARDSIGNAL_LIVE_RECOVERY_WINDOW_MS = 60 * 60 * 1000;
export const BOARDSIGNAL_LIVE_RECOVERY_SAFETY_BUFFER_MS = 5 * 60 * 1000;
const PACIFIC_TIME_ZONE = "America/Los_Angeles";
const DAY_MS = 86_400_000;

const pacificFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PACIFIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type DateParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function pacificParts(date: Date): DateParts {
  const parts = Object.fromEntries(pacificFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function dateKey(parts: Pick<DateParts, "year" | "month" | "day">) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function addIsoDays(value: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid BoardSignal live-recovery incident date.");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error("Invalid BoardSignal live-recovery incident date.");
  return new Date(parsed.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

function pacificOffsetMs(atMs: number) {
  const rounded = Math.floor(atMs / 1000) * 1000;
  const parts = pacificParts(new Date(rounded));
  const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return representedAsUtc - rounded;
}

export function pacificMidnightUtcMs(incident: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(incident)) throw new Error("Invalid BoardSignal live-recovery incident date.");
  const [year, month, day] = incident.split("-").map(Number);
  const desiredAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  let candidate = desiredAsUtc;
  for (let iteration = 0; iteration < 4; iteration += 1) candidate = desiredAsUtc - pacificOffsetMs(candidate);
  const actual = pacificParts(new Date(candidate));
  if (dateKey(actual) !== incident || actual.hour !== 0 || actual.minute !== 0) throw new Error("BoardSignal could not resolve the Pacific live-recovery reset.");
  return candidate;
}

export type BoardSignalLiveRecoveryIncident = {
  incident: string;
  resetAtMs: number;
  reopensAtMs: number;
  reopensAt: string;
};

export type BoardSignalLiveRecoveryClaim =
  | { incident: string; state: "requested"; requestedAt: string }
  | { incident: string; state: "claimed"; claimId: string; claimedAt: string }
  | { incident: string; state: "completed"; claimId: string; claimedAt: string; completedAt: string; outcome: "sent" | "failed" };

export function liveRecoveryIncidentForRequest(now = new Date()): BoardSignalLiveRecoveryIncident {
  const todayPacific = dateKey(pacificParts(now));
  const incident = addIsoDays(todayPacific, 1);
  const resetAtMs = pacificMidnightUtcMs(incident);
  const reopensAtMs = resetAtMs + BOARDSIGNAL_LIVE_RECOVERY_SAFETY_BUFFER_MS;
  return { incident, resetAtMs, reopensAtMs, reopensAt: new Date(reopensAtMs).toISOString() };
}

export function liveRecoveryDeliveryWindow(now = new Date()): BoardSignalLiveRecoveryIncident | undefined {
  const incident = dateKey(pacificParts(now));
  const resetAtMs = pacificMidnightUtcMs(incident);
  const reopensAtMs = resetAtMs + BOARDSIGNAL_LIVE_RECOVERY_SAFETY_BUFFER_MS;
  if (now.getTime() < reopensAtMs || now.getTime() >= reopensAtMs + BOARDSIGNAL_LIVE_RECOVERY_WINDOW_MS) return undefined;
  return { incident, resetAtMs, reopensAtMs, reopensAt: new Date(reopensAtMs).toISOString() };
}

export function liveRecoveryCronScheduleForIncident(incident: string) {
  const reopensAt = new Date(pacificMidnightUtcMs(incident) + BOARDSIGNAL_LIVE_RECOVERY_SAFETY_BUFFER_MS);
  return `${reopensAt.getUTCMinutes()} ${reopensAt.getUTCHours()} * * *`;
}

export function liveRecoveryCronAdmission(scheduleHeader: string | null | undefined, now = new Date()) {
  const due = liveRecoveryDeliveryWindow(now);
  const schedule = String(scheduleHeader ?? "").trim();
  if (!due || !schedule || schedule !== liveRecoveryCronScheduleForIncident(due.incident)) return undefined;
  return due;
}

export function priorLiveRecoveryIncidents(incident: string, count = 8) {
  const bounded = Math.max(0, Math.min(30, Math.floor(count)));
  return Array.from({ length: bounded }, (_, index) => addIsoDays(incident, -(index + 1)));
}

export function liveRecoveryTopicFor(uid: string, incident: string, secret: string) {
  if (!uid.trim()) throw new Error("A Firebase authenticated identity is required for live recovery.");
  if (!secret.trim()) throw new Error("BoardSignal live recovery is not configured.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(incident)) throw new Error("Invalid BoardSignal live-recovery incident date.");
  const opaque = createHmac("sha256", secret).update(`boardsignal-live-recovery:v1:${incident}:${uid}`).digest("base64url").slice(0, 24);
  return `boardsignal-recovery-${incident.replaceAll("-", "")}-${opaque}`;
}

export function isLiveRecoveryIncident(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && (() => {
    try { return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value; }
    catch { return false; }
  })();
}

export function liveRecoveryClaim(value: unknown): BoardSignalLiveRecoveryClaim | undefined {
  // Compatibility for the never-promoted first P1 candidate representation.
  if (isLiveRecoveryIncident(value)) return { incident: value, state: "requested", requestedAt: "legacy" };
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const incident = record.incident;
  if (!isLiveRecoveryIncident(incident)) return undefined;
  if (record.state === "requested" && typeof record.requestedAt === "string") {
    return { incident, state: "requested", requestedAt: record.requestedAt };
  }
  if (record.state === "claimed" && typeof record.claimId === "string" && record.claimId && typeof record.claimedAt === "string") {
    return { incident, state: "claimed", claimId: record.claimId, claimedAt: record.claimedAt };
  }
  if (
    record.state === "completed"
    && typeof record.claimId === "string"
    && record.claimId
    && typeof record.claimedAt === "string"
    && typeof record.completedAt === "string"
    && (record.outcome === "sent" || record.outcome === "failed")
  ) {
    return { incident, state: "completed", claimId: record.claimId, claimedAt: record.claimedAt, completedAt: record.completedAt, outcome: record.outcome };
  }
  return undefined;
}

export function liveRecoveryRequestedClaim(incident: string, requestedAt: string): BoardSignalLiveRecoveryClaim {
  if (!isLiveRecoveryIncident(incident)) throw new Error("Invalid BoardSignal live-recovery incident date.");
  return { incident, state: "requested", requestedAt };
}

export function liveRecoveryClaimedClaim(incident: string, claimId: string, claimedAt: string): BoardSignalLiveRecoveryClaim {
  if (!isLiveRecoveryIncident(incident) || !claimId.trim()) throw new Error("Invalid BoardSignal live-recovery delivery claim.");
  return { incident, state: "claimed", claimId, claimedAt };
}

export function liveRecoveryCompletedClaim(
  incident: string,
  claimId: string,
  claimedAt: string,
  completedAt: string,
  outcome: "sent" | "failed",
): BoardSignalLiveRecoveryClaim {
  if (!isLiveRecoveryIncident(incident) || !claimId.trim()) throw new Error("Invalid BoardSignal live-recovery completion claim.");
  return { incident, state: "completed", claimId, claimedAt, completedAt, outcome };
}

export function liveRecoveryClaimIsRequested(value: unknown, incident: string) {
  const claim = liveRecoveryClaim(value);
  return claim?.incident === incident && claim.state === "requested";
}

export function liveRecoveryClaimIsOwned(value: unknown, incident: string, claimId: string) {
  const claim = liveRecoveryClaim(value);
  return claim?.incident === incident && claim.state === "claimed" && claim.claimId === claimId;
}
