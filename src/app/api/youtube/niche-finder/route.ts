import { NextRequest, NextResponse } from "next/server";
import { searchNicheOpportunities } from "@/lib/nicheService";
import { NicheSearchParams } from "@/types/nicheFinder";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query") || "True crime documentary";

    const params: NicheSearchParams = {
      query,
      minSubs: searchParams.get("minSubs") ? parseInt(searchParams.get("minSubs")!, 10) : undefined,
      maxSubs: searchParams.get("maxSubs") ? parseInt(searchParams.get("maxSubs")!, 10) : undefined,
      channelSize: (searchParams.get("channelSize") as any) || "all",
      country: searchParams.get("country") || undefined,
      minViews: searchParams.get("minViews") ? parseInt(searchParams.get("minViews")!, 10) : undefined,
      maxViews: searchParams.get("maxViews") ? parseInt(searchParams.get("maxViews")!, 10) : undefined,
      period: (searchParams.get("period") as any) || "90d",
      duration: (searchParams.get("duration") as any) || "long",
      includeKeywords: searchParams.get("includeKeywords") || undefined,
      excludeKeywords: searchParams.get("excludeKeywords") || undefined,
      sortBy: (searchParams.get("sortBy") as any) || "outlierScore",
      pageToken: searchParams.get("pageToken") || undefined,
      maxResults: searchParams.get("maxResults") ? parseInt(searchParams.get("maxResults")!, 10) : 25,
    };

    const result = await searchNicheOpportunities(params);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to search niche opportunities" },
      { status: 500 }
    );
  }
}
