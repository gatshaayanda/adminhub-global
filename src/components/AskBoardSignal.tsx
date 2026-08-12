"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { HelpCircle, LoaderCircle, MessageCircle, Send, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pageGuideSuggestions, type GuideAction, type GuideResponse } from "@/lib/boardsignal/guide";
import { auth } from "@/utils/firebaseConfig";

type ChatMessage = { id: string; sender: "player" | "guide"; body: string; response?: GuideResponse };
const STORAGE_PREFIX = "boardsignal-guide-continuity-v2";
const ELIGIBLE = ["/", "/boardsignal", "/app", "/feed", "/player", "/share", "/join", "/how-it-works", "/pricing"];

function eligiblePath(pathname: string) {
  return ELIGIBLE.some((prefix) => prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function continuityKey(uid?: string) { return `${STORAGE_PREFIX}:${uid || "guest"}`; }

function readContinuity(uid?: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(continuityKey(uid)) ?? "null") as { updatedAt?: string; messages?: ChatMessage[] } | null;
    if (!stored || !Array.isArray(stored.messages)) return [];
    if (stored.updatedAt && Date.now() - Date.parse(stored.updatedAt) > 14 * 24 * 60 * 60 * 1000) return [];
    return stored.messages.slice(-12).map((item) => ({ id: String(item.id), sender: item.sender === "player" ? "player" : "guide", body: String(item.body).slice(0, 1800), response: item.response }));
  } catch { return []; }
}

