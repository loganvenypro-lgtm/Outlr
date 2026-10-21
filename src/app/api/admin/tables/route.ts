import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Public PostgreSQL tables with their row count and size. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const tables = await sql`
    SELECT c.relname AS name, pg_total_relation_size(c.oid)::bigint AS bytes,
           GREATEST(c.reltuples, 0)::bigint AS "estimatedRows"
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname`;

  // Exact counts are cheap at this scale and the estimate is -1 on never-analyzed tables
  const withCounts = await Promise.all(
    tables.map(async (t) => {
      const [{ count }] = await sql`SELECT count(*)::int AS count FROM ${sql(t.name as string)}`;
      return { name: t.name, rows: count, bytes: Number(t.bytes) };
    })
  );

  return NextResponse.json({ tables: withCounts });
}
