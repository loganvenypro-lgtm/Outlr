/**
 * High-performance YouTube scraper (RSS + InnerTube).
 * Polite by default: concurrency cap, jitter, backoff on 429/503, client rotation,
 * short TTL cache. Designed to find recent high-velocity videos without tripping
 * YouTube's unofficial-client rate limits.
 */

export interface ScrapedRssVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  thumbnail: string;
  viewCount: number;
  likeCount?: number;
  channelId: string;
  channelTitle: string;
}

export interface ScrapedInnerTubeChannel {
  id: string;
  title: string;
  customUrl?: string;
  description?: string;
  thumbnail: string;
  subscriberCount?: number;
  subscriberText?: string;
  videoCount?: number;
}

export interface ScrapedInnerTubeVideo {
  id: string;
  title: string;
  viewsText?: string;
  viewCount: number;
  publishedTimeText?: string;
  durationFormatted?: string;
  durationSeconds?: number;
  thumbnail: string;
  channelTitle?: string;
  channelId?: string;
}

export type InnerTubeSort = "relevance" | "rating" | "upload_date" | "view_count";
export type InnerTubeUploadDate = "hour" | "today" | "week" | "month" | "year";
export type InnerTubeDuration = "short" | "medium" | "long";

export interface InnerTubeSearchFilters {
  sort?: InnerTubeSort;
  uploadDate?: InnerTubeUploadDate;
  duration?: InnerTubeDuration;
}

interface InnerTubeClient {
  name: string;
  version: string;
  clientNameHeader: string;
  userAgent: string;
  apiKey: string;
  extraContext?: Record<string, unknown>;
}

/** Public InnerTube keys shipped in YouTube web/android clients (not user secrets).
 * Overridable via env to allow rotation without code change. */
const WEB_INNERTUBE_KEY =
  process.env.YOUTUBE_INNERTUBE_WEB_KEY || "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const ANDROID_INNERTUBE_KEY =
  process.env.YOUTUBE_INNERTUBE_ANDROID_KEY || "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_qRG52Q";

const INNERTUBE_CLIENTS: InnerTubeClient[] = [
  {
    name: "WEB",
    version: "2.20250319.01.00",
    clientNameHeader: "1",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    apiKey: WEB_INNERTUBE_KEY,
  },
  {
    name: "ANDROID",
    version: "19.50.37",
    clientNameHeader: "3",
    userAgent: "com.google.android.youtube/19.50.37 (Linux; U; Android 14; fr_FR) gzip",
    apiKey: ANDROID_INNERTUBE_KEY,
    extraContext: { androidSdkVersion: 34 },
  },
  {
    name: "WEB_EMBEDDED_PLAYER",
    version: "1.20250319.01.00",
    clientNameHeader: "56",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    apiKey: WEB_INNERTUBE_KEY,
  },
];

const SEARCH_CACHE_TTL_MS = 8 * 60 * 1000;
const searchCache = new Map<string, { expiry: number; videos: ScrapedInnerTubeVideo[]; channels?: ScrapedInnerTubeChannel[] }>();

class YoutubeRequestGate {
  private active = 0;
  private readonly maxConcurrent: number;
  private readonly minIntervalMs: number;
  private nextSlot = 0;
  private cooldownUntil = 0;
  private queue: Array<() => void> = [];

  constructor(maxConcurrent: number, minIntervalMs: number) {
    this.maxConcurrent = maxConcurrent;
    this.minIntervalMs = minIntervalMs;
  }

  noteRateLimit(waitMs: number) {
    this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + waitMs);
  }

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = async () => {
        this.active++;
        const now = Date.now();
        const wait = Math.max(0, this.nextSlot - now, this.cooldownUntil - now) + Math.floor(Math.random() * 160);
        this.nextSlot = Date.now() + wait + this.minIntervalMs;
        try {
          if (wait > 0) await sleep(wait);
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.active--;
          const next = this.queue.shift();
          if (next) next();
        }
      };

      if (this.active < this.maxConcurrent) {
        void run();
      } else {
        this.queue.push(() => {
          void run();
        });
      }
    });
  }
}

const innertubeGate = new YoutubeRequestGate(2, 650);
const rssGate = new YoutubeRequestGate(3, 250);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pruneSearchCache() {
  if (searchCache.size < 250) return;
  const now = Date.now();
  for (const [k, v] of searchCache.entries()) {
    if (now > v.expiry) searchCache.delete(k);
  }
}

