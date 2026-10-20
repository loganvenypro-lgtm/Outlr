import { SearchDepth, SearchJobProgress, DiscoveredVideoRecord, DiscoveryJobResult } from "@/types/discoveryEngine";
import { parseISO8601Duration } from "./utils";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { upsertUnifiedChannel, upsertUnifiedVideo, QuotaManager } from "./intelligenceDb";
import type { InnerTubeSearchFilters, InnerTubeUploadDate } from "./youtube-scraper";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY manquante");
  return key.trim();
}

/**
 * Storage for asynchronous discovery jobs and results
 * Fully compatible with Vercel Serverless (In-Memory global store + /tmp directory fallback)
 */
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL
  ? path.join("/tmp", "data")
  : path.join(process.cwd(), "data");

const JOBS_FILE = path.join(DATA_DIR, "discovery_jobs.json");
const CACHE_FILE = path.join(DATA_DIR, "discovered_videos_cache.json");

// In-Memory cache map to guarantee instant, cross-tick persistence on Serverless containers
const globalJobsStore = (global as any).__DISCOVERY_JOBS__ || new Map<string, SearchJobProgress>();
const globalVideosStore = (global as any).__DISCOVERY_VIDEOS__ || new Map<string, DiscoveredVideoRecord[]>();
(global as any).__DISCOVERY_JOBS__ = globalJobsStore;
(global as any).__DISCOVERY_VIDEOS__ = globalVideosStore;

function ensureFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(JOBS_FILE)) fs.writeFileSync(JOBS_FILE, "{}", "utf-8");
    if (!fs.existsSync(CACHE_FILE)) fs.writeFileSync(CACHE_FILE, "{}", "utf-8");
  } catch (e) {
    // Non-blocking in serverless if disk write is restricted
  }
}

function readJobsMap(): Record<string, SearchJobProgress> {
  const map: Record<string, SearchJobProgress> = {};
  for (const [k, v] of globalJobsStore.entries()) {
    map[k] = v;
  }
  ensureFiles();
  try {
    if (fs.existsSync(JOBS_FILE)) {
      const diskJobs = JSON.parse(fs.readFileSync(JOBS_FILE, "utf-8"));
      Object.assign(map, diskJobs);
    }
  } catch {}
  return map;
}

function writeJobsMap(map: Record<string, SearchJobProgress>) {
  for (const [k, v] of Object.entries(map)) {
    globalJobsStore.set(k, v);
  }
  ensureFiles();
  try {
    fs.writeFileSync(JOBS_FILE, JSON.stringify(map, null, 2), "utf-8");
  } catch (e) {
    // Fail-safe for read-only fs
  }
}

function readVideosCache(): Record<string, DiscoveredVideoRecord[]> {
  const map: Record<string, DiscoveredVideoRecord[]> = {};
  for (const [k, v] of globalVideosStore.entries()) {
    map[k] = v;
  }
  ensureFiles();
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const diskVideos = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
      Object.assign(map, diskVideos);
    }
  } catch {}
  return map;
}

function writeVideosCache(cache: Record<string, DiscoveredVideoRecord[]>) {
  for (const [k, v] of Object.entries(cache)) {
    globalVideosStore.set(k, v);
  }
  ensureFiles();
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
  } catch (e) {
    // Fail-safe for read-only fs
  }
}

/**
 * Save / Update Job state
 */
export function saveJobProgress(job: SearchJobProgress) {
  const updatedJob = { ...job, updatedAt: new Date().toISOString() };
  globalJobsStore.set(job.jobId, updatedJob);
  const jobs = readJobsMap();
  jobs[job.jobId] = updatedJob;
  writeJobsMap(jobs);
}

export function getJobProgress(jobId: string): SearchJobProgress | null {
  if (globalJobsStore.has(jobId)) {
    return globalJobsStore.get(jobId)!;
  }
  const jobs = readJobsMap();
  return jobs[jobId] || null;
}

export function saveJobResults(jobId: string, videos: DiscoveredVideoRecord[]) {
  globalVideosStore.set(jobId, videos);
  const cache = readVideosCache();
  cache[jobId] = videos;
  writeVideosCache(cache);
}

export function getJobResults(jobId: string): DiscoveredVideoRecord[] {
  if (globalVideosStore.has(jobId)) {
    return globalVideosStore.get(jobId)!;
  }
  const cache = readVideosCache();
  return cache[jobId] || [];
}

