import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import type { BoardSignalAccount } from "../account";
import type { BoardSignalDesk } from "../types";
import { buildPlayerUniverseView } from "../universe";
import { foundingBetaField } from "../../../data/universeField";
import {
  preferenceAllowsMessage,
  type BoardSignalConversationMessage,
  type BoardSignalInboxMessage,
  type BoardSignalMessageType,
  type CommunicationCampaignDraft,
  type CommunicationSegment,
} from "../communications";
import { getAdminDb, getAdminMessaging } from "../../../utils/firebaseAdmin";
import { accountForToken } from "./persistence";

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function safeId(value: string) {
  return value.replaceAll("/", "_").slice(0, 700);
}

function validateText(value: unknown, label: string, max = 4000) {
  const text = String(value ?? "").trim();
  if (!text || text.length > max) throw Object.assign(new Error(`${label} is required and must be under ${max} characters.`), { status: 400 });
  return text;
}

function pushPayload(type: BoardSignalMessageType, title: string, body: string) {
  if (["desk_ready", "episode_update", "blue_reminder", "universe_achievement"].includes(type)) {
    return { title, body };
  }
  return { title: "BoardSignal", body: "You have a new private message in My Player Room." };
}

export async function listPlayerInbox(token: DecodedIdToken) {
  const account = await accountForToken(token);
  const db = getAdminDb();
  const snapshot = await db.collection("users").doc(account.uid).collection("inbox")
    .orderBy("createdAt", "desc").limit(100).get();
  const messages = snapshot.docs.map((document) => ({ id: document.id, ...document.data() } as BoardSignalInboxMessage));
  return { messages, unreadCount: messages.filter((message) => !message.readAt).length };
}

export async function markInboxMessageRead(token: DecodedIdToken, messageIdInput: unknown) {
  const account = await accountForToken(token);
  const messageId = safeId(validateText(messageIdInput, "Message ID", 700));
  const ref = getAdminDb().collection("users").doc(account.uid).collection("inbox").doc(messageId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw Object.assign(new Error("That inbox message was not found."), { status: 404 });
  const readAt = new Date().toISOString();
  const data = snapshot.data() as BoardSignalInboxMessage;
  await ref.set({ readAt }, { merge: true });
  if (!data.readAt && data.campaignId) {
    await getAdminDb().collection("communications").doc(data.campaignId).set({
      readCount: FieldValue.increment(1),
    }, { merge: true }).catch(() => undefined);
  }
  return { messageId, readAt };
}

export async function listPlayerConversation(token: DecodedIdToken, threadIdInput: unknown) {
  const account = await accountForToken(token);
  const threadId = safeId(validateText(threadIdInput, "Thread ID", 700));
  const db = getAdminDb();
  const threadRef = db.collection("users").doc(account.uid).collection("conversations").doc(threadId);
  const thread = await threadRef.get();
  if (!thread.exists) throw Object.assign(new Error("That conversation was not found."), { status: 404 });
  const messages = await threadRef.collection("messages").orderBy("createdAt", "asc").limit(200).get();
  return {
    thread: { id: thread.id, ...thread.data() },
    messages: messages.docs.map((document) => ({ id: document.id, ...document.data() } as BoardSignalConversationMessage)),
  };
}

export async function replyToFounder(token: DecodedIdToken, threadIdInput: unknown, bodyInput: unknown) {
  const account = await accountForToken(token);
  const threadId = safeId(validateText(threadIdInput, "Thread ID", 700));
  const body = validateText(bodyInput, "Reply", 2000);
  const db = getAdminDb();
  const threadRef = db.collection("users").doc(account.uid).collection("conversations").doc(threadId);
  const thread = await threadRef.get();
  if (!thread.exists || thread.data()?.allowReply !== true) {
    throw Object.assign(new Error("Replies are not enabled for this conversation."), { status: 403 });
  }
  const messageId = randomUUID();
  const createdAt = new Date().toISOString();
  const message: BoardSignalConversationMessage = {
    id: messageId,
    userId: account.uid,
    threadId,
    body,
    senderType: "player",
    createdAt,
    campaignId: typeof thread.data()?.campaignId === "string" ? thread.data()!.campaignId : undefined,
  };
  await threadRef.collection("messages").doc(messageId).set(clean(message));
  await threadRef.set({ updatedAt: createdAt, unreadForFounder: true, lastSenderType: "player" }, { merge: true });
  return message;
}

export async function registerPlayerPushToken(token: DecodedIdToken, fcmTokenInput: unknown, userAgentInput?: unknown) {
  const account = await accountForToken(token);
  const fcmToken = validateText(fcmTokenInput, "Browser push token", 4096);
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim()) {
    throw Object.assign(new Error("Browser alerts are unavailable until BoardSignal push configuration is completed."), { status: 503 });
  }
  const id = safeId(Buffer.from(fcmToken).toString("base64url").slice(0, 180));
  const now = new Date().toISOString();
  await getAdminDb().collection("users").doc(account.uid).collection("pushTokens").doc(id).set(clean({
    token: fcmToken,
    createdAt: now,
    updatedAt: now,
    userAgent: String(userAgentInput ?? "").slice(0, 500),
  }), { merge: true });
  await getAdminDb().collection("users").doc(account.uid).set({
    notificationPreferences: { ...account.notificationPreferences, browserPush: true },
  }, { merge: true });
  return { id, configured: true };
}

