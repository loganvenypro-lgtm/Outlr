export type SearchDepth = "quick" | "deep" | "extended" | "max";

export interface SearchJobProgress {
  jobId: string;
  query: string;
  depth: SearchDepth;
  status: "queued" | "running" | "completed" | "partially_completed" | "failed" | "cancelled";
  step: "generating_queries" | "exploring_youtube" | "deduplicating" | "enriching_stats" | "calculating_outliers" | "finalizing" | "done";
  message: string;
  
  // Real Counters from Pipeline
  targetVideoCount: number;
  queriesGenerated: string[];
  queriesExecutedCount: number;
  rawDiscoveredCount: number;
  uniqueVideosCount: number;
  enrichedVideosCount: number;
  reliableOutliersCount: number;
  quotaUnitsUsed: number;

  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface DiscoveredVideoRecord {
  id: string; // YouTube Video ID
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  channelAvatar: string;
  channelSubscribers: number;
  channelTotalViews: number;
  channelVideoCount: number;
  
  // Metrics
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  durationFormatted: string;
  durationSeconds: number;
  isShort: boolean;
  viewsPerDay: number;
  engagementRate?: number; // (likes + comments) / views * 100
  viralRatio?: number; // views / subscribers
  
  // Relevance & Outlier
  relevanceScore: number; // 0 - 100
  outlierMultiplier: number;
  baselineViews: number;
  outlierReliability: "verified" | "estimated" | "insufficient_data";
  outlierClassification: "under" | "normal" | "breakout" | "high_outlier" | "extreme_outlier";
  
  // Multi-Channel Validated Pattern
  isValidatedBreakoutTopic?: boolean;
  breakoutTopicLabel?: string;

  // Discovery tracking
  foundViaQuery: string;
  discoveredAt: string;
}

export interface NicheSaturationAssessment {
  level: "blue_ocean" | "competitive" | "saturated";
  label: string;
  score: number; // 0 - 100 (100 = Océan Bleu, 0 = Saturé)
  description: string;
  totalViews: number;
  distinctCreators: number;
  viewsPerCreator: number;
  smallChannelsBreakoutRate: number; // % of small channels with > 2.5x multiplier
}

export interface ValidatedBreakoutTopic {
  topic: string;
  distinctChannelsCount: number;
  avgMultiplier: number;
  topVideoTitle: string;
  topVideoId: string;
  sampleChannels: string[];
}

export interface DiscoveryJobResult {
  job: SearchJobProgress;
  videos: DiscoveredVideoRecord[];
  totalAvailable: number;
  aggregates: {
    avgViews: number;
    medianViews: number;
    avgOutlier: number;
    smallChannelsRatio: number; // percentage of channels <= 100k
    topKeywords: string[];
    saturationScore?: NicheSaturationAssessment;
    validatedBreakoutTopics?: ValidatedBreakoutTopic[];
  };
}
