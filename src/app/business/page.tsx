import Link from "next/link";
import HomeProofCarousel from "@/components/HomeProofCarousel";

export const metadata = {
  title: "Business | Admin Hub",
  description: "How Admin Hub works commercially, what ongoing app support costs, and how to verify and pay Admin Hub (Pty) Ltd.",
};

export default function BusinessPage() {
  return (
    <div className="admin-business">
      <div className="admin-business-shell">
        <section className="admin-business-hero">
          <div>
            <p className="admin-kicker">ADMIN HUB / BUSINESS</p>
            <h1>Build first.<br />Make it useful.<br />Keep it fair.</h1>
            <p className="admin-business-lead">
              A branded app for your business. Illustrative running cost: $25/month — about the price of airtime. Any setup/build fee is agreed in writing before work starts.
            </p>
            <div className="admin-business-actions">
              <Link className="admin-text-link" href="/">
                Back to the work
              </Link>
            </div>
          </div>
          <div className="admin-business-note">
            <strong>Simple monthly running cost. Clear setup cost.</strong>
            <span>We agree the scope and budget first. Suitable small-business pilots may qualify for a reduced or waived setup fee.</span>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">01 / THE MODEL</p>
              <h2>Your app. Your brand. A cost agreed upfront.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                The $25 is an example of monthly running costs, not a universal price. We agree what your business needs and can afford first.
              </p>
              <div className="admin-business-price">
                <strong>$25/month</strong>
                <span>An illustrative running-cost example — about the price of airtime.</span>
              </div>
              <div className="admin-business-price">
                <strong>What does usage look like?</strong>
                <span>500 people × 50 MB/month ≈ 25 GB of data transfer. That is data moving through the app, not stored files. Actual usage and costs are agreed before launch.</span>
              </div>
              <div className="admin-business-cards">
                <div className="admin-business-card">
                  <strong>Start small</strong>
                  <p>Begin with the main thing your customers need to do.</p>
                </div>
                <div className="admin-business-card">
                  <strong>Fund it deliberately</strong>
                  <p>Any one-time setup or build fee is discussed and agreed before work starts. For suitable pilots, it may be reduced or waived.</p>
                </div>
                <div className="admin-business-card">
                  <strong>Agree the next step</strong>
                  <p>Make changes as needed and agree on any extra work before it begins.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">02 / SETUP FEES</p>
              <h2>Know the setup cost before we start.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                For suitable small-business pilots or partnerships, setup/build fees may be reduced or waived so the business can test a real product first.
              </p>
              <p style={{ marginTop: 18 }}>
                Custom work is not automatically free. We agree larger scopes in writing before work starts. No retroactive setup charge.
              </p>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">03 / WHAT YOU GET</p>
              <h2>Useful software, built around your business.</h2>
            </div>
            <div className="admin-business-copy">
              <div className="admin-business-list">
                <div><b>Working software</b><span>A real mobile-first product, not just a proposal or mock-up.</span></div>
                <div><b>Business workflow</b><span>Ordering, booking, requests, progress, dashboards or another clearly defined first workflow.</span></div>
                <div><b>Funding model</b><span>We can discuss upfront capital, a minimal operating contribution, or whether orders/bookings facilitated by the product can help fund its ongoing cost.</span></div>
                <div><b>Iteration</b><span>Feedback from real use can shape the next change instead of guessing everything upfront.</span></div>
                <div><b>Support</b><span>Small operational fixes and agreed ongoing support are kept separate from larger new development.</span></div>
                <div><b>Clear scope</b><span>New features, third-party services and substantial changes are discussed before they become charges.</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">04 / VERIFICATION</p>
              <h2>A real Botswana business.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                <strong>ADMIN HUB PTY LTD</strong> is registered in Botswana with CIPA. Check the company, inspect published apps, and contact Admin Hub directly.
              </p>
              <div className="admin-business-actions">
                <a
                  className="admin-primary-button"
                  href="https://www.cipa.co.bw/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Verify through CIPA <span>↗</span>
                </a>
                <a
                  className="admin-text-link"
                  href="https://www.adminhub-global.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  View Admin Hub <span>↗</span>
                </a>
              </div>
              <p className="admin-business-small">
                CIPA is Botswana&apos;s official company-registration authority.
              </p>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">05 / INDEPENDENT REVIEWS</p>
              <h2>Independent customer reviews.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                
              </p>
              <div className="admin-business-actions">
                <a
                  className="admin-primary-button"
                  href="https://www.trustpilot.com/review/adminhub-global.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read Admin Hub reviews <span>↗</span>
                </a>
                <a
                  className="admin-text-link"
                  href="https://www.trustpilot.com/review/adminhub-global.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Leave a review
                </a>
              </div>
              <p className="admin-business-small">
                Reviews are hosted and moderated independently by Trustpilot.
              </p>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">06 / PAYMENT</p>
              <h2>Pay securely, after we agree the work.</h2>
            </div>
            <div className="admin-business-copy admin-business-disclosure">
              <details>
                <summary>Show ADMIN HUB PTY LTD banking details</summary>
                <div className="admin-business-bank">
                  <div><b>Account name</b><span>ADMIN HUB PTY LTD</span></div>
                  <div><b>Bank</b><span>FNB Botswana</span></div>
                  <div><b>Account number</b><span>62936626467</span></div>
                  <div><b>Account type</b><span>BUSINESS CHEQUE ACCOUNT</span></div>
                  <div><b>Branch</b><span>AIRPORT JUNCTION</span></div>
                  <div><b>Branch code</b><span>288267</span></div>
                  <div><b>SWIFT</b><span>FIRNBWGX</span></div>
                  <div><b>Mobile payment</b><span>FNB eWallet / Orange Money · 78 098 928 · Ayanda Gatsha</span></div>
                </div>
                <p className="admin-business-small">
                  Confirm the invoice / agreed scope and payment reference with
                  Admin Hub before transferring funds. Do not send money for
                  work that has not been agreed in writing.
                </p>
              </details>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">07 / INTERNATIONAL PAYMENT</p>
              <h2>Pay from where you are.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                Choose a payment route below. Confirm the written scope and invoice before sending money.
              </p>
              <div className="admin-business-disclosure">
                <details>
                  <summary>Show Wise / Canadian bank transfer details</summary>
                  <div className="admin-business-bank">
                    <div><b>Account holder</b><span>Ayanda Gatsha</span></div>
                    <div><b>Bank</b><span>Scotiabank · Canada</span></div>
                    <div><b>Currency</b><span>CAD</span></div>
                    <div><b>Institution number</b><span>002</span></div>
                    <div><b>Transit number</b><span>40410</span></div>
                    <div><b>Account number</b><span>0038024</span></div>
                    <div><b>Payment email</b><span>kaygatsha@gmail.com</span></div>
                  </div>
                </details>

                <details>
                  <summary>Show PayPal details</summary>
                  <div className="admin-business-bank">
                    <div><b>PayPal email</b><span>kaygatsha@gmail.com</span></div>
                    <div><b>Linked bank</b><span>Scotiabank</span></div>
                  </div>
                </details>

                <details>
                  <summary>Show Western Union details</summary>
                  <div className="admin-business-bank">
                    <div><b>Recipient name</b><span>Ayanda Kopano Gatsha</span></div>
                  </div>
                </details>
              </div>
              <p className="admin-business-small">
                Use the payment provider&apos;s instructions for your chosen route. Confirm the agreed scope and invoice first.
              </p>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">08 / REFERRALS</p>
              <h2>Introduce a customer. Earn 50%.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                Introduce a customer who becomes a paying client and earn <strong>50% of the agreed referral amount</strong>.
              </p>
              <p style={{ marginTop: 18 }}>
                Agree the gross/net basis, timing and deductions in writing before work or payment begins. It does not automatically apply to future payments.
              </p>
            </div>
          </div>
        </section>

        <section className="admin-business-section" style={{ borderBottom: 0 }}>
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">09 / INDEPENDENT REFERENCES</p>
              <h2>Evidence beyond the sales pitch.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                Read a selection of independent references and published records after reviewing the commercial model, payment information and ways of working.
              </p>
              <HomeProofCarousel />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
