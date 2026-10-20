import fs from "fs";
import path from "path";

export const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_OUTLIERS_WEBHOOK_URL || "";

export interface OutlierVideoAlert {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
  durationFormatted?: string;
  durationSeconds?: number;
  isShort?: boolean;
  channelId: string;
  channelTitle: string;
  channelSubs: number;
  channelAvatar?: string;
  channelCreatedAt?: string;
  channelMedianViews: number;
  outlierMultiplier: number; // views / channelMedianViews
  viralRatio: number;        // views / channelSubs
  velocityVpd: number;       // views / day
  compositeScore: number;    // 0 - 100 (1of10 / TubeLab score)
  medianReliable?: boolean;  // false si < 5 vidéos comparables
  titlePattern?: string;
  category?: string;
}

export interface ConsolidatedScanReport {
  channelsScanned: number;
  totalVideosIngested: number;
  totalViralViews: number;
  outliers: OutlierVideoAlert[];
}

export interface NotificationLogRecord {
  id: string;
  videoId: string;
  channelId: string;
  tierNotified: number; // 1: >=3x, 2: >=10x, 3: >=25x
  viewsAtNotification: number;
  multiplierAtNotification: number;
  sentAt: string;
}

const LOG_FILE = path.join(process.cwd(), "data", "notification_logs.json");

