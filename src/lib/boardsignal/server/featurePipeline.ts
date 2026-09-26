import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getAdminDb } from "@/utils/firebaseAdmin";
import { logFirestoreReadBudget } from "./firestoreService";
import {
  cleanPipelineSlug,
  cleanPipelineText,
  featurePipelineCounts,
  isFeaturePipelineStatus,
  seedFeaturePipelineState,
  type FeaturePipelineItem,
  type FeaturePipelineModerationStatus,
  type PublicFeaturePipelineComment,
  type PublicFeaturePipelineState,
} from "@/lib/boardsignal/featurePipeline";

const STATE_COLLECTION = "publicFeaturePipelineState";
const STATE_DOCUMENT = "current";
const FEEDBACK_COLLECTION = "featurePipelineFeedback";
const COMMENT_COLLECTION = "publicFeaturePipelineComments";
const MAX_PUBLIC_COMMENTS = 20;
const MUTATION_COOLDOWN_MS = 1500;

export class FeaturePipelineError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status = 400) { super(message); this.name = "FeaturePipelineError"; this.code = code; this.status = status; }
}

function clean<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function nowIso() { return new Date().toISOString(); }

function validatedText(value: unknown, maxLength: number, required = false) {
  try { return cleanPipelineText(value, maxLength, required); }
  catch (error) { throw new FeaturePipelineError("PIPELINE_INVALID_INPUT", error instanceof Error ? error.message : "That Pipeline input is invalid.", 400); }
}

function validatedSlug(value: unknown) {
  try { return cleanPipelineSlug(value); }
  catch (error) { throw new FeaturePipelineError("PIPELINE_INVALID_INPUT", error instanceof Error ? error.message : "That Pipeline slug is invalid.", 400); }
}
function stateRef() { return getAdminDb().collection(STATE_COLLECTION).doc(STATE_DOCUMENT); }
function commentsRef(itemId: string) { return getAdminDb().collection(COMMENT_COLLECTION).doc(itemId); }
function stableFeedbackId(identityKeyHash: string, itemId: string) { return createHash("sha256").update(`pipeline:v1:${identityKeyHash}:${itemId}`).digest("hex"); }
export function hashPipelineIdentity(value: string) { return createHash("sha256").update(`boardsignal-pipeline:v1:${value}`).digest("hex"); }
export function createPipelineGuestToken() { return randomBytes(32).toString("base64url"); }

function validState(value: unknown): value is PublicFeaturePipelineState {
  const state = value as PublicFeaturePipelineState | undefined;
  return state?.schemaVersion === 1 && Array.isArray(state.items) && Boolean(state.counts);
}

function publicState(state: PublicFeaturePipelineState): PublicFeaturePipelineState {
  const items = state.items.filter((item) => item.visible).map((item) => ({ ...item }));
  return { ...state, items, counts: featurePipelineCounts(items) };
}

function materializedSeedState(at = nowIso()): PublicFeaturePipelineState {
  const seed = seedFeaturePipelineState();
  const items = seed.items.map((item) => ({ ...item, createdAt: at, updatedAt: at, statusUpdatedAt: at }));
  return { ...seed, initializedAt: at, updatedAt: at, items, counts: featurePipelineCounts(items) };
}

export async function getPublicFeaturePipelineState() {
  const started = Date.now();
  try {
    const snapshot = await stateRef().get();
    if (snapshot.exists && validState(snapshot.data())) {
      const state = publicState(snapshot.data() as PublicFeaturePipelineState);
      logFirestoreReadBudget({ operation: "feature_pipeline_public", durationMs: Date.now() - started, materialized: "hit", resultSize: state.items.length, approxDocumentReads: 1 });
      return state;
    }
    logFirestoreReadBudget({ operation: "feature_pipeline_public", durationMs: Date.now() - started, materialized: "miss", resultSize: 6, approxDocumentReads: 1 });
  } catch { logFirestoreReadBudget({ operation: "feature_pipeline_public", durationMs: Date.now() - started, materialized: "miss", resultSize: 6, approxDocumentReads: 0 }); }
  return publicState(seedFeaturePipelineState());
}

export async function initializeFeaturePipelineIfMissing() {
  const ref = stateRef();
  const existing = await ref.get();
  if (existing.exists && validState(existing.data())) return { state: existing.data() as PublicFeaturePipelineState, initialized: false };
  const state = materializedSeedState();
  await ref.create(clean(state)).catch(async (error: unknown) => {
    const latest = await ref.get();
    if (!latest.exists) throw error;
  });
  const final = await ref.get();
  return { state: (final.data() as PublicFeaturePipelineState | undefined) ?? state, initialized: true };
}

