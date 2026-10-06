"use client";
import { useEffect, useState } from "react";
export default function AdminHubSignal(){
  const [ready,setReady]=useState(false);
  useEffect(()=>{const t=window.setTimeout(()=>setReady(true),180);return()=>window.clearTimeout(t)},[]);
  return <div className="pointer-events-none flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6a6c70]" aria-hidden="true">
    <span className={"relative grid h-3 w-3 place-items-center transition-opacity duration-700 "+(ready?"opacity-100":"opacity-0")}>
      <span className="absolute h-3 w-3 rounded-full border border-[#9a9c96]"/>
      <span className="h-1.5 w-1.5 rounded-full bg-[#111318] shadow-[0_0_0_3px_rgba(17,19,24,.08)]"/>
    </span>
    <span className={ready?"opacity-100":"opacity-0"}>SYSTEM READY · EXPLORE</span>
  </div>;
}
