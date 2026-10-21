import { DATA_DIR, freshEntries, isExpired } from "@/lib/dataDir";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  PersistentIntelligenceSchema,
  UnifiedChannelRecord,
  UnifiedVideoRecord,
  ChannelSnapshot,
  VideoSnapshot,
  ChannelDnaProfile,
  ChannelRelationship,
  QuotaUsageLog,
  ScheduledTask,
  DiscoveryTopicSeed,
} from "@/types/intelligenceEngine";

const INTEL_DB_FILE = path.join(DATA_DIR, "intelligence_database.json");

// Default initial discovery seeds covering key YouTube niches
const INITIAL_DISCOVERY_SEEDS: DiscoveryTopicSeed[] = [
  {
    id: "seed-docu",
    topic: "YouTube Documentaries & Investigations",
    category: "Investigation & Storytelling",
    subKeywords: ["internet mystery", "unsolved investigation", "rabbit hole documentary", "dark side of", "deep dive"],
    channelsDiscoveredCount: 0,
    videosDiscoveredCount: 0,
    priority: 10,
  },
  {
    id: "seed-ai",
    topic: "AI Automation & Future Tech",
    category: "Technology & Software",
    subKeywords: ["ai agents automation", "deepseek llm review", "vibe coding tutorial", "future of robotics", "anthropic claude"],
    channelsDiscoveredCount: 0,
    videosDiscoveredCount: 0,
    priority: 9,
  },
  {
    id: "seed-biz",
    topic: "Business Breakdowns & Creator Economy",
    category: "Finance & Business",
    subKeywords: ["how company makes millions", "creator economy monetization", "business empire collapse", "micro saas story"],
    channelsDiscoveredCount: 0,
    videosDiscoveredCount: 0,
    priority: 8,
  },
  {
    id: "seed-gaming",
    topic: "Gaming Challenges & Longform Essays",
    category: "Gaming & Entertainment",
    subKeywords: ["100 days hardcore challenge", "gaming retrospective documentary", "beating without damage", "unbeatable world record"],
    channelsDiscoveredCount: 0,
    videosDiscoveredCount: 0,
    priority: 7,
  },
  {
    id: "seed-science",
    topic: "Science, Space & Engineering Marvels",
    category: "Education & Science",
    subKeywords: ["engineering disaster explained", "james webb space telescope", "quantum physics visualised", "how it is built"],
    channelsDiscoveredCount: 0,
    videosDiscoveredCount: 0,
    priority: 8,
  },
];

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getDefaultQuotaLog(): QuotaUsageLog {
  const customLimit = process.env.YOUTUBE_DAILY_QUOTA 
    ? parseInt(process.env.YOUTUBE_DAILY_QUOTA, 10) 
    : 10000;

  return {
    date: getTodayString(),
    dailyLimit: customLimit,
    unitsConsumed: 0,
    unitsAvailable: customLimit,
    callsByEndpoint: {
      "search.list": 0,
      "videos.list": 0,
      "channels.list": 0,
      "playlistItems.list": 0,
    },
    lastResetAt: new Date().toISOString(),
  };
}

const DEFAULT_INTEL_DB: PersistentIntelligenceSchema = {
  version: "2.0.0",
  channels: {},
  videos: {},
  channelSnapshots: [],
  videoSnapshots: [],
  channelDna: {},
  channelRelationships: [],
  quotaLog: getDefaultQuotaLog(),
  scheduledTasks: [],
  discoverySeeds: INITIAL_DISCOVERY_SEEDS,
};

function ensureIntelDbFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(INTEL_DB_FILE)) {
    fs.writeFileSync(INTEL_DB_FILE, JSON.stringify(DEFAULT_INTEL_DB, null, 2), "utf-8");
  }
}

/**
 * Thread-safe read with quota daily rollover check
 */
