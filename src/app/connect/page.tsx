import Link from "next/link";
import { ArrowRight, CircleCheckBig, ShieldCheck } from "lucide-react";

export const metadata = { title: "Connect Chess.com" };

export default function ConnectPage() {
  return (
    <div id="main" className="interior-page">
      <header className="interior-hero"><div className="container"><p className="kicker">Connect your public games</p><h1>Just your Chess.com username.</h1><p className="standfirst">BoardSignal never needs your Chess.com password. We confirm the public profile, show you the exact account and retrieve available public games.</p></div></header>
      <section className="container section-pad">
        <form className="form-card">
          <div className="field-grid">
            <div className="field full-span"><label htmlFor="username">Chess.com username</label><input id="username" name="username" defaultValue="Ayandakopano" /></div>
            <div className="field"><label htmlFor="timezone">Your timezone</label><select id="timezone" name="timezone" defaultValue="Africa/Gaborone"><option>Africa/Gaborone</option><option>UTC</option><option>Europe/London</option><option>America/New_York</option></select></div>
            <div className="field"><label htmlFor="cadence">Desk cadence</label><select id="cadence" name="cadence" defaultValue="weekly"><option value="weekly">Up to four fixed episodes/month</option></select></div>
          </div>
          <ul className="feature-list"><li><CircleCheckBig size={16} />Canonical username will be shown before processing.</li><li><ShieldCheck size={16} />No Chess.com login and no routine PGN upload.</li></ul>
          <div className="interior-actions"><Link href="/app" className="button button-lime">Confirm Ayandakopano <ArrowRight size={17} /></Link></div>
        </form>
      </section>
    </div>
  );
}