export async function unregisterPlayerPushToken(token: DecodedIdToken, fcmTokenInput?: unknown) {
  const account = await accountForToken(token);
  const collection = getAdminDb().collection("users").doc(account.uid).collection("pushTokens");
  if (typeof fcmTokenInput === "string" && fcmTokenInput.trim()) {
    const id = safeId(Buffer.from(fcmTokenInput.trim()).toString("base64url").slice(0, 180));
    await collection.doc(id).delete().catch(() => undefined);
  } else {
    const all = await collection.get();
    const batch = getAdminDb().batch();
    all.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
  await getAdminDb().collection("users").doc(account.uid).set({
    notificationPreferences: { ...account.notificationPreferences, browserPush: false },
  }, { merge: true });
  return { removed: true };
}

async function allActiveAccounts() {
  const users = await getAdminDb().collection("users").get();
  return users.docs
    .map((document) => document.data() as BoardSignalAccount)
    .filter((account) => account.role === "player" && account.accessTier === "founding_beta" && account.accessStatus === "active");
}

async function audienceForSegment(segment: CommunicationSegment, accounts: BoardSignalAccount[]) {
  const db = getAdminDb();
  if (segment === "episode_forming") return accounts.filter((account) => account.currentEpisodeSummary?.status === "forming");
  if (segment === "blue_available") return accounts.filter((account) => Boolean(account.previousBlue?.title));
  if (segment === "inactive_recently") {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return accounts.filter((account) => !account.lastSeenAt || Date.parse(account.lastSeenAt) < cutoff);
  }
  if (segment === "new_players") {
    const checks = await Promise.all(accounts.map(async (account) => ({
      account,
      desks: (await db.collection("users").doc(account.uid).collection("desks").limit(1).get()).size,
    })));
    return checks.filter((item) => item.desks === 0).map((item) => item.account);
  }
  if (segment === "desk_ready" || segment === "latest_desk_not_opened") {
    const checks = await Promise.all(accounts.map(async (account) => {
      const desks = await db.collection("users").doc(account.uid).collection("desks").orderBy("periodEnd", "desc").limit(1).get();
      const latest = desks.docs[0]?.data() as { publishedAt?: string } | undefined;
      const ready = Boolean(latest);
      const unopened = Boolean(latest?.publishedAt && (!account.lastSeenAt || account.lastSeenAt < latest.publishedAt));
      return { account, ready, unopened };
    }));
    return checks.filter((item) => segment === "desk_ready" ? item.ready : item.unopened).map((item) => item.account);
  }
  if (segment === "pending_feedback") {
    const checks = await Promise.all(accounts.map(async (account) => {
      const inbox = await db.collection("users").doc(account.uid).collection("inbox").where("type", "==", "feedback_request").limit(10).get();
      return { account, pending: inbox.docs.some((document) => !document.data().readAt) };
    }));
    return checks.filter((item) => item.pending).map((item) => item.account);
  }
  if (segment === "universe_top3") {
    const checks = await Promise.all(accounts.map(async (account) => {
      const desks = await db.collection("users").doc(account.uid).collection("desks").orderBy("periodEnd", "desc").limit(1).get();
      const latest = desks.docs[0]?.data() as { desk?: BoardSignalDesk } | undefined;
      const view = latest?.desk ? buildPlayerUniverseView(foundingBetaField, latest.desk) : undefined;
      return { account, topThree: Boolean(view?.standings.some((standing) => standing.rank <= 3)) };
    }));
    return checks.filter((item) => item.topThree).map((item) => item.account);
  }
  return [];
}

export async function resolveFounderAudience(draft: Pick<CommunicationCampaignDraft, "audienceKind" | "userIds" | "segment">) {
  const accounts = await allActiveAccounts();
  if (draft.audienceKind === "all_active_beta") return accounts;
  if (draft.audienceKind === "one" || draft.audienceKind === "selected") {
    const wanted = new Set((draft.userIds ?? []).filter(Boolean));
    return accounts.filter((account) => wanted.has(account.uid));
  }
  if (draft.audienceKind === "segment" && draft.segment) return audienceForSegment(draft.segment, accounts);
  return [];
}

export async function previewFounderCampaign(draft: CommunicationCampaignDraft) {
  const audience = await resolveFounderAudience(draft);
  let pushEligibleCount = 0;
  if (draft.channels.browserPush && process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim()) {
    const tokenChecks = await Promise.all(audience.map(async (account) => {
      if (!account.notificationPreferences?.browserPush || !preferenceAllowsMessage(account.notificationPreferences, draft.type)) return false;
      const tokens = await getAdminDb().collection("users").doc(account.uid).collection("pushTokens").limit(1).get();
      return !tokens.empty;
    }));
    pushEligibleCount = tokenChecks.filter(Boolean).length;
  }
  return {
    audienceCount: audience.length,
    pushEligibleCount,
    users: audience.map((account) => ({
      uid: account.uid,
      username: account.chessCom.canonicalUsername,
      preferredContactMethod: account.preferredContactMethod,
      preferredContactValue: account.betaContactConsent ? account.preferredContactValue : undefined,
    })),
  };
}

async function sendPushToAccount(account: BoardSignalAccount, type: BoardSignalMessageType, title: string, body: string, link?: string) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim() || !account.notificationPreferences?.browserPush) {
    return { eligible: false, delivered: 0, failed: 0 };
  }
  if (!preferenceAllowsMessage(account.notificationPreferences, type)) return { eligible: false, delivered: 0, failed: 0 };
  const tokens = await getAdminDb().collection("users").doc(account.uid).collection("pushTokens").get();
  if (tokens.empty) return { eligible: false, delivered: 0, failed: 0 };
  const payload = pushPayload(type, title, body);
  let delivered = 0;
  let failed = 0;
  for (const tokenDoc of tokens.docs) {
    const fcmToken = String(tokenDoc.data().token ?? "");
    if (!fcmToken) continue;
    try {
      await getAdminMessaging().send({
        token: fcmToken,
        notification: payload,
        webpush: { fcmOptions: { link: link || "/boardsignal/player-room" } },
        data: { type, link: link || "/boardsignal/player-room" },
      });
      delivered += 1;
    } catch (error) {
      failed += 1;
      const code = String((error as { code?: string }).code ?? "");
      if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
        await tokenDoc.ref.delete().catch(() => undefined);
      }
    }
  }
  return { eligible: true, delivered, failed };
}

