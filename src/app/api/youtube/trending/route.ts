import { NextRequest, NextResponse } from "next/server";
import { formatCompactNumber, formatDate, parseISO8601Duration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionCode = searchParams.get("region") || "FR";
    const categoryId = searchParams.get("category") || "";

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "YOUTUBE_API_KEY non configurée" }, { status: 500 });
    }

    let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=${regionCode}&maxResults=24&key=${apiKey}`;
    if (categoryId) {
      url += `&videoCategoryId=${categoryId}`;
    }

    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message || "Erreur YouTube Trending" }, { status: 400 });
    }

    const videos = (data.items || []).map((item: any, index: number) => {
      const dur = parseISO8601Duration(item.contentDetails?.duration);
      const isShort = dur.seconds > 0 && dur.seconds <= 60;
      return {
        rank: index + 1,
        id: item.id,
        title: item.snippet?.title || "Titre inconnu",
        channelTitle: item.snippet?.channelTitle || "Chaîne",
        channelId: item.snippet?.channelId,
        publishedAt: item.snippet?.publishedAt,
        thumbnail: item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url,
        viewCount: parseInt(item.statistics?.viewCount || "0", 10),
        likeCount: item.statistics?.likeCount ? parseInt(item.statistics.likeCount, 10) : undefined,
        commentCount: item.statistics?.commentCount ? parseInt(item.statistics.commentCount, 10) : undefined,
        durationFormatted: dur.formatted,
        durationSeconds: dur.seconds,
        isShort,
      };
    });

    return NextResponse.json({ videos, regionCode });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur Trending" }, { status: 500 });
  }
}