export function readIntelligenceDatabase(): PersistentIntelligenceSchema {
  try {
    ensureIntelDbFile();
    const raw = fs.readFileSync(INTEL_DB_FILE, "utf-8");
    const parsed: PersistentIntelligenceSchema = JSON.parse(raw);

    // Validate structure
    const db: PersistentIntelligenceSchema = {
      version: parsed.version || "2.0.0",
      // YouTube API data older than 30 days is dropped (see isExpired).
      channels: freshEntries(parsed.channels || {}, (c) => c.lastMetadataRefresh),
      videos: freshEntries(parsed.videos || {}, (v) => v.lastMetadataRefresh),
      channelSnapshots: (parsed.channelSnapshots || []).filter((s) => !isExpired(s.timestamp)),
      videoSnapshots: (parsed.videoSnapshots || []).filter((s) => !isExpired(s.timestamp)),
      channelDna: freshEntries(parsed.channelDna || {}, (d) => d.lastAnalysisDate),
      channelRelationships: (parsed.channelRelationships || []).filter((r) => !isExpired(r.lastCalculated)),
      quotaLog: parsed.quotaLog || getDefaultQuotaLog(),
      scheduledTasks: parsed.scheduledTasks || [],
      discoverySeeds: parsed.discoverySeeds && parsed.discoverySeeds.length > 0
        ? parsed.discoverySeeds
        : INITIAL_DISCOVERY_SEEDS,
    };

    // Auto-rollover quota if date changed (UTC day)
    const today = getTodayString();
    if (db.quotaLog.date !== today) {
      db.quotaLog = getDefaultQuotaLog();
      writeIntelligenceDatabase(db);
    }

    return db;
  } catch (err) {
    console.error("Error reading intelligence database:", err);
    return DEFAULT_INTEL_DB;
  }
}

/**
 * Atomic write to disk
 */
