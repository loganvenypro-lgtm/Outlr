export interface VideoTitleHistory {
  title: string;
  detectedAt?: string;
  isCurrent: boolean;
  type: "Initial Upload Title" | "A/B Test Variant A" | "A/B Test Variant B" | "Optimized Final Title";
  ctrImpact?: string; // ex: "+24% CTR"
}

export interface VideoThumbnailHistory {
  url: string;
  label: string;
  detectedAt?: string;
  isCurrent: boolean;
  score?: number;
  tag?: string; // e.g. "Gagnante A/B", "Variation A", "Cadre 0s (Lancement)", "Cadrage 2"
}

export interface VideoVelocityStats {
  views24hEstimated: number; // Views gathered in first 24h
  views7dEstimated: number;  // Views gathered in first 7 days
  currentVelocityPerHour: number; // Current views / hr
  totalViews: number;
  engagementRate: number; // (likes + comments) / views %
  likeRatio: number; // likes / views %
  commentRatio: number; // comments / views %
  daysSincePublication: number;
}

export interface VideoDetailCardData {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  publishedFormatted: string;
  thumbnail: string;
  durationFormatted: string;
  durationSeconds: number;
  isShort: boolean;
  categoryName: string;
  tags: string[];

  // Statistics
  viewCount: number;
  likeCount: number;
  commentCount: number;
  
  // Velocity & 24h metrics
  velocity: VideoVelocityStats;

  // A/B Test Intelligence (Simulated and tracked changes)
  abTestHistory: {
    hasAbTestDetected: boolean;
    confidenceScore: number;
    titleHistory: VideoTitleHistory[];
    thumbnailHistory: VideoThumbnailHistory[];
    insights: string[];
  };

  // SEO & Packaging Score
  packaging: {
    overallScore: number; // 0 - 100
    titlePowerWords: string[];
    characterCount: number;
    isOptimalLength: boolean;
    hookStyle: string;
  };
}
