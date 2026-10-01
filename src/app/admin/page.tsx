import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  FOUNDER_SESSION_COOKIE,
  verifyFounderSession,
} from "../../lib/boardsignal/founderSession.mjs";

export default async function AdminEntryPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(FOUNDER_SESSION_COOKIE)?.value;
  const authorized = await verifyFounderSession(
    session,
    process.env.ADMIN_PASSWORD,
  );

  redirect(
    authorized
      ? "/admin/dashboard"
      : "/login-secret-login-for-admins97F4B2NXQ",
  );
}
