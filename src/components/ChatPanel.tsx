"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import {
  FileText,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  Send,
  Trash2,
  X,
} from "lucide-react";

import { uploadFiles } from "@/utils/uploadthing";
import { firestore } from "@/utils/firebaseConfig";

type ChatMessage = {
  id?: string;
  text: string;
  sender: string;
  link: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  timestamp: unknown;
};

type UploadThingResult = {
  url?: string;
  ufsUrl?: string;
  appUrl?: string;
  name?: string;
  type?: string;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getUploadUrl(uploaded?: UploadThingResult) {
  return uploaded?.url || uploaded?.ufsUrl || uploaded?.appUrl || "";
}

export default function ChatPanel({
  projectId,
  senderName,
  canDeleteAll = false,
  brand = { primary: "#4da3ff", accent: "#18c7b8" },
}: {
  projectId: string;
  senderName: string;
  canDeleteAll?: boolean;
  brand?: { primary: string; accent: string };
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [optionalLink, setOptionalLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const messagesBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId) return;

    const q = query(
      collection(firestore, "projects", projectId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<ChatMessage>;

          return {
            id: docSnap.id,
            text: cleanString(data.text),
            sender: cleanString(data.sender) || "Unknown sender",
            link: cleanString(data.link),
            fileUrl: cleanString(data.fileUrl),
            fileName: cleanString(data.fileName),
            fileType: cleanString(data.fileType),
            timestamp: data.timestamp ?? null,
          };
        });

        setMessages(rows);

        window.setTimeout(() => {
          const box = messagesBoxRef.current;
          if (!box) return;

          box.scrollTo({
            top: box.scrollHeight,
            behavior: "smooth",
          });
        }, 120);
      },
      (error) => {
        console.error("Message listener failed:", error);
      }
    );

    return () => unsub();
  }, [projectId]);

  const clearComposer = () => {
    setNewMessage("");
    setOptionalLink("");
    setFile(null);
    setFileInputKey((prev) => prev + 1);
  };

  async function send(e: FormEvent) {
    e.preventDefault();

    const cleanText = newMessage.trim();
    const cleanLink = optionalLink.trim();

    if (!projectId || busy) return;
    if (!cleanText && !file && !cleanLink) return;

    setBusy(true);

    try {
      let uploadedFileUrl = "";
      let uploadedFileName = "";
      let uploadedFileType = "";

      if (file) {
        const uploaded = await uploadFiles("fileUploader" as any, {
          files: [file],
        });

        const firstUpload = uploaded?.[0] as UploadThingResult | undefined;

        uploadedFileUrl = getUploadUrl(firstUpload);
        uploadedFileName = firstUpload?.name || file.name || "Uploaded file";
        uploadedFileType = firstUpload?.type || file.type || "file";

        if (!uploadedFileUrl) {
          throw new Error("File uploaded, but no file URL was returned.");
        }
      }

      const messagePayload: ChatMessage = {
        text: cleanText,
        sender: senderName?.trim() || "AdminHub Global Team",
        link: cleanLink,
        fileUrl: uploadedFileUrl,
        fileName: uploadedFileName,
        fileType: uploadedFileType,
        timestamp: serverTimestamp(),
      };

      await addDoc(
        collection(firestore, "projects", projectId, "messages"),
        messagePayload
      );

      clearComposer();
    } catch (err: any) {
      console.error("Message send failed:", err);
      window.alert(err?.message || "Failed to send message.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAll() {
    if (!canDeleteAll || deleting || !projectId) return;

    const ok = window.confirm("Delete all messages in this conversation?");
    if (!ok) return;

    setDeleting(true);

    try {
      const snap = await getDocs(
        collection(firestore, "projects", projectId, "messages")
      );

      await Promise.all(snap.docs.map((docSnap) => deleteDoc(docSnap.ref)));
    } catch (err) {
      console.error("Delete all messages failed:", err);
      window.alert("Failed to delete messages.");
    } finally {
      setDeleting(false);
    }
  }

  const isOwn = (message: ChatMessage) => message.sender === senderName;

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-[var(--border-strong)] bg-[rgba(11,18,32,0.92)] shadow-[var(--shadow-lg)]">
      <div
        className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 md:px-6"
        style={{
          background: `linear-gradient(135deg, rgba(77,163,255,0.18) 0%, rgba(15,23,42,0.96) 48%, rgba(24,199,184,0.14) 100%)`,
          color: "var(--text-primary)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[rgba(77,163,255,0.28)]"
            style={{
              background: "rgba(77,163,255,0.12)",
              color: brand.accent,
            }}
          >
            <MessageCircle size={18} />
          </span>

          <div>
            <h2 className="text-sm font-extrabold tracking-[-0.01em] md:text-base">
              Project Conversation
            </h2>
            <p className="text-xs font-medium text-[var(--text-muted)]">
              AdminHub Global messaging, files, links, and client updates
            </p>
          </div>
        </div>

        {canDeleteAll ? (
          <button
            onClick={deleteAll}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition hover:bg-[rgba(239,68,68,0.12)] disabled:opacity-60 md:text-sm"
            style={{
              borderColor: "rgba(239,68,68,0.32)",
              background: "rgba(239,68,68,0.08)",
              color: "#fca5a5",
            }}
            type="button"
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            {deleting ? "Deleting..." : "Delete All"}
          </button>
        ) : null}
      </div>

      <div
        ref={messagesBoxRef}
        className="max-h-[430px] space-y-3 overflow-y-auto overscroll-contain border-b border-[var(--border)] bg-[rgba(6,10,18,0.72)] p-3 md:p-4"
      >
        {messages.length === 0 ? (
          <div className="empty-state p-5 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-tint)] text-[var(--brand-primary)]">
              <MessageCircle size={20} />
            </div>

            <p className="text-sm font-extrabold text-[var(--text-primary)]">
              No messages yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--text-secondary)]">
              Start the workspace conversation with a clear project update,
              onboarding request, file note, proposal question, or next action
              for this client.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const ownMessage = isOwn(message);

            return (
              <div
                key={message.id}
                className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${
                  ownMessage ? "ml-auto" : ""
                }`}
                style={{
                  background: ownMessage
                    ? "linear-gradient(135deg, rgba(77,163,255,0.18), rgba(24,199,184,0.10))"
                    : "rgba(15,23,42,0.92)",
                  border: `1px solid ${
                    ownMessage
                      ? "rgba(77,163,255,0.34)"
                      : "rgba(148,163,184,0.16)"
                  }`,
                  boxShadow: ownMessage
                    ? "0 14px 30px rgba(47,125,255,0.12)"
                    : "0 12px 26px rgba(0,0,0,0.18)",
                }}
              >
                <div
                  className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em]"
                  style={{
                    color: ownMessage ? brand.accent : "var(--text-muted)",
                  }}
                >
                  {message.sender}
                </div>

                {message.text ? (
                  <p className="whitespace-pre-line text-sm leading-6 text-[var(--text-secondary)]">
                    {message.text}
                  </p>
                ) : null}

                <div className="mt-2 space-y-1.5">
                  {message.link ? (
                    <a
                      href={message.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(77,163,255,0.26)] bg-[rgba(77,163,255,0.1)] px-2.5 py-1 text-xs font-bold underline-offset-4 hover:underline"
                      style={{ color: brand.primary }}
                    >
                      <LinkIcon size={13} />
                      Reference link
                    </a>
                  ) : null}

                  {message.fileUrl ? (
                    <a
                      href={message.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(24,199,184,0.26)] bg-[rgba(24,199,184,0.1)] px-2.5 py-1 text-xs font-bold underline-offset-4 hover:underline"
                      style={{ color: brand.accent }}
                    >
                      <FileText size={13} />
                      {message.fileName || "View attached file"}
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={send}
        className="space-y-3 bg-[rgba(11,18,32,0.96)] p-3 md:p-4"
      >
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Write a project update, onboarding request, support note, or reply..."
          rows={3}
          disabled={busy}
          className="input min-h-[110px] resize-y rounded-[1.25rem] disabled:opacity-60"
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex min-h-[46px] cursor-pointer items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[rgba(15,23,42,0.86)] px-4 text-xs font-bold text-[var(--text-secondary)] transition hover:border-[rgba(77,163,255,0.44)] hover:text-[var(--text-primary)] sm:w-auto">
            Attach file
            <input
              key={fileInputKey}
              type="file"
              accept="image/*,application/pdf"
              disabled={busy}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="sr-only"
            />
          </label>

          <input
            type="url"
            value={optionalLink}
            disabled={busy}
            onChange={(e) => setOptionalLink(e.target.value)}
            placeholder="Optional reference link"
            className="input w-full disabled:opacity-60 sm:flex-1"
          />

          <button
            type="submit"
            disabled={busy || (!newMessage.trim() && !optionalLink.trim() && !file)}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-white shadow-[var(--shadow-blue)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            style={{
              background: `linear-gradient(135deg, ${brand.primary}, ${brand.accent})`,
            }}
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {busy ? "Sending..." : "Send"}
          </button>
        </div>

        {file ? (
          <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--border)] bg-[rgba(15,23,42,0.86)] px-4 py-3">
            <span className="min-w-0 truncate text-sm text-[var(--text-secondary)]">
              {file.name}
            </span>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setFile(null);
                setFileInputKey((prev) => prev + 1);
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[rgba(6,10,18,0.7)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-60"
            >
              <X size={14} />
              Remove
            </button>
          </div>
        ) : null}

        <p className="text-xs leading-6 text-[var(--text-muted)]">
          Use this panel for client project updates, onboarding requests,
          uploaded files, proposal references, and support notes. New uploads and
          messages require an internet connection.
        </p>
      </form>
    </section>
  );
}