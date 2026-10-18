import { parseISO8601Duration } from "./utils";
import { NicheSearchParams, NicheSearchResponse, OutlierVideoItem } from "@/types/nicheFinder";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}
const cache = new Map<string, CacheItem<any>>();

function getCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache<T>(key: string, data: T, ttlSeconds: number = 3600): void {
  if (cache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now > v.expiresAt) cache.delete(k);
    }
  }
  cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || key.trim() === "") {
    throw new Error("YOUTUBE_API_KEY is missing in server environment.");
  }
  return key.trim();
}

/**
 * Computes Median of numbers
 */
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Calculates estimated RPM by detecting niche keywords
 */
function estimateRPMForNiche(query: string, title: string): number {
  const text = `${query} ${title}`.toLowerCase();
  if (text.match(/crypto|bitcoin|invest|trading|finance|bourse|forex|immobilier|wealth|passive income/)) {
    return 14.5;
  }
  if (text.match(/ai|saas|software|coding|tech|cybersecurity|cloud|engineering|naval|military|aviation/)) {
    return 8.2;
  }
  if (text.match(/business|marketing|e-commerce|dropshipping|sales|agency|productivity/)) {
    return 9.8;
  }
  if (text.match(/fitness|health|diet|nutrition|workout|self improvement|mindset/)) {
    return 5.5;
  }
  if (text.match(/documentary|true crime|horror|history|mystery|story|essay/)) {
    return 4.2;
  }
  if (text.match(/gaming|minecraft|roblox|vlog|comedy|humour|entertainment/)) {
    return 2.5;
  }
  return 4.0;
}

/**
 * Core Niche Opportunity Discovery Engine
 */
