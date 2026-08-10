import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Membership" };

const plans = [
  { name: "First Desk", price: "Free", note: "one time", features: ["One fixed seven-day episode", "Replay + Blue Signal + actions", "Private Player Room preview"], style: "" },
  { name: "Founding Member", price: "$7.99", note: "per month", features: ["Up to four Desks per billing month", "Player Room and moving archive", "Choose what positive moments to share", "Founding price while beta terms apply"], style: "lime" },
  { name: "Human-reviewed Plus", price: "$19.99", note: "planned", features: ["Everything in membership", "Human review on selected Desks", "Deeper clarification when evidence is unusual"], style: "blue" },
];

export default function PricingPage() {
  return (
    <div id="main" className="interior-page">
      <header className="interior-hero"><div className="container"><p className="kicker">Membership</p><h1>Pay for coverage—not endless custom work.</h1><p className="standfirst">Every member receives the same disciplined product format. That is how BoardSignal can serve many players without turning into hundreds of separate jobs.</p></div></header>
      <section className="container section-pad">
        <div className="content-grid">
          {plans.map((plan) => (
            <article className={`metric-card ${plan.style}`} key={plan.name}>
              <span>{plan.name}</span>
              <strong>{plan.price}</strong>
              <p>{plan.note}</p>
              <ul className="feature-list">{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <div className="interior-actions"><Link href="/join" className={`button ${plan.style === "blue" ? "button-lime" : "button-dark"}`}>Choose this Desk <ArrowRight size={16} /></Link></div>
            </article>
          ))}
        </div>
        <p className="helper-copy">Seeded beta pricing for product testing. Payment collection is not active in this shell.</p>
      </section>
    </div>
  );
}
