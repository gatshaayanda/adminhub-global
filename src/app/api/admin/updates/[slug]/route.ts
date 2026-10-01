import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  BUILD_UPDATES_COLLECTION,
  serializeBuildUpdate,
  slugify,
  type BuildUpdateCategory,
  type BuildUpdateStatus,
} from "@/lib/buildUpdates";
import { adminDb } from "@/utils/firebaseAdmin";

export const dynamic = "force-dynamic";

const STATUSES: BuildUpdateStatus[] = [
  "exploring",
  "building",
  "testing",
  "live",
  "paused",
  "archived",
];

const CATEGORIES: BuildUpdateCategory[] = [
  "build",
  "release",
  "research",
  "client",
  "platform",
];

async function isAdmin() {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get("admin_token")?.value);
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanStatus(value: unknown): BuildUpdateStatus {
  return STATUSES.includes(value as BuildUpdateStatus)
    ? (value as BuildUpdateStatus)
    : "building";
}

function cleanCategory(value: unknown): BuildUpdateCategory {
  return CATEGORIES.includes(value as BuildUpdateCategory)
    ? (value as BuildUpdateCategory)
    : "build";
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  }

  try {
    const ref = adminDb.collection(BUILD_UPDATES_COLLECTION).doc(slug);
    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Update not found." }, { status: 404 });
    }

    const body = await request.json();
    const title = cleanText(body.title, 140);
    const summary = cleanText(body.summary, 320);
    const fullBody = cleanText(body.body, 12000);
    const published = body.published === true;
    const archived = body.archived === true;

    if (!title || !summary || !fullBody) {
      return NextResponse.json(
        { error: "Title, summary and full update are required." },
        { status: 400 }
      );
    }

    const previous = existing.data() || {};
    const update: Record<string, unknown> = {
      title,
      summary,
      body: fullBody,
      status: cleanStatus(body.status),
      category: cleanCategory(body.category),
      published,
      archived,
      updatedAt: Timestamp.now(),
    };

    if (published && !previous.published) {
      update.publishedAt = Timestamp.now();
    }

    if (!published) {
      update.publishedAt = null;
    }

    await ref.update(update);
    const saved = await ref.get();

    return NextResponse.json({
      update: serializeBuildUpdate(saved.id, saved.data() || {}),
    });
  } catch (error) {
    console.error("Failed to update Admin Hub Build Log entry:", error);
    return NextResponse.json({ error: "Failed to update entry." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  }

  try {
    const ref = adminDb.collection(BUILD_UPDATES_COLLECTION).doc(slug);
    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Update not found." }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete Admin Hub Build Log entry:", error);
    return NextResponse.json({ error: "Failed to delete entry." }, { status: 500 });
  }
}
