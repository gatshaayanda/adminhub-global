import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";

export const metadata = { title: "Join BoardSignal" };

export default function JoinPage() {
  return (
    <div id="main" className="interior-page">
      <header className="interior-hero"><div className="container"><p className="kicker">Create your Player Room</p><h1>Your first Desk starts with you—not a payment form.</h1><p className="standfirst">Create the account you will use to receive private coverage and control what, if anything, becomes public.</p></div></header>
      <section className="container section-pad">
        <form className="form-card">
          <div className="field-grid">
            <div className="field"><label htmlFor="name">Display name</label><input id="name" name="name" placeholder="Ayanda" /></div>
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" placeholder="you@example.com" /></div>
            <div className="field full-span"><label htmlFor="password">Password</label><input id="password" name="password" type="password" placeholder="At least 8 characters" /></div>
          </div>
          <p className="helper-copy"><LockKeyhole size={14} style={{ display: "inline", marginRight: 6 }} />This is a seeded shell. Account creation is not connected yet.</p>
          <div className="interior-actions"><Link href="/connect" className="button button-lime">Continue to Chess.com <ArrowRight size={17} /></Link><Link href="/app" className="text-link">Preview the Player Room</Link></div>
        </form>
      </section>
    </div>
  );
}
