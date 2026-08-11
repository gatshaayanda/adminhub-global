import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { pipeline } from "@/data/boardsignal";

export default function FounderNewsroomPage() {
  return (
    <div id="main" className="container admin-shell">
      <header className="admin-heading"><div><p className="kicker">Founder access · Editorial control</p><h1>Founder Newsroom</h1></div><Link href="/admin/coverage" className="button button-lime">Edit the front page</Link></header>
      <AdminNav />
      <div className="admin-metrics"><div className="metric-card lime"><span>Members</span><strong>13</strong><p>Completed beta Desks</p></div><div className="metric-card"><span>Processing</span><strong>1</strong><p>Inside the desk pipeline</p></div><div className="metric-card"><span>Review</span><strong>1</strong><p>Needs editorial judgment</p></div><div className="metric-card blue"><span>Ready</span><strong>2</strong><p>Awaiting delivery</p></div></div>
      <section className="desk-section"><p className="kicker">Today&apos;s production</p><h2>The system writes. You supervise the exceptions.</h2><div className="pipeline-list">{pipeline.map((item) => <div className="pipeline-row" key={item.player}><strong>{item.player}</strong><span>{item.period}</span><span>{item.games} games</span><span className={`state-pill ${item.state.toLowerCase().replace(" ", "-")}`}>{item.state}</span></div>)}</div></section>
    </div>
  );
}

