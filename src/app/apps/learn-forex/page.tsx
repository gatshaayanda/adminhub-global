import Link from "next/link";
import { ArrowRight, BookOpen, MessageCircle, MapPin, Phone, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Learn Forex Trading Botswana Academy",
  description:
    "Learn Forex Trading Botswana Academy — programmes, training support, and contact information.",
};

export default function LearnForexPage() {
  return (
    <main id="main">
      <section className="section-shell">
        <div className="container">
          <div className="max-w-4xl space-y-5">
            <div className="eyebrow">AdminHub / Apps / Academy</div>
            <h1 className="section-title text-4xl md:text-5xl">
              Learn Forex Trading Botswana Academy
            </h1>
            <p className="section-copy">
              A Botswana forex trading academy offering structured training,
              practical learning, and continued support for students and
              returning learners.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://learn-forex-trading-botswana-academ-indol.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                Open Academy
                <ArrowRight size={18} />
              </a>
              <a
                href="https://wa.me/26775337250"
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline"
              >
                <MessageCircle size={18} />
                WhatsApp Academy
              </a>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="card">
              <div className="card-inner">
                <BookOpen size={22} className="text-[var(--brand-primary)]" />
                <h2 className="mt-4 text-xl">Programmes</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  Prestige Course, 5 Weeks Course, and Legacy Trader Programme.
                  Current fees and enrolment availability should be confirmed
                  with the Academy.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-inner">
                <ShieldCheck size={22} className="text-[var(--brand-primary)]" />
                <h2 className="mt-4 text-xl">Training & support</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  Structured lessons, practical learning, assessments,
                  progression, and support for existing and completed students.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-inner">
                <MapPin size={22} className="text-[var(--brand-primary)]" />
                <h2 className="mt-4 text-xl">Gaborone</h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  Mogobe Plaza CBD, Gaborone, Botswana. Academy posts specify
                  the 4th floor for its physical classes.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 frame-gold p-5 md:p-6">
            <h2 className="text-xl">Contact the Academy</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a href="tel:+26774439097" className="btn btn-outline">
                <Phone size={18} />
                +267 74 439 097
              </a>
              <a href="https://wa.me/26775337250" target="_blank" rel="noreferrer" className="btn btn-outline">
                <MessageCircle size={18} />
                +267 75 337 250 on WhatsApp
              </a>
            </div>
          </div>

          <div className="mt-8">
            <Link href="/apps" prefetch={false} className="btn btn-ghost">
              Back to Apps
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
