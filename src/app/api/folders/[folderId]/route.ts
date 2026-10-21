import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { verifySessionToken } from "@/lib/auth";
import { FOLDER_NAME_MAX, type SavedItem, type SavedItemSnapshot } from "@/lib/saved-folders";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ folderId: string }> };

/** One folder with its saved items, newest first. */
export async function GET(request: NextRequest, { params }: Ctx) {
  const session = verifySessionToken(request.cookies.get("outlr_session")?.value ?? "");
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { folderId } = await params;

  const [folder] = await sql`
    SELECT id, name, created_at, updated_at FROM saved_folders WHERE id = ${folderId} AND user_id = ${session.userId}`;
  if (!folder) return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });

  const rows = await sql`
    SELECT item_type, item_id, snapshot, added_at FROM saved_folder_items
    WHERE folder_id = ${folderId}
    ORDER BY added_at DESC`;

  const items: SavedItem[] = rows.map((r) => ({
    type: r.item_type as SavedItem["type"],
    id: r.item_id as string,
    snapshot: r.snapshot as SavedItemSnapshot,
    addedAt: new Date(r.added_at).toISOString(),
  }));
  return NextResponse.json({
    folder: {
      id: folder.id as string,
      name: folder.name as string,
      createdAt: new Date(folder.created_at).toISOString(),
      updatedAt: new Date(folder.updated_at).toISOString(),
    },
    items,
  });
}

/** Rename a folder. */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = verifySessionToken(request.cookies.get("outlr_session")?.value ?? "");
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { folderId } = await params;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > FOLDER_NAME_MAX) {
    return NextResponse.json({ error: `Le nom doit faire entre 1 et ${FOLDER_NAME_MAX} caractères.` }, { status: 400 });
  }

  const [folder] = await sql`
    UPDATE saved_folders SET name = ${name}, updated_at = now()
    WHERE id = ${folderId} AND user_id = ${session.userId}
    RETURNING id, name`;
  if (!folder) return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
  return NextResponse.json({ folder });
}

/** Delete a folder and everything saved in it. */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const session = verifySessionToken(request.cookies.get("outlr_session")?.value ?? "");
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { folderId } = await params;

  const deleted = await sql`
    DELETE FROM saved_folders WHERE id = ${folderId} AND user_id = ${session.userId} RETURNING id`;
  if (deleted.length === 0) return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
  return NextResponse.json({ success: true });
}
