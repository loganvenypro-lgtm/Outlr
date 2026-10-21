import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { verifySessionToken } from "@/lib/auth";
import { parseItem } from "../../parse-item";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ folderId: string }> };

async function ownsFolder(folderId: string, userId: string) {
  const [row] = await sql`SELECT 1 FROM saved_folders WHERE id = ${folderId} AND user_id = ${userId}`;
  return Boolean(row);
}

/** Save a video or channel in a folder (saving it twice just refreshes its snapshot). */
export async function POST(request: NextRequest, { params }: Ctx) {
  const session = verifySessionToken(request.cookies.get("outlr_session")?.value ?? "");
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { folderId } = await params;
  if (!(await ownsFolder(folderId, session.userId))) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
  }

  const item = parseItem(await request.json().catch(() => null));
  if (!item) return NextResponse.json({ error: "Élément invalide." }, { status: 400 });

  await sql`
    INSERT INTO saved_folder_items (folder_id, item_type, item_id, snapshot)
    VALUES (${folderId}, ${item.type}, ${item.id}, ${sql.json(item.snapshot as never)})
    ON CONFLICT (folder_id, item_type, item_id) DO UPDATE SET snapshot = EXCLUDED.snapshot`;
  await sql`UPDATE saved_folders SET updated_at = now() WHERE id = ${folderId}`;
  return NextResponse.json({ success: true }, { status: 201 });
}

/** Remove an item: `?type=video&id=...`. */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const session = verifySessionToken(request.cookies.get("outlr_session")?.value ?? "");
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { folderId } = await params;
  if (!(await ownsFolder(folderId, session.userId))) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
  }

  const type = request.nextUrl.searchParams.get("type");
  const itemId = request.nextUrl.searchParams.get("id");
  if ((type !== "video" && type !== "channel") || !itemId) {
    return NextResponse.json({ error: "Élément invalide." }, { status: 400 });
  }

  await sql`DELETE FROM saved_folder_items WHERE folder_id = ${folderId} AND item_type = ${type} AND item_id = ${itemId}`;
  await sql`UPDATE saved_folders SET updated_at = now() WHERE id = ${folderId}`;
  return NextResponse.json({ success: true });
}
