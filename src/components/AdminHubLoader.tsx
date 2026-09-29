"use client";

import { useEffect, useState } from "react";
import LogoMktMark from "@/components/LogoMktMark";

export default function AdminHubLoader(){
  const [visible,setVisible]=useState(true); const [fading,setFading]=useState(false);
  useEffect(()=>{const fade=window.setTimeout(()=>setFading(true),1050);const hide=window.setTimeout(()=>setVisible(false),1550);return()=>{window.clearTimeout(fade);window.clearTimeout(hide)}},[]);
  if(!visible)return null;
  return <div role="status" aria-label="Loading Admin Hub" className={"adminhub-loader "+(fading?"is-fading":"")}><div className="adminhub-loader-grid" aria-hidden="true"/><div className="adminhub-loader-glow" aria-hidden="true"/><div className="adminhub-loader-inner"><div className="adminhub-loader-mark"><LogoMktMark className="h-16 w-16"/></div><div className="adminhub-loader-kicker">ADMIN HUB</div><div className="adminhub-loader-title">APPS <span>+</span> GAMES</div><div className="adminhub-loader-line"><i/><i/><i/><i/><i/></div><div className="adminhub-loader-caption">build · revise · ship</div></div></div>;
}
