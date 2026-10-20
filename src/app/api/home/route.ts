import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STOPWORDS = new Set(
  `the a an and or of to in on for with is are was be this that it my your you i me we they he she his her at by from as
  how what why who when where vs not no do does did can will just new video videos official full part shorts short
  youtube channel day days year years first best top get got make made one two all out up into about over more most so
  if but its le la les de des du un une et en est pour pas qui que sur avec dans ce mon ma il elle on je tu nous vous`.split(/\s+/),
);

function topKeywords(titles: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const title of titles) {
    const words = new Set(
      title
        .toLowerCase()
        .replace(/[^\p{L}\p{N} ]+/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w)),
    );
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w]) => w);
}

const num = (value: unknown) => (value != null ? Number(value) : null);

function videoJson(r: Record<string, unknown>) {
  const views = Number(r.view_count ?? 0);
  const multiplier = num(r.outlier_multiplier);
  return {
    id: r.youtube_video_id as string,
    title: r.title as string,
    thumbnail: (r.thumbnail_url as string) || `https://i.ytimg.com/vi/${r.youtube_video_id}/hqdefault.jpg`,
    publishedAt: new Date(r.published_at as string).toISOString(),
    views,
    likes: num(r.like_count),
    comments: num(r.comment_count),
    duration: (r.duration_formatted as string) ?? null,
    isShort: Boolean(r.is_short),
    multiplier,
    usualViews: multiplier && multiplier > 0 ? Math.round(views / multiplier) : null,
    viewsPerHour: num(r.views_per_hour) != null ? Math.round(Number(r.views_per_hour)) : null,
    score: num(r.relevance_score),
    categoryId: num(r.category_id),
    language: (r.language as string) ?? null,
    channel: {
      id: r.youtube_channel_id as string,
      name: r.channel_name as string,
      handle: (r.handle as string) ?? null,
      avatar: (r.channel_avatar as string) ?? null,
      subscribers: num(r.subscriber_count),
      country: (r.country as string) ?? null,
    },
  };
}

const VIDEO_COLUMNS = sql`
  v.youtube_video_id, v.title, v.thumbnail_url, v.published_at, v.view_count, v.like_count, v.comment_count,
  v.duration_formatted, v.is_short, v.outlier_multiplier, v.views_per_hour, v.relevance_score, v.category_id,
  v.language, c.youtube_channel_id, c.name AS channel_name, c.handle, c.thumbnail_url AS channel_avatar,
  c.subscriber_count, c.country
`;

/**
 * Personalised home: the creator's channel (chosen at onboarding), hits in their
 * niche, and what their tracked competitors are doing. PostgreSQL only.
 */
