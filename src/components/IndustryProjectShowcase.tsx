"use client";

import Link from "next/link";
import { useState } from "react";
import { productIndustries, publicProducts, type PublicProduct } from "@/data/publicProducts";

function Card({project,onOpen}:{project:PublicProduct;onOpen:(p:PublicProduct)=>void}) {
  return <button type="button" onClick={()=>onOpen(project)} className="group text-left">
    <span className="block overflow-hidden border border-[#d9d9d2] bg-white">
      <span className="relative block aspect-[16/9] overflow-hidden bg-[#ecece6]">
        {project.video && <video src={project.video} muted loop playsInline preload="metadata" className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.025] group-hover:opacity-100" onMouseEnter={e=>void e.currentTarget.play().catch(()=>{})} onMouseLeave={e=>{e.currentTarget.pause();e.currentTarget.currentTime=0}} aria-hidden="true"/>}
        <span className="absolute left-3 top-3 bg-[#111318] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">{project.status.split(" · ")[0]}</span>
        <span className="absolute bottom-3 right-3 bg-white/90 px-2 py-1 text-[11px] font-bold text-[#111318]">Preview ↗</span>
      </span>
      <span className="block border-t border-[#d9d9d2] p-4">
        <span className="block text-[11px] font-bold uppercase tracking-[0.13em] text-[#73756f]">{project.industry}</span>
        <span className="mt-2 block text-xl font-extrabold tracking-[-0.03em] text-[#111318]">{project.title}</span>
        <span className="mt-1 block text-sm text-[#4b4e53]">{project.type}</span>
        <span className="mt-4 flex items-center justify-between text-xs font-bold text-[#173ea5]"><span>See how it works ↗</span><span>{project.number}</span></span>
      </span>
    </span>
  </button>;
}

export default function IndustryProjectShowcase(){
  const [selected,setSelected]=useState<PublicProduct|null>(null);
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
    <section className="mt-20 border-t border-[#d9d9d2] pt-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#73756f]">INDEPENDENT / PERSONAL</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5c5f64]">A separate record of experimental product work. Kept here for completeness, not positioned as client work.</p>
      <Link href="/boardsignal" className="mt-4 inline-flex text-sm font-bold text-[#55585e] hover:text-[#111318]">BoardSignal — chess product experiment ↗</Link>
    </section>
    {selected && <div className="fixed inset-0 z-[70] grid place-items-center bg-[#111318]/70 p-4" role="dialog" aria-modal="true" aria-label={selected.title+" preview"}>
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close preview" onClick={()=>setSelected(null)}/>
      <div className="relative z-10 grid max-h-[92vh] w-full max-w-5xl overflow-auto bg-[#f7f7f3] md:grid-cols-[1.35fr_0.65fr]">
        <div className="aspect-video bg-[#111318]">{selected.video && <video src={selected.video} controls autoPlay muted playsInline className="h-full w-full object-contain"/>}</div>
        <div className="flex flex-col justify-between p-6 md:p-8">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#73756f]">{selected.industry}</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[#111318]">{selected.title}</h2><p className="mt-1 text-sm font-semibold text-[#55585e]">{selected.type}</p><p className="mt-5 text-sm leading-7 text-[#3f4247]">{selected.detail}</p><div className="mt-5 flex flex-wrap gap-2">{selected.tags.map(t=><span key={t} className="border border-[#d0d1cb] px-2.5 py-1 text-[11px] font-bold text-[#55585e]">{t}</span>)}</div></div>
          <div className="mt-8 flex flex-wrap gap-3"><a href={selected.href} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-[#111318] px-4 py-2.5 text-sm font-bold text-white">Open product ↗</a><Link href={"/apps/"+selected.slug} className="inline-flex rounded-full border border-[#bfc0ba] px-4 py-2.5 text-sm font-bold text-[#111318]">See project ↗</Link><button type="button" onClick={()=>setSelected(null)} className="inline-flex rounded-full px-4 py-2.5 text-sm font-bold text-[#55585e]">Close</button></div>
        </div>
      </div>
    </div>}
  </>;
}
