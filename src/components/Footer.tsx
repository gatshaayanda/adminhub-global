import Link from "next/link";
import {BriefcaseBusiness} from "lucide-react";

export default function Footer() {
  return (
    <footer className="ah-footer ah-connected-footer">
      <div className="ah-footer-top">
        <div className="ah-footer-main">
          <div>
            <Link href="/" className="ah-footer-brand">ADMIN HUB GLOBAL</Link>
            <p className="ah-footer-tagline">YOUR DIGITAL WORLD, CONNECTED.</p>
            <p className="ah-footer-copy">One connected environment for personal organisation and business operations. Explore the spaces, then make them yours.</p>
          </div>
          <div className="ah-footer-column">
            <span className="ah-footer-label">Explore the spaces</span>
            <Link href="/#spaces">The connected environment</Link>
            <a href="https://iteration14.vercel.app/" target="_blank" rel="noreferrer">BACKPACK OS · Personal ↗</a>
            <a href="https://iteration13.vercel.app/" target="_blank" rel="noreferrer">B.O.S. · Business ↗</a>
            <Link href="/contact">Talk to Admin Hub</Link>
          </div>
          <div className="ah-footer-column">
            <span className="ah-footer-label">Admin Hub</span>
            <span>Onboarding & design refinement</span>
            <span>Platform infrastructure</span>
            <span>Ongoing operation</span>
            <span className="ah-footer-muted">Botswana · International</span>
          </div>
        </div>
      </div>
      <div className="ah-footer-bottom">
        <span>© {new Date().getFullYear()} Admin Hub Global</span>
        <Link href="/privacy">Privacy</Link>
        <Link href="/admin" className="ah-owner-briefcase" aria-label="Open owner briefcase" title="Owner briefcase"><BriefcaseBusiness size={18} strokeWidth={2.1}/><span>Owner Briefcase</span></Link>
      </div>
    </footer>
  );
}
