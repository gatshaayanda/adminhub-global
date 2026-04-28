"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileImage,
  Home,
  ImagePlus,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";
import { uploadFiles } from "@/utils/uploadthing";

type Highlight = {
  id?: string;
  title: string;
  desc: string;
  imageUrl: string;
  order: number;
  showOnHome: boolean;
  isHero: boolean;
  admin_id: string;
};

type EditableHighlight = Highlight & {
  imageFile?: File | null;
  previewUrl?: string;
  saving?: boolean;
};

type UploadThingResult = {
  url?: string;
  ufsUrl?: string;
  appUrl?: string;
  name?: string;
  type?: string;
};

const COLLECTION_PATH = "highlights";
const FALLBACK_IMAGE = "/placeholder.png";

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanNumber(value: unknown, fallback = 999) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getUploadUrl(uploaded?: UploadThingResult) {
  return uploaded?.url || uploaded?.ufsUrl || uploaded?.appUrl || "";
}

async function uploadFileWithTimeout(file: File, timeoutMs = 30000) {
  let timeoutId: number | undefined;

  const uploadPromise = uploadFiles("fileUploader" as any, {
    files: [file],
  }) as Promise<UploadThingResult[]>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          "Image upload timed out. Check UploadThing setup or try a smaller image."
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([uploadPromise, timeoutPromise]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

function normalizeHighlight(
  id: string,
  data: Record<string, unknown>
): EditableHighlight {
  return {
    id,
    title: cleanString(data.title, "Untitled Highlight"),
    desc: cleanString(data.desc, ""),
    imageUrl: cleanString(data.imageUrl, FALLBACK_IMAGE),
    order: cleanNumber(data.order),
    showOnHome: data.showOnHome === true,
    isHero: data.isHero === true,
    admin_id: "admin",
    imageFile: null,
    previewUrl: "",
    saving: false,
  };
}

function toFirestorePayload(
  item: EditableHighlight,
  imageUrl: string
): Highlight {
  return {
    title: cleanString(item.title, "Untitled Highlight"),
    desc: cleanString(item.desc, ""),
    imageUrl: cleanString(imageUrl, FALLBACK_IMAGE),
    order: cleanNumber(item.order),
    showOnHome: item.showOnHome === true,
    isHero: item.isHero === true,
    admin_id: "admin",
  };
}

export default function HighlightsAdminPage() {
  const [items, setItems] = useState<EditableHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [newImage, setNewImage] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState("");

  const loadHighlights = async () => {
    setLoading(true);
    setRefreshing(true);
    setLoadError("");

    try {
      const snapshot = await getDocs(collection(firestore, COLLECTION_PATH));

      const data = snapshot.docs
        .map((docSnap) =>
          normalizeHighlight(
            docSnap.id,
            docSnap.data() as Record<string, unknown>
          )
        )
        .sort((a, b) => a.order - b.order);

      setItems(data);
    } catch (err) {
      console.error("Error fetching AdminHub highlights:", err);
      setItems([]);
      setLoadError("Could not load homepage highlights. Please refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHighlights();

    return () => {
      if (newPreview) URL.revokeObjectURL(newPreview);

      items.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewImage = (file: File | null) => {
    if (newPreview) URL.revokeObjectURL(newPreview);

    setNewImage(file);
    setNewPreview(file ? URL.createObjectURL(file) : "");
  };

  const handleAddHighlight = async () => {
    setAdding(true);

    try {
      let imageUrl = FALLBACK_IMAGE;

      if (newImage) {
        const uploaded = await uploadFileWithTimeout(newImage);
        const firstUpload = uploaded?.[0] as UploadThingResult | undefined;

        imageUrl = getUploadUrl(firstUpload);

        if (!imageUrl) {
          console.log("UploadThing response:", uploaded);
          throw new Error("Upload completed, but no image URL was returned.");
        }
      }

      const order =
        items.length > 0
          ? Math.max(...items.map((item) => cleanNumber(item.order))) + 1
          : 1;

      const payload: Highlight = {
        title: "New AdminHub Highlight",
        desc: "Add a homepage update, proof-stage message, platform highlight, partner notice, or managed support reminder.",
        imageUrl,
        order,
        showOnHome: false,
        isHero: false,
        admin_id: "admin",
      };

      const newDoc = await addDoc(
        collection(firestore, COLLECTION_PATH),
        payload
      );

      setItems((prev) =>
        [
          ...prev,
          {
            id: newDoc.id,
            ...payload,
            imageFile: null,
            previewUrl: "",
            saving: false,
          },
        ].sort((a, b) => a.order - b.order)
      );

      handleNewImage(null);
    } catch (err: any) {
      console.error("Failed to add AdminHub highlight:", err);
      window.alert(err?.message || "Failed to add highlight.");
    } finally {
      setAdding(false);
    }
  };

  const updateLocalItem = (
    id: string,
    field: keyof EditableHighlight,
    value: string | number | boolean | File | null
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (field === "imageFile") {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);

          const file = value instanceof File ? value : null;

          return {
            ...item,
            imageFile: file,
            previewUrl: file ? URL.createObjectURL(file) : "",
          };
        }

        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  const setItemSaving = (id: string, saving: boolean) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, saving } : item))
    );
  };

  const handleSaveItem = async (item: EditableHighlight) => {
    if (!item.id) return;

    if (!item.title.trim()) {
      window.alert("Highlight title is required.");
      return;
    }

    setItemSaving(item.id, true);

    try {
      let imageUrl = item.imageUrl || FALLBACK_IMAGE;

      if (item.imageFile) {
        const uploaded = await uploadFileWithTimeout(item.imageFile);
        const firstUpload = uploaded?.[0] as UploadThingResult | undefined;

        imageUrl = getUploadUrl(firstUpload);

        if (!imageUrl) {
          console.log("UploadThing response:", uploaded);
          throw new Error("Upload completed, but no image URL was returned.");
        }
      }

      const payload = toFirestorePayload(item, imageUrl);

      await updateDoc(doc(firestore, COLLECTION_PATH, item.id), payload);

      if (payload.isHero) {
        const otherHeroItems = items.filter(
          (other) => other.id && other.id !== item.id && other.isHero
        );

        await Promise.all(
          otherHeroItems.map((other) => {
            const otherPayload = toFirestorePayload(
              {
                ...other,
                isHero: false,
              },
              other.imageUrl || FALLBACK_IMAGE
            );

            return updateDoc(
              doc(firestore, COLLECTION_PATH, other.id!),
              otherPayload
            );
          })
        );
      }

      setItems((prev) =>
        prev
          .map((current) => {
            if (current.id === item.id) {
              if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);

              return {
                ...current,
                ...payload,
                imageFile: null,
                previewUrl: "",
                saving: false,
              };
            }

            if (payload.isHero) {
              return {
                ...current,
                isHero: false,
              };
            }

            return current;
          })
          .sort((a, b) => a.order - b.order)
      );
    } catch (err: any) {
      console.error("Save failed:", err);
      window.alert(err?.message || "Failed to save highlight.");
      setItemSaving(item.id, false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;

    const ok = window.confirm("Delete this AdminHub highlight?");
    if (!ok) return;

    try {
      await deleteDoc(doc(firestore, COLLECTION_PATH, id));

      setItems((prev) => {
        const found = prev.find((item) => item.id === id);
        if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);

        return prev.filter((item) => item.id !== id);
      });
    } catch (err: any) {
      console.error("Delete failed:", err);
      window.alert(err?.message || "Delete failed.");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="section-shell">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5">
              <Link
                href="/admin/dashboard"
                prefetch={false}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Link>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="card-elevated overflow-hidden">
                <div className="bg-[linear-gradient(180deg,rgba(15,23,42,0.98)_0%,rgba(6,10,18,0.98)_100%)] p-6 md:p-10">
                  <div className="eyebrow">
                    <Home size={15} />
                    AdminHub Global • Homepage Highlights
                  </div>

                  <h1 className="max-w-[13ch]">
                    Manage homepage proof, trust, and platform highlights.
                  </h1>

                  <p className="mt-4 max-w-[62ch] text-base leading-8 text-[var(--text-secondary)]">
                    Use highlights for the homepage hero image, platform updates,
                    proof-stage messaging, service package pushes, partner-facing
                    notices, and managed support reminders.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <button
                      disabled={adding}
                      onClick={handleAddHighlight}
                      className="btn btn-primary"
                      type="button"
                    >
                      {adding ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : newImage ? (
                        <UploadCloud size={18} />
                      ) : (
                        <ImagePlus size={18} />
                      )}
                      {adding
                        ? "Adding..."
                        : newImage
                          ? "Upload & Add Highlight"
                          : "Add Placeholder Highlight"}
                    </button>

                    <button
                      type="button"
                      onClick={loadHighlights}
                      disabled={refreshing}
                      className="btn btn-outline"
                    >
                      <RefreshCw
                        size={18}
                        className={refreshing ? "animate-spin" : ""}
                      />
                      {refreshing ? "Refreshing..." : "Refresh"}
                    </button>

                    <Link href="/" prefetch={false} className="btn btn-ghost">
                      <Eye size={18} />
                      View Homepage
                    </Link>
                  </div>
                </div>
              </div>

              <div className="card-outline-gold self-start">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <ShieldCheck size={15} />
                    What this controls
                  </div>

                  <h2 className="mt-2 text-2xl">Homepage content areas</h2>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                      <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                        <Star size={15} className="text-[var(--brand-primary)]" />
                        Hero area
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        The item marked <b>Set as Hero</b> supplies the main
                        homepage feature image and message area.
                      </p>
                    </div>

                    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                      <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                        <CheckCircle2
                          size={15}
                          className="text-[var(--brand-primary)]"
                        />
                        Updates grid
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        Items marked <b>Show on Home</b> appear in the homepage
                        updates and platform highlights grid.
                      </p>
                    </div>

                    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                      <p className="text-sm font-extrabold text-[var(--text-primary)]">
                        UploadThing images
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        Images are uploaded through UploadThing and saved as
                        Firestore URLs inside the <b>highlights</b> collection.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {loadError ? (
              <div className="mt-6 rounded-[1.25rem] border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm leading-7 text-red-200">
                {loadError}
              </div>
            ) : null}

            <section className="mt-8">
              <div className="card-outline-gold">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <FileImage size={15} />
                    Add new highlight image
                  </div>

                  <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="w-full lg:max-w-md">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleNewImage(e.target.files?.[0] || null)
                        }
                        className="input"
                        disabled={adding}
                      />

                      <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                        Select an image, then click <b>Upload & Add Highlight</b>.
                        You can also add a placeholder highlight first and
                        replace the image later.
                      </p>

                      {newImage ? (
                        <button
                          type="button"
                          onClick={() => handleNewImage(null)}
                          className="mt-3 inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                        >
                          <X size={14} />
                          Remove selected image
                        </button>
                      ) : null}
                    </div>

                    <div className="flex-1">
                      {newPreview ? (
                        <img
                          src={newPreview}
                          alt="New AdminHub highlight preview"
                          className="max-h-72 w-full rounded-[1.25rem] border border-[var(--border)] object-cover"
                        />
                      ) : (
                        <div className="flex min-h-[180px] items-center justify-center rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-muted)]">
                          Preview will appear here
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-8">
              {loading ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="card overflow-hidden">
                      <div className="h-52 loading-shimmer" />
                      <div className="card-inner">
                        <div className="h-5 w-2/3 rounded loading-shimmer" />
                        <div className="mt-3 h-4 w-full rounded loading-shimmer" />
                        <div className="mt-2 h-4 w-5/6 rounded loading-shimmer" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="frame-gold p-8 text-center">
                  <h3 className="text-2xl">No highlights yet</h3>

                  <p className="mx-auto mt-3 max-w-[54ch] text-sm leading-7 text-[var(--text-secondary)]">
                    Add your first highlight to start controlling the homepage
                    hero and AdminHub platform highlight cards.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="card-outline-gold overflow-hidden"
                    >
                      <div className="relative">
                        <img
                          src={item.previewUrl || item.imageUrl || FALLBACK_IMAGE}
                          alt={item.title || "AdminHub highlight"}
                          className="h-52 w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = FALLBACK_IMAGE;
                          }}
                        />

                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                          {item.isHero ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(77,163,255,0.42)] bg-[rgba(6,10,18,0.86)] px-2.5 py-1 text-xs font-bold text-[var(--brand-primary)] backdrop-blur-md">
                              <Star size={13} />
                              Hero
                            </span>
                          ) : null}

                          {item.showOnHome ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-green-400/30 bg-[rgba(6,10,18,0.86)] px-2.5 py-1 text-xs font-bold text-green-300 backdrop-blur-md">
                              <CheckCircle2 size={13} />
                              Home
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-[rgba(6,10,18,0.86)] px-2.5 py-1 text-xs font-bold text-amber-200 backdrop-blur-md">
                              <XCircle size={13} />
                              Hidden
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="card-inner flex flex-col gap-4 md:p-6">
                        <div>
                          <label className="text-sm font-semibold text-[var(--text-primary)]">
                            Title
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) =>
                              updateLocalItem(item.id!, "title", e.target.value)
                            }
                            className="input mt-2 font-semibold"
                            placeholder="Highlight title"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-[var(--text-primary)]">
                            Description
                          </label>
                          <textarea
                            value={item.desc}
                            onChange={(e) =>
                              updateLocalItem(item.id!, "desc", e.target.value)
                            }
                            className="input mt-2 min-h-[120px] resize-y rounded-[1.25rem]"
                            placeholder="Highlight description"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-[var(--text-primary)]">
                            Replace Image
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              updateLocalItem(
                                item.id!,
                                "imageFile",
                                e.target.files?.[0] || null
                              )
                            }
                            className="input mt-2"
                            disabled={!!item.saving}
                          />
                        </div>

                        <div className="grid gap-3">
                          <label className="flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                            <span>Show on Home</span>
                            <input
                              type="checkbox"
                              checked={item.showOnHome}
                              onChange={(e) =>
                                updateLocalItem(
                                  item.id!,
                                  "showOnHome",
                                  e.target.checked
                                )
                              }
                              disabled={!!item.saving}
                            />
                          </label>

                          <label className="flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                            <span>Set as Hero</span>
                            <input
                              type="checkbox"
                              checked={item.isHero}
                              onChange={(e) =>
                                updateLocalItem(
                                  item.id!,
                                  "isHero",
                                  e.target.checked
                                )
                              }
                              disabled={!!item.saving}
                            />
                          </label>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-[var(--text-primary)]">
                            Display Order
                          </label>
                          <input
                            type="number"
                            value={item.order}
                            onChange={(e) =>
                              updateLocalItem(
                                item.id!,
                                "order",
                                Number(e.target.value)
                              )
                            }
                            className="input mt-2 max-w-[140px]"
                            disabled={!!item.saving}
                          />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <button
                            onClick={() => handleSaveItem(item)}
                            disabled={!!item.saving}
                            className="btn btn-primary"
                            type="button"
                          >
                            {item.saving ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : item.imageFile ? (
                              <UploadCloud size={16} />
                            ) : (
                              <Save size={16} />
                            )}
                            {item.saving ? "Saving..." : "Save Changes"}
                          </button>

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="btn btn-ghost"
                            type="button"
                            disabled={!!item.saving}
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Admin note:</b> use
              highlights for AdminHub proof-stage messaging, featured visuals,
              platform credibility, partner updates, service package pushes, and
              managed support reminders.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}