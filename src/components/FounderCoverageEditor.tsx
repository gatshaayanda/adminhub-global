"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Star, Trash2 } from "lucide-react";

type CoverageItem = {
  id: string;
  username?: string;
  headline?: string;
  periodLabel?: string;
  periodEnd?: string;
  positiveFacts?: Record<string, unknown>;
  editorialTitle?: string;
  editorialContext?: string;
  featured?: boolean;
  featuredOrder?: number;
  homepageLead?: boolean;
};

export default function FounderCoverageEditor() {
  const [items, setItems] = useState<CoverageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await fetch("/api/admin/boardsignal/coverage", { cache: "no-store" }); const body = await response.json() as { ok: boolean; coverage?: CoverageItem[]; error?: string }; if (!response.ok || !body.ok) throw new Error(body.error ?? "Coverage could not be loaded."); setItems(body.coverage ?? []); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Coverage could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function act(item: CoverageItem, action: "feature" | "updateEditorial" | "remove" | "setLead") {
    if (action === "remove" && !window.confirm("Remove this safe public coverage item? This does not delete the player's private Desk.")) return;
    setBusy(item.id); setError("");
    try { const response = await fetch("/api/admin/boardsignal/coverage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id: item.id, featured: !item.featured, featuredOrder: item.featuredOrder ?? 0, editorialTitle: item.editorialTitle ?? "", editorialContext: item.editorialContext ?? "" }) }); const body = await response.json() as { ok: boolean; error?: string }; if (!response.ok || !body.ok) throw new Error(body.error ?? "Coverage could not be updated."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Coverage could not be updated."); }
    finally { setBusy(""); }
  }
  if (loading) return <div className="founder-directory-loading"><LoaderCircle className="button-spinner" /> Loading safe public coverage</div>;
  return <section className="desk-section"><div className="room-section-heading"><div><p className="kicker">SAFE AUTO-SELECTED COVERAGE</p><h2>Founder editorial controls</h2><p>The deterministic Desk remains source of truth. Editorial titles/context may only use facts already present in each safe public item.</p></div></div>{error ? <p className="form-error">{error}</p> : null}{items.length ? <div className="coverage-editor-list">{items.map((item) => <article key={item.id} className={item.homepageLead ? "is-lead" : ""}><header><div><span>{item.username ?? "Player"} · {item.periodLabel ?? item.periodEnd}</span><h3>{item.headline ?? "Safe coverage"}</h3></div>{item.homepageLead ? <strong>Homepage lead</strong> : null}</header><details><summary>Supported public facts</summary><pre>{JSON.stringify(item.positiveFacts ?? {}, null, 2)}</pre></details><label>Editorial title<input value={item.editorialTitle ?? ""} onChange={(event) => setItems((values) => values.map((value) => value.id === item.id ? { ...value, editorialTitle: event.target.value } : value))} maxLength={140} /></label><label>Editorial context<textarea value={item.editorialContext ?? ""} onChange={(event) => setItems((values) => values.map((value) => value.id === item.id ? { ...value, editorialContext: event.target.value } : value))} rows={3} maxLength={500} /></label><label>Featured order<input type="number" value={item.featuredOrder ?? 0} onChange={(event) => setItems((values) => values.map((value) => value.id === item.id ? { ...value, featuredOrder: Number(event.target.value) } : value))} /></label><div className="founder-player-actions"><button className="button button-outline" type="button" disabled={busy === item.id} onClick={() => act(item, "updateEditorial")}>Save editorial text</button><button className="button button-outline" type="button" disabled={busy === item.id} onClick={() => act(item, "feature")}><Star size={14} /> {item.featured ? "Unfeature" : "Feature"}</button><button className="button button-lime" type="button" disabled={busy === item.id} onClick={() => act(item, "setLead")}>Set homepage lead</button><button className="button button-quiet" type="button" disabled={busy === item.id} onClick={() => act(item, "remove")}><Trash2 size={14} /> Remove public item</button></div></article>)}</div> : <div className="universe-empty"><p>No auto-selected public coverage exists yet.</p></div>}</section>;
}
