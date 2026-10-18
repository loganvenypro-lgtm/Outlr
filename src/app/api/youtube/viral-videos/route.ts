import { NextRequest, NextResponse } from "next/server";
import { queryViralVideos, ingestVideosIntoViralIndex } from "@/lib/viralVideosIndex";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const format = (searchParams.get("format") as "all" | "long" | "shorts") || "long";
    const minOutlier = searchParams.get("minOutlier") ? parseFloat(searchParams.get("minOutlier")!) : undefined;
    const maxOutlier = searchParams.get("maxOutlier") ? parseFloat(searchParams.get("maxOutlier")!) : undefined;
    const period = (searchParams.get("period") as any) || "all";
    const minViews = searchParams.get("minViews") ? parseInt(searchParams.get("minViews")!, 10) : undefined;
    const maxViews = searchParams.get("maxViews") ? parseInt(searchParams.get("maxViews")!, 10) : undefined;
    const minSubs = searchParams.get("minSubs") ? parseInt(searchParams.get("minSubs")!, 10) : undefined;
    const maxSubs = searchParams.get("maxSubs") ? parseInt(searchParams.get("maxSubs")!, 10) : undefined;
    const minDurationSeconds = searchParams.get("minDurationSeconds") ? parseInt(searchParams.get("minDurationSeconds")!, 10) : undefined;
    const maxDurationSeconds = searchParams.get("maxDurationSeconds") ? parseInt(searchParams.get("maxDurationSeconds")!, 10) : undefined;
    const minUploadCount = searchParams.get("minUploadCount") ? parseInt(searchParams.get("minUploadCount")!, 10) : undefined;
    const maxUploadCount = searchParams.get("maxUploadCount") ? parseInt(searchParams.get("maxUploadCount")!, 10) : undefined;
    const minChannelAgeDays = searchParams.get("minChannelAgeDays") ? parseInt(searchParams.get("minChannelAgeDays")!, 10) : undefined;
    const maxChannelAgeDays = searchParams.get("maxChannelAgeDays") ? parseInt(searchParams.get("maxChannelAgeDays")!, 10) : undefined;
    const category = searchParams.get("category") || undefined;
    const niche = searchParams.get("niche") || undefined;
    const subNiche = searchParams.get("subNiche") || undefined;
    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "vbs";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 24;

    const result = await queryViralVideos({
      format,
      minOutlier,
      maxOutlier,
      period,
      minViews,
      maxViews,
      minSubs,
      maxSubs,
      minDurationSeconds,
      maxDurationSeconds,
      minUploadCount,
      maxUploadCount,
      minChannelAgeDays,
      maxChannelAgeDays,
      category,
      niche,
      subNiche,
      search,
      sortBy,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error in GET /api/youtube/viral-videos:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load viral videos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const videos = body.videos || [];

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: "Videos array required" }, { status: 400 });
    }

    const added = await ingestVideosIntoViralIndex(videos);
    return NextResponse.json({ success: true, addedCount: added });
  } catch (err: any) {
    console.error("Error in POST /api/youtube/viral-videos:", err);
    return NextResponse.json(
      { error: err.message || "Failed to ingest viral videos" },
      { status: 500 }
    );
  }
}
