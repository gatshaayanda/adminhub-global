import type { Metadata, Viewport } from "next";
import styles from "./games.module.css";

const canonical = "https://www.adminhub-global.com/games";
const hallwayUrl = "https://admin-hub-games.vercel.app/";

export const metadata: Metadata = {
  title: { absolute: "Admin Hub Games — The 11th Iteration of Admin Hub" },
  description: "Admin Hub Games is the experimental games division of Admin Hub, building playable web worlds with Phaser, TypeScript and PWA technology.",
  applicationName: "Admin Hub Games",
  alternates: { canonical },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Admin Hub Games — The 11th Iteration of Admin Hub",
    description: "Playable worlds, experiments and games built by Admin Hub. Start with Hallway.",
    url: canonical,
    siteName: "Admin Hub",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090b16",
  colorScheme: "dark",
};

const steps = [
  ["01", "IDEA", "Find the hook. Keep the first version small enough to finish."],
  ["02", "DESIGN", "Turn the idea into a clear playable loop and visual identity."],
  ["03", "BUILD", "Use modern web tooling to make the thing actually work."],
  ["04", "PLAYTEST", "Put it in a browser. Find the friction. Fix what matters."],
  ["05", "SHIP", "Deploy it, document it and let the next iteration begin."],
];

export default function GamesPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Admin Hub Games">
        <a href="/games" className={styles.brand}>
          <span className={styles.mark}>AH</span>
          <span><b>ADMIN HUB</b><small>GAMES</small></span>
        </a>
        <div className={styles.navLinks}>
          <a href="#catalog">Catalog</a>
          <a href="#process">How we build</a>
          <a href="/ayanda">Founder</a>
        </div>
        <a className={styles.navPlay} href={hallwayUrl} target="_blank" rel="noreferrer">Play Hallway ↗</a>
      </nav>

      <section className={styles.hero}>
        <div className={styles.grid} aria-hidden="true" />
        <div className={styles.orbit} aria-hidden="true"><i /><i /><i /></div>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}><span className={styles.dot} /> THE 11TH ITERATION OF ADMIN HUB</p>
          <h1>We build <em>worlds.</em><br />You get to play them.</h1>
          <p className={styles.heroCopy}>
            Admin Hub Games is the experimental games division of Admin Hub —
            where practical web engineering meets play, interaction and imagination.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href="#catalog">Explore the catalog ↓</a>
            <a className={styles.textLink} href={hallwayUrl} target="_blank" rel="noreferrer">Enter Hallway ↗</a>
          </div>
          <div className={styles.meta}><span>BOTSWANA → EVERYWHERE</span><span>PHASER × TYPESCRIPT × WEB</span></div>
        </div>
      </section>

      <section className={styles.statement}>
        <span className={styles.sectionNo}>01 / A NEW DIVISION</span>
        <div>
          <h2>Admin Hub started with systems. Iteration 11 starts with play.</h2>
          <p>
            This is a living games pipeline, not a claim that everything has already
            been built. One operational game is the starting point. More worlds will
            be designed, tested and shipped from here.
          </p>
        </div>
      </section>

      <section id="catalog" className={styles.catalog}>
        <div className={styles.sectionHead}>
          <div><p className={styles.eyebrow}>02 / THE CATALOG</p><h2>Start with what exists.</h2></div>
          <p>No padded portfolio. No fake releases. The catalog grows as the games become real.</p>
        </div>

        <article className={styles.gameCard}>
          <div className={styles.visual}>
            <span className={styles.corner}>AHG / 001</span>
            <div className={styles.sign}><small>PLAYABLE WORLD</small><strong>HALLWAY</strong><span>OPERATIONAL</span></div>
            <div className={styles.path} aria-hidden="true">{[1,2,3,4,5].map(n => <i key={n} />)}</div>
          </div>
          <div className={styles.gameInfo}>
            <div className={styles.topline}><span>OPERATIONAL</span><small>PHASER / PWA</small></div>
            <h3>Hallway</h3>
            <p>
              The first playable world in the Admin Hub Games pipeline. Built as a
              browser game and designed to establish the foundation for the worlds that follow.
            </p>
            <div className={styles.tags}>{["Phaser","TypeScript","Vite","PWA","Web"].map(x => <span key={x}>{x}</span>)}</div>
            <a className={styles.play} href={hallwayUrl} target="_blank" rel="noreferrer">Play Hallway <b>↗</b></a>
          </div>
        </article>

        <div className={styles.pipelineNote}>
          <span className={styles.sectionNo}>IN THE PIPELINE</span>
          <h3>More games are coming.</h3>
          <p>New ideas earn their place here when they become playable — from first sketch to tested build to release.</p>
        </div>
      </section>

      <section id="process" className={styles.process}>
        <div className={styles.processIntro}>
          <p className={styles.eyebrow}>03 / THE BUILD LOOP</p>
          <h2>Idea → build → play → learn → ship.</h2>
          <p>The same product discipline used across Admin Hub projects gets applied to games: build something real, put it in front of people, inspect what happens and improve it.</p>
        </div>
        <div className={styles.steps}>
          {steps.map(([n,t,c]) => <article key={n}><span>{n}</span><h3>{t}</h3><p>{c}</p></article>)}
        </div>
      </section>

      <section className={styles.capabilities}>
        <div>
          <p className={styles.eyebrow}>04 / THE WORK BEHIND THE GAME</p>
          <h2>Games are still software.</h2>
          <p>Under the worlds are the same things that make a good product dependable: responsive interfaces, state, deployment, mobile behaviour, persistence, performance and a clear path from idea to user.</p>
        </div>
        <div className={styles.capGrid}>
          {[
            ["01","PLAYABLE WEB","Browser-first experiences without a traditional install."],
            ["02","PRODUCT THINKING","Small loops, clear feedback and a bias toward shipping."],
            ["03","MOBILE READY","Responsive layouts and PWA foundations for phones and desktop."],
            ["04","INDEPENDENT PIPELINE","A standalone catalog that grows as new games become real."],
          ].map(([n,t,c]) => <article key={n}><b>{n}</b><h3>{t}</h3><p>{c}</p></article>)}
        </div>
      </section>

      <section className={styles.cta}>
        <div><p className={styles.eyebrow}>05 / ENTER THE WORLD</p><h2>The catalog is open.</h2><p>Start with Hallway. Come back when the next world is ready.</p></div>
        <a className={styles.primary} href={hallwayUrl} target="_blank" rel="noreferrer">Play Hallway ↗</a>
      </section>

      <footer className={styles.footer}>
        <div><b>ADMIN HUB GAMES</b><p>The 11th iteration of Admin Hub.</p></div>
        <div className={styles.footerLinks}>
          <a href="/ayanda">Founder & portfolio</a>
          <a href="https://www.adminhub-global.com" target="_blank" rel="noreferrer">Admin Hub ↗</a>
          <a href="https://github.com/gatshaayanda/admin-hub-games" target="_blank" rel="noreferrer">GitHub ↗</a>
          <a href={hallwayUrl} target="_blank" rel="noreferrer">Play Hallway ↗</a>
        </div>
        <small>BUILT IN BOTSWANA · BUILT FOR THE WEB</small>
      </footer>
    </main>
  );
}
