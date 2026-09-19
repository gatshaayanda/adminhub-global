import type { Metadata, Viewport } from "next";
import styles from "./games.module.css";

const canonical = "https://www.adminhub-global.com/games";
const hallwayUrl = "https://admin-hub-games.vercel.app/";

export const metadata: Metadata = {
  title: { absolute: "Admin Hub Games — The 11th Iteration of Admin Hub" },
  description: "Admin Hub Games builds playable web games. Start with Hallway.",
  alternates: { canonical },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Admin Hub Games — The 11th Iteration of Admin Hub",
    description: "Playable web games built by Admin Hub. Start with Hallway.",
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
        <a className={styles.navPlay} href={hallwayUrl} target="_blank" rel="noreferrer">Play Hallway ↗</a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>THE 11TH ITERATION OF ADMIN HUB</p>
          <h1>We build <em>games.</em></h1>
          <p className={styles.intro}>
            Admin Hub Games is where we turn practical web engineering into playable experiences.
          </p>
          <a className={styles.primary} href={hallwayUrl} target="_blank" rel="noreferrer">
            Play Hallway ↗
          </a>
          <p className={styles.meta}>BOTSWANA · PHASER · TYPESCRIPT · WEB</p>
        </div>
      </section>

      <section className={styles.catalog}>
        <p className={styles.eyebrow}>THE CATALOG</p>
        <div className={styles.card}>
          <div className={styles.cardVisual}>
            <span>AHG / 001</span>
            <strong>HALLWAY</strong>
            <small>OPERATIONAL</small>
          </div>
          <div className={styles.cardBody}>
            <p className={styles.status}>PLAYABLE NOW</p>
            <h2>Hallway</h2>
            <p>A browser game built with Phaser, TypeScript, Vite and PWA foundations.</p>
            <a className={styles.primary} href={hallwayUrl} target="_blank" rel="noreferrer">Enter Hallway ↗</a>
          </div>
        </div>
        <p className={styles.next}>More games will appear here as they become real, playable releases.</p>
      </section>

      <footer className={styles.footer}>
        <div>
          <strong>ADMIN HUB GAMES</strong>
          <p>The 11th iteration of Admin Hub.</p>
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
