"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createDemoBooking, loadDemoBusiness, loadDemoServices } from "@/lib/demo/firestore";
import { seedBusiness, seedServices } from "@/lib/demo/data";
import type { BusinessProfile, DemoService } from "@/lib/demo/types";

export default function DemoBookingClient() {
  const params = useSearchParams();
  const [business, setBusiness] = useState<BusinessProfile>(seedBusiness);
  const [services, setServices] = useState<DemoService[]>(seedServices);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", serviceId: params.get("service") ?? seedServices[0].id, date: "", startTime: "10:00", notes: "" });

  useEffect(() => {
    Promise.all([loadDemoBusiness(), loadDemoServices()]).then(([profile, items]) => {
      setBusiness(profile); setServices(items.filter((item) => item.active));
    }).catch(() => undefined);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const service = services.find((item) => item.id === form.serviceId);
      if (!service) throw new Error("Please choose a service.");
      const result = await createDemoBooking({ ...form, serviceName: service.name });
      setSubmitted(result.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not send the booking."); }
    finally { setSaving(false); }
  }

  if (submitted) return <div className="demo-page demo-book-page"><div className="demo-container demo-confirmation"><CheckCircle2 size={48} /><span className="demo-kicker">Booking received</span><h1>Thanks, {form.name}.</h1><p>Your request has been added to the owner dashboard. This is a live demo, so you can now open the dashboard and see the request move through its workflow.</p><div className="demo-reference">Reference <strong>{submitted.slice(0, 8).toUpperCase()}</strong></div><div className="demo-actions"><Link className="demo-button" href="/demo">Back to website</Link><Link className="demo-button demo-button-ghost" href="/demo/admin">Open owner dashboard</Link></div></div></div>;

  return <div className="demo-page demo-book-page">
    <div className="demo-container demo-book-wrap">
      <Link href="/demo" className="demo-back"><ArrowLeft size={16} /> Back to {business.name}</Link>
      <div className="demo-book-grid">
        <div><span className="demo-kicker">Book a service</span><h1>Send a booking request.</h1><p className="demo-lead">Choose a service, pick a time and leave the owner any useful notes. The request will appear immediately in the owner queue.</p><div className="demo-book-side"><strong>What happens next?</strong><span>1. Request is captured</span><span>2. Owner reviews it</span><span>3. Status is updated</span><span>4. Customer is contacted</span></div></div>
        <form className="demo-form" onSubmit={submit}>
          <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>
          <div className="demo-form-row"><label>Phone<input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+267 ..." /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label></div>
          <label>Service<select required value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>{services.map((service) => <option key={service.id} value={service.id}>{service.name} — {service.price.toLocaleString()} P</option>)}</select></label>
          <div className="demo-form-row"><label>Date<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Preferred time<input required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></label></div>
          <label>Notes<textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything the owner should know?" /></label>
          {error && <div className="demo-error">{error}</div>}
          <button className="demo-button demo-submit" disabled={saving}>{saving ? <><Loader2 className="demo-spin" size={17} /> Sending...</> : <>Send booking request <CheckCircle2 size={17} /></>}</button>
        </form>
      </div>
    </div>
  </div>;
}
