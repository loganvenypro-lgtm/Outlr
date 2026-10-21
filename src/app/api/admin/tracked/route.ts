import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { parsePage, requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Channels followed on /tracking, and the channels users picked at onboarding. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const { q } = parsePage(new URL(request.url).searchParams);
  const like = `%${q}%`;

  const tracked = await sql`
    SELECT t.id, t.channel_id AS "channelId", t.name, t.handle, t.avatar, t.subscribers, t.total_views AS "totalViews",
           t.video_count AS "videoCount", t.tags, t.notes, t.baseline_views AS "baselineViews",
           t.last_checked_at AS "lastCheckedAt", t.added_at AS "addedAt", f.name AS "folderName"
    FROM tracked_channels t LEFT JOIN folders f ON f.id::text = t.folder_id::text
    WHERE ${q ? sql`(t.name ILIKE ${like} OR t.handle ILIKE ${like} OR t.channel_id ILIKE ${like})` : sql`true`}
    ORDER BY t.added_at DESC`;

  // Chosen at onboarding, as "my channel" or as a competitor
  const picked = await sql`
    SELECT x.id AS "channelId", c.name, c.thumbnail_url AS avatar, c.subscriber_count AS subscribers,
           count(*) FILTER (WHERE x.kind = 'own')::int AS "asOwn",
           count(*) FILTER (WHERE x.kind = 'competitor')::int AS "asCompetitor"
    FROM (
      SELECT youtube_channel_id AS id, 'own' AS kind FROM users WHERE youtube_channel_id IS NOT NULL
      UNION ALL
      SELECT unnest(competitor_channel_ids), 'competitor' FROM users
    ) x LEFT JOIN channels c ON c.youtube_channel_id = x.id
    WHERE ${q ? sql`(c.name ILIKE ${like} OR x.id ILIKE ${like})` : sql`true`}
    GROUP BY x.id, c.name, c.thumbnail_url, c.subscriber_count
    ORDER BY count(*) DESC`;

  return NextResponse.json({ tracked, picked });
}
