import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { parsePage, requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Videos whose title or thumbnail changed after publishing (more than one row in
 * video_variants): the A/B tests and post-publish edits the scanner detected.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const { searchParams } = new URL(request.url);
  const { q, size, offset } = parsePage(searchParams, 30);
  const kind = searchParams.get("kind");
  const like = `%${q}%`;
  const kindFilter = kind === "title" || kind === "thumbnail" ? sql`AND kind = ${kind}` : sql``;
  const search = q ? sql`AND (v.title ILIKE ${like} OR c.name ILIKE ${like} OR t.youtube_video_id ILIKE ${like})` : sql``;

  const base = sql`
    WITH tests AS (
      SELECT youtube_video_id, kind, count(*)::int AS variants, max(first_seen_at) AS last_change
      FROM video_variants WHERE true ${kindFilter}
      GROUP BY youtube_video_id, kind HAVING count(*) > 1
    )
    SELECT t.*, v.title, v.thumbnail_url, v.view_count, v.outlier_multiplier, v.published_at,
           c.name AS channel_name, c.youtube_channel_id
    FROM tests t
    LEFT JOIN videos v ON v.youtube_video_id = t.youtube_video_id
    LEFT JOIN channels c ON c.id = v.channel_id
    WHERE true ${search}`;

  const [{ total }] = await sql`SELECT count(*)::int AS total FROM (${base}) x`;
  const tests = await sql`SELECT * FROM (${base}) x ORDER BY last_change DESC LIMIT ${size} OFFSET ${offset}`;

  const ids = tests.map((t) => t.youtube_video_id as string);
  const variants = ids.length
    ? await sql`
        SELECT youtube_video_id, kind, value, set_at, first_seen_at, last_seen_at, image IS NOT NULL AS has_image
        FROM video_variants WHERE youtube_video_id = ANY(${ids}) ${kindFilter}
        ORDER BY COALESCE(set_at, first_seen_at)`
    : [];

  return NextResponse.json({
    total,
    tests: tests.map((t) => ({
      videoId: t.youtube_video_id,
      kind: t.kind,
      variants: t.variants,
      lastChange: t.last_change,
      title: t.title,
      thumbnail: t.thumbnail_url,
      views: t.view_count,
      multiplier: t.outlier_multiplier,
      publishedAt: t.published_at,
      channelName: t.channel_name,
      channelId: t.youtube_channel_id,
      history: variants
        .filter((v) => v.youtube_video_id === t.youtube_video_id && v.kind === t.kind)
        .map((v) => ({
          value: v.value,
          setAt: v.set_at,
          firstSeenAt: v.first_seen_at,
          lastSeenAt: v.last_seen_at,
          image: v.has_image
            ? `/api/admin/thumbnails?video=${encodeURIComponent(v.youtube_video_id)}&etag=${encodeURIComponent(v.value)}`
            : null,
        })),
    })),
  });
}
