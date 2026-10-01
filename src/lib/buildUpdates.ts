import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/utils/firebaseAdmin";

export const BUILD_UPDATES_COLLECTION = "buildUpdates";

export type BuildUpdateStatus =
  | "exploring"
  | "building"
  | "testing"
  | "live"
  | "paused"
  | "archived";

export type BuildUpdateCategory =
  | "build"
  | "release"
  | "research"
  | "client"
  | "platform";

export type BuildUpdate = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  status: BuildUpdateStatus;
  category: BuildUpdateCategory;
  published: boolean;
  archived: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  viewCount: number;
};

function toIso(value: unknown) {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  return null;
}

export function serializeBuildUpdate(
  id: string,
  data: FirebaseFirestore.DocumentData
): BuildUpdate {
  return {
    id,
    slug: String(data.slug || id),
    title: String(data.title || ""),
    summary: String(data.summary || ""),
    body: String(data.body || ""),
    status: (data.status || "building") as BuildUpdateStatus,
    category: (data.category || "build") as BuildUpdateCategory,
    published: data.published === true,
    archived: data.archived === true,
    publishedAt: toIso(data.publishedAt),
    updatedAt: toIso(data.updatedAt),
    createdAt: toIso(data.createdAt),
    viewCount: Number.isFinite(Number(data.viewCount))
      ? Number(data.viewCount)
      : 0,
  };
}

export async function getPublishedBuildUpdates() {
  const snapshot = await adminDb
    .collection(BUILD_UPDATES_COLLECTION)
    .where("published", "==", true)
    .get();

  return snapshot.docs
    .map((doc) => serializeBuildUpdate(doc.id, doc.data()))
    .filter((update) => !update.archived)
    .sort(
      (a, b) =>
        new Date(b.publishedAt || b.createdAt || 0).getTime() -
        new Date(a.publishedAt || a.createdAt || 0).getTime()
    );
}

export async function getPublishedBuildUpdate(slug: string) {
  const snapshot = await adminDb
    .collection(BUILD_UPDATES_COLLECTION)
    .doc(slug)
    .get();

  if (!snapshot.exists) return null;

  const update = serializeBuildUpdate(snapshot.id, snapshot.data() || {});
  if (!update.published || update.archived) return null;

  return update;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
