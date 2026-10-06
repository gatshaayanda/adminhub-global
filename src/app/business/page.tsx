import Link from "next/link";

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
              Admin Hub builds practical software around real business workflows.
              The commercial model is designed to make a useful first product
              easier to try without hiding the cost of keeping it running.
            </p>
            <div className="admin-business-actions">
              <Link className="admin-primary-button" href="/contact">
                Start an enquiry <span>↗</span>
              </Link>
              <Link className="admin-text-link" href="/">
                Back to the work
              </Link>
            </div>
          </div>
          <div className="admin-business-note">
            <strong>USD $7–$18</strong>
            <span>
              Typical ongoing support / operating range per app, per month.
              This is the current public equivalent of the BWP 100–250 range;
              actual scope is agreed before anything is billed.
            </span>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">01 / THE MODEL</p>
              <h2>The number is for keeping a useful product running.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                The monthly fee is not a surprise licence for access to a
                template. It is a small operating and support contribution for
                an app that Admin Hub has built with the business.
              </p>
              <div className="admin-business-price">
                <strong>$7–$18 / app / month</strong>
                <span>
                  The exact level depends on the app and the support it needs.
                  New features, substantial redesigns and third-party charges
                  are scoped separately rather than quietly added to the
                  monthly number.
                </span>
              </div>
              <div className="admin-business-cards">
                <div className="admin-business-card">
                  <strong>Start small</strong>
                  <p>Begin with the smallest workflow that can prove the idea in real use.</p>
                </div>
                <div className="admin-business-card">
                  <strong>30-day evaluation</strong>
                  <p>Use the first month to see whether the product is actually useful to the business.</p>
                </div>
                <div className="admin-business-card">
                  <strong>Agree the next step</strong>
                  <p>Continue, improve or change scope based on what the business actually learned.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">02 / SETUP FEES</p>
              <h2>No hidden setup surprise.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                For suitable small-business pilot or partnership work, the
                initial setup and build labour can be waived so the business can
                test a real product instead of committing to a large software
                bill before it knows whether the workflow works.
              </p>
              <p style={{ marginTop: 18 }}>
                That does not mean every custom project is automatically free.
                Larger or unusual scopes are discussed and quoted in writing
                before work starts. There is no retroactive setup charge.
              </p>
              <div className="admin-business-market">
                <p>
                  <strong>Why this is deliberately different:</strong> published
                  Botswana pricing shows a wide market — from simple website
                  packages and modest monthly care plans to app packages around
                  the low-thousands of US dollars and custom apps in the
                  several-thousand-dollar range. Admin Hub's low monthly number
                  should therefore be understood as an operating/support model,
                  not as a claim that custom software normally costs only $7–$18
                  to build.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">03 / WHAT YOU GET</p>
              <h2>Value is visible in the product.</h2>
            </div>
            <div className="admin-business-copy">
              <div className="admin-business-list">
                <div><b>Working software</b><span>A real mobile-first product, not just a proposal or mock-up.</span></div>
                <div><b>Business workflow</b><span>Ordering, booking, requests, progress, dashboards or another clearly defined first workflow.</span></div>
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
                Admin Hub operates through <strong>ADMIN HUB PTY LTD</strong>,
                a CIPA-registered Botswana company. Registration is not used as
                a substitute for proof of the work: visitors can inspect the
                published products, open the live systems and contact Admin Hub
                directly.
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
                CIPA is the official Companies and Intellectual Property
                Authority of Botswana. Use its current company-search / online
                registration services to verify the legal entity.
              </p>
            </div>
          </div>
        </section>

        <section className="admin-business-section">
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">05 / PAYMENT</p>
              <h2>Payment details when you need them.</h2>
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

        <section className="admin-business-section" style={{ borderBottom: 0 }}>
          <div className="admin-business-grid">
            <div>
              <p className="admin-kicker">06 / THE POINT</p>
              <h2>Less sales theatre. More evidence.</h2>
            </div>
            <div className="admin-business-copy">
              <p>
                The best reason to work with Admin Hub is not a clever pricing
                trick. It is that the work can be opened, tested and compared
                with the problem you are trying to solve.
              </p>
              <div className="admin-business-actions">
                <Link className="admin-primary-button" href="/#work">
                  Explore published work <span>↗</span>
                </Link>
                <Link className="admin-text-link" href="/contact">
                  Ask Admin Hub a question
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
