import { ChannelDetail, ChannelSearchResult, RecentVideo } from "@/types/youtube";
import { parseISO8601Duration } from "./utils";
import { scrapeChannelRss, scrapeInnerTubeSearch, scrapeChannelAllVideosInnerTube } from "./youtube-scraper";
import {
  getCachedChannelArchive,
  saveCachedChannelArchive,
  computeIntelligentMedians,
  mergeWithFreshVideos,
  ChannelMedianStats,
} from "./channelArchiveCache";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/**
 * High-performance In-Memory Cache with TTL to protect YouTube API quotas
 * 100 quota units for search.list vs 1 unit for channels.list
 */
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

/**
 * Lightweight in-memory YouTube Data API quota guard (per server instance).
 * Free quota = 10 000 units/day. search.list = 100 units, others ~= 1-3 units.
 * This does NOT persist across restarts â€” it's a safety rail, not billing.
 */
const QUOTA_DAILY_LIMIT = 9000;
const QUOTA_COSTS = { search: 100, list: 1 } as const;
let quotaUsed = 0;
let quotaWindowStart = Date.now();

function resetQuotaWindowIfNeeded() {
  const now = Date.now();
  if (now - quotaWindowStart > 24 * 60 * 60 * 1000) {
    quotaWindowStart = now;
    quotaUsed = 0;
  }
}

export function getYoutubeQuotaStatus() {
  resetQuotaWindowIfNeeded();
  return { used: quotaUsed, limit: QUOTA_DAILY_LIMIT, remaining: Math.max(0, QUOTA_DAILY_LIMIT - quotaUsed) };
}

function consumeQuota(cost: number): boolean {
  resetQuotaWindowIfNeeded();
  if (quotaUsed + cost > QUOTA_DAILY_LIMIT) {
    console.warn(`[YouTube quota] Blocked call (cost ${cost}). Used ${quotaUsed}/${QUOTA_DAILY_LIMIT}.`);
    return false;
  }
  quotaUsed += cost;
  return true;
}

function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached<T>(key: string, data: T, ttlSeconds: number = 3600): void {
  // Prune cache if it gets too large (> 1500 items)
  if (memoryCache.size > 1500) {
    const now = Date.now();
    for (const [k, v] of memoryCache.entries()) {
      if (now > v.expiry) memoryCache.delete(k);
    }
  }

  memoryCache.set(key, {
    data,
    expiry: Date.now() + ttlSeconds * 1000,
  });
}

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || key.trim() === "") {
    throw new Error("YOUTUBE_API_KEY is not configured in .env.local or environment variables.");
  }
  return key.trim();
}

/**
 * Extracts a handle, channelId, or clean query from a user's input.
 */
export function parseChannelInput(input: string): { type: "id" | "handle" | "query"; value: string } {
  const trimmed = input.trim();

  // Check URL patterns
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.includes("youtube.com/")) {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      const pathname = url.pathname;

      if (pathname.includes("/channel/")) {
        const id = pathname.split("/channel/")[1]?.split("/")[0]?.split("?")[0];
        if (id) return { type: "id", value: id };
      }
      if (pathname.includes("/@")) {
        const handle = pathname.split("/@")[1]?.split("/")[0]?.split("?")[0];
        if (handle) return { type: "handle", value: handle };
      }
    }
  } catch {
    // fall through to string checks
  }

  // Channel ID pattern (starts with UC and typically 24 chars)
  if (/^UC[\w-]{21,23}$/.test(trimmed)) {
    return { type: "id", value: trimmed };
  }

  // Handle pattern: @username
  if (trimmed.startsWith("@")) {
    return { type: "handle", value: trimmed.substring(1) };
  }

  return { type: "query", value: trimmed };
}

/**
 * Search channels or fetch directly by handle / ID
 * Cost:
 * - Direct ID / Handle: 1 quota unit (instead of 100 units)
 * - Cache hits: 0 quota units (Instant response)
 */