export async function GET(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get("outlr_session")?.value ?? "");
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  try {
    const [user] = await sql`SELECT name, youtube_channel_id FROM users WHERE id = ${session.userId}`;
    const myChannelId = (user?.youtube_channel_id as string | null) ?? null;

    const [myChannel] = myChannelId
      ? await sql`
          SELECT c.*,
            (SELECT count(*) FROM videos v WHERE v.channel_id = c.id AND v.published_at > now() - interval '30 days')::int AS uploads_30d
          FROM channels c WHERE c.youtube_channel_id = ${myChannelId}`
      : [];

    // Niche = keywords of my recent titles, plus my main category and language.
    let keywords: string[] = [];
    let category: number | null = null;
    let language: string | null = null;
    let myVideos: Record<string, unknown>[] = [];
    if (myChannel) {
      myVideos = await sql`
        SELECT ${VIDEO_COLUMNS}
        FROM videos v JOIN channels c ON c.id = v.channel_id
        WHERE v.channel_id = ${myChannel.id}
        ORDER BY v.published_at DESC
        LIMIT 40`;
      keywords = topKeywords(myVideos.map((v) => v.title as string), 10);
      const mode = <T,>(values: T[]) => {
        const freq = new Map<T, number>();
        for (const v of values) if (v != null) freq.set(v, (freq.get(v) ?? 0) + 1);
        return [...freq].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      };
      category = mode(myVideos.map((v) => num(v.category_id)));
      language = mode(myVideos.map((v) => ((v.language as string) ?? "").split("-")[0].toLowerCase() || null));
    }

    const query = keywords.length ? keywords.join(" | ") : null;
    // Recommend the creator's own format (Shorts vs long-form).
    const isShortsCreator = myVideos.length
      ? myVideos.filter((v) => v.is_short).length / myVideos.length >= 0.5
      : null;
    const myInternalId = (myChannel?.id as string) ?? "";

    const [forYou, competitors, competitorHits, [deltas], [lastScan]] = await Promise.all([
      // Hits in my niche (or, without a channel yet, the best hits overall).
      sql`
        SELECT ${VIDEO_COLUMNS}
        FROM videos v JOIN channels c ON c.id = v.channel_id
        WHERE v.relevance_score IS NOT NULL
          AND v.published_at > now() - interval '7 days'
          AND v.channel_id <> ${myInternalId}
          ${isShortsCreator !== null ? sql`AND v.is_short = ${isShortsCreator}` : sql``}
          ${query || category != null
            ? sql`AND (
                ${query ? sql`to_tsvector('simple', v.title) @@ to_tsquery('simple', ${query})` : sql`FALSE`}
                OR ${category != null ? sql`(v.category_id = ${category} ${language ? sql`AND split_part(lower(v.language), '-', 1) = ${language}` : sql``})` : sql`FALSE`}
              )`
            : sql``}
        ORDER BY
          ${query ? sql`ts_rank(to_tsvector('simple', v.title), to_tsquery('simple', ${query})) * 1000 +` : sql``}
          v.relevance_score DESC
        LIMIT 8`,
      sql`
        SELECT
          c.youtube_channel_id, c.name, c.handle, c.thumbnail_url, c.subscriber_count, c.trend_score, c.recent_ratio,
          tc.added_at,
          best.youtube_video_id AS best_video_id, best.title AS best_title, best.view_count AS best_views,
          best.outlier_multiplier AS best_multiplier, best.published_at AS best_published_at
        FROM tracked_channels tc
        JOIN channels c ON c.youtube_channel_id = tc.channel_id
        LEFT JOIN LATERAL (
          SELECT v.youtube_video_id, v.title, v.view_count, v.outlier_multiplier, v.published_at
          FROM videos v
          WHERE v.channel_id = c.id AND v.published_at > now() - interval '14 days'
          ORDER BY v.outlier_multiplier DESC NULLS LAST
          LIMIT 1
        ) best ON true
        WHERE c.youtube_channel_id <> ${myChannelId ?? ""}
        ORDER BY c.trend_score DESC NULLS LAST
        LIMIT 8`,
      sql`
        SELECT ${VIDEO_COLUMNS}
        FROM tracked_channels tc
        JOIN channels c ON c.youtube_channel_id = tc.channel_id
        JOIN videos v ON v.channel_id = c.id
        WHERE c.youtube_channel_id <> ${myChannelId ?? ""}
          AND v.published_at > now() - interval '14 days'
          AND v.outlier_multiplier >= 2
        ORDER BY v.outlier_multiplier DESC
        LIMIT 4`,
      myChannelId
        ? sql`
            SELECT
              (array_agg(total_views ORDER BY captured_at DESC))[1]
                - (array_agg(total_views ORDER BY captured_at DESC) FILTER (WHERE captured_at <= now() - interval '20 hours'))[1] AS views_24h,
              (array_agg(subscriber_count ORDER BY captured_at DESC))[1]
                - (array_agg(subscriber_count ORDER BY captured_at DESC) FILTER (WHERE captured_at <= now() - interval '20 hours'))[1] AS subs_24h
            FROM channel_stat_snapshots
            WHERE youtube_channel_id = ${myChannelId} AND captured_at > now() - interval '4 days'`
        : Promise.resolve([undefined]),
      sql`SELECT max(finished_at) AS at FROM scan_runs WHERE status = 'ok'`,
    ]);

    const latest = myVideos[0];
    const bestRecent = [...myVideos]
      .filter((v) => new Date(v.published_at as string).getTime() > Date.now() - 30 * 86_400_000)
      .sort((a, b) => Number(b.outlier_multiplier ?? 0) - Number(a.outlier_multiplier ?? 0))[0];

    return NextResponse.json({
      userName: (user?.name as string) ?? session.name,
      myChannelId,
      myChannel: myChannel
        ? {
            id: myChannel.youtube_channel_id,
            name: myChannel.name,
            handle: myChannel.handle ?? null,
            avatar: myChannel.thumbnail_url ?? null,
            subscribers: num(myChannel.subscriber_count),
            totalViews: num(myChannel.total_views),
            trendScore: num(myChannel.trend_score),
            recentRatio: num(myChannel.recent_ratio),
            outlierRate: num(myChannel.outlier_rate),
            uploads30d: Number(myChannel.uploads_30d ?? 0),
            subs24h: num(deltas?.subs_24h),
            views24h: num(deltas?.views_24h),
            latestVideo: latest ? videoJson(latest) : null,
            bestRecentVideo: bestRecent ? videoJson(bestRecent) : null,
          }
        : null,
      niche: { keywords, category, language },
      forYou: forYou.map(videoJson),
      competitors: competitors.map((c) => ({
        id: c.youtube_channel_id as string,
        name: c.name as string,
        handle: (c.handle as string) ?? null,
        avatar: (c.thumbnail_url as string) ?? null,
        subscribers: num(c.subscriber_count),
        trendScore: num(c.trend_score),
        recentRatio: num(c.recent_ratio),
        bestVideo: c.best_video_id
          ? {
              id: c.best_video_id as string,
              title: c.best_title as string,
              views: Number(c.best_views ?? 0),
              multiplier: num(c.best_multiplier),
              publishedAt: new Date(c.best_published_at).toISOString(),
            }
          : null,
      })),
      competitorHits: competitorHits.map(videoJson),
      updatedAt: lastScan?.at ? new Date(lastScan.at).toISOString() : null,
    });
  } catch (err) {
    console.error("[api/home]", err);
    return NextResponse.json({ error: "Impossible de charger l'accueil." }, { status: 500 });
  }
}