/**
 * Protobuf search params used by InnerTube / youtube.com/results?sp=
 * sort: 1 rating, 2 upload date, 3 view count
 * uploadDate: 1 hour, 2 today, 3 week, 4 month, 5 year
 * type: 1 video
 * duration: 1 short, 2 long, 3 medium
 */
export function buildInnerTubeSearchParams(filters: InnerTubeSearchFilters = {}): string | undefined {
  const sortMap: Record<InnerTubeSort, number> = {
    relevance: 0,
    rating: 1,
    upload_date: 2,
    view_count: 3,
  };
  const dateMap: Record<InnerTubeUploadDate, number> = {
    hour: 1,
    today: 2,
    week: 3,
    month: 4,
    year: 5,
  };
  const durMap: Record<InnerTubeDuration, number> = {
    short: 1,
    long: 2,
    medium: 3,
  };

  const hasSort = filters.sort && filters.sort !== "relevance";
  const hasDate = !!filters.uploadDate;
  const hasDur = !!filters.duration;
  if (!hasSort && !hasDate && !hasDur) return undefined;

  const bytes: number[] = [];
  if (hasSort) {
    bytes.push(0x08, sortMap[filters.sort!]);
  }

  const filterBytes: number[] = [];
  if (hasDate) {
    filterBytes.push(0x08, dateMap[filters.uploadDate!]);
  }
  filterBytes.push(0x10, 0x01); // type = video
  if (hasDur) {
    filterBytes.push(0x18, durMap[filters.duration!]);
  }
  bytes.push(0x12, filterBytes.length, ...filterBytes);

  return bytesToBase64(bytes);
}

function bytesToBase64(bytes: number[]): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(Uint8Array.from(bytes)).toString("base64");
  }
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Decode legacy `sp` values such as CAI%253D / CAM%3D into InnerTube params. */
export function decodeLegacySpFilter(spFilter?: string): string | undefined {
  if (!spFilter) return undefined;
  let value = spFilter.trim();
  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  if (value === "CAI=" || value === "CAI") return buildInnerTubeSearchParams({ sort: "upload_date" });
  if (value === "CAM=" || value === "CAM") return buildInnerTubeSearchParams({ sort: "view_count" });
  if (value === "CAE=" || value === "CAE") return buildInnerTubeSearchParams({ sort: "rating" });
  return value;
}

function clientContext(client: InnerTubeClient) {
  return {
    client: {
      clientName: client.name,
      clientVersion: client.version,
      hl: "fr",
      gl: "FR",
      ...client.extraContext,
    },
  };
}

