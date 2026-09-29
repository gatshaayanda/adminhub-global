"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Gamepad2, Menu, MessageCircle, Smartphone, X } from "lucide-react";
import { useState } from "react";
import LogoMktMark from "@/components/LogoMktMark";

const nav = [
  { label: "Apps", href: "/apps", icon: Smartphone },
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Work", href: "/blog", icon: null },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const active = (href:string) => href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <header className="ah-header">
      <a href="#main" className="ah-skip">Skip to content</a>
      <div className="ah-nav">
        <Link href="/" className="ah-brand" onClick={() => setOpen(false)} aria-label="Admin Hub home">
          <span className="ah-brand-mark"><LogoMktMark className="h-7 w-7" /></span>
          <span className="ah-brand-word">ADMIN HUB</span>
        </Link>

        <nav className="ah-desktop-nav" aria-label="Primary navigation">
          {nav.map(item => {
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} className={active(item.href) ? "active" : ""}>
              {Icon ? <Icon size={16}/> : null}{item.label}
            </Link>;
          })}
        </nav>

        <div className="ah-nav-actions">
          <Link href="/contact" className="ah-header-link">Have an idea?</Link>
          <a className="ah-header-cta" href="https://wa.me/26778098928?text=Hi%20Admin%20Hub%2C%20I%20have%20an%20idea." target="_blank" rel="noreferrer">
            <MessageCircle size={17}/> Start a project <ArrowRight size={15}/>
          </a>
          <button className="ah-menu-button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>
      </div>

      {open && <div className="ah-mobile-menu">
        {nav.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}<ArrowRight size={16}/></Link>)}
        <Link href="/contact" onClick={() => setOpen(false)} className="ah-mobile-cta">Have an idea? Let’s build it <ArrowRight size={17}/></Link>
      </div>}
    </header>
  );
}
