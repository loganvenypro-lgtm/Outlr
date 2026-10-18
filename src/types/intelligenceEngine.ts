/**
 * Types for NewIQ Continuous YouTube Data Intelligence Engine
 * Unified persistent data schema, historical snapshots, channel DNA, quota management and scheduler.
 */

export interface UnifiedChannelRecord {
  // Canonical YouTube channel ID as the unique identifier
  id: string; // "UC..."
  name: string;
  handle?: string;
  description: string;
  thumbnailUrl: string;
  avatarUrl: string;
  bannerUrl?: string;
  country?: string;
  defaultLanguage?: string;
  publishedAt?: string; // Channel creation date
  
  // Public statistics
  subscriberCount: number; // -1 if hidden
  totalViews: number;
  videoCount: number;
  
  // Refresh & Discovery tracking
  lastMetadataRefresh: string; // ISO
  lastVideoDiscovery: string;   // ISO
  lastAnalyzedDate: string;     // ISO
  discoverySource: "user_search" | "similar_expansion" | "topic_crawler" | "channel_tracking" | "system_seed";
  discoveryStatus: "active" | "stale" | "pending_enrichment" | "archived";
  confidenceScore: "high" | "medium" | "estimated";

  // Priority scoring for smart refresh scheduler
  refreshPriorityScore: number; // 0 - 100
  isTracked: boolean;
}

export interface UnifiedVideoRecord {
  // Canonical video ID as unique identifier
  id: string; // 11-char YouTube ID
  channelId: string; // Foreign key to UnifiedChannelRecord.id
  title: string;
  description: string;
  publishedAt: string;
  durationFormatted: string;
  durationSeconds: number;
  thumbnailUrl: string;
  
  // Public statistics
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  categoryName?: string;
  categoryId?: string;
  language?: string;
  isShort: boolean;

  // Timestamps & Processing
  firstDiscoveredAt: string;
  lastMetadataRefresh: string;
  discoveryKeywords: string[];
  processingStatus: "indexed" | "analyzed" | "pending";
  
  // Computed analytical fields
  viewsPerDay: number;
  baselineViews: number;
  outlierMultiplier: number;
  outlierClassification: "under" | "normal" | "breakout" | "high_outlier" | "extreme_outlier";
  outlierReliability: "verified" | "estimated" | "insufficient_data";
}

export interface ChannelSnapshot {
  id: string; // UUID
  channelId: string;
  timestamp: string; // ISO
  subscriberCount: number;
  totalViews: number;
  videoCount: number;
  observedVia: "scheduled_refresh" | "user_request" | "tracker_sync";
}

export interface VideoSnapshot {
  id: string; // UUID
  videoId: string;
  channelId: string;
  timestamp: string; // ISO
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  velocityPerHour?: number;
}

export interface ChannelDnaProfile {
  channelId: string;
  primaryNiche: string;
  secondaryNiches: string[];
  contentPillars: string[];
  dominantVideoFormats: ("longform_essay" | "short_clips" | "documentary" | "reaction_review" | "tutorial_explainer")[];
  editorialCharacteristics: string[];
  language: string;
  representativeVideoIds: string[];
  classificationConfidence: number; // 0.0 to 1.0
  analysisVersion: string; // e.g. "v2.1"
  lastAnalysisDate: string;
  
  // Computed archetypes
  archetype: string;
  archetypeLabel: string;
  typicalViews: number;
  typicalDurationSeconds: number;
  uploadFrequencyDays: number;
}

export interface ChannelRelationship {
  sourceChannelId: string;
  targetChannelId: string;
  similarityScore: number; // 0 - 100
  relationshipType: "direct_competitor" | "niche_peer" | "format_twin" | "shared_audience";
  sharedTopics: string[];
  coOccurrenceCount: number;
  lastCalculated: string;
}

export interface QuotaUsageLog {
  date: string; // YYYY-MM-DD
  dailyLimit: number; // Default 10000 units
  unitsConsumed: number;
  unitsAvailable: number;
  callsByEndpoint: {
    "search.list": number; // 100 units per call
    "videos.list": number; // 1 unit per 50 videos
    "channels.list": number; // 1 unit per 50 channels
    "playlistItems.list": number; // 1 unit per call
  };
  lastResetAt: string;
}

export interface ScheduledTask {
  id: string;
  taskType: "refresh_tracked_channels" | "crawl_topic_niche" | "expand_channel_competitors" | "snapshot_velocity";
  priority: "high" | "medium" | "low";
  payload: Record<string, any>;
  status: "queued" | "running" | "completed" | "failed" | "skipped_quota";
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
}

export interface DiscoveryTopicSeed {
  id: string;
  topic: string;
  category: string;
  subKeywords: string[];
  lastCrawledAt?: string;
  channelsDiscoveredCount: number;
  videosDiscoveredCount: number;
  priority: number;
}

export interface PersistentIntelligenceSchema {
  version: string;
  channels: Record<string, UnifiedChannelRecord>; // Keyed by Canonical UC...
  videos: Record<string, UnifiedVideoRecord>;     // Keyed by YouTube Video ID
  channelSnapshots: ChannelSnapshot[];
  videoSnapshots: VideoSnapshot[];
  channelDna: Record<string, ChannelDnaProfile>;  // Keyed by UC...
  channelRelationships: ChannelRelationship[];
  quotaLog: QuotaUsageLog;
  scheduledTasks: ScheduledTask[];
  discoverySeeds: DiscoveryTopicSeed[];
}
