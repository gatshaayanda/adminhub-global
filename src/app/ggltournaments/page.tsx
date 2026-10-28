"use client";

import "./ggl.css";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import GGLRacingGame from "./game/racing-warmup";
import GGLContentManager from "./GGLContentManager";

type Tournament = { id: string; game: string; mode: string; title: string; date: string; fee: string; prize: string; slots: string; status: string; accent: string; imageUrl?: string; description?: string; rules?: string; registrationUrl?: string };
type GGLUpdate = { id: string; title: string; body: string; category: string; date?: string; status: string; imageUrl?: string };
const initialTournaments: Tournament[] = [
  { id: "fc", game: "EA SPORTS FC", mode: "FOOTBALL · 1V1", title: "GGL FC Showdown", date: "To be announced", fee: "TBA", prize: "TBA", slots: "Entries open when details are confirmed", status: "COMING SOON", accent: "fc" },
  { id: "cod", game: "CALL OF DUTY", mode: "FPS · TEAM PLAY", title: "GGL Tactical Series", date: "To be announced", fee: "TBA", prize: "TBA", slots: "Entries open when details are confirmed", status: "COMING SOON", accent: "cod" },
  { id: "mk", game: "MORTAL KOMBAT", mode: "FIGHTING · 1V1", title: "GGL Kombat Night", date: "To be announced", fee: "TBA", prize: "TBA", slots: "Entries open when details are confirmed", status: "COMING SOON", accent: "mk" },
];
const initialUpdates: GGLUpdate[] = [
{id:"announcement",title:"Tournament announcements",body:"New events and registration openings.",category:"ANNOUNCEMENT",status:"PLANNED"},
{id:"results",title:"Results & winners",body:"Match outcomes, standings and highlights.",category:"RESULTS",status:"PLANNED"},
{id:"players",title:"Player updates",body:"Follow the competitions that matter to you.",category:"COMMUNITY",status:"PLANNED"}
];

