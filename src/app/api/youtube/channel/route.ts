import { NextRequest, NextResponse } from "next/server";
import { getChannelDetails } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || id.trim() === "") {
      return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
    }

    const channel = await getChannelDetails(id.trim());
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json({ channel });
  } catch (err: any) {
    console.error("Error in channel API route:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load channel" },
      { status: 500 }
    );
  }
}
