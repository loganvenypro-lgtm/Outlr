import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";

export const dynamic = "force-dynamic";

const PERIOD_HOURS: Record<string, number> = {
  "24h": 24,
  "3d": 72,
  "7d": 168,
  "30d": 720,
  "90d": 2160,
};

const PAGE_SIZE = 24;

function toNumber(value: string | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Outliers explorer: reads only PostgreSQL (filled by scripts/scan-worker.mjs),
 * so it never spends YouTube quota while a user browses.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const format = params.get("format") ?? "all";
  const period = params.get("period") ?? "7d";
  const periodHours = period === "all" ? null : (PERIOD_HOURS[period] ?? PERIOD_HOURS["7d"]);
  const minSubs = toNumber(params.get("minSubs"));
  const maxSubs = toNumber(params.get("maxSubs"));
  const minViews = toNumber(params.get("minViews"));
  const minMultiplier = toNumber(params.get("minMultiplier"));
  const category = toNumber(params.get("category"));
  const language = params.get("language")?.trim().toLowerCase() || null;
  const query = params.get("q")?.trim() || null;
  const relevantOnly = params.get("relevant") !== "false";
  const sort = params.get("sort") ?? "score";
  const page = Math.max(0, Math.floor(toNumber(params.get("page")) ?? 0));

  const where = sql`
    ${periodHours !== null ? sql`v.published_at > now() - make_interval(hours => ${periodHours})` : sql`TRUE`}
    ${format === "short" ? sql`AND v.is_short` : format === "long" ? sql`AND NOT v.is_short` : sql``}
    ${relevantOnly ? sql`AND v.relevance_score IS NOT NULL` : sql``}
    ${minSubs !== null ? sql`AND c.subscriber_count >= ${minSubs}` : sql``}
    ${maxSubs !== null ? sql`AND c.subscriber_count <= ${maxSubs}` : sql``}
    ${minViews !== null ? sql`AND v.view_count >= ${minViews}` : sql``}
    ${minMultiplier !== null ? sql`AND v.outlier_multiplier >= ${minMultiplier}` : sql``}
    ${category !== null ? sql`AND v.category_id = ${category}` : sql``}
    ${language ? sql`AND split_part(lower(v.language), '-', 1) = ${language}` : sql``}
    ${query ? sql`AND (v.title ILIKE ${"%" + query + "%"} OR c.name ILIKE ${"%" + query + "%"})` : sql``}
  `;

  const orderBy =
    sort === "multiplier"
      ? sql`v.outlier_multiplier DESC NULLS LAST`
      : sort === "views"
        ? sql`v.view_count DESC`
        : sort === "velocity"
          ? sql`v.views_per_hour DESC NULLS LAST`
          : sort === "recent"
            ? sql`v.published_at DESC`
            : sql`v.relevance_score DESC NULLS LAST, v.outlier_multiplier DESC NULLS LAST`;

  try {
    const [rows, [{ total }], languages, [lastScan]] = await Promise.all([
      sql`
        SELECT
          v.youtube_video_id, v.title, v.thumbnail_url, v.published_at, v.view_count, v.like_count,
          v.comment_count, v.duration_formatted, v.is_short, v.outlier_multiplier, v.views_per_hour,
          v.relevance_score, v.category_id, v.language,
          c.youtube_channel_id, c.name AS channel_name, c.handle, c.thumbnail_url AS channel_avatar,
          c.subscriber_count, c.country
        FROM videos v
        JOIN channels c ON c.id = v.channel_id
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ${PAGE_SIZE} OFFSET ${page * PAGE_SIZE}`,
      sql`
        SELECT count(*)::int AS total
        FROM videos v
        JOIN channels c ON c.id = v.channel_id
        WHERE ${where}`,
      sql`
        SELECT split_part(lower(language), '-', 1) AS code, count(*)::int AS count
        FROM videos
        WHERE language IS NOT NULL AND relevance_score IS NOT NULL
          AND published_at > now() - interval '30 days'
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 12`,
      sql`SELECT max(finished_at) AS at FROM scan_runs WHERE status = 'ok'`,
    ]);

    const items = rows.map((r) => {
      const views = Number(r.view_count ?? 0);
      const multiplier = r.outlier_multiplier != null ? Number(r.outlier_multiplier) : null;
      return {
        id: r.youtube_video_id as string,
        title: r.title as string,
        thumbnail: (r.thumbnail_url as string) || `https://i.ytimg.com/vi/${r.youtube_video_id}/hqdefault.jpg`,
        publishedAt: new Date(r.published_at).toISOString(),
        views,
        likes: r.like_count != null ? Number(r.like_count) : null,
        comments: r.comment_count != null ? Number(r.comment_count) : null,
        duration: (r.duration_formatted as string) ?? null,
        isShort: Boolean(r.is_short),
        multiplier,
        usualViews: multiplier && multiplier > 0 ? Math.round(views / multiplier) : null,
        viewsPerHour: r.views_per_hour != null ? Math.round(Number(r.views_per_hour)) : null,
        score: r.relevance_score != null ? Number(r.relevance_score) : null,
        categoryId: r.category_id != null ? Number(r.category_id) : null,
        language: (r.language as string) ?? null,
        channel: {
          id: r.youtube_channel_id as string,
          name: r.channel_name as string,
          handle: (r.handle as string) ?? null,
          avatar: (r.channel_avatar as string) ?? null,
          subscribers: r.subscriber_count != null ? Number(r.subscriber_count) : null,
          country: (r.country as string) ?? null,
        },
      };
    });

    return NextResponse.json({
      items,
      total,
      page,
      pageSize: PAGE_SIZE,
      hasMore: (page + 1) * PAGE_SIZE < total,
      languages,
      updatedAt: lastScan?.at ? new Date(lastScan.at).toISOString() : null,
    });
  } catch (err) {
    console.error("[api/outliers]", err);
    return NextResponse.json({ error: "Impossible de charger les outliers." }, { status: 500 });
  }
}
