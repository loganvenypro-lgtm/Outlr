export interface Folder {
  id: string;
  name: string;
  color?: string; // e.g. blue, emerald, amber, purple, rose
  description?: string;
  createdAt: string;
}

export interface TrackedChannel {
  id: string; // internal UUID
  channelId: string; // YouTube Channel ID UC...
  name: string;
  handle: string;
  avatar: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  folderId?: string; // ID of the folder or undefined (uncategorized)
  tags: string[];
  notes?: string;
  baselineViews: number; // Median or typical views
  lastCheckedAt: string;
  addedAt: string;
  recentUploadsCount: number;
}

export interface ChannelAlert {
  id: string;
  channelId: string;
  channelName: string;
  channelAvatar: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string;
  publishedAt: string;
  views: number;
  baselineViews: number;
  outlierMultiplier: number;
  alertType: "breakout_video" | "high_velocity" | "subscriber_milestone" | "new_upload";
  severity: "high" | "medium" | "info";
  message: string;
  createdAt: string;
  isRead: boolean;
}

export interface TrackingOverviewResponse {
  folders: Folder[];
  channels: TrackedChannel[];
  alerts: ChannelAlert[];
  recentPerformers: {
    video: {
      id: string;
      title: string;
      thumbnail: string;
      publishedAt: string;
      views: number;
      durationFormatted: string;
      outlierMultiplier: number;
    };
    channel: {
      id: string;
      name: string;
      avatar: string;
      handle: string;
    };
  }[];
  stats: {
    totalTrackedChannels: number;
    totalAlertsCount: number;
    unreadAlertsCount: number;
    activeFoldersCount: number;
  };
}