export async function sendFounderCampaign(draft: CommunicationCampaignDraft) {
  const title = validateText(draft.title, "Message title", 140);
  const body = validateText(draft.body, "Message body", 4000);
  const audience = await resolveFounderAudience(draft);
  if (!audience.length) throw Object.assign(new Error("This audience currently contains no active Founding Beta players."), { status: 400 });
  const db = getAdminDb();
  const campaignId = randomUUID();
  const createdAt = new Date().toISOString();
  let sentCount = 0;
  let pushEligibleCount = 0;
  let pushDelivered = 0;
  let pushFailed = 0;

  for (const account of audience) {
    if (!preferenceAllowsMessage(account.notificationPreferences, draft.type) && draft.type !== "custom") continue;
    const messageId = randomUUID();
    const threadId = draft.allowReply ? safeId(`${campaignId}_${account.uid}`) : undefined;
    const message: BoardSignalInboxMessage = {
      id: messageId,
      userId: account.uid,
      type: draft.type,
      title,
      body,
      link: draft.link,
      actionLabel: draft.actionLabel,
      createdAt,
      senderType: "founder",
      campaignId,
      threadId,
      allowReply: draft.allowReply,
    };
    await db.collection("users").doc(account.uid).collection("inbox").doc(messageId).set(clean(message));
    if (threadId) {
      const threadRef = db.collection("users").doc(account.uid).collection("conversations").doc(threadId);
      await threadRef.set(clean({
        id: threadId,
        userId: account.uid,
        campaignId,
        allowReply: true,
        title,
        createdAt,
        updatedAt: createdAt,
        unreadForFounder: false,
        lastSenderType: "founder",
      }));
      const first: BoardSignalConversationMessage = { id: messageId, userId: account.uid, threadId, body, senderType: "founder", createdAt, campaignId };
      await threadRef.collection("messages").doc(messageId).set(clean(first));
    }
    sentCount += 1;
    if (draft.channels.browserPush) {
      const push = await sendPushToAccount(account, draft.type, title, body, draft.link);
      if (push.eligible) pushEligibleCount += 1;
      pushDelivered += push.delivered;
      pushFailed += push.failed;
    }
  }

  const campaign = clean({
    id: campaignId,
    ...draft,
    title,
    body,
    createdAt,
    audienceCount: audience.length,
    sentCount,
    readCount: 0,
    pushEligibleCount,
    pushDelivered,
    pushFailed,
  });
  await db.collection("communications").doc(campaignId).set(campaign);
  return campaign;
}

