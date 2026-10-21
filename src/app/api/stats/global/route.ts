import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getTrackedChannels } from "@/lib/db";
import { DATA_DIR } from "@/lib/dataDir";

export const dynamic = "force-dynamic";

interface CachedStatsResponse {
  data: any;
  timestamp: number;
}

let memoryStatsCache: CachedStatsResponse | null = null;
const CACHE_TTL_MS = 15 * 1000; // 15 secondes de cache mémoire pour fluidité maximale

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

export async function GET() {
  try {
    const now = Date.now();
    if (memoryStatsCache && now - memoryStatsCache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(memoryStatsCache.data);
    }

    const dataDir = DATA_DIR;

    // 1. Lire discovered_videos_cache.json
    let totalDiscoveredRaw = 0;
    const uniqueVideosMap = new Map<string, any>();
    const uniqueChannelsMap = new Map<string, any>();
    let totalCumulativeViews = 0;
    let shortsCount = 0;
    let longformCount = 0;
    const nicheDistribution: Record<string, number> = {};
    const patternDistribution: Record<string, number> = {};

    const discoveredPath = path.join(dataDir, "discovered_videos_cache.json");
    if (fs.existsSync(discoveredPath)) {
      try {
        const raw = fs.readFileSync(discoveredPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) {
          for (const [query, list] of Object.entries(parsed)) {
            if (!Array.isArray(list)) continue;
            totalDiscoveredRaw += list.length;
            for (const v of list) {
              if (!v.id) continue;
              if (!uniqueVideosMap.has(v.id)) {
                uniqueVideosMap.set(v.id, v);
                const views = v.viewCount || 0;
                totalCumulativeViews += views;

                // Durée / Format
                const durFormatted = v.durationFormatted || "";
                const isShort =
                  durFormatted === "0:60" ||
                  (durFormatted.startsWith("0:") && parseInt(durFormatted.split(":")[1], 10) <= 60);

                if (isShort) shortsCount++;
                else longformCount++;

                // Niche
                const queryNiche = query.split(/\s+/)[0] || "Général";
                nicheDistribution[queryNiche] = (nicheDistribution[queryNiche] || 0) + 1;
              }

              if (v.channelId && !uniqueChannelsMap.has(v.channelId)) {
                uniqueChannelsMap.set(v.channelId, {
                  id: v.channelId,
                  title: v.channelTitle,
                  subs: v.channelSubscribers || 0,
                  avatar: v.channelAvatar,
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("[Global Stats] Error reading discovered_videos_cache", err);
      }
    }

    // 2. Lire viral_videos_index.json (Pépites qualifiées)
    let qualifiedOutliersCount = 0;
    let topAllTimeOutliers: any[] = [];
    const viralIndexPath = path.join(dataDir, "viral_videos_index.json");
    if (fs.existsSync(viralIndexPath)) {
      try {
        const raw = fs.readFileSync(viralIndexPath, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          qualifiedOutliersCount = list.length;

          // Enrichir les vidéos uniques
          for (const item of list) {
            if (item.id && !uniqueVideosMap.has(item.id)) {
              uniqueVideosMap.set(item.id, item);
              totalCumulativeViews += item.viewCount || 0;
            }
            if (item.channelId && !uniqueChannelsMap.has(item.channelId)) {
              uniqueChannelsMap.set(item.channelId, {
                id: item.channelId,
                title: item.channelTitle,
                subs: item.channelSubscribers || 0,
                avatar: item.channelAvatar,
              });
            }

            // Patterns
            if (item.titlePattern) {
              patternDistribution[item.titlePattern] = (patternDistribution[item.titlePattern] || 0) + 1;
            }
          }

          // Top All-Time Outliers triés par outlierMultiplier
          const sorted = [...list].sort((a, b) => (b.outlierMultiplier || 0) - (a.outlierMultiplier || 0));
          topAllTimeOutliers = sorted.slice(0, 8).map((v) => ({
            id: v.id,
            title: v.title,
            thumbnail: v.thumbnail,
            channelTitle: v.channelTitle,
            channelId: v.channelId,
            views: v.viewCount,
            viewsFormatted: formatCompactNumber(v.viewCount),
            subs: v.channelSubscribers,
            subsFormatted: formatCompactNumber(v.channelSubscribers),
            outlierMultiplier: v.outlierMultiplier || 1,
            viralBreakoutScore: v.viralBreakoutScore || 50,
            viralRatio: v.viralRatio || (v.viewCount / Math.max(v.channelSubscribers, 1)),
            viewsPerDay: v.viewsPerDay || 0,
            durationFormatted: v.durationFormatted || "10:00",
            category: v.category || "Viral",
            titlePattern: v.titlePattern,
            medianReliable: v.medianReliable ?? true,
            publishedAt: v.publishedAt,
          }));
        }
      } catch (err) {
        console.warn("[Global Stats] Error reading viral_videos_index", err);
      }
    }

    // 3. Lire notification_logs.json
    let discordNotificationsSent = 0;
    let recentDiscordNotifications: any[] = [];
    const notificationLogsPath = path.join(dataDir, "notification_logs.json");
    if (fs.existsSync(notificationLogsPath)) {
      try {
        const raw = fs.readFileSync(notificationLogsPath, "utf-8");
        const logs = JSON.parse(raw);
        if (Array.isArray(logs)) {
          discordNotificationsSent = logs.length;
          recentDiscordNotifications = logs.slice(-6).reverse();
        }
      } catch {}
    }

    // 4. Chaînes suivies depuis la base locale
    const trackedChannels = getTrackedChannels();

    // 5. Intelligence Database
    let intelligenceEntitiesCount = 0;
    const intelPath = path.join(dataDir, "intelligence_database.json");
    if (fs.existsSync(intelPath)) {
      try {
        const raw = fs.readFileSync(intelPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) {
          intelligenceEntitiesCount = Object.keys(parsed).length;
        }
      } catch {}
    }

    // 6. Top niches ordonnées
    const sortedNiches = Object.entries(nicheDistribution)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 7. Top patterns ordonnés
    const sortedPatterns = Object.entries(patternDistribution)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const payload = {
      success: true,
      timestamp: new Date().toISOString(),
      kpis: {
        totalScrapedVideosRaw: totalDiscoveredRaw, // Total brut incluant cycles
        totalUniqueVideos: uniqueVideosMap.size,    // Vidéos uniques totales
        totalUniqueChannels: uniqueChannelsMap.size,
        totalCumulativeViews,
        totalCumulativeViewsFormatted: formatCompactNumber(totalCumulativeViews),
        totalQualifiedOutliers: qualifiedOutliersCount,
        discordNotificationsSent,
        trackedChannelsCount: trackedChannels.length,
        intelligenceEntitiesCount,
        shortsCount,
        longformCount,
        shortsRatio: uniqueVideosMap.size > 0 ? Math.round((shortsCount / uniqueVideosMap.size) * 100) : 35,
        longformRatio: uniqueVideosMap.size > 0 ? Math.round((longformCount / uniqueVideosMap.size) * 100) : 65,
      },
      topAllTimeOutliers,
      sortedNiches,
      sortedPatterns,
      recentDiscordNotifications,
    };

    memoryStatsCache = {
      data: payload,
      timestamp: now,
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("[Global Stats API Error]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load global stats" },
      { status: 500 }
    );
  }
}
