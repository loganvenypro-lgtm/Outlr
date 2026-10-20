import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 18;

function toNumber(value: string | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Channel Trends: channels ranked by momentum, read from PostgreSQL only.
 * +views/+subs over 24 h come from daily channel snapshots (scan worker);
 * until a channel has a day of history, momentum falls back to its last 7 days of uploads.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() || null;
  const format = params.get("format") ?? "all";
  const category = toNumber(params.get("category"));
  const language = params.get("language")?.trim().toLowerCase() || null;
  const minSubs = toNumber(params.get("minSubs"));
  const maxSubs = toNumber(params.get("maxSubs"));
  const withOutliers = params.get("withOutliers") === "true";
  const maxAgeDays = toNumber(params.get("maxAgeDays"));
  const minOutlierRate = toNumber(params.get("minOutlierRate"));
  const sort = params.get("sort") ?? "trend";
  const page = Math.max(0, Math.floor(toNumber(params.get("page")) ?? 0));

  const where = sql`
    c.rss_error_count < 5
    ${format === "short" ? sql`AND r.short_share >= 0.5` : format === "long" ? sql`AND r.short_share < 0.5` : sql``}
    ${category !== null ? sql`AND r.category_id = ${category}` : sql``}
    ${language ? sql`AND r.language = ${language}` : sql``}
    ${minSubs !== null ? sql`AND c.subscriber_count >= ${minSubs}` : sql``}
    ${maxSubs !== null ? sql`AND c.subscriber_count <= ${maxSubs}` : sql``}
    ${withOutliers ? sql`AND r.outliers_30d > 0` : sql``}
    ${maxAgeDays !== null ? sql`AND c.channel_created_at > now() - make_interval(days => ${maxAgeDays})` : sql``}
    ${minOutlierRate !== null ? sql`AND c.outlier_rate >= ${minOutlierRate}` : sql``}
    ${query ? sql`AND (c.name ILIKE ${"%" + query + "%"} OR c.handle ILIKE ${"%" + query + "%"})` : sql``}
  `;

  const subsPerDay = sql`c.subscriber_count::float8 / GREATEST(EXTRACT(EPOCH FROM now() - c.channel_created_at) / 86400, 1)`;
  const orderBy =
    sort === "opportunity"
      ? sql`c.opportunity_score DESC NULLS LAST`
      : sort === "subsPerDay"
        ? sql`${subsPerDay} DESC NULLS LAST`
        : sort === "outlierRate"
          ? sql`c.outlier_rate DESC NULLS LAST, c.opportunity_score DESC NULLS LAST`
          : sort === "newest"
            ? sql`c.channel_created_at DESC NULLS LAST`
            : sort === "trend"
      ? sql`c.trend_score DESC NULLS LAST, r.views_7d DESC NULLS LAST`
      : sort === "views7d"
      ? sql`r.views_7d DESC NULLS LAST`
      : sort === "outliers"
        ? sql`r.outliers_30d DESC, r.best_multiplier DESC NULLS LAST`
        : sort === "subs24h"
          ? sql`subs_24h DESC NULLS LAST, r.views_7d DESC NULLS LAST`
          : sort === "subscribers"
            ? sql`c.subscriber_count DESC NULLS LAST`
            : sort === "multiplier"
              ? sql`r.best_multiplier DESC NULLS LAST`
              : sql`views_24h DESC NULLS LAST, r.views_7d DESC NULLS LAST`;

  // Shared FROM clause: per-channel aggregates over the last 30 days + snapshot deltas.
  const from = sql`
    channels c
    JOIN (
      SELECT
        channel_id,
        COALESCE(sum(view_count) FILTER (WHERE published_at > now() - interval '7 days'), 0)::float8 AS views_7d,
        count(*) FILTER (WHERE published_at > now() - interval '7 days')::int AS uploads_7d,
        count(*) FILTER (WHERE relevance_score IS NOT NULL AND outlier_multiplier >= 3)::int AS outliers_30d,
        max(outlier_multiplier) FILTER (WHERE relevance_score IS NOT NULL) AS best_multiplier,
        avg(is_short::int)::float8 AS short_share,
        mode() WITHIN GROUP (ORDER BY category_id) AS category_id,
        mode() WITHIN GROUP (ORDER BY split_part(lower(language), '-', 1)) AS language
      FROM videos
      WHERE published_at > now() - interval '30 days'
      GROUP BY channel_id
    ) r ON r.channel_id = c.id
    LEFT JOIN LATERAL (
      SELECT
        (array_agg(total_views ORDER BY captured_at DESC))[1]
          - (array_agg(total_views ORDER BY captured_at DESC) FILTER (WHERE captured_at <= now() - interval '20 hours'))[1] AS views_24h,
        (array_agg(total_views ORDER BY captured_at DESC) FILTER (WHERE captured_at <= now() - interval '20 hours'))[1]
          - (array_agg(total_views ORDER BY captured_at DESC) FILTER (WHERE captured_at <= now() - interval '44 hours'))[1] AS views_prev_24h,
        (array_agg(subscriber_count ORDER BY captured_at DESC))[1]
          - (array_agg(subscriber_count ORDER BY captured_at DESC) FILTER (WHERE captured_at <= now() - interval '20 hours'))[1] AS subs_24h
      FROM channel_stat_snapshots s
      WHERE s.youtube_channel_id = c.youtube_channel_id AND s.captured_at > now() - interval '4 days'
    ) snap ON true
  `;

  try {
    const [rows, [{ total }], languages, [lastScan]] = await Promise.all([
      sql`
        SELECT
          c.id, c.youtube_channel_id, c.name, c.handle, c.thumbnail_url, c.subscriber_count, c.country,
          c.trend_score, c.recent_ratio, c.channel_created_at, c.discovered_at, c.outlier_rate, c.opportunity_score,
          r.views_7d, r.uploads_7d, r.outliers_30d, r.best_multiplier, r.short_share, r.category_id, r.language,
          snap.views_24h, snap.views_prev_24h, snap.subs_24h
        FROM ${from}
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ${PAGE_SIZE} OFFSET ${page * PAGE_SIZE}`,
      sql`SELECT count(*)::int AS total FROM ${from} WHERE ${where}`,
      sql`
        SELECT split_part(lower(language), '-', 1) AS code, count(DISTINCT channel_id)::int AS count
        FROM videos
        WHERE language IS NOT NULL AND published_at > now() - interval '30 days'
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 12`,
      sql`SELECT max(finished_at) AS at FROM scan_runs WHERE status = 'ok'`,
    ]);

    // Best recent videos for the channels on this page (3 each).
    const channelIds = rows.map((r) => r.id as string);
    const videos: (typeof rows)[number][] = channelIds.length
      ? await sql`
          SELECT * FROM (
            SELECT
              v.channel_id, v.youtube_video_id, v.title, v.thumbnail_url, v.view_count, v.outlier_multiplier,
              v.published_at, v.is_short,
              row_number() OVER (
                PARTITION BY v.channel_id
                ORDER BY (v.relevance_score IS NOT NULL) DESC, v.outlier_multiplier DESC NULLS LAST, v.published_at DESC
              ) AS rank
            FROM videos v
            WHERE v.channel_id IN ${sql(channelIds)} AND v.published_at > now() - interval '30 days'
          ) ranked
          WHERE rank <= 3`
      : [];

    const videosByChannel = new Map<string, typeof videos>();
    for (const v of videos) {
      const list = videosByChannel.get(v.channel_id) ?? [];
      list.push(v);
      videosByChannel.set(v.channel_id, list);
    }

    const num = (value: unknown) => (value != null ? Number(value) : null);
    const items = rows.map((r) => ({
      id: r.youtube_channel_id as string,
      name: r.name as string,
      handle: (r.handle as string) ?? null,
      avatar: (r.thumbnail_url as string) ?? null,
      subscribers: num(r.subscriber_count),
      country: (r.country as string) ?? null,
      categoryId: num(r.category_id),
      language: (r.language as string) ?? null,
      isShortsChannel: Number(r.short_share) >= 0.5,
      trendScore: num(r.trend_score),
      recentRatio: num(r.recent_ratio),
      createdAt: r.channel_created_at ? new Date(r.channel_created_at).toISOString() : null,
      discoveredAt: r.discovered_at ? new Date(r.discovered_at).toISOString() : null,
      outlierRate: num(r.outlier_rate),
      opportunityScore: num(r.opportunity_score),
      views24h: num(r.views_24h),
      viewsPrev24h: num(r.views_prev_24h),
      subs24h: num(r.subs_24h),
      views7d: Number(r.views_7d),
      uploads7d: Number(r.uploads_7d),
      outliers30d: Number(r.outliers_30d),
      bestMultiplier: num(r.best_multiplier),
      videos: (videosByChannel.get(r.id) ?? []).map((v) => ({
        id: v.youtube_video_id as string,
        title: v.title as string,
        thumbnail: (v.thumbnail_url as string) || `https://i.ytimg.com/vi/${v.youtube_video_id}/hqdefault.jpg`,
        views: Number(v.view_count),
        multiplier: num(v.outlier_multiplier),
        publishedAt: new Date(v.published_at).toISOString(),
        isShort: Boolean(v.is_short),
      })),
    }));

    return NextResponse.json({
      items,
      total,
      page,
      hasMore: (page + 1) * PAGE_SIZE < total,
      languages,
      updatedAt: lastScan?.at ? new Date(lastScan.at).toISOString() : null,
    });
  } catch (err) {
    console.error("[api/channel-trends]", err);
    return NextResponse.json({ error: "Impossible de charger les chaînes." }, { status: 500 });
  }
}
