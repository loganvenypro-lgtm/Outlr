import { NextRequest, NextResponse } from "next/server";
import { getRecentVideos, getAllChannelVideos } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let uploadsPlaylistId = searchParams.get("playlistId");
    const channelId = searchParams.get("channelId");
    const isAll = searchParams.get("all") === "true" || searchParams.get("limit") === "all";
    const windowParam = (searchParams.get("window") as "12m" | "24m" | "lifetime") || "12m";
    const rawLimit = searchParams.get("limit");
    const limit = isAll
      ? 2500
      : rawLimit && rawLimit !== "all"
      ? parseInt(rawLimit, 10)
      : 50;

    if ((!uploadsPlaylistId || uploadsPlaylistId.trim() === "") && channelId) {
      uploadsPlaylistId = channelId.startsWith("UC") ? "UU" + channelId.substring(2) : channelId;
    }

    if (!uploadsPlaylistId || uploadsPlaylistId.trim() === "") {
      return NextResponse.json({ error: "Uploads playlistId or channelId is required" }, { status: 400 });
    }

    // If requesting all videos or more than 50, use the deep paginator
    if (isAll || limit > 50) {
      const result = await getAllChannelVideos(uploadsPlaylistId.trim(), limit, windowParam);
      return NextResponse.json({
        videos: result.videos,
        totalAvailable: result.totalAvailable,
        totalCount: result.videos.length,
        medianViews: result.medianViews,
        medianStats: result.medianStats,
        firstUploadDate: result.firstUploadDate,
        fromCache: result.fromCache,
        isAllLoaded: isAll || result.videos.length >= result.totalAvailable,
      });
    }

    // Standard fast response for initial page load
    const videos = await getRecentVideos(uploadsPlaylistId.trim(), limit);
    return NextResponse.json({ videos, totalCount: videos.length });
  } catch (err: any) {
    console.error("Error in videos API route:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load channel videos" },
      { status: 500 }
    );
  }
}
