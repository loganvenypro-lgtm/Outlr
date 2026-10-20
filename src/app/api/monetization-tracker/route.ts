import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
const PERIOD_DAYS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

function toNumber(value: string | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Monetization Tracker: channels whose ad status flipped, latest flip first.
 * Status comes from the scan worker reading each channel's latest long-form watch page.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() || null;
  const change = params.get("change") ?? "all";
  const periodDays = PERIOD_DAYS[params.get("period") ?? "all"] ?? null;
  const category = toNumber(params.get("category"));
  const language = params.get("language")?.trim().toLowerCase() || null;
  const minSubs = toNumber(params.get("minSubs"));
  const maxSubs = toNumber(params.get("maxSubs"));
  const sort = params.get("sort") ?? "lastChange";
  const page = Math.max(0, Math.floor(toNumber(params.get("page")) ?? 0));

  // Latest flip per channel, plus long-form aggregates and the 48 h view gain from snapshots.
  const from = sql`
    (
      SELECT DISTINCT ON (channel_id) channel_id, monetized, previous_checked_at, detected_at
      FROM channel_monetization_events
      ORDER BY channel_id, detected_at DESC
    ) e
    JOIN channels c ON c.id = e.channel_id
    LEFT JOIN LATERAL (
      SELECT
        avg(view_count)::float8 AS avg_views,
        mode() WITHIN GROUP (ORDER BY category_id) AS category_id,
        mode() WITHIN GROUP (ORDER BY split_part(lower(language), '-', 1)) AS language
      FROM (
        SELECT view_count, category_id, language FROM videos
        WHERE channel_id = c.id AND NOT is_short
        ORDER BY published_at DESC
        LIMIT 30
      ) recent
    ) r ON true
    LEFT JOIN LATERAL (
      SELECT
        (array_agg(total_views ORDER BY captured_at DESC))[1]
          - (array_agg(total_views ORDER BY captured_at DESC) FILTER (WHERE captured_at <= now() - interval '44 hours'))[1] AS views_48h
      FROM channel_stat_snapshots s
      WHERE s.youtube_channel_id = c.youtube_channel_id AND s.captured_at > now() - interval '4 days'
    ) snap ON true
  `;

  const where = sql`
    true
    ${change === "demonetized" ? sql`AND NOT e.monetized` : change === "monetized" ? sql`AND e.monetized` : sql``}
    ${periodDays !== null ? sql`AND e.detected_at > now() - make_interval(days => ${periodDays})` : sql``}
    ${category !== null ? sql`AND r.category_id = ${category}` : sql``}
    ${language ? sql`AND r.language = ${language}` : sql``}
    ${minSubs !== null ? sql`AND c.subscriber_count >= ${minSubs}` : sql``}
    ${maxSubs !== null ? sql`AND c.subscriber_count <= ${maxSubs}` : sql``}
    ${query ? sql`AND (c.name ILIKE ${"%" + query + "%"} OR c.handle ILIKE ${"%" + query + "%"})` : sql``}
  `;

  const orderBy =
    sort === "subscribers"
      ? sql`c.subscriber_count DESC NULLS LAST`
      : sort === "avgViews"
        ? sql`r.avg_views DESC NULLS LAST`
        : sort === "views48h"
          ? sql`snap.views_48h DESC NULLS LAST`
          : sql`e.detected_at DESC`;

  try {
    const [rows, [{ total }], [status], languages] = await Promise.all([
      sql`
        SELECT
          c.id, c.youtube_channel_id, c.name, c.handle, c.thumbnail_url, c.subscriber_count, c.video_count,
          c.country, c.channel_created_at, c.discovered_at, c.monetized AS monetized_now,
          e.monetized, e.previous_checked_at, e.detected_at,
          r.avg_views, r.category_id, r.language, snap.views_48h
        FROM ${from}
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ${PAGE_SIZE} OFFSET ${page * PAGE_SIZE}`,
      sql`SELECT count(*)::int AS total FROM ${from} WHERE ${where}`,
      // How far the tracker has got: shown while there are few or no changes yet.
      sql`
        SELECT
          count(*) FILTER (WHERE monetization_checked_at IS NOT NULL)::int AS checked,
          count(*) FILTER (WHERE monetized)::int AS monetized,
          count(*) FILTER (WHERE monetized = false)::int AS not_monetized,
          max(monetization_checked_at) AS last_checked_at
        FROM channels`,
      sql`
        SELECT split_part(lower(v.language), '-', 1) AS code, count(DISTINCT v.channel_id)::int AS count
        FROM videos v
        JOIN channel_monetization_events e ON e.channel_id = v.channel_id
        WHERE v.language IS NOT NULL
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 12`,
    ]);

    // Latest long-form uploads for the channels on this page (5 each).
    const channelIds = rows.map((r) => r.id as string);
    const videos: (typeof rows)[number][] = channelIds.length
      ? await sql`
          SELECT * FROM (
            SELECT
              v.channel_id, v.youtube_video_id, v.title, v.thumbnail_url, v.view_count, v.outlier_multiplier,
              v.published_at, v.duration_formatted,
              row_number() OVER (PARTITION BY v.channel_id ORDER BY v.published_at DESC) AS rank
            FROM videos v
            WHERE v.channel_id IN ${sql(channelIds)} AND NOT v.is_short
          ) ranked
          WHERE rank <= 5`
      : [];

    const videosByChannel = new Map<string, typeof videos>();
    for (const v of videos) {
      const list = videosByChannel.get(v.channel_id) ?? [];
      list.push(v);
      videosByChannel.set(v.channel_id, list);
    }

    const num = (value: unknown) => (value != null ? Number(value) : null);
    const iso = (value: unknown) => (value ? new Date(value as string).toISOString() : null);
    const items = rows.map((r) => ({
      id: r.youtube_channel_id as string,
      name: r.name as string,
      handle: (r.handle as string) ?? null,
      avatar: (r.thumbnail_url as string) ?? null,
      subscribers: num(r.subscriber_count),
      videoCount: num(r.video_count),
      country: (r.country as string) ?? null,
      categoryId: num(r.category_id),
      language: (r.language as string) ?? null,
      createdAt: iso(r.channel_created_at),
      discoveredAt: iso(r.discovered_at),
      avgViews: num(r.avg_views),
      views48h: num(r.views_48h),
      monetizedNow: r.monetized_now as boolean | null,
      change: {
        monetized: Boolean(r.monetized),
        from: iso(r.previous_checked_at),
        to: new Date(r.detected_at).toISOString(),
      },
      videos: (videosByChannel.get(r.id) ?? []).map((v) => ({
        id: v.youtube_video_id as string,
        title: v.title as string,
        thumbnail: (v.thumbnail_url as string) || `https://i.ytimg.com/vi/${v.youtube_video_id}/hqdefault.jpg`,
        views: Number(v.view_count),
        multiplier: num(v.outlier_multiplier),
        duration: (v.duration_formatted as string) ?? null,
        publishedAt: new Date(v.published_at).toISOString(),
      })),
    }));

    return NextResponse.json({
      items,
      total,
      page,
      hasMore: (page + 1) * PAGE_SIZE < total,
      languages,
      status: {
        checked: status.checked,
        monetized: status.monetized,
        notMonetized: status.not_monetized,
        lastCheckedAt: iso(status.last_checked_at),
      },
    });
  } catch (err) {
    console.error("[api/monetization-tracker]", err);
    return NextResponse.json({ error: "Impossible de charger le Monetization Tracker." }, { status: 500 });
  }
}