export function writeIntelligenceDatabase(db: PersistentIntelligenceSchema): void {
  try {
    ensureIntelDbFile();
    const tempPath = `${INTEL_DB_FILE}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), "utf-8");
    fs.renameSync(tempPath, INTEL_DB_FILE);
  } catch (err) {
    console.error("Error writing intelligence database:", err);
  }
}

// ----------------------------------------------------------------------------
// 1. Quota Management Service
// ----------------------------------------------------------------------------
export class QuotaManager {
  static getQuotaStatus(): QuotaUsageLog {
    const db = readIntelligenceDatabase();
    return db.quotaLog;
  }

  static canAfford(costUnits: number): boolean {
    const db = readIntelligenceDatabase();
    return db.quotaLog.unitsAvailable >= costUnits;
  }

  static recordUsage(
    endpoint: "search.list" | "videos.list" | "channels.list" | "playlistItems.list",
    callCount = 1
  ): boolean {
    const db = readIntelligenceDatabase();
    let unitCost = 1;
    if (endpoint === "search.list") unitCost = 100;
    else if (endpoint === "videos.list" || endpoint === "channels.list" || endpoint === "playlistItems.list") unitCost = 1;

    const totalCost = unitCost * callCount;
    if (db.quotaLog.unitsAvailable < totalCost) {
      console.warn(`[QuotaManager] Insufficient quota for ${endpoint} (Needs ${totalCost}, has ${db.quotaLog.unitsAvailable})`);
      return false;
    }

    db.quotaLog.unitsConsumed += totalCost;
    db.quotaLog.unitsAvailable = Math.max(0, db.quotaLog.dailyLimit - db.quotaLog.unitsConsumed);
    db.quotaLog.callsByEndpoint[endpoint] = (db.quotaLog.callsByEndpoint[endpoint] || 0) + callCount;

    writeIntelligenceDatabase(db);
    return true;
  }
}

// ----------------------------------------------------------------------------
// 2. Channel Storage & Historical Snapshots
// ----------------------------------------------------------------------------
export function upsertUnifiedChannel(
  channel: Partial<UnifiedChannelRecord> & { id: string; name: string }
): UnifiedChannelRecord {
  const db = readIntelligenceDatabase();
  const now = new Date().toISOString();
  const canonicalId = channel.id;

  const existing = db.channels[canonicalId];

  // Calculate refresh priority score:
  // Higher if tracked, or high subscriber count, or stale metadata
  let priority = 10;
  if (channel.isTracked || existing?.isTracked) priority += 50;
  if ((channel.subscriberCount ?? existing?.subscriberCount ?? 0) > 100000) priority += 20;

  const updated: UnifiedChannelRecord = {
    id: canonicalId,
    name: channel.name || existing?.name || "YouTube Creator",
    handle: channel.handle || existing?.handle || "",
    description: channel.description ?? existing?.description ?? "",
    thumbnailUrl: channel.thumbnailUrl || channel.avatarUrl || existing?.thumbnailUrl || "",
    avatarUrl: channel.avatarUrl || channel.thumbnailUrl || existing?.avatarUrl || "",
    bannerUrl: channel.bannerUrl || existing?.bannerUrl,
    country: channel.country || existing?.country,
    defaultLanguage: channel.defaultLanguage || existing?.defaultLanguage,
    publishedAt: channel.publishedAt || existing?.publishedAt,
    subscriberCount: channel.subscriberCount ?? existing?.subscriberCount ?? -1,
    totalViews: channel.totalViews ?? existing?.totalViews ?? 0,
    videoCount: channel.videoCount ?? existing?.videoCount ?? 0,
    lastMetadataRefresh: now,
    lastVideoDiscovery: channel.lastVideoDiscovery || existing?.lastVideoDiscovery || now,
    lastAnalyzedDate: channel.lastAnalyzedDate || existing?.lastAnalyzedDate || now,
    discoverySource: channel.discoverySource || existing?.discoverySource || "user_search",
    discoveryStatus: "active",
    confidenceScore: channel.confidenceScore || existing?.confidenceScore || "high",
    refreshPriorityScore: priority,
    isTracked: Boolean(channel.isTracked ?? existing?.isTracked ?? false),
  };

  db.channels[canonicalId] = updated;

  // Record historical snapshot if values changed or first time
  const lastSnapshot = [...db.channelSnapshots]
    .reverse()
    .find((s) => s.channelId === canonicalId);

  const shouldSnapshot =
    !lastSnapshot ||
    lastSnapshot.subscriberCount !== updated.subscriberCount ||
    lastSnapshot.totalViews !== updated.totalViews ||
    lastSnapshot.videoCount !== updated.videoCount;

  if (shouldSnapshot && updated.totalViews > 0) {
    db.channelSnapshots.push({
      id: uuidv4(),
      channelId: canonicalId,
      timestamp: now,
      subscriberCount: updated.subscriberCount,
      totalViews: updated.totalViews,
      videoCount: updated.videoCount,
      observedVia: "user_request",
    });

    // Keep snapshot table bounded
    if (db.channelSnapshots.length > 50000) {
      db.channelSnapshots = db.channelSnapshots.slice(-40000);
    }
  }

  writeIntelligenceDatabase(db);
  return updated;
}

export function getUnifiedChannel(channelId: string): UnifiedChannelRecord | null {
  const db = readIntelligenceDatabase();
  return db.channels[channelId] || null;
}

export function getAllUnifiedChannels(): UnifiedChannelRecord[] {
  const db = readIntelligenceDatabase();
  return Object.values(db.channels);
}

// ----------------------------------------------------------------------------
// 3. Video Storage & Historical Snapshots
// ----------------------------------------------------------------------------
export function upsertUnifiedVideo(
  video: Partial<UnifiedVideoRecord> & { id: string; channelId: string; title: string }
): UnifiedVideoRecord {
  const db = readIntelligenceDatabase();
  const now = new Date().toISOString();
  const vid = video.id;

  const existing = db.videos[vid];

  const updated: UnifiedVideoRecord = {
    id: vid,
    channelId: video.channelId,
    title: video.title,
    description: video.description ?? existing?.description ?? "",
    publishedAt: video.publishedAt || existing?.publishedAt || now,
    durationFormatted: video.durationFormatted || existing?.durationFormatted || "00:00",
    durationSeconds: video.durationSeconds ?? existing?.durationSeconds ?? 0,
    thumbnailUrl: video.thumbnailUrl || existing?.thumbnailUrl || "",
    viewCount: video.viewCount ?? existing?.viewCount ?? 0,
    likeCount: video.likeCount ?? existing?.likeCount,
    commentCount: video.commentCount ?? existing?.commentCount,
    categoryName: video.categoryName || existing?.categoryName,
    categoryId: video.categoryId || existing?.categoryId,
    language: video.language || existing?.language,
    isShort: video.isShort ?? existing?.isShort ?? false,
    firstDiscoveredAt: existing?.firstDiscoveredAt || now,
    lastMetadataRefresh: now,
    discoveryKeywords: Array.from(
      new Set([...(existing?.discoveryKeywords || []), ...(video.discoveryKeywords || [])])
    ),
    processingStatus: "analyzed",
    viewsPerDay: video.viewsPerDay ?? existing?.viewsPerDay ?? 0,
    baselineViews: video.baselineViews ?? existing?.baselineViews ?? 1000,
    outlierMultiplier: video.outlierMultiplier ?? existing?.outlierMultiplier ?? 1.0,
    outlierClassification: video.outlierClassification || existing?.outlierClassification || "normal",
    outlierReliability: video.outlierReliability || existing?.outlierReliability || "verified",
  };

  db.videos[vid] = updated;

  // Record historical video snapshot
  const lastSnap = [...db.videoSnapshots]
    .reverse()
    .find((s) => s.videoId === vid);

  if (!lastSnap || lastSnap.viewCount !== updated.viewCount) {
    let velocityPerHour = 0;
    if (lastSnap) {
      const hoursDiff = Math.max(
        (new Date(now).getTime() - new Date(lastSnap.timestamp).getTime()) / (1000 * 60 * 60),
        0.1
      );
      velocityPerHour = Math.max(0, Math.round((updated.viewCount - lastSnap.viewCount) / hoursDiff));
    }

    db.videoSnapshots.push({
      id: uuidv4(),
      videoId: vid,
      channelId: video.channelId,
      timestamp: now,
      viewCount: updated.viewCount,
      likeCount: updated.likeCount,
      commentCount: updated.commentCount,
      velocityPerHour,
    });

    if (db.videoSnapshots.length > 100000) {
      db.videoSnapshots = db.videoSnapshots.slice(-80000);
    }
  }

  writeIntelligenceDatabase(db);
  return updated;
}

export function getUnifiedVideo(videoId: string): UnifiedVideoRecord | null {
  const db = readIntelligenceDatabase();
  return db.videos[videoId] || null;
}

export function getUnifiedVideosByChannel(channelId: string): UnifiedVideoRecord[] {
  const db = readIntelligenceDatabase();
  return Object.values(db.videos).filter((v) => v.channelId === channelId);
}

// ----------------------------------------------------------------------------
// 4. Channel DNA & Relationship Storage
// ----------------------------------------------------------------------------
export function upsertChannelDna(dna: ChannelDnaProfile): void {
  const db = readIntelligenceDatabase();
  db.channelDna[dna.channelId] = dna;
  writeIntelligenceDatabase(db);
}

export function getChannelDna(channelId: string): ChannelDnaProfile | null {
  const db = readIntelligenceDatabase();
  return db.channelDna[channelId] || null;
}

export function saveChannelRelationship(rel: ChannelRelationship): void {
  const db = readIntelligenceDatabase();
  const existingIdx = db.channelRelationships.findIndex(
    (r) =>
      r.sourceChannelId === rel.sourceChannelId &&
      r.targetChannelId === rel.targetChannelId
  );

  if (existingIdx >= 0) {
    db.channelRelationships[existingIdx] = rel;
  } else {
    db.channelRelationships.push(rel);
  }

  // Limit memory
  if (db.channelRelationships.length > 20000) {
    db.channelRelationships = db.channelRelationships.slice(-15000);
  }
  writeIntelligenceDatabase(db);
}

export function getStoredRelationships(sourceChannelId: string): ChannelRelationship[] {
  const db = readIntelligenceDatabase();
  return db.channelRelationships
    .filter((r) => r.sourceChannelId === sourceChannelId)
    .sort((a, b) => b.similarityScore - a.similarityScore);
}

// ----------------------------------------------------------------------------
// 5. Scheduled Tasks & Worker Queue
// ----------------------------------------------------------------------------
export function enqueueTask(
  taskType: ScheduledTask["taskType"],
  priority: ScheduledTask["priority"],
  payload: Record<string, any>
): ScheduledTask {
  const db = readIntelligenceDatabase();
  const task: ScheduledTask = {
    id: uuidv4(),
    taskType,
    priority,
    payload,
    status: "queued",
    scheduledFor: new Date().toISOString(),
    retryCount: 0,
  };

  db.scheduledTasks.push(task);
  writeIntelligenceDatabase(db);
  return task;
}

export function getNextPendingTask(): ScheduledTask | null {
  const db = readIntelligenceDatabase();
  const priorityOrder = { high: 1, medium: 2, low: 3 };

  const pending = db.scheduledTasks
    .filter((t) => t.status === "queued")
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return pending[0] || null;
}

export function updateTaskStatus(
  taskId: string,
  status: ScheduledTask["status"],
  error?: string
): void {
  const db = readIntelligenceDatabase();
  const task = db.scheduledTasks.find((t) => t.id === taskId);
  if (task) {
    task.status = status;
    if (status === "running") task.startedAt = new Date().toISOString();
    if (status === "completed" || status === "failed" || status === "skipped_quota") {
      task.completedAt = new Date().toISOString();
    }
    if (error) task.error = error;
    writeIntelligenceDatabase(db);
  }
}

export function getDiscoverySeeds(): DiscoveryTopicSeed[] {
  const db = readIntelligenceDatabase();
  return db.discoverySeeds;
}

export function bulkUpsertUnifiedData(
  channels: (Partial<UnifiedChannelRecord> & { id: string; name: string })[],
  videos: (Partial<UnifiedVideoRecord> & { id: string; channelId: string; title: string })[]
): void {
  try {
    const db = readIntelligenceDatabase();
    const now = new Date().toISOString();

    for (const channel of channels) {
      const canonicalId = channel.id;
      const existing = db.channels[canonicalId];
      let priority = 10;
      if (channel.isTracked || existing?.isTracked) priority += 50;
      if ((channel.subscriberCount ?? existing?.subscriberCount ?? 0) > 100000) priority += 20;

      db.channels[canonicalId] = {
        id: canonicalId,
        name: channel.name || existing?.name || "YouTube Creator",
        handle: channel.handle || existing?.handle || "",
        description: channel.description ?? existing?.description ?? "",
        thumbnailUrl: channel.thumbnailUrl || channel.avatarUrl || existing?.thumbnailUrl || "",
        avatarUrl: channel.avatarUrl || channel.thumbnailUrl || existing?.avatarUrl || "",
        bannerUrl: channel.bannerUrl || existing?.bannerUrl,
        country: channel.country || existing?.country,
        defaultLanguage: channel.defaultLanguage || existing?.defaultLanguage,
        publishedAt: channel.publishedAt || existing?.publishedAt,
        subscriberCount: channel.subscriberCount ?? existing?.subscriberCount ?? -1,
        totalViews: channel.totalViews ?? existing?.totalViews ?? 0,
        videoCount: channel.videoCount ?? existing?.videoCount ?? 0,
        lastMetadataRefresh: now,
        lastVideoDiscovery: channel.lastVideoDiscovery || existing?.lastVideoDiscovery || now,
        lastAnalyzedDate: channel.lastAnalyzedDate || existing?.lastAnalyzedDate || now,
        discoverySource: channel.discoverySource || existing?.discoverySource || "user_search",
        discoveryStatus: "active",
        confidenceScore: channel.confidenceScore || existing?.confidenceScore || "high",
        refreshPriorityScore: priority,
        isTracked: Boolean(channel.isTracked ?? existing?.isTracked ?? false),
      };
    }

    for (const video of videos) {
      const vid = video.id;
      const existing = db.videos[vid];
      db.videos[vid] = {
        id: vid,
        channelId: video.channelId,
        title: video.title,
        description: video.description ?? existing?.description ?? "",
        publishedAt: video.publishedAt || existing?.publishedAt || now,
        durationFormatted: video.durationFormatted || existing?.durationFormatted || "00:00",
        durationSeconds: video.durationSeconds ?? existing?.durationSeconds ?? 0,
        thumbnailUrl: video.thumbnailUrl || existing?.thumbnailUrl || "",
        viewCount: video.viewCount ?? existing?.viewCount ?? 0,
        likeCount: video.likeCount ?? existing?.likeCount,
        commentCount: video.commentCount ?? existing?.commentCount,
        categoryName: video.categoryName || existing?.categoryName,
        categoryId: video.categoryId || existing?.categoryId,
        language: video.language || existing?.language,
        isShort: video.isShort ?? existing?.isShort ?? false,
        firstDiscoveredAt: existing?.firstDiscoveredAt || now,
        lastMetadataRefresh: now,
        discoveryKeywords: Array.from(
          new Set([...(existing?.discoveryKeywords || []), ...(video.discoveryKeywords || [])])
        ),
        processingStatus: "analyzed",
        viewsPerDay: video.viewsPerDay ?? existing?.viewsPerDay ?? 0,
        baselineViews: video.baselineViews ?? existing?.baselineViews ?? 1000,
        outlierMultiplier: video.outlierMultiplier ?? existing?.outlierMultiplier ?? 1.0,
        outlierClassification: video.outlierClassification || existing?.outlierClassification || "normal",
        outlierReliability: video.outlierReliability || existing?.outlierReliability || "verified",
      };
    }

    writeIntelligenceDatabase(db);
  } catch (err) {
    console.error("Bulk upsert error:", err);
  }
}

export function updateDiscoverySeedStats(
  seedId: string,
  newChannels: number,
  newVideos: number
): void {
  const db = readIntelligenceDatabase();
  const seed = db.discoverySeeds.find((s) => s.id === seedId);
  if (seed) {
    seed.channelsDiscoveredCount += newChannels;
    seed.videosDiscoveredCount += newVideos;
    seed.lastCrawledAt = new Date().toISOString();
    writeIntelligenceDatabase(db);
  }
}
