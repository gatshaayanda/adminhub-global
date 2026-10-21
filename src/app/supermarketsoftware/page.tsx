import type { Metadata } from "next";
import "./supermarketsoftware.css";

export const metadata: Metadata = {
  title: "Supermarket Software | Shop & Collect Demo",
  description: "See how a simple online product catalogue, customer basket and staff product management experience could make supermarket shopping more convenient.",
};

const steps = [
  { number: "01", title: "Customer browses", copy: "Search products, compare the range and choose quantities on a phone or computer.", icon: "basket" },
  { number: "02", title: "Builds a basket", copy: "Review the items and estimated total before making a trip to the store.", icon: "list" },
  { number: "03", title: "Staff manage the range", copy: "Use staff access to maintain the demonstration catalogue and see how product updates could work.", icon: "store" },
];

function BasketIllustration() {
  return (
    <svg viewBox="0 0 420 300" role="img" aria-label="Illustration of a customer shopping basket with a product list" className="ss-hero-illustration">
      <defs><linearGradient id="ss-bag" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e4f0df"/><stop offset="1" stopColor="#b8d4b0"/></linearGradient></defs>
      <circle cx="210" cy="150" r="128" fill="#f2f0e8"/>
      <path d="M104 118h212l-20 112H126z" fill="url(#ss-bag)" stroke="#183c2d" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M155 119l18-48h72l18 48" fill="none" stroke="#183c2d" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="137" y="90" width="46" height="78" rx="8" fill="#e7b35c" stroke="#183c2d" strokeWidth="3" transform="rotate(-8 160 129)"/>
      <rect x="188" y="76" width="48" height="92" rx="8" fill="#c65f48" stroke="#183c2d" strokeWidth="3"/>
      <rect x="241" y="91" width="43" height="78" rx="8" fill="#f7f7f1" stroke="#183c2d" strokeWidth="3" transform="rotate(8 262 130)"/>
      <path d="M133 189h160" stroke="#183c2d" strokeWidth="3" strokeDasharray="7 7" opacity=".45"/>
      <circle cx="151" cy="246" r="12" fill="#183c2d"/><circle cx="275" cy="246" r="12" fill="#183c2d"/>
      <rect x="275" y="35" width="102" height="45" rx="22" fill="#183c2d"/><path d="M295 58l9 9 18-20" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><text x="331" y="63" fill="#fff" fontSize="11" fontWeight="700">READY</text>
      <path d="M58 207c-12-13-10-30 2-36 13-7 27 5 27 18" fill="none" stroke="#c65f48" strokeWidth="4" strokeLinecap="round"/><path d="M75 194l12-5-2 13" fill="none" stroke="#c65f48" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="88" cy="70" r="5" fill="#e0ad50"/><circle cx="330" cy="230" r="7" fill="#c65f48"/><path d="M68 112l9-9m-4 15 9-9" stroke="#e0ad50" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

function MiniProduct({ color, label, price }: { color: string; label: string; price: string }) {
  return <div className="ss-mini-product"><div className="ss-mini-product-art" style={{ background: color }}><span aria-hidden="true">▥</span></div><div className="ss-mini-product-copy"><strong>{label}</strong><span>{price}</span></div><span className="ss-mini-add" aria-hidden="true">+</span></div>;
}

export default function SupermarketSoftwarePage() {
  return (
    <main className="supermarket-page">
      <section className="ss-hero">
        <div className="ss-hero-copy">
          <p className="ss-eyebrow"><span /> BUSINESS SOFTWARE · RETAIL</p>
          <h1>Less time<br />shopping.<br /><em>More in control.</em></h1>
          <p className="ss-lead">A simple online shop-and-collect experience that lets customers plan their basket before visiting a store — while staff manage the product range in one place.</p>
          <div className="ss-hero-actions">
            <a className="ss-button ss-button-dark" href="https://sefalana-shop-collect.vercel.app/" target="_blank" rel="noreferrer">Try the live demo <span aria-hidden="true">↗</span></a>
            <a className="ss-secondary-link" href="#how-it-works">See how it works ↓</a>
          </div>
          <p className="ss-small-note">An illustrative pilot concept, not an official Sefalana service.</p>
        </div>
        <div className="ss-hero-art-wrap">
          <div className="ss-art-sticker">PLAN · PICK · COLLECT</div>
          <BasketIllustration />
          <div className="ss-art-caption"><span className="ss-status-dot" /> A clearer way to shop</div>
        </div>
      </section>

      <section className="ss-explainer" id="how-it-works">
        <div className="ss-section-heading">
          <p className="ss-eyebrow">01 / THE IDEA</p>
          <h2>Think of it as a shop window in your pocket.</h2>
          <p>Customers can explore the catalogue online. Staff can maintain the catalogue through a separate staff area. The aim is to make the steps before a store visit easier for both sides.</p>
        </div>
        <div className="ss-flow" aria-label="Customer and staff flow">
          {steps.map((step, index) => (
            <article className="ss-flow-card" key={step.number}>
              <div className="ss-flow-top"><span>{step.number}</span><span className="ss-flow-symbol" aria-hidden="true">{step.icon === "basket" ? "↗" : step.icon === "list" ? "☷" : "▦"}</span></div>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
              {index < steps.length - 1 && <span className="ss-flow-arrow" aria-hidden="true">→</span>}
            </article>
          ))}
        </div>
      </section>

      <section className="ss-demo-preview">
        <div className="ss-preview-copy">
          <p className="ss-eyebrow">02 / CUSTOMER VIEW</p>
          <h2>See the kind of shopping experience.</h2>
          <p>Open the demo to browse sample products, search by name, switch categories, add items to a basket and review an illustrative subtotal. It is designed to be straightforward on a phone as well as a computer.</p>
          <ul className="ss-check-list">
            <li><span>✓</span> Find products without walking every aisle first</li>
            <li><span>✓</span> Compare the basket and estimated cost</li>
            <li><span>✓</span> Plan what you want before leaving home or work</li>
          </ul>
          <a className="ss-inline-link" href="https://sefalana-shop-collect.vercel.app/" target="_blank" rel="noreferrer">Try browsing as a customer <span aria-hidden="true">↗</span></a>
        </div>
        <div className="ss-phone-stage">
          <div className="ss-phone">
            <div className="ss-phone-top"><span>SHOP & COLLECT</span><span aria-hidden="true">•••</span></div>
            <div className="ss-phone-hero"><small>YOUR SHOPPING LIST</small><strong>Find your<br /><em>favourites.</em></strong><span>Search the range</span></div>
            <div className="ss-phone-search"><span aria-hidden="true">⌕</span> Search products…</div>
            <div className="ss-phone-tabs"><b>All items</b><span>Wine</span><span>Beer</span></div>
            <MiniProduct color="#e9c0a7" label="Sample product" price="P 85.00" />
            <MiniProduct color="#d3e0bd" label="Everyday favourite" price="P 42.00" />
            <div className="ss-phone-basket"><span>🛒</span><span><strong>Your basket</strong><small>Review items and total</small></span><b>→</b></div>
          </div>
          <p className="ss-visual-caption">Illustration of the experience · sample items and prices</p>
        </div>
      </section>

      <section className="ss-staff-section">
        <div className="ss-staff-visual" aria-hidden="true">
          <div className="ss-admin-window">
            <div className="ss-admin-window-head"><span>STAFF CATALOGUE</span><span className="ss-admin-dots">● ● ●</span></div>
            <div className="ss-admin-stat-row"><div><small>PRODUCTS</small><strong>Catalogue</strong></div><div><small>STORE VIEW</small><strong>Updated range</strong></div></div>
            <div className="ss-admin-list"><div className="ss-admin-row"><span className="ss-admin-thumb">▤</span><span><strong>Product name</strong><small>Department · pack size</small></span><b>Edit</b></div><div className="ss-admin-row"><span className="ss-admin-thumb ss-thumb-green">▤</span><span><strong>Another product</strong><small>Price · availability</small></span><b>Edit</b></div><div className="ss-admin-row"><span className="ss-admin-thumb ss-thumb-yellow">▤</span><span><strong>New catalogue item</strong><small>Details · category</small></span><b>Edit</b></div></div>
            <div className="ss-admin-add">＋ Add a product</div>
          </div>
        </div>
        <div className="ss-staff-copy">
          <p className="ss-eyebrow">03 / STAFF VIEW</p>
          <h2>Products change.<br />Updating them should be simple.</h2>
          <p>Staff access demonstrates a central place to manage catalogue items, categories and product details instead of relying on a developer for every routine change.</p>
          <div className="ss-staff-benefits"><div><strong>One catalogue</strong><span>Keep product information organised.</span></div><div><strong>Staff control</strong><span>Make routine edits through the staff area.</span></div><div><strong>Less back-and-forth</strong><span>Reduce the need to pass every small update between people.</span></div></div>
          <a className="ss-button ss-button-outline" href="https://sefalana-shop-collect.vercel.app/admin" target="_blank" rel="noreferrer">Try staff access <span aria-hidden="true">↗</span></a>
          <p className="ss-small-note">The demo uses sample data and browser-local changes. It is not connected to a live store inventory or order system.</p>
        </div>
      </section>

      <section className="ss-benefits-section">
        <div className="ss-section-heading">
          <p className="ss-eyebrow">04 / THE PROBLEM IT ADDRESSES</p>
          <h2>A better starting point for customers and store teams.</h2>
        </div>
        <div className="ss-benefit-grid">
          <article><span className="ss-benefit-number">01</span><div><h3>For customers</h3><p>Browse from home or work, check what you intend to buy and arrive with a clearer plan. That can mean less wandering and less time spent deciding in-store.</p></div><span className="ss-benefit-icon" aria-hidden="true">⌕</span></article>
          <article><span className="ss-benefit-number">02</span><div><h3>For staff</h3><p>Maintain product details in one place. A well-designed workflow can make catalogue upkeep more consistent and reduce repeated manual updates.</p></div><span className="ss-benefit-icon" aria-hidden="true">▤</span></article>
          <article><span className="ss-benefit-number">03</span><div><h3>For managers</h3><p>Create a foundation for a more organised customer journey and a clearer view of how online requests could connect to store operations.</p></div><span className="ss-benefit-icon" aria-hidden="true">↗</span></article>
          <article><span className="ss-benefit-number">04</span><div><h3>For the business</h3><p>Offer a convenient digital touchpoint, learn what customers need and evaluate a collection workflow before investing in a full production rollout.</p></div><span className="ss-benefit-icon" aria-hidden="true">◎</span></article>
        </div>
      </section>

      <section className="ss-reality-note">
        <div><p className="ss-eyebrow">A NOTE ABOUT THIS DEMO</p><h2>Try the idea, not a live checkout.</h2></div>
        <p>This is a concept demonstration. The catalogue and prices are illustrative; basket actions do not submit a real order, reserve stock, verify age or book a collection time. Staff changes are saved in the current browser only. A real deployment would need approved product data, secure staff permissions, shared inventory, order handling, collection scheduling and the store’s required compliance checks.</p>
      </section>

      <section className="ss-final-cta">
        <p className="ss-eyebrow">READY TO EXPLORE?</p>
        <h2>See it from both sides.</h2>
        <p>Start with the customer shop, then explore the staff catalogue experience.</p>
        <div className="ss-hero-actions">
          <a className="ss-button ss-button-light" href="https://sefalana-shop-collect.vercel.app/" target="_blank" rel="noreferrer">Open customer demo ↗</a>
          <a className="ss-button ss-button-quiet" href="https://sefalana-shop-collect.vercel.app/admin" target="_blank" rel="noreferrer">Open staff access ↗</a>
        </div>
      </section>
    </main>
  );
}