export async function listFounderCommunications() {
  const db = getAdminDb();
  const [campaigns, users] = await Promise.all([
    db.collection("communications").orderBy("createdAt", "desc").limit(50).get(),
    db.collection("users").get(),
  ]);
  const accounts = users.docs.map((document) => document.data() as BoardSignalAccount)
    .filter((account) => account.role === "player" && account.accessTier === "founding_beta");
  const conversations: Array<Record<string, unknown>> = [];
  for (const account of accounts) {
    const threads = await db.collection("users").doc(account.uid).collection("conversations").orderBy("updatedAt", "desc").limit(20).get();
    threads.docs.forEach((thread) => conversations.push({
      ...thread.data(),
      username: account.chessCom.canonicalUsername,
    }));
  }
  conversations.sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
  return {
    campaigns: campaigns.docs.map((document) => document.data()),
    conversations: conversations.slice(0, 100),
    players: accounts.map((account) => ({ uid: account.uid, username: account.chessCom.canonicalUsername })),
  };
}

export async function founderConversation(uidInput: unknown, threadIdInput: unknown) {
  const uid = safeId(validateText(uidInput, "User ID", 700));
  const threadId = safeId(validateText(threadIdInput, "Thread ID", 700));
  const db = getAdminDb();
  const accountSnapshot = await db.collection("users").doc(uid).get();
  if (!accountSnapshot.exists) throw Object.assign(new Error("The player account was not found."), { status: 404 });
  const account = accountSnapshot.data() as BoardSignalAccount;
  const threadRef = db.collection("users").doc(uid).collection("conversations").doc(threadId);
  const thread = await threadRef.get();
  if (!thread.exists) throw Object.assign(new Error("The conversation was not found."), { status: 404 });
  const messages = await threadRef.collection("messages").orderBy("createdAt", "asc").limit(200).get();
  await threadRef.set({ unreadForFounder: false }, { merge: true });
  return {
    player: { uid, username: account.chessCom.canonicalUsername },
    thread: { id: thread.id, ...thread.data() },
    messages: messages.docs.map((document) => ({ id: document.id, ...document.data() })),
  };
}

