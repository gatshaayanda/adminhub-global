import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Open My BoardSignal", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default function BoardSignalLegacyAccessPage() {
  redirect("/boardsignal/player-room");
}
