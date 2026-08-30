import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { refreshFounderPlayerSummaryByUid } from "@/lib/boardsignal/server/founderOperations";
import { getAdminDb } from "@/utils/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 250;
const headers = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex, nofollow" };

type GoogleAccessOrigin = "new_player_via_google" | "existing_player_linked_google";

type AccountData = {
  uid?: string;
  role?: string;
  accessStatus?: string;
  googleAccessConnectedAt?: string;
  googleAccessOrigin?: GoogleAccessOrigin;
  preferencesConfirmedAt?: string;
  contactConfirmedAt?: string;
  betaAgreementAcceptedAt?: string;
  chessComOAuthLinkedAt?: string;
  cadenceAnchor?: string;
  chessCom?: { playerId?: number; canonicalUsername?: string };
};

type AliasData = {
  provider?: string;
  uid?: string;
  playerId?: number;
  linkedAt?: string;
  lastUsedAt?: string;
};

type SummaryData = {
  uid?: string;
  active?: boolean;
  updatedAt?: string;
  row?: { latestReview?: { publishedAt?: string }; reviewCount?: number };
};

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

function parsed(value?: string) {
  if (!value) return undefined;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : undefined;
}

function validPlayerId(value: unknown) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

function inferOrigin(account: AccountData, summary: SummaryData | undefined, alias: AliasData): GoogleAccessOrigin {
  if (account.googleAccessOrigin === "new_player_via_google" || account.googleAccessOrigin === "existing_player_linked_google") {
    return account.googleAccessOrigin;
  }

  const linkedAt = alias.linkedAt ?? account.googleAccessConnectedAt;
  const linkedTime = parsed(linkedAt);
  if (linkedTime !== undefined) {
    const preLinkEvidence = [
      summary?.updatedAt,
      summary?.row?.latestReview?.publishedAt,
      account.betaAgreementAcceptedAt,
      account.chessComOAuthLinkedAt,
      account.cadenceAnchor,
    ]
      .map(parsed)
      .filter((value): value is number => value !== undefined)
      .some((value) => value < linkedTime - 1000);
    if (preLinkEvidence) return "existing_player_linked_google";
  }

  // Patch K new-Google onboarding stamped both of these at the exact claim time.
  // Existing-player CONNECT GOOGLE does not. This lets us repair the small
  // pre-provenance population without inventing a second player identity.
  if (linkedAt && account.preferencesConfirmedAt === linkedAt && account.contactConfirmedAt === linkedAt) {
    return "new_player_via_google";
  }

  return "existing_player_linked_google";
}

