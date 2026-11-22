import HomeProofCarousel from "@/components/HomeProofCarousel";

const backpackUrl = "https://iteration14.vercel.app/";
const businessUrl = "https://iteration13.vercel.app/";

export default function HomePage() {
  return (
    <div className="ah-connected-home">
      <section className="ah-connected-hero">
        <div className="ah-connected-shell">
          <p className="ah-connected-eyebrow">ADMIN HUB GLOBAL PRESENTS</p>
        </div>
      </section>

      <section className="ah-connected-section" id="spaces">
        <div className="ah-connected-shell">
          <div className="ah-connected-section-heading">
            <div>
              <p className="ah-connected-eyebrow">OPEN A SYSTEM. MAKE IT YOURS.</p>
              <h2>Choose where you want to start.</h2>
            </div>
            <p>These are working experiences, not just product pictures. Open either one and try it for yourself.</p>
          </div>

          <div className="ah-connected-spaces">
            <article className="ah-connected-space">
              <div className="ah-connected-space-top"><span>SYSTEM 01</span><span>FOR BUSINESS</span></div>
              <div className="ah-connected-space-heading">
                <div>
                  <h3>B.O.S.</h3>
                  <p className="ah-connected-space-subtitle">Business Operating System</p>
                </div>
                <a className="ah-connected-emoji-button" href={businessUrl} target="_blank" rel="noreferrer" aria-label="Open the Business Operating System demo" title="Open B.O.S.">💼</a>
              </div>
              <p className="ah-connected-space-copy">A connected business experience that brings your public storefront, customer requests, customer accounts and owner workspace together.</p>
              <ul className="ah-connected-space-features">
                <li>Storefront for your customers</li>
                <li>Customer accounts and requests</li>
                <li>Owner Briefcase for daily operations</li>
              </ul>
              <p className="ah-connected-space-instruction">Tap the briefcase to open the live business experience.</p>
            </article>

            <article className="ah-connected-space">
              <div className="ah-connected-space-top"><span>SYSTEM 02</span><span>FOR EVERYDAY LIFE</span></div>
              <div className="ah-connected-space-heading">
                <div>
                  <h3>BACKPACK OS</h3>
                  <p className="ah-connected-space-subtitle">Personal Operating System</p>
                </div>
                <a className="ah-connected-emoji-button" href={backpackUrl} target="_blank" rel="noreferrer" aria-label="Open the Backpack OS demo" title="Open Backpack OS">🎒</a>
              </div>
              <p className="ah-connected-space-copy">A personal space to organise your Backpacks, channels, people, updates and private spaces — and create spaces for the things you care about.</p>
              <ul className="ah-connected-space-features">
                <li>Personal Backpacks and spaces</li>
                <li>Channels, circles and people</li>
                <li>Updates and private workspaces</li>
              </ul>
              <p className="ah-connected-space-instruction">Tap the backpack to open the live personal experience.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="ah-connected-package" id="package">
        <div className="ah-connected-shell">
          <div className="ah-connected-includes">
            <div><b>BACKPACK OS</b><p>Your personal operating environment.</p></div>
            <div><b>B.O.S.</b><p>Your business operating environment.</p></div>
            <div><b>Setup & refinement</b><p>Make the experience fit your needs.</p></div>
            <div><b>Ongoing operation</b><p>Infrastructure and support within an agreed scope.</p></div>
          </div>
          <p className="ah-connected-capacity"><strong>25GB / month shared infrastructure allowance.</strong> Capacity and support are agreed during onboarding; this is not an unlimited-use promise.</p>
        </div>
      </section>

      <section className="ah-connected-founder" aria-label="Founder references">
        <div className="ah-connected-shell">
          <p className="ah-connected-eyebrow">THE PERSON BEHIND THE WORK</p>
          <h2>Meet the founder.</h2>
          <HomeProofCarousel />
        </div>
      </section>
    </div>
  );
}