export default function GGLTournamentsPage() {
  const [selected,setSelected]=useState<Tournament|null>(null);
  const [showLogin,setShowLogin]=useState(false);
  const [showAdminLogin,setShowAdminLogin]=useState(false);
  const [tab,setTab]=useState("ALL");
  const [tournaments,setTournaments]=useState<Tournament[]>(initialTournaments);
  const [updates,setUpdates]=useState<GGLUpdate[]>(initialUpdates);
  useEffect(()=>{
    let active=true;
    fetch("/api/ggl/content",{cache:"no-store"}).then(async response=>response.ok?response.json():null).then(data=>{
      if(!active||!data)return;
      if(Array.isArray(data.tournaments)&&data.tournaments.length)setTournaments(data.tournaments.filter((t:Tournament)=>t.status!=="DRAFT"));
      if(Array.isArray(data.updates)&&data.updates.length)setUpdates(data.updates.filter((item:GGLUpdate)=>item.status!=="DRAFT"));
    }).catch(()=>{});
    if(new URLSearchParams(window.location.search).get("manage")==="1")setShowAdminLogin(true);
    return()=>{active=false};
  },[]);
  const visible=useMemo(()=>tab==="ALL"?tournaments:tournaments.filter(t=>t.game===tab),[tab,tournaments]);
  const refreshContent=async()=>{
    const response=await fetch("/api/ggl/content",{cache:"no-store"});if(!response.ok)return;const data=await response.json();
    if(data.tournaments?.length)setTournaments(data.tournaments.filter((t:Tournament)=>t.status!=="DRAFT"));
    if(data.updates?.length)setUpdates(data.updates.filter((item:GGLUpdate)=>item.status!=="DRAFT"));
  };

  return <main className="ggl">
    <header className="ggl-nav">
      <Link href="/" className="ggl-brand" aria-label="Admin Hub home">
        <span className="ggl-mark">GGL</span>
        <span className="ggl-brand-copy">GGL <span>TOURNAMENTS</span><small>GABORONE GAMING LEAGUE</small></span>
      </Link>
      <nav aria-label="Main navigation">
        <a href="#tournaments">Tournaments</a>
        <a href="#updates">News & results</a>
        <button className="ggl-login" onClick={() => setShowLogin(true)}>Player sign in <span>↗</span></button>
      </nav>
    </header>

    <section className="ggl-hero">
      <div className="ggl-hero-copy">
        <p className="ggl-eyebrow"><span /> BUILT FOR THE COMPETITIVE</p>
        <h1>It’s game time.<br /><em>Make it count.</em></h1>
        <p className="ggl-lead">Your local gaming community. Your favourite games. A place to compete, follow the results and see who comes out on top.</p>
        <div className="ggl-actions">
          <a className="ggl-primary" href="#tournaments">Explore tournaments <span>↘</span></a>
          <button className="ggl-secondary" onClick={() => setShowLogin(true)}>Player area</button>
        </div>
        <div className="ggl-hero-note"><span className="ggl-note-dot" /> Tournament announcements, registration and results — all in one place.</div>
      </div>
      <div className="ggl-feature" aria-label="GGL tournament feature panel">
        <div className="ggl-feature-top"><span>GGL / COMPETITIVE PLAY</span><span className="ggl-season">BOTSWANA</span></div>
        <div className="ggl-feature-center">
          <div className="ggl-feature-kicker">THE NEXT MATCH STARTS HERE</div>
          <div className="ggl-feature-title">PLAY<span>TO WIN.</span></div>
          <div className="ggl-scoreline"><span>PLAYER ONE</span><b>VS</b><span>PLAYER TWO</span></div>
        </div>
        <div className="ggl-feature-bottom"><span>FIND YOUR GAME</span><span>FOLLOW THE ACTION <b>↗</b></span></div>
      </div>
    </section>



    <section id="tournaments" className="ggl-section">
      <div className="ggl-section-head">
        <div><p className="ggl-eyebrow">THE LINE-UP</p><h2>Choose your <em>game.</em></h2></div>
        <p>Competition details will be published here by the organiser as events are confirmed.</p>
      </div>
      <div className="ggl-filters">
        {["ALL", ...tournaments.map(t => t.game)].map(f => <button key={f} className={tab === f ? "active" : ""} onClick={() => setTab(f)}>{f === "ALL" ? "All games" : f}</button>)}
      </div>
      <div className="ggl-cards">
        {visible.map(t => <article className={"ggl-card " + t.accent} key={t.id}>
          <div className="ggl-card-art">
            {t.imageUrl ? <img className="ggl-card-image" src={t.imageUrl} alt={t.title + " artwork"} /> : <span className="ggl-image-placeholder"><span>GGL / GAME ART</span><strong>Artwork placeholder</strong><small>Organiser can add a poster</small></span>}
            <span className="ggl-card-status"><i /> {t.status}</span>
            <span className="ggl-game-word">{t.game}</span>
            <span className="ggl-card-mode">{t.mode}</span>
          </div>
          <div className="ggl-card-body">
            <p className="ggl-card-label">GGL TOURNAMENT</p>
            <h3>{t.title}</h3>
            <div className="ggl-details">
              <div><small>DATE</small><b>{t.date}</b></div>
              <div><small>ENTRY</small><b>{t.fee}</b></div>
              <div><small>PRIZE</small><b>{t.prize}</b></div>
            </div>
            <p className="ggl-slots">{t.slots}</p>
            <button className="ggl-card-cta" onClick={() => setSelected(t)}>Event details <span>↗</span></button>
          </div>
        </article>)}
      </div>
      <p className="ggl-disclaimer">These are planned tournament categories, not confirmed live events. Official dates, entry fees, prizes and registration status will be added when confirmed by Lex.</p>
    </section>

    <section className="ggl-updates" id="updates">
      <div className="ggl-updates-copy">
        <p className="ggl-eyebrow">STAY IN THE LOOP</p>
        <h2>Follow the games.<br /><em>Celebrate the wins.</em></h2>
        <p>Announcements, match schedules, results and winner highlights are planned for the GGL player area.</p>
        <button className="ggl-primary" onClick={() => setShowLogin(true)}>Player sign in <span>↗</span></button>
      </div>
      <div className="ggl-update-panel">
        <div className="ggl-panel-top"><span>FROM THE GGL DESK</span><span>UPDATES</span></div>
        {updates.filter(item=>item.status!=="DRAFT").slice(0,4).map((item,index)=><div className="ggl-update-row" key={item.id}><span className="ggl-update-number">{String(index+1).padStart(2,"0")}</span><div>{item.imageUrl&&<img className="ggl-update-image" src={item.imageUrl} alt="" />}<strong>{item.title}</strong><p>{item.body}</p>{item.date&&<small className="ggl-update-date">{item.date}</small>}</div><span className="ggl-soon">{item.status}</span></div>)}
      </div>
    </section>

    <section className="ggl-admin-access" aria-label="Tournament organiser access">
      <span>ORGANISER ACCESS</span>
      <button onClick={() => setShowAdminLogin(true)}>Manage content <span aria-hidden="true">↗</span></button>
    </section>

    <section className="ggl-game-section" aria-label="Playable GGL open-space exploration game">
      <div className="ggl-game-section-head">
        <div className="ggl-game-promo-copy">
          <p className="ggl-eyebrow">GGL SPACE / PLAY NOW</p>
          <h2>Explore the system.<br /><em>Find your horizon.</em></h2>
          <p>Take the ship into open space, steer between distant worlds, manage your flight and use NOS to burst forward. The planets are landmarks, not a track.</p>
        </div>
      </div>
      <GGLRacingGame embedded />
    </section>

    <footer className="ggl-footer">
      <Link href="/" className="ggl-brand"><span className="ggl-mark">GGL</span><span className="ggl-brand-copy">GGL <span>TOURNAMENTS</span><small>POWERED BY ADMIN HUB</small></span></Link>
      <span className="ggl-footer-line">PLAY FAIR. RESPECT THE GAME.</span>
      <button onClick={() => setShowLogin(true)}>Player area ↗</button>
    </footer>

    {showAdminLogin && <GGLContentManager onClose={() => setShowAdminLogin(false)} onSaved={refreshContent} />}

    {selected && <div className="ggl-overlay" onClick={() => setSelected(null)}><section className="ggl-modal" role="dialog" aria-modal="true" aria-label={selected.title} onClick={e => e.stopPropagation()}>
      <button className="ggl-close" aria-label="Close dialog" onClick={() => setSelected(null)}>×</button>
      <p className="ggl-eyebrow">GGL / EVENT DETAILS</p><h2>{selected.title}</h2><p>{selected.game} · {selected.mode}</p>
      <div className="ggl-modal-notice">{selected.description || "The organiser will publish confirmed event information here."}{selected.rules ? <p className="ggl-modal-detail"><strong>Rules:</strong> {selected.rules}</p> : null}<p className="ggl-modal-detail"><strong>Date:</strong> {selected.date} · <strong>Entry:</strong> {selected.fee} · <strong>Prize:</strong> {selected.prize}</p></div>
      {selected.registrationUrl ? <a className="ggl-primary" href={selected.registrationUrl} target="_blank" rel="noreferrer">Registration details <span>↗</span></a> : <button className="ggl-primary" onClick={() => { setSelected(null); setShowLogin(true); }}>Player area <span>↗</span></button>}
    </section></div>}

    {showLogin && <div className="ggl-overlay" onClick={() => setShowLogin(false)}><section className="ggl-modal" role="dialog" aria-modal="true" aria-label="Player account" onClick={e => e.stopPropagation()}>
      <button className="ggl-close" aria-label="Close dialog" onClick={() => setShowLogin(false)}>×</button>
      <p className="ggl-eyebrow">GGL / PLAYER AREA</p><h2>Your next match <em>starts here.</em></h2>
      <p>Player registration and sign-in are still being built. Tournament registration and proof-of-payment uploads will open once secure accounts and organiser verification are ready.</p>
      <div className="ggl-modal-notice">PLAYER ACCOUNTS · IN DEVELOPMENT</div>
      <button className="ggl-secondary" onClick={() => setShowLogin(false)}>Back to tournaments</button>
    </section></div>}
  </main>;
}
