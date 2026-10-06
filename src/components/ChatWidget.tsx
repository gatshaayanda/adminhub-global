"use client";

import { useEffect, useRef, useState } from "react";
import { ClipboardList, MessageCircle, Send, X } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { firestore } from "@/utils/firebaseConfig";

type Msg = { sender: "user" | "bot"; text: string };
type Stage = "browse" | "lead" | "handoff";

type Lead = {
  name: string;
  companyProject: string;
  need: string;
  contactMethod: string;
  contactDetails: string;
  referenceRequest: string;
};

const STORAGE_KEY = "adminhub_global_chat_history_v2";
const LEAD_KEY = "adminhub_global_chat_lead_v1";

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function clampText(value: string, max = 1800) {
  const text = (value || "").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function getCurrentPath() {
  return typeof window === "undefined" ? "" : window.location.pathname || "";
}

const quickActions = [
  { label: "Apps", action: "apps" },
  { label: "Games", action: "games" },
  { label: "Rates & support", action: "rates" },
  { label: "Start a project", action: "enquiry" },
] as const;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("browse");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [lead, setLead] = useState<Lead>({
    name: "",
    companyProject: "",
    need: "",
    contactMethod: "",
    contactDetails: "",
    referenceRequest: "",
  });

  useEffect(() => {
    try {
      const saved = safeJsonParse<Msg[]>(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(saved)) setMessages(saved);
      const savedLead = safeJsonParse<Partial<Lead>>(localStorage.getItem(LEAD_KEY));
      if (savedLead) setLead((prev) => ({ ...prev, ...savedLead }));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!open && messages.at(-1)?.sender === "bot") setUnread((value) => Math.min(value + 1, 9));
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    setUnread(0);
    if (messages.length === 0) {
      setMessages([
        {
          sender: "bot",
          text: "Hi — I’m Ask Admin Hub. I can point you to the right app or game, show the current rates, or collect a project enquiry.",
        },
      ]);
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open, messages.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const pushBot = (text: string) => {
    setMessages((current) => [...current, { sender: "bot", text: clampText(text) }]);
  };

  const sendMessage = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || typing) return;

    setMessages((current) => [...current, { sender: "user", text }]);
    setInput("");
    setTyping(true);

    try {
      const response = await fetch("/api/fake-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, path: getCurrentPath() }),
      });
      const data = await response.json().catch(() => ({}));
      pushBot(
        typeof data?.reply === "string" && data.reply.trim()
          ? data.reply
          : "I can help with apps, games, current rates, or a project enquiry."
      );
      setStage((current) => (current === "browse" ? "lead" : current));
    } catch {
      pushBot("I can help with apps, games, current rates, or a project enquiry. Try one of the quick actions below.");
    } finally {
      setTyping(false);
    }
  };

  const openEnquiry = () => {
    setLeadOpen(true);
    setStage("lead");
    pushBot("Sure. Keep it simple: tell me who you are, what you want to build or improve, and how Admin Hub should reach you.");
  };

  const handleQuickAction = (action: string) => {
    if (action === "apps") window.location.href = "/#work";
    if (action === "games") window.location.href = "/#games";
    if (action === "rates") window.location.href = "/business";
    if (action === "enquiry") openEnquiry();
  };

  const submitLead = async () => {
    if (leadSubmitting) return;

    const clean: Lead = {
      name: lead.name.trim(),
      companyProject: lead.companyProject.trim(),
      need: lead.need.trim(),
      contactMethod: lead.contactMethod.trim(),
      contactDetails: lead.contactDetails.trim(),
      referenceRequest: lead.referenceRequest.trim(),
    };

    if (!clean.name || !clean.need || !clean.contactDetails) {
      pushBot("Please add your name, what you want to discuss, and the contact detail Admin Hub should use.");
      return;
    }

    setLeadSubmitting(true);
    try {
      localStorage.setItem(LEAD_KEY, JSON.stringify(clean));
    } catch {}

    try {
      await addDoc(collection(firestore, "inquiries"), {
        source: "chat_widget",
        project: "AdminHub Global",
        status: "new",
        ...clean,
        page: getCurrentPath(),
        transcript: messages.slice(-10).map((message) => ({
          sender: message.sender,
          text: clampText(message.text, 500),
        })),
        createdAt: serverTimestamp(),
      });

      setLeadOpen(false);
      setStage("handoff");
      pushBot("Thanks — the enquiry is with Admin Hub for review. Your project details are also saved in this browser.");
    } catch (error) {
      console.error("Inquiry capture failed:", error);
      setLeadOpen(false);
      setStage("handoff");
      pushBot("I saved the enquiry details in this browser, but the online submission did not complete. You can retry later without re-entering them.");
    } finally {
      setLeadSubmitting(false);
    }
  };

  const clearChat = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setMessages([
      {
        sender: "bot",
        text: "Chat cleared. I’m Ask Admin Hub. Choose Apps, Games, Rates & support, or Start a project.",
      },
    ]);
    setStage("browse");
    setLeadOpen(false);
    setUnread(0);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ah-chat-launch fixed bottom-5 right-5 z-50 inline-flex h-12 items-center gap-2 rounded-full border border-[#111318] bg-[#111318] px-4 text-sm font-extrabold text-white shadow-[0_16px_40px_rgba(17,19,24,0.22)] transition hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
          aria-label="Open Ask Admin Hub"
        >
          <MessageCircle size={18} />
          <span>Ask Admin Hub</span>
          {unread > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-black text-[#111318]">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className="ah-chat-panel fixed inset-x-3 bottom-3 z-50 flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[1.35rem] border border-[#cfd0ca] bg-[#f7f7f3] text-[#111318] shadow-[0_28px_80px_rgba(17,19,24,0.22)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[390px]"
          style={{ height: leadOpen ? "min(720px, calc(100dvh - 1.5rem))" : "min(650px, calc(100dvh - 1.5rem))" }}
          role="dialog"
          aria-label="Ask Admin Hub"
        >
          <header className="shrink-0 border-b border-[#d9d9d2] bg-white px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-black tracking-[-0.02em]">Ask Admin Hub</div>
                <p className="mt-0.5 text-xs leading-5 text-[#686d74]">
                  Find relevant work, see rates, or start a project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#cfd0ca] bg-white text-[#4e535a] transition hover:bg-[#f0f0eb]"
                aria-label="Close chat"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {quickActions.map((item) => (
                <button
                  key={item.action}
                  type="button"
                  onClick={() => handleQuickAction(item.action)}
                  className="min-h-10 rounded-xl border border-[#cfd0ca] bg-[#f7f7f3] px-3 py-2 text-left text-xs font-extrabold text-[#111318] transition hover:border-[#111318] hover:bg-white"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </header>

          <div
            className="min-h-0 flex-1 overflow-y-auto bg-[#f7f7f3] px-3 py-4"
            aria-live="polite"
          >
            <div className="space-y-2.5">
              {messages.map((message, index) => {
                const user = message.sender === "user";
                return (
                  <div key={`${message.sender}-${index}`} className={`flex ${user ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-3 text-sm leading-6 ${
                        user
                          ? "bg-[#111318] text-white"
                          : "border border-[#d9d9d2] bg-white text-[#30343a]"
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                );
              })}

              {typing && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-[#d9d9d2] bg-white px-3.5 py-3 text-xs font-bold text-[#686d74]">
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {leadOpen ? (
            <div className="shrink-0 border-t border-[#d9d9d2] bg-white p-3">
              <div className="mb-2.5 flex items-center gap-2 text-sm font-black">
                <ClipboardList size={16} />
                Project enquiry
              </div>
              <div className="grid gap-2">
                <input aria-label="Your name" value={lead.name} onChange={(e) => setLead((s) => ({ ...s, name: e.target.value }))} placeholder="Your name" className="input" />
                <input aria-label="Company or project" value={lead.companyProject} onChange={(e) => setLead((s) => ({ ...s, companyProject: e.target.value }))} placeholder="Company / project" className="input" />
                <textarea aria-label="What you want to discuss" rows={3} value={lead.need} onChange={(e) => setLead((s) => ({ ...s, need: e.target.value }))} placeholder="What do you want to build, improve or explore?" className="textarea" />
                <div className="grid grid-cols-2 gap-2">
                  <select aria-label="Best contact method" value={lead.contactMethod} onChange={(e) => setLead((s) => ({ ...s, contactMethod: e.target.value }))} className="select">
                    <option value="">Contact method</option>
                    <option>Email</option>
                    <option>WhatsApp</option>
                    <option>Phone</option>
                    <option>Other</option>
                  </select>
                  <input aria-label="Contact details" value={lead.contactDetails} onChange={(e) => setLead((s) => ({ ...s, contactDetails: e.target.value }))} placeholder="Contact detail" className="input" />
                </div>
                <input aria-label="Reference request" value={lead.referenceRequest} onChange={(e) => setLead((s) => ({ ...s, referenceRequest: e.target.value }))} placeholder="Reference or example (optional)" className="input" />
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={submitLead} disabled={leadSubmitting} className="btn btn-primary flex-1 disabled:opacity-60">
                    <Send size={16} />
                    {leadSubmitting ? "Sending…" : "Send enquiry"}
                  </button>
                  <button type="button" onClick={() => setLeadOpen(false)} disabled={leadSubmitting} className="btn btn-outline">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="shrink-0 border-t border-[#d9d9d2] bg-white p-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask about an app, game, rate or project…"
                  className="input min-w-0 flex-1"
                  aria-label="Ask Admin Hub a question"
                />
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={typing || !input.trim()}
                  className="btn btn-primary shrink-0 px-4 disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send size={17} />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <button type="button" onClick={clearChat} className="text-[11px] font-bold text-[#686d74] hover:text-[#111318]">
                  Clear chat
                </button>
                <button type="button" onClick={() => handleQuickAction("rates")} className="text-[11px] font-bold text-[#173ea5] hover:underline">
                  View rates & support
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
