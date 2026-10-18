import fs from "fs";
import path from "path";

export interface ChannelVideoSample {
  id: string;
  title?: string;
  views: number;
  isShort: boolean;
  publishedAt?: string;
}

export interface CachedChannelRecord {
  channelId: string;
  channelTitle?: string;
  subscribers: number;
  baselineViews?: number;
  videos: ChannelVideoSample[];
  cachedAt: number;
}

export interface MedianComputationResult {
  median: number;
  medianReliable: boolean;
  sampleCount: number;
}

const CACHE_FILE = path.join(process.cwd(), "data", "channel_stats_cache.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures

let memoryCache: Map<string, CachedChannelRecord> | null = null;
let saveTimeout: NodeJS.Timeout | null = null;

function ensureCacheDir() {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadCache(): Map<string, CachedChannelRecord> {
  if (memoryCache) return memoryCache;
  ensureCacheDir();
  memoryCache = new Map<string, CachedChannelRecord>();

  if (fs.existsSync(CACHE_FILE)) {
    try {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        for (const [key, val] of Object.entries(parsed)) {
          memoryCache.set(key, val as CachedChannelRecord);
        }
      }
    } catch (err) {
      console.warn("[ChannelStatsCache] Could not read cache file:", err);
    }
  }

  return memoryCache;
}

function scheduleSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    if (!memoryCache) return;
    try {
      ensureCacheDir();
      const obj: Record<string, CachedChannelRecord> = {};
      for (const [k, v] of memoryCache.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch (err) {
      console.error("[ChannelStatsCache] Error writing cache file:", err);
    }
  }, 1000);
}

/**
 * Calcule la médiane statistique exacte d'une série de nombres
 */
export function getMedian(nums: number[]): number {
  if (!nums || nums.length === 0) return 3000;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Récupère le cache d'une chaîne s'il est encore valide (< 24h)
 */
export function getCachedChannel(channelId: string): CachedChannelRecord | null {
  const cache = loadCache();
  const item = cache.get(channelId);
  if (!item) return null;
  if (Date.now() - item.cachedAt > CACHE_TTL_MS) {
    return null; // Expiré
  }
  return item;
}

/**
 * Enregistre ou met à jour les stats d'une chaîne dans le cache 24h
 */
export function saveChannelStats(data: {
  channelId: string;
  channelTitle?: string;
  subscribers: number;
  baselineViews?: number;
  videos: ChannelVideoSample[];
}) {
  const cache = loadCache();
  const existing = cache.get(data.channelId);

  // Fusionner les vidéos connues en évitant les doublons
  const videoMap = new Map<string, ChannelVideoSample>();
  if (existing?.videos) {
    for (const v of existing.videos) {
      videoMap.set(v.id, v);
    }
  }
  for (const v of data.videos) {
    videoMap.set(v.id, v);
  }

  const record: CachedChannelRecord = {
    channelId: data.channelId,
    channelTitle: data.channelTitle || existing?.channelTitle,
    subscribers: data.subscribers || existing?.subscribers || 0,
    baselineViews: data.baselineViews || existing?.baselineViews || 5000,
    videos: Array.from(videoMap.values()),
    cachedAt: Date.now(),
  };

  cache.set(data.channelId, record);
  scheduleSave();
  return record;
}

/**
 * Calcule la médiane fiable d'une chaîne :
 * - EXCLUT la vidéo analysée (currentVideoId)
 * - Compare Shorts avec Shorts et Longform avec Longform
 * - Minimum 5 vidéos comparables requises pour medianReliable = true
 */
export function computeChannelMedianExcluding(params: {
  channelId: string;
  currentVideoId?: string;
  isShort: boolean;
  samples?: ChannelVideoSample[];
  fallbackMedian?: number;
}): MedianComputationResult {
  const { channelId, currentVideoId, isShort, fallbackMedian = 5000 } = params;

  let samples = params.samples;
  if (!samples || samples.length === 0) {
    const cached = getCachedChannel(channelId);
    samples = cached?.videos || [];
  }

  // 1. Exclure la vidéo en cours d'analyse
  const otherVideos = currentVideoId
    ? samples.filter((s) => s.id !== currentVideoId)
    : samples;

  // 2. Comparer Shorts avec Shorts, Longform avec Longform
  const comparable = otherVideos.filter((s) => s.isShort === isShort && s.views > 0);

  // 3. Minimum 5 vidéos comparables
  if (comparable.length >= 5) {
    const viewsList = comparable.map((s) => s.views);
    return {
      median: getMedian(viewsList),
      medianReliable: true,
      sampleCount: comparable.length,
    };
  }

  // Si < 5 vidéos comparables : medianReliable = false
  if (comparable.length > 0) {
    return {
      median: getMedian(comparable.map((s) => s.views)),
      medianReliable: false,
      sampleCount: comparable.length,
    };
  }

  // Fallback sur toutes les vidéos si aucun format identique
  const anyFormat = otherVideos.filter((s) => s.views > 0);
  if (anyFormat.length > 0) {
    return {
      median: getMedian(anyFormat.map((s) => s.views)),
      medianReliable: false,
      sampleCount: anyFormat.length,
    };
  }

  return {
    median: fallbackMedian,
    medianReliable: false,
    sampleCount: 0,
  };
}