function normalizeAdminItem(input: unknown, existing?: FeaturePipelineItem): FeaturePipelineItem {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const id = existing?.id ?? validatedText(body.id, 100, true);
  if (!/^[A-Z0-9][A-Z0-9-]{2,99}$/i.test(id)) throw new FeaturePipelineError("PIPELINE_INVALID_ID", "Use a stable item ID with letters, numbers and hyphens.");
  const status = body.status ?? existing?.status ?? "exploring";
  if (!isFeaturePipelineStatus(status)) throw new FeaturePipelineError("PIPELINE_INVALID_STATUS", "Choose a supported Pipeline status.");
  const at = nowIso();
  const priorStatus = existing?.status;
  return {
    id,
    slug: validatedSlug(body.slug ?? existing?.slug),
    title: validatedText(body.title ?? existing?.title, 120, true),
    summary: validatedText(body.summary ?? existing?.summary, 500, true),
    detail: validatedText(body.detail ?? existing?.detail, 1800) || undefined,
    status,
    category: validatedText(body.category ?? existing?.category, 60, true),
    publicQuestion: validatedText(body.publicQuestion ?? existing?.publicQuestion, 240) || undefined,
    order: Number.isFinite(Number(body.order ?? existing?.order)) ? Math.max(0, Math.min(9999, Math.trunc(Number(body.order ?? existing?.order)))) : 100,
    visible: typeof body.visible === "boolean" ? body.visible : existing?.visible ?? true,
    createdAt: existing?.createdAt ?? at,
    updatedAt: at,
    statusUpdatedAt: priorStatus && priorStatus === status ? existing?.statusUpdatedAt ?? at : at,
    releasedAt: status === "released" ? (existing?.releasedAt ?? at) : undefined,
    releaseNote: validatedText(body.releaseNote ?? existing?.releaseNote, 800) || undefined,
    interestCount: existing?.interestCount ?? 0,
    feedbackCount: existing?.feedbackCount ?? 0,
  };
}

async function nextFounderState(input: unknown) {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const action = body.action;
  const db = getAdminDb();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(stateRef());
    const state = snapshot.exists && validState(snapshot.data()) ? snapshot.data() as PublicFeaturePipelineState : materializedSeedState();
    let items = state.items;
    if (action === "create") {
      const item = normalizeAdminItem(body.item);
      if (items.some((candidate) => candidate.id === item.id || candidate.slug === item.slug)) throw new FeaturePipelineError("PIPELINE_ITEM_EXISTS", "That Pipeline ID or slug already exists.", 409);
      items = [...items, item];
    } else if (action === "update") {
      const id = validatedText(body.id, 100, true);
      const existing = items.find((candidate) => candidate.id === id);
      if (!existing) throw new FeaturePipelineError("PIPELINE_ITEM_NOT_FOUND", "That Pipeline item was not found.", 404);
      const item = normalizeAdminItem(body.item, existing);
      if (items.some((candidate) => candidate.id !== id && candidate.slug === item.slug)) throw new FeaturePipelineError("PIPELINE_SLUG_EXISTS", "That Pipeline slug is already in use.", 409);
      items = items.map((candidate) => candidate.id === id ? item : candidate);
    } else {
      throw new FeaturePipelineError("PIPELINE_UNKNOWN_ACTION", "That Pipeline action is not supported.");
    }
    const updatedAt = nowIso();
    const next: PublicFeaturePipelineState = { schemaVersion: 1, initializedAt: state.initializedAt || updatedAt, updatedAt, items: items.sort((a,b) => a.order-b.order), counts: featurePipelineCounts(items) };
    transaction.set(stateRef(), clean(next), { merge: false });
    return next;
  });
}

export async function listFounderFeaturePipeline() {
  const { state } = await initializeFeaturePipelineIfMissing();
  const feedback = await getAdminDb().collection(FEEDBACK_COLLECTION).orderBy("updatedAt", "desc").limit(300).get();
  const records = feedback.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { state, feedback: records };
}

export async function mutateFounderFeaturePipeline(input: unknown) {
  return nextFounderState(input);
}

type PipelineFeedbackIdentity = { kind: "guest"; keyHash: string } | { kind: "player"; keyHash: string; playerUid: string; safeDisplayName?: string };