async function innertubePost(
  endpoint: "search" | "browse",
  body: Record<string, unknown>,
  client: InnerTubeClient,
  attempt = 0
): Promise<any> {
  const payload = await innertubeGate.schedule(async () => {
    const url = `https://www.youtube.com/youtubei/v1/${endpoint}?prettyPrint=false&key=${client.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": client.userAgent,
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com/",
        "X-YouTube-Client-Name": client.clientNameHeader,
        "X-YouTube-Client-Version": client.version,
      },
      body: JSON.stringify({
        context: clientContext(client),
        ...body,
      }),
    });

    if (res.status === 429 || res.status === 503 || res.status === 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(25000, 1800 * 2 ** attempt) + Math.floor(Math.random() * 400);
      innertubeGate.noteRateLimit(waitMs);
      return { __rateLimited: true, waitMs };
    }

    if (!res.ok) return null;
    return res.json();
  });

  if (payload?.__rateLimited) {
    if (attempt >= 3) return null;
    await sleep(payload.waitMs);
    const nextClient = INNERTUBE_CLIENTS[(INNERTUBE_CLIENTS.indexOf(client) + 1) % INNERTUBE_CLIENTS.length];
    return innertubePost(endpoint, body, attempt === 0 ? nextClient : client, attempt + 1);
  }

  return payload;
}

function textFromRuns(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.simpleText) return node.simpleText;
  if (node.content) return node.content;
  if (Array.isArray(node.runs)) return node.runs.map((r: any) => r.text || "").join("");
  return "";
}

function parseVideoRenderer(vr: any, fallbackChannelId?: string): ScrapedInnerTubeVideo | null {
  const id = vr?.videoId || vr?.navigationEndpoint?.watchEndpoint?.videoId;
  if (!id) return null;
  const viewsText =
    textFromRuns(vr.viewCountText) ||
    textFromRuns(vr.shortViewCountText) ||
    textFromRuns(vr.videoInfo) ||
    "";
  const thumb = vr.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || "";
  const durText = textFromRuns(vr.lengthText);
  return {
    id,
    title: textFromRuns(vr.title) || "",
    viewsText,
    viewCount: parseViewCountString(viewsText),
    publishedTimeText: textFromRuns(vr.publishedTimeText),
    durationFormatted: durText,
    durationSeconds: parseFormattedDurationToSeconds(durText),
    thumbnail: thumb.startsWith("//") ? `https:${thumb}` : thumb,
    channelTitle: textFromRuns(vr.ownerText) || textFromRuns(vr.shortBylineText),
    channelId:
      vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
      vr.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
      fallbackChannelId,
  };
}

function parseLockupViewModel(lockup: any): ScrapedInnerTubeVideo | null {
  const id = lockup?.contentId;
  if (!id || typeof id !== "string" || id.length !== 11) return null;

  const title =
    lockup.metadata?.lockupMetadataViewModel?.title?.content ||
    textFromRuns(lockup.metadata?.lockupMetadataViewModel?.title) ||
    "";

  const rows =
    lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
  let viewsText = "";
  let publishedTimeText = "";
  let channelTitle = "";
  let channelId: string | undefined;

  for (const row of rows) {
    for (const part of row.metadataParts || []) {
      const text = textFromRuns(part.text);
      const browseId = part.text?.commandRuns?.[0]?.onTap?.innertubeCommand?.browseEndpoint?.browseId;
      if (browseId?.startsWith("UC")) {
        channelId = browseId;
        channelTitle = channelTitle || text;
        continue;
      }
      if (/vue|view|watching|spectat/i.test(text)) viewsText = text;
      else if (/ago|il y a|hour|heure|day|jour|week|semaine|month|mois|year|an/i.test(text)) {
        publishedTimeText = text;
      } else if (text && !channelTitle) {
        channelTitle = text;
      }
    }
  }

  const sources =
    lockup.contentImage?.thumbnailViewModel?.image?.sources ||
    lockup.contentImage?.image?.sources ||
    [];
  const thumb = sources.slice(-1)[0]?.url || "";

  let durText = "";
  const overlays = lockup.contentImage?.thumbnailViewModel?.overlays || [];
  for (const overlay of overlays) {
    const badges =
      overlay.thumbnailOverlayBadgeViewModel?.thumbnailBadges ||
      overlay.thumbnailBottomOverlayViewModel?.badges ||
      [];
    for (const badge of badges) {
      const t =
        badge.thumbnailBadgeViewModel?.text ||
        badge.thumbnailOverlayTimeStatusRenderer?.text?.simpleText ||
        "";
      if (t && /[:\d]/.test(t)) durText = t;
    }
  }

  return {
    id,
    title,
    viewsText,
    viewCount: parseViewCountString(viewsText),
    publishedTimeText,
    durationFormatted: durText,
    durationSeconds: parseFormattedDurationToSeconds(durText),
    thumbnail: thumb.startsWith("//") ? `https:${thumb}` : thumb,
    channelTitle,
    channelId,
  };
}

function parseReelItemRenderer(reel: any): ScrapedInnerTubeVideo | null {
  const id = reel?.videoId || reel?.navigationEndpoint?.reelWatchEndpoint?.videoId;
  if (!id) return null;
  const headline = textFromRuns(reel.headline) || textFromRuns(reel.title);
  const viewsText = textFromRuns(reel.viewCountText);
  const thumb = reel.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || "";
  const channelTitle = textFromRuns(reel.channelTitleText) || 
                       textFromRuns(reel.ownerText) || 
                       textFromRuns(reel.shortBylineText);
  const channelId = reel.navigationEndpoint?.reelWatchEndpoint?.channelId || 
                    reel.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
                    reel.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;
  return {
    id,
    title: headline || "YouTube Short",
    viewsText,
    viewCount: parseViewCountString(viewsText),
    publishedTimeText: "Short",
    durationFormatted: "0:45",
    durationSeconds: 45,
    thumbnail: thumb.startsWith("//") ? `https:${thumb}` : thumb,
    channelTitle: channelTitle || undefined,
    channelId,
  };
}

function parseShortsLockupViewModel(vm: any): ScrapedInnerTubeVideo | null {
  const id = vm.entityId?.replace(/^shorts-lockup-/, "") || vm.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId;
  if (!id) return null;
  const title = textFromRuns(vm.overlayMetadata?.primaryText) || "Short";
  const viewsText = textFromRuns(vm.overlayMetadata?.secondaryText) || "";
  const thumb = vm.thumbnail?.sources?.slice(-1)?.[0]?.url || "";
  
  // Extract channel if available in onTap command or entity
  const channelId = vm.onTap?.innertubeCommand?.reelWatchEndpoint?.channelId;
  const channelTitle = textFromRuns(vm.onTap?.innertubeCommand?.reelWatchEndpoint?.channelTitleText);

  return {
    id,
    title,
    viewsText,
    viewCount: parseViewCountString(viewsText),
    publishedTimeText: "Short",
    durationFormatted: "0:30",
    durationSeconds: 30,
    thumbnail: thumb.startsWith("//") ? `https:${thumb}` : thumb,
    channelTitle: channelTitle || undefined,
    channelId,
  };
}

function collectSearchVideos(root: any): ScrapedInnerTubeVideo[] {
  const videos: ScrapedInnerTubeVideo[] = [];
  const seen = new Set<string>();

  const walk = (node: any, depth: number) => {
    if (!node || depth > 14) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (typeof node !== "object") return;

    const parsed =
      (node.videoRenderer && parseVideoRenderer(node.videoRenderer)) ||
      (node.gridVideoRenderer && parseVideoRenderer(node.gridVideoRenderer)) ||
      (node.compactVideoRenderer && parseVideoRenderer(node.compactVideoRenderer)) ||
      (node.reelItemRenderer && parseReelItemRenderer(node.reelItemRenderer)) ||
      (node.shortsLockupViewModel && parseShortsLockupViewModel(node.shortsLockupViewModel)) ||
      (node.lockupViewModel && parseLockupViewModel(node.lockupViewModel));

    if (parsed && parsed.id && !seen.has(parsed.id)) {
      seen.add(parsed.id);
      videos.push(parsed);
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === "object") walk(value, depth + 1);
    }
  };

  walk(root, 0);
  return videos;
}

function collectChannels(root: any): ScrapedInnerTubeChannel[] {
  const channels: ScrapedInnerTubeChannel[] = [];
  const seen = new Set<string>();

  const walk = (node: any, depth: number) => {
    if (!node || depth > 12) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (typeof node !== "object") return;

    if (node.channelRenderer) {
      const cr = node.channelRenderer;
      if (cr.channelId && !seen.has(cr.channelId)) {
        seen.add(cr.channelId);
        const subText =
          textFromRuns(cr.subscriberCountText) ||
          textFromRuns(cr.videoCountText) ||
          "";
        const thumb = cr.thumbnail?.thumbnails?.slice(-1)[0]?.url || "";
        channels.push({
          id: cr.channelId,
          title: textFromRuns(cr.title) || "Unknown",
          customUrl: cr.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl?.replace(/^\//, ""),
          description: textFromRuns(cr.descriptionSnippet),
          thumbnail: thumb.startsWith("//") ? `https:${thumb}` : thumb,
          subscriberCount: parseSubscriberString(subText),
          subscriberText: subText,
        });
      }
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === "object") walk(value, depth + 1);
    }
  };

  walk(root, 0);
  return channels;
}

function extractContinuationToken(root: any): string | null {
  let token: string | null = null;
  const walk = (node: any, depth: number) => {
    if (token || !node || depth > 12) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (typeof node !== "object") return;
    const found =
      node.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ||
      node.nextContinuationData?.continuation ||
      node.continuationCommand?.token;
    if (typeof found === "string" && found.length > 20) {
      token = found;
      return;
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === "object") walk(value, depth + 1);
    }
  };
  walk(root, 0);
  return token;
}

export async function scrapeChannelRss(channelId: string): Promise<ScrapedRssVideo[]> {
  try {
    const cleanId = channelId.trim();
    return await rssGate.schedule(async () => {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(cleanId)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": INNERTUBE_CLIENTS[0].userAgent,
          Accept: "application/xml,text/xml,*/*",
        },
        next: { revalidate: 180 },
      });

      if (!res.ok) return [];

      const xml = await res.text();
      const entries: ScrapedRssVideo[] = [];
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      let match;

      while ((match = entryRegex.exec(xml)) !== null) {
        const block = match[1];
        const videoId =
          block.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] ||
          block.match(/<id>yt:video:(.*?)<\/id>/)?.[1];
        const title = block.match(/<title>(.*?)<\/title>/)?.[1];
        const publishedAt = block.match(/<published>(.*?)<\/published>/)?.[1] || "";
        const updatedAt = block.match(/<updated>(.*?)<\/updated>/)?.[1] || "";
        const channelTitle = block.match(/<author>[\s\S]*?<name>(.*?)<\/name>/)?.[1] || "";
        const descMatch = block.match(/<media:description>([\s\S]*?)<\/media:description>/);
        const description = descMatch ? descMatch[1] : "";
        const thumbMatch = block.match(/<media:thumbnail[^>]+url="([^"]+)"/);
        const thumbnail = thumbMatch
          ? thumbMatch[1]
          : videoId
            ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            : "";
        const viewsMatch = block.match(/<media:statistics[^>]+views="(\d+)"/);
        const viewCount = viewsMatch ? parseInt(viewsMatch[1], 10) : 0;
        const starMatch = block.match(/<media:starRating[^>]+count="(\d+)"/);
        const likeCount = starMatch ? parseInt(starMatch[1], 10) : undefined;

        if (videoId && title) {
          entries.push({
            id: videoId.trim(),
            title: decodeXmlEntities(title.trim()),
            description: decodeXmlEntities(description),
            publishedAt,
            updatedAt,
            thumbnail,
            viewCount,
            likeCount,
            channelId: cleanId,
            channelTitle: decodeXmlEntities(channelTitle),
          });
        }
      }

      return entries;
    });
  } catch (err) {
    console.error("Error scraping channel RSS:", err);
    return [];
  }
}

export async function scrapeInnerTubeSearch(query: string): Promise<{
  channels: ScrapedInnerTubeChannel[];
  videos: ScrapedInnerTubeVideo[];
}> {
  const cacheKey = `search:${query.toLowerCase().trim()}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return { channels: cached.channels || [], videos: cached.videos };
  }

  try {
    const data = await innertubePost("search", { query }, INNERTUBE_CLIENTS[0]);
    if (!data) return { channels: [], videos: [] };
    const videos = collectSearchVideos(data);
    const channels = collectChannels(data);
    pruneSearchCache();
    searchCache.set(cacheKey, { expiry: Date.now() + SEARCH_CACHE_TTL_MS, videos, channels });
    return { channels, videos };
  } catch (err) {
    console.error("Error in scrapeInnerTubeSearch:", err);
    return { channels: [], videos: [] };
  }
}

/**
 * Paginated InnerTube search. Pages are sequential (same client) to keep
 * continuation tokens valid. Retries and client rotation only happen on page 0.
 */
export async function scrapeInnerTubeSearchPaginated(
  query: string,
  maxPages = 2,
  params?: string,
  filters?: InnerTubeSearchFilters
): Promise<ScrapedInnerTubeVideo[]> {
  const resolvedParams = params || (filters ? buildInnerTubeSearchParams(filters) : undefined);
  const safePages = Math.max(1, Math.min(maxPages, 3));
  const cacheKey = `paged:${query}|${resolvedParams || ""}|${safePages}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.videos;

  const allVideos: ScrapedInnerTubeVideo[] = [];
  const seenIds = new Set<string>();
  let continuationToken: string | null = null;
  let client = INNERTUBE_CLIENTS[Math.floor(Math.random() * INNERTUBE_CLIENTS.length)];

  for (let page = 0; page < safePages; page++) {
    if (page > 0) {
      if (!continuationToken) break;
      await sleep(400 + Math.floor(Math.random() * 250));
    }

    const body =
      page === 0
        ? { query, ...(resolvedParams ? { params: resolvedParams } : {}) }
        : { continuation: continuationToken };

    let data = await innertubePost("search", body, client);
    if (!data && page === 0) {
      client = INNERTUBE_CLIENTS[(INNERTUBE_CLIENTS.indexOf(client) + 1) % INNERTUBE_CLIENTS.length];
      data = await innertubePost("search", body, client);
    }
    if (!data) break;

    const pageVideos = collectSearchVideos(data);
    for (const video of pageVideos) {
      if (seenIds.has(video.id)) continue;
      seenIds.add(video.id);
      allVideos.push(video);
    }

    continuationToken = extractContinuationToken(data);
    if (pageVideos.length === 0 && page > 0) break;
  }

  pruneSearchCache();
  searchCache.set(cacheKey, { expiry: Date.now() + SEARCH_CACHE_TTL_MS, videos: allVideos });
  return allVideos;
}

/** Recent + high-view InnerTube searches used for viral discovery. */
export async function scrapeRecentViralVideos(
  query: string,
  options: {
    period?: string;
    duration?: "all" | "long" | "short";
    maxPages?: number;
  } = {}
): Promise<ScrapedInnerTubeVideo[]> {
  const duration: InnerTubeDuration | undefined =
    options.duration === "long" ? "long" : options.duration === "short" ? "short" : undefined;
  const maxPages = options.maxPages ?? 2;
  const period = options.period || "7d";

  const uploadDates: InnerTubeUploadDate[] = [];
  if (period === "24h" || period === "today") uploadDates.push("today", "hour");
  else if (period === "7d") uploadDates.push("week", "today");
  else if (period === "30d" || period === "21d") uploadDates.push("month", "week");
  else if (period === "90d" || period === "1y") uploadDates.push("year", "month");
  else uploadDates.push("week", "month");

  const seen = new Set<string>();
  const merged: ScrapedInnerTubeVideo[] = [];

  for (const uploadDate of uploadDates.slice(0, 2)) {
    const batch = await scrapeInnerTubeSearchPaginated(query, maxPages, undefined, {
      sort: "view_count",
      uploadDate,
      duration,
    });
    for (const video of batch) {
      if (seen.has(video.id)) continue;
      seen.add(video.id);
      merged.push(video);
    }
  }

  return merged;
}

export function parseSubscriberString(text: string): number | undefined {
  if (!text) return undefined;
  const clean = text.replace(/,/g, ".").replace(/\s/g, "");
  const match = clean.match(/([\d.]+)([kKmMbB]?)/);
  if (!match) return undefined;
  const num = parseFloat(match[1]);
  const mult = match[2]?.toUpperCase();
  if (mult === "K") return Math.round(num * 1000);
  if (mult === "M") return Math.round(num * 1000000);
  if (mult === "B") return Math.round(num * 1000000000);
  return Math.round(num);
}

export function parseViewCountString(text: string): number {
  if (!text) return 0;
  const digitsOnly = text.replace(/[^\d]/g, "");
  if (digitsOnly && digitsOnly.length > 5) {
    return parseInt(digitsOnly, 10);
  }
  return parseSubscriberString(text) || 0;
}

function parseFormattedDurationToSeconds(dur: string): number {
  if (!dur) return 0;
  const parts = dur.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export async function scrapeChannelAllVideosInnerTube(
  channelId: string,
  maxLimit: number = 1000
): Promise<ScrapedInnerTubeVideo[]> {
  try {
    const cleanId = channelId.trim();
    const allVideos: ScrapedInnerTubeVideo[] = [];
    const seenIds = new Set<string>();
    const client = INNERTUBE_CLIENTS[0];
    const capped = Math.min(Math.max(maxLimit, 1), 400);
    const maxPages = Math.min(Math.ceil(capped / 30), 12);

    let continuationToken: string | null = null;

    for (let page = 0; page < maxPages && allVideos.length < capped; page++) {
      if (page > 0) await sleep(450 + Math.floor(Math.random() * 250));

      const body = continuationToken
        ? { continuation: continuationToken }
        : { browseId: cleanId, params: "EgZ2aWRlb3PyBgQKAjoA" };

      const data = await innertubePost("browse", body, client);
      if (!data) break;

      const items = collectSearchVideos(data);
      continuationToken = extractContinuationToken(data);
      if (items.length === 0) break;

      for (const video of items) {
        if (seenIds.has(video.id)) continue;
        seenIds.add(video.id);
        allVideos.push({ ...video, channelId: video.channelId || cleanId });
      }

      if (!continuationToken) break;
    }

    return allVideos.slice(0, capped);
  } catch (err) {
    console.error("Error in scrapeChannelAllVideosInnerTube:", err);
    return [];
  }
}
