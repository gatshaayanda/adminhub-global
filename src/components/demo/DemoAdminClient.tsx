"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Eye, EyeOff, ImagePlus, Pencil, Plus, RefreshCcw, Save, Trash2, X } from "lucide-react";
import { loadDemoBookings, loadDemoBusiness, loadDemoServices, resetDemoData, saveDemoBusiness, saveDemoService, updateDemoBookingStatus, deleteDemoService } from "@/lib/demo/firestore";
import { seedBusiness, seedServices } from "@/lib/demo/data";
import type { BookingStatus, BusinessProfile, DemoBooking, DemoService } from "@/lib/demo/types";
import { uploadFiles } from "@/utils/uploadthing";

const statuses: BookingStatus[] = ["New", "Contacted", "Confirmed", "Completed", "Cancelled"];

export default function DemoAdminClient() {
  const [business, setBusiness] = useState<BusinessProfile>(seedBusiness);
  const [services, setServices] = useState<DemoService[]>(seedServices);
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [editing, setEditing] = useState<DemoService | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [profile, items, requests] = await Promise.all([loadDemoBusiness(), loadDemoServices(), loadDemoBookings()]);
      setBusiness(profile); setServices(items); setBookings(requests);
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh().catch(() => setLoading(false)); }, []);

  const activeCount = services.filter((item) => item.active).length;
  const newCount = bookings.filter((item) => item.status === "New").length;
  const totalValue = bookings.reduce((sum, item) => sum + (services.find((service) => service.id === item.serviceId)?.price ?? 0), 0);

  async function saveProfile(event: React.FormEvent) { event.preventDefault(); await saveDemoBusiness(business); setNotice("Business details saved."); }
  async function saveService(event: React.FormEvent) { event.preventDefault(); if (!editing) return; await saveDemoService(editing); setEditing(null); await refresh(); setNotice("Service saved."); }
  async function toggleService(service: DemoService) { await saveDemoService({ ...service, active: !service.active }); await refresh(); }
  async function removeService(service: DemoService) { if (!window.confirm(`Delete ${service.name}?`)) return; await deleteDemoService(service.id); await refresh(); }
  async function status(id: string, value: BookingStatus) { await updateDemoBookingStatus(id, value); setBookings((current) => current.map((item) => item.id === id ? { ...item, status: value } : item)); }
  async function reset() { if (!window.confirm("Reset the demo to its original seeded data?")) return; await resetDemoData(); await refresh(); setNotice("Demo reset to its original state."); }

  async function uploadLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const result = await uploadFiles("fileUploader", { files: [file] });
    const url = result[0]?.ufsUrl ?? result[0]?.url;
    if (url) { const next = { ...business, logoUrl: url }; setBusiness(next); await saveDemoBusiness(next); setNotice("Logo uploaded."); }
  }

  const sortedBookings = useMemo(() => [...bookings].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)), [bookings]);

  return <div className="demo-admin-page">
    <header className="demo-admin-top"><div className="demo-container demo-admin-top-inner"><Link href="/demo" className="demo-admin-brand"><span className="demo-logo">{business.name.slice(0, 1)}</span><span><strong>{business.name}</strong><small>Owner dashboard</small></span></Link><div className="demo-admin-actions"><Link href="/demo">View website</Link><button onClick={() => refresh()}><RefreshCcw size={15} /> Refresh</button><button onClick={reset}><RefreshCcw size={15} /> Reset demo</button></div></div></header>

    <main className="demo-container demo-admin-main">
      <div className="demo-admin-heading"><div><span className="demo-kicker">Business controls</span><h1>Run the demo business.</h1><p>Change the business and watch the customer-facing website reflect it.</p></div>{notice && <div className="demo-notice"><Check size={16} /> {notice}</div>}</div>
      <div className="demo-admin-stats"><div><span>Active services</span><strong>{activeCount}</strong></div><div><span>New requests</span><strong>{newCount}</strong></div><div><span>Request value</span><strong>{totalValue.toLocaleString()} P</strong></div></div>

      <section className="demo-admin-card"><div className="demo-admin-card-heading"><div><span className="demo-kicker">Business identity</span><h2>Make it yours</h2></div></div>
        <form className="demo-admin-form" onSubmit={saveProfile}>
          <div className="demo-logo-editor"><div className="demo-logo large">{business.logoUrl ? <img src={business.logoUrl} alt="Business logo" /> : business.name.slice(0, 1)}</div><div><strong>Business logo</strong><p>Upload a replacement image for the public site.</p><input ref={fileRef} hidden type="file" accept="image/*" onChange={uploadLogo} /><button type="button" className="demo-button demo-button-ghost" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> Upload image</button></div></div>
          <div className="demo-form-row"><label>Business name<input value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} /></label><label>Tagline<input value={business.tagline} onChange={(e) => setBusiness({ ...business, tagline: e.target.value })} /></label></div>
          <label>Description<textarea rows={3} value={business.description} onChange={(e) => setBusiness({ ...business, description: e.target.value })} /></label>
          <div className="demo-form-row"><label>Phone<input value={business.phone} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} /></label><label>WhatsApp<input value={business.whatsapp} onChange={(e) => setBusiness({ ...business, whatsapp: e.target.value })} /></label></div>
          <div className="demo-form-row"><label>Email<input value={business.email} onChange={(e) => setBusiness({ ...business, email: e.target.value })} /></label><label>Location<input value={business.location} onChange={(e) => setBusiness({ ...business, location: e.target.value })} /></label></div>
          <button className="demo-button" type="submit"><Save size={16} /> Save business</button>
        </form>
      </section>

      <section className="demo-admin-card"><div className="demo-admin-card-heading"><div><span className="demo-kicker">Services & catalogue</span><h2>Control what customers see</h2></div><button className="demo-button" onClick={() => setEditing({ id: `service-${Date.now()}`, name: "New service", category: "Services", description: "Describe this service.", price: 0, active: true })}><Plus size={16} /> Add service</button></div>
        <div className="demo-admin-service-list">{services.map((service) => <div className={service.active ? "demo-admin-service" : "demo-admin-service muted"} key={service.id}><div className="demo-admin-service-thumb">{service.imageUrl ? <img src={service.imageUrl} alt="" /> : service.name.slice(0, 1)}</div><div className="demo-admin-service-copy"><strong>{service.name}</strong><span>{service.category} · {service.price.toLocaleString()} P</span><p>{service.description}</p></div><div className="demo-admin-service-controls"><button title={service.active ? "Hide" : "Show"} onClick={() => toggleService(service)}>{service.active ? <EyeOff size={17} /> : <Eye size={17} />}</button><button title="Edit" onClick={() => setEditing(service)}><Pencil size={17} /></button><button title="Delete" onClick={() => removeService(service)}><Trash2 size={17} /></button></div></div>)}</div>
      </section>

      <section className="demo-admin-card"><div className="demo-admin-card-heading"><div><span className="demo-kicker">Booking queue</span><h2>Customer requests</h2></div></div>
        {loading ? <div className="demo-empty">Loading bookings…</div> : sortedBookings.length === 0 ? <div className="demo-empty">No bookings yet. Use the public website to create one.</div> : <div className="demo-booking-list">{sortedBookings.map((booking) => <article className="demo-booking" key={booking.id}><div><span className="demo-status">{booking.status}</span><h3>{booking.name}</h3><p>{booking.serviceName} · {booking.date} · {booking.startTime}</p><p>{booking.phone}{booking.email ? ` · ${booking.email}` : ""}</p>{booking.notes && <blockquote>{booking.notes}</blockquote>}</div><div className="demo-booking-status"><label>Status<select value={booking.status} onChange={(e) => status(booking.id, e.target.value as BookingStatus)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label></div></article>)}</div>}
      </section>
    </main>

    {editing && <div className="demo-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><form className="demo-modal" onSubmit={saveService}><div className="demo-modal-heading"><div><span className="demo-kicker">Service editor</span><h2>{editing.id.startsWith("service-") && !services.some((item) => item.id === editing.id) ? "Add service" : "Edit service"}</h2></div><button type="button" onClick={() => setEditing(null)}><X /></button></div><label>Name<input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label><div className="demo-form-row"><label>Category<input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></label><label>Price<input required type="number" min="0" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></label></div><label>Description<textarea required rows={4} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label><label>Image URL<input value={editing.imageUrl ?? ""} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} placeholder="Optional image URL" /></label><div className="demo-modal-actions"><button type="button" className="demo-button demo-button-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="demo-button" type="submit"><Save size={16} /> Save service</button></div></form></div>}
  </div>;
}
