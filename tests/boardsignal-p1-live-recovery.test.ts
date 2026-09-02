import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BOARDSIGNAL_LIVE_RECOVERY_BODY,
  BOARDSIGNAL_LIVE_RECOVERY_LINK,
  BOARDSIGNAL_LIVE_RECOVERY_TITLE,
  liveRecoveryClaimIsOwned,
  liveRecoveryClaimIsRequested,
  liveRecoveryClaimedClaim,
  liveRecoveryCompletedClaim,
  liveRecoveryCronAdmission,
  liveRecoveryDeliveryWindow,
  liveRecoveryIncidentForRequest,
  liveRecoveryRequestedClaim,
  liveRecoveryTopicFor,
  pacificMidnightUtcMs,
} from "../src/lib/boardsignal/liveRecovery";
import {
  BOARDSIGNAL_FIRESTORE_QUOTA_STORAGE_KEY,
  FIRESTORE_QUOTA_EXHAUSTED_CODE,
  nextFirestoreFreeQuotaResetAt,
} from "../src/lib/boardsignal/client/firestoreQuota";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const quotaClient = read("src/lib/boardsignal/client/firestoreQuota.ts");
const pausedRoom = read("src/components/LiveDataUnavailablePlayerRoom.tsx");
const reminder = read("src/components/LiveRecoveryReminder.tsx");
const browserPush = read("src/components/BrowserPushControl.tsx");
const route = read("src/app/api/boardsignal/live-recovery/route.ts");
const server = read("src/lib/boardsignal/server/liveRecovery.ts");
const cron = read("src/app/api/cron/boardsignal-live-recovery/route.ts");
const chrome = read("scripts/check-boardsignal-p1-live-recovery.mjs");
const sw = read("public/sw.js");
const vercel = read("vercel.json");
const deletion = read("src/lib/boardsignal/server/accountDeletion.ts");

const UID = "chesscom_448290318";
const SECRET = "p1-test-secret";
const INCIDENT = "2026-07-16";

test("P1 normal operation does not introduce a recovery CTA outside the quota-paused branches", () => {
  assert.match(pausedRoom, /const quotaExhausted = reasonCode === FIRESTORE_QUOTA_EXHAUSTED_CODE/);
  assert.equal((pausedRoom.match(/<LiveRecoveryReminder \/>/g) ?? []).length, 2);
  assert.doesNotMatch(reminder, /FIRESTORE_QUOTA_EXHAUSTED_CODE/);
});

test("P1 quota reset stays aligned with the existing Pacific + five-minute client truth", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");
  const serverReopensAt = liveRecoveryIncidentForRequest(now).reopensAtMs;
  const clientReopensAt = nextFirestoreFreeQuotaResetAt(now.getTime()) + 5 * 60_000;
  assert.ok(Math.abs(serverReopensAt - clientReopensAt) < 1000);
  assert.match(quotaClient, /America\/Los_Angeles/);
  assert.match(quotaClient, /RESET_BUFFER_MS = 5 \* 60 \* 1000/);
  assert.equal(FIRESTORE_QUOTA_EXHAUSTED_CODE, "FIRESTORE_QUOTA_EXHAUSTED");
});

test("P1 Chrome harness uses the real production quota local-storage key", () => {
  assert.equal(BOARDSIGNAL_FIRESTORE_QUOTA_STORAGE_KEY, "boardsignal:firestore-quota-until");
  assert.match(chrome, /const quotaStorageKey = "boardsignal:firestore-quota-until"/);
  assert.doesNotMatch(chrome, /boardsignal\.firestoreQuotaBlockedUntil/);
  assert.match(chrome, /real quota storage key was not active/);
});

test("P1 saved Player Room remains readable while capacity is paused", () => {
  assert.match(pausedRoom, /MY BOARDSIGNAL · SAVED/);
  assert.match(pausedRoom, /UniversalPlayerDesk/);
  assert.match(pausedRoom, /saved BoardSignal and completed Reviews remain read-only and safe/i);
});

