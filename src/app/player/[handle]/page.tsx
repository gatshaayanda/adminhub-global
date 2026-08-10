import type { Metadata } from "next";
import UniversalPlayerDesk from "@/components/UniversalPlayerDesk";

export const metadata: Metadata = {
  title: "Player Desk",
  robots: { index: false, follow: false },
};

export default async function PlayerPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <UniversalPlayerDesk requestedUsername={decodeURIComponent(handle).replace(/^@/, "")} />;
}
