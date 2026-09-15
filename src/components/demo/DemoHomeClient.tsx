"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Menu, Phone, Sparkles, X } from "lucide-react";
import { loadDemoBusiness, loadDemoServices } from "@/lib/demo/firestore";
import { seedBusiness, seedServices } from "@/lib/demo/data";
import type { BusinessProfile, DemoService } from "@/lib/demo/types";

export default function DemoHomeClient() {
  const [business, setBusiness] = useState<BusinessProfile>(seedBusiness);
  const [services, setServices] = useState<DemoService[]>(seedServices);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    Promise.all([loadDemoBusiness(), loadDemoServices()]).then(([profile, items]) => {
      setBusiness(profile);
      setServices(items.filter((item) => item.active));
    }).catch(() => undefined);
  }, []);

  const categories = useMemo(() => Array.from(new Set(services.map((service) => service.category))), [services]);

  return (
    <div className="demo-page">
      <header className="demo-nav">
        <div className="demo-container demo-nav-inner">
          <Link href="/demo" className="demo-brand">
            <span className="demo-logo">{business.logoUrl ? <img src={business.logoUrl} alt="" /> : <span>{business.name.slice(0, 1)}</span>}</span>
            <span>{business.name}</span>
          </Link>
          <button className="demo-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav className={menuOpen ? "demo-links demo-links-open" : "demo-links"}>
            <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
            <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
            <Link href="/demo/admin" onClick={() => setMenuOpen(false)}>Owner dashboard</Link>
            <Link className="demo-button demo-button-small" href="/demo/book">Book now</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="demo-hero">
          <div className="demo-container demo-hero-grid">
            <div>
              <div className="demo-eyebrow"><Sparkles size={15} /> Working business website demo</div>
              <h1>{business.tagline}</h1>
              <p>{business.description}</p>
              <div className="demo-actions">
                <Link className="demo-button" href="/demo/book">Book a service <ArrowRight size={17} /></Link>
                <a className="demo-button demo-button-ghost" href="#services">Explore services</a>
              </div>
              <div className="demo-trust-row">
                <span><CheckCircle2 size={16} /> Mobile-first</span>
                <span><CheckCircle2 size={16} /> Live booking flow</span>
                <span><CheckCircle2 size={16} /> Owner controls</span>
              </div>
            </div>
            <div className="demo-hero-card">
              <div className="demo-card-label">Today at a glance</div>
              <div className="demo-stat"><strong>{services.length}</strong><span>active services</span></div>
              <div className="demo-stat"><strong>24/7</strong><span>booking requests</span></div>
              <div className="demo-card-note">The owner can change the business, services, prices and booking statuses — and the public site updates with it.</div>
            </div>
          </div>
        </section>

        <section className="demo-section" id="services">
          <div className="demo-container">
            <div className="demo-section-heading"><div><span className="demo-kicker">Services</span><h2>Choose what you need</h2></div><span className="demo-category-count">{categories.length} categories</span></div>
            <div className="demo-service-grid">
              {services.map((service) => (
                <article className="demo-service-card" key={service.id}>
                  <div className="demo-service-image">{service.imageUrl ? <img src={service.imageUrl} alt="" /> : <span>{service.name.slice(0, 1)}</span>}</div>
                  <div className="demo-service-body">
                    <div className="demo-service-meta"><span>{service.category}</span><strong>{service.price.toLocaleString()} P</strong></div>
                    <h3>{service.name}</h3><p>{service.description}</p>
                    <Link href={`/demo/book?service=${encodeURIComponent(service.id)}`} className="demo-inline-link">Book this service <ArrowRight size={15} /></Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="demo-section demo-section-soft" id="how">
          <div className="demo-container">
            <div className="demo-section-heading"><div><span className="demo-kicker">How it works</span><h2>A complete customer journey</h2></div></div>
            <div className="demo-steps">
              <div><span>01</span><CalendarDays /><h3>Customer chooses</h3><p>Services and prices are managed by the business owner.</p></div>
              <div><span>02</span><Clock3 /><h3>Customer books</h3><p>A real booking request is captured with customer details and notes.</p></div>
              <div><span>03</span><CheckCircle2 /><h3>Owner responds</h3><p>The owner sees the queue and moves requests through their status lifecycle.</p></div>
            </div>
          </div>
        </section>

        <section className="demo-contact-strip">
          <div className="demo-container demo-contact-inner"><div><span className="demo-kicker">Ready when you are</span><h2>Give your customers a proper place to book.</h2></div><div className="demo-contact-actions"><a href={`tel:${business.phone}`}><Phone size={16} /> {business.phone}</a><Link className="demo-button" href="/demo/book">Start a booking</Link></div></div>
        </section>
      </main>
      <footer className="demo-footer"><div className="demo-container"><span>{business.name}</span><span>Working business website demo</span></div></footer>
    </div>
  );
}
