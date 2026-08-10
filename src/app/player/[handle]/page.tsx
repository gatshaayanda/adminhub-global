import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { leadStory } from "@/data/boardsignal";

export const metadata = { title: "Player Coverage" };

export default async function PublicPlayerPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <div id="main" className="interior-page"><header className="interior-hero"><div className="container"><p className="kicker">Public player page · Approved coverage only</p><h1>Player 001 found the run that changed the week.</h1><p className="standfirst">{leadStory.summary}</p></div></header><section className="container section-pad"><div className="dashboard-grid"><article className="scoreboard-card lime-card"><span className="scoreboard-label">{handle.replaceAll("-", " ")}</span><strong className="scoreboard-stat">8</strong><span className="scoreboard-detail">wins in a row</span><p>No weaknesses, private signals or unapproved game links appear on this page.</p></article><article className="desk-section" style={{ marginTop: 0 }}><p className="kicker">Why it mattered</p><h2>The opening did not get the final word.</h2><p>The positive run supplied a concrete counter-story to the difficult start. It is the kind of moment BoardSignal can celebrate without exposing the private development work inside the player&apos;s Desk.</p><div className="interior-actions"><Link href="/join" className="button button-lime">See what my week says <ArrowRight size={17} /></Link></div></article></div></section></div>;
}
