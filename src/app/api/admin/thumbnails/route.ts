import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** The saved picture of one thumbnail version (video_variants.image). */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const { searchParams } = new URL(request.url);
  const video = searchParams.get("video") ?? "";
  const etag = searchParams.get("etag") ?? "";

  const [row] = await sql`
    SELECT image FROM video_variants
    WHERE youtube_video_id = ${video} AND kind = 'thumbnail' AND value = ${etag} AND image IS NOT NULL`;
  if (!row) return NextResponse.json({ error: "Image introuvable." }, { status: 404 });

  return new NextResponse(new Uint8Array(row.image as Buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      // A version never changes once saved
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
