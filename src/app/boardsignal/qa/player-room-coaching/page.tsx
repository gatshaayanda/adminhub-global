import { notFound } from "next/navigation";
import CurrentBoardSignalEngagement from "@/components/CurrentBoardSignalEngagement";
import PlayerRoomCoachingQaProbe from "@/components/PlayerRoomCoachingQaProbe";

type SearchParams = Promise<{ theme?: string; level?: string }>;

export default async function BoardSignalPlayerRoomCoachingQaPage({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const theme = params.theme === "dark" ? "dark" : "light";
  const parsedLevel = Number(params.level);
  const level = parsedLevel === 2 || parsedLevel === 3 ? parsedLevel : 1;

  return <main className="player-room-authenticated" style={{ width: "min(100% - 1rem, 72rem)", margin: "0 auto", padding: "1rem 0 4rem" }}>
    <PlayerRoomCoachingQaProbe theme={theme} level={level} />
    <section className="g3-before-next-game" aria-label="Before Your Next Game QA surface">
      <span>BEFORE YOUR NEXT GAME</span>
      <h3>Check the forcing reply first.</h3>
      <p>This native guidance copy stays readable on the inverse Current BoardSignal surface.</p>
      <small>CURRENT PERIOD · PROVISIONAL</small>
    </section>
    <CurrentBoardSignalEngagement />
  </main>;
}
