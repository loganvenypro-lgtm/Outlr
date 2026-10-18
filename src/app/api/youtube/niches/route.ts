import { NextRequest, NextResponse } from "next/server";
import { formatCompactNumber, formatDate, parseISO8601Duration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get("niche") || "Naval Engineering";
    const language = searchParams.get("lang") || "All";

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé YouTube API manquante" }, { status: 500 });
    }

    // 1. Search for channels / videos in the specified unsaturated niche
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(niche)}&maxResults=15&order=viewCount&key=${apiKey}`;
    const sRes = await fetch(searchUrl, { next: { revalidate: 3600 } });
    const sData = await sRes.json();

    if (sData.error) {
      return NextResponse.json({ error: sData.error.message }, { status: 400 });
    }

    const items = sData.items || [];
    const channelIds = Array.from(new Set(items.map((i: any) => i.snippet?.channelId).filter(Boolean))) as string[];

    if (channelIds.length === 0) {
      return NextResponse.json({ channels: [] });
    }

    // 2. Fetch Channel Statistics & ContentDetails (Uploads playlist)
    const cUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelIds.slice(0, 6).join(",")}&key=${apiKey}`;
    const cRes = await fetch(cUrl, { next: { revalidate: 3600 } });
    const cData = await cRes.json();

    // 3. For each channel, fetch top 3 videos to evaluate outlier performance
    const detailedChannels = await Promise.all(
      (cData.items || []).map(async (c: any) => {
        const subs = parseInt(c.statistics?.subscriberCount || "1", 10);
        const totalViews = parseInt(c.statistics?.viewCount || "0", 10);
        const videoCount = parseInt(c.statistics?.videoCount || "1", 10);
        const uploadsPlaylistId = c.contentDetails?.relatedPlaylists?.uploads;

        let topVideos: any[] = [];
        if (uploadsPlaylistId) {
          try {
            const pUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=6&key=${apiKey}`;
            const pRes = await fetch(pUrl, { next: { revalidate: 3600 } });
            const pData = await pRes.json();

            const vIds = (pData.items || []).map((it: any) => it.contentDetails?.videoId).filter(Boolean);
            if (vIds.length > 0) {
              const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${vIds.join(",")}&key=${apiKey}`;
              const vRes = await fetch(vUrl, { next: { revalidate: 3600 } });
              const vData = await vRes.json();

              topVideos = (vData.items || []).map((vid: any) => {
                const vViews = parseInt(vid.statistics?.viewCount || "0", 10);
                const subRatio = subs > 0 ? (vViews / subs) : 1;
                return {
                  id: vid.id,
                  title: vid.snippet?.title,
                  thumbnail: vid.snippet?.thumbnails?.maxres?.url || vid.snippet?.thumbnails?.high?.url || vid.snippet?.thumbnails?.medium?.url,
                  publishedAt: vid.snippet?.publishedAt,
                  views: vViews,
                  isOutlier: subRatio >= 1.5,
                  ratio: subRatio.toFixed(1),
                };
              });
            }
          } catch {}
        }

        // Calculate average views across retrieved sample
        const sampleViews = topVideos.map((v) => v.views);
        const avgViews = sampleViews.length > 0 
          ? Math.round(sampleViews.reduce((a, b) => a + b, 0) / sampleViews.length)
          : Math.round(totalViews / videoCount);

        // Outlier factor (ex: 6.2x)
        const outlierFactor = subs > 0 ? (avgViews / subs) : 1;

        // Estimated RPM based on niche
        const estimatedRpm = niche.toLowerCase().includes("finance") ? 14 :
          niche.toLowerCase().includes("tech") || niche.toLowerCase().includes("naval") || niche.toLowerCase().includes("history") ? 8.5 : 5.2;

        const estMonthlyRevenueLow = Math.round(((avgViews * 4) / 1000) * estimatedRpm);
        const estMonthlyRevenueHigh = Math.round(estMonthlyRevenueLow * 2.2);

        // Tags and Insights
        const insights = ["Good profitability", "High demand", "Loyal viewers", "High commitment"];
        if (outlierFactor > 3.0) insights.push("Faceless potential");
        if (estimatedRpm > 7.0) insights.push("High RPM Niche");

        return {
          id: c.id,
          name: c.snippet?.title,
          handle: c.snippet?.customUrl || `@${c.snippet?.title.toLowerCase().replace(/\s+/g, "")}`,
          avatar: c.snippet?.thumbnails?.default?.url,
          subscribers: subs,
          totalViews,
          videoCount,
          typicalViews: avgViews,
          outlierFactor: parseFloat(outlierFactor.toFixed(1)),
          estRevenue: `$${formatCompactNumber(estMonthlyRevenueLow)} - $${formatCompactNumber(estMonthlyRevenueHigh)}`,
          estimatedRpm: `$${estimatedRpm}`,
          activeSince: "Recently Rising",
          language: c.snippet?.defaultLanguage || "English",
          contentType: "Long-Form",
          topVideos: topVideos.slice(0, 3),
          insights,
          tags: [niche, "Engineering", "Technology", "History", "Documentary"],
        };
      })
    );

    // Sort by Outlier factor
    detailedChannels.sort((a, b) => b.outlierFactor - a.outlierFactor);

    return NextResponse.json({ channels: detailedChannels });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur Niche Finder" }, { status: 500 });
  }
}
