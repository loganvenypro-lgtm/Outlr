import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { saveThumbnailImage } from "@/lib/thumbnailVariants";

export const dynamic = "force-dynamic";

const STOPWORDS = new Set(
  `the a an and or of to in on for with is are was be this that it my your you i me we they he she his her at by from as
  how what why who when where vs not no do does did can will just new video official full part shorts short youtube
  le la les de des du un une et en est pour pas qui que sur avec dans ce mon ma il elle on je tu nous vous`.split(/\s+/),
);

/** OR-query of a title's meaningful words, for Postgres full-text search. */
function similarityQuery(title: string): string | null {
  const words = [
    ...new Set(
      title
        .toLowerCase()
        .replace(/[^\p{L}\p{N} ]+/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w)),
    ),
  ].slice(0, 8);
  return words.length ? words.join(" | ") : null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;

  try {
    const [video] = await sql`
      SELECT v.*, c.youtube_channel_id, c.name AS channel_name, c.thumbnail_url AS channel_avatar,
        c.subscriber_count, c.handle
      FROM videos v
      JOIN channels c ON c.id = v.channel_id
      WHERE v.youtube_video_id = ${videoId}`;
    if (!video) return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });

    // Record the current title and thumbnail right away (CDN HEAD, no quota) so the
    // A/B tab has a baseline even before the scanner checks this video.
    await sql`
      INSERT INTO video_variants (youtube_video_id, kind, value)
      VALUES (${videoId}, 'title', ${video.title as string})
      ON CONFLICT (youtube_video_id, kind, value) DO UPDATE SET last_seen_at = now()`;
    try {
      const head = await fetch(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, {
        method: "HEAD",
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      });
      const etag = head.headers.get("etag")?.replace(/"/g, "");
      if (head.ok && etag) {
        const setAt = /^\d{9,11}$/.test(etag) ? new Date(Number(etag) * 1000) : null;
        const [variant] = await sql`
          INSERT INTO video_variants (youtube_video_id, kind, value, set_at)
          VALUES (${videoId}, 'thumbnail', ${etag}, ${setAt})
          ON CONFLICT (youtube_video_id, kind, value) DO UPDATE SET last_seen_at = now()
          RETURNING image IS NULL AS needs_image`;
        if (variant.needs_image) await saveThumbnailImage(videoId, etag);
        await sql`UPDATE videos SET thumb_checked_at = now() WHERE youtube_video_id = ${videoId}`;
      }
    } catch {
      // CDN unreachable: the scanner will check it later.
    }

    const query = similarityQuery(video.title as string);

    const [snapshots, variants, similar] = await Promise.all([
      sql`
        SELECT captured_at, view_count, like_count, comment_count
        FROM video_stat_snapshots
        WHERE youtube_video_id = ${videoId}
        ORDER BY captured_at`,
      sql`
        SELECT kind, value, set_at, first_seen_at, last_seen_at
        FROM video_variants
        WHERE youtube_video_id = ${videoId}
        ORDER BY kind, COALESCE(set_at, first_seen_at)`,
      query
        ? sql`
            SELECT
              v.youtube_video_id, v.title, v.thumbnail_url, v.view_count, v.outlier_multiplier, v.published_at,
              v.is_short, v.duration_formatted, c.name AS channel_name, c.subscriber_count,
              ts_rank(to_tsvector('simple', v.title), to_tsquery('simple', ${query})) AS rank
            FROM videos v
            JOIN channels c ON c.id = v.channel_id
            WHERE to_tsvector('simple', v.title) @@ to_tsquery('simple', ${query})
              AND v.youtube_video_id <> ${videoId}
              AND v.published_at > now() - interval '180 days'
            ORDER BY (v.is_short = ${Boolean(video.is_short)}) DESC,
              ts_rank(to_tsvector('simple', v.title), to_tsquery('simple', ${query}))
                * ln(2 + COALESCE(v.outlier_multiplier, 1)) DESC
            LIMIT 8`
        : Promise.resolve([]),
    ]);

    const num = (value: unknown) => (value != null ? Number(value) : null);
    const views = Number(video.view_count ?? 0);

    // Hourly gains between consecutive snapshots ("YouTube Studio realtime" bars).
    const points = snapshots.map((s) => ({ at: new Date(s.captured_at).getTime(), views: Number(s.view_count) }));
    const series = points.slice(1).map((p, i) => {
      const prev = points[i];
      const hours = Math.max((p.at - prev.at) / 3_600_000, 1 / 60);
      return {
        at: new Date(p.at).toISOString(),
        gained: Math.max(0, p.views - prev.views),
        perHour: Math.max(0, Math.round((p.views - prev.views) / hours)),
        total: p.views,
      };
    });
    const dayAgo = Date.now() - 24 * 3_600_000;
    const baseline = [...points].reverse().find((p) => p.at <= dayAgo) ?? null;
    const published = new Date(video.published_at).getTime();
    const views24h = baseline
      ? views - baseline.views
      : published > dayAgo
        ? views // published less than 24 h ago: every view is from the last 24 h
        : null;

    const thumbnailVariants = variants.filter((v) => v.kind === "thumbnail");
    const firstThumbSetAt = thumbnailVariants[0]?.set_at ? new Date(thumbnailVariants[0].set_at).getTime() : null;

    return NextResponse.json({
      video: {
        id: video.youtube_video_id,
        title: video.title,
        description: ((video.description as string) ?? "").slice(0, 1200),
        thumbnail: `https://i.ytimg.com/vi/${video.youtube_video_id}/maxresdefault.jpg`,
        fallbackThumbnail: video.thumbnail_url || `https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`,
        publishedAt: new Date(video.published_at).toISOString(),
        views,
        likes: num(video.like_count),
        comments: num(video.comment_count),
        duration: video.duration_formatted ?? null,
        isShort: Boolean(video.is_short),
        multiplier: num(video.outlier_multiplier),
        viewsPerHour: num(video.views_per_hour),
        viewsPerDay: num(video.views_per_day),
        score: num(video.relevance_score),
        categoryId: num(video.category_id),
        language: video.language ?? null,
        tags: (video.tags as string[] | null) ?? [],
        views24h,
        lastStatsAt: video.last_stats_at ? new Date(video.last_stats_at).toISOString() : null,
        channel: {
          id: video.youtube_channel_id,
          name: video.channel_name,
          handle: video.handle ?? null,
          avatar: video.channel_avatar ?? null,
          subscribers: num(video.subscriber_count),
        },
      },
      series,
      variants: {
        titles: variants
          .filter((v) => v.kind === "title")
          .map((v) => ({
            value: v.value,
            firstSeenAt: new Date(v.first_seen_at).toISOString(),
            lastSeenAt: new Date(v.last_seen_at).toISOString(),
          })),
        thumbnails: thumbnailVariants.map((v) => ({
          setAt: v.set_at ? new Date(v.set_at).toISOString() : null,
          firstSeenAt: new Date(v.first_seen_at).toISOString(),
          lastSeenAt: new Date(v.last_seen_at).toISOString(),
        })),
        // Thumbnail first seen with a set-time well after upload = replaced before we started tracking.
        thumbnailChangedAfterUpload: firstThumbSetAt != null && firstThumbSetAt - published > 2 * 3_600_000,
      },
      similar: similar.map((s) => ({
        id: s.youtube_video_id,
        title: s.title,
        thumbnail: s.thumbnail_url || `https://i.ytimg.com/vi/${s.youtube_video_id}/hqdefault.jpg`,
        views: Number(s.view_count ?? 0),
        multiplier: num(s.outlier_multiplier),
        publishedAt: new Date(s.published_at).toISOString(),
        isShort: Boolean(s.is_short),
        duration: s.duration_formatted ?? null,
        channelName: s.channel_name,
        channelSubscribers: num(s.subscriber_count),
      })),
    });
  } catch (err) {
    console.error("[api/videos]", err);
    return NextResponse.json({ error: "Impossible de charger la vidéo." }, { status: 500 });
  }
}
