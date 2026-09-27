"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/utils/firebaseConfig";
import type { FeaturePipelineItem, PublicFeaturePipelineComment, PublicFeaturePipelineState } from "@/lib/boardsignal/featurePipeline";

type ItemFeedback = { interested: boolean; displayName: string; comment: string; saving: boolean; message?: string; comments?: PublicFeaturePipelineComment[]; loadingComments?: boolean };
type PersonalFeedback = { interested?: boolean; displayName?: string; comment?: string; moderationStatus?: string | null };
const EMPTY_FEEDBACK: ItemFeedback = { interested: false, displayName: "", comment: "", saving: false };

async function playerHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return { "Content-Type": "application/json" };
  return { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` };
}

export default function FeaturePipelineClient({ initialState }: { initialState: PublicFeaturePipelineState }) {
  const [state, setState] = useState(initialState);
  const [feedback, setFeedback] = useState<Record<string, ItemFeedback>>({});
  const items = useMemo(() => state.items.filter((item) => item.visible).sort((a,b) => a.order-b.order), [state]);
  const next = items.filter((item) => item.status === "planned" || item.status === "building" || item.status === "exploring");
  const shipped = items.filter((item) => item.status === "released");

  const patchFeedback = (id: string, patch: Partial<ItemFeedback>) => setFeedback((current) => ({ ...current, [id]: { ...(current[id] ?? EMPTY_FEEDBACK), ...patch } }));

  useEffect(() => {
    let active = true;
    let requestSequence = 0;
    const unsubscribe = onAuthStateChanged(auth, () => {
      const sequence = ++requestSequence;
      void (async () => {
        try {
          const response = await fetch("/api/boardsignal/pipeline/feedback", { method: "GET", headers: await playerHeaders(), cache: "no-store" });
          const payload = await response.json().catch(() => ({}));
          if (!active || sequence !== requestSequence || !response.ok || !payload.feedback || typeof payload.feedback !== "object") return;
          setFeedback((current) => {
            const nextFeedback = { ...current };
            for (const [id, raw] of Object.entries(payload.feedback as Record<string, PersonalFeedback>)) {
              const saved = raw ?? {};
              const existing = current[id];
              const hasLocalEdits = Boolean(existing && (existing.displayName || existing.comment || existing.interested || existing.saving || existing.message));
              if (hasLocalEdits) continue;
              nextFeedback[id] = {
                ...(existing ?? EMPTY_FEEDBACK),
                interested: Boolean(saved.interested),
                displayName: typeof saved.displayName === "string" ? saved.displayName : "",
                comment: typeof saved.comment === "string" ? saved.comment : "",
                saving: false,
              };
            }
            return nextFeedback;
          });
        } catch {
          // Personal feedback hydration is optional; the public Pipeline remains usable if it cannot be read.
        }
      })();
    });
    return () => { active = false; requestSequence += 1; unsubscribe(); };
  }, []);

  async function save(item: FeaturePipelineItem, patch: Partial<ItemFeedback>, toggleInterest = false) {
    const current = { ...(feedback[item.id] ?? EMPTY_FEEDBACK), ...patch };
    patchFeedback(item.id, { ...patch, saving: true, message: undefined });
    try {
      const response = await fetch("/api/boardsignal/pipeline/feedback", {
        method: "POST",
        headers: await playerHeaders(),
        body: JSON.stringify(toggleInterest ? { itemId: item.id, toggleInterest: true, website: "" } : { itemId: item.id, displayName: current.displayName, comment: current.comment, website: "" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Your input could not be saved.");
      setState(payload.state);
      const savedInterested = Boolean(payload.feedback?.interested);
      patchFeedback(item.id, { interested: savedInterested, saving: false, message: toggleInterest ? (savedInterested ? "Community signal saved." : "Community signal removed.") : "Input saved for Founder review." });
    } catch (error) { patchFeedback(item.id, { saving: false, message: error instanceof Error ? error.message : "Your input could not be saved." }); }
  }

  async function loadComments(item: FeaturePipelineItem) {
    if (feedback[item.id]?.comments) return patchFeedback(item.id, { comments: undefined });
    patchFeedback(item.id, { loadingComments: true });
    try {
      const response = await fetch(`/api/boardsignal/pipeline/comments?itemId=${encodeURIComponent(item.id)}`);
      const payload = await response.json();
      patchFeedback(item.id, { loadingComments: false, comments: response.ok ? payload.comments ?? [] : [] });
    } catch { patchFeedback(item.id, { loadingComments: false, comments: [] }); }
  }

  const renderCard = (item: FeaturePipelineItem) => {
    const local = feedback[item.id] ?? EMPTY_FEEDBACK;
    const status = item.status.toUpperCase();
    return <article key={item.id} className={`pipeline-card pipeline-card--${item.status}`} id={item.slug}>
      <div className="pipeline-card__meta"><span className="pipeline-status"><span aria-hidden="true" className="pipeline-status__dot" />{status}</span><span>{item.category}</span></div>
      <h3>{item.title}</h3><p className="pipeline-card__summary">{item.summary}</p>
      {item.detail ? <p>{item.detail}</p> : null}
      {item.releaseNote ? <p className="pipeline-release-note"><strong>Shipped:</strong> {item.releaseNote}</p> : null}
      {item.status !== "released" ? <div className="pipeline-input">
        {item.publicQuestion ? <p className="pipeline-question">{item.publicQuestion}</p> : null}
        <button type="button" className={`pipeline-interest ${local.interested ? "is-active" : ""}`} aria-pressed={local.interested} disabled={local.saving} onClick={() => save(item, {}, true)}>{local.interested ? "This matters to me ✓" : "This matters to me"}</button>
        <span className="pipeline-interest-count">{item.interestCount > 0 ? `${item.interestCount} interested` : "Be the first to weigh in"}</span>
        <details className="pipeline-comment-form"><summary>Add a short note</summary>
          <label>Display name <input maxLength={60} value={local.displayName} onChange={(event) => patchFeedback(item.id, { displayName: event.target.value })} placeholder="Optional" /></label>
          <label>Your input <textarea maxLength={800} value={local.comment} onChange={(event) => patchFeedback(item.id, { comment: event.target.value })} placeholder="What would make this useful to your game?" /></label>
          <input className="pipeline-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" />
          <button type="button" className="button button-dark" disabled={local.saving || !local.comment.trim()} onClick={() => save(item, {})}>{local.saving ? "Saving…" : "Send input"}</button>
        </details>
        {local.message ? <p className="pipeline-form-message" role="status">{local.message}</p> : null}
      </div> : null}
      <button className="pipeline-comments-toggle" type="button" onClick={() => loadComments(item)}>{local.loadingComments ? "Loading…" : local.comments ? "Hide approved input" : "Read approved community input"}</button>
      {local.comments ? <div className="pipeline-comments" aria-live="polite">{local.comments.length ? local.comments.map((comment) => <blockquote key={comment.id}><p>{comment.body}</p><footer>— {comment.displayName}</footer></blockquote>) : <p>No approved written input yet.</p>}</div> : null}
      <a className="pipeline-share" href={`#${item.slug}`} aria-label={`Share target for ${item.title}`}>#{item.slug}</a>
    </article>;
  };

  return <>
    <section className="pipeline-strip" aria-label="Live Pipeline counts">
      <div><strong>{state.counts.planned}</strong><span>Planned</span></div><div><strong>{state.counts.building}</strong><span>Building</span></div><div><strong>{state.counts.released}</strong><span>Released</span></div><div><strong>{state.counts.communityInput}</strong><span>Community input</span></div>
    </section>
    <section className="pipeline-section" aria-labelledby="whats-next"><div className="pipeline-section__head"><p className="eyebrow">WHAT&apos;S NEXT</p><h2 id="whats-next">Work moving through the desk</h2></div><div className="pipeline-grid">{next.map((item) => renderCard(item))}</div></section>
    <section className="pipeline-section pipeline-section--released" aria-labelledby="recently-shipped"><div className="pipeline-section__head"><p className="eyebrow">RECENTLY SHIPPED</p><h2 id="recently-shipped">The work stays visible after release</h2></div><div className="pipeline-grid">{shipped.map((item) => renderCard(item))}</div></section>
  </>;
}
