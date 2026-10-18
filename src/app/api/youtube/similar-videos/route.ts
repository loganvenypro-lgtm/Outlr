import { NextRequest, NextResponse } from "next/server";
import { scrapeRealYouTubeVideoIds, calculateVideoRelevance } from "@/lib/deepDiscoveryService";
import { parseISO8601Duration } from "@/lib/utils";
import { inferVideoTaxonomy } from "@/lib/taxonomyHelper";

export const dynamic = "force-dynamic";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY manquante");
  return key.trim();
}

/**
 * Clean title to extract key search tokens for finding truly similar videos
 */
function extractSimilarSearchKeywords(title: string): string[] {
  // Strip hashtags, emoji, brackets, stop words
  const clean = title
    .replace(/[#@][\w\d_]+/g, "")
    .replace(/\[.*?\]|\(.*?\)/g, "")
    .replace(/[^\w\s\u00C0-\u00FF'-]/g, " ")
    .replace(/\b(was right all along|the entire story of|iceberg explained|explained|full documentary|case study|video essay)\b/gi, "")
    .trim();

  const words = clean.split(/\s+/).filter(w => w.length >= 3);
  
  const queries: string[] = [];
  // Primary core subject (first 3-4 significant words)
  if (words.length >= 2) {
    queries.push(words.slice(0, 4).join(" "));
  } else if (words.length === 1) {
    queries.push(words[0]);
  }

  // Exact phrase or topic deep dive
  if (words.length >= 2) {
    queries.push(`${words.slice(0, 3).join(" ")} documentary`);
  }

  return queries.length > 0 ? queries : [title.slice(0, 30)];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");
    const videoTitle = searchParams.get("title");

    if (!videoId && !videoTitle) {
      return NextResponse.json({ error: "videoId ou title requis" }, { status: 400 });
    }

    const apiKey = getApiKey();
    let baseTitle = videoTitle || "";
    let baseChannelId = "";

    // 1. If title not provided, fetch the base video snippet first
    if (!baseTitle && videoId) {
      const vRes = await fetch(`${YOUTUBE_API_BASE}/videos?part=snippet&id=${videoId}&key=${apiKey}`);
      const vData = await vRes.json();
      const item = vData.items?.[0];
      if (item) {
        baseTitle = item.snippet?.title || "";
        baseChannelId = item.snippet?.channelId || "";
      }
    }

    if (!baseTitle) {
      return NextResponse.json({ error: "Vidéo source introuvable" }, { status: 404 });
    }

    // 2. Formulate 2-3 targeted queries to scrape similar videos
    const searchQueries = extractSimilarSearchKeywords(baseTitle);
    const discoveredIds = new Set<string>();

    // Scrape YouTube without quota via InnerTube
    const scrapePromises = searchQueries.map(q => scrapeRealYouTubeVideoIds(q, 35));
    const scrapeResults = await Promise.all(scrapePromises);

    for (const batch of scrapeResults) {
      for (const id of batch) {
        if (id && id !== videoId) {
          discoveredIds.add(id);
        }
      }
    }

    const candidateIds = Array.from(discoveredIds).slice(0, 40);
    if (candidateIds.length === 0) {
      return NextResponse.json({
        baseTitle,
        similarVideos: [],
        total: 0
      });
    }

    // 3. Batch Enrich video stats via videos.list
    const vRes = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${candidateIds.join(",")}&key=${apiKey}`
    );
    const vData = await vRes.json();
    const enrichedItems = vData.items || [];

    // Collect channels for batch subs
    const channelIds = Array.from(new Set(enrichedItems.map((item: any) => item.snippet?.channelId).filter(Boolean)));
    const channelSubMap = new Map<string, number>();

    if (channelIds.length > 0) {
      try {
        const cRes = await fetch(
          `${YOUTUBE_API_BASE}/channels?part=statistics&id=${channelIds.slice(0, 50).join(",")}&key=${apiKey}`
        );
        const cData = await cRes.json();
        for (const c of cData.items || []) {
          const subs = parseInt(c.statistics?.subscriberCount || "0", 10);
          channelSubMap.set(c.id, subs);
        }
      } catch (e) {
        // Fallback
      }
    }

    const now = Date.now();
    const similarVideos = enrichedItems.map((v: any) => {
      const views = parseInt(v.statistics?.viewCount || "0", 10);
      const likes = v.statistics?.likeCount ? parseInt(v.statistics.likeCount, 10) : undefined;
      const comments = v.statistics?.commentCount ? parseInt(v.statistics.commentCount, 10) : undefined;
      const pubDate = new Date(v.snippet?.publishedAt || now);
      const daysSincePub = Math.max((now - pubDate.getTime()) / (1000 * 60 * 60 * 24), 0.5);
      const viewsPerDay = Math.round(views / daysSincePub);
      const dur = parseISO8601Duration(v.contentDetails?.duration);
      const subs = channelSubMap.get(v.snippet?.channelId) || 0;
      
      const viralRatio = subs > 0 ? parseFloat((views / subs).toFixed(1)) : parseFloat((views / 1000).toFixed(1));
      const baseline = subs > 0 ? Math.round(subs * 0.4) : 1000;
      const outlierMultiplier = parseFloat((views / Math.max(baseline, 100)).toFixed(1));
      const relevanceScore = calculateVideoRelevance(baseTitle, v.snippet?.title || "", v.snippet?.description || "");
      const taxonomy = inferVideoTaxonomy({ title: v.snippet?.title || "" });

      return {
        id: v.id,
        title: v.snippet?.title || "Sans titre",
        description: v.snippet?.description || "",
        thumbnail: v.snippet?.thumbnails?.maxres?.url || v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || "",
        publishedAt: v.snippet?.publishedAt || "",
        channelId: v.snippet?.channelId || "",
        channelTitle: v.snippet?.channelTitle || "Chaîne",
        channelAvatar: "",
        channelSubscribers: subs,
        viewCount: views,
        likeCount: likes,
        commentCount: comments,
        durationFormatted: dur.formatted,
        durationSeconds: dur.seconds,
        isShort: dur.seconds > 0 && dur.seconds <= 60,
        viewsPerDay,
        viralRatio,
        outlierMultiplier,
        relevanceScore,
        category: taxonomy.category,
        subNiche: taxonomy.subNiche,
        subject: taxonomy.subject,
        titleFormat: taxonomy.titleFormat,
      };
    });

    // Sort by high relevance and outlier power
    similarVideos.sort((a: any, b: any) => {
      const scoreA = a.relevanceScore * 0.5 + Math.min(a.outlierMultiplier * 10, 100) * 0.5;
      const scoreB = b.relevanceScore * 0.5 + Math.min(b.outlierMultiplier * 10, 100) * 0.5;
      return scoreB - scoreA;
    });

    return NextResponse.json({
      baseTitle,
      similarVideos,
      total: similarVideos.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur lors de la recherche similaire" }, { status: 500 });
  }
}
