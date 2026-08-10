import Link from "next/link";
import { privateWeek } from "@/data/boardsignal";

export default function PlayerHeader() {
  return (
    <div className="player-topbar">
      <div className="player-ident"><div className="avatar">AG</div><div><strong>{privateWeek.player}</strong><span>Chess.com confirmed · Africa/Gaborone</span></div></div>
      <Link href="/app/profile" className="button button-quiet">Privacy & sharing</Link>
    </div>
  );
}
