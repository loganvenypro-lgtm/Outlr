import fs from "fs/promises";
import path from "path";
import { DiscoveredVideoRecord } from "@/types/discoveryEngine";
import { detectTitlePattern } from "./titlePatternDetector";
import { inferVideoCategory, inferVideoNiche, ALGROW_NICHES, ALGROW_CATEGORIES } from "./taxonomyHelper";
import { DATA_DIR } from "@/lib/dataDir";

export interface IndexedViralVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  durationFormatted: string;
  durationSeconds: number;
  viewCount: number;
  viewsPerDay: number;
  
  // Channel Context
  channelId: string;
  channelTitle: string;
  channelAvatar?: string;
  channelSubscribers: number;
  channelMedianViews: number;
  channelCreatedAt?: string;
  channelVideoCount?: number;
  
  // Title Pattern
  titlePattern?: string;
  titleTemplate?: string;
  
  // Outlier Scores
  outlierMultiplier: number;
  viralRatio: number;
  viralBreakoutScore: number;
  medianReliable?: boolean;
  engagementRate?: number;
  category: string;
  niche?: string;
  subNiche?: string;
  tags: string[];
  indexedAt: string;
}

export interface ViralFilterParams {
  format?: "all" | "long" | "shorts";
  minOutlier?: number;
  maxOutlier?: number;
  period?: "all" | "today" | "24h" | "7d" | "14d" | "21d" | "30d" | "90d" | "1y";
  minViews?: number;
  maxViews?: number;
  minSubs?: number;
  maxSubs?: number;
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
  minUploadCount?: number;
  maxUploadCount?: number;
  minChannelAgeDays?: number;
  maxChannelAgeDays?: number;
  category?: string;
  niche?: string;
  subNiche?: string;
  search?: string;
  sortBy?: "vbs" | "outlier" | "viral_ratio" | "vpd" | "views" | "date";
  page?: number;
  limit?: number;
}

const INDEX_FILE = path.join(DATA_DIR, "viral_videos_index.json");
const DISCOVERED_CACHE_FILE = path.join(DATA_DIR, "discovered_videos_cache.json");

let memoryIndex: IndexedViralVideo[] | null = null;
let lastLoadedTime = 0;

async function ensureDataDir() {
  const dir = DATA_DIR;
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
}

/**
 * 1. Compute Viral Breakout Score (VBS)
 * Balanced formula prioritizing recent multi-factor breakouts
 */
export function calculateViralBreakoutScore(video: {
  viewCount: number;
  viewsPerDay: number;
  outlierMultiplier: number;
  channelSubscribers: number;
  publishedAt: string;
}): number {
  const now = Date.now();
  const pubTime = video.publishedAt ? new Date(video.publishedAt).getTime() : now;
  const ageDays = Math.max((now - pubTime) / (1000 * 60 * 60 * 24), 0.5);

  // Freshness Multiplier: < 48h = 1.6x, < 7d = 1.3x, < 21d = 1.0x, > 30d = 0.7x
  let freshnessFactor = 1.0;
  if (ageDays <= 2) freshnessFactor = 1.6;
  else if (ageDays <= 7) freshnessFactor = 1.35;
  else if (ageDays <= 21) freshnessFactor = 1.0;
  else freshnessFactor = 0.7;

  // Logarithmic Velocity to prevent ultra-large channels from totally dominating
  const vpdScore = Math.log10(Math.max(video.viewsPerDay, 10)) * 25;

  // Viral Ratio (Views / Subs)
  const ratio = video.channelSubscribers > 0 
    ? Math.min(video.viewCount / video.channelSubscribers, 50) 
    : 1;

  // Base breakout calculation
  const rawScore = 
    (video.outlierMultiplier * 35) + 
    vpdScore + 
    (ratio * 15);

  const finalScore = rawScore * freshnessFactor;
  return parseFloat(finalScore.toFixed(1));
}

/**
 * 2. Load index with fallback seeding from discovered_videos_cache.json
 */
