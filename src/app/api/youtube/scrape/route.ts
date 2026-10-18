import { NextRequest, NextResponse } from "next/server";
import { scrapeChannelRss, scrapeInnerTubeSearch } from "@/lib/youtube-scraper";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const query = searchParams.get("q");

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

    // Mode 2: InnerTube Zero-Quota Free Search
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
