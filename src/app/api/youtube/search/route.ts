import { NextRequest, NextResponse } from "next/server";
import { searchChannels } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim() === "") {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    const channels = await searchChannels(query);
    return NextResponse.json({ channels });
  } catch (err: any) {
    console.error("Error in search API route:", err);
    return NextResponse.json(
      { error: err.message || "Failed to search channels" },
      { status: err.message?.includes("YOUTUBE_API_KEY") ? 500 : 400 }
    );
  }
}
