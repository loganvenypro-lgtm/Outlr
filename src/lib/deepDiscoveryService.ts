import { SearchDepth, SearchJobProgress, DiscoveredVideoRecord, DiscoveryJobResult } from "@/types/discoveryEngine";
import { parseISO8601Duration } from "./utils";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { upsertUnifiedChannel, upsertUnifiedVideo, QuotaManager } from "./intelligenceDb";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY manquante");
  return key.trim();
}

/**
 * Storage for asynchronous discovery jobs and results
 */
const DATA_DIR = path.join(process.cwd(), "data");
const JOBS_FILE = path.join(DATA_DIR, "discovery_jobs.json");
const CACHE_FILE = path.join(DATA_DIR, "discovered_videos_cache.json");

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(JOBS_FILE)) fs.writeFileSync(JOBS_FILE, "{}", "utf-8");
  if (!fs.existsSync(CACHE_FILE)) fs.writeFileSync(CACHE_FILE, "{}", "utf-8");
}

function readJobsMap(): Record<string, SearchJobProgress> {
  ensureFiles();
  try {
    return JSON.parse(fs.readFileSync(JOBS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeJobsMap(map: Record<string, SearchJobProgress>) {
  ensureFiles();
  try {
    fs.writeFileSync(JOBS_FILE, JSON.stringify(map, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing jobs file:", e);
  }
}

function readVideosCache(): Record<string, DiscoveredVideoRecord[]> {
  ensureFiles();
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeVideosCache(cache: Record<string, DiscoveredVideoRecord[]>) {
  ensureFiles();
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing cache file:", e);
  }
}

/**
 * Save / Update Job state
 */
export function saveJobProgress(job: SearchJobProgress) {
  const jobs = readJobsMap();
  jobs[job.jobId] = { ...job, updatedAt: new Date().toISOString() };
  writeJobsMap(jobs);
}

export function getJobProgress(jobId: string): SearchJobProgress | null {
  const jobs = readJobsMap();
  return jobs[jobId] || null;
}

export function saveJobResults(jobId: string, videos: DiscoveredVideoRecord[]) {
  const cache = readVideosCache();
  cache[jobId] = videos;
  writeVideosCache(cache);
}

export function getJobResults(jobId: string): DiscoveredVideoRecord[] {
  const cache = readVideosCache();
  return cache[jobId] || [];
}

/**
 * Resilient live discovery: Fetches authentic YouTube video IDs directly for any query,
 * supporting sp search filter flags (e.g. upload date, view count sort) and continuation tokens.
 * Completely immune to search.list 429 quota exhaustion.
 */
export async function scrapeRealYouTubeVideoIds(
  query: string, 
  maxResults = 45,
  spFilter?: string
): Promise<string[]> {
  const ids = new Set<string>();

  // 1. High-speed, zero-quota InnerTube endpoint
  try {
    const { scrapeInnerTubeSearch } = await import("./youtube-scraper");
    const innerTubeRes = await scrapeInnerTubeSearch(query);
    for (const v of innerTubeRes.videos) {
      if (v.id) ids.add(v.id);
    }
    // If InnerTube yielded sufficient results or any results, return early to avoid slow HTML timeouts
    if (ids.size >= Math.min(maxResults, 20)) {
      return Array.from(ids).slice(0, maxResults);
    }
  } catch (e) {
    // Proceed to fast HTML fallback
  }

  // 2. Resilient fallback with HTML search (tight 2s timeout)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    let url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
    if (spFilter) {
      url += `&sp=${encodeURIComponent(spFilter)}`;
    }

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
      },
    });
    clearTimeout(timeoutId);

    const html = await res.text();

    // Parse JSON ytInitialData payload if available
    const match = html.match(/var ytInitialData = ({[\s\S]*?});<\/script>/) || html.match(/ytInitialData\s*=\s*({[\s\S]+?});/);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        for (const c of contents) {
          const itemSection = c.itemSectionRenderer?.contents || [];
          for (const item of itemSection) {
            if (item.videoRenderer?.videoId) {
              ids.add(item.videoRenderer.videoId);
            }
          }
        }
      } catch {}
    }

    // Fallback regex on HTML tokens
    const watchMatches = html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g);
    for (const m of watchMatches) {
      if (m[1]) ids.add(m[1]);
      if (ids.size >= maxResults) break;
    }

    return Array.from(ids).slice(0, maxResults);
  } catch {
    return Array.from(ids);
  }
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
export function expandSearchQueries(baseQuery: string, maxVariants = 8): string[] {
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
  } else {
    // General high-yield suffixes preserving query subject integrity
    variants.add(`${q} explained`);
    variants.add(`${q} documentary`);
    variants.add(`${q} deep dive`);
    variants.add(`${q} case study`);
  }

  // 4. Word-reordered variant
  if (tokens.length >= 2) {
    variants.add([...tokens].reverse().join(" "));
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
  let maxQueries = 5;
  let maxPagesPerQuery = 3;

  if (depth === "quick") {
    targetCount = 100;
    maxQueries = 3;
    maxPagesPerQuery = 2;
  } else if (depth === "deep") {
    targetCount = 300;
    maxQueries = 5;
    maxPagesPerQuery = 3;
  } else if (depth === "extended") {
    targetCount = 500;
    maxQueries = 7;
    maxPagesPerQuery = 4;
  } else if (depth === "max") {
    targetCount = 800;
    maxQueries = 10;
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

  // 3. Fast Parallel Multi-Angle Discovery Engine
  // We execute concurrent high-speed discovery on:
  // (A) The primary query (standard relevance)
  // (B) The primary query sorted by upload date (recent breakout videos: sp=CAI%253D)
  // (C) The primary query sorted by view count (high volume evergreen hits: sp=CAM%253D)
  // (D) Top expanded semantic angle variants
  job.message = `Exploration instantanée des vidéos récentes et des breakouts pour "${query}"...`;
  saveJobProgress(job);

  // Adapt discovery promises based on chosen depth:
  // For quick: 2 high-yield angles (Primary query + Recent breakout CAI%253D) -> completed in ~4-6 seconds
  // For deep: 4 angles (Primary query + Recent breakout + Top views + 1 semantic angle) -> completed in ~8-12 seconds
  // For extended/max: full multi-angle discovery
  const maxSemanticAngles = depth === "quick" ? 0 : depth === "deep" ? 1 : depth === "extended" ? 2 : 4;
  const semanticVariants = expandedQueries.filter((q) => q.toLowerCase() !== query.toLowerCase()).slice(0, maxSemanticAngles);

  const discoveryPromises = [
    // 1. Standard search for main query
    scrapeRealYouTubeVideoIds(query, depth === "quick" ? 40 : 50).then((scrapedIds) => ({ qVariant: query, scrapedIds })),
    // 2. Fresh uploads filter on main query (YouTube upload date sp parameter)
    scrapeRealYouTubeVideoIds(query, depth === "quick" ? 30 : 40, "CAI%253D").then((scrapedIds) => ({ qVariant: `${query} (Dernières sorties)`, scrapedIds })),
  ];

  if (depth !== "quick") {
    // 3. High view count breakout filter
    discoveryPromises.push(
      scrapeRealYouTubeVideoIds(query, 40, "CAM%253D").then((scrapedIds) => ({ qVariant: `${query} (Top Vues)`, scrapedIds }))
    );
  }

  // 4. Semantic niche angles
  for (const qVariant of semanticVariants) {
    discoveryPromises.push(
      scrapeRealYouTubeVideoIds(qVariant, 30).then((scrapedIds) => ({ qVariant, scrapedIds }))
    );
  }

  const discoveredBatches = await Promise.all(discoveryPromises);

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

  job.queriesExecutedCount = discoveryPromises.length;
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

  // 7. Sort by Relevance & Outlier blended score
  finalRecords.sort((a, b) => {
    // Top priority to high relevance and high outlier ratio
    const scoreA = a.relevanceScore * 0.6 + Math.min(a.outlierMultiplier * 10, 100) * 0.4;
    const scoreB = b.relevanceScore * 0.6 + Math.min(b.outlierMultiplier * 10, 100) * 0.4;
    return scoreB - scoreA;
  });

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
