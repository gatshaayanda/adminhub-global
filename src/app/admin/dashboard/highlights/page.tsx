"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
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
  isHero?: boolean;
  admin_id?: string;
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

type UpdateLocalItem = (
  id: string,
  field: keyof EditableHighlight,
  value: string | number | boolean | File | null
) => void;

const COLLECTION_PATH = "highlights";

function getUploadUrl(uploaded?: UploadThingResult) {
  return uploaded?.url || uploaded?.ufsUrl || uploaded?.appUrl || "";
}

function normalizeOrder(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 999;
}

function sortHighlights<T extends { order?: number; title?: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const orderDiff = normalizeOrder(a.order) - normalizeOrder(b.order);
    if (orderDiff !== 0) return orderDiff;

    return (a.title || "").localeCompare(b.title || "");
  });
}

export default function HighlightsAdminPage() {
  const [items, setItems] = useState<EditableHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [newImage, setNewImage] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState("");
  const [newImageInputKey, setNewImageInputKey] = useState(0);

  const previewUrlsRef = useRef<Set<string>>(new Set());

  const createPreviewUrl = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    previewUrlsRef.current.add(url);
    return url;
  }, []);

  const revokePreviewUrl = useCallback((url?: string) => {
    if (!url) return;

    URL.revokeObjectURL(url);
    previewUrlsRef.current.delete(url);
  }, []);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    };
  }, []);

  const loadHighlights = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setLoadError("");

    try {
      const snapshot = await getDocs(collection(firestore, COLLECTION_PATH));

      const data = snapshot.docs.map((docSnap) => {
        const raw = docSnap.data() as Partial<Highlight>;

        return {
          id: docSnap.id,
          title: raw.title || "Untitled Highlight",
          desc: raw.desc || "",
          imageUrl: raw.imageUrl || "",
          order: normalizeOrder(raw.order),
          showOnHome: !!raw.showOnHome,
          isHero: !!raw.isHero,
          admin_id: raw.admin_id || "admin",
          imageFile: null,
          previewUrl: "",
          saving: false,
        };
      });

      setItems(sortHighlights(data));
    } catch (error) {
      console.error("Error fetching AdminHub highlights:", error);
      setLoadError("Could not load homepage highlights. Please refresh and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHighlights("initial");
  }, [loadHighlights]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      shownOnHome: items.filter((item) => item.showOnHome).length,
      hero: items.filter((item) => item.isHero).length,
    };
  }, [items]);

  const handleNewImage = useCallback(
    (file: File | null) => {
      setNewPreview((currentPreview) => {
        revokePreviewUrl(currentPreview);
        return file ? createPreviewUrl(file) : "";
      });

      setNewImage(file);

      if (!file) {
        setNewImageInputKey((prev) => prev + 1);
      }
    },
    [createPreviewUrl, revokePreviewUrl]
  );

  const updateLocalItem = useCallback<UpdateLocalItem>(
    (id, field, value) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;

          if (field === "imageFile") {
            revokePreviewUrl(item.previewUrl);

            const file = value instanceof File ? value : null;

            return {
              ...item,
              imageFile: file,
              previewUrl: file ? createPreviewUrl(file) : "",
            };
          }

          return {
            ...item,
            [field]: value,
          } as EditableHighlight;
        })
      );
    },
    [createPreviewUrl, revokePreviewUrl]
  );

  const setItemSaving = useCallback((id: string, saving: boolean) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, saving } : item))
    );
  }, []);

  const handleAddHighlight = useCallback(async () => {
    if (!newImage) {
      window.alert("Please select an image first.");
      return;
    }

    setAdding(true);

    try {
      const uploaded = await uploadFiles("fileUploader" as any, {
        files: [newImage],
      });

      const imageUrl = getUploadUrl(uploaded?.[0] as UploadThingResult | undefined);

      if (!imageUrl) {
        console.log("UploadThing response:", uploaded);
        throw new Error("Upload completed but no image URL was returned.");
      }

      const order =
        items.length > 0
          ? Math.max(...items.map((item) => normalizeOrder(item.order))) + 1
          : 1;

      const payload = {
        title: "New AdminHub Highlight",
        desc: "Add a clear homepage update, proof-stage message, platform highlight, or support note.",
        imageUrl,
        order,
        showOnHome: false,
        isHero: false,
        admin_id: "admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const newDoc = await addDoc(collection(firestore, COLLECTION_PATH), payload);

      setItems((prev) =>
        sortHighlights([
          ...prev,
          {
            id: newDoc.id,
            title: payload.title,
            desc: payload.desc,
            imageUrl,
            order,
            showOnHome: false,
            isHero: false,
            admin_id: "admin",
            imageFile: null,
            previewUrl: "",
            saving: false,
          },
        ])
      );

      handleNewImage(null);
    } catch (error) {
      console.error("Failed to add AdminHub highlight:", error);
      window.alert("Failed to add highlight.");
    } finally {
      setAdding(false);
    }
  }, [handleNewImage, items, newImage]);

  const handleSaveItem = useCallback(
    async (item: EditableHighlight) => {
      if (!item.id) return;

      const cleanTitle = item.title.trim();
      const cleanDesc = item.desc.trim();

      if (!cleanTitle) {
        window.alert("Highlight title is required.");
        return;
      }

      setItemSaving(item.id, true);

      try {
        let imageUrl = item.imageUrl;

        if (item.imageFile) {
          const uploaded = await uploadFiles("fileUploader" as any, {
            files: [item.imageFile],
          });

          imageUrl = getUploadUrl(
            uploaded?.[0] as UploadThingResult | undefined
          );

          if (!imageUrl) {
            console.log("UploadThing response:", uploaded);
            throw new Error("Upload completed but no image URL was returned.");
          }
        }

        const payload = {
          title: cleanTitle,
          desc: cleanDesc,
          imageUrl,
          order: normalizeOrder(item.order),
          showOnHome: !!item.showOnHome,
          isHero: !!item.isHero,
          admin_id: "admin",
          updatedAt: serverTimestamp(),
        };

        await updateDoc(doc(firestore, COLLECTION_PATH, item.id), payload);

        if (payload.isHero) {
          const otherHeroItems = items.filter(
            (other) => other.id !== item.id && other.isHero
          );

          await Promise.all(
            otherHeroItems
              .filter((other) => !!other.id)
              .map((other) =>
                updateDoc(doc(firestore, COLLECTION_PATH, other.id!), {
                  isHero: false,
                  admin_id: "admin",
                  updatedAt: serverTimestamp(),
                })
              )
          );
        }

        setItems((prev) => {
          const updated = prev.map((current) => {
            if (current.id === item.id) {
              revokePreviewUrl(current.previewUrl);

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
          });

          return sortHighlights(updated);
        });
      } catch (error) {
        console.error("Save failed:", error);
        window.alert("Failed to save highlight.");
        setItemSaving(item.id, false);
      }
    },
    [items, revokePreviewUrl, setItemSaving]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = window.confirm("Delete this AdminHub highlight?");
      if (!ok) return;

      try {
        await deleteDoc(doc(firestore, COLLECTION_PATH, id));

        setItems((prev) => {
          const found = prev.find((item) => item.id === id);
          revokePreviewUrl(found?.previewUrl);

          return prev.filter((item) => item.id !== id);
        });
      } catch (error) {
        console.error("Delete failed:", error);
        window.alert("Delete failed.");
      }
    },
    [revokePreviewUrl]
  );

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
                      disabled={adding || !newImage}
                      onClick={handleAddHighlight}
                      className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                    >
                      {adding ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <ImagePlus size={18} />
                      )}
                      {adding ? "Uploading..." : "Add Highlight"}
                    </button>

                    <button
                      type="button"
                      onClick={() => loadHighlights("refresh")}
                      disabled={refreshing}
                      className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-60"
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

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MiniStat label="Total" value={String(stats.total)} />
                    <MiniStat label="Home" value={String(stats.shownOnHome)} />
                    <MiniStat label="Hero" value={String(stats.hero)} />
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                      <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                        <Star size={15} className="text-[var(--brand-primary)]" />
                        Hero area
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        The item marked <b>Set as Hero</b> supplies the main
                        homepage feature image and message area. Only one hero
                        should stay active.
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
                        Faster loading
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        Images are lazy-loaded and decoded asynchronously so the
                        admin page does not wait for every uploaded image before
                        becoming usable.
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
                        key={newImageInputKey}
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleNewImage(event.target.files?.[0] || null)
                        }
                        className="input"
                        disabled={adding}
                      />

                      <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                        Select an image first, then click <b>Add Highlight</b>.
                        After it is created, edit the title, description,
                        homepage visibility, hero status, and order below.
                      </p>
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
                    <HighlightCard
                      key={item.id}
                      item={item}
                      updateLocalItem={updateLocalItem}
                      onSave={handleSaveItem}
                      onDelete={handleDelete}
                    />
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

