import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { getChannelDetails, getRecentVideos } from "@/lib/youtube";

export const dynamic = "force-dynamic";

/**
 * A channel the scanner doesn't know yet: pull it once from YouTube (~3 quota
 * units), store it, and let the background scanner keep it fresh from then on.
 */
async function importChannel(channelId: string): Promise<boolean> {
  const detail = await getChannelDetails(channelId);
  if (!detail) return false;

  await sql`
    INSERT INTO channels (
      id, youtube_channel_id, name, handle, thumbnail_url, subscriber_count, total_views, video_count,
      country, channel_created_at, last_stats_at, discovered_via, discovered_at
    ) VALUES (
      ${`ch-${detail.id}`}, ${detail.id}, ${detail.title}, ${detail.customUrl ?? null}, ${detail.avatar},
      ${detail.hiddenSubscriberCount ? null : (detail.subscriberCount ?? 0)}, ${detail.viewCount}, ${detail.videoCount},
      ${detail.country ?? null}, ${detail.publishedAt ?? null}, now(), 'manual', now()
    )
    ON CONFLICT (youtube_channel_id) DO NOTHING`;

  const uploads = detail.uploadsPlaylistId ?? `UU${detail.id.slice(2)}`;
  const videos = await getRecentVideos(uploads, 50);
  if (videos.length) {
    const rows = videos.map((v) => ({
      id: `vid-${v.id}`,
      youtube_video_id: v.id,
      channel_id: `ch-${detail.id}`,
      title: v.title,
      description: v.description ?? "",
      thumbnail_url: v.thumbnail,
      published_at: v.publishedAt,
      view_count: v.viewCount ?? 0,
      like_count: v.likeCount ?? null,
      comment_count: v.commentCount ?? null,
      duration_seconds: v.durationSeconds ?? 0,
      duration_formatted: v.durationFormatted ?? null,
      is_short: (v.durationSeconds ?? 0) > 0 && (v.durationSeconds ?? 0) <= 60,
      last_stats_at: new Date(),
    }));
    await sql`INSERT INTO videos ${sql(rows)} ON CONFLICT (youtube_video_id) DO NOTHING`;
  }
  return true;
}

const API_BASE = "https://www.googleapis.com/youtube/v3";
const BACKFILL_MAX_VIDEOS = 500;

async function youtubeApi(endpoint: string, query: Record<string, string>) {
  const params = new URLSearchParams({ ...query, key: process.env.YOUTUBE_API_KEY ?? "" });
  const res = await fetch(`${API_BASE}/${endpoint}?${params}`, { cache: "no-store" });
  // Same quota ledger as the scan worker (quota day = Pacific time).
  await sql`
    INSERT INTO api_quota_usage (day, units, calls)
    VALUES ((now() AT TIME ZONE 'America/Los_Angeles')::date, 1, jsonb_build_object(${`${endpoint}.list`}::text, 1))
    ON CONFLICT (day) DO UPDATE SET
      units = api_quota_usage.units + 1,
      calls = api_quota_usage.calls || jsonb_build_object(
        ${`${endpoint}.list`}::text, COALESCE((api_quota_usage.calls->>${`${endpoint}.list`})::int, 0) + 1
      )`;
  if (!res.ok) throw new Error(`YouTube API ${endpoint}: HTTP ${res.status}`);
  return res.json();
}

function parseDuration(iso: string | undefined) {
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso ?? "") ?? [];
  const seconds = (Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0)) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
  const h = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  return { seconds, formatted: h > 0 ? `${h}:${String(mm).padStart(2, "0")}:${ss}` : `${mm}:${ss}` };
}

/**
 * First open of a channel page: import its upload history (up to 500 videos)
 * through the official API — 1 unit per 50 playlist items + 1 per 50 videos.
 */