function ensureLogFile() {
  const dir = path.dirname(LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export function getNotificationLogs(): NotificationLogRecord[] {
  ensureLogFile();
  try {
    const raw = fs.readFileSync(LOG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read notification logs", err);
    return [];
  }
}

export function saveNotificationLog(record: Omit<NotificationLogRecord, "id" | "sentAt">) {
  ensureLogFile();
  const logs = getNotificationLogs();
  const newRecord: NotificationLogRecord = {
    ...record,
    id: `${record.videoId}-t${record.tierNotified}-${Date.now()}`,
    sentAt: new Date().toISOString(),
  };
  logs.push(newRecord);
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save notification log", err);
  }
}

export function getOutlierTier(multiplier: number): number {
  if (multiplier >= 25) return 3;
  if (multiplier >= 10) return 2;
  if (multiplier >= 3) return 1;
  return 0;
}

export function isAlreadyNotifiedAtTier(videoId: string, tier: number): boolean {
  const logs = getNotificationLogs();
  return logs.some((l) => l.videoId === videoId && l.tierNotified >= tier);
}

export function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("fr-FR");
}

function getElapsedDays(isoDate: string): number {
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Filtre de diversité :
 * - Max 1 vidéo par chaîne
 * - Max 2 vidéos par micro-niche
 */
function applyDiversityFilter(outliers: OutlierVideoAlert[], maxCount = 5): OutlierVideoAlert[] {
  const seenChannels = new Set<string>();
  const nicheCounts = new Map<string, number>();
  const diverseList: OutlierVideoAlert[] = [];

  for (const item of outliers) {
    if (seenChannels.has(item.channelId)) continue;

    const niche = item.category || "General";
    const currentNicheCount = nicheCounts.get(niche) || 0;
    if (currentNicheCount >= 2) continue;

    seenChannels.add(item.channelId);
    nicheCounts.set(niche, currentNicheCount + 1);
    diverseList.push(item);

    if (diverseList.length >= maxCount) break;
  }

  return diverseList;
}

/**
 * Envoie UN SEUL MESSAGE DISCORD SYNTHÉTIQUE
 * Niveau 1of10 / TubeLab / Algrow :
 * - Score composite (Outlier + VSR + Vélocité + Fraîcheur)
 * - Vraie médiane habituelle de la chaîne
 * - Format exact (Shorts vs Longform avec minutage)
 * - Pattern psychologique & Sujet
 * - Diversité des niches (anti-monopole)
 */
export async function sendSingleConsolidatedReportToDiscord(
  report: ConsolidatedScanReport,
  webhookUrl: string = DISCORD_WEBHOOK_URL
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  if (!webhookUrl || webhookUrl.trim() === "") {
    console.warn("[Discord Webhook] Skipped: DISCORD_OUTLIERS_WEBHOOK_URL is not configured.");
    return { success: false, sentCount: 0, error: "webhook_not_configured" };
  }
  if (!report.outliers || report.outliers.length === 0) {
    return { success: true, sentCount: 0 };
  }

  try {
    const topPicks = applyDiversityFilter(report.outliers, 5);
    if (topPicks.length === 0) return { success: true, sentCount: 0 };

    const heroVideo = topPicks[0];

    const fields = topPicks.map((video, idx) => {
      const daysAgo = getElapsedDays(video.publishedAt);
      const vsrFormatted = video.viralRatio ? `${video.viralRatio.toFixed(0)}x` : "N/A";
      const formatLabel = video.isShort
        ? "⚡ **Short** (< 60s)"
        : `⏱️ **Longform (${video.durationFormatted || "Vidéo"})**`;
      const patternLabel = video.titlePattern ? `🎯 **Pattern :** \`${video.titlePattern}\`\n` : "";
      const nicheBadge = video.category ? `🏷️ **Niche :** \`${video.category}\`` : "";

      const outlierText =
        video.medianReliable === false
          ? `\`${video.outlierMultiplier.toFixed(1)}x\` (médiane estimée : ${formatViews(video.channelMedianViews)})`
          : `\`${video.outlierMultiplier.toFixed(1)}x\` la médiane chaîne (${formatViews(video.channelMedianViews)})`;

      return {
        name: `🔥 #${idx + 1} • [Score ${video.compositeScore}/100] ${video.title.slice(0, 75)}`,
        value:
          `▶️ **[Regarder sur YouTube](https://www.youtube.com/watch?v=${video.id})**\n` +
          `👤 **Chaîne :** [${video.channelTitle}](https://www.youtube.com/channel/${video.channelId}) • **${formatViews(video.channelSubs)}** subs\n` +
          `👀 **${formatViews(video.views)}** vues • ⏳ **Âge :** ${daysAgo}j\n` +
          `📊 **Outlier :** ${outlierText}\n` +
          `🚀 **Ratio VSR :** \`${vsrFormatted}\` ses abonnés !\n` +
          `⚡ **Vélocité (VPD) :** \`+${formatViews(video.velocityVpd)}/j\`\n` +
          `🎬 **Format :** ${formatLabel}\n` +
          `${patternLabel}${nicheBadge}`,
        inline: false,
      };
    });

    const masterEmbed = {
      title: `🚨 RADAR VIRAL YOUTUBE • ${topPicks.length} PÉPITES HORS-NORME (Score Composite)`,
      description:
        `📊 **Bilan du cycle de scan :**\n` +
        `• 📡 **${report.channelsScanned}** chaînes scannées (vivier 1k-300k subs)\n` +
        `• 📥 **${report.totalVideosIngested}** vidéos récentes analysées\n` +
        `• 🔥 **${report.outliers.length}** outliers détectés • **${topPicks.length}** sélectionnés (diversité de niches)\n` +
        `• 👁️ **${formatViews(report.totalViralViews)}** vues cumulées générées\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      color: 0x9333ea, // Violet intense
      thumbnail: {
        url: heroVideo.thumbnail,
      },
      image: {
        url: heroVideo.thumbnail, // Affiche la miniature de la pépite n°1 en grand format
      },
      fields,
      footer: {
        text: "Radar Outlier • Scoring Composite (Outlier + VSR + Vélocité + Fraîcheur) • NewIQ",
      },
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `⚡ **NOUVEAU DIGEST OUTLIERS YOUTUBE (${topPicks.length} PÉPITES SÉLECTIONNÉES)**`,
        embeds: [masterEmbed],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Discord Webhook Error]", response.status, errorText);
      return { success: false, sentCount: 0, error: errorText };
    }

    // Sauvegarde les notifications dans le log anti-doublon
    for (const v of topPicks) {
      const tier = getOutlierTier(v.outlierMultiplier);
      saveNotificationLog({
        videoId: v.id,
        channelId: v.channelId,
        tierNotified: tier,
        viewsAtNotification: v.views,
        multiplierAtNotification: v.outlierMultiplier,
      });
    }

    return { success: true, sentCount: topPicks.length };
  } catch (err: any) {
    console.error("[Discord Webhook Exception]", err);
    return { success: false, sentCount: 0, error: err.message };
  }
}
