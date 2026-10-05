"use client";

import { useEffect, useState } from "react";

import type React from "react";

type Project = { number:string; title:string; type:string; href:string; status:string; statusTone:"live"|"active"|"followup"; summary:string; video?:string; youtubeUrl?:string };

const projects: Project[] = [
  {number:"01",title:"BOEMO",type:"Mobile kitchen ordering",href:"https://boemo-joos-food-deals.vercel.app/",status:"CLIENT WORK · ACTIVE",statusTone:"active",summary:"A mobile ordering experience built around the day-to-day workflow of a food business.",video:"/video/projects/boemo.mp4"},
  {number:"02",title:"PurePress",type:"Business application",href:"https://purepress-omega.vercel.app/",status:"CLIENT WORK · FOLLOW-UP",statusTone:"followup",summary:"A business application developed for a real operating workflow, with further client engagement to follow.",video:"/video/projects/purepress-team.mp4"},
  {number:"03",title:"Translend",type:"Transport & workflow management",href:"https://translend-tms.vercel.app/pipeline",status:"CLIENT WORK · ACTIVE",statusTone:"active",summary:"A transport and workflow system built for client operations, with the engagement continuing into paid work.",video:"/video/projects/translend.mp4"},
  {number:"04",title:"Namane Tyres",type:"Customer booking & work progress",href:"https://namane-tyres.vercel.app/",status:"CLIENT WORK · ACTIVE",statusTone:"active",summary:"A roadside tyre business system connecting customer requests, booking and work progress.",video:"/video/projects/namane-tyre-work.mp4"},
  {number:"05",title:"Atlas Service Centre",type:"Vehicle service & workshop system",href:"https://atlas-service-centre.vercel.app/",status:"CLIENT WORK · ACTIVE",statusTone:"active",summary:"A vehicle workshop system shaped around mechanical, electrical and customer service workflows.",video:"/video/projects/atlasvid.mp4"},
  {number:"06",title:"TutorMe",type:"Education & tutoring application",href:"https://tutorme-two.vercel.app/",status:"CLIENT WORK · ACTIVE",statusTone:"active",summary:"An education and tutoring application built as a live product direction with the next commercial step ready to start.",video:"/video/projects/tutorme.mp4"},
  {number:"07",title:"Avram Kids",type:"Event equipment booking & operations",href:"https://avram-kids.vercel.app/",status:"CLIENT WORK · ACTIVE",statusTone:"active",summary:"A mobile-first booking and operations foundation for children’s event equipment hire.",video:"/video/projects/avram.mp4"},
  {number:"08",title:"BoardSignal",type:"Chess performance system",href:"/boardsignal",status:"LIVE · 100+ USERS",statusTone:"live",summary:"A live chess improvement product built around deterministic analysis, player guidance and real user activity.",youtubeUrl:"https://www.youtube.com/watch?v=oeivw1Cch40"},
];

function ProjectPreview({project,onOpen}:{project:Project;onOpen:()=>void}) {
  const playPreview=(event:React.MouseEvent<HTMLButtonElement>)=>{ const video=event.currentTarget.querySelector("video"); if(video){video.currentTime=0; void video.play().catch(()=>{});} };
  const stopPreview=(event:React.MouseEvent<HTMLButtonElement>)=>{ const video=event.currentTarget.querySelector("video"); if(video){video.pause(); video.currentTime=0;} };
  return <button className="ah-project-card" type="button" onClick={onOpen} onMouseEnter={playPreview} onMouseLeave={stopPreview} aria-label={"Open "+project.title+" project preview"}>
    <span className="ah-project-card-media">{project.video ? <video src={project.video} muted loop playsInline preload="metadata" aria-hidden="true"/> : <img className="ah-project-card-poster" src={"https://img.youtube.com/vi/"+project.youtubeUrl?.split("v=")[1]+"/hqdefault.jpg"} alt="" aria-hidden="true"/>}<span className="ah-project-card-overlay"><span>{project.youtubeUrl ? "Watch" : "Preview"}</span><span>↗</span></span></span>
    <span className="ah-project-card-copy"><span className="admin-project-number">{project.number}</span><span className="ah-project-card-title">{project.title}</span><span className="ah-project-card-type">{project.type}</span><span className="ah-project-card-action">Open preview <span>↗</span></span></span>
  </button>;
}

export default function ProjectShowcase(){
  const [selected,setSelected]=useState<Project|null>(null);
  useEffect(()=>{ if(!selected)return; const previous=document.body.style.overflow; document.body.style.overflow="hidden"; return()=>{document.body.style.overflow=previous}; },[selected]);
  return <>
    <div className="admin-project-showcase">{projects.map(project=><ProjectPreview key={project.title} project={project} onOpen={()=>setSelected(project)}/>)}</div>
    {selected && <div className="ah-project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
      <button className="ah-project-modal-backdrop" type="button" aria-label="Close project preview" onClick={()=>setSelected(null)}/>
      <div className="ah-project-modal-panel">
        <div className="ah-project-modal-media">{selected.youtubeUrl ? <iframe src={"https://www.youtube.com/embed/"+selected.youtubeUrl.split("v=")[1]+"?autoplay=1&rel=0"} title={selected.title+" video"} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{width:"100%",height:"100%",border:0}}/> : <video src={selected.video} controls autoPlay muted playsInline preload="metadata"/>}</div>
        <div className="ah-project-modal-content"><div><p className="admin-kicker">{selected.number} / APP</p><div className={"ah-project-modal-status "+selected.statusTone}>{selected.status}</div><h2 id="project-modal-title">{selected.title}</h2><p className="ah-project-modal-type">{selected.type}</p><p className="ah-project-modal-summary">{selected.summary}</p></div>
          <div className="ah-project-modal-actions"><a className="admin-primary-button" href={selected.href} target="_blank" rel="noreferrer">Open live project <span>↗</span></a><button className="admin-text-link" type="button" onClick={()=>setSelected(null)}>Close preview</button></div>
        </div>
      </div>
    </div>}
  </>;
}