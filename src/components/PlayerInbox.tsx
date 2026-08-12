"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, MessageCircle, Send } from "lucide-react";
import type { BoardSignalConversationMessage, BoardSignalInboxMessage } from "@/lib/boardsignal/communications";

type InboxResponse = { ok: boolean; inbox?: { messages: BoardSignalInboxMessage[]; unreadCount: number }; error?: string };
type ConversationResponse = { ok: boolean; conversation?: { messages: BoardSignalConversationMessage[] }; error?: string };

export default function PlayerInbox({ token, onUnreadChange }: { token: string; onUnreadChange?: (count: number) => void }) {
  const [messages, setMessages] = useState<BoardSignalInboxMessage[]>([]);
  const [selected, setSelected] = useState<BoardSignalInboxMessage | null>(null);
  const [conversation, setConversation] = useState<BoardSignalConversationMessage[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/boardsignal/inbox", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const body = await response.json() as InboxResponse;
      if (!response.ok || !body.ok || !body.inbox) throw new Error(body.error ?? "Inbox could not be loaded.");
      setMessages(body.inbox.messages);
      onUnreadChange?.(body.inbox.unreadCount);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Inbox could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange, token]);

  useEffect(() => { void load(); }, [load]);

  async function openMessage(message: BoardSignalInboxMessage) {
    setSelected(message);
    setConversation([]);
    setError("");
    if (!message.readAt) {
      await fetch("/api/boardsignal/inbox", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead", messageId: message.id }),
      });
      await load();
    }
    if (message.threadId) {
      const response = await fetch(`/api/boardsignal/inbox?threadId=${encodeURIComponent(message.threadId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const body = await response.json() as ConversationResponse;
      if (response.ok && body.ok && body.conversation) setConversation(body.conversation.messages);
    }
  }

  async function sendReply() {
    if (!selected?.threadId || !reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/boardsignal/inbox", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", threadId: selected.threadId, body: reply.trim() }),
      });
      const body = await response.json() as { ok: boolean; message?: BoardSignalConversationMessage; error?: string };
      if (!response.ok || !body.ok || !body.message) throw new Error(body.error ?? "Reply could not be sent.");
      setConversation((items) => [...items, body.message!]);
      setReply("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Reply could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="player-inbox-section">
      <div className="room-section-heading"><div><p className="kicker">INBOX</p><h2>BoardSignal messages</h2><p>Desk updates, Universe achievements, founder notes and beta feedback requests stay inside your private Player Room.</p></div><button type="button" className="button button-quiet" onClick={load}>Refresh</button></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {loading ? <div className="founder-directory-loading"><LoaderCircle className="button-spinner" /> Loading Inbox</div> : null}
      {!loading && !messages.length ? <div className="inbox-empty"><MessageCircle size={22} /><div><strong>Your Inbox is clear.</strong><p>BoardSignal will put important account and Desk messages here.</p></div></div> : null}
      {messages.length ? <div className="player-inbox-layout">
        <div className="player-inbox-list">{messages.map((message) => <button type="button" key={message.id} className={`inbox-list-item ${!message.readAt ? "is-unread" : ""} ${selected?.id === message.id ? "is-selected" : ""}`} onClick={() => openMessage(message)}><span>{message.type.replaceAll("_", " ")}</span><strong>{message.title}</strong><small>{new Date(message.createdAt).toLocaleString()}</small>{!message.readAt ? <i aria-label="Unread">Unread</i> : null}</button>)}</div>
        <article className="player-message-reader">{selected ? <><p className="kicker">{selected.senderType === "founder" ? "FROM AYANDA · FOUNDER" : "BOARDSIGNAL"}</p><h3>{selected.title}</h3><p>{selected.body}</p>{selected.link ? <Link className="text-link" href={selected.link}>{selected.actionLabel ?? "Open"} <ArrowRight size={14} /></Link> : null}{selected.threadId ? <div className="conversation-thread">{conversation.map((item) => <div key={item.id} className={`conversation-message ${item.senderType}`}><span>{item.senderType === "player" ? "You" : "Ayanda"}</span><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div>)}</div> : null}{selected.allowReply && selected.threadId ? <div className="conversation-reply"><label htmlFor="player-reply">Reply privately</label><textarea id="player-reply" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={2000} rows={4} /><button type="button" className="button button-lime" onClick={sendReply} disabled={busy || !reply.trim()}>{busy ? <><LoaderCircle className="button-spinner" size={14} /> Sending</> : <><Send size={14} /> Reply</>}</button></div> : null}</> : <div className="inbox-reader-placeholder"><MessageCircle size={22} /><p>Select a message to read it.</p></div>}</article>
      </div> : null}
    </section>
  );
}