export async function searchChannels(query: string): Promise<ChannelSearchResult[]> {
  const cacheKey = `search:${query.toLowerCase().trim()}`;
  const cached = getCached<ChannelSearchResult[]>(cacheKey);
  if (cached) return cached;

  let apiKey: string | undefined;
  try {
    apiKey = getApiKey();
  } catch {
    // No API key configured, use native InnerTube scraper directly
    const scraped = await scrapeInnerTubeSearch(query);
    const mapped: ChannelSearchResult[] = scraped.channels.map((c) => ({
      id: c.id,
      title: c.title,
      customUrl: c.customUrl,
      description: c.description || "",
      thumbnail: c.thumbnail,
      subscriberCount: c.subscriberCount,
      videoCount: c.videoCount || 0,
      viewCount: 0,
    }));
    setCached(cacheKey, mapped, 3600);
    return mapped;
  }

  const parsed = parseChannelInput(query);
  let channelIds: string[] = [];

  try {
    // Case 1: Direct Channel ID (cost: 0 search units, only 1 unit for channel fetch)
    if (parsed.type === "id") {
      channelIds = [parsed.value];
    } 
    // Case 2: Handle resolution via forHandle (cost: 1 unit instead of 100 for search)
    else if (parsed.type === "handle") {
      const handleUrl = `${YOUTUBE_API_BASE}/channels?part=id&forHandle=${encodeURIComponent(parsed.value)}&key=${apiKey}`;
      const res = await fetch(handleUrl, { next: { revalidate: 7200 } });
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        channelIds = data.items.map((it: any) => it.id);
      } else {
        channelIds = await searchListFallback(parsed.value, apiKey);
      }
    } 
    // Case 3: Free-text search
    else {
      if (/^[a-zA-Z0-9_\-\.]{3,30}$/.test(parsed.value)) {
        try {
          const directHandleUrl = `${YOUTUBE_API_BASE}/channels?part=id&forHandle=${encodeURIComponent(parsed.value)}&key=${apiKey}`;
          const res = await fetch(directHandleUrl, { next: { revalidate: 7200 } });
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            channelIds = data.items.map((it: any) => it.id);
          }
        } catch {
          // Fall back to standard search
        }
      }

      if (channelIds.length === 0) {
        channelIds = await searchListFallback(parsed.value, apiKey);
      }
    }

    if (channelIds.length > 0) {
      const results = await fetchChannelsByIds(channelIds, apiKey);
      if (results.length > 0) {
        setCached(cacheKey, results, 7200);
        return results;
      }
    }
  } catch (apiErr) {
    console.warn("YouTube API search failed or quota hit, falling back to InnerTube scraper:", apiErr);
  }

  // Scraper Fallback (Zero Quota / Bypass Quota Block)
  try {
    const scraped = await scrapeInnerTubeSearch(parsed.value || query);
    if (scraped.channels.length > 0) {
      const mapped: ChannelSearchResult[] = scraped.channels.map((c) => ({
        id: c.id,
        title: c.title,
        customUrl: c.customUrl,
        description: c.description || "",
        thumbnail: c.thumbnail,
        subscriberCount: c.subscriberCount,
        videoCount: c.videoCount || 0,
        viewCount: 0,
      }));
      setCached(cacheKey, mapped, 3600);
      return mapped;
    }
  } catch (scrapeErr) {
    console.error("Scraper fallback also failed:", scrapeErr);
  }

  setCached(cacheKey, [], 1800);
  return [];
}

async function searchListFallback(query: string, apiKey: string): Promise<string[]> {
  if (!consumeQuota(QUOTA_COSTS.search)) {
    console.warn("[YouTube quota] searchListFallback blocked - daily safety limit reached.");
    return [];
  }
  const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&type=channel&maxResults=8&q=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(searchUrl, { next: { revalidate: 7200 } });
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || "Failed to search channels on YouTube");
  }

  return (data.items || [])
    .map((item: any) => item.id?.channelId || item.snippet?.channelId)
    .filter(Boolean);
}

export async function fetchChannelsByIds(channelIds: string[], apiKey?: string): Promise<ChannelSearchResult[]> {
  const key = apiKey || getApiKey();
  if (channelIds.length === 0) return [];

  const idsParam = channelIds.slice(0, 10).join(",");
  const url = `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${idsParam}&key=${key}`;
  const res = await fetch(url, { next: { revalidate: 7200 } });
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || "Failed to fetch channel details");
  }

  return (data.items || []).map((item: any) => {
    const hiddenSub = item.statistics?.hiddenSubscriberCount === true;
    return {
      id: item.id,
      title: item.snippet?.title || "Unknown Channel",
      customUrl: item.snippet?.customUrl,
      description: item.snippet?.description || "",
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
      subscriberCount: hiddenSub ? undefined : parseInt(item.statistics?.subscriberCount || "0", 10),
      hiddenSubscriberCount: hiddenSub,
      videoCount: parseInt(item.statistics?.videoCount || "0", 10),
      viewCount: parseInt(item.statistics?.viewCount || "0", 10),
    };
  });
}