type StoredFeedback = {
  itemId: string;
  identityKind: "guest" | "player";
  identityKeyHash: string;
  playerUid?: string;
  displayName?: string;
  interested: boolean;
  comment?: string;
  moderationStatus?: FeaturePipelineModerationStatus;
  createdAt: string;
  updatedAt: string;
};

export async function recordFeaturePipelineFeedback(identity: PipelineFeedbackIdentity, input: unknown) {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  if (validatedText(body.website, 200)) throw new FeaturePipelineError("PIPELINE_SPAM_REJECTED", "That submission could not be accepted.", 400);
  const itemId = validatedText(body.itemId, 100, true);
  const toggleInterest = body.toggleInterest === true;
  const hasInterest = typeof body.interested === "boolean";
  const hasComment = Object.prototype.hasOwnProperty.call(body, "comment");
  const requestedComment = hasComment ? validatedText(body.comment, 800) : undefined;
  const suppliedName = validatedText(body.displayName, 60);
  const db = getAdminDb();
  const feedbackRef = db.collection(FEEDBACK_COLLECTION).doc(stableFeedbackId(identity.keyHash, itemId));
  const result = await db.runTransaction(async (transaction) => {
    const stateSnapshot = await transaction.get(stateRef());
    const state = stateSnapshot.exists && validState(stateSnapshot.data()) ? stateSnapshot.data() as PublicFeaturePipelineState : materializedSeedState();
    const itemIndex = state.items.findIndex((item) => item.id === itemId && item.visible);
    if (itemIndex < 0) throw new FeaturePipelineError("PIPELINE_ITEM_NOT_FOUND", "That public Pipeline item is not available.", 404);
    const existingSnapshot = await transaction.get(feedbackRef);
    const existing = existingSnapshot.exists ? existingSnapshot.data() as StoredFeedback : undefined;
    if (existing && existing.identityKeyHash !== identity.keyHash) throw new FeaturePipelineError("PIPELINE_IDENTITY_CONFLICT", "That feedback identity could not be verified.", 409);
    const interested = toggleInterest ? !(existing?.interested ?? false) : hasInterest ? Boolean(body.interested) : (existing?.interested ?? false);
    const comment = hasComment ? requestedComment ?? "" : (existing?.comment ?? "");
    const displayName = identity.kind === "player"
      ? (identity.safeDisplayName || suppliedName || existing?.displayName || "BoardSignal player")
      : (suppliedName || existing?.displayName || "Guest");
    const same = existing?.interested === interested && (existing?.comment ?? "") === comment && (existing?.displayName ?? "") === displayName;
    if (same) return { state, feedback: existing, changed: false };
    const previousMs = existing?.updatedAt ? Date.parse(existing.updatedAt) : 0;
    if (previousMs && Date.now() - previousMs < MUTATION_COOLDOWN_MS) throw new FeaturePipelineError("PIPELINE_RATE_LIMIT", "Give that update a moment, then try again.", 429);
    const at = nowIso();
    const commentChanged = (existing?.comment ?? "") !== comment;
    const nextFeedback: StoredFeedback = {
      itemId,
      identityKind: identity.kind,
      identityKeyHash: identity.keyHash,
      ...(identity.kind === "player" ? { playerUid: identity.playerUid } : {}),
      displayName,
      interested,
      ...(comment ? { comment } : {}),
      ...(comment ? { moderationStatus: commentChanged ? "pending" as const : existing?.moderationStatus ?? "pending" as const } : {}),
      createdAt: existing?.createdAt ?? at,
      updatedAt: at,
    };
    const items = state.items.map((item, index) => index !== itemIndex ? item : {
      ...item,
      interestCount: Math.max(0, item.interestCount + (interested ? 1 : 0) - (existing?.interested ? 1 : 0)),
      feedbackCount: item.feedbackCount + (existing ? 0 : 1),
      updatedAt: at,
    });
    const nextState: PublicFeaturePipelineState = { ...state, updatedAt: at, items, counts: featurePipelineCounts(items) };
    transaction.set(feedbackRef, clean(nextFeedback), { merge: false });
    transaction.set(stateRef(), clean(nextState), { merge: false });
    return { state: nextState, feedback: nextFeedback, changed: true, refreshProjection: commentChanged && existing?.moderationStatus === "approved" };
  });
  if (result.changed && result.refreshProjection) await rebuildPublicCommentProjection(itemId);
  return {
    changed: result.changed,
    state: publicState(result.state),
    feedback: {
      interested: Boolean(result.feedback?.interested),
      moderationStatus: result.feedback?.moderationStatus ?? null,
    },
  };
}

