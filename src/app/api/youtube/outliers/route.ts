import { NextRequest, NextResponse } from "next/server";
import { formatCompactNumber, formatDate, parseISO8601Duration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "tech";

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "YOUTUBE_API_KEY manquante" }, { status: 500 });
    }

    // 1. Search videos by keyword
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(query)}&order=relevance&key=${apiKey}`;
    const sRes = await fetch(searchUrl, { next: { revalidate: 3600 } });
    const sData = await sRes.json();

    if (sData.error) {
      return NextResponse.json({ error: sData.error.message }, { status: 400 });
    }

    const videoIds = (sData.items || []).map((it: any) => it.id?.videoId).filter(Boolean);
    const channelIds = Array.from(new Set((sData.items || []).map((it: any) => it.snippet?.channelId).filter(Boolean)));

    if (videoIds.length === 0) {
      return NextResponse.json({ outliers: [] });
    }

    // 2. Fetch video details & statistics
    const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(",")}&key=${apiKey}`;
    const vRes = await fetch(vUrl, { next: { revalidate: 3600 } });
    const vData = await vRes.json();

    // 3. Fetch channel statistics to compute Outlier multiplier (Views / Subscribers ratio)
    const cUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds.slice(0, 15).join(",")}&key=${apiKey}`;
    const cRes = await fetch(cUrl, { next: { revalidate: 3600 } });
    const cData = await cRes.json();

    const channelMap = new Map<string, any>();
    (cData.items || []).forEach((c: any) => {
      channelMap.set(c.id, {
        title: c.snippet?.title,
        avatar: c.snippet?.thumbnails?.default?.url,
        subs: parseInt(c.statistics?.subscriberCount || "1", 10),
        totalViews: parseInt(c.statistics?.viewCount || "0", 10),
      });
    });

    // 4. Compute Outlier Score (Multiplier) & Estimated RPM
    const outliers = (vData.items || []).map((v: any) => {
      const channel = channelMap.get(v.snippet?.channelId) || { subs: 10000, title: v.snippet?.channelTitle };
      const views = parseInt(v.statistics?.viewCount || "0", 10);
      const likes = parseInt(v.statistics?.likeCount || "0", 10);
      const dur = parseISO8601Duration(v.contentDetails?.duration);

      // Multiplier: how many times more views than channel subscribers
      const subRatio = channel.subs > 0 ? (views / channel.subs) : 1;
      const multiplier = parseFloat(subRatio.toFixed(1));

      // Estimated RPM benchmark based on niche (2$ to 8$)
      const estimatedRPM = query.toLowerCase().includes("crypto") || query.toLowerCase().includes("finance") || query.toLowerCase().includes("business") 
        ? 9.5 
        : query.toLowerCase().includes("tech") 
        ? 6.2 
        : 3.8;

      const estimatedAdRevenue = Math.round((views / 1000) * estimatedRPM);

      return {
        id: v.id,
        title: v.snippet?.title,
        thumbnail: v.snippet?.thumbnails?.maxres?.url || v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url,
        publishedAt: v.snippet?.publishedAt,
        views,
        likes,
        durationFormatted: dur.formatted,
        channelId: v.snippet?.channelId,
        channelTitle: v.snippet?.channelTitle,
        channelAvatar: channel.avatar,
        channelSubs: channel.subs,
        multiplier,
        isOutlier: multiplier >= 2.0, // Performe à plus de 200% des abonnés de la chaîne
        estimatedRPM,
        estimatedAdRevenue,
      };
    });

    // Sort by Outlier Multiplier descending
    outliers.sort((a: any, b: any) => b.multiplier - a.multiplier);

    return NextResponse.json({ outliers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur Outlier Finder" }, { status: 500 });
  }
}
