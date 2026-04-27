// src/app/admin/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "AdminHub Global Control",
    template: "%s | AdminHub Global Control",
  },
  description:
    "Protected AdminHub Global admin area for managing agents, leads, clients, projects, proposals, onboarding, support, and platform operations.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const store = await cookies();
  const token = store.get("admin_token")?.value;

  if (!token) {
    redirect("/login");
  }

  return <>{children}</>;
}