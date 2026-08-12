import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import FounderNewsroomSummary from "@/components/FounderNewsroomSummary";
import { pipeline } from "@/data/boardsignal";

export default function FounderNewsroomPage() {
  return (
    <div id="main" className="container admin-shell">
      <header className="admin-heading"><div><p className="kicker">Founder access · Operational and editorial control</p><h1>Founder Newsroom</h1></div><Link href="/admin/communications" className="button button-lime">Open Communications</Link></header>
      <AdminNav />
      <FounderNewsroomSummary />
      <section className="desk-section"><p className="kicker">DESK PIPELINE</p><h2>The system writes. You supervise the exceptions.</h2><div className="pipeline-list">{pipeline.map((item) => <div className="pipeline-row" key={item.player}><strong>{item.player}</strong><span>{item.period}</span><span>{item.games} games</span><span className={`state-pill ${item.state.toLowerCase().replace(" ", "-")}`}>{item.state}</span></div>)}</div></section>
    </div>
  );
}
