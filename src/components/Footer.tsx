import Link from "next/link";
import { ArrowUpRight, Gamepad2, MessageCircle, Smartphone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="ah-footer">
      <div className="ah-footer-top">
        <div className="ah-footer-main">
          <div>
            <Link href="/" className="ah-footer-brand">ADMIN HUB</Link>
            <p className="ah-footer-tagline">Apps · Games · Products · Experiments</p>
            <p className="ah-footer-copy">Digital products built around what people actually need to do — from business tools to things worth playing.</p>
            <a className="ah-footer-whatsapp" href="https://wa.me/26778098928?text=Hi%20Admin%20Hub%2C%20I%20have%20an%20idea." target="_blank" rel="noreferrer">
              <MessageCircle size={17}/> DM Admin Hub <ArrowUpRight size={15}/>
            </a>
          </div>

          <div className="ah-footer-column">
            <span className="ah-footer-label">Explore</span>
            <Link href="/apps"><Smartphone size={15}/> Business Apps</Link>
            <Link href="/games"><Gamepad2 size={15}/> Games & Experiences</Link>
            <Link href="/blog">Work & Insights</Link>
            <Link href="/contact">Start a project</Link>
          </div>

          <div className="ah-footer-column">
            <span className="ah-footer-label">The idea</span>
            <span>Useful software.</span>
            <span>Playable products.</span>
            <span>Real-world experiments.</span>
            <span className="ah-footer-muted">Botswana · Remote / International</span>
          </div>
        </div>
      </div>
      <div className="ah-footer-bottom">
        <span>© {new Date().getFullYear()} AdminHub (Pty) Ltd</span>
        <span>Built in Botswana. Made to travel.</span>
        <Link href="/privacy">Privacy</Link>
      </div>
    </footer>
  );
}
