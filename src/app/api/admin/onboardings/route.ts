import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { parsePage, requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Onboarding analyses: competitors found by the engine and the AI's explanation. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const { q, size, offset } = parsePage(new URL(request.url).searchParams, 25);
  const like = `%${q}%`;
  const where = q
    ? sql`(u.email ILIKE ${like} OR o.input_channel ILIKE ${like} OR o.reference->>'title' ILIKE ${like} OR o.competitors::text ILIKE ${like})`
    : sql`true`;

  const [{ total }] = await sql`
    SELECT count(*)::int AS total FROM onboarding_analyses o LEFT JOIN users u ON u.id = o.user_id WHERE ${where}`;
  const rows = await sql`
    SELECT o.id, o.user_id AS "userId", u.email, u.name, o.input_channel AS "inputChannel", o.niche, o.role,
           o.reference, o.competitors, o.insights, o.error, o.duration_ms AS "durationMs", o.created_at AS "createdAt"
    FROM onboarding_analyses o LEFT JOIN users u ON u.id = o.user_id
    WHERE ${where}
    ORDER BY o.created_at DESC
    LIMIT ${size} OFFSET ${offset}`;

  return NextResponse.json({ total, rows });
}
