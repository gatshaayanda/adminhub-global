"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="ah-header ah-connected-header">
      <a href="#main" className="ah-skip">Skip to content</a>
      <div className="ah-nav">
        <Link href="/" className="ah-brand ah-connected-brand" aria-label="Admin Hub Global home">
          <span className="ah-connected-brand-mark" aria-hidden="true"><i /><i /></span>
          <span className="ah-brand-word">ADMIN HUB GLOBAL</span>
        </Link>
        <nav className="ah-desktop-nav" aria-label="Primary navigation">
          <Link href="/#spaces">The two spaces</Link>
          <Link href="/#package">The package</Link>
          <Link className="ah-connected-nav-cta" href="/contact">Get in touch <span aria-hidden="true">↗</span></Link>
        </nav>
      </div>
    </header>
  );
}
