import PlayerHeader from "@/components/PlayerHeader";
import PlayerNav from "@/components/PlayerNav";
import { coverageStories } from "@/data/boardsignal";

export const metadata = { title: "My Feed" };

export default function PersonalFeedPage() {
  return <div id="main" className="container player-shell"><PlayerHeader /><PlayerNav /><section className="desk-section"><p className="kicker">My public activity</p><h2>You decide what leaves the Room.</h2><p>No weaknesses are published here. This preview shows the positive coverage you could approve for your public player page.</p><div className="coverage-grid" style={{ marginTop: "1.5rem" }}>{coverageStories.slice(0, 2).map((story) => <article className={`coverage-card tone-${story.tone}`} key={story.id}><p className="story-kicker">Draft · Not public</p><h3>{story.headline}</h3><p>{story.summary}</p><div className="coverage-stat"><strong>{story.stat}</strong><span>{story.detail}</span></div></article>)}</div></section></div>;
}

