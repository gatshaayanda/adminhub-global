import type { Metadata } from "next";
import UniversalPlayerDesk from "@/components/UniversalPlayerDesk";

export const metadata: Metadata = {
  title: "Player Desk",
  robots: { index: false, follow: false },
};

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { handle } = await params;
  const { mode } = await searchParams;
  return <UniversalPlayerDesk requestedUsername={decodeURIComponent(handle).replace(/^@/, "")} mode={mode === "seed" ? "seed" : "live"} />;
}

