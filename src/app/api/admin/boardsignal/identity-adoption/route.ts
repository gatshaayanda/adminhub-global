import { NextResponse } from "next/server";
import { getAdminDb } from "@/utils/firebaseAdmin";
import { classifyBoardSignalHttpError } from "@/lib/boardsignal/server/firestoreService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store, private",
  "X-Robots-Tag": "noindex, nofollow",
};

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

export async function GET() {
  try {
    const aliases = getAdminDb().collection("playerIdentityAliases");
    const [subjects, players] = await Promise.all([
      aliases.where("provider", "==", "google_access").count().get(),
      aliases.where("provider", "==", "google_access_player").count().get(),
    ]);

    const googleSubjectMappings = Math.max(0, Number(subjects.data().count) || 0);
    const googlePlayerMappings = Math.max(0, Number(players.data().count) || 0);
    const googleLinkedProfiles = Math.min(googleSubjectMappings, googlePlayerMappings);
    const mappingMismatch = Math.abs(googleSubjectMappings - googlePlayerMappings);

    return response({
      ok: true,
      adoption: {
        googleLinkedProfiles,
        googleSubjectMappings,
        googlePlayerMappings,
        mappingMismatch,
        mappingHealth: mappingMismatch === 0 ? "aligned" : "check_required",
        meaning: "A linked profile is a persisted Google return mapping paired to a Chess.com player mapping. It is not a count of Google sign-in attempts.",
      },
    });
  } catch (error) {
    const classified = classifyBoardSignalHttpError(error);
    return response({ ok: false, code: classified.code, error: classified.message }, classified.status);
  }
}
