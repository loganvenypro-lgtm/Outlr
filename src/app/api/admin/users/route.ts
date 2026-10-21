import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { parsePage, requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Every account with its channel, competitors, folders and onboarding count. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const { q } = parsePage(new URL(request.url).searchParams);
  const like = `%${q}%`;

  const users = await sql`
    SELECT u.id, u.email, u.name, u.avatar, u.plan, u.role, u.created_at AS "createdAt", u.updated_at AS "updatedAt",
           u.youtube_channel_id AS "channelId", c.name AS "channelName", c.thumbnail_url AS "channelAvatar",
           c.subscriber_count AS "channelSubscribers",
           COALESCE((
             SELECT json_agg(json_build_object('id', x.id, 'name', cc.name, 'avatar', cc.thumbnail_url) ORDER BY x.ord)
             FROM unnest(u.competitor_channel_ids) WITH ORDINALITY AS x(id, ord)
             LEFT JOIN channels cc ON cc.youtube_channel_id = x.id
           ), '[]') AS competitors,
           (SELECT count(*) FROM saved_folders f WHERE f.user_id = u.id)::int AS folders,
           (SELECT count(*) FROM saved_folder_items i JOIN saved_folders f ON f.id = i.folder_id WHERE f.user_id = u.id)::int AS "folderItems",
           (SELECT count(*) FROM onboarding_analyses o WHERE o.user_id = u.id)::int AS onboardings
    FROM users u
    LEFT JOIN channels c ON c.youtube_channel_id = u.youtube_channel_id
    WHERE ${q ? sql`(u.email ILIKE ${like} OR u.name ILIKE ${like} OR u.id ILIKE ${like} OR c.name ILIKE ${like})` : sql`true`}
    ORDER BY u.created_at DESC`;

  return NextResponse.json({ users });
}