const HighlightCard = memo(function HighlightCard({
  item,
  updateLocalItem,
  onSave,
  onDelete,
}: {
  item: EditableHighlight;
  updateLocalItem: UpdateLocalItem;
  onSave: (item: EditableHighlight) => void;
  onDelete: (id: string) => void;
}) {
  const id = item.id || "";

  return (
    <article className="card-outline-gold overflow-hidden">
      <div className="relative">
        <HighlightImage
          src={item.previewUrl || item.imageUrl || "/placeholder.png"}
          alt={item.title || "AdminHub highlight"}
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
            onChange={(event) =>
              updateLocalItem(id, "title", event.target.value)
            }
            className="input mt-2 font-semibold"
            placeholder="Highlight title"
            disabled={!!item.saving}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-[var(--text-primary)]">
            Description
          </label>
          <textarea
            value={item.desc}
            onChange={(event) => updateLocalItem(id, "desc", event.target.value)}
            className="input mt-2 min-h-[120px] resize-y rounded-[1.25rem]"
            placeholder="Highlight description"
            disabled={!!item.saving}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-[var(--text-primary)]">
            Replace Image
          </label>
          <input
            key={`${id}-${item.previewUrl || "saved"}`}
            type="file"
            accept="image/*"
            onChange={(event) =>
              updateLocalItem(id, "imageFile", event.target.files?.[0] || null)
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
              checked={!!item.showOnHome}
              onChange={(event) =>
                updateLocalItem(id, "showOnHome", event.target.checked)
              }
              disabled={!!item.saving}
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
            <span>Set as Hero</span>
            <input
              type="checkbox"
              checked={!!item.isHero}
              onChange={(event) =>
                updateLocalItem(id, "isHero", event.target.checked)
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
            value={Number.isFinite(Number(item.order)) ? item.order : ""}
            onChange={(event) =>
              updateLocalItem(
                id,
                "order",
                event.target.value === "" ? 999 : Number(event.target.value)
              )
            }
            className="input mt-2 max-w-[140px]"
            disabled={!!item.saving}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            onClick={() => onSave(item)}
            disabled={!!item.saving}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
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
            onClick={() => onDelete(id)}
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
  );
});

function HighlightImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const safeSrc = src || "/placeholder.png";

  useEffect(() => {
    setLoaded(false);
  }, [safeSrc]);

  return (
    <div className="relative h-52 w-full overflow-hidden bg-[var(--surface)]">
      {!loaded ? <div className="absolute inset-0 loading-shimmer" /> : null}

      <img
        src={safeSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`h-52 w-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
        onError={(event) => {
          if (!event.currentTarget.src.endsWith("/placeholder.png")) {
            event.currentTarget.src = "/placeholder.png";
          }

          setLoaded(true);
        }}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4 text-center">
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}