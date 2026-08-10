"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import SignalMark from "@/components/SignalMark";

const primaryNav = [
  { label: "Home", href: "/" },
  { label: "Universe", href: "/feed" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const insideDesk = pathname?.startsWith("/player/");

  return (
    <header className="site-header">
      <a href="#main" className="skip-link">Skip to content</a>

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
          <Link href={insideDesk ? pathname : "/#find-my-desk"} className="button button-dark header-join">
            {insideDesk ? "My Desk" : "Find my Desk"}
          </Link>
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
          <Link href={insideDesk ? pathname : "/#find-my-desk"} className="button button-lime">
            {insideDesk ? "My Desk" : "Find my Desk"}
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
