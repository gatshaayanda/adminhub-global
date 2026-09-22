import type { Metadata, Viewport } from "next";
import styles from "./games.module.css";

const canonical = "https://www.adminhub-global.com/games";
const gamesHubUrl = "https://admin-hub-games.vercel.app/";

export const metadata: Metadata = {
  title: { absolute: "Admin Hub Games — Browser Games in Development" },
  description: "Admin Hub Games is an evolving browser-game lab building playable worlds, systems and reusable game foundations.",
  alternates: { canonical },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Admin Hub Games — Browser Games in Development",
    description: "Playable browser games and game systems being built by Admin Hub.",
    url: canonical,
    siteName: "Admin Hub",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080d16",
  colorScheme: "dark",
};

export default function GamesPage() {
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <a href="/games" className={styles.brand}>
          <span className={styles.mark}>AH</span>
          <span><strong>ADMIN HUB</strong><small>GAMES</small></span>
        </a>
        <a className={styles.navPlay} href={gamesHubUrl} target="_blank" rel="noreferrer">Enter Game Library ↗</a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>ADMIN HUB GAMES · BROWSER GAME DEVELOPMENT</p>
          <h1>Games are being <em>built here.</em></h1>
          <p className={styles.intro}>
            An evolving game lab where practical web engineering becomes playable systems:
            movement, combat, interaction, narrative, progression and mobile-first experiences.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primary} href={gamesHubUrl} target="_blank" rel="noreferrer">
              Enter the Game Library ↗
            </a>
            <span className={styles.actionNote}>Live builds · experiments · active development</span>
          </div>
          <p className={styles.meta}>BOTSWANA · PHASER · TYPESCRIPT · VITE · PWA · WEB</p>
        </div>
      </section>

      <section className={styles.current}>
        <div className={styles.currentCopy}>
          <p className={styles.eyebrow}>CURRENT BUILD</p>
          <h2>Shooters Trigger</h2>
          <p>
            A mobile-first paintball game now being developed as the next step in the
            platform: shooting, evasion, equipment, field reporting and a one-on-one arena.
            The point is not just to make a game — it is to build reusable game systems that
            can make the next game possible.
          </p>
          <a className={styles.secondary} href={gamesHubUrl} target="_blank" rel="noreferrer">
            Play the current build ↗
          </a>
        </div>
        <div className={styles.systems} aria-label="Current development areas">
          <span>COMBAT</span>
          <span>MOBILE CONTROLS</span>
          <span>GAME STATE</span>
          <span>AI OPPONENTS</span>
          <span>PROGRESSION</span>
          <span>PWA</span>
        </div>
      </section>

      <section className={styles.catalog}>
        <p className={styles.eyebrow}>THE DEVELOPMENT PATH</p>
        <div className={styles.pathGrid}>
          <article>
            <span>01 · FOUNDATION</span>
            <h3>Hall</h3>
            <p>The early playable world used to establish the shared shell, interaction model and reusable game foundations.</p>
          </article>
          <article>
            <span>02 · STORY SYSTEMS</span>
            <h3>President&apos;s Shoes</h3>
            <p>A fictional branching decision game that pushed the platform into data-driven story, consequence and local state.</p>
          </article>
          <article className={styles.activePath}>
            <span>03 · ACTIVE DEVELOPMENT</span>
            <h3>Shooters Trigger</h3>
            <p>The current build brings those foundations into a deeper real-time game: movement, combat, pressure, evidence and replayable systems.</p>
          </article>
        </div>
        <p className={styles.next}>
          These are not separate one-off projects. Each playable build is a step toward making the next game more capable.
        </p>
      </section>

      <footer className={styles.footer}>
        <div>
          <strong>ADMIN HUB GAMES</strong>
          <p>Playable software experiments becoming a game platform.</p>
        </div>
        <div className={styles.footerLinks}>
          <a href="/ayanda">Founder & portfolio</a>
          <a href="https://www.adminhub-global.com" target="_blank" rel="noreferrer">Admin Hub ↗</a>
          <a href="https://github.com/gatshaayanda/admin-hub-games" target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      </footer>
    </main>
  );
}
