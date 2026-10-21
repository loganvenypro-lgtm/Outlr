import { sql } from "@/lib/postgres";
import { getChannelDetails, getRecentVideos } from "@/lib/youtube";

/**
 * A channel the scanner doesn't know yet: pull it once from YouTube (~3 quota
 * units), store it, and let the background scanner keep it fresh from then on.
 */
export async function importChannel(channelId: string): Promise<boolean> {
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

/** Imports the channel unless the scanner already knows it. Never throws. */
export async function ensureChannelImported(channelId: string): Promise<boolean> {
  try {
    const [known] = await sql`SELECT 1 FROM channels WHERE youtube_channel_id = ${channelId}`;
    return known ? true : await importChannel(channelId);
  } catch (err) {
    console.error("[channelImport]", channelId, err);
    return false;
  }
}