async function backfillChannel(internalId: string, youtubeChannelId: string) {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await youtubeApi("playlistItems", {
      part: "contentDetails",
      playlistId: `UU${youtubeChannelId.slice(2)}`,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    for (const item of page.items ?? []) if (item.contentDetails?.videoId) ids.push(item.contentDetails.videoId);
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < BACKFILL_MAX_VIDEOS);

  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const data = await youtubeApi("videos", { part: "snippet,statistics,contentDetails", id: batch.join(","), maxResults: "50" });
    const rows = (data.items ?? []).map((item: {
      id: string;
      snippet?: { title?: string; description?: string; publishedAt?: string; categoryId?: string; defaultAudioLanguage?: string; defaultLanguage?: string; tags?: string[]; thumbnails?: { high?: { url?: string } } };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      contentDetails?: { duration?: string };
    }) => {
      const duration = parseDuration(item.contentDetails?.duration);
      return {
        id: `vid-${item.id}`,
        youtube_video_id: item.id,
        channel_id: internalId,
        title: item.snippet?.title ?? "",
        description: item.snippet?.description ?? "",
        thumbnail_url: item.snippet?.thumbnails?.high?.url ?? `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        published_at: item.snippet?.publishedAt ?? new Date().toISOString(),
        view_count: Number(item.statistics?.viewCount ?? 0),
        like_count: item.statistics?.likeCount != null ? Number(item.statistics.likeCount) : null,
        comment_count: item.statistics?.commentCount != null ? Number(item.statistics.commentCount) : null,
        duration_seconds: duration.seconds,
        duration_formatted: duration.formatted,
        is_short: duration.seconds > 0 && duration.seconds <= 60,
        category_id: item.snippet?.categoryId ? Number(item.snippet.categoryId) : null,
        language: item.snippet?.defaultAudioLanguage ?? item.snippet?.defaultLanguage ?? null,
        last_stats_at: new Date(),
      };
    });
    if (rows.length) {
      await sql`
        INSERT INTO videos ${sql(rows)}
        ON CONFLICT (youtube_video_id) DO UPDATE SET
          view_count = EXCLUDED.view_count,
          like_count = EXCLUDED.like_count,
          comment_count = EXCLUDED.comment_count,
          duration_seconds = EXCLUDED.duration_seconds,
          duration_formatted = EXCLUDED.duration_formatted,
          category_id = COALESCE(EXCLUDED.category_id, videos.category_id),
          language = COALESCE(EXCLUDED.language, videos.language),
          last_stats_at = EXCLUDED.last_stats_at`;
    }
  }

  // Per-video multipliers against the now complete history (same median floors as the scanner).
  await sql`
    WITH med AS (
      SELECT is_short, percentile_cont(0.5) WITHIN GROUP (ORDER BY view_count) AS med
      FROM videos
      WHERE channel_id = ${internalId}
        AND published_at BETWEEN now() - interval '180 days' AND now() - interval '3 days'
      GROUP BY is_short
      HAVING count(*) >= 5
    )
    UPDATE videos v
    SET outlier_multiplier = v.view_count::float8 / GREATEST(med.med, CASE WHEN v.is_short THEN 5000 ELSE 1000 END)
    FROM med
    WHERE v.channel_id = ${internalId} AND v.is_short = med.is_short AND v.relevance_score IS NULL`;

  await sql`UPDATE channels SET backfilled_at = now() WHERE id = ${internalId}`;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  const id = decodeURIComponent(channelId).trim();

  try {
    let [channel] = await sql`
      SELECT c.*, (tc.channel_id IS NOT NULL) AS tracked
      FROM channels c
      LEFT JOIN tracked_channels tc ON tc.channel_id = c.youtube_channel_id
      WHERE c.youtube_channel_id = ${id}`;

    if (!channel) {
      const imported = await importChannel(id).catch(() => false);
      if (!imported) return NextResponse.json({ error: "Chaîne introuvable." }, { status: 404 });
      [channel] = await sql`
        SELECT c.*, false AS tracked FROM channels c WHERE c.youtube_channel_id = ${id}`;
    }

    const internalId = channel.id as string;

    if (!channel.backfilled_at) {
      await backfillChannel(internalId, channel.youtube_channel_id as string).catch((err) =>
        console.error("[api/channels] backfill", err),
      );
    }

    const [videos, [kpis], hourly, daily, [deltas], [lastScan]] = await Promise.all([
      sql`
        SELECT
          v.youtube_video_id, v.title, v.thumbnail_url, v.published_at, v.view_count, v.like_count,
          v.comment_count, v.duration_formatted, v.is_short, v.outlier_multiplier, v.views_per_hour,
          v.relevance_score, v.category_id,
          (SELECT count(*) FROM video_variants vv WHERE vv.youtube_video_id = v.youtube_video_id AND vv.kind = 'title')::int AS title_variants,
          (SELECT count(*) FROM video_variants vv WHERE vv.youtube_video_id = v.youtube_video_id AND vv.kind = 'thumbnail')::int AS thumb_variants
        FROM videos v
        WHERE v.channel_id = ${internalId}
        ORDER BY v.published_at DESC
        LIMIT 500`,
      sql`
        SELECT
          COALESCE(sum(view_count) FILTER (WHERE published_at > now() - interval '7 days'), 0)::float8 AS views_7d,
          count(*) FILTER (WHERE published_at > now() - interval '30 days')::int AS uploads_30d,
          avg(view_count) FILTER (WHERE published_at > now() - interval '30 days')::float8 AS avg_views_30d,
          count(*) FILTER (WHERE published_at > now() - interval '30 days' AND relevance_score IS NOT NULL AND outlier_multiplier >= 3)::int AS outliers_30d,
          avg((COALESCE(like_count, 0) + COALESCE(comment_count, 0))::float8 / NULLIF(view_count, 0))
            FILTER (WHERE published_at > now() - interval '30 days' AND view_count > 0) AS engagement_30d,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY view_count)
            FILTER (WHERE NOT is_short AND published_at BETWEEN now() - interval '180 days' AND now() - interval '3 days') AS median_long,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY view_count)
            FILTER (WHERE is_short AND published_at BETWEEN now() - interval '180 days' AND now() - interval '3 days') AS median_short
        FROM videos
        WHERE channel_id = ${internalId}`,
      // Views gained per hour over the last 48 h, summed over the channel's tracked videos.
      sql`
        WITH deltas AS (
          SELECT
            s.captured_at,
            s.view_count - lag(s.view_count) OVER (PARTITION BY s.youtube_video_id ORDER BY s.captured_at) AS gained
          FROM video_stat_snapshots s
          JOIN videos v ON v.youtube_video_id = s.youtube_video_id
          WHERE v.channel_id = ${internalId} AND s.captured_at > now() - interval '50 hours'
        )
        SELECT date_trunc('hour', captured_at) AS hour, sum(GREATEST(gained, 0))::float8 AS views
        FROM deltas
        WHERE gained IS NOT NULL AND captured_at > now() - interval '48 hours'
        GROUP BY 1
        ORDER BY 1`,
      sql`
        SELECT DISTINCT ON (date_trunc('day', captured_at))
          date_trunc('day', captured_at) AS day, subscriber_count, total_views
        FROM channel_stat_snapshots
        WHERE youtube_channel_id = ${id}
        ORDER BY date_trunc('day', captured_at), captured_at DESC`,
      sql`
        SELECT
          (array_agg(total_views ORDER BY captured_at DESC))[1]
            - (array_agg(total_views ORDER BY captured_at DESC) FILTER (WHERE captured_at <= now() - interval '20 hours'))[1] AS views_24h,
          (array_agg(subscriber_count ORDER BY captured_at DESC))[1]
            - (array_agg(subscriber_count ORDER BY captured_at DESC) FILTER (WHERE captured_at <= now() - interval '20 hours'))[1] AS subs_24h
        FROM channel_stat_snapshots
        WHERE youtube_channel_id = ${id} AND captured_at > now() - interval '4 days'`,
      sql`SELECT max(finished_at) AS at FROM scan_runs WHERE status = 'ok'`,
    ]);

    const num = (value: unknown) => (value != null ? Number(value) : null);

    // Fill the 48 hourly buckets so the bar chart has a stable x-axis.
    const byHour = new Map(hourly.map((h) => [new Date(h.hour).getTime(), Number(h.views)]));
    const startHour = new Date();
    startHour.setMinutes(0, 0, 0);
    const hours = Array.from({ length: 48 }, (_, i) => {
      const t = startHour.getTime() - (47 - i) * 3_600_000;
      return { hour: new Date(t).toISOString(), views: byHour.get(t) ?? 0 };
    });

    return NextResponse.json({
      channel: {
        id: channel.youtube_channel_id,
        name: channel.name,
        handle: channel.handle ?? null,
        avatar: channel.thumbnail_url ?? null,
        country: channel.country ?? null,
        subscribers: num(channel.subscriber_count),
        totalViews: num(channel.total_views),
        videoCount: num(channel.video_count),
        trendScore: num(channel.trend_score),
        recentRatio: num(channel.recent_ratio),
        createdAt: channel.channel_created_at ? new Date(channel.channel_created_at).toISOString() : null,
        outlierRate: num(channel.outlier_rate),
        opportunityScore: num(channel.opportunity_score),
        tracked: Boolean(channel.tracked),
        lastStatsAt: channel.last_stats_at ? new Date(channel.last_stats_at).toISOString() : null,
      },
      kpis: {
        subs24h: num(deltas?.subs_24h),
        views24h: num(deltas?.views_24h),
        views7d: Number(kpis.views_7d),
        uploads30d: Number(kpis.uploads_30d),
        avgViews30d: num(kpis.avg_views_30d),
        outliers30d: Number(kpis.outliers_30d),
        engagement30d: num(kpis.engagement_30d),
        medianLong: num(kpis.median_long),
        medianShort: num(kpis.median_short),
        views48h: hours.reduce((sum, h) => sum + h.views, 0),
      },
      hourly: hours,
      daily: daily.map((d) => ({
        day: new Date(d.day).toISOString(),
        subscribers: num(d.subscriber_count),
        totalViews: Number(d.total_views),
      })),
      videos: videos.map((v) => ({
        id: v.youtube_video_id,
        title: v.title,
        thumbnail: v.thumbnail_url || `https://i.ytimg.com/vi/${v.youtube_video_id}/hqdefault.jpg`,
        publishedAt: new Date(v.published_at).toISOString(),
        views: Number(v.view_count ?? 0),
        likes: num(v.like_count),
        comments: num(v.comment_count),
        duration: v.duration_formatted ?? null,
        isShort: Boolean(v.is_short),
        multiplier: num(v.outlier_multiplier),
        viewsPerHour: num(v.views_per_hour),
        score: num(v.relevance_score),
        categoryId: num(v.category_id),
        abTest: v.title_variants > 1 || v.thumb_variants > 1,
      })),
      updatedAt: lastScan?.at ? new Date(lastScan.at).toISOString() : null,
    });
  } catch (err) {
    console.error("[api/channels]", err);
    return NextResponse.json({ error: "Impossible de charger la chaîne." }, { status: 500 });
  }
}
