import AdminNav from "@/components/AdminNav";

export default function PlayersAdminPage() {
  return <div id="main" className="container admin-shell"><header className="admin-heading"><div><p className="kicker">Identity and membership</p><h1>Players</h1></div></header><AdminNav /><section className="desk-section"><p className="kicker">Canonical account</p><h2>Resolve the human before processing the games.</h2><p>The production version will preserve Chess.com&apos;s canonical username and stable player ID, then surface ambiguous-character corrections for human confirmation instead of silently guessing.</p><div className="archive-list"><div className="archive-row"><strong>Ayandakopano</strong><span>Confirmed</span><span>Founding beta</span><span className="state-pill ready">Active</span></div><div className="archive-row"><strong>I_pd_I</strong><span>Identity corrected</span><span>Beta 009</span><span className="state-pill processing">Reviewed</span></div></div></section></div>;
}

