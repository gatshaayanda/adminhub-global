// src/app/admin/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import React, { ReactNode } from "react";

export const metadata = {
  title: "Sparkle Legacy Admin",
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