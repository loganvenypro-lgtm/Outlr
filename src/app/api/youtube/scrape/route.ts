import { NextRequest, NextResponse } from "next/server";
import {
  scrapeChannelRss,
  scrapeInnerTubeSearch,
  scrapeRecentViralVideos,
} from "@/lib/youtube-scraper";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const query = searchParams.get("q");
    const mode = searchParams.get("mode");
    const period = searchParams.get("period") || "7d";

    // Mode 1: Real-time RSS Feed Scraper for a Channel
    if (channelId && channelId.trim()) {
      const videos = await scrapeChannelRss(channelId.trim());
      return NextResponse.json({
        type: "channel_rss",
        channelId: channelId.trim(),
        total: videos.length,
        videos,
      });
    }

    // Mode 2: recent viral InnerTube search (this week / month, sorted by views)
    if (query && query.trim() && (mode === "viral" || mode === "recent")) {
      const videos = await scrapeRecentViralVideos(query.trim(), { period, maxPages: 2 });
      return NextResponse.json({
        type: "recent_viral",
        query: query.trim(),
        period,
        videosCount: videos.length,
        videos,
      });
    }

    // Mode 3: InnerTube Zero-Quota Free Search
    if (query && query.trim()) {
      const results = await scrapeInnerTubeSearch(query.trim());
      return NextResponse.json({
        type: "innertube_search",
        query: query.trim(),
        channelsCount: results.channels.length,
        videosCount: results.videos.length,
        channels: results.channels,
        videos: results.videos,
      });
    }

    return NextResponse.json(
      { error: "Provide either ?channelId=UC... or ?q=search_term" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Error in /api/youtube/scrape:", err);
    return NextResponse.json(
      { error: err.message || "Failed to scrape YouTube data" },
      { status: 500 }
    );
  }
}
