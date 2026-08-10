"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Radio, X } from "lucide-react";
import SignalMark from "@/components/SignalMark";

const primaryNav = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Around BoardSignal", href: "/feed" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <header className="site-header">
      <a href="#main" className="skip-link">Skip to content</a>

      <div className="news-ticker">
        <div className="container ticker-inner">
          <span className="ticker-label"><Radio size={13} /> Founder beta</span>
          <span className="ticker-copy">One player · one fixed week · one clear next action</span>
          <span className={online ? "status-dot online" : "status-dot"}>
            {online ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      <div className="container masthead">
        <Link href="/" className="brand-lockup" aria-label="BoardSignal home">
          <SignalMark className="brand-mark" />
          <span>
            <span className="brand-name">BoardSignal</span>
            <span className="brand-line">The personal sports desk for everyday chess players</span>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} className={active(item.href) ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link href="/player/Ayandakopano" className="header-room-link">Completed example</Link>
          <Link href="/#find-my-desk" className="button button-dark header-join">Find my Desk</Link>
          <button
            type="button"
            className="menu-button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="mobile-nav container" aria-label="Mobile navigation">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} className={active(item.href) ? "active" : ""}>
              {item.label}
            </Link>
          ))}
          <Link href="/player/Ayandakopano">Completed example</Link>
          <Link href="/#find-my-desk" className="button button-lime">Find my Desk</Link>
        </nav>
      ) : null}
    </header>
  );
}