async function mapLimit<T, R>(items: T[], limit: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Live discovery of YouTube video IDs via InnerTube (no search.list quota).
 * HTML scraping is a last-resort fallback only when InnerTube returns almost nothing,
 * to avoid doubling request volume and tripping bot rate limits.
 */
export async function scrapeRealYouTubeVideoIds(
  query: string,
  maxResults = 40,
  spFilter?: string | InnerTubeSearchFilters
): Promise<string[]> {
  const ids = new Set<string>();
  const innerTubePages = maxResults <= 24 ? 1 : 2;

  try {
    const { scrapeInnerTubeSearchPaginated, decodeLegacySpFilter } = await import("./youtube-scraper");
    const isFilters = spFilter && typeof spFilter === "object";
    const innerTubeVideos = await scrapeInnerTubeSearchPaginated(
      query,
      innerTubePages,
      isFilters ? undefined : decodeLegacySpFilter(spFilter),
      isFilters ? spFilter : undefined
    );
    for (const v of innerTubeVideos) {
      if (v.id) ids.add(v.id);
    }
  } catch {
    // HTML fallback below
  }

  if (ids.size >= 8) {
    return Array.from(ids).slice(0, maxResults);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}&sp=EgIQAQ%3D%3D`;
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
        Referer: "https://www.youtube.com/",
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return Array.from(ids).slice(0, maxResults);

    const html = await res.text();
    const match =
      html.match(/var ytInitialData = ({[\s\S]*?});<\/script>/) ||
      html.match(/ytInitialData\s*=\s*({[\s\S]+?});/);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        const contents =
          data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        for (const c of contents) {
          const itemSection = c.itemSectionRenderer?.contents || [];
          for (const item of itemSection) {
            const vid = item.videoRenderer?.videoId || item.lockupViewModel?.contentId;
            if (vid) ids.add(vid);
          }
        }
      } catch {}
    }
  } catch {
    // Non-blocking
  }

  return Array.from(ids).slice(0, maxResults);
}

/**
 * Stop words for tokenization
 */
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "with", "from",
  "of", "by", "is", "are", "was", "were", "this", "that", "how", "what", "why",
  "dans", "avec", "pour", "cette", "sur", "les", "des", "une", "est", "sont"
]);

/**
 * Tokenize string into meaningful keywords
 */
export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u00FF]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * 2. Multi-query Expansion Engine
 * Generates semantic variants, subtopics, long-tail phrases, and niche extensions
 */
export function expandSearchQueries(baseQuery: string, maxVariants = 12): string[] {
  const q = baseQuery.trim();
  const tokens = tokenizeQuery(q);
  const variants = new Set<string>();

  // 1. Exact query
  variants.add(q);

  // 2. High-intent video format modifiers
  const formatSuffixes = [
    "explained",
    "documentary",
    "investigation",
    "deep dive",
    "case study",
    "iceberg",
    "challenge",
    "experiments",
    "evolution",
    "tutorial",
    "video essay",
    "breakdown",
    "analysis",
  ];

  // 3. Domain-specific angle generators
  const lowerQ = q.toLowerCase();

  if (lowerQ.includes("crime") || lowerQ.includes("investigation") || lowerQ.includes("police") || lowerQ.includes("murder") || lowerQ.includes("case")) {
    variants.add(`${q} documentary`);
    variants.add(`${q} solved`);
    variants.add(`${q} interrogation`);
    variants.add(`${q} timeline`);
    variants.add(`unsolved ${q}`);
    variants.add(`${q} deep dive`);
  } else if (
    lowerQ.includes("disturbing") ||
    lowerQ.includes("rabbit hole") ||
    lowerQ.includes("creepypasta") ||
    lowerQ.includes("dark web") ||
    lowerQ.includes("lost media")
  ) {
    variants.add(`${q} iceberg`);
    variants.add(`${q} documentary`);
    variants.add(`${q} explained`);
    variants.add(`unexplained ${tokens.join(" ")}`);
    variants.add(`${q} deep dive`);
  } else if (lowerQ.includes("horror") || lowerQ.includes("scary")) {
    variants.add(`${q} stories`);
    variants.add(`${q} iceberg`);
    variants.add(`${q} movie`);
    variants.add(`${q} documentary`);
  } else if (lowerQ.includes("ai") || lowerQ.includes("automation") || lowerQ.includes("tools") || lowerQ.includes("tech") || lowerQ.includes("software")) {
    variants.add(`${q} workflow`);
    variants.add(`${q} tutorial for beginners`);
    variants.add(`best ${q} in 2026`);
    variants.add(`how to automate with ${q}`);
    variants.add(`${tokens.join(" ")} comparison`);
  } else if (lowerQ.includes("minecraft") || lowerQ.includes("gaming") || lowerQ.includes("challenge") || lowerQ.includes("roblox")) {
    variants.add(`${q} 100 days`);
    variants.add(`${q} hardcore`);
    variants.add(`impossible ${q}`);
    variants.add(`${q} world record`);
  } else if (lowerQ.includes("finance") || lowerQ.includes("money") || lowerQ.includes("invest") || lowerQ.includes("business")) {
    variants.add(`${q} passive income`);
    variants.add(`${q} portfolio strategy`);
    variants.add(`how I made money with ${q}`);
    variants.add(`${q} breakdown`);
  } else if (lowerQ.includes("documentary") || lowerQ.includes("video essay") || lowerQ.includes("essay")) {
    // Documentary / video essay specific expansions
    variants.add(`best ${q}`);
    variants.add(`${q} 2026`);
    variants.add(`${q} analysis`);
    variants.add(`long form ${q}`);
    variants.add(`${q} full`);
    variants.add(`${q} breakdown`);
    // Also try the core subject without "documentary" or "video essay"
    const coreSubject = q.replace(/\b(documentary|video essay|essay|youtube)\b/gi, "").trim();
    if (coreSubject.length >= 3 && coreSubject.toLowerCase() !== q.toLowerCase()) {
      variants.add(`${coreSubject} documentary`);
      variants.add(`${coreSubject} explained`);
      variants.add(`${coreSubject} deep dive`);
    }
  } else if (lowerQ.includes("dropshipping") || lowerQ.includes("ecommerce") || lowerQ.includes("shopify")) {
    variants.add(`${q} for beginners`);
    variants.add(`${q} in 2026`);
    variants.add(`i tried ${q}`);
    variants.add(`${q} from scratch`);
    variants.add(`${q} course`);
    variants.add(`${q} results`);
  } else {
    // General high-yield suffixes preserving query subject integrity
    variants.add(`${q} explained`);
    variants.add(`${q} documentary`);
    variants.add(`${q} deep dive`);
    variants.add(`${q} case study`);
    variants.add(`${q} breakdown`);
    variants.add(`best ${q} 2026`);
  }

  // 4. Word-reordered variant
  if (tokens.length >= 2) {
    variants.add([...tokens].reverse().join(" "));
  }

  // 5. Quoted exact-match variant for better precision
  if (tokens.length >= 2 && !q.startsWith('"')) {
    variants.add(`"${q}"`);
  }

  return Array.from(variants).slice(0, maxVariants);
}

/**
 * Compute Relevance Score (0 to 100) based on title, description, and query tokens
 */
export function calculateVideoRelevance(query: string, title: string, description: string): number {
  const qTokens = tokenizeQuery(query);
  if (qTokens.length === 0) return 60;

  const titleTokens = new Set(tokenizeQuery(title));
  const descTokens = new Set(tokenizeQuery(description));

  let matchedTitleCount = 0;
  let matchedDescCount = 0;

  for (const token of qTokens) {
    if (titleTokens.has(token)) matchedTitleCount++;
    else if (descTokens.has(token)) matchedDescCount++;
  }

  // Check full query phrase in title
  const exactPhraseMatch = title.toLowerCase().includes(query.toLowerCase());

  let score = 0;
  if (exactPhraseMatch) {
    score = 90 + Math.round((matchedTitleCount / qTokens.length) * 10);
  } else {
    const titleMatchRatio = matchedTitleCount / qTokens.length;
    const descMatchRatio = matchedDescCount / qTokens.length;
    score = Math.round(titleMatchRatio * 75 + descMatchRatio * 20);
  }

  return Math.min(100, Math.max(15, score));
}

/**
 * 3 & 4. Comprehensive Adaptive Discovery Pipeline
 */
export async function runDeepDiscoveryPipeline(
  jobId: string,
  query: string,
  depth: SearchDepth = "deep",
  options: {
    period?: string;
    duration?: "all" | "long" | "short";
    minViews?: number;
    channelSize?: string;
  } = {}
): Promise<DiscoveryJobResult> {
  const apiKey = getApiKey();

  // Determine target video count and API call budgets
  let targetCount = 300;
  let maxQueries = 6;
  let maxPagesPerQuery = 3;

  if (depth === "quick") {
    targetCount = 200;
    maxQueries = 5;
    maxPagesPerQuery = 2;
  } else if (depth === "deep") {
    targetCount = 400;
    maxQueries = 7;
    maxPagesPerQuery = 3;
  } else if (depth === "extended") {
    targetCount = 600;
    maxQueries = 9;
    maxPagesPerQuery = 4;
  } else if (depth === "max") {
    targetCount = 1000;
    maxQueries = 12;
    maxPagesPerQuery = 5;
  }

  // 1. Initialize Job State
  const job: SearchJobProgress = {
    jobId,
    query,
    depth,
    status: "running",
    step: "generating_queries",
    message: "Génération des variantes sémantiques et angles de recherche...",
    targetVideoCount: targetCount,
    queriesGenerated: [],
    queriesExecutedCount: 0,
    rawDiscoveredCount: 0,
    uniqueVideosCount: 0,
    enrichedVideosCount: 0,
    reliableOutliersCount: 0,
    quotaUnitsUsed: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveJobProgress(job);

  // 2. Expand Queries
  const expandedQueries = expandSearchQueries(query, maxQueries);
  job.queriesGenerated = expandedQueries;
  job.step = "exploring_youtube";
  job.message = `Exploration de ${expandedQueries.length} requêtes complémentaires...`;
  saveJobProgress(job);

  // Time / Period parameter
  let publishedAfter: string | undefined = undefined;
  const now = new Date();
  if (options.period === "24h") {
    publishedAfter = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  } else if (options.period === "7d") {
    publishedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (options.period === "30d") {
    publishedAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (options.period === "90d") {
    publishedAfter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  } else if (options.period === "1y") {
    publishedAfter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Raw Discovery Map: VideoId -> initial snippet & foundViaQuery
  const rawVideoMap = new Map<string, { id: string; snippet: any; foundVia: string }>();

  // 3. Polite multi-angle discovery: recent + high-velocity first, limited concurrency.
  job.message = `Recherche des vidéos récentes les plus virales pour "${query}"...`;
  saveJobProgress(job);

  const maxSemanticAngles = depth === "quick" ? 1 : depth === "deep" ? 2 : 3;
  const semanticVariants = expandedQueries
    .filter((q) => q.toLowerCase() !== query.toLowerCase())
    .slice(0, maxSemanticAngles);

  const queryTokens = query.trim().split(/\s+/);
  const subQueryFragments: string[] = [];
  if (queryTokens.length >= 3) {
    subQueryFragments.push(queryTokens.slice(1).join(" "));
    subQueryFragments.push(queryTokens.slice(0, -1).join(" "));
  }
  const existingLower = new Set([query.toLowerCase(), ...semanticVariants.map((s) => s.toLowerCase())]);
  const uniqueFragments = subQueryFragments
    .filter((f) => f.length >= 5 && !existingLower.has(f.toLowerCase()))
    .slice(0, depth === "quick" ? 1 : 2);

  const perQueryLimit = depth === "quick" ? 32 : 40;
  const durationFilter: InnerTubeSearchFilters["duration"] =
    options.duration === "long" ? "long" : options.duration === "short" ? "short" : undefined;

  const periodToUploadDate = (period?: string): InnerTubeUploadDate => {
    if (period === "24h" || period === "today") return "today";
    if (period === "7d") return "week";
    if (period === "30d" || period === "21d") return "month";
    if (period === "90d" || period === "1y") return "year";
    return "week";
  };

  const primaryUpload = periodToUploadDate(options.period);
  const secondaryUpload: InnerTubeUploadDate =
    primaryUpload === "today" ? "hour" : primaryUpload === "week" ? "month" : primaryUpload === "month" ? "week" : "month";

  type DiscoveryAngle = { label: string; q: string; filters?: InnerTubeSearchFilters };
  const discoveryAngles: DiscoveryAngle[] = [
    {
      label: `${query} (Viral récent)`,
      q: query,
      filters: { sort: "view_count", uploadDate: primaryUpload, duration: durationFilter },
    },
    {
      label: `${query} (Dernières sorties)`,
      q: query,
      filters: { sort: "upload_date", uploadDate: primaryUpload, duration: durationFilter },
    },
    {
      label: `${query} (Viral ${secondaryUpload})`,
      q: query,
      filters: { sort: "view_count", uploadDate: secondaryUpload, duration: durationFilter },
    },
  ];

  for (const qVariant of semanticVariants) {
    discoveryAngles.push({
      label: qVariant,
      q: qVariant,
      filters: { sort: "view_count", uploadDate: primaryUpload, duration: durationFilter },
    });
  }
  for (const fragment of uniqueFragments) {
    discoveryAngles.push({
      label: `Fragment: ${fragment}`,
      q: fragment,
      filters: { sort: "view_count", uploadDate: primaryUpload, duration: durationFilter },
    });
  }

  const discoveredBatches = await mapLimit(discoveryAngles, 2, async (angle) => {
    const scrapedIds = await scrapeRealYouTubeVideoIds(angle.q, perQueryLimit, angle.filters);
    return { qVariant: angle.label, scrapedIds };
  });

  for (const { qVariant, scrapedIds } of discoveredBatches) {
    for (const vid of scrapedIds) {
      if (!rawVideoMap.has(vid)) {
        rawVideoMap.set(vid, {
          id: vid,
          snippet: null, // Will be enriched accurately via batch videos.list
          foundVia: qVariant,
        });
      }
      job.rawDiscoveredCount++;
    }
  }

  job.queriesExecutedCount = discoveryAngles.length;
  job.uniqueVideosCount = rawVideoMap.size;
  saveJobProgress(job);

  // 4. Batch Enrichment via videos.list in parallel (groups of 50 IDs per call)
  job.step = "enriching_stats";
  job.message = `Enrichissement des métadonnées et statistiques de ${rawVideoMap.size} vidéos...`;
  saveJobProgress(job);

  const allVideoIds = Array.from(rawVideoMap.keys());
  const enrichedVideosMap = new Map<string, any>();
  const channelIdsSet = new Set<string>();

  const batchSize = 50;
  const videoChunks: string[][] = [];
  for (let i = 0; i < allVideoIds.length; i += batchSize) {
    videoChunks.push(allVideoIds.slice(i, i + batchSize));
  }

  // Fetch all video chunks in parallel
  await Promise.all(
    videoChunks.map(async (chunk) => {
      try {
        const vRes = await fetch(
          `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${chunk.join(",")}&key=${apiKey}`
        );
        const vData = await vRes.json();
        job.quotaUnitsUsed += 1;

        for (const v of vData.items || []) {
          enrichedVideosMap.set(v.id, v);
          if (v.snippet?.channelId) channelIdsSet.add(v.snippet.channelId);
        }
      } catch (e) {
        console.error("Batch videos fetch error:", e);
      }
    })
  );

  job.enrichedVideosCount = enrichedVideosMap.size;
  saveJobProgress(job);

  // 5. Batch Enrichment of Channels via channels.list in parallel (groups of 50)
  const allChannelIds = Array.from(channelIdsSet);
  const channelMetaMap = new Map<string, any>();
  const channelChunks: string[][] = [];
  for (let i = 0; i < allChannelIds.length; i += batchSize) {
    channelChunks.push(allChannelIds.slice(i, i + batchSize));
  }

  const channelsToPersist: any[] = [];

  await Promise.all(
    channelChunks.map(async (chunk) => {
      try {
        const cRes = await fetch(
          `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${chunk.join(",")}&key=${apiKey}`
        );
        const cData = await cRes.json();
        job.quotaUnitsUsed += 1;

        for (const c of cData.items || []) {
          const subs = c.statistics?.hiddenSubscriberCount ? -1 : parseInt(c.statistics?.subscriberCount || "0", 10);
          const chanObj = {
            id: c.id,
            title: c.snippet?.title || "Chaîne",
            avatar: c.snippet?.thumbnails?.medium?.url || c.snippet?.thumbnails?.default?.url || "",
            subscribers: subs,
            totalViews: parseInt(c.statistics?.viewCount || "0", 10),
            videoCount: parseInt(c.statistics?.videoCount || "1", 10),
          };
          channelMetaMap.set(c.id, chanObj);

          channelsToPersist.push({
            id: c.id,
            name: chanObj.title,
            thumbnailUrl: chanObj.avatar,
            avatarUrl: chanObj.avatar,
            subscriberCount: chanObj.subscribers,
            totalViews: chanObj.totalViews,
            videoCount: chanObj.videoCount,
            discoverySource: "user_search",
          });
        }
      } catch (e) {
        console.error("Batch channels fetch error:", e);
      }
    })
  );

  // 6. Analysis: Calculate Relevance Scores, Baseline Views, and Outlier Multipliers
  job.step = "calculating_outliers";
  job.message = "Calcul des ratios d'outliers et scores de pertinence...";
  saveJobProgress(job);

  const finalRecords: DiscoveredVideoRecord[] = [];
  const videosToPersist: any[] = [];
  let reliableOutliers = 0;

  for (const [vid, raw] of rawVideoMap.entries()) {
    const vMeta = enrichedVideosMap.get(vid);
    if (!vMeta) continue; // Video may have been deleted/private

    const channelId = vMeta.snippet?.channelId;
    const channel = channelMetaMap.get(channelId) || {
      id: channelId,
      title: vMeta.snippet?.channelTitle || "Chaîne",
      avatar: "",
      subscribers: 5000,
      totalViews: 50000,
      videoCount: 10,
    };

    const views = parseInt(vMeta.statistics?.viewCount || "0", 10);
    const likes = vMeta.statistics?.likeCount ? parseInt(vMeta.statistics.likeCount, 10) : undefined;
    const comments = vMeta.statistics?.commentCount ? parseInt(vMeta.statistics.commentCount, 10) : undefined;

    const dur = parseISO8601Duration(vMeta.contentDetails?.duration);
    const durationSeconds = dur.seconds;
    const isShort = durationSeconds > 0 && durationSeconds <= 60;

    const pubDate = new Date(vMeta.snippet?.publishedAt || Date.now());
    const daysSincePub = Math.max((now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24), 0.5);
    const viewsPerDay = Math.round(views / daysSincePub);

    // Channel baseline estimation
    const fallbackBaseline = channel.videoCount > 0
      ? Math.round(channel.totalViews / channel.videoCount)
      : (channel.subscribers > 0 ? Math.round(channel.subscribers * 0.4) : 1000);
    const baselineViews = Math.max(fallbackBaseline, 100);

    const rawMultiplier = baselineViews > 0 ? views / baselineViews : 1;
    const outlierMultiplier = parseFloat(rawMultiplier.toFixed(1));

    let outlierClassification: DiscoveredVideoRecord["outlierClassification"] = "normal";
    if (outlierMultiplier < 1.0) outlierClassification = "under";
    else if (outlierMultiplier >= 1.0 && outlierMultiplier < 2.0) outlierClassification = "normal";
    else if (outlierMultiplier >= 2.0 && outlierMultiplier < 5.0) outlierClassification = "breakout";
    else if (outlierMultiplier >= 5.0 && outlierMultiplier < 10.0) outlierClassification = "high_outlier";
    else outlierClassification = "extreme_outlier";

    const outlierReliability: DiscoveredVideoRecord["outlierReliability"] =
      channel.videoCount >= 5 && channel.totalViews > 0 ? "verified" : "estimated";

    if (outlierReliability === "verified" && outlierMultiplier >= 2.0) {
      reliableOutliers++;
    }

    const relevanceScore = calculateVideoRelevance(
      query,
      vMeta.snippet?.title || "",
      vMeta.snippet?.description || ""
    );

    // Calculate Engagement Rate ((Likes + Comments) / Views * 100)
    let engagementRate: number | undefined = undefined;
    if (views > 0 && (likes !== undefined || comments !== undefined)) {
      const totalEngagements = (likes || 0) + (comments || 0);
      engagementRate = parseFloat(((totalEngagements / views) * 100).toFixed(2));
    }

    // Calculate Viral Ratio (Views / Subscribers)
    const viralRatio = channel.subscribers > 0 
      ? parseFloat((views / channel.subscribers).toFixed(1))
      : parseFloat((views / 1000).toFixed(1));

    const record: DiscoveredVideoRecord = {
      id: vid,
      title: vMeta.snippet?.title || "Sans titre",
      description: vMeta.snippet?.description || "",
      thumbnail: vMeta.snippet?.thumbnails?.maxres?.url || vMeta.snippet?.thumbnails?.high?.url || vMeta.snippet?.thumbnails?.medium?.url || "",
      publishedAt: vMeta.snippet?.publishedAt || "",
      channelId,
      channelTitle: channel.title,
      channelAvatar: channel.avatar,
      channelSubscribers: channel.subscribers,
      channelTotalViews: channel.totalViews,
      channelVideoCount: channel.videoCount,
      viewCount: views,
      likeCount: likes,
      commentCount: comments,
      durationFormatted: dur.formatted,
      durationSeconds,
      isShort,
      viewsPerDay,
      engagementRate,
      viralRatio,
      relevanceScore,
      outlierMultiplier,
      baselineViews,
      outlierReliability,
      outlierClassification,
      foundViaQuery: raw.foundVia,
      discoveredAt: new Date().toISOString(),
    };

    finalRecords.push(record);

    // Progressive real-time streaming: save results progressively so the UI displays videos 1 by 1
    if (finalRecords.length === 1 || finalRecords.length % 3 === 0 || finalRecords.length === rawVideoMap.size) {
      saveJobResults(jobId, [...finalRecords]);
      job.enrichedVideosCount = finalRecords.length;
      job.reliableOutliersCount = reliableOutliers;
      saveJobProgress(job);
    }

    videosToPersist.push({
      id: vid,
      channelId,
      title: record.title,
      description: record.description,
      publishedAt: record.publishedAt,
      durationFormatted: record.durationFormatted,
      durationSeconds: record.durationSeconds,
      thumbnailUrl: record.thumbnail,
      viewCount: record.viewCount,
      likeCount: record.likeCount,
      commentCount: record.commentCount,
      isShort: record.isShort,
      viewsPerDay: record.viewsPerDay,
      baselineViews: record.baselineViews,
      outlierMultiplier: record.outlierMultiplier,
      outlierClassification: record.outlierClassification,
      outlierReliability: record.outlierReliability,
      discoveryKeywords: [query, raw.foundVia],
    });
  }

  // Non-blocking bulk persistence to unified continuous intelligence DB
  try {
    const { bulkUpsertUnifiedData } = await import("./intelligenceDb");
    bulkUpsertUnifiedData(channelsToPersist, videosToPersist);
  } catch (err) {
    // Non-blocking
  }

  // 7. Rank recent high-velocity videos first (views/day + recency + outlier)
  const recencyWeight = (days: number) => {
    if (days <= 1) return 1.9;
    if (days <= 3) return 1.6;
    if (days <= 7) return 1.35;
    if (days <= 30) return 1.12;
    return 0.85;
  };
  const blendedScore = (r: DiscoveredVideoRecord) => {
    const pub = r.publishedAt ? new Date(r.publishedAt).getTime() : now.getTime();
    const days = Math.max((now.getTime() - pub) / (1000 * 60 * 60 * 24), 0.4);
    const vpdScore = Math.min((r.viewsPerDay || 0) / 8000, 100);
    const outlierScore = Math.min(r.outlierMultiplier * 8, 100);
    const viralScore = Math.min((r.viralRatio || 0) * 12, 100);
    return (
      (r.relevanceScore * 0.28 + vpdScore * 0.32 + outlierScore * 0.2 + viralScore * 0.2) *
      recencyWeight(days)
    );
  };
  finalRecords.sort((a, b) => blendedScore(b) - blendedScore(a));

  // 8. Aggregates
  const totalViewsSum = finalRecords.reduce((acc, r) => acc + r.viewCount, 0);
  const avgViews = finalRecords.length > 0 ? Math.round(totalViewsSum / finalRecords.length) : 0;
  
  const sortedViews = [...finalRecords].map((r) => r.viewCount).sort((a, b) => a - b);
  const medianViews = sortedViews.length > 0 ? sortedViews[Math.floor(sortedViews.length / 2)] : 0;

  const outlierSum = finalRecords.reduce((acc, r) => acc + r.outlierMultiplier, 0);
  const avgOutlier = finalRecords.length > 0 ? parseFloat((outlierSum / finalRecords.length).toFixed(1)) : 0;

  const smallCount = finalRecords.filter((r) => r.channelSubscribers > 0 && r.channelSubscribers <= 100000).length;
  const smallChannelsRatio = finalRecords.length > 0 ? Math.round((smallCount / finalRecords.length) * 100) : 0;

  // Keyword extraction for top keywords
  const wordFreq = new Map<string, number>();
  finalRecords.forEach((r) => {
    tokenizeQuery(r.title).forEach((w) => wordFreq.set(w, (wordFreq.get(w) || 0) + 1));
  });
  const topKeywords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);

  // 9. Multi-Channel Validated Breakout Detection (>= 3 distinct channels with outlier >= 2.0x)
  const topicChannelMap = new Map<string, { channels: Set<string>; videos: DiscoveredVideoRecord[]; multipliers: number[] }>();

  // Extract recurring 2-word bigrams and salient keywords from outlier titles
  for (const rec of finalRecords) {
    if (rec.outlierMultiplier >= 2.0 || (rec.viralRatio && rec.viralRatio >= 2.5)) {
      const words = tokenizeQuery(rec.title);
      // Analyze significant single words & 2-word combinations
      const candidates: string[] = [];
      for (let i = 0; i < words.length; i++) {
        if (words[i].length >= 4) candidates.push(words[i]);
        if (i < words.length - 1 && words[i].length >= 3 && words[i + 1].length >= 3) {
          candidates.push(`${words[i]} ${words[i + 1]}`);
        }
      }

      for (const cand of candidates) {
        if (!topicChannelMap.has(cand)) {
          topicChannelMap.set(cand, { channels: new Set(), videos: [], multipliers: [] });
        }
        const cluster = topicChannelMap.get(cand)!;
        cluster.channels.add(rec.channelId);
        cluster.videos.push(rec);
        cluster.multipliers.push(rec.outlierMultiplier);
      }
    }
  }

  // Filter clusters with >= 3 distinct channels
  const validatedBreakoutTopics: any[] = [];
  const validatedPhrases = new Set<string>();

  for (const [topic, cluster] of topicChannelMap.entries()) {
    if (cluster.channels.size >= 3) {
      const avgMult = parseFloat((cluster.multipliers.reduce((a, b) => a + b, 0) / cluster.multipliers.length).toFixed(1));
      const sortedClusterVids = [...cluster.videos].sort((a, b) => b.viewCount - a.viewCount);
      const topVid = sortedClusterVids[0];

      validatedBreakoutTopics.push({
        topic,
        distinctChannelsCount: cluster.channels.size,
        avgMultiplier: avgMult,
        topVideoTitle: topVid.title,
        topVideoId: topVid.id,
        sampleChannels: Array.from(new Set(cluster.videos.map((v) => v.channelTitle))).slice(0, 4),
      });
      validatedPhrases.add(topic);
    }
  }

  // Sort validated topics by distinct channels count
  validatedBreakoutTopics.sort((a, b) => b.distinctChannelsCount - a.distinctChannelsCount);

  // Tag videos that match validated breakout topics
  for (const rec of finalRecords) {
    const titleLower = rec.title.toLowerCase();
    for (const val of validatedBreakoutTopics.slice(0, 6)) {
      if (titleLower.includes(val.topic.toLowerCase())) {
        rec.isValidatedBreakoutTopic = true;
        rec.breakoutTopicLabel = `🔥 Validé (${val.distinctChannelsCount} chaînes)`;
        break;
      }
    }
  }

  // 10. Niche Saturation Score Assessment
  const distinctCreators = new Set(finalRecords.map((r) => r.channelId)).size;
  const viewsPerCreator = Math.round(totalViewsSum / Math.max(distinctCreators, 1));

  const smallTotal = finalRecords.filter((r) => r.channelSubscribers > 0 && r.channelSubscribers <= 100000).length;
  const smallOutliers = finalRecords.filter(
    (r) => r.channelSubscribers > 0 && r.channelSubscribers <= 100000 && r.outlierMultiplier >= 2.5
  ).length;
  const smallChannelsBreakoutRate = smallTotal > 0 ? Math.round((smallOutliers / smallTotal) * 100) : 0;

  let saturationLevel: "blue_ocean" | "competitive" | "saturated" = "competitive";
  let saturationLabel = "🟡 Niche Compétitive";
  let saturationScore = 55;
  let saturationDesc = "Niveau de concurrence sain. Les concepts soignés et les titres à fort CTR percent régulièrement.";

  if (smallChannelsBreakoutRate >= 18 && viewsPerCreator >= 25000) {
    saturationLevel = "blue_ocean";
    saturationLabel = "🟢 Océan Bleu (Forte Demande Algorithmique)";
    saturationScore = 88;
    saturationDesc = "Très forte demande du public avec un taux élevé de percée pour les petites chaînes. Peu de barrières à l'entrée.";
  } else if (smallChannelsBreakoutRate < 8 || viewsPerCreator < 10000) {
    saturationLevel = "saturated";
    saturationLabel = "🔴 Niche Saturée";
    saturationScore = 24;
    saturationDesc = "Forte concurrence ou monopole de gros créateurs établis. Difficile de percer sans un packaging hors du commun.";
  }

  const saturationAssessment = {
    level: saturationLevel,
    label: saturationLabel,
    score: saturationScore,
    description: saturationDesc,
    totalViews: totalViewsSum,
    distinctCreators,
    viewsPerCreator,
    smallChannelsBreakoutRate,
  };

  // 11. Finalize and Save
  job.status = job.error ? "partially_completed" : "completed";
  job.step = "done";
  job.reliableOutliersCount = reliableOutliers;
  saveJobResults(jobId, finalRecords);

  // Automatically pipe discovered outliers into the persistent Viral Videos Index
  import("./viralVideosIndex").then(({ ingestVideosIntoViralIndex }) => {
    ingestVideosIntoViralIndex(finalRecords).catch(() => {});
  }).catch(() => {});

  return {
    job,
    videos: finalRecords,
    totalAvailable: finalRecords.length,
    aggregates: {
      avgViews,
      medianViews,
      avgOutlier,
      smallChannelsRatio,
      topKeywords,
      saturationScore: saturationAssessment,
      validatedBreakoutTopics: validatedBreakoutTopics.slice(0, 6),
    },
  };
}
