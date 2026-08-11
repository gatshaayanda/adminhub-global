import AdminNav from "@/components/AdminNav";
import FoundingBetaPlayersAdmin from "@/components/FoundingBetaPlayersAdmin";

export default function PlayersAdminPage() {
  return <div id="main" className="container admin-shell"><header className="admin-heading"><div><p className="kicker">Identity and membership</p><h1>Players</h1></div></header><AdminNav /><FoundingBetaPlayersAdmin /></div>;
}
