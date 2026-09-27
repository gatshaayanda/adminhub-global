import { notFound } from "next/navigation";
import LiveRecoveryQaProbe from "@/components/LiveRecoveryQaProbe";

type SearchParams = Promise<{ state?: string }>;

export default async function BoardSignalLiveRecoveryQaPage({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  return <main><LiveRecoveryQaProbe saved={params.state !== "empty"} /></main>;
}
