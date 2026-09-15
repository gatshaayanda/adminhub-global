import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, isFirebaseAdminConfigured } from "@/utils/firebaseAdmin";
import { seedBookings, seedBusiness, seedServices } from "@/lib/demo/data";

export const dynamic = "force-dynamic";

const names = { business: "demo_business", services: "demo_services", bookings: "demo_bookings" } as const;

function unavailable() {
  return NextResponse.json({ error: "Demo data service is not configured." }, { status: 503 });
}

export async function GET() {
  if (!isFirebaseAdminConfigured()) return unavailable();
  const db = getAdminDb();
  const [businessSnap, servicesSnap, bookingsSnap] = await Promise.all([
    db.collection(names.business).doc("profile").get(),
    db.collection(names.services).orderBy("name").get(),
    db.collection(names.bookings).orderBy("createdAt", "desc").get(),
  ]);
  return NextResponse.json({
    business: businessSnap.exists ? businessSnap.data() : seedBusiness,
    services: servicesSnap.empty ? seedServices : servicesSnap.docs.map((item) => ({ id: item.id, ...item.data() })),
    bookings: bookingsSnap.empty ? seedBookings : bookingsSnap.docs.map((item) => ({ id: item.id, ...item.data() })),
  });
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) return unavailable();
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Invalid demo request." }, { status: 400 });
  const db = getAdminDb();

  if (body.action === "booking") {
    const input = body.booking;
    if (!input || typeof input.name !== "string" || typeof input.phone !== "string" || typeof input.serviceId !== "string" || typeof input.serviceName !== "string" || typeof input.date !== "string" || typeof input.startTime !== "string") {
      return NextResponse.json({ error: "Name, phone, service, date and time are required." }, { status: 400 });
    }
    const ref = db.collection(names.bookings).doc();
    const booking = { ...input, status: "New", createdAt: new Date().toISOString() };
    await ref.set(booking);
    return NextResponse.json({ ...booking, id: ref.id });
  }

  if (body.action === "business") {
    await db.collection(names.business).doc("profile").set({ ...body.business, admin_id: "demo", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "service") {
    const service = body.service;
    if (!service || typeof service.id !== "string" || typeof service.name !== "string") return NextResponse.json({ error: "Invalid service." }, { status: 400 });
    const { id, ...payload } = service;
    await db.collection(names.services).doc(id).set({ ...payload, admin_id: "demo", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "status") {
    if (typeof body.id !== "string" || !["New", "Contacted", "Confirmed", "Completed", "Cancelled"].includes(body.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    await db.collection(names.bookings).doc(body.id).set({ status: body.status, admin_id: "demo", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete-service") {
    if (typeof body.id !== "string") return NextResponse.json({ error: "Invalid service." }, { status: 400 });
    await db.collection(names.services).doc(body.id).delete();
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reset") {
    const [businessSnap, servicesSnap, bookingsSnap] = await Promise.all([
      db.collection(names.business).get(), db.collection(names.services).get(), db.collection(names.bookings).get(),
    ]);
    const batch = db.batch();
    [...businessSnap.docs, ...servicesSnap.docs, ...bookingsSnap.docs].forEach((item) => batch.delete(item.ref));
    await batch.commit();
    const seedBatch = db.batch();
    seedBatch.set(db.collection(names.business).doc("profile"), { ...seedBusiness, admin_id: "demo" });
    seedServices.forEach((item) => { const { id, ...payload } = item; seedBatch.set(db.collection(names.services).doc(id), { ...payload, admin_id: "demo" }); });
    seedBookings.forEach(({ id, ...payload }) => seedBatch.set(db.collection(names.bookings).doc(id), { ...payload, admin_id: "demo" }));
    await seedBatch.commit();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown demo action." }, { status: 400 });
}