export async function founderReply(uidInput: unknown, threadIdInput: unknown, bodyInput: unknown) {
  const uid = safeId(validateText(uidInput, "User ID", 700));
  const threadId = safeId(validateText(threadIdInput, "Thread ID", 700));
  const body = validateText(bodyInput, "Reply", 2000);
  const db = getAdminDb();
  const accountSnapshot = await db.collection("users").doc(uid).get();
  if (!accountSnapshot.exists) throw Object.assign(new Error("The player account was not found."), { status: 404 });
  const account = accountSnapshot.data() as BoardSignalAccount;
  const threadRef = db.collection("users").doc(uid).collection("conversations").doc(threadId);
  const thread = await threadRef.get();
  if (!thread.exists || thread.data()?.allowReply !== true) throw Object.assign(new Error("Replies are not enabled for this conversation."), { status: 403 });
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const message: BoardSignalConversationMessage = { id, userId: uid, threadId, body, senderType: "founder", createdAt, campaignId: thread.data()?.campaignId };
  await threadRef.collection("messages").doc(id).set(clean(message));
  await threadRef.set({ updatedAt: createdAt, unreadForFounder: false, lastSenderType: "founder" }, { merge: true });
  const inbox: BoardSignalInboxMessage = {
    id,
    userId: uid,
    type: "custom",
    title: String(thread.data()?.title ?? "Founder reply"),
    body,
    createdAt,
    senderType: "founder",
    campaignId: thread.data()?.campaignId,
    threadId,
    allowReply: true,
  };
  await db.collection("users").doc(uid).collection("inbox").doc(id).set(clean(inbox));
  const push = await sendPushToAccount(account, "custom", inbox.title, body, "/boardsignal/player-room");
  return { message, push };
}


export async function sendAutomatedPlayerMessage(
  account: BoardSignalAccount,
  message: Pick<BoardSignalInboxMessage, "type" | "title" | "body" | "link" | "actionLabel" | "allowReply">,
  eventKey: string,
  pushAllowed: boolean,
) {
  if (!preferenceAllowsMessage(account.notificationPreferences, message.type)) {
    return { sent: false, pushEligible: false, pushDelivered: 0, pushFailed: 0 };
  }
  const id = `auto_${createHash("sha256").update(eventKey).digest("hex").slice(0, 40)}`;
  const createdAt = new Date().toISOString();
  const inbox: BoardSignalInboxMessage = {
    id,
    userId: account.uid,
    ...message,
    createdAt,
    senderType: "system",
    allowReply: false,
  };
  await getAdminDb().collection("users").doc(account.uid).collection("inbox").doc(id).set(clean(inbox), { merge: false });
  const push = pushAllowed
    ? await sendPushToAccount(account, message.type, message.title, message.body, message.link)
    : { eligible: false, delivered: 0, failed: 0 };
  return {
    sent: true,
    pushEligible: push.eligible,
    pushDelivered: push.delivered,
    pushFailed: push.failed,
  };
}


export async function sendRelationshipNotification(
  account: BoardSignalAccount,
  input: { id: string; type: "friend_request" | "friend_accepted"; title: string; body: string; link: string; actionLabel: string },
) {
  const message: BoardSignalInboxMessage = {
    id: input.id,
    userId: account.uid,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    actionLabel: input.actionLabel,
    createdAt: new Date().toISOString(),
    senderType: "system",
    allowReply: false,
  };
  await getAdminDb().collection("users").doc(account.uid).collection("inbox").doc(input.id).set(clean(message), { merge: true });
  const push = account.notificationPreferences?.browserPush
    ? await sendPushToAccount(account, input.type, input.title, input.body, input.link)
    : { eligible: false, delivered: 0, failed: 0 };
  return { message, push };
}
