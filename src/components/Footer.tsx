"use client";

import Link from "next/link";
import {
  Facebook,
  FileText,
  Instagram,
  MessageCircle,
  Music,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";

const WHATSAPP_NUMBER = "+26772971852";

const COMPLIANCE = {
  nbfiraLicense: "To be confirmed",
  cipaRegistration: "To be confirmed",
  privacySummaryPath: "/privacy",
};

function waLink(message: string) {
  const digits = WHATSAPP_NUMBER.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function telLink() {
  return `tel:${WHATSAPP_NUMBER.replace(/[^\d+]/g, "")}`;
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 overflow-hidden border-t border-[var(--border)] bg-[linear-gradient(180deg,#fffdf9_0%,#f8f3e8_100%)] text-[var(--text-primary)]">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent_0%,rgba(136,115,55,0.45)_18%,rgba(136,115,55,0.75)_50%,rgba(136,115,55,0.45)_82%,transparent_100%)]" />

      <div className="container py-12 md:py-14">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          <section aria-labelledby="footer-brand" className="space-y-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary-strong)]">
                Sparkle Legacy
              </p>
              <h2
                id="footer-brand"
                className="mt-2 text-2xl font-extrabold tracking-[-0.03em]"
              >
                Insurance Brokers
              </h2>
            </div>

            <p className="max-w-[34ch] text-sm leading-7 text-[var(--text-secondary)]">
              A modern insurance platform built to make quotes, claims, and
              policy guidance feel clearer, more professional, and easier to
              access in Botswana.
            </p>

            <div className="flex flex-wrap gap-2">
              <span className="badge">Short-Term</span>
              <span className="badge">Long-Term</span>
              <span className="badge">Retirement</span>
              <span className="badge">SME Cover</span>
              <span className="badge badge-neutral">Claims</span>
            </div>

            <div className="rounded-[1.25rem] border border-[var(--border)] bg-white/70 p-4 text-sm leading-7 text-[var(--text-secondary)]">
              <p className="inline-flex items-center gap-2 font-extrabold text-[var(--text-primary)]">
                <ShieldCheck
                  size={16}
                  className="text-[var(--brand-primary-strong)]"
                />
                Trust disclosure
              </p>
              <div className="mt-2 space-y-1 text-xs leading-6">
                <p>
                  <span className="font-bold text-[var(--text-primary)]">
                    NBFIRA License:
                  </span>{" "}
                  {COMPLIANCE.nbfiraLicense}
                </p>
                <p>
                  <span className="font-bold text-[var(--text-primary)]">
                    CIPA Registration:
                  </span>{" "}
                  {COMPLIANCE.cipaRegistration}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://www.instagram.com/sparklelegacyinsurancebrokers/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--brand-tint)] hover:text-[var(--brand-primary-strong)]"
              >
                <Instagram size={16} />
              </a>

              <a
                href="https://www.tiktok.com/@sparklelegacyinsurancebr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--brand-tint)] hover:text-[var(--brand-primary-strong)]"
              >
                <Music size={16} />
              </a>

              <a
                href="https://www.facebook.com/Sparkle-Legacy-Insurance-Brokers-61557773288268/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--brand-tint)] hover:text-[var(--brand-primary-strong)]"
              >
                <Facebook size={16} />
              </a>
            </div>
          </section>

          <section aria-labelledby="footer-contact" className="space-y-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary-strong)]">
                Support
              </p>
              <h3 id="footer-contact" className="mt-2 text-lg font-extrabold">
                Need help quickly?
              </h3>
            </div>

            <div className="frame-gold p-4">
              <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                <a
                  href={waLink(
                    "Hi Sparkle Legacy 👋 I need help with a quote / policy / claim."
                  )}
                  className="flex items-start gap-3 rounded-2xl transition hover:text-[var(--text-primary)]"
                >
                  <span className="mt-0.5 text-[var(--brand-primary-strong)]">
                    <MessageCircle size={18} />
                  </span>
                  <span>
                    <span className="block font-bold text-[var(--text-primary)]">
                      Chat on WhatsApp
                    </span>
                    <span className="block">{WHATSAPP_NUMBER}</span>
                  </span>
                </a>

                <a
                  href={telLink()}
                  className="flex items-start gap-3 rounded-2xl transition hover:text-[var(--text-primary)]"
                >
                  <span className="mt-0.5 text-[var(--brand-primary-strong)]">
                    <PhoneCall size={18} />
                  </span>
                  <span>
                    <span className="block font-bold text-[var(--text-primary)]">
                      Call support
                    </span>
                    <span className="block">Tap to call directly</span>
                  </span>
                </a>
              </div>

              <div className="mt-4 space-y-2">
                <a
                  href={waLink(
                    "Hi Sparkle Legacy 👋 I’d like a quote:\n\nCover type:\nProduct:\nCity/Town:\nNotes:"
                  )}
                  className="btn btn-primary w-full"
                >
                  <MessageCircle size={18} />
                  Get a Quote via WhatsApp
                </a>

                <a
                  href={waLink(
                    "Hi Sparkle Legacy 👋 Please call me.\n\nName:\nBest time:\nTopic (quote/policy/claim):"
                  )}
                  className="btn btn-outline w-full"
                >
                  <PhoneCall size={18} />
                  Request a Callback
                </a>
              </div>
            </div>
          </section>

          <nav aria-labelledby="footer-links" className="space-y-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary-strong)]">
                Navigation
              </p>
              <h3 id="footer-links" className="mt-2 text-lg font-extrabold">
                Quick links
              </h3>
            </div>

            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
              <li>
                <Link href="/" className="transition hover:text-[var(--text-primary)]">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/c/short-term"
                  className="transition hover:text-[var(--text-primary)]"
                >
                  Short-Term Insurance
                </Link>
              </li>
              <li>
                <Link
                  href="/c/long-term"
                  className="transition hover:text-[var(--text-primary)]"
                >
                  Long-Term Insurance
                </Link>
              </li>
              <li>
                <Link
                  href="/c/business"
                  className="transition hover:text-[var(--text-primary)]"
                >
                  Business / SME Cover
                </Link>
              </li>
              <li>
                <Link
                  href="/c/retirement"
                  className="transition hover:text-[var(--text-primary)]"
                >
                  Retirement
                </Link>
              </li>
              <li>
                <Link
                  href="/claims"
                  className="transition hover:text-[var(--text-primary)]"
                >
                  Claims
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="transition hover:text-[var(--text-primary)]"
                >
                  Insights
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition hover:text-[var(--text-primary)]"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href={COMPLIANCE.privacySummaryPath}
                  className="transition hover:text-[var(--text-primary)]"
                >
                  Privacy Summary
                </Link>
              </li>
            </ul>
          </nav>

          <section aria-labelledby="footer-info" className="space-y-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand-primary-strong)]">
                Guidance
              </p>
              <h3 id="footer-info" className="mt-2 text-lg font-extrabold">
                How the process works
              </h3>
            </div>

            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              Browse cover categories, ask for a quote, and share the details we
              need to help you properly. We then guide you through the next
              steps with clearer communication and faster follow-up.
            </p>

            <div className="card-outline-gold">
              <div className="card-inner">
                <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                  <ShieldCheck
                    size={16}
                    className="text-[var(--brand-primary-strong)]"
                  />
                  Helpful tip
                </p>

                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  For quicker quotes or claim assistance, send clear details and
                  any supporting documents you already have. Unsure what is
                  needed? Ask first and we will guide you.
                </p>

                <div className="mt-4">
                  <a
                    href={waLink(
                      "Hi Sparkle Legacy 👋 What documents do you need for my quote/claim?"
                    )}
                    className="btn btn-outline w-full"
                  >
                    <FileText size={18} />
                    Ask for Requirements
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-[var(--border)] bg-white/70 p-4">
              <p className="text-sm font-extrabold text-[var(--text-primary)]">
                Data protection notice
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                Information shared with Sparkle Legacy may be used to respond to
                inquiries, prepare quotes, assist with policy servicing, and
                support claims.
              </p>
              <Link
                href={COMPLIANCE.privacySummaryPath}
                className="mt-3 inline-flex text-sm font-bold text-[var(--brand-primary-strong)] transition hover:opacity-80"
              >
                Read Privacy Summary
              </Link>
            </div>
          </section>
        </div>
      </div>

      <div className="border-t border-[var(--border)] bg-white/70">
        <div className="container flex flex-col gap-3 py-4 text-xs text-[var(--text-muted)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            &copy; {year} Sparkle Legacy Insurance Brokers. All rights reserved.
          </div>

          <div className="flex flex-col gap-1 lg:text-right">
            <div>
              NBFIRA License: {COMPLIANCE.nbfiraLicense} • CIPA Registration:{" "}
              {COMPLIANCE.cipaRegistration}
            </div>
            <div>
              Cover terms, premiums, benefits, and acceptance remain subject to
              insurer underwriting and policy conditions.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}