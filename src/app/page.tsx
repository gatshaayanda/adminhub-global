import Link from "next/link";

const backpackUrl = "https://iteration14.vercel.app/";
const businessUrl = "https://iteration13.vercel.app/";

function BackpackMark() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 15v-3.5A5.5 5.5 0 0 1 20.5 6h7a5.5 5.5 0 0 1 5.5 5.5V15" /><path d="M10 17.5A4.5 4.5 0 0 1 14.5 13h19a4.5 4.5 0 0 1 4.5 4.5l2 20A4.5 4.5 0 0 1 35.5 42h-23A4.5 4.5 0 0 1 8 37.5z" /><path d="M15 27h18v10H15zM19 27v-3a5 5 0 0 1 10 0v3M24 31v2" /></svg>;
}

function BriefcaseMark() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5.5" y="14" width="37" height="27" rx="4" /><path d="M17 14v-3a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v3M5.5 24h37M20 23v4h8v-4" /></svg>;
}

export default function HomePage() {
  return (
    <div className="ah-connected-home">
      <section className="ah-connected-hero">
        <div className="ah-connected-shell ah-connected-hero-grid">
          <div>
            <p className="ah-connected-eyebrow">Admin Hub Global · One connected digital environment</p>
            <h1>Your digital world, <em>connected.</em></h1>
            <p className="ah-connected-lead">A personal space for life. A business space for work. One connected environment you can explore first, then shape around the way you want to operate.</p>
            <div className="ah-connected-actions">
              <a className="ah-connected-button" href="#spaces">Explore the two spaces <span aria-hidden="true">↓</span></a>
              <Link className="ah-connected-button ah-connected-button-secondary" href="/contact">Talk to Admin Hub <span aria-hidden="true">↗</span></Link>
            </div>
            <p className="ah-connected-microcopy">Start with the live experiences. Decide what you need after you have seen how they work.</p>
          </div>

          <div className="ah-connected-diagram" role="img" aria-label="One Admin Hub environment connects Backpack OS for personal organisation with B.O.S. for business operations">
            <div className="ah-connected-diagram-top"><span>One environment</span><span>Two operating spaces</span></div>
            <div className="ah-connected-network">
              <div className="ah-connected-node ah-connected-node-personal">
                <span className="ah-connected-node-kicker">PERSONAL</span>
                <strong>BACKPACK OS</strong>
                <small>Your life, organised around you.</small>
                <ul><li>Engagements</li><li>People & conversations</li><li>Resources</li><li>Private spaces</li></ul>
              </div>
              <div className="ah-connected-bridge"><div className="ah-connected-hub"><b>ADMIN<br/>HUB</b><small>GLOBAL</small></div></div>
              <div className="ah-connected-node ah-connected-node-business">
                <span className="ah-connected-node-kicker">BUSINESS</span>
                <strong>B.O.S.</strong>
                <small>Your business, in one workspace.</small>
                <ul><li>Branded storefront</li><li>Customer accounts</li><li>Requests & updates</li><li>Owner Briefcase</li></ul>
              </div>
            </div>
            <div className="ah-connected-diagram-bottom"><span>One starting point</span><strong>Connected by Admin Hub</strong></div>
          </div>
        </div>
      </section>

      <section className="ah-connected-section" id="spaces">
        <div className="ah-connected-shell">
          <div className="ah-connected-section-heading">
            <div>
              <p className="ah-connected-eyebrow">The connected environment</p>
              <h2>Two spaces. One bigger picture.</h2>
            </div>
            <p>They are not competing products. Each space has a distinct job, and both belong to the same digital environment provided and supported by Admin Hub Global.</p>
          </div>

          <div className="ah-connected-spaces">
            <article className="ah-connected-space ah-connected-space-personal">
              <div className="ah-connected-space-top"><span>01 / PERSONAL</span><span>BACKPACK OS</span></div>
              <div className="ah-connected-space-mark"><BackpackMark /></div>
              <h3>BACKPACK OS</h3>
              <p className="ah-connected-space-subtitle">Your Personal Operating System.</p>
              <p className="ah-connected-space-copy">A place to organise your engagements, people, conversations, resources and private spaces — with room to create spaces around the things that matter to you.</p>
              <ul className="ah-connected-space-features"><li>Personal organisation</li><li>People & conversations</li><li>Private spaces</li><li>Your own engagements</li></ul>
              <a className="ah-connected-space-link" href={backpackUrl} target="_blank" rel="noreferrer"><span>Explore the live BACKPACK OS experience</span><span aria-hidden="true">↗</span></a>
            </article>

            <article className="ah-connected-space ah-connected-space-business">
              <div className="ah-connected-space-top"><span>02 / BUSINESS</span><span>B.O.S.</span></div>
              <div className="ah-connected-space-mark"><BriefcaseMark /></div>
              <h3>B.O.S.</h3>
              <p className="ah-connected-space-subtitle">Your Business Operating System.</p>
              <p className="ah-connected-space-copy">A branded business environment that brings your storefront, customer accounts, requests, communications and the owner's Briefcase into one operating flow.</p>
              <ul className="ah-connected-space-features"><li>Branded storefront</li><li>Customer accounts</li><li>Requests & communication</li><li>Owner Briefcase</li></ul>
              <a className="ah-connected-space-link" href={businessUrl} target="_blank" rel="noreferrer"><span>Explore the live B.O.S. experience</span><span aria-hidden="true">↗</span></a>
            </article>
          </div>
        </div>
      </section>

      <section className="ah-connected-section ah-connected-package" id="package">
        <div className="ah-connected-shell">
          <div className="ah-connected-package-head">
            <div><p className="ah-connected-eyebrow">The Admin Hub package</p><h2>Not just a website. An environment that keeps working.</h2></div>
            <p>Admin Hub provides the connected environment, helps you make it yours, and supports the platform beyond the initial setup.</p>
          </div>
          <div className="ah-connected-includes">
            <div className="ah-connected-include"><b>BACKPACK OS</b><p>Your personal operating environment.</p></div>
            <div className="ah-connected-include"><b>B.O.S.</b><p>Your business operating environment.</p></div>
            <div className="ah-connected-include"><b>Interactive prototypes</b><p>Explore real experiences before committing.</p></div>
            <div className="ah-connected-include"><b>Onboarding & refinement</b><p>Shape the experience around your needs.</p></div>
            <div className="ah-connected-include"><b>Ongoing operation</b><p>Platform infrastructure and continued operation.</p></div>
          </div>
          <div className="ah-connected-capacity">
            <div className="ah-connected-capacity-number">25GB / month</div>
            <div className="ah-connected-capacity-copy"><strong>Shared platform infrastructure allowance.</strong> This is a defined capacity allowance — not a promise of unlimited storage, traffic or activity. The practical scope is agreed during onboarding.</div>
          </div>
        </div>
      </section>

      <section className="ah-connected-section">
        <div className="ah-connected-shell">
          <div className="ah-connected-section-heading">
            <div><p className="ah-connected-eyebrow">A clear path from exploring to operating</p><h2>Experience it. Shape it. Make it yours.</h2></div>
            <p>You do not need to understand every technical detail before you begin. Start by seeing what the environment can do.</p>
          </div>
          <div className="ah-connected-steps">
            <article className="ah-connected-step"><span className="ah-connected-step-number">STEP 01</span><h3>Explore</h3><p>Open the working prototypes and experience the personal and business spaces for yourself.</p></article>
            <article className="ah-connected-step"><span className="ah-connected-step-number">STEP 02</span><h3>Make it yours</h3><p>Discuss your needs, onboarding, access, privacy and the design refinements that make the environment fit.</p></article>
            <article className="ah-connected-step"><span className="ah-connected-step-number">STEP 03</span><h3>Keep it running</h3><p>Admin Hub provides the platform operation and ongoing infrastructure within the agreed capacity and support scope.</p></article>
          </div>
        </div>
      </section>

      <section className="ah-connected-section">
        <div className="ah-connected-shell ah-connected-trust">
          <div><p className="ah-connected-eyebrow">Clarity & control</p><h2>See what you are stepping into.</h2></div>
          <div className="ah-connected-trust-copy">
            <p>Both spaces are designed to be explored before you decide. You can understand the experience first, then discuss how your own spaces, people, information and access should be organised.</p>
            <p>Privacy and permissions are part of the setup conversation — not something hidden behind a sales promise. We will agree what is public, what is private, who can access each space and what ongoing operation covers.</p>
            <Link className="ah-connected-space-link" href="/contact"><span>Ask a question or discuss your environment</span><span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="ah-connected-final">
        <div className="ah-connected-shell ah-connected-final-inner">
          <div><p className="ah-connected-eyebrow">Admin Hub Global</p><h2>Bring your digital world together.</h2><p>Explore the live spaces today. When you are ready, we can talk about the environment you want to build around them.</p></div>
          <Link className="ah-connected-button" href="/contact">Start a conversation <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </div>
  );
}