/**
 * Get comprehensive channel details including uploads playlist & branding
 * Cached for 1 hour in memory + HTTP cache
 */
export async function getChannelDetails(channelId: string): Promise<ChannelDetail | null> {
  const cacheKey = `channel:${channelId}`;
  const cached = getCached<ChannelDetail>(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  const url = `${YOUTUBE_API_BASE}/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${channelId}&key=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || "Failed to get channel details");
  }

  if (!data.items || data.items.length === 0) {
    return null;
  }

  const item = data.items[0];
  const hiddenSub = item.statistics?.hiddenSubscriberCount === true;

  // Predict uploads playlist ID if contentDetails is somehow missing (UC -> UU)
  const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads || 
    (item.id?.startsWith("UC") ? "UU" + item.id.substring(2) : undefined);

  const description = item.snippet?.description || "";
  const detectedEmails = (await import("./utils")).extractEmails(description);

  const detail: ChannelDetail = {
    id: item.id,
    title: item.snippet?.title || "Unknown Channel",
    customUrl: item.snippet?.customUrl,
    description,
    publishedAt: item.snippet?.publishedAt || "",
    country: item.snippet?.country,
    avatar: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
    banner: item.brandingSettings?.image?.bannerExternalUrl,
    subscriberCount: hiddenSub ? undefined : parseInt(item.statistics?.subscriberCount || "0", 10),
    hiddenSubscriberCount: hiddenSub,
    videoCount: parseInt(item.statistics?.videoCount || "0", 10),
    viewCount: parseInt(item.statistics?.viewCount || "0", 10),
    uploadsPlaylistId,
    detectedEmails,
  };

  setCached(cacheKey, detail, 3600);
  return detail;
}

/**
 * Fetch recent uploaded videos for a channel using playlistItems and videos.list
 * Cached for 30 minutes in memory + HTTP cache
 */
export async function getRecentVideos(uploadsPlaylistId: string, maxResults: number = 50): Promise<RecentVideo[]> {
  const safeLimit = Math.min(Math.max(maxResults, 1), 50);
  const cacheKey = `videos:${uploadsPlaylistId}:${safeLimit}`;
  const cached = getCached<RecentVideo[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  // Inferred channel ID for live RSS real-time feed
  const channelId = uploadsPlaylistId.startsWith("UU")
    ? "UC" + uploadsPlaylistId.substring(2)
    : (uploadsPlaylistId.startsWith("UC") ? uploadsPlaylistId : null);

  // Fetch real-time RSS in parallel (zero quota, live seconds-fresh releases)
  const rssPromise = channelId ? scrapeChannelRss(channelId) : Promise.resolve([]);

  let apiKey: string | undefined;
  try {
    apiKey = getApiKey();
  } catch {
    // No API key: Return RSS videos directly
    const rssVideos = await rssPromise;
    const fallbackVideos: RecentVideo[] = rssVideos.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      publishedAt: r.publishedAt,
      thumbnail: r.thumbnail,
      viewCount: r.viewCount,
      likeCount: r.likeCount,
    }));
    setCached(cacheKey, fallbackVideos, 600);
    return fallbackVideos;
  }

  try {
    // Step 1: playlistItems.list to retrieve recent video IDs (1 quota unit for up to 50 items)
    const playlistUrl = `${YOUTUBE_API_BASE}/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${safeLimit}&key=${apiKey}`;
    const playlistRes = await fetch(playlistUrl, { next: { revalidate: 1800 } });
    const playlistData = await playlistRes.json();

    if (playlistData.error) {
      throw new Error(playlistData.error.message || "Failed to load uploads playlist");
    }

    const videoIds = (playlistData.items || [])
      .map((it: any) => it.contentDetails?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      const rssVideos = await rssPromise;
      if (rssVideos.length > 0) {
        return rssVideos.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          publishedAt: r.publishedAt,
          thumbnail: r.thumbnail,
          viewCount: r.viewCount,
          likeCount: r.likeCount,
        }));
      }
      setCached(cacheKey, [], 1800);
      return [];
    }

    // Step 2: videos.list single batch fetch for all video statistics (1 quota unit for 50 videos)
    const videosUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(",")}&key=${apiKey}`;
    const [videosRes, rssVideos] = await Promise.all([
      fetch(videosUrl, { next: { revalidate: 1800 } }),
      rssPromise,
    ]);
    const videosData = await videosRes.json();

    if (videosData.error) {
      throw new Error(videosData.error.message || "Failed to retrieve video statistics");
    }

    const videos: RecentVideo[] = (videosData.items || []).map((item: any) => {
      const durationInfo = parseISO8601Duration(item.contentDetails?.duration);
      const views = parseInt(item.statistics?.viewCount || "0", 10);
      const likes = item.statistics?.likeCount !== undefined ? parseInt(item.statistics.likeCount, 10) : undefined;
      const comments = item.statistics?.commentCount !== undefined ? parseInt(item.statistics.commentCount, 10) : undefined;

      return {
        id: item.id,
        title: item.snippet?.title || "Untitled Video",
        description: item.snippet?.description || "",
        publishedAt: item.snippet?.publishedAt || "",
        thumbnail: item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
        duration: item.contentDetails?.duration,
        durationFormatted: durationInfo.formatted,
        durationSeconds: durationInfo.seconds,
        viewCount: views,
        likeCount: likes,
        commentCount: comments,
      };
    });

    // Merge ultra-fresh RSS videos that may not yet appear in playlistItems
    if (rssVideos.length > 0) {
      const existingIds = new Set(videos.map((v) => v.id));
      const freshRssVideos: RecentVideo[] = [];

      for (const rss of rssVideos) {
        if (!existingIds.has(rss.id)) {
          freshRssVideos.push({
            id: rss.id,
            title: rss.title,
            description: rss.description,
            publishedAt: rss.publishedAt,
            thumbnail: rss.thumbnail,
            viewCount: rss.viewCount,
            likeCount: rss.likeCount,
          });
        }
      }

      if (freshRssVideos.length > 0) {
        videos.unshift(...freshRssVideos);
      }
    }

    setCached(cacheKey, videos, 1800);
    return videos;
  } catch (apiErr) {
    console.warn("YouTube API video fetch failed, falling back to instant RSS feed:", apiErr);
    const rssVideos = await rssPromise;
    if (rssVideos.length > 0) {
      const fallbackVideos: RecentVideo[] = rssVideos.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        publishedAt: r.publishedAt,
        thumbnail: r.thumbnail,
        viewCount: r.viewCount,
        likeCount: r.likeCount,
      }));
      setCached(cacheKey, fallbackVideos, 600);
      return fallbackVideos;
    }
    throw apiErr;
  }
}