test("P1 no-saved-copy state is truthful and keeps the local reset visible", () => {
  assert.match(pausedRoom, /TODAY'S LIVE BOARDSIGNAL CAPACITY HAS BEEN USED/);
  assert.match(pausedRoom, /No saved My BoardSignal copy is available on this device yet/);
  assert.match(pausedRoom, /Live checks reopen around \$\{resetLabel\}/);
});

test("P1 preserves the existing one-time in-tab retry after blockedUntil expires", () => {
  assert.match(pausedRoom, /const delay = Math\.max\(1000, quotaUntil - Date\.now\(\) \+ 1000\)/);
  assert.match(pausedRoom, /window\.setTimeout\(\(\) => \{ void onRetry\(\); \}/);
  assert.match(pausedRoom, /if \(retrying \|\| \(quotaExhausted && firestoreQuotaBlockedUntil\(\)\)\) return/);
});

test("P1 explicit reminder registration is Firebase Auth + FCM only and contains no Firestore call", () => {
  assert.match(route, /requirePlayerToken\(request\)/);
  assert.match(server, /getAdminAuth\(\)/);
  assert.match(server, /subscribeToTopic/);
  for (const source of [route, server]) assert.doesNotMatch(source, /getAdminDb|accountForToken|collection\(|pushTokens|notificationPreferences|inbox/i);
});

test("P1 notification permission is requested only from the explicit reminder click", () => {
  const requestIndex = reminder.indexOf("Notification.requestPermission()");
  const handlerIndex = reminder.indexOf("async function setReminder()");
  const clickIndex = reminder.indexOf("onClick={() => void setReminder()}");
  assert.ok(handlerIndex >= 0 && requestIndex > handlerIndex && clickIndex > requestIndex);
  const effect = reminder.slice(reminder.indexOf("useEffect(() =>"), reminder.indexOf("async function setReminder()"));
  assert.doesNotMatch(effect, /requestPermission/);
});

test("P1 granted permission registers the one-time recovery path without changing normal alert preferences", () => {
  assert.match(reminder, /getBoardSignalBrowserPushToken\(\)/);
  assert.match(reminder, /\/api\/boardsignal\/live-recovery/);
  assert.match(reminder, /action: "subscribe"/);
  assert.doesNotMatch(reminder, /\/api\/boardsignal\/inbox|notificationPreferences|registerPush/);
});

test("P1 denied permission is respected without another prompt CTA", () => {
  assert.match(reminder, /if \(permission === "denied"\)/);
  assert.match(reminder, /BoardSignal respects that choice and will not ask again/);
});

test("P1 unsupported browsers show no broken recovery button", () => {
  assert.match(reminder, /permission === "unsupported"/);
  const unsupported = reminder.slice(reminder.indexOf('if (!configured || permission === "unsupported")'), reminder.indexOf('if (permission === "denied")'));
  assert.doesNotMatch(unsupported, /<button/);
});

test("P1 unconfigured push degrades truthfully", () => {
  assert.match(reminder, /const configured = Boolean\(process\.env\.NEXT_PUBLIC_FIREBASE_VAPID_KEY/);
  assert.match(server, /LIVE_RECOVERY_UNAVAILABLE/);
  assert.match(reminder, /Recovery reminder unavailable here/);
});

test("P1 first valid scheduler invocation claims delivery before FCM", () => {
  const requested = liveRecoveryRequestedClaim(INCIDENT, "2026-07-15T12:00:00.000Z");
  const claimed = liveRecoveryClaimedClaim(INCIDENT, "claim-a", "2026-07-16T07:05:00.000Z");
  assert.equal(liveRecoveryClaimIsRequested(requested, INCIDENT), true);
  assert.equal(liveRecoveryClaimIsRequested(claimed, INCIDENT), false);
  assert.equal(liveRecoveryClaimIsOwned(claimed, INCIDENT, "claim-a"), true);
  const claimIndex = server.indexOf("const claimed = await claimDueUsers(users, due.incident)");
  const sendIndex = server.indexOf("getAdminMessaging().sendEach");
  assert.ok(claimIndex >= 0 && sendIndex > claimIndex);
});

test("P1 second scheduler invocation cannot normally send a claimed incident again", () => {
  const claimed = liveRecoveryClaimedClaim(INCIDENT, "claim-a", "2026-07-16T07:05:00.000Z");
  const completed = liveRecoveryCompletedClaim(INCIDENT, "claim-a", "2026-07-16T07:05:00.000Z", "2026-07-16T07:05:02.000Z", "sent");
  assert.equal(liveRecoveryClaimIsRequested(claimed, INCIDENT), false);
  assert.equal(liveRecoveryClaimIsRequested(completed, INCIDENT), false);
  assert.match(server, /user\.disabled \|\| !liveRecoveryClaimIsRequested/);
});

test("P1 overlapping scheduler executions converge on one verified Auth claim owner", () => {
  const winner = liveRecoveryClaimedClaim(INCIDENT, "worker-b", "2026-07-16T07:05:00.100Z");
  assert.equal(liveRecoveryClaimIsOwned(winner, INCIDENT, "worker-a"), false);
  assert.equal(liveRecoveryClaimIsOwned(winner, INCIDENT, "worker-b"), true);
  assert.match(server, /randomUUID\(\)/);
  assert.match(server, /inFlightIncidentRuns/);
  assert.equal((server.match(/await sleep\(CLAIM_STABILIZATION_MS\)/g) ?? []).length, 2);
  assert.match(server, /verifyClaimOwners\(claimed, incident\)/);
  assert.match(server, /verifyClaimOwners\(firstPass, incident\)/);
});

test("P1 successful FCM send plus completion-write failure cannot restore REQUESTED eligibility", () => {
  const claimed = liveRecoveryClaimedClaim(INCIDENT, "claim-a", "2026-07-16T07:05:00.000Z");
  assert.equal(liveRecoveryClaimIsRequested(claimed, INCIDENT), false);
  assert.match(server, /finalizeClaim\(user, due\.incident, "sent"\)\.catch\(\(\) => undefined\)/);
  assert.doesNotMatch(server, /catch\([^\n]*liveRecoveryRequestedClaim/);
  assert.doesNotMatch(server, /clearDeliveredIncident/);
});

test("P1 failed FCM send follows explicit at-most-once policy instead of retrying the incident", () => {
  const failed = liveRecoveryCompletedClaim(INCIDENT, "claim-a", "2026-07-16T07:05:00.000Z", "2026-07-16T07:05:02.000Z", "failed");
  assert.equal(liveRecoveryClaimIsRequested(failed, INCIDENT), false);
  assert.match(server, /finalizeClaim\(user, due\.incident, "failed"\)\.catch\(\(\) => undefined\)/);
  assert.match(server, /never returned to REQUESTED/);
});

test("P1 re-registering the same already-claimed incident does not reopen delivery eligibility", () => {
  assert.match(server, /if \(existing\?\.incident !== incident\.incident \|\| existing\.state === "requested"\)/);
  assert.doesNotMatch(server, /existing\.state === "claimed"[\s\S]*liveRecoveryRequestedClaim/);
});

test("P1 prior-day registration cannot produce a next-day reminder", () => {
  const pdt = liveRecoveryDeliveryWindow(new Date("2026-07-16T07:35:00.000Z"));
  const next = liveRecoveryDeliveryWindow(new Date("2026-07-17T07:35:00.000Z"));
  assert.equal(pdt?.incident, "2026-07-16");
  assert.equal(next?.incident, "2026-07-17");
  assert.notEqual(pdt?.incident, next?.incident);
});

test("P1 recovery notification copy and Player Room deep link are private and stable", () => {
  assert.equal(BOARDSIGNAL_LIVE_RECOVERY_TITLE, "BoardSignal is live again");
  assert.equal(BOARDSIGNAL_LIVE_RECOVERY_BODY, "Your next check is ready when you are.");
  assert.equal(BOARDSIGNAL_LIVE_RECOVERY_LINK, "/boardsignal/player-room");
  assert.match(server, /type: BOARDSIGNAL_LIVE_RECOVERY_TYPE, link: BOARDSIGNAL_LIVE_RECOVERY_LINK/);
  assert.match(sw, /data: \{ link: data\.link \|\| "\/boardsignal\/player-room" \}/);
  assert.match(sw, /clients\.openWindow\(link\)/);
});

test("P1 Pacific reset is DST-aware in PDT and PST", () => {
  assert.equal(new Date(pacificMidnightUtcMs("2026-07-16") + 5 * 60_000).toISOString(), "2026-07-16T07:05:00.000Z");
  assert.equal(new Date(pacificMidnightUtcMs("2026-01-16") + 5 * 60_000).toISOString(), "2026-01-16T08:05:00.000Z");
  assert.equal(new Date(pacificMidnightUtcMs("2026-03-08") + 5 * 60_000).toISOString(), "2026-03-08T08:05:00.000Z");
  assert.equal(new Date(pacificMidnightUtcMs("2026-11-01") + 5 * 60_000).toISOString(), "2026-11-01T07:05:00.000Z");
  assert.match(vercel, /"schedule": "5 7 \* \* \*"/);
  assert.match(vercel, /"schedule": "5 8 \* \* \*"/);
  assert.match(vercel, /"path": "\/api\/cron\/boardsignal-return"[\s\S]*"schedule": "0 6 \* \* \*"/);
});

test("P1 07:05 PDT schedule is admitted and the 08:05 schedule is rejected", () => {
  const now = new Date("2026-07-16T07:35:00.000Z");
  assert.equal(liveRecoveryCronAdmission("5 7 * * *", now)?.incident, INCIDENT);
  assert.equal(liveRecoveryCronAdmission("5 8 * * *", now), undefined);
});

test("P1 08:05 PST schedule is admitted and the 07:05 schedule is rejected", () => {
  const now = new Date("2026-01-16T08:35:00.000Z");
  assert.equal(liveRecoveryCronAdmission("5 8 * * *", now)?.incident, "2026-01-16");
  assert.equal(liveRecoveryCronAdmission("5 7 * * *", now), undefined);
});

test("P1 manual or wrong schedule header cannot bypass the Pacific delivery window", () => {
  assert.equal(liveRecoveryCronAdmission(undefined, new Date("2026-07-16T07:35:00.000Z")), undefined);
  assert.equal(liveRecoveryCronAdmission("5 7 * * *", new Date("2026-07-16T12:00:00.000Z")), undefined);
  assert.equal(liveRecoveryCronAdmission("manual", new Date("2026-07-16T07:35:00.000Z")), undefined);
  assert.match(cron, /request\.headers\.get\("x-vercel-cron-schedule"\)/);
  assert.match(cron, /sendBoardSignalLiveRecoveryIfDue\(schedule\)/);
});

test("P1 wrong or unauthenticated callers are rejected from the recovery proxy", () => {
  assert.match(route, /requirePlayerToken\(request\)/);
  assert.match(route, /Number\(token\.chessPlayerId\)/);
  assert.match(route, /token\.chessUsername/);
  assert.match(route, /LIVE_RECOVERY_PLAYER_REQUIRED/);
});

test("P1 client cannot choose an arbitrary UID, incident or FCM topic", () => {
  assert.match(route, /"topic" in body \|\| "incident" in body \|\| "uid" in body \|\| "userId" in body/);
  assert.match(route, /LIVE_RECOVERY_INCIDENT_SERVER_CONTROLLED/);
  const topic = liveRecoveryTopicFor(UID, "2026-09-03", SECRET);
  assert.match(topic, /^boardsignal-recovery-20260903-[A-Za-z0-9_-]{24}$/);
  assert.ok(!topic.includes(UID));
});

test("P1 raw FCM registration tokens are never returned, logged, or encoded in Auth claims/topics", () => {
  assert.doesNotMatch(route, /console\./);
  assert.doesNotMatch(server, /console\./);
  assert.match(route, /reminderSet: true, incident: result\.incident, reopensAt: result\.reopensAt/);
  assert.doesNotMatch(route, /response\([^\n]*fcmToken/);
  assert.doesNotMatch(server, /liveRecoveryTopicFor\(fcmToken/);
  assert.doesNotMatch(server, /liveRecoveryClaimedClaim\([^\n]*fcmToken/);
});

test("P1 account deletion prevents recovery delivery without adding Firestore deletion work", () => {
  assert.match(deletion, /await auth\.updateUser\(uid, \{ disabled: true \}\)/);
  assert.match(deletion, /await auth\.deleteUser\(uid\)/);
  assert.match(server, /user\.disabled/);
  assert.doesNotMatch(deletion, /liveRecovery|recoveryIncident|subscribeToTopic|unsubscribeFromTopic/);
});

test("P1 disabling normal browser alerts cancels the independent recovery marker first", () => {
  const remove = browserPush.slice(browserPush.indexOf("export async function removeBoardSignalBrowserPush"), browserPush.indexOf("export default function BrowserPushControl"));
  const cancel = remove.indexOf("cancelBoardSignalLiveRecovery");
  const deleteToken = remove.indexOf("deleteToken");
  assert.ok(cancel >= 0 && deleteToken > cancel);
  assert.match(browserPush, /action: "unsubscribe"/);
});

test("P1 cron remains protected and schedule-aware", () => {
  assert.match(cron, /CRON_SECRET/);
  assert.match(cron, /timingSafeEqual/);
  assert.match(cron, /x-vercel-cron-schedule/);
  assert.equal(liveRecoveryDeliveryWindow(new Date("2026-07-16T07:04:59.999Z")), undefined);
  assert.ok(liveRecoveryDeliveryWindow(new Date("2026-07-16T07:05:00.000Z")));
  assert.ok(liveRecoveryDeliveryWindow(new Date("2026-07-16T08:04:59.999Z")));
  assert.equal(liveRecoveryDeliveryWindow(new Date("2026-07-16T08:05:00.000Z")), undefined);
});
