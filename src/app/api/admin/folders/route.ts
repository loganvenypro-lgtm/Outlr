import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { parsePage, requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Every user's saved folders with their items. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const { q } = parsePage(new URL(request.url).searchParams);
  const like = `%${q}%`;

  const folders = await sql`
    SELECT f.id, f.name, f.created_at AS "createdAt", f.updated_at AS "updatedAt",
           u.id AS "userId", u.email, u.name AS "userName",
           COALESCE((
             SELECT json_agg(json_build_object('type', i.item_type, 'id', i.item_id, 'snapshot', i.snapshot, 'addedAt', i.added_at) ORDER BY i.added_at DESC)
             FROM saved_folder_items i WHERE i.folder_id = f.id
           ), '[]') AS items
    FROM saved_folders f JOIN users u ON u.id = f.user_id
    WHERE ${q ? sql`(f.name ILIKE ${like} OR u.email ILIKE ${like} OR EXISTS (
      SELECT 1 FROM saved_folder_items i WHERE i.folder_id = f.id AND i.snapshot::text ILIKE ${like}))` : sql`true`}
    ORDER BY f.updated_at DESC`;

  return NextResponse.json({ folders });
}
