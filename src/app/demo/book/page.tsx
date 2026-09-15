import { Suspense } from "react";
import DemoBookingClient from "@/components/demo/DemoBookingClient";

export default function DemoBookPage() {
  return <Suspense fallback={<div className="demo-loading">Loading booking form…</div>}><DemoBookingClient /></Suspense>;
}
