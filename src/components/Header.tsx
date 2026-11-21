"use client";
import Link from "next/link";
export default function Header(){return <header className="ah-header"><a href="#main" className="ah-skip">Skip to content</a><div className="ah-nav"><Link href="/" className="ah-brand" aria-label="Admin Hub home"><span className="ah-box-mark" aria-hidden="true"><span>iB</span><small>O.S.</small></span><span className="ah-brand-word">ADMIN HUB</span></Link><nav className="ah-desktop-nav" aria-label="Primary navigation"><Link href="/#ibos-title">iB O.S.</Link></nav></div></header>;}
