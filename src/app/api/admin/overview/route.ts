import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Headline counters for the admin home. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const [counts] = await sql`
    SELECT
      (SELECT count(*) FROM users)::int AS users,
      (SELECT count(*) FROM users WHERE youtube_channel_id IS NOT NULL)::int AS "onboardedUsers",
      (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days')::int AS "newUsers7d",
      (SELECT count(*) FROM onboarding_analyses)::int AS onboardings,
      (SELECT count(*) FROM onboarding_analyses WHERE error IS NULL)::int AS "onboardingsOk",
      (SELECT count(*) FROM saved_folders)::int AS folders,
      (SELECT count(*) FROM saved_folder_items)::int AS "folderItems",
      (SELECT count(*) FROM tracked_channels)::int AS "trackedChannels",
      (SELECT count(*) FROM channels)::int AS channels,
      (SELECT count(*) FROM videos)::int AS videos,
      (SELECT count(*) FROM channel_alerts)::int AS alerts,
      (SELECT count(*) FROM (
        SELECT 1 FROM video_variants GROUP BY youtube_video_id, kind HAVING count(*) > 1
      ) t)::int AS "abTests"`;

  const recentUsers = await sql`
    SELECT id, email, name, role, created_at AS "createdAt" FROM users ORDER BY created_at DESC LIMIT 5`;
  const recentScans = await sql`
    SELECT id, started_at AS "startedAt", finished_at AS "finishedAt", status FROM scan_runs ORDER BY started_at DESC LIMIT 5`;

  return NextResponse.json({
    counts,
    recentUsers,
    recentScans,
    posthogUrl: process.env.POSTHOG_PROJECT_URL || "https://us.posthog.com",
  });
}
