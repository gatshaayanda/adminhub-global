"use client";

import { useEffect, useState } from "react";
import { productIndustries, publicProducts, type PublicProduct } from "@/data/publicProducts";

function Card({project,onOpen}:{project:PublicProduct;onOpen:(p:PublicProduct)=>void}) {
  return <button type="button" onClick={()=>onOpen(project)} className="admin-client-card group text-left">
    <span className="admin-client-card-media">
      {project.video ? <video src={project.video} muted loop playsInline preload="metadata" onMouseEnter={e=>void e.currentTarget.play().catch(()=>{})} onMouseLeave={e=>{e.currentTarget.pause();e.currentTarget.currentTime=0}} aria-hidden="true"/> : project.image ? <img src={project.image} alt="" aria-hidden="true" style={{display:"block",width:"100%",height:"100%",objectFit:"cover"}}/> : null}
      <span className="admin-client-card-preview">Open preview <span>↗</span></span>
    </span>
    <span className="admin-client-card-copy">
      <span className="admin-client-card-topline"><span>{project.status}</span><span>{project.number}</span></span>
      <span className="admin-client-card-title">{project.title}</span>
      <span className="admin-client-card-type">{project.type}</span>
      <span className="admin-client-card-footer"><span>See how it works ↗</span><span>{project.role}</span></span>
    </span>
  </button>;
}

export default function IndustryProjectShowcase(){
  const [selected,setSelected]=useState<PublicProduct|null>(null);
  useEffect(()=>{ if(!selected) return; const previous=document.body.style.overflow; const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape") setSelected(null)}; document.body.style.overflow="hidden"; window.addEventListener("keydown",onKey); return()=>{document.body.style.overflow=previous; window.removeEventListener("keydown",onKey)}; },[selected]);
  return <>
    <div className="space-y-16">
      {productIndustries.map(industry=>{
        const projects=industry.slugs.map(slug=>publicProducts.find(p=>p.slug===slug)).filter(Boolean) as PublicProduct[];
        return <section key={industry.name} aria-labelledby={"industry-"+industry.name.replace(/\W+/g,"-")}>
          <div className="mb-6 flex flex-col gap-2 border-t border-[#d9d9d2] pt-5 md:flex-row md:items-end md:justify-between">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#73756f]">INDUSTRY</p><h3 id={"industry-"+industry.name.replace(/\W+/g,"-")} className="mt-1 text-2xl font-extrabold tracking-[-0.035em] text-[#111318]">{industry.name}</h3></div>
            <p className="max-w-xl text-sm leading-6 text-[#5c5f64]">{industry.intro}</p>
          </div>
          <div className={projects.length===1 ? "grid max-w-2xl gap-5" : "grid gap-5 md:grid-cols-2"}>{projects.map(p=><Card key={p.slug} project={p} onOpen={setSelected}/>)}</div>
        </section>;
      })}
    </div>
    {selected && <div className="admin-client-modal" role="dialog" aria-modal="true" aria-labelledby="client-preview-title">
      <button type="button" className="admin-client-modal-backdrop" aria-label="Close preview" onClick={()=>setSelected(null)}/>
      <div className="admin-client-modal-panel">
        <div className="admin-client-modal-media">{selected.video ? <video src={selected.video} controls autoPlay muted playsInline preload="metadata"/> : selected.youtubeUrl ? <iframe src={"https://www.youtube.com/embed/"+selected.youtubeUrl.split("v=")[1]+"?autoplay=1&rel=0"} title={selected.title+" video"} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/> : selected.image ? <img src={selected.image} alt={selected.title+" preview"} style={{display:"block",width:"100%",height:"100%",objectFit:"contain"}}/> : null}</div>
        <div className="admin-client-modal-content">
          <button type="button" className="admin-client-modal-close" onClick={()=>setSelected(null)} aria-label="Close preview">Close <span>×</span></button>
          <div className="admin-client-modal-copy">
            <p className="admin-client-modal-kicker">{selected.industry} · {selected.status}</p>
            <h2 id="client-preview-title">{selected.title}</h2>
            <p className="admin-client-modal-type">{selected.type}</p>
            <p className="admin-client-modal-detail">{selected.detail}</p>
            <div className="admin-client-modal-role"><span>ADMIN HUB WORK</span><strong>{selected.role}</strong></div>
            <div className="admin-client-modal-tags">{selected.tags.map(t=><span key={t}>{t}</span>)}</div>
          </div>
          <div className="admin-client-modal-actions">
            <a href={selected.href} target="_blank" rel="noreferrer" className="admin-primary-button">Open live project <span>↗</span></a>
          </div>
        </div>
      </div>
    </div>}
  </>;
}
