"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  BriefcaseBusiness,
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  Network,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { firestore } from "@/utils/firebaseConfig";

type Msg = { sender: "user" | "bot"; text: string };
type Stage = "browse" | "inquire" | "lead" | "handoff";

type Lead = {
  name: string;
  companyProject: string;
  need: string;
  contactMethod: string;
  contactDetails: string;
  referenceRequest: string;
};

const STORAGE_KEY = "adminhub_global_chat_history_v1";
const LEAD_KEY = "adminhub_global_chat_lead_v1";

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function clampText(s: string, max = 1200) {
  const t = (s || "").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function getCurrentPath() {
  if (typeof window === "undefined") return "";
  return window.location.pathname || "";
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("browse");

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);

  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [leadOpen, setLeadOpen] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [lead, setLead] = useState<Lead>({
    name: "",
    companyProject: "",
    need: "",
    contactMethod: "",
    contactDetails: "",
    referenceRequest: "",
  });

  const FALLBACKS = useMemo(
    () => [
      "I can help you explore Admin Hub's published products by industry, open a live product, or start an enquiry.",
      "Tell me what kind of business or workflow you are interested in and I can point you to the closest published work.",
      "If you have an idea of your own, I can collect the project details for Admin Hub to review without interrupting your browsing.",
    ],
    []
  );

  const DEFAULT_SUGGESTIONS = useMemo(
    () => [
      "Explore apps",
      "Find work like mine",
      "Explore games",
      "Start an enquiry",
    ],
    []
  );

  const fallbackIdx = useRef(0);

  const rotatedFallback = () =>
    FALLBACKS[fallbackIdx.current++ % FALLBACKS.length];

  useEffect(() => {
    try {
      const savedMsgs = safeJsonParse<Msg[]>(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(savedMsgs)) setMessages(savedMsgs);

      const savedLead = safeJsonParse<Partial<Lead>>(
        localStorage.getItem(LEAD_KEY)
      );

      if (savedLead && typeof savedLead === "object") {
        setLead((prev) => ({ ...prev, ...savedLead }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

    if (!open && messages.length) {
      const last = messages[messages.length - 1];
      if (last?.sender === "bot") setUnread((u) => u + 1);
    }
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;

    setUnread(0);

    if (messages.length === 0) {
      setStage("browse");
      setMessages([{
        sender: "bot",
        text: "Hi — I’m Ask Admin Hub. I can help you explore published products, find work relevant to your industry, explore the games, or collect a project enquiry for Admin Hub to review. What are you looking for?",
      }]);
      setSuggestions(DEFAULT_SUGGESTIONS);
    }

    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [open, messages.length, DEFAULT_SUGGESTIONS]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const pushBot = (text: string, sugg?: string[]) => {
    setMessages((prev) => [
      ...prev,
      { sender: "bot", text: clampText(text, 1800) },
    ]);
    setSuggestions(Array.isArray(sugg) ? sugg : []);
  };

  async function sendMessage(override?: string) {
    const text = (override ?? input).trim();
    if (!text) return;

    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInput("");
    setTyping(true);

    try {
      const res = await fetch("/api/fake-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          path: getCurrentPath(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      const botReply = (data?.reply || "").trim() || rotatedFallback();
      const botSugg = Array.isArray(data?.suggestions) ? data.suggestions : [];

      setTyping(false);
      pushBot(botReply, botSugg.length ? botSugg : DEFAULT_SUGGESTIONS);
      setStage((s) => (s === "browse" ? "inquire" : s));
    } catch {
      setTyping(false);
      pushBot(rotatedFallback(), DEFAULT_SUGGESTIONS);
    }
  }

  const openInquiryForm = () => {
    setLeadOpen(true);
    setStage("lead");
    pushBot(
      "Sure. I’ll keep this practical: tell me who you are, what you’re working on and how you’d like Admin Hub to reach you. You can leave the reference field empty if there isn’t one.",
      []
    );
  };

  const onSuggestion = (s: string) => {
    if (s === "Start an enquiry" || s === "Start inquiry" || s === "Get a quote") {
      openInquiryForm();
      return;
    }

    if (s === "Explore apps") {
      window.location.href = "/#work";
      return;
    }
    if (s === "Explore games") {
      window.location.href = "/#games";
      return;
    }
    if (s === "Find work like mine") {
      sendMessage("Show me work relevant to my industry");
      return;
    }
    sendMessage(s);
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
      pushBot("Please add your name, what you would like to discuss, and the contact detail you want Admin Hub to use.", []);
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
        name: clean.name,
        companyProject: clean.companyProject,
        need: clean.need,
        contactMethod: clean.contactMethod,
        contactDetails: clean.contactDetails,
        referenceRequest: clean.referenceRequest,
        page: getCurrentPath(),
        transcript: messages.slice(-10).map((m) => ({
          sender: m.sender,
          text: clampText(m.text, 500),
        })),
        createdAt: serverTimestamp(),
      });

      setLeadOpen(false);
      setStage("handoff");
      pushBot(
        "Thanks — I’ve captured the project details for Admin Hub to review. Your details are also remembered in this browser so you can return to the enquiry later. If you did not choose to submit, nothing is sent for follow-up.",
        ["Explore apps", "Explore games"]
      );
    } catch (error) {
      console.error("Inquiry capture failed:", error);

      setLeadOpen(false);
      setStage("handoff");
      pushBot(
        "I kept the enquiry details in this browser, but the online submission could not be completed. You can retry later without re-entering the saved project details.",
        ["Explore apps", "Start an enquiry"]
      );
    } finally {
      setLeadSubmitting(false);
    }
  };

  const clearChat = () => {
    const ok = window.confirm("Clear this chat history?");
    if (!ok) return;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    setMessages([
      {
        sender: "bot",
        text:
          "Chat cleared. 👋\nI’m Ask Admin Hub. I can help you explore published products, find relevant work, explore games, or start a project enquiry.\n\nWhat would you like to explore?",
      },
    ]);
    setSuggestions(DEFAULT_SUGGESTIONS);
    setUnread(0);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full border border-[rgba(77,163,255,0.34)] text-[var(--text-on-brand)] shadow-[var(--shadow-blue)] transition hover:-translate-y-0.5"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-primary-strong), var(--brand-primary))",
          }}
          aria-label="Open AdminHub Global assistant"
        >
          <MessageCircle size={22} />

          {unread > 0 && (
            <span
              className="absolute -right-1 -top-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold text-white"
              style={{
                background: "var(--danger)",
                boxShadow: "0 10px 20px rgba(239, 68, 68, 0.22)",
              }}
            >
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-[1.5rem] border border-[var(--border-strong)] bg-[rgba(11,18,32,0.98)] shadow-[var(--shadow-lg)]"
          style={{
            width: "min(92vw, 24rem)",
            height: leadOpen ? "39rem" : "33rem",
            animation: "adminHubSlideIn 0.34s cubic-bezier(0.45,0,0.25,1)",
          }}
          role="dialog"
          aria-label="Ask Admin Hub"
          aria-modal="false"
        >
          <div className="border-b border-[var(--border)] bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.98)_48%,rgba(24,199,184,0.12)_100%)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[rgba(77,163,255,0.34)] bg-[rgba(77,163,255,0.12)] text-xs font-extrabold text-[var(--brand-primary)] shadow-[var(--shadow-sm)]">
                  AH
                </div>

                <div className="min-w-0 leading-tight">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-extrabold text-[var(--text-primary)]">
                      Ask Admin Hub
                    </div>

                    <span
                      className="badge"
                      style={{ fontSize: 12, padding: "0.18rem 0.55rem" }}
                    >
                      <ShieldCheck size={14} />
                      PUBLIC GUIDE
                    </span>
                  </div>

                  <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {stage === "lead"
                      ? "Inquiry capture"
                      : "Products • Industries • Projects"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-[rgba(6,10,18,0.58)] text-[var(--text-secondary)] transition hover:bg-[rgba(77,163,255,0.12)] hover:text-[var(--text-primary)]"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => sendMessage("What can I do on this page?")}
                className="rounded-full border border-[var(--border)] bg-[rgba(6,10,18,0.54)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--brand-tint)] hover:text-[var(--text-primary)]"
              >
                Page help
              </button>

              <button
                type="button"
                onClick={clearChat}
                className="rounded-full border border-[var(--border)] bg-[rgba(6,10,18,0.54)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[rgba(148,163,184,0.1)] hover:text-[var(--text-primary)]"
              >
                Clear chat
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(6,10,18,0.98)_0%,rgba(11,18,32,0.96)_100%)] p-3 text-sm"
            aria-live="polite"
          >
            <div className="space-y-2">
              {messages.map((m, i) => {
                const isUser = m.sender === "user";

                return (
                  <div
                    key={`${m.sender}-${i}`}
                    className={`flex ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[86%] whitespace-pre-line rounded-2xl border px-3 py-2.5 ${
                        isUser
                          ? "border-[rgba(77,163,255,0.42)] bg-[linear-gradient(135deg,var(--brand-primary-strong),var(--brand-primary))] text-[var(--text-on-brand)]"
                          : "border-[var(--border)] bg-[rgba(15,23,42,0.96)] text-[var(--text-primary)]"
                      }`}
                      style={{
                        boxShadow: isUser
                          ? "var(--shadow-blue)"
                          : "var(--shadow-sm)",
                        animation: "adminHubBubbleIn 150ms ease-out",
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}

              {typing && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-[var(--border)] bg-[rgba(15,23,42,0.96)] px-3 py-2.5 text-[var(--text-primary)] shadow-[var(--shadow-sm)]">
                    <span className="adminhub-typing-dot" />
                    <span
                      className="adminhub-typing-dot"
                      style={{ animationDelay: "120ms" }}
                    />
                    <span
                      className="adminhub-typing-dot"
                      style={{ animationDelay: "240ms" }}
                    />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {leadOpen && (
            <div className="border-t border-[var(--border)] bg-[rgba(11,18,32,0.98)] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                  <ClipboardList size={16} className="text-[var(--brand-primary)]" />
                  Project enquiry
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">You choose what to share</span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="label">Name</label>
                  <input
                    value={lead.name}
                    onChange={(e) =>
                      setLead((s) => ({ ...s, name: e.target.value }))
                    }
                    placeholder="Your name"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Company / Project</label>
                  <input value={lead.companyProject} onChange={(e)=>setLead(s=>({...s,companyProject:e.target.value}))} placeholder="Company, project or idea name" className="input" />
                </div>
                <div>
                  <label className="label">What I’d like to discuss</label>
                  <textarea rows={3} value={lead.need} onChange={(e)=>setLead(s=>({...s,need:e.target.value}))} placeholder="Tell Admin Hub what you are trying to build, improve or explore." className="textarea" />
                </div>
                <div>
                  <label className="label">Best way to contact me</label>
                  <select value={lead.contactMethod} onChange={(e)=>setLead(s=>({...s,contactMethod:e.target.value}))} className="select">
                    <option value="">Choose one</option><option>Email</option><option>WhatsApp</option><option>Phone</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Preferred contact details</label>
                  <input value={lead.contactDetails} onChange={(e)=>setLead(s=>({...s,contactDetails:e.target.value}))} placeholder="Email address, phone number or other detail" className="input" />
                </div>
                <div>
                  <label className="label">Reference request (if applicable)</label>
                  <input value={lead.referenceRequest} onChange={(e)=>setLead(s=>({...s,referenceRequest:e.target.value}))} placeholder="A product, site or example you want Admin Hub to reference" className="input" />
                </div>
                <p className="text-xs leading-6 text-[var(--text-muted)]">Your saved project memory stays in this browser. Submitting sends the enquiry to Admin Hub for review.</p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={submitLead}
                    disabled={leadSubmitting}
                    className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send size={18} />
                    {leadSubmitting ? "Submitting..." : "Submit Inquiry"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLeadOpen(false);
                      setStage("inquire");
                      setSuggestions(DEFAULT_SUGGESTIONS);
                    }}
                    disabled={leadSubmitting}
                    className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {!leadOpen && suggestions.length > 0 && (
            <div className="border-t border-[var(--border)] bg-[rgba(11,18,32,0.98)] px-3 py-2">
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s}-${i}`}
                    type="button"
                    onClick={() => onSuggestion(s)}
                    className="rounded-full border border-[var(--border-strong)] bg-[rgba(6,10,18,0.62)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand-primary)] hover:bg-[var(--brand-tint)] hover:text-[var(--text-primary)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!leadOpen && (
            <div className="flex gap-2 border-t border-[var(--border)] bg-[rgba(11,18,32,0.98)] p-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder="Ask about the work or your project..."
                className="input flex-1"
                aria-label="Type your message"
              />

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => sendMessage()}
                aria-label="Send message"
              >
                <Send size={18} />
                Send
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes adminHubSlideIn {
          from {
            transform: translateY(16px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes adminHubBubbleIn {
          from {
            transform: scale(0.985);
            opacity: 0.7;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes adminHubTyping {
          0%,
          80%,
          100% {
            transform: scale(0.35);
            opacity: 0.35;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .adminhub-typing-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          margin-right: 4px;
          border-radius: 999px;
          background: linear-gradient(
            135deg,
            var(--brand-primary),
            var(--brand-secondary)
          );
          animation: adminHubTyping 1.35s infinite ease-in-out;
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </>
  );
}

function LinkButtonLike({ href, label }: { href: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = href;
      }}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[rgba(6,10,18,0.54)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--brand-tint)] hover:text-[var(--text-primary)]"
    >
      {label}
    </button>
  );
}