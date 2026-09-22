import type { BusinessProfile, DemoBooking, DemoService } from "./types";

export const DEMO_ADMIN_ID = "demo";

export const seedBusiness: BusinessProfile = {
  name: "Your Business",
  tagline: "A simple way to turn your services into bookings.",
  description: "This is a working example of a small-business website. The content is deliberately generic so a prospect can imagine their own brand, services, prices and customer flow here.",
  phone: "+267 71 000 000",
  whatsapp: "+267 71 000 000",
  email: "hello@example.com",
  location: "Gaborone, Botswana",
  instagram: "",
  facebook: "",
};

export const seedServices: DemoService[] = [
  { id: "service-clean", name: "Standard Service", category: "Popular", description: "A dependable everyday service for customers who want a straightforward booking.", price: 120, active: true },
  { id: "service-premium", name: "Premium Package", category: "Packages", description: "A fuller package for customers who want more included in one visit.", price: 220, active: true },
  { id: "service-business", name: "Business Service", category: "Business", description: "A flexible option for repeat customers and small business needs.", price: 350, active: true },
  { id: "service-add-on", name: "Add-on Service", category: "Extras", description: "A useful extra that can be added to another booking.", price: 60, active: true },
];

export const seedBookings: DemoBooking[] = [
  { id: "demo-booking-1", name: "Jordan Smith", phone: "+267 72 123 456", email: "jordan@example.com", serviceId: "service-premium", serviceName: "Premium Package", date: "2026-09-18", startTime: "10:00", notes: "Please confirm availability before the appointment.", status: "New", createdAt: "2026-09-15T09:30:00.000Z" },
  { id: "demo-booking-2", name: "Naledi Molefe", phone: "+267 74 555 111", email: "naledi@example.com", serviceId: "service-clean", serviceName: "Standard Service", date: "2026-09-17", startTime: "14:00", notes: "Returning customer.", status: "Confirmed", createdAt: "2026-09-14T13:10:00.000Z" },
];
