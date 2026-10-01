import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import {
  BUILD_UPDATES_COLLECTION,
  slugify,
  serializeBuildUpdate,
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

function cleanBoolean(value: unknown) {
  return value === true;
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

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await adminDb.collection(BUILD_UPDATES_COLLECTION).get();
    const updates = snapshot.docs
      .map((doc) => serializeBuildUpdate(doc.id, doc.data()))
      .sort(
        (a, b) =>
          new Date(b.publishedAt || b.createdAt || 0).getTime() -
          new Date(a.publishedAt || a.createdAt || 0).getTime()
      );

    return NextResponse.json({ updates });
  } catch (error) {
    console.error("Failed to load Admin Hub Build Log:", error);
    return NextResponse.json({ error: "Failed to load updates." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = cleanText(body.title, 140);
    const summary = cleanText(body.summary, 320);
    const fullBody = cleanText(body.body, 12000);

    if (!title || !summary || !fullBody) {
      return NextResponse.json(
        { error: "Title, summary and full update are required." },
        { status: 400 }
      );
    }

    const requestedSlug = slugify(cleanText(body.slug, 100));
    const baseSlug = requestedSlug || slugify(title);

    if (!baseSlug) {
      return NextResponse.json({ error: "A usable slug is required." }, { status: 400 });
    }

    const ref = adminDb.collection(BUILD_UPDATES_COLLECTION).doc(baseSlug);
    const existing = await ref.get();

    if (existing.exists) {
      return NextResponse.json(
        { error: "That slug already exists. Choose a different slug." },
        { status: 409 }
      );
    }

    const published = cleanBoolean(body.published);
    const now = Timestamp.now();

    await ref.set({
      slug: baseSlug,
      title,
      summary,
      body: fullBody,
      status: cleanStatus(body.status),
      category: cleanCategory(body.category),
      published,
      archived: false,
      publishedAt: published ? now : null,
      createdAt: now,
      updatedAt: now,
      viewCount: 0,
    });

    const created = await ref.get();
    return NextResponse.json(
      { update: serializeBuildUpdate(created.id, created.data() || {}) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create Admin Hub Build Log update:", error);
    return NextResponse.json({ error: "Failed to create update." }, { status: 500 });
  }
}
