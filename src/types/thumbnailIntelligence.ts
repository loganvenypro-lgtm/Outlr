/**
 * Types for NewIQ Thumbnail & Title Intelligence Engine
 * Inspired by Viewstats' tracking capabilities, recording verified historical versions,
 * A/B test classifications, and performance delta before/after changes.
 */

export type AbTestClassification =
  | "confirmed_ab_test"   // Explicit, verified experiment
  | "probable_ab_test"    // Multiple variants in short interval or alternating patterns
  | "observed_change"     // Sequential title or thumbnail change without definitive test proof
  | "insufficient_data";  // Not enough observation points to conclude

export type ChangeDetectionType = "thumbnail" | "title" | "both";

export interface PublicVideoMetricsSnapshot {
  timestamp: string;      // ISO observation time
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  estimatedVelocityPerHour?: number;
}

export interface HistoricalVideoVersion {
  id: string; // UUID of version
  versionNumber: number; // 1 = initial launch version, 2 = 1st change, etc.
  title: string;
  thumbnailUrl: string;
  thumbnailHash?: string; // Content hash (e.g. SHA-256 or perceptual hash)
  
  // Observation interval
  firstObservedAt: string; // ISO
  lastObservedAt: string;  // ISO
  
  // What triggered this version
  changeType: "initial_discovery" | "title_change" | "thumbnail_change" | "both_changed";
  confidenceLevel: "verified_snapshot" | "inferred_interval";
  
  // Public metrics associated with this version
  metricsSnapshot: PublicVideoMetricsSnapshot;
  
  // Performance during this version's active window
  viewsGainedDuringWindow?: number;
  durationHoursActive?: number;
  avgViewsGainedPerHour?: number;
}

export interface MonitoredTrackedVideo {
  id: string; // YouTube Video ID (11 chars)
  channelId: string;
  channelTitle: string;
  channelAvatar: string;
  channelSubscriberCount: number;
  publishedAt: string;
  
  // Current Live State
  currentTitle: string;
  currentThumbnailUrl: string;
  currentViewCount: number;
  currentLikeCount?: number;
  currentCommentCount?: number;
  
  // Historical versions timeline
  versions: HistoricalVideoVersion[];
  
  // Summary counters
  totalTitleChangesObserved: number;
  totalThumbnailChangesObserved: number;
  totalChangesObserved: number;
  firstDiscoveredAt: string;
  lastObservedAt: string;
  lastChangeDetectedAt?: string;
  
  // A/B Test Detection Engine Assessment
  abTestClassification: AbTestClassification;
  abTestConfidenceScore: number; // 0 to 100
  abTestEvidence: string[];
  uncertaintyReasons: string[];
  evidenceSource: "youtube_frame_fingerprint" | "multi_snapshot_series" | "creator_integration" | "title_semantic_shift";
  
  // Performance Analysis before & after latest change
  performanceAnalysis?: {
    preChangeWindowHours: number;
    preChangeViewsGained: number;
    preChangeViewsPerHour: number;
    postChangeWindowHours: number;
    postChangeViewsGained: number;
    postChangeViewsPerHour: number;
    velocityDeltaPercent: number; // e.g. +34.5%
    summaryVerdict: "significant_acceleration" | "slight_improvement" | "neutral" | "deceleration" | "insufficient_snapshots";
  };
  
  // Category / Niche
  nicheCategory?: string;
  isMonitoredExplicitly: boolean;
}

export interface ThumbnailIntelligenceOverview {
  totalVideosTracked: number;
  totalVideosWithChanges: number;
  totalThumbnailChangesRecorded: number;
  totalTitleChangesRecorded: number;
  probableAbTestsCount: number;
  confirmedAbTestsCount: number;
  lastScanTimestamp: string;
  nextScheduledScan: string;
}

export interface ThumbnailFilterParams {
  query?: string;
  channelId?: string;
  nicheCategory?: string;
  changeType?: "all" | "thumbnail_only" | "title_only" | "both";
  classification?: "all" | "confirmed_ab_test" | "probable_ab_test" | "observed_change";
  minChanges?: number;
  minViews?: number;
  minSubs?: number;
  maxSubs?: number;
  sortBy?: "recent_change" | "most_views" | "most_changes" | "newest_discovered";
  page?: number;
  limit?: number;
}
