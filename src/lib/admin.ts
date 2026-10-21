import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { verifySessionToken } from "@/lib/auth";

export const SESSION_COOKIE = "outlr_session";

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
}

/** Emails listed in ADMIN_EMAILS (comma separated) are admins even without users.role = 'admin'. */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminUser(user: { email: string; role?: string | null }): boolean {
  return user.role === "admin" || adminEmails().has(user.email.toLowerCase());
}

/**
 * Resolves a session cookie to an admin, or null. The role is read from the
 * database on every call so revoking it takes effect without a new login.
 */
export async function getAdminFromToken(token: string | undefined): Promise<AdminSession | null> {
  const session = token ? verifySessionToken(token) : null;
  if (!session) return null;
  const [row] = await sql`SELECT id, email, name, role FROM users WHERE id = ${session.userId} LIMIT 1`;
  if (!row) return null;
  return isAdminUser({ email: row.email, role: row.role }) ? { userId: row.id, email: row.email, name: row.name } : null;
}

/** Guard for /api/admin/* handlers: returns the admin, or the 401/403 response to send back. */
export async function requireAdmin(request: NextRequest): Promise<AdminSession | NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const admin = await getAdminFromToken(token);
  if (!admin) return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  return admin;
}

export function parsePage(searchParams: URLSearchParams, defaultSize = 50) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const size = Math.min(200, Math.max(1, Number(searchParams.get("size")) || defaultSize));
  const q = searchParams.get("q")?.trim() ?? "";
  return { page, size, offset: (page - 1) * size, q };
}
