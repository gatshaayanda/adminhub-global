import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return <div id="main" className="container section-pad"><div className="form-card"><div className="info-card-icon"><WifiOff size={20} /></div><p className="kicker" style={{ marginTop: "1rem" }}>BoardSignal offline</p><h1 style={{ fontSize: "clamp(2.7rem,7vw,5.5rem)", fontFamily: "var(--font-serif)", marginTop: ".7rem" }}>The newsroom lost its signal.</h1><p className="standfirst">Reconnect to retrieve new games or load coverage that has not already been saved on this device.</p><div className="interior-actions"><Link href="/" className="button button-lime">Try the Universe again</Link></div></div></div>;
}
