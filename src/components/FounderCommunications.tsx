"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clipboard, LoaderCircle, MessageCircle, Send, Users } from "lucide-react";
import type {
  BoardSignalMessageType,
  CommunicationAudienceKind,
  CommunicationCampaignDraft,
  CommunicationSegment,
} from "@/lib/boardsignal/communications";

type PlayerOption = { uid: string; username: string };
type PreviewPlayer = PlayerOption & { preferredContactMethod?: string; preferredContactValue?: string };
type CampaignRow = {
  id: string;
  title: string;
  type: BoardSignalMessageType;
  createdAt: string;
  audienceCount: number;
  sentCount: number;
  readCount?: number;
  pushEligibleCount?: number;
  pushDelivered?: number;
  pushFailed?: number;
};
type ConversationRow = {
  id: string;
  userId: string;
  username: string;
  title: string;
  updatedAt: string;
  unreadForFounder?: boolean;
  allowReply?: boolean;
};
type ConversationMessage = { id: string; body: string; senderType: "founder" | "player"; createdAt: string };

type Overview = { ok: boolean; campaigns?: CampaignRow[]; conversations?: ConversationRow[]; players?: PlayerOption[]; error?: string };

const messageTypes: Array<[BoardSignalMessageType, string]> = [
  ["desk_ready", "Desk Ready"],
  ["episode_update", "Episode Update"],
  ["blue_reminder", "Blue Reminder"],
  ["universe_achievement", "Universe Achievement"],
  ["beta_update", "Beta Update"],
  ["feedback_request", "Feedback Request"],
  ["custom", "Custom"],
];

const segments: Array<[CommunicationSegment, string]> = [
  ["new_players", "New players"],
  ["desk_ready", "Desk ready"],
  ["episode_forming", "Episode forming"],
  ["latest_desk_not_opened", "Latest Desk not opened"],
  ["blue_available", "Blue available"],
  ["universe_top3", "Universe Top 3"],
  ["inactive_recently", "Inactive recently"],
  ["pending_feedback", "Pending feedback"],
];

