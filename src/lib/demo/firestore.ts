import { DEMO_ADMIN_ID, seedBookings, seedBusiness, seedServices } from "./data";
import type { BusinessProfile, DemoBooking, DemoService } from "./types";

async function request<T = { ok: true }>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Demo request failed.");
  return data as T;
}

export async function loadDemoData() {
  const response = await fetch("/api/demo", { cache: "no-store" });
  if (!response.ok) return { business: seedBusiness, services: seedServices, bookings: seedBookings };
  return response.json() as Promise<{ business: BusinessProfile; services: DemoService[]; bookings: DemoBooking[] }>;
}

export async function loadDemoBusiness() { return (await loadDemoData()).business; }
export async function loadDemoServices() { return (await loadDemoData()).services; }
export async function loadDemoBookings() { return (await loadDemoData()).bookings; }

export async function saveDemoBusiness(profile: BusinessProfile) {
  await request({ action: "business", business: { ...profile, admin_id: DEMO_ADMIN_ID } });
}

export async function saveDemoService(service: DemoService) {
  await request({ action: "service", service: { ...service, admin_id: DEMO_ADMIN_ID } });
}

export async function createDemoBooking(input: Omit<DemoBooking, "id" | "createdAt" | "status">) {
  return request<DemoBooking>({ action: "booking", booking: input });
}

export async function updateDemoBookingStatus(id: string, status: DemoBooking["status"]) {
  await request({ action: "status", id, status });
}

export async function deleteDemoService(id: string) {
  await request({ action: "delete-service", id });
}

export async function resetDemoData() {
  await request({ action: "reset" });
}
