import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getTrackedChannels } from "@/lib/db";
import { scrapeChannelRss } from "@/lib/youtube-scraper";
import { detectTitlePattern } from "@/lib/titlePatternDetector";
import { ingestVideosIntoViralIndex, IndexedViralVideo } from "@/lib/viralVideosIndex";
import { getVideoDuration, CachedVideoDuration } from "@/lib/videoDurationCache";
import {
  getCachedChannel,
  saveChannelStats,
  computeChannelMedianExcluding,
  ChannelVideoSample,
} from "@/lib/channelStatsCache";
import {
  sendSingleConsolidatedReportToDiscord,
  isAlreadyNotifiedAtTier,
  getOutlierTier,
  OutlierVideoAlert,
  DISCORD_WEBHOOK_URL,
} from "@/lib/discordWebhook";

export const dynamic = "force-dynamic";

// ============================================================================
// CONSTANTES RÉGLABLES DU PIPELINE ET SCORING LOGARITHMIQUE (1of10 / TubeLab)
// ============================================================================
export const OUTLIER_CAP = 100;           // Plafond log10 pour l'outlier (100x la médiane)
export const VSR_CAP = 1000;              // Plafond log10 pour le VSR (1000x les abonnés)
export const VPD_CAP = 100000;            // Plafond log10 pour la vélocité (100 000 vues/jour)

export const MAX_CHANNEL_MEDIAN = 450000; // Chaînes écartées si médiane > 450 000
export const MIN_COMPARABLE_VIDEOS = 5;   // Minimum 5 vidéos comparables requises pour médiane fiable

// Poids lorsque la médiane est fiable (sampleCount >= 5)
export const WEIGHT_OUTLIER_RELIABLE = 0.40;
export const WEIGHT_VSR_RELIABLE = 0.30;
export const WEIGHT_VELOCITY_RELIABLE = 0.20;
export const WEIGHT_RECENCY_RELIABLE = 0.10;

// Poids de secours (médiane non fiable / < 5 vidéos comparables)
export const WEIGHT_OUTLIER_FALLBACK = 0.00;
export const WEIGHT_VSR_FALLBACK = 0.55;
export const WEIGHT_VELOCITY_FALLBACK = 0.30;
export const WEIGHT_RECENCY_FALLBACK = 0.15;

// Seuils d'éligibilité et filtres d'entrée
export const MIN_VIEWS_SHORTS = 20000;
export const MIN_VIEWS_LONGFORM = 35000;
export const MAX_CHANNEL_SUBSCRIBERS = 300000;
export const MIN_OUTLIER_MULTIPLIER = 2.5;
export const MIN_COMPOSITE_SCORE = 35;

export interface VideoScoringInput {
  views: number;
  publishedAt: string | Date | number;
  vpd?: number;
}

export interface ChannelScoringStats {
  subscribers: number;
  medianViews: number;
  medianReliable?: boolean;
  sampleCount?: number;
}

export class ScoreResult {
  score: number;
  outlier: number;
  vsr: number;
  vpd: number;
  ageDays: number;
  outlierNorm: number;
  vsrNorm: number;
  velocityNorm: number;
  recencyBoost: number;
  medianReliable: boolean;

  constructor(data: {
    score: number;
    outlier: number;
    vsr: number;
    vpd: number;
    ageDays: number;
    outlierNorm: number;
    vsrNorm: number;
    velocityNorm: number;
    recencyBoost: number;
    medianReliable: boolean;
  }) {
    this.score = data.score;
    this.outlier = data.outlier;
    this.vsr = data.vsr;
    this.vpd = data.vpd;
    this.ageDays = data.ageDays;
    this.outlierNorm = data.outlierNorm;
    this.vsrNorm = data.vsrNorm;
    this.velocityNorm = data.velocityNorm;
    this.recencyBoost = data.recencyBoost;
    this.medianReliable = data.medianReliable;
  }

  valueOf(): number {
    return this.score;
  }

