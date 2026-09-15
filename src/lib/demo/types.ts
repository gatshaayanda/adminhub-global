export type BookingStatus = "New" | "Contacted" | "Confirmed" | "Completed" | "Cancelled";

export type BusinessProfile = {
  name: string;
  logoUrl?: string;
  tagline: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  location: string;
  instagram: string;
  facebook: string;
};

export type DemoService = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl?: string;
  active: boolean;
};

export type DemoBooking = {
  id: string;
  name: string;
  phone: string;
  email: string;
  serviceId: string;
  serviceName: string;
  date: string;
  startTime: string;
  notes: string;
  status: BookingStatus;
  createdAt: string;
};
