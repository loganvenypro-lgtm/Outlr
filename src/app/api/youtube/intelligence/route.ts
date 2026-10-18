import { NextRequest, NextResponse } from "next/server";
import { 
  readIntelligenceDatabase, 
  QuotaManager, 
  enqueueTask,
  getDiscoverySeeds 
} from "@/lib/intelligenceDb";
import { ContinuousIntelligenceService } from "@/lib/continuousIntelligenceService";

export const dynamic = "force-dynamic";

/**
 * GET: System overview of the continuous intelligence engine
 * - Returns database size, channel count, video count, historical snapshots count
 * - Returns YouTube API daily quota status (units consumed, units available, breakdown)
 * - Returns active scheduled tasks and topic discovery seeds
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Fast search in stored database (0 API quota units)
    if (action === "search") {
      const q = searchParams.get("q") || "";
      const minViews = searchParams.get("minViews") ? parseInt(searchParams.get("minViews")!, 10) : undefined;
      const minOutlier = searchParams.get("minOutlier") ? parseFloat(searchParams.get("minOutlier")!) : undefined;
      const format = (searchParams.get("format") as any) || "all";

      const results = ContinuousIntelligenceService.searchStoredVideos({
        query: q,
        minViews,
        minOutlier,
        format,
        limit: 50,
      });

      return NextResponse.json({
        query: q,
        totalInDb: results.length,
        source: "persistent_intelligence_database",
        quotaUsed: 0,
        videos: results,
      });
    }

    const db = readIntelligenceDatabase();
    const quota = QuotaManager.getQuotaStatus();
    const channelKeys = Object.keys(db.channels);
    const videoKeys = Object.keys(db.videos);

    const stats = {
      totalChannelsIndexed: channelKeys.length,
      totalVideosIndexed: videoKeys.length,
      totalChannelSnapshots: db.channelSnapshots.length,
      totalVideoSnapshots: db.videoSnapshots.length,
      totalDnaProfiles: Object.keys(db.channelDna).length,
      totalRelationships: db.channelRelationships.length,
      trackedChannelsCount: Object.values(db.channels).filter((c) => c.isTracked).length,
      quotaStatus: {
        date: quota.date,
        dailyLimit: quota.dailyLimit,
        unitsConsumed: quota.unitsConsumed,
        unitsAvailable: quota.unitsAvailable,
        percentRemaining: Math.round((quota.unitsAvailable / Math.max(quota.dailyLimit, 1)) * 100),
        callsByEndpoint: quota.callsByEndpoint,
      },
      scheduledTasksCount: db.scheduledTasks.length,
      pendingTasksCount: db.scheduledTasks.filter((t) => t.status === "queued").length,
      discoverySeeds: db.discoverySeeds,
    };

    return NextResponse.json({
      status: "operational",
      version: db.version,
      stats,
      recentChannels: Object.values(db.channels).slice(-8).reverse(),
      recentTasks: db.scheduledTasks.slice(-10).reverse(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load intelligence stats" }, { status: 500 });
  }
}

/**
 * POST: Trigger background intelligence jobs or smart crawler tasks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "process_task";

    // 1. Process next pending scheduled worker task
    if (action === "process_task") {
      const outcome = await ContinuousIntelligenceService.processNextScheduledTask();
      return NextResponse.json({ success: true, outcome });
    }

    // 2. Schedule a topic crawler job
    if (action === "crawl_topic") {
      const seedId = body.seedId || "seed-docu";
      const task = enqueueTask("crawl_topic_niche", "medium", { seedId });
      return NextResponse.json({ success: true, task });
    }

    // 3. Refresh tracked channels batch
    if (action === "refresh_tracked") {
      const task = enqueueTask("refresh_tracked_channels", "high", {});
      return NextResponse.json({ success: true, task });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to execute intelligence action" }, { status: 500 });
  }
}
