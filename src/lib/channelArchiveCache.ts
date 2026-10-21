import fs from "fs/promises";
import path from "path";
import { RecentVideo } from "@/types/youtube";
import { DATA_DIR, isExpired } from "@/lib/dataDir";

export interface ChannelMedianStats {
  // Longform medians (Shorts strictly excluded)
  longform12m: number;
  longform24m: number;
  longformLifetime: number;
  // Shorts median
  shortsLifetime: number;
  // Overall median
  overallLifetime: number;
  // Counts
  totalLongform: number;
  totalShorts: number;
}

export interface CachedChannelArchive {
  channelId: string;
  uploadsPlaylistId: string;
  totalAvailable: number;
  firstUploadDate?: string;
  updatedAt: string;
  medianStats: ChannelMedianStats;
  videos: RecentVideo[];
}

const CACHE_DIR = path.join(DATA_DIR, "channel_archives");

async function ensureDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {}
}

/**
 * 1. Read persistent archive cache from disk
 */
export async function getCachedChannelArchive(
  channelId: string
): Promise<CachedChannelArchive | null> {
  try {
    await ensureDir();
    const filePath = path.join(CACHE_DIR, `${channelId}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    const data: CachedChannelArchive = JSON.parse(content);
    // YouTube API data older than 30 days is deleted (see isExpired).
    if (isExpired(data.updatedAt)) {
      await fs.unlink(filePath);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * 2. Save persistent archive cache to disk
 */
export async function saveCachedChannelArchive(
  archive: CachedChannelArchive
): Promise<void> {
  try {
    await ensureDir();
    const filePath = path.join(CACHE_DIR, `${archive.channelId}.json`);
    await fs.writeFile(filePath, JSON.stringify(archive, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write channel archive cache:", err);
  }
}

/**
 * 3. Intelligent Medians Calculation:
 * - Excludes Shorts from longform baseline (< 60s or duration info)
 * - Computes 12-Month window, 24-Month window, and Lifetime baseline
 * - Calculates Outlier Multipliers dynamically
 */
export function computeIntelligentMedians(
  videos: RecentVideo[],
  preferredWindow: "12m" | "24m" | "lifetime" = "12m"
): {
  stats: ChannelMedianStats;
  enrichedVideos: RecentVideo[];
} {
  const now = Date.now();
  const ONE_DAY_MS = 86400000;
  const cutoff12m = now - 365 * ONE_DAY_MS;
  const cutoff24m = now - 730 * ONE_DAY_MS;

  const isShortVideo = (v: RecentVideo) => {
    if (v.durationSeconds !== undefined && v.durationSeconds > 0) {
      return v.durationSeconds <= 60;
    }
    if (v.durationFormatted) {
      const parts = v.durationFormatted.split(":");
      if (parts.length === 2 && parts[0] === "0" && parseInt(parts[1], 10) <= 60) {
        return true;
      }
    }
    return false;
  };

  const longformVideos = videos.filter((v) => !isShortVideo(v));
  const shortsVideos = videos.filter((v) => isShortVideo(v));

  // Compute Median Helper
  const getMedian = (nums: number[]) => {
    if (nums.length === 0) return 0;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  // Views arrays
  const longformLifetimeViews = longformVideos.map((v) => v.viewCount);
  const longform12mViews = longformVideos
    .filter((v) => v.publishedAt && new Date(v.publishedAt).getTime() >= cutoff12m)
    .map((v) => v.viewCount);
  const longform24mViews = longformVideos
    .filter((v) => v.publishedAt && new Date(v.publishedAt).getTime() >= cutoff24m)
    .map((v) => v.viewCount);
  const shortsViews = shortsVideos.map((v) => v.viewCount);
  const overallViews = videos.map((v) => v.viewCount);

  const longformLifetime = Math.max(getMedian(longformLifetimeViews), 1);
  const longform12m = longform12mViews.length >= 3 ? Math.max(getMedian(longform12mViews), 1) : longformLifetime;
  const longform24m = longform24mViews.length >= 3 ? Math.max(getMedian(longform24mViews), 1) : longformLifetime;
  const shortsLifetime = Math.max(getMedian(shortsViews), 1);
  const overallLifetime = Math.max(getMedian(overallViews), 1);

  const stats: ChannelMedianStats = {
    longform12m,
    longform24m,
    longformLifetime,
    shortsLifetime,
    overallLifetime,
    totalLongform: longformVideos.length,
    totalShorts: shortsVideos.length,
  };

  // Enrich each video with appropriate outlier multiplier
  const enrichedVideos: RecentVideo[] = videos.map((v) => {
    const isShort = isShortVideo(v);
    let baseline = longformLifetime;

    if (isShort) {
      baseline = shortsLifetime;
    } else {
      const pubTime = v.publishedAt ? new Date(v.publishedAt).getTime() : 0;
      if (preferredWindow === "12m" && pubTime >= cutoff12m) {
        baseline = longform12m;
      } else if (preferredWindow === "24m" && pubTime >= cutoff24m) {
        baseline = longform24m;
      } else {
        baseline = longformLifetime;
      }
    }

    const outlierMultiplier = parseFloat((v.viewCount / Math.max(baseline, 1)).toFixed(1));

    return {
      ...v,
      outlierMultiplier,
    };
  });

  return {
    stats,
    enrichedVideos,
  };
}

/**
 * 4. Incremental merge: Combine cached archive with fresh videos from RSS / latest page
 */
export function mergeWithFreshVideos(
  cachedVideos: RecentVideo[],
  freshVideos: RecentVideo[]
): RecentVideo[] {
  const existingMap = new Map<string, RecentVideo>();
  // Old ones first
  for (const v of cachedVideos) {
    existingMap.set(v.id, v);
  }
  // Fresh ones override / prepend
  for (const fresh of freshVideos) {
    existingMap.set(fresh.id, {
      ...existingMap.get(fresh.id),
      ...fresh,
    });
  }

  // Sort newest first
  return Array.from(existingMap.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
