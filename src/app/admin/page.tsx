import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import { getAdminFromToken, SESSION_COOKIE } from "@/lib/admin";
import { AdminView } from "@/components/admin/admin-view";

export const dynamic = "force-dynamic";

/** /admin: every user, onboarding, AI result and database of the site. Admins only. */
export default async function AdminPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !verifySessionToken(token)) redirect("/login");
  const admin = await getAdminFromToken(token);
  if (!admin) redirect("/");
  return <AdminView adminEmail={admin.email} />;
}
