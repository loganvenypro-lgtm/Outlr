import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { verifySessionToken } from "@/lib/auth";
import { FOLDER_NAME_MAX, type SavedFolder } from "@/lib/saved-folders";
import { parseItem } from "./parse-item";

export const dynamic = "force-dynamic";

function folderJson(r: Record<string, unknown>): SavedFolder {
  return {
    id: r.id as string,
    name: r.name as string,
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
    videoCount: Number(r.video_count ?? 0),
    channelCount: Number(r.channel_count ?? 0),
    previews: ((r.previews as (string | null)[] | null) ?? []).filter((p): p is string => Boolean(p)),
    ...(r.contains_item != null ? { containsItem: Boolean(r.contains_item) } : {}),
  };
}

/**
 * The signed-in user's folders, newest first. With `?type=video&id=...` each
 * folder also says whether it already holds that item (for the "save" menu).
 */
export async function GET(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get("outlr_session")?.value ?? "");
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const type = request.nextUrl.searchParams.get("type");
  const itemId = request.nextUrl.searchParams.get("id");
  const lookup = (type === "video" || type === "channel") && itemId ? { type, itemId } : null;

  const rows = await sql`
    SELECT f.id, f.name, f.created_at, f.updated_at,
      (SELECT count(*) FROM saved_folder_items i WHERE i.folder_id = f.id AND i.item_type = 'video')::int AS video_count,
      (SELECT count(*) FROM saved_folder_items i WHERE i.folder_id = f.id AND i.item_type = 'channel')::int AS channel_count,
      (SELECT array_agg(p.thumb) FROM (
        SELECT i.snapshot->>'thumbnail' AS thumb FROM saved_folder_items i
        WHERE i.folder_id = f.id AND i.snapshot->>'thumbnail' IS NOT NULL ORDER BY i.added_at DESC LIMIT 4
      ) p) AS previews
      ${lookup
        ? sql`, EXISTS (SELECT 1 FROM saved_folder_items i WHERE i.folder_id = f.id AND i.item_type = ${lookup.type} AND i.item_id = ${lookup.itemId}) AS contains_item`
        : sql``}
    FROM saved_folders f
    WHERE f.user_id = ${session.userId}
    ORDER BY f.created_at DESC`;

  return NextResponse.json({ folders: rows.map(folderJson) });
}

/** Create a folder, optionally saving a first item in it right away. */
export async function POST(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get("outlr_session")?.value ?? "");
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > FOLDER_NAME_MAX) {
    return NextResponse.json({ error: `Le nom doit faire entre 1 et ${FOLDER_NAME_MAX} caractères.` }, { status: 400 });
  }
  const item = body.item ? parseItem(body.item) : null;
  if (body.item && !item) return NextResponse.json({ error: "Élément invalide." }, { status: 400 });

  const id = `fld_${crypto.randomBytes(8).toString("hex")}`;
  const [folder] = await sql.begin(async (tx) => {
    const created = await tx`
      INSERT INTO saved_folders (id, user_id, name) VALUES (${id}, ${session.userId}, ${name})
      RETURNING id, name, created_at, updated_at`;
    if (item) {
      await tx`
        INSERT INTO saved_folder_items (folder_id, item_type, item_id, snapshot)
        VALUES (${id}, ${item.type}, ${item.id}, ${tx.json(item.snapshot as never)})`;
    }
    return created;
  });

  return NextResponse.json(
    {
      folder: folderJson({
        ...folder,
        video_count: item?.type === "video" ? 1 : 0,
        channel_count: item?.type === "channel" ? 1 : 0,
        previews: item?.snapshot.thumbnail ? [item.snapshot.thumbnail] : [],
        ...(item ? { contains_item: true } : {}),
      }),
    },
    { status: 201 },
  );
}
