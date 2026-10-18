import { NextRequest, NextResponse } from "next/server";
import { discoverTrueCompetitors } from "@/lib/trueCompetitorService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelInput = searchParams.get("url") || searchParams.get("channel") || "fern";

    const result = await discoverTrueCompetitors(channelInput);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error in similar-channels route:", err);
    return NextResponse.json(
      { error: err.message || "Impossible de découvrir les créateurs similaires." },
      { status: 500 }
    );
  }
}
