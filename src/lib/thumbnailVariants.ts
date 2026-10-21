import { sql } from "@/lib/postgres";

/**
 * Saves the picture of thumbnail version `etag` (320x180), since YouTube only serves
 * the current one. Same logic as saveThumbnailImage in scripts/scan-worker.mjs.
 */
export async function saveThumbnailImage(videoId: string, etag: string): Promise<void> {
  try {
    const res = await fetch(`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, {
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    // The thumbnail changed between the two requests: this picture is another version
    if (!res.ok || res.headers.get("etag")?.replace(/"/g, "") !== etag) return;
    const image = Buffer.from(await res.arrayBuffer());
    await sql`
      UPDATE video_variants SET image = ${image}
      WHERE youtube_video_id = ${videoId} AND kind = 'thumbnail' AND value = ${etag} AND image IS NULL`;
  } catch {
    // Retried on the next check: the row still has no image.
  }
}
