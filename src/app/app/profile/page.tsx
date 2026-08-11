import PlayerHeader from "@/components/PlayerHeader";
import PlayerNav from "@/components/PlayerNav";

export const metadata = { title: "Profile & Privacy" };

export default function ProfilePage() {
  return <div id="main" className="container player-shell"><PlayerHeader /><PlayerNav /><section className="desk-section"><p className="kicker">Profile & privacy</p><h2>Public recognition stays under your control.</h2><div className="form-card" style={{ marginTop: "1.5rem", boxShadow: "none" }}><div className="field-grid"><div className="field full-span"><label htmlFor="display">Public display name</label><input id="display" defaultValue="Ayandakopano" /></div><div className="field"><label htmlFor="default-sharing">Default sharing</label><select id="default-sharing"><option>Anonymous positive moments only</option><option>Ask me every time</option><option>Do not use any moments</option></select></div><div className="field"><label htmlFor="links">Game links</label><select id="links"><option>Never without approval</option><option>Allow on approved posts</option></select></div></div><div className="interior-actions"><button type="button" className="button button-dark">Save preferences</button></div><p className="helper-copy">Controls are visual in this seeded shell; saving will be connected to Firebase later.</p></div></section></div>;
}

