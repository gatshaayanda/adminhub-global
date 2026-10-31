"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SPACE_SURVEY_TARGET_KEY, SURVEY_WORLDS } from "../game/space-universe";
import "./solar-system.css";

type Planet = { id:string; name:string; quadrant:number; orbit:number; known:boolean; kind:string; signal:string; note:string };
const established:Planet[] = [
{id:"aster",name:"Aster",quadrant:1,orbit:1,known:true,kind:"Fractured silicate frontier",signal:"TRACE ATMOSPHERE",note:"Cold, low-pressure terrain, exposed silicate shelves and buried mineral seams. Subsurface voids remain unmapped."},
{id:"cobalt",name:"Cobalt",quadrant:1,orbit:2,known:true,kind:"Copper-bearing pressure basin",signal:"THIN AIR · HOSTILE",note:"Copper-bearing formations beneath an unstable atmosphere. A practical restoration candidate, not a habitable world."},
{id:"verdant",name:"Verdant",quadrant:1,orbit:3,known:true,kind:"Reactive living world",signal:"BIOSPHERE UNKNOWN",note:"Temperate readings conceal reactive biology and unsafe atmospheric chemistry. Study before industrial intervention."},
{id:"ember",name:"Ember",quadrant:1,orbit:4,known:true,kind:"Furnace beneath the dust",signal:"EXTREME HEAT",note:"Iron-rich deposits, high radiation and persistent geological activity. A long-horizon industrial prospect."},
{id:"frost",name:"Frost",quadrant:1,orbit:5,known:true,kind:"Buried-water world",signal:"EXTREME COLD",note:"Deep water ice may support future life-support systems. Extraction depth and purity remain unconfirmed."},
];
const quadrants=[{id:1,name:"ORIGIN",detail:"Haven's neighbourhood · five established planetary records"},{id:2,name:"FRONTIER",detail:"Outer routes · planetary signatures awaiting survey"},{id:3,name:"UNKNOWN",detail:"Unmapped conditions · incomplete orbital intelligence"},{id:4,name:"DEEP SPACE",detail:"Long-range signals · distant system approaches"}];
export default function SolarSystemPage(){
 const [selectedId,setSelectedId]=useState("signal-06");
 const [filter,setFilter]=useState("ALL");
 const [discovered,setDiscovered]=useState<string[]>([]);
 const [courseSet,setCourseSet]=useState(false);
 useEffect(()=>{
  try { const raw=window.localStorage.getItem("ggl-space-autosave-v1"); if(raw){const snapshot=JSON.parse(raw);const ids=snapshot?.world?.discoveredWorlds;if(Array.isArray(ids))setDiscovered(ids.filter((id):id is string=>typeof id==="string"));} } catch {}
 },[]);
 const planets:Planet[]=[
  ...established,
  ...SURVEY_WORLDS.map((world)=>{const found=discovered.includes(world.id);return {id:world.id,name:found?world.revealedName:world.displayName,quadrant:world.quadrant,orbit:world.orbit,known:found,kind:found?world.classification.replaceAll("-"," "):"Unsurveyed planetary signature",signal:found?"SURVEY DATA CONFIRMED":"DATA NOT ACQUIRED",note:found?world.surveyFinding:"Long-range instruments have registered a planetary body. Surface conditions, resources, habitability and orbital hazards remain unknown."};})
 ];
 const selected=planets.find(p=>p.id===selectedId)||planets[0];
 const surveyWorld=SURVEY_WORLDS.find(world=>world.id===selected.id);
 const visible=filter==="ALL"?planets:planets.filter(p=>filter==="CHARTED"?p.known:!p.known);
 const charted=5+discovered.length;
 const setCourse=()=>{if(!surveyWorld)return;window.localStorage.setItem(SPACE_SURVEY_TARGET_KEY,surveyWorld.id);setCourseSet(true);};
 return <main className="system-page">
 <header className="system-nav"><Link href="/ggltournaments" className="system-brand"><span>GGL</span><b>SPACE / SYSTEM INTELLIGENCE</b></Link><Link href="/ggltournaments#space-game">RETURN TO FLIGHT ↗</Link></header>
 <section className="system-hero"><p className="system-kicker">GGL SPACE · STAGE A / SOLAR SYSTEM DISCOVERY</p><h1>Twenty worlds.<br/><em>One unknown system.</em></h1><p>Haven knows five established planetary records. Fifteen more bodies are physically present in the system, but their identities and conditions remain unknown until you take the ship out and survey them.</p><div className="system-progress"><div><span>SYSTEM CHARTING</span><strong>{charted.toString().padStart(2,"0")} / 20</strong></div><div className="system-progress-track"><i style={{width:(charted/20*100)+"%"}}/></div><small>Five established records · {discovered.length} new discoveries logged</small></div></section>
 <section className="system-map-section"><div className="system-section-heading"><div><span>01 / NAVIGATION</span><h2>Four quadrants</h2></div><p>Choose a signal to inspect its current intelligence. Set a course, return to the ship and fly close enough to complete its survey.</p></div>
 <div className="system-quadrants">{quadrants.map(q=><section className={"system-quadrant q"+q.id} key={q.id}><header><span>QUADRANT 0{q.id}</span><strong>{q.name}</strong><small>{q.detail}</small></header><div className="system-orbits">{planets.filter(p=>p.quadrant===q.id).map(p=><button type="button" key={p.id} onClick={()=>{setSelectedId(p.id);setCourseSet(false);}} className={"system-orbit-node "+(p.known?"charted":"unknown")+(selectedId===p.id?" selected":"")} aria-pressed={selectedId===p.id}><span className={"system-planet-art p"+p.orbit}>{p.known?p.name.slice(0,1):"?"}</span><b>{p.known?p.name:"SIGNAL "+p.id.slice(-2)}</b><small>{p.known?"CHARTED":"UNMAPPED"}</small></button>)}</div></section>)}</div>
 <div className="system-legend"><span><i className="known-dot"/> CHARTED WORLD</span><span><i className="unknown-dot"/> UNIDENTIFIED SIGNATURE</span><span><i className="route-dot"/> APPROXIMATE ORBITAL OVERVIEW</span></div></section>
 <section className="system-intel-section"><div className="system-section-heading"><div><span>02 / PLANETARY INTELLIGENCE</span><h2>Selected signal</h2></div><p>Survey findings are revealed only after a successful scan from the ship.</p></div><div className="system-intel-layout">
 <article className="system-intel-card"><div className="system-intel-top"><span>QUADRANT 0{selected.quadrant} · ORBIT {selected.orbit}</span><b>{selected.known?"CHARTED":"UNMAPPED"}</b></div><div className={"system-large-planet p"+selected.orbit}>{selected.known?selected.name.slice(0,1):"?"}</div><p className="system-kicker">{selected.signal}</p><h3>{selected.name}</h3><h4>{selected.kind}</h4><p>{selected.note}</p><div className={"system-data-note "+(selected.known?"":"unknown-note")}>{selected.known?"DISCOVERY RECORDED · HAVEN CHRONICLE UPDATED":"SURVEY REQUIRED · ATMOSPHERE, RESOURCES, HABITABILITY AND METEOR EXPOSURE UNKNOWN"}</div></article>
 <aside className="system-mission-card"><span>MISSION DESK / HAVEN</span><h3>{surveyWorld?(selected.known?"Review discovery record":"Survey this planetary signal"):"Review established world"}</h3><p>{surveyWorld?(selected.known?"The ship has already surveyed this world. Its findings are preserved in the civilisation save and Haven's chronicle.":"Haven has detected a body but cannot identify it. Set a course, fly to the signal and scan it from close range. The completed report is added to the civilisation history."): "This world's existing environmental profile and origin account are part of Haven's established records. Its current restoration and settlement systems remain unchanged."}</p>
 <div className="system-mission-meta"><span>MISSION TYPE</span><b>{surveyWorld?"FLY / APPROACH / SCAN / REPORT":"INSPECT / REVIEW CHRONICLE"}</b></div><div className="system-mission-meta"><span>MISSION STATUS</span><b>{surveyWorld?(selected.known?"COMPLETED":"AWAITING SHIP SURVEY"):"ESTABLISHED RECORD"}</b></div>
 {surveyWorld&&!selected.known&&<button type="button" className="system-course-button" onClick={setCourse}>{courseSet?"COURSE SAVED ✓":"SET COURSE IN SHIP ↗"}</button>}
 {surveyWorld&&selected.known&&<div className="system-data-note">SURVEY COMPLETE · {surveyWorld.scanReward} ARCHIVE ACCLAIM EARNED</div>}
 <small>{surveyWorld?"Survey completion requires the ship to enter planetary approach range. Selecting this map entry alone does not reveal its findings or award acclaim.":"This is an established world record, not a new scan mission."}</small></aside>
 </div></section>
 <section className="system-roster-section"><div className="system-section-heading"><div><span>03 / SYSTEM ROSTER</span><h2>All twenty signatures</h2></div><p>Track discoveries as the system gradually becomes known to Haven.</p></div><div className="system-filters">{["ALL","CHARTED","UNMAPPED"].map(v=><button type="button" key={v} className={filter===v?"active":""} onClick={()=>setFilter(v)}>{v}</button>)}</div><div className="system-roster">{visible.map(p=><button type="button" key={p.id} onClick={()=>{setSelectedId(p.id);setCourseSet(false);}} className={selectedId===p.id?"active":""}><span>Q{p.quadrant} / ORBIT {p.orbit}</span><b>{p.name}</b><small>{(p.known?p.kind:"Planetary signature · awaiting survey")}</small><i>{p.known?"OPEN RECORD ↗":"SELECT SIGNAL ↗"}</i></button>)}</div></section>
 <footer className="system-footer"><span>GGL SPACE · DISCOVERY BEFORE EXPANSION</span><Link href="/ggltournaments#space-game">RETURN TO THE SHIP ↗</Link></footer></main>;
}