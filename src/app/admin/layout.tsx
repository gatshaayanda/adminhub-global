// src/app/admin/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  FOUNDER_SESSION_COOKIE,
  verifyFounderSession,
} from "../../lib/boardsignal/founderSession.mjs";

export const metadata: Metadata = {
  title: {
    default: "Admin Hub Admin",
    template: "%s | Admin Hub Admin",
  },
  description:
    "Protected Admin Hub workspace for managing products, projects, content, client work, and build evidence.",
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
  const session = store.get(FOUNDER_SESSION_COOKIE)?.value;
  const authorized = await verifyFounderSession(
    session,
    process.env.ADMIN_PASSWORD,
  );

  if (!authorized) {
    redirect("/login-secret-login-for-admins97F4B2NXQ");
  }

  return <>{children}</>;
}