export async function searchNicheOpportunities(params: NicheSearchParams): Promise<NicheSearchResponse> {
  const apiKey = getApiKey();
  const cacheKey = `niche_search:${JSON.stringify(params)}`;
  const cached = getCache<NicheSearchResponse>(cacheKey);
  if (cached) return cached;

  const maxResults = Math.min(params.maxResults || 25, 50);

  // 1. Calculate publishedAfter date if period filter applied
  let publishedAfter: string | undefined = undefined;
  const now = new Date();
  if (params.period === "24h") {
    publishedAfter = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  } else if (params.period === "7d") {
    publishedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (params.period === "30d") {
    publishedAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (params.period === "90d") {
    publishedAfter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  }

  // 2. Build search query
  const searchParams = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: params.query.trim(),
    maxResults: String(maxResults),
    order: "relevance",
    key: apiKey,
  });

  if (publishedAfter) {
    searchParams.set("publishedAfter", publishedAfter);
  }

  // Duration filter
  if (params.duration === "long") {
    searchParams.set("videoDuration", "long"); // > 20 mins or medium > 4 mins handled below
  } else if (params.duration === "short") {
    searchParams.set("videoDuration", "short"); // < 4 mins
  }

  if (params.pageToken) {
    searchParams.set("pageToken", params.pageToken);
  }

  const searchRes = await fetch(`${YOUTUBE_API_BASE}/search?${searchParams.toString()}`, {
    next: { revalidate: 1800 },
  });
  const searchData = await searchRes.json();

  if (searchData.error) {
    throw new Error(searchData.error.message || "Failed to search YouTube videos.");
  }

  const items = searchData.items || [];
  const videoIds = items.map((it: any) => it.id?.videoId).filter(Boolean);
  const channelIds = Array.from(new Set(items.map((it: any) => it.snippet?.channelId).filter(Boolean))) as string[];

  if (videoIds.length === 0) {
    const emptyResponse: NicheSearchResponse = {
      query: params.query,
      totalFound: 0,
      resultsCount: 0,
      items: [],
      aggregates: {
        avgOutlierRatio: 0,
        topNicheKeywords: [],
        topOpportunityScore: 0,
        smallChannelsRatio: 0,
      },
      freshnessTimestamp: new Date().toISOString(),
    };
    return emptyResponse;
  }

  // 3. Batch fetch video details (statistics & contentDetails)
  const videosRes = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(",")}&key=${apiKey}`,
    { next: { revalidate: 1800 } }
  );
  const videosData = await videosRes.json();
  const rawVideos = videosData.items || [];

  // 4. Batch fetch channel details (subscriber counts, views, uploads playlist)
  const channelsRes = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=snippet,contentDetails,statistics&id=${channelIds.join(",")}&key=${apiKey}`,
    { next: { revalidate: 3600 } }
  );
  const channelsData = await channelsRes.json();

  const channelMap = new Map<string, any>();
  for (const c of channelsData.items || []) {
    const subs = c.statistics?.hiddenSubscriberCount ? -1 : parseInt(c.statistics?.subscriberCount || "0", 10);
    channelMap.set(c.id, {
      id: c.id,
      title: c.snippet?.title || "Channel",
      handle: c.snippet?.customUrl || `@${(c.snippet?.title || "").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      avatar: c.snippet?.thumbnails?.medium?.url || c.snippet?.thumbnails?.default?.url || "",
      subscribers: subs,
      videoCount: parseInt(c.statistics?.videoCount || "0", 10),
      totalViews: parseInt(c.statistics?.viewCount || "0", 10),
      country: c.snippet?.country || undefined,
      publishedAt: c.snippet?.publishedAt,
      uploadsPlaylistId: c.contentDetails?.relatedPlaylists?.uploads,
    });
  }

  // 5. Gather Baseline Typical Views for channels (sample recent videos via upload playlists)
  // To protect quotas, we batch query the uploads playlists for active channels
  const channelBaselineMap = new Map<string, { baseline: number; sampleCount: number }>();
  
  // Select top channels to fetch upload samples
  const channelsToSample = Array.from(channelMap.values()).slice(0, 12);
  await Promise.all(
    channelsToSample.map(async (c) => {
      if (!c.uploadsPlaylistId) {
        // Fallback: totalViews / videoCount
        const avg = c.videoCount > 0 ? Math.round(c.totalViews / c.videoCount) : 1000;
        channelBaselineMap.set(c.id, { baseline: avg, sampleCount: 0 });
        return;
      }
      try {
        const pRes = await fetch(
          `${YOUTUBE_API_BASE}/playlistItems?part=contentDetails&playlistId=${c.uploadsPlaylistId}&maxResults=10&key=${apiKey}`,
          { next: { revalidate: 3600 } }
        );
        const pData = await pRes.json();
        const vIds = (pData.items || []).map((it: any) => it.contentDetails?.videoId).filter(Boolean);
        if (vIds.length > 0) {
          const vStatsRes = await fetch(
            `${YOUTUBE_API_BASE}/videos?part=statistics&id=${vIds.join(",")}&key=${apiKey}`,
            { next: { revalidate: 3600 } }
          );
          const vStatsData = await vStatsRes.json();
          const viewCounts = (vStatsData.items || []).map((v: any) => parseInt(v.statistics?.viewCount || "0", 10));
          const medianViews = calculateMedian(viewCounts);
          channelBaselineMap.set(c.id, { baseline: Math.max(medianViews, 100), sampleCount: viewCounts.length });
        } else {
          const avg = c.videoCount > 0 ? Math.round(c.totalViews / c.videoCount) : 1000;
          channelBaselineMap.set(c.id, { baseline: avg, sampleCount: 0 });
        }
      } catch {
        const avg = c.videoCount > 0 ? Math.round(c.totalViews / c.videoCount) : 1000;
        channelBaselineMap.set(c.id, { baseline: avg, sampleCount: 0 });
      }
    })
  );

  // 6. Compute Outlier Scores & Build Normalized Items
  const candidates: OutlierVideoItem[] = [];

  for (const v of rawVideos) {
    const channelId = v.snippet?.channelId;
    const channel = channelMap.get(channelId) || {
      id: channelId,
      title: v.snippet?.channelTitle || "Unknown",
      handle: `@${(v.snippet?.channelTitle || "").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      avatar: "",
      subscribers: 5000,
      videoCount: 10,
      totalViews: 50000,
    };

    const views = parseInt(v.statistics?.viewCount || "0", 10);
    const likes = parseInt(v.statistics?.likeCount || "0", 10);
    const comments = parseInt(v.statistics?.commentCount || "0", 10);
    const durationObj = parseISO8601Duration(v.contentDetails?.duration);
    const durationSeconds = durationObj.seconds;
    const isShort = durationSeconds <= 60 && !v.snippet?.title?.toLowerCase().includes("#long");

    // Days since publication for Views/Day calculation
    const pubDate = new Date(v.snippet?.publishedAt || Date.now());
    const daysSincePub = Math.max((now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24), 0.5);
    const viewsPerDay = Math.round(views / daysSincePub);

    // Channel Baseline Calculation
    let baselineObj = channelBaselineMap.get(channelId);
    if (!baselineObj) {
      // Fallback baseline: channel's totalViews / videoCount or 50% of subscriber count
      const fallbackBaseline = channel.videoCount > 0 
        ? Math.round(channel.totalViews / channel.videoCount) 
        : (channel.subscribers > 0 ? Math.round(channel.subscribers * 0.4) : 1000);
      baselineObj = { baseline: Math.max(fallbackBaseline, 100), sampleCount: 0 };
    }

    const baselineViews = baselineObj.baseline;
    const rawRatio = baselineViews > 0 ? views / baselineViews : 1;
    const ratio = parseFloat(rawRatio.toFixed(1));

    // Classification
    let classification: OutlierVideoItem["outlier"]["classification"] = "normal";
    let classificationLabel = "Performance Normale";
    if (ratio < 1.0) {
      classification = "under";
      classificationLabel = "Sous la moyenne";
    } else if (ratio >= 1.0 && ratio < 2.0) {
      classification = "normal";
      classificationLabel = "Intéressante (1-2x)";
    } else if (ratio >= 2.0 && ratio < 5.0) {
      classification = "breakout";
      classificationLabel = "Surperformance (2-5x)";
    } else if (ratio >= 5.0 && ratio < 10.0) {
      classification = "high_outlier";
      classificationLabel = "Forte Surperformance (5-10x)";
    } else {
      classification = "extreme_outlier";
      classificationLabel = "Outlier Majeur (10x+)";
    }

    const reliability: OutlierVideoItem["outlier"]["reliability"] = 
      baselineObj.sampleCount >= 5 ? "verified" : baselineObj.sampleCount > 0 ? "estimated" : "insufficient_data";

    const estimatedRPM = estimateRPMForNiche(params.query, v.snippet?.title || "");
    const estimatedRevenue = Math.round((views / 1000) * estimatedRPM);

    const isSmallChannel = channel.subscribers >= 0 && channel.subscribers <= 100000;

    candidates.push({
      id: v.id,
      title: v.snippet?.title || "Sans titre",
      description: v.snippet?.description || "",
      thumbnail: v.snippet?.thumbnails?.maxres?.url || v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || "",
      publishedAt: v.snippet?.publishedAt || "",
      views,
      likes,
      comments,
      durationFormatted: durationObj.formatted,
      durationSeconds,
      isShort,
      viewsPerDay,
      channel: {
        id: channel.id,
        title: channel.title,
        handle: channel.handle,
        avatar: channel.avatar,
        subscribers: channel.subscribers,
        videoCount: channel.videoCount,
        totalViews: channel.totalViews,
        country: channel.country,
        publishedAt: channel.publishedAt,
        isSmallChannel,
      },
      outlier: {
        ratio,
        classification,
        classificationLabel,
        baselineViews,
        sampleSize: baselineObj.sampleCount,
        reliability,
      },
      monetization: {
        estimatedRPM,
        estimatedRevenue,
        nicheCategory: params.query,
      },
    });
  }

  // 7. Apply In-Memory Filters specified by user
  let filtered = candidates.filter((item) => {
    // Channel size filter
    if (params.channelSize === "small" && (item.channel.subscribers > 50000 || item.channel.subscribers === -1)) return false;
    if (params.channelSize === "medium" && (item.channel.subscribers <= 50000 || item.channel.subscribers > 250000)) return false;
    if (params.channelSize === "large" && item.channel.subscribers <= 250000) return false;

    // Subs min/max
    if (params.minSubs !== undefined && item.channel.subscribers !== -1 && item.channel.subscribers < params.minSubs) return false;
    if (params.maxSubs !== undefined && item.channel.subscribers !== -1 && item.channel.subscribers > params.maxSubs) return false;

    // Views min/max
    if (params.minViews !== undefined && item.views < params.minViews) return false;
    if (params.maxViews !== undefined && item.views > params.maxViews) return false;

    // Duration format
    if (params.duration === "long" && item.isShort) return false;
    if (params.duration === "short" && !item.isShort) return false;

    // Keywords include / exclude
    if (params.includeKeywords) {
      const inc = params.includeKeywords.toLowerCase();
      if (!item.title.toLowerCase().includes(inc)) return false;
    }
    if (params.excludeKeywords) {
      const exc = params.excludeKeywords.toLowerCase();
      if (item.title.toLowerCase().includes(exc)) return false;
    }

    return true;
  });

  // 8. Sorting
  const sortBy = params.sortBy || "outlierScore";
  filtered.sort((a, b) => {
    if (sortBy === "outlierScore") return b.outlier.ratio - a.outlier.ratio;
    if (sortBy === "views") return b.views - a.views;
    if (sortBy === "viewsPerDay") return b.viewsPerDay - a.viewsPerDay;
    if (sortBy === "date") return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    if (sortBy === "subscribers") return b.channel.subscribers - a.channel.subscribers;
    return b.outlier.ratio - a.outlier.ratio;
  });

  // 9. Aggregates calculation
  const totalOutlierSum = filtered.reduce((acc, curr) => acc + curr.outlier.ratio, 0);
  const avgOutlierRatio = filtered.length > 0 ? parseFloat((totalOutlierSum / filtered.length).toFixed(1)) : 0;
  const smallChannelsCount = filtered.filter((i) => i.channel.isSmallChannel).length;
  const smallChannelsRatio = filtered.length > 0 ? Math.round((smallChannelsCount / filtered.length) * 100) : 0;

  // Extract frequent title keywords
  const wordCounts = new Map<string, number>();
  filtered.forEach((i) => {
    const words = i.title
      .toLowerCase()
      .replace(/[^\w\s\u00C0-\u00FF]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !["this", "that", "with", "from", "your", "dans", "avec", "pour", "cette"].includes(w));
    words.forEach((w) => wordCounts.set(w, (wordCounts.get(w) || 0) + 1));
  });
  const topNicheKeywords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);

  const topOpportunityScore = Math.min(100, Math.round(avgOutlierRatio * 12 + smallChannelsRatio * 0.4));

  const response: NicheSearchResponse = {
    query: params.query,
    totalFound: searchData.pageInfo?.totalResults || filtered.length,
    resultsCount: filtered.length,
    nextPageToken: searchData.nextPageToken,
    prevPageToken: searchData.prevPageToken,
    items: filtered,
    aggregates: {
      avgOutlierRatio,
      topNicheKeywords,
      topOpportunityScore,
      smallChannelsRatio,
    },
    freshnessTimestamp: new Date().toISOString(),
  };

  setCache(cacheKey, response, 1800);
  return response;
}
