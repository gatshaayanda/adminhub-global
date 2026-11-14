import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";

export default function Footer() {
  return (
    <footer className="ah-footer">
      <div className="ah-footer-top">
        <div className="ah-footer-main">
          <div>
            <Link href="/" className="ah-footer-brand">ADMIN HUB GLOBAL</Link>
            <p className="ah-footer-tagline">i13 B.O.S. · BUSINESS OPERATING SYSTEMS</p>
            <p className="ah-footer-copy">Your business. Connected.</p>
          </div>
          <div className="ah-footer-column">
            <span className="ah-footer-label">Explore</span>
            <Link href="/">Home</Link>
            <a href="https://iteration13.vercel.app/" target="_blank" rel="noreferrer">Explore i13 B.O.S. ↗</a>
            <Link href="/#start">Join the waitlist</Link>
          </div>
          <div className="ah-footer-column">
            <span className="ah-footer-label">Admin Hub</span>
            <span>Business Operating Systems</span>
            <span>Built for real businesses.</span>
            <span className="ah-footer-muted">Botswana · International</span>
          </div>
        </div>
      </div>
      <div className="ah-footer-bottom">
        <span>© {new Date().getFullYear()} Admin Hub Global</span>
        <Link href="/privacy">Privacy</Link>
        <Link href="/admin" className="ah-owner-briefcase" aria-label="Open owner briefcase" title="Owner briefcase">
          <BriefcaseBusiness size={18} strokeWidth={2.1} />
          <span>Owner Briefcase</span>
        </Link>
      </div>
    </footer>
  );
}