export async function loadViralVideosIndex(): Promise<IndexedViralVideo[]> {
  const now = Date.now();
  if (memoryIndex && now - lastLoadedTime < 30000) {
    return memoryIndex;
  }

  await ensureDataDir();

  try {
    const raw = await fs.readFile(INDEX_FILE, "utf-8");
    const parsed: IndexedViralVideo[] = JSON.parse(raw);
    memoryIndex = parsed;
    lastLoadedTime = now;
    return parsed;
  } catch {
    // If index file doesn't exist yet, bootstrap from discovered_videos_cache
    const seeded = await bootstrapFromDiscoveredCache();
    memoryIndex = seeded;
    lastLoadedTime = now;
    await saveViralVideosIndex(seeded);
    return seeded;
  }
}

/**
 * 3. Save index to disk
 */
export async function saveViralVideosIndex(videos: IndexedViralVideo[]): Promise<void> {
  await ensureDataDir();
  memoryIndex = videos;
  lastLoadedTime = Date.now();
  try {
    await fs.writeFile(INDEX_FILE, JSON.stringify(videos, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save viral videos index to disk:", err);
  }
}

/**
 * 4. Add or merge newly discovered videos into the viral index
 */
export async function ingestVideosIntoViralIndex(
  newVideos: DiscoveredVideoRecord[] | Partial<IndexedViralVideo>[]
): Promise<number> {
  const current = await loadViralVideosIndex();
  const indexMap = new Map<string, IndexedViralVideo>(current.map((v) => [v.id, v]));
  let addedCount = 0;

  for (const raw of newVideos) {
    if (!raw.id || !raw.title) continue;

    // Filter out low-value items: require at least 1.5x outlier or high viral ratio
    const outlierMultiplier = raw.outlierMultiplier || 1.0;
    const views = raw.viewCount || 0;
    if (outlierMultiplier < 1.3 && views < 10000) continue;

    const viewsPerDay = (raw as any).viewsPerDay || Math.round(views / 7);
    const channelSubscribers = (raw as any).channelSubscribers || 0;
    const viralRatio = channelSubscribers > 0 
      ? parseFloat((views / channelSubscribers).toFixed(1)) 
      : 1;

    const publishedAt = raw.publishedAt || new Date().toISOString();
    const vbs = calculateViralBreakoutScore({
      viewCount: views,
      viewsPerDay,
      outlierMultiplier,
      channelSubscribers,
      publishedAt,
    });

    const isShort = ((raw as any).durationSeconds !== undefined && (raw as any).durationSeconds <= 60);
    const pattern = detectTitlePattern(raw.title);

    const indexedItem: IndexedViralVideo = {
      id: raw.id,
      title: raw.title,
      thumbnail: raw.thumbnail || `https://i.ytimg.com/vi/${raw.id}/hqdefault.jpg`,
      publishedAt,
      durationFormatted: (raw as any).durationFormatted || (isShort ? "0:45" : "12:00"),
      durationSeconds: (raw as any).durationSeconds || (isShort ? 45 : 720),
      viewCount: views,
      viewsPerDay,
      channelId: (raw as any).channelId || "",
      channelTitle: (raw as any).channelTitle || "YouTube Creator",
      channelAvatar: (raw as any).channelAvatar,
      channelSubscribers,
      channelMedianViews: (raw as any).baselineViews || Math.round(views / Math.max(outlierMultiplier, 1)),
      channelCreatedAt: (raw as any).channelCreatedAt,
      titlePattern: pattern.badge,
      titleTemplate: pattern.template,
      outlierMultiplier,
      viralRatio,
      viralBreakoutScore: vbs,
      engagementRate: (raw as any).engagementRate,
      category: (raw as any).foundViaQuery || "Trending",
      subNiche: (raw as any).breakoutTopicLabel,
      tags: [],
      indexedAt: new Date().toISOString(),
    };

    if (!indexMap.has(raw.id)) {
      addedCount++;
    }
    indexMap.set(raw.id, indexedItem);
  }

  const updatedList = Array.from(indexMap.values())
    .sort((a, b) => b.viralBreakoutScore - a.viralBreakoutScore)
    .slice(0, 3000); // Keep top 3000 best outliers in index

  await saveViralVideosIndex(updatedList);
  return addedCount;
}

/**
 * 5. Query and Filter the Viral Index (Sub-millisecond memory execution)
 */
export async function queryViralVideos(params: ViralFilterParams): Promise<{
  videos: IndexedViralVideo[];
  totalCount: number;
  totalPages: number;
  page: number;
  lastUpdated: string;
  nicheCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
}> {
  const allVideos = await loadViralVideosIndex();
  const now = Date.now();
  const ONE_DAY_MS = 86400000;

  // Cutoff timestamp for period
  let periodCutoff = 0;
  if (params.period === "today" || params.period === "24h") periodCutoff = now - 1 * ONE_DAY_MS;
  else if (params.period === "7d") periodCutoff = now - 7 * ONE_DAY_MS;
  else if (params.period === "14d") periodCutoff = now - 14 * ONE_DAY_MS;
  else if (params.period === "21d") periodCutoff = now - 21 * ONE_DAY_MS;
  else if (params.period === "30d") periodCutoff = now - 30 * ONE_DAY_MS;
  else if (params.period === "90d") periodCutoff = now - 90 * ONE_DAY_MS;
  else if (params.period === "1y") periodCutoff = now - 365 * ONE_DAY_MS;

  // Pre-calculate niche and category counts for all available videos
  const nicheCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  for (const n of ALGROW_NICHES) nicheCounts[n] = 0;
  for (const c of ALGROW_CATEGORIES) categoryCounts[c] = 0;

  for (const v of allVideos) {
    const n = inferVideoNiche(v.title, v.category);
    const c = inferVideoCategory(v.title);
    nicheCounts[n] = (nicheCounts[n] || 0) + 1;
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  }

  const filtered = allVideos.filter((v) => {
    // 1. Format Filter
    const isShort = v.durationSeconds <= 60;
    if (params.format === "long" && isShort) return false;
    if (params.format === "shorts" && !isShort) return false;

    // 2. Video Views (Min & Max)
    if (params.minViews && v.viewCount < params.minViews) return false;
    if (params.maxViews && v.viewCount > params.maxViews) return false;

    // 3. Outlier Score (Min & Max)
    if (params.minOutlier && v.outlierMultiplier < params.minOutlier) return false;
    if (params.maxOutlier && v.outlierMultiplier > params.maxOutlier) return false;

    // 4. Channel Subscribers (Min & Max)
    if (params.minSubs && v.channelSubscribers < params.minSubs) return false;
    if (params.maxSubs && v.channelSubscribers > 0 && v.channelSubscribers > params.maxSubs) return false;

    // 5. Uploaded Within (Period)
    if (periodCutoff > 0) {
      const pubTime = v.publishedAt ? new Date(v.publishedAt).getTime() : 0;
      if (pubTime < periodCutoff) return false;
    }

    // 6. Video Length (Duration Seconds)
    if (params.minDurationSeconds && v.durationSeconds < params.minDurationSeconds) return false;
    if (params.maxDurationSeconds && v.durationSeconds > params.maxDurationSeconds) return false;

    // 7. Channel Upload Count
    if (params.minUploadCount && (v.channelVideoCount || 0) < params.minUploadCount) return false;
    if (params.maxUploadCount && (v.channelVideoCount || 0) > params.maxUploadCount) return false;

    // 8. Channel Age (Days since channel started)
    if (v.channelCreatedAt) {
      const channelCreatedMs = new Date(v.channelCreatedAt).getTime();
      const channelAgeDays = Math.max(0, (now - channelCreatedMs) / (1000 * 60 * 60 * 24));
      if (params.minChannelAgeDays && channelAgeDays < params.minChannelAgeDays) return false;
      if (params.maxChannelAgeDays && channelAgeDays > params.maxChannelAgeDays) return false;
    }

    // 9. Category Filter (Algrow 14 categories)
    if (params.category && params.category !== "All Categories" && params.category !== "all") {
      const detectedCat = inferVideoCategory(v.title);
      if (detectedCat.toLowerCase() !== params.category.toLowerCase()) return false;
    }

    // 10. Niche Filter (Algrow 11 niches)
    if (params.niche && params.niche !== "Any niche" && params.niche !== "all") {
      const detectedNiche = inferVideoNiche(v.title, v.category);
      if (detectedNiche.toLowerCase() !== params.niche.toLowerCase()) return false;
    }

    // 11. Keyword Search
    if (params.search && params.search.trim()) {
      const s = params.search.toLowerCase().trim();
      const match =
        v.title.toLowerCase().includes(s) ||
        v.channelTitle.toLowerCase().includes(s) ||
        v.category.toLowerCase().includes(s);
      if (!match) return false;
    }

    return true;
  });

  // Sorting
  const sortBy = params.sortBy || "vbs";
  filtered.sort((a, b) => {
    if (sortBy === "vbs") return b.viralBreakoutScore - a.viralBreakoutScore;
    if (sortBy === "outlier") return b.outlierMultiplier - a.outlierMultiplier;
    if (sortBy === "viral_ratio") return b.viralRatio - a.viralRatio;
    if (sortBy === "vpd") return b.viewsPerDay - a.viewsPerDay;
    if (sortBy === "views") return b.viewCount - a.viewCount;
    if (sortBy === "date") return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    return 0;
  });

  const page = Math.max(params.page || 1, 1);
  const limit = Math.min(Math.max(params.limit || 24, 1), 60);
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return {
    videos: paginated,
    totalCount,
    totalPages,
    page,
    lastUpdated: new Date().toISOString(),
    nicheCounts,
    categoryCounts,
  };
}

/**
 * Helper: Bootstrap from discovered_videos_cache.json if empty
 */
async function bootstrapFromDiscoveredCache(): Promise<IndexedViralVideo[]> {
  try {
    const raw = await fs.readFile(DISCOVERED_CACHE_FILE, "utf-8");
    const records: DiscoveredVideoRecord[] = JSON.parse(raw);

    const indexed: IndexedViralVideo[] = records
      .filter((r) => (r.outlierMultiplier && r.outlierMultiplier >= 1.5) || r.viewCount >= 20000)
      .map((r) => {
        const isShort = r.durationFormatted === "0:60" || (r.durationFormatted && r.durationFormatted.startsWith("0:") && parseInt(r.durationFormatted.split(":")[1], 10) <= 60);
        const pattern = detectTitlePattern(r.title);
        const vbs = calculateViralBreakoutScore({
          viewCount: r.viewCount,
          viewsPerDay: r.viewsPerDay,
          outlierMultiplier: r.outlierMultiplier,
          channelSubscribers: r.channelSubscribers,
          publishedAt: r.publishedAt,
        });

        return {
          id: r.id,
          title: r.title,
          thumbnail: r.thumbnail,
          publishedAt: r.publishedAt,
          durationFormatted: r.durationFormatted || "10:00",
          durationSeconds: isShort ? 45 : 600,
          viewCount: r.viewCount,
          viewsPerDay: r.viewsPerDay,
          channelId: r.channelId,
          channelTitle: r.channelTitle,
          channelAvatar: r.channelAvatar,
          channelSubscribers: r.channelSubscribers,
          channelMedianViews: r.baselineViews,
          channelCreatedAt: (r as any).channelCreatedAt,
          titlePattern: pattern.badge,
          titleTemplate: pattern.template,
          outlierMultiplier: r.outlierMultiplier,
          viralRatio: r.viralRatio || (r.channelSubscribers > 0 ? parseFloat((r.viewCount / r.channelSubscribers).toFixed(1)) : 1),
          viralBreakoutScore: vbs,
          engagementRate: r.engagementRate,
          category: r.foundViaQuery || "Discovery",
          subNiche: r.breakoutTopicLabel,
          tags: [],
          indexedAt: new Date().toISOString(),
        };
      })
      .sort((a, b) => b.viralBreakoutScore - a.viralBreakoutScore);

    return indexed.slice(0, 3000);
  } catch (err) {
    console.warn("Could not bootstrap from discovered cache, returning starter presets:", err);
    return [];
  }
}