/**
 * Fetch ALL channel videos from the beginning (lifetime archive)
 * Features:
 * 1. Persistent Disk Cache: Prevents re-scraping the same channel multiple times.
 * 2. Intelligent Medians: Excludes Shorts, computes 12m/24m/lifetime baselines.
 * 3. Zero-Quota Fallback: InnerTube continuous crawler if API key exhausted.
 */
export async function getAllChannelVideos(
  uploadsPlaylistId: string,
  maxResults: number = 1000,
  preferredWindow: "12m" | "24m" | "lifetime" = "12m"
): Promise<{
  videos: RecentVideo[];
  totalAvailable: number;
  medianViews: number;
  medianStats: ChannelMedianStats;
  firstUploadDate?: string;
  fromCache?: boolean;
}> {
  const channelId = uploadsPlaylistId.startsWith("UU")
    ? "UC" + uploadsPlaylistId.substring(2)
    : (uploadsPlaylistId.startsWith("UC") ? uploadsPlaylistId : null);

  // 1. Check Persistent Disk Cache
  if (channelId) {
    const diskArchive = await getCachedChannelArchive(channelId);
    if (diskArchive && diskArchive.videos.length > 0) {
      const cacheAgeMs = Date.now() - new Date(diskArchive.updatedAt).getTime();
      // If cached recently (less than 24 hours), return immediately from disk in 1ms
      if (cacheAgeMs < 24 * 3600 * 1000) {
        const { stats, enrichedVideos } = computeIntelligentMedians(
          diskArchive.videos,
          preferredWindow
        );
        return {
          videos: enrichedVideos,
          totalAvailable: diskArchive.totalAvailable || enrichedVideos.length,
          medianViews: stats.longform12m,
          medianStats: stats,
          firstUploadDate: diskArchive.firstUploadDate,
          fromCache: true,
        };
      }
    }
  }

  const safeLimit = Math.min(Math.max(maxResults, 1), 3500);
  let apiKey: string | undefined;
  try {
    apiKey = getApiKey();
  } catch {}

  let videos: RecentVideo[] = [];
  let totalAvailable = 0;

  if (apiKey) {
    try {
      let nextPage: string | null = null;
      const videoIds: string[] = [];
      let isFirstPage = true;

      while (videoIds.length < safeLimit) {
        if (!isFirstPage && !nextPage) break;
        isFirstPage = false;

        const fetchBatch: number = Math.min(50, safeLimit - videoIds.length);
        const tokenQuery: string = nextPage ? `&pageToken=${encodeURIComponent(nextPage)}` : "";
        const playlistUrl: string = `${YOUTUBE_API_BASE}/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${fetchBatch}${tokenQuery}&key=${apiKey}`;
        const res: Response = await fetch(playlistUrl, { next: { revalidate: 1800 } });
        const data: any = await res.json();

        if (data.error) break;

        if (data.pageInfo?.totalResults) {
          totalAvailable = data.pageInfo.totalResults;
        }

        const pageIds: string[] = (data.items || [])
          .map((it: any) => it.contentDetails?.videoId)
          .filter(Boolean);

        if (pageIds.length === 0) break;
        videoIds.push(...pageIds);

        nextPage = typeof data.nextPageToken === "string" ? data.nextPageToken : null;
        if (!nextPage) break;
      }

      // Batch fetch statistics 50 by 50
      for (let i = 0; i < videoIds.length; i += 50) {
        const chunk = videoIds.slice(i, i + 50);
        const videosUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${chunk.join(",")}&key=${apiKey}`;
        const vRes = await fetch(videosUrl, { next: { revalidate: 1800 } });
        const vData = await vRes.json();

        if (vData.items) {
          for (const item of vData.items) {
            const durationInfo = parseISO8601Duration(item.contentDetails?.duration);
            videos.push({
              id: item.id,
              title: item.snippet?.title || "Untitled Video",
              description: item.snippet?.description || "",
              publishedAt: item.snippet?.publishedAt || "",
              thumbnail: item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
              duration: item.contentDetails?.duration,
              durationFormatted: durationInfo.formatted,
              durationSeconds: durationInfo.seconds,
              viewCount: parseInt(item.statistics?.viewCount || "0", 10),
              likeCount: item.statistics?.likeCount !== undefined ? parseInt(item.statistics.likeCount, 10) : undefined,
              commentCount: item.statistics?.commentCount !== undefined ? parseInt(item.statistics.commentCount, 10) : undefined,
            });
          }
        }
      }
    } catch (apiErr) {
      console.warn("YouTube API pagination failed, attempting InnerTube scraper fallback:", apiErr);
    }
  }

  // Fallback to InnerTube crawler if API key missing or returned 0 items
  if (videos.length === 0 && channelId) {
    try {
      const scraped = await scrapeChannelAllVideosInnerTube(channelId, safeLimit);
      videos = scraped.map((s) => ({
        id: s.id,
        title: s.title,
        description: "",
        publishedAt: s.publishedTimeText ? new Date().toISOString() : "",
        thumbnail: s.thumbnail,
        durationFormatted: s.durationFormatted,
        durationSeconds: s.durationSeconds,
        viewCount: s.viewCount,
      }));
      totalAvailable = videos.length;
    } catch (scrapeErr) {
      console.error("InnerTube scraper fallback error:", scrapeErr);
    }
  }

  let firstUploadDate: string | undefined = undefined;

  if (videos.length > 0) {
    totalAvailable = Math.max(totalAvailable, videos.length);

    // Sort chronologically to find the very first video ever published
    const sortedByDate = [...videos]
      .filter((v) => v.publishedAt)
      .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
    
    if (sortedByDate.length > 0) {
      firstUploadDate = sortedByDate[0].publishedAt;
    }
  }

  // Calculate Intelligent Medians (Excluding Shorts, 12m/24m/lifetime)
  const { stats, enrichedVideos } = computeIntelligentMedians(videos, preferredWindow);

  // Persist to Disk Cache so we NEVER re-scrape this channel again
  if (channelId && enrichedVideos.length > 0) {
    saveCachedChannelArchive({
      channelId,
      uploadsPlaylistId,
      totalAvailable,
      firstUploadDate,
      updatedAt: new Date().toISOString(),
      medianStats: stats,
      videos: enrichedVideos,
    }).catch((err) => console.error("Error writing channel cache to disk:", err));
  }

  return {
    videos: enrichedVideos,
    totalAvailable,
    medianViews: stats.longform12m,
    medianStats: stats,
    firstUploadDate,
    fromCache: false,
  };
}



