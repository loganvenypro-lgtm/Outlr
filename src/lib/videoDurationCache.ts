import fs from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/dataDir";

export interface CachedVideoDuration {
  videoId: string;
  lengthSeconds: number;
  durationSeconds: number;
  durationFormatted: string;
  isShort: boolean;
  format: "short" | "longform" | "unknown";
  liveViews?: number;
  liveSubs?: number;
  updatedAt: number;
}

const DURATION_CACHE_FILE = path.join(DATA_DIR, "video_durations_cache.json");

let memoryCache: Map<string, CachedVideoDuration> | null = null;
const inFlightPromises = new Map<string, Promise<CachedVideoDuration>>();
let saveTimeout: NodeJS.Timeout | null = null;

function ensureCacheDir() {
  const dir = path.dirname(DURATION_CACHE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadCache(): Map<string, CachedVideoDuration> {
  if (memoryCache) return memoryCache;
  ensureCacheDir();
  memoryCache = new Map<string, CachedVideoDuration>();

  if (fs.existsSync(DURATION_CACHE_FILE)) {
    try {
      const raw = fs.readFileSync(DURATION_CACHE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        for (const [key, val] of Object.entries(parsed)) {
          memoryCache.set(key, val as CachedVideoDuration);
        }
      }
    } catch (err) {
      console.warn("[DurationCache] Could not read cache file, initializing empty:", err);
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
      const obj: Record<string, CachedVideoDuration> = {};
      for (const [k, v] of memoryCache.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(DURATION_CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch (err) {
      console.error("[DurationCache] Error writing cache file:", err);
    }
  }, 1000);
}

function formatSeconds(durSec: number): string {
  if (!durSec || durSec <= 0) return "0:00";
  const mins = Math.floor(durSec / 60);
  const secs = durSec % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins < 10 ? "0" : ""}${remMins}:${secs < 10 ? "0" : ""}${secs}`;
  }
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// Concurrency limiter for /watch scraping (max 3 concurrent requests)
class ConcurrencyLimiter {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

const limiter = new ConcurrencyLimiter(3);

async function fetchWatchPageWithBackoff(videoId: string, maxRetries = 2): Promise<{
  lengthSeconds: number;
  durationFormatted: string;
  isShort: boolean;
  format: "short" | "longform" | "unknown";
  liveViews?: number;
  liveSubs?: number;
}> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 429) {
        attempt++;
        if (attempt > maxRetries) break;
        const delay = 500 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const html = await res.text();
      const durMatch = html.match(/"lengthSeconds":"(\d+)"/);
      const durSec = durMatch ? parseInt(durMatch[1], 10) : 0;
      const isShortFlag = /"isShort":true|reelWatchEndpoint/i.test(html);
      const isShort = (durSec > 0 && durSec <= 60) || isShortFlag;
      const format: "short" | "longform" | "unknown" =
        durSec > 0 || isShortFlag ? (isShort ? "short" : "longform") : "unknown";

      let liveSubs: number | undefined;
      const subMatch = html.match(/"subscriberCountText":\{.*?"simpleText":"([^"]+)"/);
      if (subMatch && subMatch[1]) {
        const clean = subMatch[1].replace(/,/g, ".").replace(/\s/g, "");
        const numMatch = clean.match(/([\d\.]+)([kKmMbB]?)/);
        if (numMatch) {
          const val = parseFloat(numMatch[1]);
          const mult = numMatch[2]?.toUpperCase();
          if (mult === "K") liveSubs = Math.round(val * 1000);
          else if (mult === "M") liveSubs = Math.round(val * 1000000);
          else liveSubs = Math.round(val);
        }
      }

      let liveViews: number | undefined;
      const viewMatch = html.match(/"viewCount":"(\d+)"/);
      if (viewMatch) {
        liveViews = parseInt(viewMatch[1], 10);
      }

      return {
        lengthSeconds: durSec,
        durationFormatted: formatSeconds(durSec),
        isShort,
        format,
        liveViews,
        liveSubs,
      };
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        break;
      }
      const delay = 500 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // En cas d'échec : format inconnu plutôt que perdre la vidéo
  return {
    lengthSeconds: 0,
    durationFormatted: "Inconnu",
    isShort: false,
    format: "unknown",
  };
}

/**
 * Récupère les infos de durée depuis le cache persistant.
 * Si absent, scrape /watch avec concurrence limitée (3 max) et backoff exponentiel.
 */
export async function getVideoDuration(videoId: string): Promise<CachedVideoDuration> {
  const cache = loadCache();
  const existing = cache.get(videoId);
  if (existing && existing.format !== "unknown") {
    return existing;
  }

  if (inFlightPromises.has(videoId)) {
    return inFlightPromises.get(videoId)!;
  }

  const p = limiter.run(async () => {
    try {
      const details = await fetchWatchPageWithBackoff(videoId);
      const record: CachedVideoDuration = {
        videoId,
        lengthSeconds: details.lengthSeconds,
        durationSeconds: details.lengthSeconds,
        durationFormatted: details.durationFormatted,
        isShort: details.isShort,
        format: details.format,
        liveViews: details.liveViews,
        liveSubs: details.liveSubs,
        updatedAt: Date.now(),
      };
      cache.set(videoId, record);
      scheduleSave();
      return record;
    } finally {
      inFlightPromises.delete(videoId);
    }
  });

  inFlightPromises.set(videoId, p);
  return p;
}
