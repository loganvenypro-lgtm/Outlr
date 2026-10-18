import { ChannelDetail, RecentVideo } from "./youtube";

export interface ChannelProfile {
  id: string;
  title: string;
  handle: string;
  avatar: string;
  banner?: string;
  description: string;
  publishedAt: string;
  country?: string;
  subscriberCount: number;
  totalViews: number;
  videoCount: number;
  uploadsPlaylistId?: string;
  recentVideos: RecentVideo[];
  dominantKeywords: string[];
  estimatedFormat: {
    avgDurationSeconds: number;
    avgDurationFormatted: string;
    shortsRatio: number; // 0 to 1
    typicalViews: number;
  };
}

export interface SimilarityBreakdown {
  thematicScore: number;   // 0 - 100 (weight 40%)
  titlesScore: number;     // 0 - 100 (weight 25%)
  formatScore: number;     // 0 - 100 (weight 15%)
  audienceScore: number;   // 0 - 100 (weight 10%)
  performanceScore: number;// 0 - 100 (weight 10%)
  sharedKeywords: string[];
}

export interface SimilarChannelCandidate {
  channel: {
    id: string;
    title: string;
    handle: string;
    avatar: string;
    description: string;
    country?: string;
    publishedAt?: string;
    subscriberCount: number;
    totalViews: number;
    videoCount: number;
    typicalViews: number;
  };
  similarityScore: number; // 0 - 100 normalized
  similarityBreakdown: SimilarityBreakdown;
  topSimilarVideos: {
    id: string;
    title: string;
    thumbnail: string;
    publishedAt: string;
    views: number;
    durationFormatted: string;
  }[];
  discoveryMethod: "thematic_search" | "video_similarity" | "related_creators" | "database_cache";
}

export interface SimilarChannelsResponse {
  reference: ChannelProfile;
  candidates: SimilarChannelCandidate[];
  totalEvaluated: number;
  dominantThemes: string[];
  executionTimeMs: number;
}
