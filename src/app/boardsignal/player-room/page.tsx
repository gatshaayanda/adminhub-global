import type { Metadata } from "next";
import BoardSignalHistoryWorker from "@/components/BoardSignalHistoryWorker";
import BoardSignalPlayerRoom from "@/components/BoardSignalPlayerRoom";

export const metadata: Metadata = { title: "My Player Room", robots: { index: false, follow: false } };

export default function PlayerRoomPage() {
  return <><BoardSignalPlayerRoom /><BoardSignalHistoryWorker /></>;
}
