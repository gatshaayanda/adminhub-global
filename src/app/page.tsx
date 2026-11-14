import Link from "next/link";
import HomeIntake from "@/components/HomeIntake";

export default function HomePage() {
  return (
    <div className="admin-home">
      <section className="flagship-intro" aria-labelledby="flagship-title">
        <div className="flagship-intro-copy">
          <p className="admin-kicker">ADMIN HUB GLOBAL / i13 B.O.S.</p>
          <h1 id="flagship-title">Your business.<br />Connected.</h1>
          <p className="flagship-lead">
            Explore a working Business Operating System, then create your own
            example around your business. See how your website, customer
            experience and owner workspace can work together.
          </p>
          <div className="flagship-actions">
            <Link className="admin-primary-button" href="https://iteration13.vercel.app/" target="_blank" rel="noreferrer">
              Create or explore a B.O.S. <span>↗</span>
            </Link>
            <a className="admin-text-link" href="#start">Apply to the waitlist ↓</a>
          </div>
          <p className="flagship-note">
            When you have created your example, copy its share link and include
            it in your application so we can review what you have in mind.
          </p>
        </div>
        <div className="flagship-preview" aria-label="i13 Business Operating System overview">
          <div className="flagship-preview-top"><span>i13 B.O.S.</span><span>BUSINESS OPERATING SYSTEM</span></div>
          <div className="flagship-preview-window">
            <div className="flagship-preview-brand"><span className="flagship-preview-mark">B.</span><span><strong>Your business</strong><small>Connected experiences</small></span></div>
            <div className="flagship-preview-panels">
              <div><span>01 / PUBLIC</span><strong>Website</strong><small>Showcase your business</small></div>
              <div><span>02 / CUSTOMERS</span><strong>Customer app</strong><small>Requests and accounts</small></div>
              <div><span>03 / OWNER</span><strong>Briefcase</strong><small>Manage your operations</small></div>
            </div>
            <div className="flagship-preview-foot"><span>ONE CONNECTED BUSINESS</span><span>EXPLORE ↗</span></div>
          </div>
        </div>
      </section>
      <HomeIntake />
      <section className="flagship-how">
        <p className="admin-kicker">A SIMPLE NEXT STEP</p>
        <h2>Try it. Share it. Let’s see if we’re a fit.</h2>
        <p>Applications are reviewed by Admin Hub. The minimum starting commitment is US$25 for 30 days after acceptance and onboarding. Applicants able to commit more may receive higher waitlist priority. Final scope and terms are confirmed before anything starts.</p>
      </section>
    </div>
  );
}