  toString(): string {
    return this.score.toFixed(1);
  }
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * FONCTION PURE DE SCORING LOGARITHMIQUE (1of10 / TubeLab / Algrow)
 * Testable seule avec zéro dépendance externe.
 *
 * Formules :
 * - outlierNorm  = clamp(log10(outlier) / log10(OUTLIER_CAP), 0, 1)   (OUTLIER_CAP = 100)
 * - vsrNorm      = clamp(log10(VSR) / log10(VSR_CAP), 0, 1)           (VSR_CAP = 1000)
 * - velocityNorm = clamp(log10(VPD) / log10(VPD_CAP), 0, 1)           (VPD_CAP = 100000)
 * - recencyBoost : age <=3j -> 1.0 ; <=7j -> 0.85 ; <=14j -> 0.70 ; <=30j -> 0.50 ; <=90j -> 0.35 ; sinon 0
 * Si une valeur est <= 1 (outlier ou VSR ou VPD), la norme vaut 0 (aucun log négatif).
 */
export function computeScore(
  video: VideoScoringInput,
  channelStats: ChannelScoringStats
): ScoreResult {
  const pubMs =
    typeof video.publishedAt === "number"
      ? video.publishedAt
      : new Date(video.publishedAt).getTime();
  const now = Date.now();
  const ageDays = Math.max((now - pubMs) / (1000 * 3600 * 24), 0.1);

  const views = Math.max(video.views, 0);
  const median = Math.max(channelStats.medianViews, 1000);
  const subs = Math.max(channelStats.subscribers, 1);

  const vpd = video.vpd !== undefined ? video.vpd : Math.round(views / ageDays);
  const outlier = views / median;
  const vsr = views / subs;

  // 1) Normalisation logarithmique
  const outlierNorm =
    outlier <= 1 ? 0 : clamp(Math.log10(outlier) / Math.log10(OUTLIER_CAP), 0, 1);
  const vsrNorm =
    vsr <= 1 ? 0 : clamp(Math.log10(vsr) / Math.log10(VSR_CAP), 0, 1);
  const velocityNorm =
    vpd <= 1 ? 0 : clamp(Math.log10(vpd) / Math.log10(VPD_CAP), 0, 1);

  // Recency boost
  let recencyBoost = 0;
  if (ageDays <= 3) recencyBoost = 1.0;
  else if (ageDays <= 7) recencyBoost = 0.85;
  else if (ageDays <= 14) recencyBoost = 0.70;
  else if (ageDays <= 30) recencyBoost = 0.50;
  else if (ageDays <= 90) recencyBoost = 0.35;
  else recencyBoost = 0;

  // Fiabilité de la médiane de chaîne
  const isReliable =
    channelStats.medianReliable !== false &&
    (channelStats.sampleCount === undefined ||
      channelStats.sampleCount >= MIN_COMPARABLE_VIDEOS);

  // Poids adaptatifs selon la fiabilité de la médiane
  const wOutlier = isReliable ? WEIGHT_OUTLIER_RELIABLE : WEIGHT_OUTLIER_FALLBACK;
  const wVsr = isReliable ? WEIGHT_VSR_RELIABLE : WEIGHT_VSR_FALLBACK;
  const wVelocity = isReliable ? WEIGHT_VELOCITY_RELIABLE : WEIGHT_VELOCITY_FALLBACK;
  const wRecency = isReliable ? WEIGHT_RECENCY_RELIABLE : WEIGHT_RECENCY_FALLBACK;

  const rawScore =
    100 *
    (wOutlier * outlierNorm +
      wVsr * vsrNorm +
      wVelocity * velocityNorm +
      wRecency * recencyBoost);

  const finalScore = parseFloat(rawScore.toFixed(1));

  return new ScoreResult({
    score: finalScore,
    outlier: parseFloat(outlier.toFixed(1)),
    vsr: parseFloat(vsr.toFixed(1)),
    vpd: Math.round(vpd),
    ageDays: parseFloat(ageDays.toFixed(1)),
    outlierNorm: parseFloat(outlierNorm.toFixed(3)),
    vsrNorm: parseFloat(vsrNorm.toFixed(3)),
    velocityNorm: parseFloat(velocityNorm.toFixed(3)),
    recencyBoost,
    medianReliable: isReliable,
  });
}

interface ChannelCandidate {
  id: string;
  channelId: string;
  name: string;
  handle: string;
  avatar: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  baselineViews: number;
  tags: string[];
}

/**
 * Récupère un pool diversifié de chaînes réelles (1k - 300k abonnés)
 */
function getExtendedChannelPool(limit = 40): ChannelCandidate[] {
  const tracked = getTrackedChannels();
  const poolMap = new Map<string, ChannelCandidate>();

  for (const c of tracked) {
    poolMap.set(c.channelId, {
      id: c.id,
      channelId: c.channelId,
      name: c.name,
      handle: c.handle || `@${c.name.toLowerCase().replace(/\s+/g, "")}`,
      avatar: c.avatar,
      subscribers: c.subscribers || 0,
      totalViews: c.totalViews || 0,
      videoCount: c.videoCount || 0,
      baselineViews: c.baselineViews || 5000,
      tags: c.tags || ["Tracked"],
    });
  }

  // Compléter avec les chaînes du cache de découverte
  if (poolMap.size < limit) {
    try {
      const cachePath = path.join(process.cwd(), "data", "discovered_videos_cache.json");
      if (fs.existsSync(cachePath)) {
        const raw = fs.readFileSync(cachePath, "utf-8");
        const cacheData = JSON.parse(raw);

        const candidateList: ChannelCandidate[] = [];
        for (const query in cacheData) {
          const list = cacheData[query];
          if (!Array.isArray(list)) continue;
          for (const item of list) {
            if (item.channelId && !poolMap.has(item.channelId)) {
              candidateList.push({
                id: `cached-${item.channelId}`,
                channelId: item.channelId,
                name: item.channelTitle || "YouTube Creator",
                handle: `@${(item.channelTitle || "creator").toLowerCase().replace(/\s+/g, "")}`,
                avatar: item.channelAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
                subscribers: item.channelSubscribers || 0,
                totalViews: item.channelTotalViews || 0,
                videoCount: item.channelVideoCount || 50,
                baselineViews:
                  item.baselineViews ||
                  (item.channelTotalViews && item.channelVideoCount
                    ? Math.round(item.channelTotalViews / item.channelVideoCount)
                    : 5000),
                tags: [query.split(/\s+/)[0] || "Outlier"],
              });
            }
          }
        }

        const rotationSlot = Math.floor(Date.now() / (30 * 60 * 1000));
        const filtered = candidateList.filter(
          (c) => c.subscribers >= 1000 && c.subscribers <= MAX_CHANNEL_SUBSCRIBERS
        );

        filtered.sort((a, b) => {
          const hashA = ((a.channelId.charCodeAt(2) || 1) * 31 + rotationSlot) % 1000;
          const hashB = ((b.channelId.charCodeAt(2) || 1) * 31 + rotationSlot) % 1000;
          return hashA - hashB;
        });

        for (const cand of filtered) {
          if (poolMap.size >= limit) break;
          poolMap.set(cand.channelId, cand);
        }
      }
    } catch (err) {
      console.warn("Failed to read discovered_videos_cache for channel pool", err);
    }
  }

  return Array.from(poolMap.values()).slice(0, limit);
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notifyDiscord = searchParams.get("notify") !== "false";
    const minMultiplierParam = parseFloat(searchParams.get("minMultiplier") || String(MIN_OUTLIER_MULTIPLIER));
    const minMultiplier = isNaN(minMultiplierParam) ? MIN_OUTLIER_MULTIPLIER : minMultiplierParam;
    const maxDays = parseInt(searchParams.get("maxDays") || "180", 10);
    const forceAlert = searchParams.get("force") === "true";
    const channelLimit = parseInt(searchParams.get("limit") || "40", 10);

    const channelsToScan = getExtendedChannelPool(channelLimit);
    const now = Date.now();
    let totalRssVideos = 0;

    // Cache des pépites historiques pour enrichir l'échantillonnage de chaque chaîne
    const cachedGemsMap = new Map<string, any[]>();
    try {
      const cachePath = path.join(process.cwd(), "data", "discovered_videos_cache.json");
      if (fs.existsSync(cachePath)) {
        const cacheData = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
        for (const q in cacheData) {
          for (const v of cacheData[q]) {
            if (!v.channelId || !v.id) continue;
            const arr = cachedGemsMap.get(v.channelId) || [];
            arr.push(v);
            cachedGemsMap.set(v.channelId, arr);
          }
        }
      }
    } catch {}

    const rawCandidates: Array<{
      video: any;
      channel: ChannelCandidate;
      ageDays: number;
      vpd: number;
    }> = [];

    // Audit du cycle de scan
    let analyzedCount = 0;
    const rejectionCounts: Record<string, number> = {
      channel_median_over_450k: 0,
      subs_over_300k: 0,
      views_below_threshold: 0,
      outlier_and_vsr_too_low: 0,
      composite_score_below_35: 0,
      already_notified: 0,
    };
    const retainedVideos: Array<{ id: string; title: string; score: number; multiplier: number }> = [];

    // 1. Scan des flux RSS temps réel & mise en cache 24h des statistiques de chaîne
    const BATCH_SIZE = 8;
    for (let i = 0; i < channelsToScan.length; i += BATCH_SIZE) {
      const batch = channelsToScan.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (channel) => {
          try {
            // Vérifier si stats récentes en cache 24h
            let cachedRecord = getCachedChannel(channel.channelId);
            let samples: ChannelVideoSample[] = cachedRecord?.videos || [];

            if (!cachedRecord || samples.length < 5) {
              const rssVideos = await scrapeChannelRss(channel.channelId);
              totalRssVideos += rssVideos.length;

              const newSamples: ChannelVideoSample[] = [];
              for (const r of rssVideos) {
                if (r.viewCount && r.viewCount > 0) {
                  // Format approximé au premier scan, affiné via cache de durées
                  const isProbableShort = r.title.toLowerCase().includes("#short") || (r.viewCount < 5000 && r.title.length < 30);
                  newSamples.push({
                    id: r.id,
                    title: r.title,
                    views: r.viewCount,
                    isShort: isProbableShort,
                    publishedAt: r.publishedAt,
                  });
                }
              }

              const cachedGems = cachedGemsMap.get(channel.channelId);
              if (cachedGems) {
                for (const c of cachedGems) {
                  if (c.viewCount && c.viewCount > 0) {
                    newSamples.push({
                      id: c.id,
                      title: c.title,
                      views: c.viewCount,
                      isShort: (c.durationSeconds && c.durationSeconds <= 60) || false,
                      publishedAt: c.publishedAt,
                    });
                  }
                }
              }

              cachedRecord = saveChannelStats({
                channelId: channel.channelId,
                channelTitle: channel.name,
                subscribers: channel.subscribers,
                baselineViews: channel.baselineViews,
                videos: newSamples,
              });
              samples = cachedRecord.videos;
            }

            // Collecte des vidéos récentes comme candidates
            for (const item of samples) {
              const pubMs = item.publishedAt ? new Date(item.publishedAt).getTime() : now - 1000 * 3600 * 24 * 7;
              const ageDays = Math.max((now - pubMs) / (1000 * 60 * 60 * 24), 0.1);

              if (ageDays > maxDays) continue;
              if (item.views < 10000) continue;

              const vpd = Math.round(item.views / ageDays);
              rawCandidates.push({
                video: item,
                channel,
                ageDays,
                vpd,
              });
            }
          } catch (err) {
            console.warn(`[Sync RSS Error] Channel ${channel.channelId}:`, err);
          }
        })
      );
    }

    // Dédupliquer les candidats par videoId et les trier par volume de vues et vélocité (pour traiter les plus viraux en premier)
    const uniqueCandidatesMap = new Map<string, typeof rawCandidates[0]>();
    for (const c of rawCandidates) {
      if (!uniqueCandidatesMap.has(c.video.id)) {
        uniqueCandidatesMap.set(c.video.id, c);
      }
    }
    const candidatesList = Array.from(uniqueCandidatesMap.values());
    candidatesList.sort((a, b) => (b.video.views || 0) - (a.video.views || 0));

    // 2. Enrichissement avec Cache de Durées & Calcul de la Vraie Médiane de Chaîne
    const discoveredOutliers: OutlierVideoAlert[] = [];
    const videosForIndex: Partial<IndexedViralVideo>[] = [];
    let totalViralViews = 0;

    await Promise.all(
      candidatesList.slice(0, 100).map(async (cand) => {
        analyzedCount++;
        const { video, channel, ageDays, vpd } = cand;

        // Filtre abonné max
        if (channel.subscribers > MAX_CHANNEL_SUBSCRIBERS) {
          rejectionCounts.subs_over_300k++;
          return;
        }

        // Cache de durée persistant (ne re-scrape jamais /watch si déjà en cache)
        const durationInfo: CachedVideoDuration = await getVideoDuration(video.id);
        const views = durationInfo.liveViews || video.views || 0;
        const subs = durationInfo.liveSubs || channel.subscribers || 1000;
        const isShort = durationInfo.isShort;

        // Mise à jour de l'échantillon avec le vrai format pour la chaîne
        const cachedChannelData = getCachedChannel(channel.channelId);
        if (cachedChannelData) {
          const sampleMatch = cachedChannelData.videos.find((v) => v.id === video.id);
          if (sampleMatch) {
            sampleMatch.isShort = isShort;
            sampleMatch.views = views;
          }
        }

        // MÉDIANE FIABLE DE CHAÎNE :
        // 1. Exclut la vidéo analysée (video.id) de sa propre médiane
        // 2. Compare Shorts avec Shorts et Longform avec Longform
        // 3. Si < 5 vidéos comparables : medianReliable = false
        const medianResult = computeChannelMedianExcluding({
          channelId: channel.channelId,
          currentVideoId: video.id,
          isShort,
          samples: cachedChannelData?.videos,
          fallbackMedian: channel.baselineViews || 5000,
        });

        // Écarter la chaîne si médiane > 450 000 (chaînes géantes déguisées)
        if (medianResult.median > MAX_CHANNEL_MEDIAN) {
          rejectionCounts.channel_median_over_450k++;
          return;
        }

        // SCORING LOGARITHMIQUE PUR (computeScore)
        const scoreResult = computeScore(
          {
            views,
            publishedAt: video.publishedAt || new Date(now - ageDays * 86400000).toISOString(),
            vpd,
          },
          {
            subscribers: subs,
            medianViews: medianResult.median,
            medianReliable: medianResult.medianReliable,
            sampleCount: medianResult.sampleCount,
          }
        );

        const outlierMultiplier = scoreResult.outlier;
        const viralRatio = scoreResult.vsr;
        const compositeScore = scoreResult.score;

        // Seuil de vues minimum par format
        const minViewsRequired = isShort ? MIN_VIEWS_SHORTS : MIN_VIEWS_LONGFORM;
        if (views < minViewsRequired) {
          rejectionCounts.views_below_threshold++;
          return;
        }

        // Seuil d'outlier ou VSR
        if (outlierMultiplier < minMultiplier && viralRatio < 3.0) {
          rejectionCounts.outlier_and_vsr_too_low++;
          return;
        }

        // Seuil de score composite
        if (compositeScore < MIN_COMPOSITE_SCORE) {
          rejectionCounts.composite_score_below_35++;
          return;
        }

        // Vidéo qualifiée !
        const videoTitle = video.title || `Video ${video.id}`;
        const pattern = detectTitlePattern(videoTitle);
        const tier = getOutlierTier(outlierMultiplier);
        const alreadyNotified = isAlreadyNotifiedAtTier(video.id, tier);

        const alertData: OutlierVideoAlert = {
          id: video.id,
          title: videoTitle,
          thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
          publishedAt: video.publishedAt || new Date(now - ageDays * 86400000).toISOString(),
          views,
          durationFormatted: durationInfo.durationFormatted,
          durationSeconds: durationInfo.durationSeconds,
          isShort,
          channelId: channel.channelId,
          channelTitle: channel.name,
          channelSubs: subs,
          channelAvatar: channel.avatar,
          channelMedianViews: medianResult.median,
          outlierMultiplier,
          viralRatio,
          velocityVpd: vpd,
          compositeScore,
          medianReliable: medianResult.medianReliable,
          titlePattern: pattern.badge,
          category: channel.tags?.[0] || "Outlier",
        };

        totalViralViews += views;
        retainedVideos.push({
          id: video.id,
          title: videoTitle,
          score: compositeScore,
          multiplier: outlierMultiplier,
        });

        // Données complètes pour la page Web Viral Videos
        videosForIndex.push({
          id: video.id,
          title: videoTitle,
          thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
          publishedAt: video.publishedAt || new Date(now - ageDays * 86400000).toISOString(),
          viewCount: views,
          durationSeconds: durationInfo.durationSeconds,
          durationFormatted: durationInfo.durationFormatted,
          channelId: channel.channelId,
          channelTitle: channel.name,
          channelAvatar: channel.avatar,
          channelSubscribers: subs,
          channelMedianViews: medianResult.median,
          medianReliable: medianResult.medianReliable,
          viewsPerDay: vpd,
          engagementRate: 0.05,
          outlierMultiplier,
          viralRatio,
          viralBreakoutScore: compositeScore,
          category: channel.tags?.[0] || "Outlier",
          tags: channel.tags || ["Trending"],
          titlePattern: pattern.badge,
          titleTemplate: pattern.template,
        });

        if (forceAlert || !alreadyNotified) {
          discoveredOutliers.push(alertData);
        } else {
          rejectionCounts.already_notified++;
        }
      })
    );

    // 3. Sauvegarde dans l'index de cache viral (Page Web)
    if (videosForIndex.length > 0) {
      await ingestVideosIntoViralIndex(videosForIndex);
    }

    // 4. Classement par Score Composite, puis Vélocité, puis Outlier
    discoveredOutliers.sort((a, b) => {
      if (b.compositeScore !== a.compositeScore) {
        return b.compositeScore - a.compositeScore;
      }
      if (b.velocityVpd !== a.velocityVpd) {
        return b.velocityVpd - a.velocityVpd;
      }
      return b.outlierMultiplier - a.outlierMultiplier;
    });

    // 5. Envoi du webhook Discord unique (si configuré et si outliers présents)
    let discordResult = { success: true, sentCount: 0 };
    if (notifyDiscord && discoveredOutliers.length > 0) {
      discordResult = await sendSingleConsolidatedReportToDiscord(
        {
          channelsScanned: channelsToScan.length,
          totalVideosIngested: totalRssVideos,
          totalViralViews,
          outliers: discoveredOutliers,
        },
        DISCORD_WEBHOOK_URL
      );
    }

    // 6. Log par cycle obligatoire
    const totalRejected = Object.values(rejectionCounts).reduce((a, b) => a + b, 0);
    console.log(
      `[Outlier Pipeline Cycle] Analysées: ${analyzedCount} | Rejetées: ${totalRejected} (${JSON.stringify(rejectionCounts)}) | Retenues: ${retainedVideos.length}`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cycleAudit: {
        videosAnalyzed: analyzedCount,
        videosRejected: totalRejected,
        rejectionReasons: rejectionCounts,
        videosRetained: retainedVideos.length,
      },
      summary: {
        channelsScanned: channelsToScan.length,
        totalRssVideosIngested: totalRssVideos,
        candidatesAnalyzed: candidatesList.length,
        outliersIndexed: videosForIndex.length,
        newOutliersAlertedToDiscord: discoveredOutliers.length,
        discordSentCount: discordResult.sentCount,
        discordStatus: discordResult.success ? "delivered" : "error",
      },
      topOutliers: discoveredOutliers.slice(0, 5).map((d) => ({
        id: d.id,
        title: d.title,
        format: d.isShort ? "Short" : `Longform (${d.durationFormatted})`,
        score: `${d.compositeScore}/100`,
        multiplier: `${d.outlierMultiplier}x`,
        channelMedian: d.channelMedianViews,
        medianReliable: d.medianReliable ?? true,
        viralRatio: `${d.viralRatio}x`,
        views: d.views,
        vpd: `${d.velocityVpd}/j`,
        subs: d.channelSubs,
        channel: d.channelTitle,
        pattern: d.titlePattern,
      })),
    });
  } catch (error: any) {
    console.error("[Sync Outliers Route Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync outliers" },
      { status: 500 }
    );
  }
}
