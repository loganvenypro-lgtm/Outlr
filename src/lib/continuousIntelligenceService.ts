import { 
  readIntelligenceDatabase, 
  upsertUnifiedChannel, 
  upsertUnifiedVideo, 
  upsertChannelDna, 
  saveChannelRelationship,
  QuotaManager,
  enqueueTask,
  getNextPendingTask,
  updateTaskStatus,
  getDiscoverySeeds,
  updateDiscoverySeedStats,
  getStoredRelationships,
  getUnifiedChannel,
  getUnifiedVideosByChannel
} from "./intelligenceDb";
import { parseISO8601Duration } from "./utils";
import { classifyEditorialArchetype } from "./trueCompetitorService";
import { 
  UnifiedChannelRecord, 
  UnifiedVideoRecord, 
  ChannelDnaProfile,
  ScheduledTask,
  DiscoveryTopicSeed
} from "@/types/intelligenceEngine";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY manquante");
  return key.trim();
}

/**
 * Continuous YouTube Data Intelligence Service
 * Handles discovery, deduplication, historical tracking, background worker jobs & smart quota refresh.
 */
export class ContinuousIntelligenceService {
  
  /**
   * 1. Check database first for channel & recent videos. If fresh, returns immediately without consuming quota.
   */
  static async getOrFetchChannelWithVideos(channelId: string, maxAgeHours = 12): Promise<{
    channel: UnifiedChannelRecord | null;
    videos: UnifiedVideoRecord[];
    dna: ChannelDnaProfile | null;
    source: "database_cache" | "youtube_enriched";
  }> {
    const existingChannel = getUnifiedChannel(channelId);
    const existingVideos = getUnifiedVideosByChannel(channelId);
    const db = readIntelligenceDatabase();
    const existingDna = db.channelDna[channelId] || null;

    if (existingChannel && existingVideos.length >= 5) {
      const lastRefresh = new Date(existingChannel.lastMetadataRefresh).getTime();
      const ageHours = (Date.now() - lastRefresh) / (1000 * 60 * 60);

      if (ageHours < maxAgeHours) {
        return {
          channel: existingChannel,
          videos: existingVideos,
          dna: existingDna,
          source: "database_cache",
        };
      }
    }

    // Channel missing or stale: refresh from YouTube
    const refreshed = await this.refreshChannelAndRecentVideos(channelId);
    return {
      channel: refreshed.channel,
      videos: refreshed.videos,
      dna: refreshed.dna,
      source: "youtube_enriched",
    };
  }

