import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";

export const dynamic = "force-dynamic";

const STOPWORDS = new Set(
  `the a an and or of to in on for with is are was be this that it my your you i me we they he she his her at by from as
  how what why who when where vs not no do does did can will just new video videos official full part shorts short
  youtube channel day days year years first best top get got make made one two all out up into about over more most so
  if but its le la les de des du un une et en est pour pas qui que sur avec dans ce mon ma il elle on je tu nous vous`.split(/\s+/),
);

/**
 * Channels similar to this one, from the database: the most frequent words in its
 * recent titles become a full-text query, matching channels are ranked by how many
 * of their titles match, with a bonus for the same category and language.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;

  try {
    const [channel] = await sql`SELECT id FROM channels WHERE youtube_channel_id = ${channelId}`;
    if (!channel) return NextResponse.json({ error: "Chaîne introuvable." }, { status: 404 });

    const titles = await sql`
      SELECT title, category_id, split_part(lower(language), '-', 1) AS language
      FROM videos
      WHERE channel_id = ${channel.id}
      ORDER BY published_at DESC
      LIMIT 40`;

    const counts = new Map<string, number>();
    for (const { title } of titles) {
      const words = new Set(
        (title as string)
          .toLowerCase()
          .replace(/[^\p{L}\p{N} ]+/gu, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w)),
      );
      for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    const keywords = [...counts]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([w]) => w);
    if (keywords.length === 0) return NextResponse.json({ keywords: [], items: [] });

    const mode = <T,>(values: T[]) => {
      const freq = new Map<T, number>();
      for (const v of values) if (v != null) freq.set(v, (freq.get(v) ?? 0) + 1);
      return [...freq].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    };
    const category = mode(titles.map((t) => t.category_id as number | null));
    const language = mode(titles.map((t) => t.language as string | null));
    const query = keywords.join(" | ");

    const rows = await sql`
      WITH matches AS (
        SELECT
          v.channel_id,
          sum(ts_rank(to_tsvector('simple', v.title), to_tsquery('simple', ${query})))::float8 AS relevance,
          count(*)::int AS matching_videos,
          bool_or(v.category_id = ${category}) AS same_category,
          bool_or(split_part(lower(v.language), '-', 1) = ${language}) AS same_language
        FROM videos v
        WHERE to_tsvector('simple', v.title) @@ to_tsquery('simple', ${query})
          AND v.channel_id <> ${channel.id}
          AND v.published_at > now() - interval '365 days'
        GROUP BY v.channel_id
      )
      SELECT
        c.youtube_channel_id, c.name, c.handle, c.thumbnail_url, c.subscriber_count, c.country,
        c.channel_created_at, c.outlier_rate, c.opportunity_score, c.trend_score,
        m.matching_videos,
        m.relevance * (CASE WHEN m.same_category THEN 1.5 ELSE 1 END) * (CASE WHEN m.same_language THEN 1.5 ELSE 1 END) AS score
      FROM matches m
      JOIN channels c ON c.id = m.channel_id
      WHERE c.rss_error_count < 5 AND m.matching_videos >= 2 AND COALESCE(c.subscriber_count, 0) >= 1000
      ORDER BY score DESC
      LIMIT 12`;

    const num = (value: unknown) => (value != null ? Number(value) : null);
    return NextResponse.json({
      keywords,
      items: rows.map((r) => ({
        id: r.youtube_channel_id as string,
        name: r.name as string,
        handle: (r.handle as string) ?? null,
        avatar: (r.thumbnail_url as string) ?? null,
        subscribers: num(r.subscriber_count),
        country: (r.country as string) ?? null,
        createdAt: r.channel_created_at ? new Date(r.channel_created_at).toISOString() : null,
        outlierRate: num(r.outlier_rate),
        opportunityScore: num(r.opportunity_score),
        trendScore: num(r.trend_score),
        matchingVideos: Number(r.matching_videos),
      })),
    });
  } catch (err) {
    console.error("[api/channels/similar]", err);
    return NextResponse.json({ error: "Impossible de trouver des chaînes similaires." }, { status: 500 });
  }
}
