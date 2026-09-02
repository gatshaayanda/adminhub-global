import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requirePlayerToken } from "@/lib/boardsignal/server/persistence";
import { getAdminDb } from "@/utils/firebaseAdmin";
import {
  createPipelineGuestToken,
  FeaturePipelineError,
  getPublicFeaturePipelineState,
  hashPipelineIdentity,
  recordFeaturePipelineFeedback,
} from "@/lib/boardsignal/server/featurePipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const GUEST_COOKIE = "boardsignal_pipeline_guest";
const FEEDBACK_COLLECTION = "featurePipelineFeedback";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow" } });
}

function validGuestToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32,100}$/.test(value);
}

function personalFeedbackId(identityKeyHash: string, itemId: string) {
  return createHash("sha256").update(`pipeline:v1:${identityKeyHash}:${itemId}`).digest("hex");
}

type PersonalStoredFeedback = {
  itemId?: string;
  identityKind?: "guest" | "player";
  identityKeyHash?: string;
  playerUid?: string;
  displayName?: string;
  interested?: boolean;
  comment?: string;
  moderationStatus?: string;
};

async function readPersonalFeedback(identity: { kind: "guest" | "player"; keyHash: string; playerUid?: string }) {
  const state = await getPublicFeaturePipelineState();
  const itemIds = state.items.filter((item) => item.visible).map((item) => item.id);
  const db = getAdminDb();
  const snapshots = await Promise.all(itemIds.map((itemId) => db.collection(FEEDBACK_COLLECTION).doc(personalFeedbackId(identity.keyHash, itemId)).get()));
  const feedback: Record<string, { interested: boolean; displayName: string; comment: string; moderationStatus: string | null }> = {};

  snapshots.forEach((snapshot, index) => {
    if (!snapshot.exists) return;
    const itemId = itemIds[index];
    const stored = snapshot.data() as PersonalStoredFeedback;
    if (stored.itemId !== itemId || stored.identityKind !== identity.kind || stored.identityKeyHash !== identity.keyHash) return;
    if (identity.kind === "player" && stored.playerUid !== identity.playerUid) return;
    const moderationStatus = stored.moderationStatus === "pending" || stored.moderationStatus === "approved" || stored.moderationStatus === "hidden" ? stored.moderationStatus : null;
    feedback[itemId] = {
      interested: Boolean(stored.interested),
      displayName: typeof stored.displayName === "string" ? stored.displayName : "",
      comment: typeof stored.comment === "string" ? stored.comment : "",
      moderationStatus,
    };
  });

  return feedback;
}

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const token = /^Bearer\s+/i.test(authorization) ? await requirePlayerToken(request) : undefined;
    const jar = await cookies();
    const guestToken = jar.get(GUEST_COOKIE)?.value;
    if (!token && !validGuestToken(guestToken)) return json({ ok: true, feedback: {} });
    const identity = token
      ? { kind: "player" as const, playerUid: token.uid, keyHash: hashPipelineIdentity(`player:${token.uid}`) }
      : { kind: "guest" as const, keyHash: hashPipelineIdentity(`guest:${guestToken}`) };
    return json({ ok: true, feedback: await readPersonalFeedback(identity) });
  } catch (error) {
    if (error instanceof FeaturePipelineError) return json({ ok: false, code: error.code, error: error.message }, error.status);
    return json({ ok: false, code: "PIPELINE_FEEDBACK_READ_FAILED", error: error instanceof Error ? error.message : "Your saved Pipeline input could not be loaded." }, Number((error as { status?: number }).status ?? 500));
  }
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const token = /^Bearer\s+/i.test(authorization) ? await requirePlayerToken(request) : undefined;
    const jar = await cookies();
    let guestToken = jar.get(GUEST_COOKIE)?.value;
    if (!token && !validGuestToken(guestToken)) guestToken = createPipelineGuestToken();
    const identity = token
      ? { kind: "player" as const, playerUid: token.uid, keyHash: hashPipelineIdentity(`player:${token.uid}`) }
      : { kind: "guest" as const, keyHash: hashPipelineIdentity(`guest:${guestToken}`) };
    const result = await recordFeaturePipelineFeedback(identity, await request.json().catch(() => ({})));
    const response = json({ ok: true, changed: result.changed, state: result.state, feedback: result.feedback });
    if (!token && guestToken && jar.get(GUEST_COOKIE)?.value !== guestToken) {
      response.cookies.set(GUEST_COOKIE, guestToken, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
    return response;
  } catch (error) {
    if (error instanceof FeaturePipelineError) return json({ ok: false, code: error.code, error: error.message }, error.status);
    return json({ ok: false, code: "PIPELINE_FEEDBACK_FAILED", error: error instanceof Error ? error.message : "Pipeline feedback could not be saved." }, Number((error as { status?: number }).status ?? 500));
  }
}