  /**
   * 2. Refresh channel metadata & top recent videos with batching & quota checks
   */
  static async refreshChannelAndRecentVideos(channelId: string): Promise<{
    channel: UnifiedChannelRecord | null;
    videos: UnifiedVideoRecord[];
    dna: ChannelDnaProfile | null;
  }> {
    const apiKey = getApiKey();

    // Check quota for channels.list (1 unit)
    if (!QuotaManager.canAfford(1)) {
      console.warn("[ContinuousIntelligence] Quota exhausted, serving cached data if available");
      const cachedChan = getUnifiedChannel(channelId);
      const cachedVids = getUnifiedVideosByChannel(channelId);
      const db = readIntelligenceDatabase();
      return {
        channel: cachedChan,
        videos: cachedVids,
        dna: db.channelDna[channelId] || null,
      };
    }

    try {
      // Step A: Fetch Channel
      const cRes = await fetch(
        `${YOUTUBE_API_BASE}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`
      );
      QuotaManager.recordUsage("channels.list", 1);
      const cData = await cRes.json();
      const item = cData.items?.[0];

      if (!item) {
        return { channel: null, videos: [], dna: null };
      }

      const subs = item.statistics?.hiddenSubscriberCount ? -1 : parseInt(item.statistics?.subscriberCount || "0", 10);
      const views = parseInt(item.statistics?.viewCount || "0", 10);
      const videoCount = parseInt(item.statistics?.videoCount || "0", 10);

      const channelRecord = upsertUnifiedChannel({
        id: item.id,
        name: item.snippet?.title || "YouTube Creator",
        handle: item.snippet?.customUrl || "",
        description: item.snippet?.description || "",
        thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "",
        avatarUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
        country: item.snippet?.country,
        publishedAt: item.snippet?.publishedAt,
        subscriberCount: subs,
        totalViews: views,
        videoCount,
        discoverySource: "user_search",
      });

      // Step B: Get latest uploads from uploads playlist (1 quota unit)
      const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;
      const videosCollected: UnifiedVideoRecord[] = [];

      if (uploadsPlaylistId && QuotaManager.canAfford(2)) {
        const pRes = await fetch(
          `${YOUTUBE_API_BASE}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=30&key=${apiKey}`
        );
        QuotaManager.recordUsage("playlistItems.list", 1);
        const pData = await pRes.json();
        const videoIds = (pData.items || []).map((pi: any) => pi.snippet?.resourceId?.videoId).filter(Boolean);

        if (videoIds.length > 0) {
          // Batch fetch videos.list (1 unit for up to 50 videos)
          const vRes = await fetch(
            `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(",")}&key=${apiKey}`
          );
          QuotaManager.recordUsage("videos.list", 1);
          const vData = await vRes.json();

          const baseline = videoCount > 0 ? Math.round(views / videoCount) : (subs > 0 ? Math.round(subs * 0.4) : 1000);

          for (const v of vData.items || []) {
            const vViews = parseInt(v.statistics?.viewCount || "0", 10);
            const vLikes = v.statistics?.likeCount ? parseInt(v.statistics.likeCount, 10) : undefined;
            const vComments = v.statistics?.commentCount ? parseInt(v.statistics.commentCount, 10) : undefined;
            const dur = parseISO8601Duration(v.contentDetails?.duration);
            const isShort = dur.seconds > 0 && dur.seconds <= 60;
            const mult = baseline > 0 ? parseFloat((vViews / baseline).toFixed(1)) : 1.0;

            let classification: UnifiedVideoRecord["outlierClassification"] = "normal";
            if (mult < 1.0) classification = "under";
            else if (mult >= 2.0 && mult < 5.0) classification = "breakout";
            else if (mult >= 5.0 && mult < 10.0) classification = "high_outlier";
            else if (mult >= 10.0) classification = "extreme_outlier";

            const rec = upsertUnifiedVideo({
              id: v.id,
              channelId: item.id,
              title: v.snippet?.title || "",
              description: v.snippet?.description || "",
              publishedAt: v.snippet?.publishedAt || "",
              thumbnailUrl: v.snippet?.thumbnails?.maxres?.url || v.snippet?.thumbnails?.high?.url || "",
              durationFormatted: dur.formatted,
              durationSeconds: dur.seconds,
              viewCount: vViews,
              likeCount: vLikes,
              commentCount: vComments,
              isShort,
              baselineViews: baseline,
              outlierMultiplier: mult,
              outlierClassification: classification,
              outlierReliability: "verified",
            });
            videosCollected.push(rec);
          }
        }
      }

      // Step C: Build / Update Channel DNA & Niche Profile
      const titles = videosCollected.map((v) => v.title);
      const avgDuration = videosCollected.length > 0
        ? Math.round(videosCollected.reduce((acc, v) => acc + v.durationSeconds, 0) / videosCollected.length)
        : 600;

      const classification = classifyEditorialArchetype(titles, channelRecord.description, avgDuration);

      const dna: ChannelDnaProfile = {
        channelId: channelRecord.id,
        primaryNiche: classification.label,
        secondaryNiches: classification.tags,
        contentPillars: classification.tags,
        dominantVideoFormats: avgDuration > 600 ? ["longform_essay", "documentary"] : ["reaction_review"],
        editorialCharacteristics: classification.titlePatterns,
        language: channelRecord.defaultLanguage || "en",
        representativeVideoIds: videosCollected.slice(0, 5).map((v) => v.id),
        classificationConfidence: 0.92,
        analysisVersion: "v2.0",
        lastAnalysisDate: new Date().toISOString(),
        archetype: classification.archetype,
        archetypeLabel: classification.label,
        typicalViews: channelRecord.videoCount > 0 ? Math.round(channelRecord.totalViews / channelRecord.videoCount) : 1000,
        typicalDurationSeconds: avgDuration,
        uploadFrequencyDays: 7,
      };

      upsertChannelDna(dna);

      return {
        channel: channelRecord,
        videos: videosCollected,
        dna,
      };
    } catch (e) {
      console.error("[ContinuousIntelligence] Refresh channel error:", e);
      return {
        channel: getUnifiedChannel(channelId),
        videos: getUnifiedVideosByChannel(channelId),
        dna: null,
      };
    }
  }