export default function AskBoardSignal() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>();
  const [visibleEntityId, setVisibleEntityId] = useState<number>();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [unread, setUnread] = useState(false);
  const [failure, setFailure] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedOpenRef = useRef(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    initializedOpenRef.current = false;
    setMessages(readContinuity(user?.uid));
  }, [user?.uid]);
  useEffect(() => {
    const onContext = (event: Event) => {
      const detail = (event as CustomEvent<{ activeTab?: string; visibleEntityId?: number }>).detail;
      setActiveTab(String(detail?.activeTab ?? "") || undefined);
      const entity = Number(detail?.visibleEntityId);
      setVisibleEntityId(Number.isSafeInteger(entity) && entity > 0 ? entity : undefined);
    };
    window.addEventListener("boardsignal:context", onContext);
    return () => window.removeEventListener("boardsignal:context", onContext);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname.includes("boardsignal/player-room")) {
      setActiveTab(undefined);
      setVisibleEntityId(undefined);
      return;
    }
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (["desk", "progress", "universe", "friends", "inbox", "profile"].includes(requested ?? "")) setActiveTab(requested!);
    else setActiveTab((current) => current ?? "desk");
  }, [pathname]);
  useEffect(() => {
    try { window.localStorage.setItem(continuityKey(user?.uid), JSON.stringify({ updatedAt: new Date().toISOString(), messages: messages.slice(-12) })); } catch { /* continuity is optional */ }
  }, [messages, user?.uid]);
  useEffect(() => {
    if (!open) return;
    setUnread(false);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const suggestions = useMemo(() => pageGuideSuggestions(pathname, activeTab, Boolean(user)), [activeTab, pathname, user]);
  const callGuide = useCallback(async (message: string) => {
    setBusy(true);
    setFailure(false);
    try {
      const token = user ? await user.getIdToken() : "";
      const response = await fetch("/api/boardsignal/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: "ask", message, pathname, activeTab, visibleEntityId }),
      });
      const body = await response.json() as { ok?: boolean; response?: GuideResponse; error?: string };
      if (!response.ok || !body.ok || !body.response) throw new Error(body.error ?? "Ask BoardSignal is unavailable right now.");
      const item: ChatMessage = { id: crypto.randomUUID(), sender: "guide" as const, body: body.response.reply, response: body.response };
      setMessages((current) => [...current, item].slice(-12));
      if (!open) setUnread(true);
      return body.response;
    } catch {
      setFailure(true);
      const item: ChatMessage = { id: crypto.randomUUID(), sender: "guide" as const, body: "Ask BoardSignal isn't available right now." };
      setMessages((current) => [...current, item].slice(-12));
      return undefined;
    } finally { setBusy(false); }
  }, [activeTab, open, pathname, user, visibleEntityId]);

  useEffect(() => {
    if (!open || initializedOpenRef.current || messages.length || busy) return;
    initializedOpenRef.current = true;
    void callGuide("");
  }, [busy, callGuide, messages.length, open]);

  async function send(value = input) {
    const message = value.trim();
    if (!message || busy) return;
    const item: ChatMessage = { id: crypto.randomUUID(), sender: "player" as const, body: message };
    setMessages((current) => [...current, item].slice(-12));
    setInput("");
    await callGuide(message);
  }

  async function authenticatedAction(action: string, payload: Record<string, unknown>) {
    if (!user) throw new Error("Player authentication is required.");
    const token = await user.getIdToken();
    const response = await fetch("/api/boardsignal/guide", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, confirmed: true, pathname, activeTab, ...payload }),
    });
    const body = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !body.ok) throw new Error(body.error ?? "Ask BoardSignal could not complete that action.");
  }

  async function runAction(action: GuideAction, source?: GuideResponse) {
    if (action.kind === "navigate" && action.href) { router.push(action.href); setOpen(false); return; }
    if (action.kind === "handoff") {
      if (!window.confirm("Send this support request to Ayanda in your private BoardSignal conversation?")) return;
      const lastPlayerMessage = [...messages].reverse().find((item) => item.sender === "player")?.body ?? "I need help with BoardSignal.";
      setBusy(true);
      try {
        await authenticatedAction("handoff", { message: lastPlayerMessage, category: source?.category ?? "support_request" });
        setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "guide" as const, body: "Sent privately to Ayanda. You can continue the conversation from Inbox." }].slice(-12));
      } catch (reason) {
        setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "guide" as const, body: reason instanceof Error ? reason.message : "The support handoff could not be sent." }].slice(-12));
      } finally { setBusy(false); }
      return;
    }
    if (action.kind === "preference") {
      if (!window.confirm(`Confirm Ask BoardSignal preference: ${action.label}?`)) return;
      setBusy(true);
      try {
        await authenticatedAction("preference", action.payload ?? {});
        setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "guide" as const, body: `Saved. Ask BoardSignal will use ${action.label} as your confirmed tone preference.` }].slice(-12));
      } catch (reason) { setFailure(true); }
      finally { setBusy(false); }
      return;
    }
    if (action.kind === "tour") {
      if (action.id === "release-later") {
        if (user) await authenticatedAction("state", { releaseHint: "dismiss" });
        setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "guide" as const, body: "Got it. I won't keep surfacing that release hint." }].slice(-12));
        return;
      }
      const tourState = action.id === "tour-start" ? "completed" : "dismissed";
      if (user) await authenticatedAction("state", { tourState });
      if (action.id === "tour-start") {
        setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "guide" as const, body: "Desk → finished week. Progress → recent-four movement. Universe → the field. Friends → Head-to-Head. Inbox + Ask BoardSignal → communication and help." }].slice(-12));
      } else setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "guide" as const, body: "No problem. I won't keep prompting the tour." }].slice(-12));
    }
  }

  async function feedback(helpful: boolean, response?: GuideResponse) {
    if (!user) return;
    try { await authenticatedAction("feedback", { helpful, category: response?.category ?? "general" }); } catch { /* feedback never blocks chat */ }
  }

  if (!eligiblePath(pathname)) return null;
  return <div className={`ask-bs ${open ? "is-open" : ""}`}>
    {open ? <div className="ask-bs-panel bs-surface-paper" ref={panelRef} role="dialog" aria-modal="false" aria-labelledby="ask-bs-title">
      <header className="ask-bs-header bs-surface-dark"><div><span>BOARD SIGNAL</span><h2 id="ask-bs-title">Ask BoardSignal</h2><p>{user ? "Your contextual companion" : "Product guide"}</p></div><button type="button" className="ask-bs-close" aria-label="Close Ask BoardSignal" onClick={() => setOpen(false)}><X size={20}/></button></header>
      <div className="ask-bs-messages" aria-live="polite" aria-relevant="additions text">
        {!messages.length ? <div className="ask-bs-welcome"><MessageCircle size={22}/><strong>{user ? "What do you want to understand?" : "Curious about BoardSignal?"}</strong><p>I explain BoardSignal facts and help you find the right place. I don't create new chess analysis.</p></div> : null}
        {messages.map((message, index) => <div key={message.id} className={`ask-bs-message ${message.sender === "player" ? "from-player" : "from-guide"}`}><p>{message.body}</p>{message.sender === "guide" && message.response?.actions?.length ? <div className="ask-bs-actions">{message.response.actions.map((action) => action.href && action.kind === "navigate" ? <button key={action.id} type="button" onClick={() => void runAction(action, message.response)}>{action.label}</button> : <button key={action.id} type="button" onClick={() => void runAction(action, message.response)}>{action.label}</button>)}</div> : null}{message.sender === "guide" && index === messages.length - 1 && messages.filter((item) => item.sender === "guide").length % 3 === 0 && user ? <div className="ask-bs-feedback"><span>Was that clear?</span><button type="button" onClick={() => void feedback(true, message.response)}>Yes</button><button type="button" onClick={() => void feedback(false, message.response)}>Not really</button></div> : null}</div>)}
        {busy ? <div className="ask-bs-thinking"><LoaderCircle className="button-spinner" size={16}/> Checking BoardSignal facts</div> : null}
        {failure ? <div className="ask-bs-failure" role="alert"><strong>Ask BoardSignal isn't available right now.</strong><div><Link href="/boardsignal/player-room?tab=inbox">Open Inbox</Link>{user ? <button type="button" onClick={() => void runAction({ id: "handoff", label: "Message Ayanda", kind: "handoff", requiresConfirmation: true })}>Message Ayanda</button> : null}</div></div> : null}
      </div>
      <div className="ask-bs-suggestions" aria-label="Suggested questions">{suggestions.slice(0, 4).map((suggestion) => <button type="button" key={suggestion} disabled={busy} onClick={() => void send(suggestion)}>{suggestion}</button>)}</div>
      <form className="ask-bs-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}><label className="sr-only" htmlFor="ask-bs-input">Ask BoardSignal</label><input ref={inputRef} id="ask-bs-input" value={input} onChange={(event) => setInput(event.target.value)} maxLength={1200} placeholder="Ask about this page or your BoardSignal…"/><button type="submit" aria-label="Send to Ask BoardSignal" disabled={busy || !input.trim()}><Send size={18}/></button></form>
    </div> : null}
    <button type="button" className="ask-bs-launcher bs-surface-dark" aria-label={open ? "Close Ask BoardSignal" : "Open Ask BoardSignal"} aria-expanded={open} onClick={() => setOpen((value) => !value)}><HelpCircle size={20}/><span>Ask BoardSignal</span>{unread && !open ? <b aria-label="New Ask BoardSignal response">1</b> : null}</button>
  </div>;
}
