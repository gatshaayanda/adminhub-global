import Link from "next/link";
import { ArrowRight, CalendarDays, ChartNoAxesCombined, CircleCheckBig, ScanSearch } from "lucide-react";

export const metadata = { title: "How It Works" };

const stages = [
  { icon: ScanSearch, title: "Confirm the player", copy: "You give BoardSignal your Chess.com username and timezone. We verify the public profile before retrieving games." },
  { icon: CalendarDays, title: "Close the period", copy: "The Desk uses one exact, completed seven-calendar-day block. It does not slide forward daily or cherry-pick a game count." },
  { icon: ChartNoAxesCombined, title: "Build the evidence", copy: "Games are reconstructed, counted and grouped into days, sessions, streaks, openings, clock patterns and candidate turning points." },
  { icon: CircleCheckBig, title: "Publish the episode", copy: "The facts become a Replay, a Blue Signal and a short plan—specific enough to use, restrained enough to trust." },
];

export default function HowItWorksPage() {
  return (
    <div id="main" className="interior-page">
      <header className="interior-hero">
        <div className="container">
          <p className="kicker">Username → games → Desk</p>
          <h1>Your username opens one clear week.</h1>
          <p className="standfirst">BoardSignal does complex work behind the scenes, but the player experience stays simple: confirm who you are, understand the week, reach the signal and open the evidence.</p>
        </div>
      </header>
      <section className="container section-pad">
        <div className="content-grid">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <article className="info-card" key={stage.title}>
                <div className="info-card-icon"><Icon size={20} /></div>
                <p className="kicker">Stage {String(index + 1).padStart(2, "0")}</p>
                <h3>{stage.title}</h3>
                <p>{stage.copy}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="paper-band">
        <div className="container section-pad privacy-callout">
          <div><p className="kicker">What the player sees</p><h2>Complex work behind one clear screen.</h2></div>
          <div><p>Your Desk is ready.</p><p><strong>3–9 August · 36 games · 20W 14L 2D · +47</strong></p><p>A week that turned around after Thursday&apos;s slide.</p></div>
        </div>
      </section>
      <section className="container section-pad">
        <Link href="/#find-my-desk" className="button button-lime">Find my Desk <ArrowRight size={17} /></Link>
      </section>
    </div>
  );
}
