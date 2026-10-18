export interface ChannelSearchResult {
  id: string;
  title: string;
  customUrl?: string;
  description: string;
  thumbnail: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
  hiddenSubscriberCount?: boolean;
}

export interface ChannelDetail {
  id: string;
  title: string;
  customUrl?: string;
  description: string;
  publishedAt: string;
  country?: string;
  avatar: string;
  banner?: string;
  subscriberCount?: number;
  hiddenSubscriberCount?: boolean;
  videoCount: number;
  viewCount: number;
  uploadsPlaylistId?: string;
  detectedEmails?: string[];
}

export interface RecentVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  duration?: string;
  durationFormatted?: string;
  durationSeconds?: number;
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  outlierMultiplier?: number;
}

export interface SponsorDetection {
  sponsorName: string;
  sponsorUrl?: string;
  sponsorEmail?: string;
  confidence: "high" | "medium";
  timeCode?: string; // ex: "14:27 - 15:04"
  startSeconds?: number;
  endSeconds?: number;
  durationSeconds?: number;
  contextSnippet: string;
  category?: string;
}

export interface VideoSponsorReport {
  videoId: string;
  videoTitle: string;
  videoThumbnail: string;
  publishedAt: string;
  viewCount: number;
  durationFormatted?: string;
  sponsors: SponsorDetection[];
  extractedEmails: string[];
}

export interface SavedChannelLead {
  id: string;
  title: string;
  customUrl?: string;
  avatar: string;
  subscriberCount?: number;
  avgViews?: number;
  status: "identified" | "contacted" | "negotiating" | "signed" | "rejected";
  notes?: string;
  email?: string;
  savedAt: string;
}
