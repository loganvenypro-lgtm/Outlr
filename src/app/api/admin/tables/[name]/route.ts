import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { parsePage, requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Never sent to the browser, even to admins
const HIDDEN_COLUMNS = new Set(["password_hash"]);
// Newest rows first when the table has one of these
const SORT_COLUMNS = ["created_at", "captured_at", "added_at", "started_at", "first_seen_at", "detected_at", "rejected_at", "sent_at", "day"];

/** One page of rows of a public table, optionally filtered by a text search over the whole row. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const { name } = await params;
  const { page, size, offset, q } = parsePage(new URL(request.url).searchParams);

  // The name only reaches SQL once it matches a real table
  const columns = await sql`
    SELECT column_name AS name, data_type AS type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${name} ORDER BY ordinal_position`;
  if (columns.length === 0) return NextResponse.json({ error: "Table inconnue." }, { status: 404 });

  // Binary columns (thumbnail images) are left out: shown on the A/B tests tab instead
  const shown = columns.filter((c) => !HIDDEN_COLUMNS.has(c.name as string) && c.type !== "bytea");
  const visible = shown.map((c) => c.name as string);
  const sortColumn = SORT_COLUMNS.find((s) => visible.includes(s));
  const table = sql(name);
  // Search the visible columns only, so hidden values can't be guessed through it
  const where = q ? sql`WHERE ROW(${sql(visible)})::text ILIKE ${`%${q}%`}` : sql``;
  const order = sortColumn ? sql`ORDER BY ${sql(sortColumn)} DESC NULLS LAST` : sql``;

  const [{ total }] = await sql`SELECT count(*)::int AS total FROM ${table} t ${where}`;
  const rows = await sql`SELECT ${sql(visible)} FROM ${table} t ${where} ${order} LIMIT ${size} OFFSET ${offset}`;

  return NextResponse.json({
    name,
    columns: shown,
    total,
    page,
    size,
    rows,
  });
}