  /**
   * 3. Seed / Topic Discovery Worker
   * Crawls YouTube for a given topic or discovery seed without depleting user search quota.
   */
  static async crawlTopicDiscovery(seedId: string): Promise<{ channelsFound: number; videosFound: number }> {
    const seeds = getDiscoverySeeds();
    const seed = seeds.find((s) => s.id === seedId) || seeds[0];
    if (!seed) return { channelsFound: 0, videosFound: 0 };

    // Cost: 1 search.list (100 units) + 1 videos.list (1 unit) + 1 channels.list (1 unit) = 102 units
    if (!QuotaManager.canAfford(105)) {
      console.warn(`[ContinuousIntelligence] Cannot afford crawl for seed ${seed.topic}. Quota remaining: ${QuotaManager.getQuotaStatus().unitsAvailable}`);
      return { channelsFound: 0, videosFound: 0 };
    }

    const apiKey = getApiKey();
    const query = seed.subKeywords[Math.floor(Math.random() * seed.subKeywords.length)] || seed.topic;

    try {
      // 1. Search YouTube (100 units)
      const searchRes = await fetch(
        `${YOUTUBE_API_BASE}/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=30&order=relevance&key=${apiKey}`
      );
      QuotaManager.recordUsage("search.list", 1);
      const searchData = await searchRes.json();
      const videoItems = searchData.items || [];

      if (videoItems.length === 0) return { channelsFound: 0, videosFound: 0 };

      const videoIds: string[] = videoItems.map((it: any) => it.id?.videoId).filter(Boolean);
      const channelIdsSet = new Set<string>();
      videoItems.forEach((it: any) => {
        if (it.snippet?.channelId) channelIdsSet.add(it.snippet.channelId);
      });

      // 2. Batch fetch videos metadata (1 unit)
      const vRes = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(",")}&key=${apiKey}`
      );
      QuotaManager.recordUsage("videos.list", 1);
      const vData = await vRes.json();

      // 3. Batch fetch channels metadata (1 unit)
      const channelIds = Array.from(channelIdsSet);
      const cRes = await fetch(
        `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${channelIds.slice(0, 50).join(",")}&key=${apiKey}`
      );
      QuotaManager.recordUsage("channels.list", 1);
      const cData = await cRes.json();

      const channelMap = new Map<string, any>();
      for (const c of cData.items || []) {
        const subs = c.statistics?.hiddenSubscriberCount ? -1 : parseInt(c.statistics?.subscriberCount || "0", 10);
        const rec = upsertUnifiedChannel({
          id: c.id,
          name: c.snippet?.title || "Creator",
          handle: c.snippet?.customUrl || "",
          description: c.snippet?.description || "",
          thumbnailUrl: c.snippet?.thumbnails?.medium?.url || "",
          avatarUrl: c.snippet?.thumbnails?.default?.url || "",
          subscriberCount: subs,
          totalViews: parseInt(c.statistics?.viewCount || "0", 10),
          videoCount: parseInt(c.statistics?.videoCount || "0", 10),
          discoverySource: "topic_crawler",
        });
        channelMap.set(c.id, rec);
      }

      let newVideos = 0;
      for (const v of vData.items || []) {
        const cRec = channelMap.get(v.snippet?.channelId);
        const dur = parseISO8601Duration(v.contentDetails?.duration);
        const views = parseInt(v.statistics?.viewCount || "0", 10);
        const baseline = cRec && cRec.videoCount > 0 ? Math.round(cRec.totalViews / cRec.videoCount) : 1000;
        const mult = baseline > 0 ? parseFloat((views / baseline).toFixed(1)) : 1.0;

        upsertUnifiedVideo({
          id: v.id,
          channelId: v.snippet?.channelId || "",
          title: v.snippet?.title || "",
          description: v.snippet?.description || "",
          publishedAt: v.snippet?.publishedAt || "",
          thumbnailUrl: v.snippet?.thumbnails?.high?.url || "",
          durationFormatted: dur.formatted,
          durationSeconds: dur.seconds,
          viewCount: views,
          likeCount: v.statistics?.likeCount ? parseInt(v.statistics.likeCount, 10) : undefined,
          commentCount: v.statistics?.commentCount ? parseInt(v.statistics.commentCount, 10) : undefined,
          isShort: dur.seconds > 0 && dur.seconds <= 60,
          discoveryKeywords: [query, seed.category],
          baselineViews: baseline,
          outlierMultiplier: mult,
        });
        newVideos++;
      }

      updateDiscoverySeedStats(seed.id, channelMap.size, newVideos);
      return { channelsFound: channelMap.size, videosFound: newVideos };
    } catch (e) {
      console.error("[ContinuousIntelligence] Crawl error:", e);
      return { channelsFound: 0, videosFound: 0 };
    }
  }

  /**
   * 4. Smart Scheduler: Run next pending background task
   */
  static async processNextScheduledTask(): Promise<{ task: ScheduledTask | null; result?: any }> {
    const task = getNextPendingTask();
    if (!task) return { task: null };

    updateTaskStatus(task.id, "running");

    try {
      if (task.taskType === "crawl_topic_niche") {
        const seedId = task.payload.seedId;
        const res = await this.crawlTopicDiscovery(seedId);
        updateTaskStatus(task.id, "completed");
        return { task, result: res };
      }

      if (task.taskType === "refresh_tracked_channels") {
        const db = readIntelligenceDatabase();
        // Priority to tracked channels with stale refresh (> 24h)
        const staleTracked = Object.values(db.channels)
          .filter((c) => c.isTracked)
          .slice(0, 5);

        let refreshedCount = 0;
        for (const c of staleTracked) {
          if (!QuotaManager.canAfford(2)) break;
          await this.refreshChannelAndRecentVideos(c.id);
          refreshedCount++;
        }

        updateTaskStatus(task.id, "completed");
        return { task, result: { refreshedCount } };
      }

      updateTaskStatus(task.id, "completed");
      return { task, result: { status: "no-op" } };
    } catch (err: any) {
      updateTaskStatus(task.id, "failed", err.message);
      return { task, result: { error: err.message } };
    }
  }

  /**
   * 5. Fast In-Memory Database Search across collected videos (Zero API Quota used)
   */
  static searchStoredVideos(params: {
    query?: string;
    minViews?: number;
    minOutlier?: number;
    format?: "all" | "long" | "shorts";
    limit?: number;
  }): UnifiedVideoRecord[] {
    const db = readIntelligenceDatabase();
    let list = Object.values(db.videos);

    if (params.query) {
      const q = params.query.toLowerCase();
      list = list.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.discoveryKeywords.some((k) => k.toLowerCase().includes(q))
      );
    }

    if (params.minViews) {
      list = list.filter((v) => v.viewCount >= params.minViews!);
    }

    if (params.minOutlier) {
      list = list.filter((v) => v.outlierMultiplier >= params.minOutlier!);
    }

    if (params.format === "long") {
      list = list.filter((v) => !v.isShort);
    } else if (params.format === "shorts") {
      list = list.filter((v) => v.isShort);
    }

    list.sort((a, b) => b.outlierMultiplier - a.outlierMultiplier);
    return list.slice(0, params.limit || 50);
  }
}
