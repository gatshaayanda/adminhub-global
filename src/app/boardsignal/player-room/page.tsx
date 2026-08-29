import type { Metadata } from "next";
import BoardSignalPlayerRoomGate from "@/components/BoardSignalPlayerRoomGate";

export const metadata: Metadata = { title: "My BoardSignal", robots: { index: false, follow: false } };

export default function PlayerRoomPage() {
  return <BoardSignalPlayerRoomGate />;
}
