export interface NicheSearchParams {
  query: string;
  // Channel filters
  minSubs?: number;
  maxSubs?: number;
  channelSize?: "all" | "small" | "medium" | "large";
  country?: string;
  // Video filters
  minViews?: number;
  maxViews?: number;
  period?: "24h" | "7d" | "30d" | "90d" | "all";
  duration?: "all" | "long" | "short";
  includeKeywords?: string;
  excludeKeywords?: string;
  // Sorting & pagination
  sortBy?: "outlierScore" | "views" | "date" | "subscribers" | "viewsPerDay";
  pageToken?: string;
  maxResults?: number;
}

export interface OutlierVideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  durationFormatted: string;
  durationSeconds: number;
  isShort: boolean;
  viewsPerDay: number;
  
  // Channel context
  channel: {
    id: string;
    title: string;
    handle: string;
    avatar: string;
    subscribers: number;
    videoCount: number;
    totalViews: number;
    country?: string;
    publishedAt?: string;
    isSmallChannel: boolean;
  };

  // Outlier Analytics
  outlier: {
    ratio: number; // e.g. 14.5x
    classification: "under" | "normal" | "breakout" | "high_outlier" | "extreme_outlier";
    classificationLabel: string;
    baselineViews: number; // Median of channel's typical videos
    sampleSize: number;
    reliability: "verified" | "estimated" | "insufficient_data";
  };

  // Monetization & Potential
  monetization: {
    estimatedRPM: number; // in USD
    estimatedRevenue: number;
    nicheCategory: string;
  };
}

export interface NicheSearchResponse {
  query: string;
  totalFound: number;
  resultsCount: number;
  nextPageToken?: string;
  prevPageToken?: string;
  items: OutlierVideoItem[];
  aggregates: {
    avgOutlierRatio: number;
    topNicheKeywords: string[];
    topOpportunityScore: number;
    smallChannelsRatio: number;
  };
  freshnessTimestamp: string;
}
