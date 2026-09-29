"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, Check, Database, Gamepad2, MessageCircle, Smartphone, Sparkles, Zap } from "lucide-react";
import { useState } from "react";

type Mode = "apps" | "games";
const modes: Record<Mode, {label:string;eyebrow:string;title:string;copy:string;points:string[]}> = {
  apps:{label:"Business Apps",eyebrow:"BUILT FOR REAL WORK",title:"Turn the way you work into an app.",copy:"Ordering, booking, customer portals, dashboards and internal workflows — built around the people who actually use them.",points:["Customer ordering & booking","Dashboards & client portals","Workflow and admin tools"]},
  games:{label:"Games & Experiences",eyebrow:"BUILT TO BE PLAYED",title:"Turn an idea into something people can play.",copy:"Browser games, mobile-ready experiences, branded promotions and interactive worlds built with the same reusable delivery engine.",points:["Browser and mobile-ready games","Branded interactive experiences","Playable prototypes that can grow"]},
};
const serviceGroups = [
  {title:"Business Apps",copy:"Useful software for customers, staff and day-to-day operations.",items:["Ordering","Booking","Customer apps","Dashboards","Client portals","Workflow tools"],icon:Smartphone},
  {title:"Games + Experiences",copy:"Playable products that make a brand, idea or campaign memorable.",items:["Browser games","Mobile games","Interactive experiences","Branded games","Gamified promotions","Playable prototypes"],icon:Gamepad2},
];

