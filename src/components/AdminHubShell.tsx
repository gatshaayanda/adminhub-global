"use client";
import {useEffect,useState,type ReactNode} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Menu,X} from "lucide-react";
import SignalMark from "@/components/SignalMark";
import BoardSignalThemeControl from "@/components/BoardSignalThemeControl";
import BoardSignalSituationalMotion from "@/components/BoardSignalSituationalMotion";
import AskBoardSignal from "@/components/AskBoardSignal";
import ConnectivityProvider from "@/components/ConnectivityProvider";
import AdminHeader from "@/components/Header";
import AdminFooter from "@/components/Footer";
import AdminHubLoader from "@/components/AdminHubLoader";
import AdminServiceWorker from "@/components/ServiceWorkerRegister";
import AdminInstallPrompt from "@/components/InstallPrompt";
import AdminChatWidget from "@/components/ChatWidget";

function BoardSignalChrome({children}:{children:ReactNode}){
 const pathname=usePathname(); const [theme,setTheme]=useState("light"); const [open,setOpen]=useState(false);
 useEffect(()=>{const sync=()=>setTheme(document.documentElement.dataset.bsTheme||"light");sync();const o=new MutationObserver(sync);o.observe(document.documentElement,{attributes:true,attributeFilter:["data-bs-theme"]});return()=>o.disconnect()},[]);
 const nav=[["Home","/boardsignal"],["Universe","/feed"],["My BoardSignal","/boardsignal/player-room"]] as const;
 return <div className="boardsignal-root" data-bs-theme={theme}><ConnectivityProvider><header className="site-header"><a href="#main" className="skip-link">Skip to content</a><div className="container masthead"><Link href="/boardsignal" className="brand-lockup"><SignalMark className="brand-mark"/><span><span className="brand-name">BoardSignal</span><span className="brand-line">Your games, understood</span></span></Link><nav className="desktop-nav" aria-label="BoardSignal navigation">{nav.map(([label,href])=><Link key={href} href={href} className={pathname===href||pathname?.startsWith(href+"/")?"active":""}>{label}</Link>)}</nav><div className="header-actions"><BoardSignalThemeControl className="bs-theme-control-desktop"/><Link href="/boardsignal#get-my-boardsignal" className="button button-dark header-join">Get My BoardSignal</Link><button type="button" className="menu-button" onClick={()=>setOpen(v=>!v)} aria-label={open?"Close menu":"Open menu"}>{open?<X size={22}/>:<Menu size={22}/>}</button></div></div>{open?<nav className="mobile-nav container"><BoardSignalThemeControl className="bs-theme-control-mobile"/>{nav.map(([label,href])=><Link key={href} href={href} onClick={()=>setOpen(false)}>{label}</Link>)}</nav>:null}</header><main className="site-main">{children}</main><footer className="site-footer"><div className="container footer-grid"><div className="footer-brand"><SignalMark className="footer-mark"/><div><p className="brand-name">BoardSignal</p><p>One seven-day episode at a time.</p></div></div><nav className="footer-links"><Link href="/boardsignal">Home</Link><Link href="/feed">Universe</Link><Link href="/boardsignal/player-room">My Player Room</Link><Link href="/boardsignal/privacy">Privacy</Link></nav><div className="footer-note"><p className="kicker">Privacy rule</p><p>Public highlights. Private improvement guidance.</p></div></div></footer><BoardSignalSituationalMotion/><AskBoardSignal/></ConnectivityProvider></div>;
}
export default function AdminHubShell({children}:{children:ReactNode}){const pathname=usePathname();const bs=pathname==="/boardsignal"||pathname?.startsWith("/boardsignal/");if(bs)return <BoardSignalChrome>{children}</BoardSignalChrome>;return <><AdminHubLoader/><div className="flex min-h-screen flex-col bg-[var(--background)]"><div className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(6,10,18,0.82)] shadow-[0_10px_35px_rgba(0,0,0,0.28)] backdrop-blur-xl"><AdminHeader/></div><main className="flex-1">{children}</main><AdminFooter/></div><AdminServiceWorker/><AdminInstallPrompt/><AdminChatWidget/></>}