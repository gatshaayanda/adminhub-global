import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import UsernameDeskForm from "@/components/UsernameDeskForm";

export const metadata = { title: "Find My Desk" };

export default function FindDeskPage() {
  return (
    <div id="main" className="player-gateway-page">
      <section className="container find-desk-page">
        <Link href="/" className="desk-back"><ArrowLeft size={16} /> Back home</Link>
        <p className="kicker">Start with the player</p>
        <h1>Find your BoardSignal Desk.</h1>
        <p className="standfirst">No account form. No payment form. Enter the public Chess.com username whose completed Desk you want to open.</p>
        <UsernameDeskForm />
        <div className="gateway-privacy-note"><ShieldCheck size={20} /><div><strong>BoardSignal never asks for a Chess.com password.</strong><p>The normal product retrieves public games by username. Manual PGN upload is only a recovery path.</p></div></div>
      </section>
    </div>
  );
}