export default function HomePage(){
  const [mode,setMode]=useState<Mode>("apps"); const active=modes[mode];
  return <main id="main" className="home-landing">
    <section className="home-hero"><div className="home-hero-grid" aria-hidden="true"/><div className="home-orb home-orb-one" aria-hidden="true"/><div className="home-orb home-orb-two" aria-hidden="true"/>
      <div className="home-container home-hero-inner">
        <div className="home-hero-copy">
          <div className="home-kicker"><Sparkles size={15}/> ADMIN HUB</div>
          <div className="home-promise"><span className="home-promise-number">25GB</span><span className="home-promise-each">EACH</span></div>
          <div className="home-promise-sub">APPS <span>+</span> GAMES</div>
          <h1>Get your own app or game built.</h1>
          <p className="home-hero-lead">Practical digital products for businesses, communities and ideas — designed to be useful first, then built to grow.</p>
          <div className="home-hero-actions">
            <a className="home-cta home-cta-primary" href="https://wa.me/26778098928?text=Hi%20Admin%20Hub%2C%20I%20have%20an%20idea%20for%20an%20app%20or%20game." target="_blank" rel="noreferrer"><MessageCircle size={19}/> Start on WhatsApp <ArrowRight size={18}/></a>
            <a className="home-cta home-cta-secondary" href="#what-we-build">See what we build <ArrowDown size={17}/></a>
          </div>
          <div className="home-trust-row"><span><Check size={15}/> Botswana</span><span><Check size={15}/> Remote / international</span><span><Check size={15}/> Built for real users</span></div>
        </div>
        <div className="home-devices" aria-label="Examples of an app and game">
          <div className="home-device home-device-phone"><div className="home-device-notch"/><div className="home-screen home-app-screen">
            <div className="home-screen-top"><span>MY BUSINESS</span><span className="home-live-dot">●</span></div><div className="home-screen-title">Today</div>
            <div className="home-mini-metrics"><div><strong>48</strong><span>Orders</span></div><div><strong>12</strong><span>Bookings</span></div></div>
            <div className="home-screen-card"><span>Customer activity</span><strong>Everything in one place.</strong><div className="home-bars"><i/><i/><i/><i/><i/></div></div>
            <div className="home-screen-nav"><b>⌂</b><b>＋</b><b>◉</b><b>☰</b></div>
          </div></div>
          <div className="home-device home-device-game"><div className="home-game-screen"><div className="home-game-sky">
            <span className="home-game-sun"/><span className="home-game-cloud cloud-a"/><span className="home-game-cloud cloud-b"/>
            <div className="home-game-hud"><span>HP 86</span><span>● 024</span></div><div className="home-game-platform platform-a"/><div className="home-game-platform platform-b"/>
            <div className="home-game-player"><i/></div><div className="home-game-coin coin-a">◆</div><div className="home-game-coin coin-b">◆</div><div className="home-game-controls"><span>◀</span><span>▶</span><b>●</b></div>
          </div></div><div className="home-device-caption"><Gamepad2 size={14}/> PLAYABLE</div></div>
        </div>
      </div>
    </section>

    <section className="home-capacity"><div className="home-container"><div className="home-capacity-card"><div><p className="home-section-label">THE SIMPLE MODEL</p><h2>25GB / month planning allowance.</h2><p className="home-section-copy">The number is a planning model, not a promise of unlimited storage or bandwidth. Actual capacity depends on the product, traffic, media and backend architecture.</p></div><div className="home-capacity-stats"><div><strong>500</strong><span>regular users</span></div><div><strong>25GB</strong><span>monthly model</span></div><div><strong>LOW</strong><span>read / write design</span></div></div></div><div className="home-capacity-points"><div><Database size={20}/><span>Local caching and efficient state management can reduce unnecessary database activity.</span></div><div><Zap size={20}/><span>Start with a focused workload, measure it, then scale the architecture when demand is proven.</span></div><div><Check size={20}/><span>Clear assumptions make the offer easier to understand before a project starts.</span></div></div></div></section>

    <section id="what-we-build" className="home-build-section"><div className="home-container"><div className="home-section-heading"><div><p className="home-section-label">WHAT WE BUILD</p><h2>Useful first. Interactive when it matters.</h2></div><p>Choose the path closest to your idea. You do not need to know the technology before you start.</p></div>
      <div className="home-mode-switch" role="tablist" aria-label="Choose a product type">{(Object.keys(modes) as Mode[]).map(key=><button key={key} type="button" role="tab" aria-selected={mode===key} onClick={()=>setMode(key)} className={mode===key?"active":""}>{key==="apps"?<Smartphone size={17}/>:<Gamepad2 size={17}/>} {modes[key].label}</button>)}</div>
      <div className="home-mode-panel"><div className="home-mode-copy"><p className="home-section-label">{active.eyebrow}</p><h3>{active.title}</h3><p>{active.copy}</p><ul>{active.points.map(point=><li key={point}><Check size={16}/>{point}</li>)}</ul></div><div className="home-mode-visual"><div className="home-floating-card home-floating-card-main"><span className="home-floating-icon">{mode==="apps"?<Smartphone size={21}/>:<Gamepad2 size={21}/>}</span><strong>{active.label}</strong><span>{mode==="apps"?"Designed around a real workflow.":"Designed around a real player."}</span></div><div className="home-floating-card home-floating-card-small"><span>{mode==="apps"?"FAST":"PLAY"}</span><strong>{mode==="apps"?"Useful":"Memorable"}</strong></div></div></div>
      <div className="home-service-grid">{serviceGroups.map(({title,copy,items,icon:Icon})=><article key={title} className="home-service-card"><div className="home-service-icon"><Icon size={22}/></div><p className="home-section-label">ADMIN HUB</p><h3>{title}</h3><p>{copy}</p><div className="home-chip-grid">{items.map(item=><span key={item}>{item}</span>)}</div></article>)}</div>
    </div></section>

    <section className="home-proof"><div className="home-container"><div className="home-proof-panel"><div><p className="home-section-label">WHY ADMIN HUB</p><h2>Not just a brochure site.</h2><p>Admin Hub is built around a reusable application and game delivery engine: build, revise, test, deploy, learn and improve.</p></div><div className="home-proof-list"><span><Check size={16}/> Reusable 10th-iteration application engine</span><span><Check size={16}/> 11th-iteration Phaser game work</span><span><Check size={16}/> Live products and experiments</span><span><Check size={16}/> Botswana studio, remote delivery</span></div><Link href="/apps" className="home-text-link">See the work <ArrowRight size={16}/></Link></div></div></section>

    <section className="home-final-cta"><div className="home-container"><div className="home-final-inner"><p className="home-section-label">HAVE AN IDEA?</p><h2>LET&apos;S BUILD IT.</h2><p>Tell Admin Hub what you want people to do, buy, book, manage or play. We&apos;ll work backwards from the useful experience.</p><div className="home-final-actions"><a className="home-cta home-cta-primary" href="https://wa.me/26778098928?text=Hi%20Admin%20Hub%2C%20I%20want%20to%20build%20an%20app%20or%20game." target="_blank" rel="noreferrer"><MessageCircle size={19}/> DM Admin Hub to start <ArrowRight size={18}/></a><Link href="/contact" className="home-cta home-cta-secondary">Use the project form <ArrowRight size={17}/></Link></div><div className="home-footer-brand">ADMIN HUB <span>Apps · Games · Products · Experiments</span></div></div></div></section>
  </main>;
}