export default function FounderCommunications() {
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [audienceKind, setAudienceKind] = useState<CommunicationAudienceKind>("one");
  const [selected, setSelected] = useState<string[]>([]);
  const [segment, setSegment] = useState<CommunicationSegment>("new_players");
  const [type, setType] = useState<BoardSignalMessageType>("custom");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [allowReply, setAllowReply] = useState(true);
  const [browserPush, setBrowserPush] = useState(false);
  const [manualContact, setManualContact] = useState(false);
  const [preview, setPreview] = useState<{ audienceCount: number; pushEligibleCount: number; users?: PreviewPlayer[] } | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeThread, setActiveThread] = useState<ConversationRow | null>(null);
  const [threadMessages, setThreadMessages] = useState<ConversationMessage[]>([]);
  const [reply, setReply] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/boardsignal/communications", { cache: "no-store" });
      const data = await response.json() as Overview;
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Founder Communications could not be loaded.");
      setPlayers(data.players ?? []);
      setCampaigns(data.campaigns ?? []);
      setConversations(data.conversations ?? []);
      if (!selected.length && data.players?.[0]) setSelected([data.players[0].uid]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Founder Communications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [selected.length]);

  useEffect(() => { void load(); }, [load]);

  const draft = useMemo<CommunicationCampaignDraft>(() => ({
    audienceKind,
    userIds: audienceKind === "one" ? selected.slice(0, 1) : audienceKind === "selected" ? selected : undefined,
    segment: audienceKind === "segment" ? segment : undefined,
    type,
    title,
    body,
    link: link.trim() || undefined,
    actionLabel: link.trim() ? "Open" : undefined,
    allowReply,
    channels: {
      inApp: true,
      browserPush,
      externalContactManual: manualContact,
      emailProviderReady: false,
    },
  }), [allowReply, audienceKind, body, browserPush, link, manualContact, segment, selected, title, type]);

  async function campaignAction(action: "preview" | "send") {
    setSending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/boardsignal/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action, draft }),
      });
      const data = await response.json() as { ok: boolean; preview?: { audienceCount: number; pushEligibleCount: number; users?: PreviewPlayer[] }; campaign?: CampaignRow; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? `Message ${action} failed.`);
      if (action === "preview" && data.preview) setPreview(data.preview);
      if (action === "send" && data.campaign) {
        setPreview((current) => ({ audienceCount: data.campaign!.audienceCount, pushEligibleCount: data.campaign!.pushEligibleCount ?? 0, users: current?.users }));
        setNotice(`Sent ${data.campaign.sentCount} in-app message${data.campaign.sentCount === 1 ? "" : "s"}.`);
        if (!manualContact) { setTitle(""); setBody(""); setLink(""); }
        await load();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Message ${action} failed.`);
    } finally {
      setSending(false);
    }
  }

  async function openThread(thread: ConversationRow) {
    setActiveThread(thread);
    setThreadMessages([]);
    setError("");
    try {
      const response = await fetch(`/api/admin/boardsignal/communications?uid=${encodeURIComponent(thread.userId)}&threadId=${encodeURIComponent(thread.id)}`, { cache: "no-store" });
      const data = await response.json() as { ok: boolean; conversation?: { messages: ConversationMessage[] }; error?: string };
      if (!response.ok || !data.ok || !data.conversation) throw new Error(data.error ?? "Conversation could not be loaded.");
      setThreadMessages(data.conversation.messages);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Conversation could not be loaded.");
    }
  }

  async function sendReply() {
    if (!activeThread || !reply.trim()) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/boardsignal/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", uid: activeThread.userId, threadId: activeThread.id, body: reply.trim() }),
      });
      const data = await response.json() as { ok: boolean; result?: { message: ConversationMessage }; error?: string };
      if (!response.ok || !data.ok || !data.result) throw new Error(data.error ?? "Reply could not be sent.");
      setThreadMessages((items) => [...items, data.result!.message]);
      setReply("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Reply could not be sent.");
    } finally {
      setSending(false);
    }
  }

  function togglePlayer(uid: string) {
    setSelected((items) => items.includes(uid) ? items.filter((item) => item !== uid) : [...items, uid]);
  }

  function loadFriendsRivalsReleaseDraft() {
    setAudienceKind("all_active_beta");
    setSelected([]);
    setType("beta_update");
    setTitle("BoardSignal update — Friends & Rivals are here");
    setBody("Connect with other BoardSignal players, compare your recent Desks, see who's closing the gap and follow Head-to-Head movement as new weeks land.");
    setLink("/boardsignal/player-room?tab=friends");
    setAllowReply(false);
    setBrowserPush(false);
    setManualContact(false);
    setPreview(null);
    setNotice("Friends & Rivals release draft loaded. Preview it before sending after Production release.");
  }

  async function copyExternalMessage() {
    const text = [title.trim(), body.trim(), link.trim()].filter(Boolean).join("\n\n");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setNotice("External message copied. Use the stored contact below to send it manually.");
    } catch {
      setError("The message could not be copied automatically. Select the text and copy it manually.");
    }
  }

  return <>
    <section className="desk-section founder-composer">
      <div className="room-section-heading"><div><p className="kicker">COMMUNICATIONS</p><h2>Send a BoardSignal message</h2><p>In-app delivery works now. Browser push is optional and permission-gated. External contact remains manual/copy; email is provider-ready only.</p></div><button className="button button-outline" type="button" onClick={loadFriendsRivalsReleaseDraft}>Load Friends & Rivals release draft</button></div>
      <div className="founder-composer-grid">
        <div className="composer-field"><label htmlFor="audience-kind">Audience</label><select id="audience-kind" value={audienceKind} onChange={(event) => { setAudienceKind(event.target.value as CommunicationAudienceKind); setPreview(null); }}><option value="one">One player</option><option value="selected">Selected players</option><option value="all_active_beta">All active Founding Beta</option><option value="segment">Segment</option></select></div>
        {audienceKind === "segment" ? <div className="composer-field"><label htmlFor="segment">Segment</label><select id="segment" value={segment} onChange={(event) => setSegment(event.target.value as CommunicationSegment)}>{segments.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div> : null}
        {(audienceKind === "one" || audienceKind === "selected") ? <fieldset className="composer-player-select"><legend>{audienceKind === "one" ? "Player" : "Players"}</legend>{players.map((player) => <label key={player.uid}><input type={audienceKind === "one" ? "radio" : "checkbox"} name={audienceKind === "one" ? "player" : undefined} checked={selected.includes(player.uid)} onChange={() => audienceKind === "one" ? setSelected([player.uid]) : togglePlayer(player.uid)} /> {player.username}</label>)}</fieldset> : null}
        <div className="composer-field"><label htmlFor="message-type">Message type</label><select id="message-type" value={type} onChange={(event) => setType(event.target.value as BoardSignalMessageType)}>{messageTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="composer-field wide"><label htmlFor="campaign-title">Title</label><input id="campaign-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} /></div>
        <div className="composer-field wide"><label htmlFor="campaign-body">Message</label><textarea id="campaign-body" value={body} onChange={(event) => setBody(event.target.value)} rows={6} maxLength={4000} /></div>
        <div className="composer-field wide"><label htmlFor="campaign-link">Optional BoardSignal link/action</label><input id="campaign-link" value={link} onChange={(event) => setLink(event.target.value)} placeholder="/boardsignal/player-room" maxLength={500} /></div>
      </div>
      <div className="campaign-channel-options"><label><input type="checkbox" checked disabled /> In-app</label><label><input type="checkbox" checked={browserPush} onChange={(event) => setBrowserPush(event.target.checked)} /> Browser push if granted</label><label><input type="checkbox" checked={manualContact} onChange={(event) => setManualContact(event.target.checked)} /> External contact — manual/copy</label><label><input type="checkbox" checked={allowReply} onChange={(event) => setAllowReply(event.target.checked)} /> Allow private replies</label><span>Email: provider-ready, not active</span></div>
      {preview ? <><div className="campaign-preview-metrics"><div><span>Audience</span><strong>{preview.audienceCount}</strong></div><div><span>Push eligible</span><strong>{preview.pushEligibleCount}</strong></div></div>{manualContact ? <div className="manual-contact-preview"><div><strong>External contact — manual</strong><p>Contact details stay private and are shown only where the player consented to beta communication.</p></div><button className="button button-outline" type="button" onClick={copyExternalMessage}><Clipboard size={15} /> Copy external message</button><div className="manual-contact-list">{preview.users?.length ? preview.users.map((player) => <div key={player.uid}><strong>{player.username}</strong><span>{player.preferredContactMethod && player.preferredContactValue ? `${player.preferredContactMethod}: ${player.preferredContactValue}` : "No consented external contact available"}</span></div>) : <p>No preview contacts are available.</p>}</div></div> : null}</> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}{notice ? <p className="form-success" role="status">{notice}</p> : null}
      <div className="composer-actions"><button className="button button-outline" type="button" onClick={() => campaignAction("preview")} disabled={sending || !title.trim() || !body.trim()}><Users size={15} /> Preview</button><button className="button button-lime" type="button" onClick={() => campaignAction("send")} disabled={sending || !title.trim() || !body.trim()}>{sending ? <><LoaderCircle className="button-spinner" size={15} /> Sending</> : <><Send size={15} /> Send</>}</button></div>
    </section>

    <section className="desk-section founder-conversations"><div className="room-section-heading"><div><p className="kicker">REPLIES / CONVERSATIONS</p><h2>Founder ↔ player</h2><p>Private individual threads only. No public group chat is created.</p></div></div>{loading ? <div className="founder-directory-loading"><LoaderCircle className="button-spinner" /> Loading conversations</div> : <div className="founder-conversation-layout"><div className="founder-conversation-list">{conversations.length ? conversations.map((thread) => <button type="button" key={`${thread.userId}:${thread.id}`} className={`${thread.unreadForFounder ? "is-unread" : ""} ${activeThread?.id === thread.id && activeThread.userId === thread.userId ? "is-selected" : ""}`} onClick={() => openThread(thread)}><span>{thread.username}</span><strong>{thread.title}</strong><small>{new Date(thread.updatedAt).toLocaleString()}</small>{thread.unreadForFounder ? <i>Reply waiting</i> : null}</button>) : <div className="inbox-empty"><MessageCircle size={20} /><div><strong>No private replies yet.</strong><p>Replyable founder messages will create individual player threads here.</p></div></div>}</div><article className="founder-thread-reader">{activeThread ? <><p className="kicker">{activeThread.username}</p><h3>{activeThread.title}</h3><div className="conversation-thread">{threadMessages.map((message) => <div key={message.id} className={`conversation-message ${message.senderType}`}><span>{message.senderType === "player" ? activeThread.username : "Ayanda"}</span><p>{message.body}</p><small>{new Date(message.createdAt).toLocaleString()}</small></div>)}</div>{activeThread.allowReply !== false ? <div className="conversation-reply"><label htmlFor="founder-reply">Reply</label><textarea id="founder-reply" value={reply} onChange={(event) => setReply(event.target.value)} rows={4} maxLength={2000} /><button type="button" className="button button-lime" onClick={sendReply} disabled={sending || !reply.trim()}><Send size={14} /> Reply</button></div> : null}</> : <div className="inbox-reader-placeholder"><MessageCircle size={22} /><p>Select a player conversation.</p></div>}</article></div>}</section>

    <section className="desk-section campaign-history"><div className="room-section-heading"><div><p className="kicker">RECENT CAMPAIGNS</p><h2>Delivery history</h2></div></div>{campaigns.length ? <div className="campaign-history-table">{campaigns.map((campaign) => <article key={campaign.id}><div><strong>{campaign.title}</strong><span>{campaign.type.replaceAll("_", " ")} · {new Date(campaign.createdAt).toLocaleString()}</span></div><dl><div><dt>Audience</dt><dd>{campaign.audienceCount}</dd></div><div><dt>Sent</dt><dd>{campaign.sentCount}</dd></div><div><dt>Read</dt><dd>{campaign.readCount ?? 0}</dd></div><div><dt>Push eligible</dt><dd>{campaign.pushEligibleCount ?? 0}</dd></div><div><dt>Push delivered</dt><dd>{campaign.pushDelivered ?? 0}</dd></div><div><dt>Push failed</dt><dd>{campaign.pushFailed ?? 0}</dd></div></dl></article>)}</div> : <div className="universe-empty"><p>No communications campaigns have been sent yet.</p></div>}</section>
  </>;
}
