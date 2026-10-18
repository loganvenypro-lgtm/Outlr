import { NextRequest, NextResponse } from "next/server";
import { 
  queryThumbnailGallery, 
  recordVideoObservation, 
  readThumbnailDatabase, 
  writeThumbnailDatabase,
  seedVerifiedHistoricalData 
} from "@/lib/thumbnailIntelligenceService";
import { ThumbnailFilterParams } from "@/types/thumbnailIntelligence";
import { getRecentVideos } from "@/lib/youtube";

export const dynamic = "force-dynamic";

/**
 * GET: Retrieve paginated thumbnail & title changes gallery with multi-criteria filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Auto-seed initial historical variations if needed
    seedVerifiedHistoricalData();

    const videoId = searchParams.get("videoId");
    if (videoId) {
      const db = readThumbnailDatabase();
      const video = db.monitoredVideos[videoId];
      if (!video) {
        return NextResponse.json({ error: "Vidéo surveillée introuvable" }, { status: 404 });
      }
      return NextResponse.json({ video });
    }

    const filters: ThumbnailFilterParams = {
      query: searchParams.get("query") || undefined,
      channelId: searchParams.get("channelId") || undefined,
      nicheCategory: searchParams.get("niche") || undefined,
      classification: (searchParams.get("classification") as any) || "all",
      changeType: (searchParams.get("changeType") as any) || "all",
      minChanges: searchParams.get("minChanges") ? parseInt(searchParams.get("minChanges")!, 10) : undefined,
      minViews: searchParams.get("minViews") ? parseInt(searchParams.get("minViews")!, 10) : undefined,
      minSubs: searchParams.get("minSubs") ? parseInt(searchParams.get("minSubs")!, 10) : undefined,
      maxSubs: searchParams.get("maxSubs") ? parseInt(searchParams.get("maxSubs")!, 10) : undefined,
      sortBy: (searchParams.get("sortBy") as any) || "recent_change",
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 18,
    };

    const galleryData = queryThumbnailGallery(filters);
    return NextResponse.json(galleryData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load thumbnail intelligence" }, { status: 500 });
  }
}

/**
 * POST: Track channel/video for thumbnail intelligence or trigger a scan cycle
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "scan_channel";

    // 1. Scan channel uploads for thumbnail changes
    if (action === "scan_channel") {
      const { channelId, uploadsPlaylistId, channelName, avatar, subs } = body;
      if (!uploadsPlaylistId) {
        return NextResponse.json({ error: "uploadsPlaylistId requis" }, { status: 400 });
      }

      // Fetch top 30 uploads
      const videos = await getRecentVideos(uploadsPlaylistId, 30);
      let changesDetected = 0;

      for (const v of videos) {
        const { isNewChange } = recordVideoObservation({
          id: v.id,
          title: v.title,
          thumbnailUrl: v.thumbnail,
          channelId: channelId || "UC_tracked",
          channelTitle: channelName || "Creator",
          channelAvatar: avatar,
          channelSubscriberCount: subs,
          publishedAt: v.publishedAt,
          viewCount: v.viewCount,
          likeCount: v.likeCount,
          commentCount: v.commentCount,
        });

        if (isNewChange) changesDetected++;
      }

      return NextResponse.json({
        success: true,
        scannedCount: videos.length,
        changesDetected,
        message: `${videos.length} vidéos scannées avec succès (${changesDetected} changements enregistrés).`,
      });
    }

    // 2. Track / Untrack video explicitly
    if (action === "toggle_monitor_video") {
      const { videoId, isMonitored } = body;
      const db = readThumbnailDatabase();
      if (db.monitoredVideos[videoId]) {
        db.monitoredVideos[videoId].isMonitoredExplicitly = Boolean(isMonitored);
        writeThumbnailDatabase(db);
      }
      return NextResponse.json({ success: true, isMonitored });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur de traitement" }, { status: 500 });
  }
}
