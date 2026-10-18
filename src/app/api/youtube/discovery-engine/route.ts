import { NextRequest, NextResponse } from "next/server";
import { 
  runDeepDiscoveryPipeline, 
  getJobProgress, 
  getJobResults 
} from "@/lib/deepDiscoveryService";
import { SearchDepth } from "@/types/discoveryEngine";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Autorise jusqu'à 60 secondes de crawl sur Vercel Pro / fluidité en production

/**
 * GET: Poll search job progress or retrieve results with server-side filtering & pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ error: "jobId requis" }, { status: 400 });
    }

    let job = getJobProgress(jobId);
    if (!job) {
      // Pour éviter les faux 404 lors des cold starts Vercel / multi-instances,
      // on renvoie un état initialisé pour laisser le temps au worker de synchroniser
      return NextResponse.json({
        job: {
          jobId,
          depth: "deep",
          status: "running",
          step: "exploring_youtube",
          message: "Initialisation et exploration YouTube en cours...",
          targetVideoCount: 100,
          queriesGenerated: [],
          queriesExecutedCount: 0,
          rawDiscoveredCount: 0,
          uniqueVideosCount: 0,
          enrichedVideosCount: 0,
          reliableOutliersCount: 0,
          quotaUnitsUsed: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        videos: [],
        total: 0,
      });
    }

    // Fetch available results (including progressive results while running)
    const allVideos = getJobResults(jobId);

    // If job is queued with no videos yet, return empty immediately
    if (job.status === "queued" && allVideos.length === 0) {
      return NextResponse.json({ job, videos: [], total: 0 });
    }

    // Filters
    const format = searchParams.get("format"); // "long" | "shorts" | "all"
    const period = searchParams.get("period"); // "all" | "24h" | "7d" | "30d" | "90d" | "1y"
    const minViews = searchParams.get("minViews") ? parseInt(searchParams.get("minViews")!, 10) : 0;
    const maxSubs = searchParams.get("maxSubs") ? parseInt(searchParams.get("maxSubs")!, 10) : 0;
    const minOutlier = searchParams.get("minOutlier") ? parseFloat(searchParams.get("minOutlier")!) : 0;
    const sortBy = searchParams.get("sortBy") || "viral_ratio"; // "viral_ratio" | "outlier" | "vpd" | "views" | "date" | "relevance"
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);
    const searchFilter = searchParams.get("searchFilter")?.toLowerCase() || "";

    const now = Date.now();
    let maxAgeDays = Infinity;
    if (period === "24h") maxAgeDays = 1.2;
    else if (period === "7d") maxAgeDays = 7.5;
    else if (period === "30d") maxAgeDays = 31;
    else if (period === "90d") maxAgeDays = 92;
    else if (period === "1y") maxAgeDays = 366;

    let filtered = allVideos.filter((v) => {
      if (format === "long" && v.isShort) return false;
      if (format === "shorts" && !v.isShort) return false;
      if (minViews > 0 && v.viewCount < minViews) return false;
      if (maxSubs > 0 && v.channelSubscribers > 0 && v.channelSubscribers > maxSubs) return false;
      if (minOutlier > 0 && v.outlierMultiplier < minOutlier) return false;
      if (v.relevanceScore < 30) return false; // Filter out irrelevant/loose matches

      if (maxAgeDays !== Infinity && v.publishedAt) {
        const videoAgeDays = (now - new Date(v.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (videoAgeDays > maxAgeDays) return false;
      }

      if (searchFilter && !v.title.toLowerCase().includes(searchFilter) && !v.channelTitle.toLowerCase().includes(searchFilter)) {
        return false;
      }
      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === "outlier") return b.outlierMultiplier - a.outlierMultiplier;
      if (sortBy === "engagement") return (b.engagementRate || 0) - (a.engagementRate || 0);
      if (sortBy === "viral_ratio") {
        // Ratio of views to subscribers (viral reach for small channels)
        const ratioA = a.viralRatio || (a.channelSubscribers > 0 ? a.viewCount / a.channelSubscribers : a.viewCount / 1000);
        const ratioB = b.viralRatio || (b.channelSubscribers > 0 ? b.viewCount / b.channelSubscribers : b.viewCount / 1000);
        return ratioB - ratioA;
      }
      if (sortBy === "vpd") return (b.viewsPerDay || 0) - (a.viewsPerDay || 0);
      if (sortBy === "views") return b.viewCount - a.viewCount;
      if (sortBy === "date") return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      return b.relevanceScore - a.relevanceScore;
    });

    // Server-side pagination
    const startIndex = (page - 1) * limit;
    const paginatedVideos = filtered.slice(startIndex, startIndex + limit);

    // Compute Niche Saturation Assessment & Multi-Channel Breakouts from all videos
    const totalViewsSum = allVideos.reduce((acc, r) => acc + r.viewCount, 0);
    const distinctCreators = new Set(allVideos.map((r) => r.channelId)).size;
    const viewsPerCreator = Math.round(totalViewsSum / Math.max(distinctCreators, 1));

    const smallTotal = allVideos.filter((r) => r.channelSubscribers > 0 && r.channelSubscribers <= 100000).length;
    const smallOutliers = allVideos.filter(
      (r) => r.channelSubscribers > 0 && r.channelSubscribers <= 100000 && r.outlierMultiplier >= 2.5
    ).length;
    const smallChannelsBreakoutRate = smallTotal > 0 ? Math.round((smallOutliers / smallTotal) * 100) : 0;

    let saturationLevel: "blue_ocean" | "competitive" | "saturated" = "competitive";
    let saturationLabel = "🟡 Niche Compétitive";
    let saturationScore = 55;
    let saturationDesc = "Niveau de concurrence sain. Les concepts soignés et les titres à fort CTR percent régulièrement.";

    if (smallChannelsBreakoutRate >= 18 && viewsPerCreator >= 25000) {
      saturationLevel = "blue_ocean";
      saturationLabel = "🟢 Océan Bleu (Forte Demande Algorithmique)";
      saturationScore = 88;
      saturationDesc = "Très forte demande du public avec un taux élevé de percée pour les petites chaînes. Peu de barrières à l'entrée.";
    } else if (smallChannelsBreakoutRate < 8 || viewsPerCreator < 10000) {
      saturationLevel = "saturated";
      saturationLabel = "🔴 Niche Saturée";
      saturationScore = 24;
      saturationDesc = "Forte concurrence ou monopole de gros créateurs établis. Difficile de percer sans un packaging hors du commun.";
    }

    // Extract Multi-channel Breakout Topics from outliers
    const topicChannelMap = new Map<string, { channels: Set<string>; count: number; avgMult: number; topTitle: string; topId: string }>();
    allVideos.filter((v) => v.outlierMultiplier >= 2.0).forEach((v) => {
      const words = v.title.toLowerCase().replace(/[^\w\s\u00C0-\u00FF]/g, " ").split(/\s+/).filter((w) => w.length >= 4);
      for (const w of words.slice(0, 5)) {
        if (!topicChannelMap.has(w)) {
          topicChannelMap.set(w, { channels: new Set(), count: 0, avgMult: 0, topTitle: v.title, topId: v.id });
        }
        const item = topicChannelMap.get(w)!;
        item.channels.add(v.channelId);
        item.count++;
      }
    });

    const validatedBreakoutTopics: any[] = [];
    for (const [topic, data] of topicChannelMap.entries()) {
      if (data.channels.size >= 3) {
        validatedBreakoutTopics.push({
          topic,
          distinctChannelsCount: data.channels.size,
          topVideoTitle: data.topTitle,
          topVideoId: data.topId,
        });
      }
    }
    validatedBreakoutTopics.sort((a, b) => b.distinctChannelsCount - a.distinctChannelsCount);

    return NextResponse.json({
      job,
      videos: paginatedVideos,
      totalCount: filtered.length,
      unfilteredCount: allVideos.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
      saturationScore: {
        level: saturationLevel,
        label: saturationLabel,
        score: saturationScore,
        description: saturationDesc,
        totalViews: totalViewsSum,
        distinctCreators,
        viewsPerCreator,
        smallChannelsBreakoutRate,
      },
      validatedBreakoutTopics: validatedBreakoutTopics.slice(0, 6),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur discovery API" }, { status: 500 });
  }
}

/**
 * POST: Start a new deep discovery job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json({ error: "La requête de recherche est requise" }, { status: 400 });
    }

    const depth: SearchDepth = body.depth || "deep";
    const options = {
      period: body.period || "all",
      duration: body.duration || "all",
      minViews: body.minViews,
      channelSize: body.channelSize,
    };

    const jobId = `job_${uuidv4().slice(0, 10)}`;

    // Trigger pipeline asynchronously (non-blocking for HTTP response)
    // Runs in the background and continuously saves job progress to file storage
    runDeepDiscoveryPipeline(jobId, query, depth, options).catch((err) => {
      console.error(`Background discovery job ${jobId} failed:`, err);
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: "Job de recherche en profondeur initialisé avec succès.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Impossible de démarrer le job" }, { status: 500 });
  }
}