async function rebuildPublicCommentProjection(itemId: string) {
  const snapshot = await getAdminDb().collection(FEEDBACK_COLLECTION).where("itemId", "==", itemId).limit(100).get();
  const comments: PublicFeaturePipelineComment[] = snapshot.docs
    .filter((doc) => (doc.data() as StoredFeedback).moderationStatus === "approved")
    .sort((a, b) => String(b.data().updatedAt ?? "").localeCompare(String(a.data().updatedAt ?? "")))
    .slice(0, MAX_PUBLIC_COMMENTS)
    .map((doc) => {
      const data = doc.data() as StoredFeedback;
      return { id: doc.id, displayName: data.displayName || "BoardSignal player", body: data.comment || "", itemId, createdAt: data.createdAt };
    }).filter((comment) => Boolean(comment.body));
  await commentsRef(itemId).set({ schemaVersion: 1, itemId, updatedAt: nowIso(), comments: clean(comments) }, { merge: false });
  return comments;
}

export async function getPublicFeaturePipelineComments(itemId: string) {
  const id = validatedText(itemId, 100, true);
  try {
    const snapshot = await commentsRef(id).get();
    const comments = snapshot.data()?.comments;
    return Array.isArray(comments) ? comments as PublicFeaturePipelineComment[] : [];
  } catch { return []; }
}

export async function moderateFeaturePipelineFeedback(input: unknown) {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const feedbackId = validatedText(body.feedbackId, 100, true);
  const action = body.action;
  const ref = getAdminDb().collection(FEEDBACK_COLLECTION).doc(feedbackId);
  const existing = await ref.get();
  if (!existing.exists) throw new FeaturePipelineError("PIPELINE_FEEDBACK_NOT_FOUND", "That feedback record was not found.", 404);
  const itemId = validatedText(existing.data()?.itemId, 100, true);
  if (action === "delete") {
    const data = existing.data() as StoredFeedback;
    const next: StoredFeedback = { ...data, updatedAt: nowIso() };
    delete next.comment;
    delete next.moderationStatus;
    await ref.set(clean(next), { merge: false });
  } else if (action === "approve" || action === "hide") await ref.set({ moderationStatus: action === "approve" ? "approved" : "hidden", moderatedAt: nowIso(), updatedAt: nowIso() }, { merge: true });
  else throw new FeaturePipelineError("PIPELINE_MODERATION_UNKNOWN", "That moderation action is not supported.");
  await rebuildPublicCommentProjection(itemId);
  return { ok: true };
}

export async function removePlayerFeaturePipelineFeedback(playerUid: string) {
  const db = getAdminDb();
  let deleted = 0;
  const removedByItem = new Map<string, { feedback: number; interested: number }>();
  while (true) {
    const page = await db.collection(FEEDBACK_COLLECTION).where("playerUid", "==", playerUid).limit(100).get();
    if (page.empty) break;
    const batch = db.batch();
    for (const document of page.docs) {
      const data = document.data() as StoredFeedback;
      const itemId = String(data.itemId ?? "");
      if (itemId) {
        const counts = removedByItem.get(itemId) ?? { feedback: 0, interested: 0 };
        counts.feedback += 1;
        counts.interested += data.interested ? 1 : 0;
        removedByItem.set(itemId, counts);
      }
      batch.delete(document.ref);
      deleted += 1;
    }
    await batch.commit();
  }
  if (deleted) {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(stateRef());
      if (!snapshot.exists || !validState(snapshot.data())) return;
      const state = snapshot.data() as PublicFeaturePipelineState;
      const at = nowIso();
      const items = state.items.map((item) => {
        const removed = removedByItem.get(item.id);
        if (!removed) return item;
        return { ...item, interestCount: Math.max(0, item.interestCount - removed.interested), feedbackCount: Math.max(0, item.feedbackCount - removed.feedback), updatedAt: at };
      });
      transaction.set(stateRef(), clean({ ...state, updatedAt: at, items, counts: featurePipelineCounts(items) }), { merge: false });
    });
    for (const itemId of removedByItem.keys()) await rebuildPublicCommentProjection(itemId);
  }
  return deleted;
}