export async function GET() {
  try {
    const db = getAdminDb();
    const [accountsSnapshot, aliasesSnapshot, summariesSnapshot] = await Promise.all([
      db.collection("users").where("role", "==", "player").limit(MAX_ROWS + 1).get(),
      db.collection("playerIdentityAliases").where("provider", "==", "google_access").limit(MAX_ROWS + 1).get(),
      db.collection("founderPlayerSummaries").limit(MAX_ROWS + 1).get(),
    ]);

    const partial = accountsSnapshot.size > MAX_ROWS || aliasesSnapshot.size > MAX_ROWS || summariesSnapshot.size > MAX_ROWS;
    const accounts = accountsSnapshot.docs.slice(0, MAX_ROWS).map((document) => ({ id: document.id, data: document.data() as AccountData }));
    const aliases = aliasesSnapshot.docs.slice(0, MAX_ROWS).map((document) => document.data() as AliasData);
    const summaries = summariesSnapshot.docs.slice(0, MAX_ROWS).map((document) => document.data() as SummaryData);

    const accountByUid = new Map(accounts.map(({ id, data }) => [String(data.uid ?? id), { id, data }] as const));
    const summaryByUid = new Map(summaries.filter((item) => item.uid).map((item) => [String(item.uid), item] as const));
    const aliasByPlayerId = new Map<number, AliasData>();
    for (const alias of aliases) {
      const playerId = validPlayerId(alias.playerId);
      if (!playerId) continue;
      const current = aliasByPlayerId.get(playerId);
      if (!current || String(alias.linkedAt ?? "") > String(current.linkedAt ?? "")) aliasByPlayerId.set(playerId, alias);
    }

    // Canonical population: one stable Chess.com player ID, regardless of how
    // many auth/access records happen to exist around that player.
    const canonicalByPlayerId = new Map<number, { uid: string; account: AccountData }>();
    let unresolvedPlayerRecords = 0;
    for (const { id, data } of accounts) {
      const uid = String(data.uid ?? id);
      const playerId = validPlayerId(data.chessCom?.playerId);
      if (!playerId) {
        unresolvedPlayerRecords += 1;
        continue;
      }
      const current = canonicalByPlayerId.get(playerId);
      if (!current || (current.account.accessStatus !== "active" && data.accessStatus === "active")) {
        canonicalByPlayerId.set(playerId, { uid, account: data });
      }
    }

    const originRepairs: Array<Promise<unknown>> = [];
    const playerGoogle: Record<string, { origin?: GoogleAccessOrigin; linkedAt?: string; lastUsedAt?: string; returnedWithGoogle: boolean }> = {};
    let newViaGoogle = 0;
    let existingGoogleLinked = 0;
    let googleReturns = 0;

    for (const [playerId, canonical] of canonicalByPlayerId) {
      const alias = aliasByPlayerId.get(playerId);
      if (!alias) continue;
      const aliasAccount = alias.uid ? accountByUid.get(String(alias.uid))?.data : undefined;
      const account = aliasAccount ?? canonical.account;
      const summary = summaryByUid.get(String(alias.uid ?? canonical.uid));
      const origin = inferOrigin(account, summary, alias);
      const linkedAt = alias.linkedAt ?? account.googleAccessConnectedAt;
      const returnedWithGoogle = Boolean(
        parsed(alias.lastUsedAt) !== undefined
        && parsed(linkedAt) !== undefined
        && (parsed(alias.lastUsedAt) as number) > (parsed(linkedAt) as number) + 1000,
      );

      if (origin === "new_player_via_google") newViaGoogle += 1;
      else existingGoogleLinked += 1;
      if (returnedWithGoogle) googleReturns += 1;

      playerGoogle[String(playerId)] = { origin, linkedAt, lastUsedAt: alias.lastUsedAt, returnedWithGoogle };

      if (!account.googleAccessOrigin && alias.uid) {
        originRepairs.push(
          db.collection("users").doc(String(alias.uid)).set({ googleAccessOrigin: origin }, { merge: true }).catch(() => undefined),
        );
      }
    }

    await Promise.all(originRepairs);

    // Repair only genuinely missing Founder summaries. A summary that exists but
    // is inactive may be intentionally outside the active lifecycle and is left alone.
    let repairedSummaries = 0;
    for (const { uid, account } of canonicalByPlayerId.values()) {
      if (account.accessStatus !== "active" || summaryByUid.has(uid)) continue;
      try {
        await refreshFounderPlayerSummaryByUid(uid);
        repairedSummaries += 1;
      } catch {
        // Founder accounting repair must not affect player access.
      }
    }

    if (repairedSummaries > 0) revalidatePath("/");

    const aggregateSnapshot = await db.collection("founderOperationsState").doc("current").get();
    const aggregate = aggregateSnapshot.data() as { metrics?: { activePlayers?: number } } | undefined;
    const activePlayers = Math.max(0, Number(aggregate?.metrics?.activePlayers) || 0);
    const canonicalPlayers = canonicalByPlayerId.size;

    return response({
      ok: true,
      accounting: {
        generatedAt: new Date().toISOString(),
        partial,
        funnel: {
          activePlayers,
          canonicalPlayers,
          inactivePlayers: Math.max(0, canonicalPlayers - activePlayers),
          newViaGoogle,
          existingGoogleLinked,
          googleLinkedTotal: newViaGoogle + existingGoogleLinked,
          googleReturns,
          repairedSummaries,
          unresolvedPlayerRecords,
        },
        players: playerGoogle,
      },
    });
  } catch (error) {
    return response({ ok: false, error: error instanceof Error ? error.message : "Google player accounting could not be loaded." }, 500);
  }
}
